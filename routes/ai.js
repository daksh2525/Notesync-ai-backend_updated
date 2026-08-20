const express = require("express");
const multer = require("multer");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { requireCredits, deductCredits } = require("../middleware/checkCredits");
const COSTS = require("../config/aiCreditsConfig");

const { extractText } = require("../services/ocrService");
const { askTextModel, getEmbedding } = require("../services/nvidiaClient");
const { chunkText } = require("../utils/chunkText");
const { extractPlainText } = require("../utils/noteText");

const Note = require("../models/Note");
const NoteChunk = require("../models/NoteChunk");
const pdfParse = require("pdf-parse");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

/**
 * POST /api/ai/ocr
 * Image upload karo -> hybrid OCR (Tesseract free, Vision fallback paid) chalta hai.
 * Credits sirf tab deduct hote hain jab vision fallback genuinely trigger ho.
 */
router.post("/ocr", authenticate, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  if (req.file.mimetype === "application/pdf") {
    try {
      const parsed = await pdfParse(req.file.buffer);
      const text = parsed.text.trim();

      if (text.length < 30) {
        return res.status(422).json({
          error:
            "Couldn't find selectable text in this PDF. It might be a scanned/handwritten " +
            "PDF — for now, please upload individual pages as images instead.",
        });
      }

      return res.json({
        text,
        method: "pdf-text",
        confidence: 100,
        creditsUsed: 0,
        remainingCredits: req.user.aiCredits,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to read PDF: " + err.message });
    }
  }

  // Tesseract ke bina fallback ke pehle hi credits check kar lete hain worst-case cost ke against
  if (req.user.aiCredits < COSTS.OCR_VISION_FALLBACK) {
    return res.status(402).json({
      error:
        "Insufficient credits for OCR (in case handwriting fallback is needed)",
      required: COSTS.OCR_VISION_FALLBACK,
      available: req.user.aiCredits,
    });
  }

  try {
    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const result = await extractText(req.file.buffer, dataUrl);

    if (result.creditsUsed > 0) {
      await deductCredits(req.user, result.creditsUsed);
    }

    res.json({
      text: result.text,
      method: result.method,
      confidence: result.confidence,
      creditsUsed: result.creditsUsed,
      remainingCredits: req.user.aiCredits,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/notes/:id/index
 * Note ke content ko chunk + embed karke NoteChunk collection mein save karta hai.
 * Ye AI Chat (RAG) use hone se pehle chalna chahiye.
 */
router.post("/notes/:id/index", authenticate, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  if (note.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    // Purane chunks hatao (re-index case)
    await NoteChunk.deleteMany({ note: note._id });

    const plainText = extractPlainText(note.content);
    const chunks = chunkText(plainText);

    const chunkDocs = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i], "passage");
      chunkDocs.push({
        note: note._id,
        owner: req.user._id,
        chunkText: chunks[i],
        embedding,
        chunkIndex: i,
      });
    }

    if (chunkDocs.length > 0) await NoteChunk.insertMany(chunkDocs);

    res.json({ message: `Indexed ${chunkDocs.length} chunks` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/notes/:id/chat
 * RAG: question embed karo -> Atlas Vector Search se relevant chunks lao -> answer generate karo
 */
router.post(
  "/notes/:id/chat",
  authenticate,
  requireCredits(COSTS.AI_CHAT),
  async (req, res) => {
    const { question } = req.body;
    if (!question)
      return res.status(400).json({ error: "question is required" });

    try {
      const questionEmbedding = await getEmbedding(question, "query");

      // MongoDB Atlas Vector Search aggregation
      const results = await NoteChunk.aggregate([
        {
          $vectorSearch: {
            index: "note_chunk_vector_index", // Atlas UI mein isi naam se index banana hai
            path: "embedding",
            queryVector: questionEmbedding,
            numCandidates: 50,
            limit: 5,
            filter: {
              note: new (require("mongoose").Types.ObjectId)(req.params.id),
            },
          },
        },
        { $project: { chunkText: 1, _id: 0 } },
      ]);

      const context = results.map((r) => r.chunkText).join("\n\n");

      const answer = await askTextModel([
        {
          role: "system",
          content:
            "Answer the user's question using ONLY the provided note context. " +
            "If the answer isn't in the context, say so — don't make things up.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ]);

      await deductCredits(req.user, req.creditCost);

      res.json({
        answer,
        sourcesUsed: results.length,
        remainingCredits: req.user.aiCredits,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/ai/notes/:id/summary
 * body: { type: "short" | "detailed" }
 */
router.post("/notes/:id/summary", authenticate, async (req, res) => {
  const { type = "short" } = req.body;
  const cost =
    type === "detailed" ? COSTS.SUMMARY_DETAILED : COSTS.SUMMARY_SHORT;

  if (req.user.aiCredits < cost) {
    return res
      .status(402)
      .json({ error: "Insufficient credits", required: cost });
  }

  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  try {
    const plainText = extractPlainText(note.content);
    const instruction =
      type === "detailed"
        ? "Write a detailed summary covering all key points."
        : "Write a short, 3-4 sentence summary.";

    const summary = await askTextModel([
      { role: "system", content: instruction },
      { role: "user", content: plainText },
    ]);

    await deductCredits(req.user, cost);

    res.json({ summary, remainingCredits: req.user.aiCredits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

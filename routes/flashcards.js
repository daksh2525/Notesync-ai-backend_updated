const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { requireCredits, deductCredits } = require("../middleware/checkCredits");
const COSTS = require("../config/aiCreditsConfig");
const { askTextModel } = require("../services/nvidiaClient");
const { parseJSONResponse } = require("../utils/parseJSON");
const Note = require("../models/Note");
const { extractPlainText } = require("../utils/noteText");

/**
 * POST /api/flashcards/notes/:id
 * body: { count } (optional, default 10)
 */
router.post(
  "/notes/:id",
  authenticate,
  requireCredits(COSTS.FLASHCARDS),
  async (req, res) => {
    const { count = 10 } = req.body;

    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    try {
      const plainText = extractPlainText(note.content);

      const prompt = `Based on the following note content, generate ${count} flashcards
covering the key concepts, definitions, and facts.

Respond with ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "flashcards": [
    { "front": "question or term", "back": "answer or definition" }
  ]
}

Note content:
${plainText}`;

      const raw = await askTextModel([{ role: "user", content: prompt }], 2048);
      const result = parseJSONResponse(raw);

      await deductCredits(req.user, req.creditCost);

      res.json({ flashcards: result.flashcards, remainingCredits: req.user.aiCredits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
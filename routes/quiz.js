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
 * POST /api/quiz/notes/:id
 * body: { difficulty: "easy"|"medium"|"hard", types: ["mcq","truefalse","short","long"], count }
 */
router.post(
  "/notes/:id",
  authenticate,
  requireCredits(COSTS.QUIZ_GENERATOR),
  async (req, res) => {
    const { difficulty = "medium", types = ["mcq"], count = 5 } = req.body;

    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    try {
      const plainText = extractPlainText(note.content);

      const prompt = `Based on the following note content, generate ${count} quiz questions
at ${difficulty} difficulty. Include only these question types: ${types.join(
        ", "
      )}.

Respond with ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "questions": [
    {
      "type": "mcq" | "truefalse" | "short" | "long",
      "question": "string",
      "options": ["string", "string", "string", "string"],  // only for mcq, omit otherwise
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}

Note content:
${plainText}`;

      const raw = await askTextModel([{ role: "user", content: prompt }], 2048);
      const quiz = parseJSONResponse(raw);

      await deductCredits(req.user, req.creditCost);

      res.json({ quiz, remainingCredits: req.user.aiCredits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;

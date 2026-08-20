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
 * POST /api/missing-notes/notes/:id
 * body: { classroomId }
 * Current note ko us classroom mein shared baaki notes se compare karta hai,
 * missing topics/definitions/examples/formulae dhoondta hai.
 */
router.post(
  "/notes/:id",
  authenticate,
  requireCredits(COSTS.MISSING_NOTES),
  async (req, res) => {
    const { classroomId } = req.body;
    if (!classroomId) return res.status(400).json({ error: "classroomId is required" });

    const currentNote = await Note.findById(req.params.id);
    if (!currentNote) return res.status(404).json({ error: "Note not found" });

    // Classroom mein share hui baaki saari notes (khud ki note chhod ke)
    const classmateNotes = await Note.find({
      sharedWith: classroomId,
      _id: { $ne: currentNote._id },
    }).limit(10); // ek reasonable cap, taaki prompt bahut bada na ho jaye

    if (classmateNotes.length === 0) {
      return res.status(400).json({
        error: "No other notes found in this classroom to compare against",
      });
    }

    try {
      const currentText = extractPlainText(currentNote.content);
      const classmateTexts = classmateNotes
        .map((n, i) => `--- Classmate note ${i + 1} ---\n${extractPlainText(n.content)}`)
        .join("\n\n");

      const prompt = `Compare "My note" against the classmate notes below. Find topics,
definitions, formulae, or examples that appear in the classmate notes but are
MISSING from "My note".

Respond with ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "missingTopics": ["string"],
  "missingDefinitions": ["string"],
  "missingFormulae": ["string"],
  "missingExamples": ["string"]
}
Leave any array empty if nothing is missing in that category.

My note:
${currentText}

Classmate notes:
${classmateTexts}`;

      const raw = await askTextModel([{ role: "user", content: prompt }], 1536);
      const result = parseJSONResponse(raw);

      await deductCredits(req.user, req.creditCost);

      res.json({ ...result, comparedAgainst: classmateNotes.length, remainingCredits: req.user.aiCredits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
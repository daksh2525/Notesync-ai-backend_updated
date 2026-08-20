const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { requireCredits, deductCredits } = require("../middleware/checkCredits");
const COSTS = require("../config/aiCreditsConfig");
const { askTextModel } = require("../services/nvidiaClient");
const { parseJSONResponse } = require("../utils/parseJSON");

/**
 * POST /api/study-planner/generate
 * body: { examDate, subjects: [string], weakTopics: [string], availableHoursPerDay }
 * Note se independent hai — user apne exam ke details deta hai, plan milta hai.
 */
router.post(
  "/generate",
  authenticate,
  requireCredits(COSTS.STUDY_PLANNER),
  async (req, res) => {
    const { examDate, subjects = [], weakTopics = [], availableHoursPerDay = 2 } = req.body;
    if (!examDate || subjects.length === 0) {
      return res.status(400).json({ error: "examDate and subjects are required" });
    }

    try {
      const daysUntilExam = Math.ceil(
        (new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)
      );

      const prompt = `Create a day-by-day study timetable for a student.
Exam date: ${examDate} (${daysUntilExam} days from today)
Subjects: ${subjects.join(", ")}
Weak topics (need more time): ${weakTopics.join(", ") || "none specified"}
Available study time: ${availableHoursPerDay} hours/day

Respond with ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "plan": [
    { "day": "Day 1", "date": "YYYY-MM-DD", "focus": ["subject/topic"], "notes": "short guidance" }
  ]
}`;

      const raw = await askTextModel([{ role: "user", content: prompt }], 2048);
      const result = parseJSONResponse(raw);

      await deductCredits(req.user, req.creditCost);

      res.json({ plan: result.plan, remainingCredits: req.user.aiCredits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/study-planner/revision
 * body: { subjects: [string], mode: "1-day" | "3-day" | "7-day" }
 */
router.post(
  "/revision",
  authenticate,
  requireCredits(COSTS.STUDY_PLANNER),
  async (req, res) => {
    const { subjects = [], mode = "1-day" } = req.body;
    if (subjects.length === 0) {
      return res.status(400).json({ error: "subjects are required" });
    }

    const dayCount = { "1-day": 1, "3-day": 3, "7-day": 7 }[mode] || 1;

    try {
      const prompt = `Create a ${dayCount}-day revision plan covering these subjects: ${subjects.join(", ")}.
Prioritize high-yield topics for quick revision before an exam.

Respond with ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "revisionPlan": [
    { "day": "Day 1", "topics": ["topic1", "topic2"], "tip": "short revision tip" }
  ]
}`;

      const raw = await askTextModel([{ role: "user", content: prompt }], 1536);
      const result = parseJSONResponse(raw);

      await deductCredits(req.user, req.creditCost);

      res.json({ revisionPlan: result.revisionPlan, remainingCredits: req.user.aiCredits });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
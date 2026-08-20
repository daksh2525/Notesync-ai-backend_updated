const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const User = require("../models/User");
const Classroom = require("../models/Classroom");
const BADGES = require("../config/badges");

// GET /api/leaderboard/global
router.get("/global", authenticate, async (req, res) => {
  const users = await User.find({ status: "active" })
    .sort({ xp: -1 })
    .limit(50)
    .select("name xp currentStreak badges");

  res.json({ leaderboard: users });
});

// GET /api/leaderboard/classroom/:id
router.get("/classroom/:id", authenticate, async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const users = await User.find({ _id: { $in: classroom.students }, status: "active" })
    .sort({ xp: -1 })
    .select("name xp currentStreak badges");

  res.json({ leaderboard: users });
});

// GET /api/leaderboard/badges — reference list for the frontend to render
router.get("/badges", authenticate, (req, res) => {
  res.json({ badges: BADGES.map(({ key, name, description }) => ({ key, name, description })) });
});

module.exports = router;
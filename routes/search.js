const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const Note = require("../models/Note");
const Classroom = require("../models/Classroom");
const User = require("../models/User");

/**
 * GET /api/search?q=...
 * Simple regex-based search — Atlas Search index nahi use karta
 * (M0 free tier pe sirf 1 index slot bacha tha, use isliye save kiya).
 * Typo-tolerant nahi hai, lekin substring match kaafi hai MVP ke liye.
 */
router.get("/", authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ notes: [], classrooms: [], students: [] });
  }

  const regex = new RegExp(q.trim(), "i"); // case-insensitive substring match

  // Notes: sirf apni notes (owner) — permission-safe by design
  const notes = await Note.find({
    owner: req.user._id,
    $or: [{ title: regex }, { tags: regex }],
  })
    .limit(10)
    .select("title updatedAt");

  // Classrooms: teacher ki apni, ya student jin mein joined hai
  const classroomQuery =
    req.user.role === "teacher"
      ? { teacher: req.user._id }
      : { students: req.user._id };
  const classrooms = await Classroom.find({
    ...classroomQuery,
    $or: [{ name: regex }, { subject: regex }],
  })
    .limit(10)
    .select("name subject code");

  let students = [];
  if (req.user.role === "teacher" || req.user.role === "admin") {
    students = await User.find({ role: "student", name: regex })
      .limit(10)
      .select("name email");
  }

  res.json({ notes, classrooms, students });
});

module.exports = router;

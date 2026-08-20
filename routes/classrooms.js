const express = require("express");
const router = express.Router();
const Classroom = require("../models/Classroom");
const authenticate = require("../middleware/authenticate");
const requireRole = require("../middleware/requireRole");
const Note = require("../models/Note");

// POST /api/classrooms - sirf teacher bana sakta hai
router.post("/", authenticate, requireRole("teacher"), async (req, res) => {
  const { name, subject } = req.body;
  if (!name) return res.status(400).json({ error: "Classroom name required" });

  let code;
  let exists = true;
  while (exists) {
    code = Classroom.generateCode();
    exists = await Classroom.findOne({ code });
  }

  const classroom = await Classroom.create({
    name,
    subject,
    teacher: req.user._id,
    code,
    students: [],
  });

  res.status(201).json({ classroom });
});

// POST /api/classrooms/join - student code se join karta hai
router.post("/join", authenticate, requireRole("student"), async (req, res) => {
  const { code } = req.body;
  const classroom = await Classroom.findOne({ code: code?.toUpperCase() });

  if (!classroom)
    return res.status(404).json({ error: "Invalid classroom code" });

  if (classroom.students.includes(req.user._id)) {
    return res.status(400).json({ error: "Already joined this classroom" });
  }

  classroom.students.push(req.user._id);
  await classroom.save();

  res.json({ classroom });
});

// POST /api/classrooms/:id/leave - student classroom leave karta hai
router.post(
  "/:id/leave",
  authenticate,
  requireRole("student"),
  async (req, res) => {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom)
      return res.status(404).json({ error: "Classroom not found" });

    classroom.students = classroom.students.filter(
      (studentId) => studentId.toString() !== req.user._id.toString()
    );
    await classroom.save();

    res.json({ message: "Left classroom" });
  }
);

// GET /api/classrooms - user ki apni classrooms (teacher: banayi hui, student: joined)
router.get("/", authenticate, async (req, res) => {
  const query =
    req.user.role === "teacher"
      ? { teacher: req.user._id }
      : { students: req.user._id };

  const classrooms = await Classroom.find(query).populate(
    "teacher",
    "name email"
  );
  res.json({ classrooms });
});
// GET /api/classrooms/:id - detail view: classroom info + notes shared to it
router.get("/:id", authenticate, async (req, res) => {
  const classroom = await Classroom.findById(req.params.id)
    .populate("teacher", "name email")
    .populate("students", "name email");
  if (!classroom) return res.status(404).json({ error: "Classroom not found" });

  const isTeacher =
    classroom.teacher._id.toString() === req.user._id.toString();
  const isStudent = classroom.students.some(
    (s) => s._id.toString() === req.user._id.toString()
  );
  if (!isTeacher && !isStudent) {
    return res.status(403).json({ error: "Access denied" });
  }

  const notes = await Note.find({ sharedWith: classroom._id })
    .populate("owner", "name")
    .select("title owner updatedAt")
    .sort({ updatedAt: -1 });

  res.json({ classroom, notes, isTeacher });
});
module.exports = router;

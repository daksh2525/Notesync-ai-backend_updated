const express = require("express");
const router = express.Router();
const Note = require("../models/Note");
const authenticate = require("../middleware/authenticate");
const { addXP, checkBadges } = require("../utils/gamification");
const Classroom = require("../models/Classroom");

// POST /api/notes -
router.post("/", authenticate, async (req, res) => {
  const { title, tags } = req.body;

  const note = await Note.create({
    owner: req.user._id,
    title: title || "Untitled note",
    content: {},
    tags: tags || [],
  });

  addXP(req.user, 5);
  const newBadges = await checkBadges(req.user);
  await req.user.save();

  res.status(201).json({ note, xpGained: 5, newBadges });
});
// GET /api/notes - apne saare notes (archived exclude, filters support)
router.get("/", authenticate, async (req, res) => {
  const { favorite, archived, tag } = req.query;

  const query = { owner: req.user._id };
  if (favorite === "true") query.favorite = true;
  query.archived = archived === "true";
  if (tag) query.tags = tag;

  const notes = await Note.find(query).sort({ updatedAt: -1 });
  res.json({ notes });
});

// GET /api/notes/:id - single note (owner ya shared classroom member dekh sakta hai)
router.get("/:id", authenticate, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  const isOwner = note.owner.toString() === req.user._id.toString();

  if (!isOwner) {
    const sharedClassroom = note.sharedWith.length
      ? await Classroom.findOne({
          _id: { $in: note.sharedWith },
          $or: [{ teacher: req.user._id }, { students: req.user._id }],
        })
      : null;

    if (!sharedClassroom) {
      return res.status(403).json({ error: "Access denied" });
    }
  }
  res.json({ note });
});

// PATCH /api/notes/:id - auto-save yahi endpoint use karega
router.patch("/:id", authenticate, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  if (note.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Access denied" });
  }

  const allowedFields = [
    "title",
    "content",
    "tags",
    "favorite",
    "archived",
    "visibility",
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) note[field] = req.body[field];
  });

  await note.save();
  res.json({ note });
});

// POST /api/notes/:id/share - note ko classroom mein share karo
router.post("/:id/share", authenticate, async (req, res) => {
  const { classroomId } = req.body;
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  if (note.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Access denied" });
  }

  let xpGained = 0;
  let newBadges = [];
  if (!note.sharedWith.includes(classroomId)) {
    note.sharedWith.push(classroomId);
    note.visibility = "classroom";
    await note.save();

    addXP(req.user, 10);
    xpGained = 10;
    newBadges = await checkBadges(req.user);
    await req.user.save();
  }

  res.json({ note, xpGained, newBadges });
});

// DELETE /api/notes/:id
router.delete("/:id", authenticate, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  if (note.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Access denied" });
  }

  await note.deleteOne();
  res.json({ message: "Note deleted" });
});

module.exports = router;

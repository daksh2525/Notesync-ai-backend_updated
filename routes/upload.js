const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");
const authenticate = require("../middleware/authenticate");
const Note = require("../models/Note");

router.get("/signature", authenticate, (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "notesync-ai";

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

router.post("/notes/:id/attachments", authenticate, async (req, res) => {
  const { url, type, originalName, sizeInMB } = req.body;
  if (!url || !type)
    return res.status(400).json({ error: "url and type are required" });

  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  if (note.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Access denied" });
  }

  note.attachments.push({
    url,
    type,
    originalName,
    sizeInMB,
    uploadedAt: new Date(),
  });
  await note.save();

  res.json({ attachments: note.attachments });
});

module.exports = router;

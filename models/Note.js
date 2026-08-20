const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, default: "Untitled note" },

    // TipTap editor se aane wala rich-text JSON content
    content: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Ek note multiple classrooms mein share ho sakta hai (owner fixed rehta hai)
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "Classroom" }],

    tags: [{ type: String }],
    visibility: {
      type: String,
      enum: ["private", "classroom"],
      default: "private",
    },

    attachments: [
      {
        url: String,
        type: { type: String, enum: ["image", "pdf", "docx", "audio"] },
        originalName: String,
        sizeInMB: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    favorite: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);

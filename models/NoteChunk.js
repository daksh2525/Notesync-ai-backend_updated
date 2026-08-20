const mongoose = require("mongoose");

const noteChunkSchema = new mongoose.Schema(
  {
    note: { type: mongoose.Schema.Types.ObjectId, ref: "Note", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chunkText: { type: String, required: true },
    embedding: { type: [Number], required: true }, // nemotron-3-embed-1b se aayega
    chunkIndex: { type: Number, required: true },
  },
  { timestamps: true }
);

// note delete hone pe uske chunks bhi easily find/delete ho sakein
noteChunkSchema.index({ note: 1 });

/**
 * IMPORTANT: MongoDB Atlas Vector Search index is collection pe
 * Atlas UI se manually banana hoga (code se nahi banta) —
 * field: "embedding", type: "vector", dimensions: embedding model ke output size ke hisaab se,
 * similarity: "cosine". README mein steps hain.
 */
module.exports = mongoose.model("NoteChunk", noteChunkSchema);

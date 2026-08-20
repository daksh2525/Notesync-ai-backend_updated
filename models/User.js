const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String, default: "" },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },

    // AI Credits system
    aiCredits: { type: Number, default: 20 },
    lastClaimedAt: { type: Date, default: null },

    // Streak system
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    // Gamification
    xp: { type: Number, default: 0 },
    badges: [{ type: String }], // badge keys, e.g. "first_note", "week_warrior"
  },
  { timestamps: true }
);

// Leaderboard queries ke liye index (jaisa humne discuss kiya tha)
userSchema.index({ xp: -1 });

module.exports = mongoose.model("User", userSchema);

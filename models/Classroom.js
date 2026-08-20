const mongoose = require("mongoose");
const crypto = require("crypto");

const classroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, default: "" },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    code: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

// Har classroom banate waqt ek unique 6-character join code generate hota hai
classroomSchema.statics.generateCode = function () {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A1B2C3"
};

module.exports = mongoose.model("Classroom", classroomSchema);

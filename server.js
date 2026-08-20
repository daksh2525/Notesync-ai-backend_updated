require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const creditsRoutes = require("./routes/credits");
const classroomRoutes = require("./routes/classrooms");
const noteRoutes = require("./routes/notes");
const aiRoutes = require("./routes/ai");
const quizRoutes = require("./routes/quiz");
const flashcardsRoutes = require("./routes/flashcards");
const missingNotesRoutes = require("./routes/missingNotes");
const studyPlannerRoutes = require("./routes/studyPlanner");
const uploadRoutes = require("./routes/upload");
const searchRoutes = require("./routes/search");
const leaderboardRoutes = require("./routes/leaderboard");
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/credits", creditsRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/flashcards", flashcardsRoutes);
app.use("/api/missing-notes", missingNotesRoutes);
app.use("/api/study-planner", studyPlannerRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

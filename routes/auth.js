const express = require("express");
const router = express.Router();
const admin = require("../config/firebaseAdmin");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");

/**
 * POST /api/auth/register
 * Firebase se signup/login ke turant baad frontend ye call karta hai.
 * Agar user pehli baar aaya hai, MongoDB mein entry banti hai.
 * Agar already exist karta hai, existing user return hota hai (login case).
 */
router.post("/register", async (req, res) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { role } = req.body;

    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
        name: decoded.name || "",
        role: role === "teacher" ? "teacher" : "student", // admin sirf manually assign hoga
      });
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

/**
 * GET /api/auth/me
 * Current logged-in user ka data (credits, streak, xp sab kuch) fetch karta hai.
 */
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

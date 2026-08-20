const admin = require("../config/firebaseAdmin");
const User = require("../models/User");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split("Bearer ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      return res.status(404).json({ error: "User not registered in database" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: `Account is ${user.status}` });
    }

    req.user = user;
    req.firebaseDecoded = decoded; // agar email/name chahiye ho registration ke waqt
    next();
  } catch (err) {
    console.error("Firebase Error:", err);
    return res.status(401).json({
      error: err.message,
      code: err.code,
    });
  }
}

module.exports = authenticate;

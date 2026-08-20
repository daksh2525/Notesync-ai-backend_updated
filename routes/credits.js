const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { addXP, checkBadges } = require("../utils/gamification");

const DAILY_CLAIM_AMOUNT = Number(process.env.DAILY_CLAIM_AMOUNT) || 20;
const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;

/**
 * GET /api/credits/status
 * Frontend ye use karega "Claim Now" button enable/disable karne ke liye,
 * aur countdown timer dikhane ke liye.
 */
router.get("/status", authenticate, (req, res) => {
  const { lastClaimedAt, aiCredits, currentStreak, longestStreak } = req.user;

  if (!lastClaimedAt) {
    return res.json({
      eligible: true,
      aiCredits,
      currentStreak,
      longestStreak,
    });
  }

  const elapsed = Date.now() - new Date(lastClaimedAt).getTime();
  const eligible = elapsed >= HOURS_24;
  const nextClaimInMs = eligible ? 0 : HOURS_24 - elapsed;

  res.json({
    eligible,
    nextClaimInMs,
    aiCredits,
    currentStreak,
    longestStreak,
  });
});

/**
 * POST /api/credits/claim
 * Design jo humne pehle tay kiya tha:
 *  - < 24hrs  -> abhi eligible nahi
 *  - 24-48hrs -> streak continue, credits + streak+1
 *  - > 48hrs  -> streak break, credits milte hain but streak = 1
 */
router.post("/claim", authenticate, async (req, res) => {
  const user = req.user;
  const now = Date.now();
  const elapsed = user.lastClaimedAt
    ? now - new Date(user.lastClaimedAt).getTime()
    : Infinity;

  if (elapsed < HOURS_24) {
    return res.status(400).json({
      error: "Not eligible yet",
      nextClaimInMs: HOURS_24 - elapsed,
    });
  }

  if (elapsed <= HOURS_48) {
    user.currentStreak += 1;
  } else {
    user.currentStreak = 1; // streak break
  }

  if (user.currentStreak > user.longestStreak) {
    user.longestStreak = user.currentStreak;
  }

  user.aiCredits += DAILY_CLAIM_AMOUNT;
  user.lastClaimedAt = now;
  addXP(user, 5);
  const newBadges = await checkBadges(user);
  await user.save();

  res.json({
    message: `Claimed! +${DAILY_CLAIM_AMOUNT} credits`,
    aiCredits: user.aiCredits,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    xpGained: 5,
    newBadges,
  });
});

module.exports = router;

const BADGES = require("../config/badges");
const Note = require("../models/Note");

function addXP(user, amount) {
  user.xp += amount;
}

async function checkBadges(user) {
  const newlyEarned = [];

  const noteCount = await Note.countDocuments({ owner: user._id });
  const ctx = { noteCount };

  for (const badge of BADGES) {
    if (!user.badges.includes(badge.key) && badge.condition(user, ctx)) {
      user.badges.push(badge.key);
      newlyEarned.push(badge.key);
    }
  }

  return newlyEarned;
}

module.exports = { addXP, checkBadges };

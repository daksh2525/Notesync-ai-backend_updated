/**
 * requireCredits(cost) middleware:
 *  1. Check karta hai user ke paas itne credits hain ya nahi
 *  2. Agar nahi -> 402 Payment Required jaisa error (insufficient credits)
 *  3. Agar haan -> route handler ko chalne deta hai
 *
 * Actual deduction route handler khud karega AI call SUCCESS hone ke baad
 * (deductCredits helper se) — taaki failed AI calls credits waste na karein.
 */
function requireCredits(cost) {
  return (req, res, next) => {
    if (req.user.aiCredits < cost) {
      return res.status(402).json({
        error: "Insufficient AI credits",
        required: cost,
        available: req.user.aiCredits,
      });
    }
    req.creditCost = cost;
    next();
  };
}

async function deductCredits(user, cost) {
  user.aiCredits -= cost;
  await user.save();
}

module.exports = { requireCredits, deductCredits };

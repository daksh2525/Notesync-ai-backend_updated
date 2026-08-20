/**
 * Har AI feature ka fixed credit cost.
 * Yahan number badalne se poori app mein automatically reflect hoga —
 * kahin aur hardcode nahi karna.
 */
module.exports = {
  SUMMARY_SHORT: 1,
  SUMMARY_DETAILED: 2,
  MISSING_NOTES: 2,
  AI_CHAT: 1,
  QUIZ_GENERATOR: 3,
  FLASHCARDS: 2,
  MIND_MAP: 3,
  DIAGRAM_GENERATOR: 3,
  STUDY_PLANNER: 2,
  OCR_TESSERACT: 0, // free — koi AI model call nahi hota
  OCR_VISION_FALLBACK: 5, // handwriting ke liye NVIDIA vision model
  VOICE_TUTOR: 3,
};

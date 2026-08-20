const Tesseract = require("tesseract.js");
const { askVisionModel } = require("./nvidiaClient");

const CONFIDENCE_THRESHOLD = 50; // isse neeche ho toh vision model fallback

/**
 * Hybrid OCR flow jo humne design + test kiya tha:
 *  1. Tesseract try karo pehle (free, fast)
 *  2. Confidence check karo
 *  3. Agar confidence < 50 -> NVIDIA vision model fallback (handwriting)
 *
 * Returns: { text, method: "tesseract" | "vision", confidence, creditsUsed }
 */
async function extractText(imageBuffer, imageDataUrl) {
  const { data } = await Tesseract.recognize(imageBuffer, "eng");
  const tesseractConfidence = data.confidence;

  if (tesseractConfidence >= CONFIDENCE_THRESHOLD) {
    return {
      text: data.text.trim(),
      method: "tesseract",
      confidence: tesseractConfidence,
      creditsUsed: 0,
    };
  }

  // Low confidence — likely handwriting, fallback to vision model
  const visionText = await askVisionModel(
    imageDataUrl,
    "Extract all the text from this handwritten image exactly as written. " +
      "Preserve the structure, headings, and line breaks as closely as possible. " +
      "Do not summarize or explain anything else, just give the extracted text."
  );

  return {
    text: visionText.trim(),
    method: "vision",
    confidence: tesseractConfidence, // Tesseract ka confidence report karte hain jisne fallback trigger kiya
    creditsUsed: 5, // OCR_VISION_FALLBACK cost — aiCreditsConfig.js se match hona chahiye
  };
}

module.exports = { extractText };

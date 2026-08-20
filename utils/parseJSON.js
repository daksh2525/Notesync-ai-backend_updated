function parseJSONResponse(raw) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("AI response was not valid JSON: " + cleaned.slice(0, 200));
  }
}

module.exports = { parseJSONResponse };
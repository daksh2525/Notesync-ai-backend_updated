/**
 * NVIDIA NIM ke saare API calls ek jagah — model names .env se aate hain,
 * kabhi hardcode nahi (jaisa humne deprecation issue ke baad decide kiya tha).
 */

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";

const TEXT_MODEL = process.env.NVIDIA_TEXT_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const VISION_MODEL = process.env.NVIDIA_VISION_MODEL || "nvidia/nemotron-nano-12b-v2-vl";
const EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL || "nvidia/nemotron-3-embed-1b";

function getApiKey() {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not set in environment");
  return key;
}

/**
 * Text-only reasoning call — Summary, Quiz, Study Planner, RAG answers sab isi se
 */
async function askTextModel(messages, maxTokens = 1024) {
  const res = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`NVIDIA text model error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Vision call — handwriting OCR fallback ke liye (jo humne test kiya tha)
 */
async function askVisionModel(imageDataUrl, prompt) {
  const res = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`NVIDIA vision model error: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Embedding call — RAG ke liye (note chunks + user questions dono embed karne ke liye)
 */
async function getEmbedding(text, inputType = "passage") {
  const res = await fetch(NVIDIA_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: [text],
      input_type: inputType, // "passage" (note chunks ke liye) ya "query" (question ke liye)
    }),
  });

  if (!res.ok) throw new Error(`NVIDIA embedding error: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

module.exports = { askTextModel, askVisionModel, getEmbedding };

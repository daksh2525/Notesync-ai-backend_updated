/**
 * Lambe text ko chhote chunks mein todta hai RAG embeddings ke liye.
 * ~500-800 tokens per chunk (rough estimate: 1 token ≈ 4 characters),
 * thoda overlap rakha hai taaki context boundary pe na toote.
 */
function chunkText(text, chunkSize = 2500, overlap = 300) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }

  return chunks.filter((c) => c.length > 20); // bahut chhote/khali chunks skip karo
}

module.exports = { chunkText };

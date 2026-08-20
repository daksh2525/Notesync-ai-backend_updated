
function extractPlainText(content) {
  if (!content || !content.content) return "";
  let text = "";
  function walk(node) {
    if (node.text) text += node.text + " ";
    if (node.content) node.content.forEach(walk);
  }
  content.content.forEach(walk);
  return text.trim();
}

module.exports = { extractPlainText };
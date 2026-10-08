/**
 * Check if a trimmed line represents an structural boundary that should NOT be joined
 * to the previous line.
 * 
 * @param {string} line - Trimmed line text
 * @returns {boolean}
 */
export function isLineBoundary(line) {
  if (!line) return true;

  // Outline markers: A., 1., a., i., (a), etc.
  if (/^[A-Za-z0-9]+\.\s+/.test(line)) return true;
  if (/^\([a-z0-9]+\)\s+/.test(line)) return true;

  // Headings: #1 ..., Secondly ...
  if (/^#\d+\s+/i.test(line)) return true;
  if (/^(secondly|second|thirdly|third|fourthly|finally|next),?\s+/i.test(line)) return true;

  // Section headings
  if (/^(intro|introduction|background|conclusion)$/i.test(line)) return true;

  // Scripture block headers: e.g. Romans 7:14–25 (ESV)
  if (/^[1-3]?\s*[A-Za-z]+(?:\.[A-Za-z]+)?\s+\d+[:_]\d+(?:[–-]\d+)?\s*\((?:ESV|NIV|NASB|CSB|KJV|NKJV)\)/i.test(line)) {
    return true;
  }

  // Bare verse numbers inside Scripture blocks: e.g. "14", "20"
  if (/^\d{1,3}$/.test(line)) return true;

  // Explicit blockquotes or starts of dialogue quotes
  if (/^[>“"]/.test(line)) return true;

  return false;
}

/**
 * Normalizes text and reflows hard-wrapped lines.
 * 
 * @param {string} rawText - Raw extracted text (can contain \f)
 * @returns {string} Reflowed text
 */
export function reflowText(rawText) {
  if (!rawText) return "";

  // 1. Normalize characters
  let text = rawText
    .replace(/\u00A0/g, " ")
    .replace(/\f/g, "\n")
    .replace(/\r\n/g, "\n");

  const lines = text.split("\n");
  const reflowed = [];
  let currentBuffer = "";

  for (let rawLine of lines) {
    let line = rawLine.replace(/[ \t]+$/, "");

    // 2. Fix missing space after outline markers (e.g. b.Even -> b. Even, i.But -> i. But)
    line = line.replace(/^(\s*(?:[A-Za-z0-9]+|\([a-z0-9]+\))[\.\)])([A-Za-z])/g, "$1 $2");

    const trimmed = line.trim();

    if (!trimmed) {
      if (currentBuffer) {
        reflowed.push(currentBuffer);
        currentBuffer = "";
      }
      reflowed.push("");
      continue;
    }

    if (!currentBuffer) {
      currentBuffer = trimmed;
    } else if (isLineBoundary(trimmed)) {
      reflowed.push(currentBuffer);
      currentBuffer = trimmed;
    } else {
      // Check if previous buffer ended in hyphen
      if (currentBuffer.endsWith("-") && !currentBuffer.endsWith(" -")) {
        currentBuffer = currentBuffer.slice(0, -1) + trimmed;
      } else {
        currentBuffer += " " + trimmed;
      }
    }
  }

  if (currentBuffer) {
    reflowed.push(currentBuffer);
  }

  // Collapse 3 or more newlines into 2
  return reflowed.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

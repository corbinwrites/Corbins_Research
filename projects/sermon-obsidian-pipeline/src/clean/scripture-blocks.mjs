import fs from "node:fs";
import path from "node:path";
import books from "../bible/books.json" with { type: "json" };
import { BIBLE_DIR } from "../config.mjs";

const SCRIPTURE_HEADER_REGEX = /^([1-3]?\s*[A-Za-z]+(?:\.[A-Za-z]+)?)\s+(\d+)[:_](\d+)(?:[–-](\d+))?\s*\(((?:ESV|NIV|NASB|CSB|KJV|NKJV))\)$/;

function findBook(rawName) {
  if (!rawName) return null;
  const clean = rawName.toLowerCase().replace(/\./g, "").trim();
  for (const b of books) {
    if (b.name.toLowerCase() === clean) return b;
    for (const a of b.aliases) {
      if (a.toLowerCase().replace(/\./g, "").trim() === clean) return b;
    }
  }
  return null;
}

function getVaultVerseText(book, chapter, verseNum) {
  if (!book) return "";
  const filePath = path.join(BIBLE_DIR, book.folder, `${book.abbrev} ${chapter}.md`);
  if (!fs.existsSync(filePath)) return "";

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const regex = new RegExp(`######\\s+${verseNum}\\s*\\n([^#*]+)`, "m");
    const match = content.match(regex);
    if (!match) return "";
    return match[1].replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function normalizeCompare(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Transforms scripture blocks into collapsible Obsidian callouts.
 * 
 * @param {string} text - Reflowed text
 * @returns {string} Text with scripture callouts
 */
export function formatScriptureBlocks(text) {
  if (!text) return "";

  const lines = text.split("\n");
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    const match = line.match(SCRIPTURE_HEADER_REGEX);

    if (!match) {
      output.push(lines[i]);
      i++;
      continue;
    }

    const [fullHeader, bookRaw, chStr, vStartStr, vEndStr, translation] = match;
    const book = findBook(bookRaw);
    const ch = parseInt(chStr, 10);
    const vStart = parseInt(vStartStr, 10);
    const vEnd = vEndStr ? parseInt(vEndStr, 10) : vStart;

    const label = `${book ? book.folder : bookRaw} ${ch}:${vStart}${vEnd !== vStart ? `–${vEnd}` : ""}`;
    const fileRef = book ? `${book.abbrev} ${ch}` : `${bookRaw} ${ch}`;
    const calloutHeader = `> [!quote]- [[${fileRef}#v${vStart}|${label}]] (${translation})`;

    output.push(calloutHeader);

    i++; // advance past header
    // skip empty line right after header if present
    while (i < lines.length && !lines[i].trim()) {
      i++;
    }

    let insideBlock = true;
    let currentVerse = vStart;
    const blockLines = [];
    let usedFallback = false;

    // Last verse text from vault for verification
    const lastVerseText = getVaultVerseText(book, ch, vEnd);
    const normalizedLastVerse = normalizeCompare(lastVerseText);

    while (i < lines.length && insideBlock) {
      const currentLine = lines[i].trim();

      if (!currentLine) {
        // Peek ahead to see if next line continues or starts new section
        let nextIdx = i + 1;
        while (nextIdx < lines.length && !lines[nextIdx].trim()) {
          nextIdx++;
        }
        if (nextIdx >= lines.length) {
          insideBlock = false;
          break;
        }

        const nextLine = lines[nextIdx].trim();
        // If next line starts with a marker, heading, or another scripture block
        if (
          /^[A-Za-z0-9]+\.\s+/.test(nextLine) ||
          /^\([a-z0-9]+\)\s+/.test(nextLine) ||
          /^#/.test(nextLine) ||
          /^(secondly|second|thirdly|third|fourthly|finally|next),?\s+/i.test(nextLine) ||
          /^(intro|introduction|background|conclusion)$/i.test(nextLine) ||
          SCRIPTURE_HEADER_REGEX.test(nextLine)
        ) {
          insideBlock = false;
          i = nextIdx;
          break;
        }

        // If next line does NOT look like verse text and currentVerse has reached vEnd
        if (currentVerse >= vEnd) {
          const normNext = normalizeCompare(nextLine);
          if (!normNext || (normalizedLastVerse && !normalizedLastVerse.includes(normNext))) {
            insideBlock = false;
            i = nextIdx;
            break;
          }
        }

        blockLines.push(">");
        i++;
        continue;
      }

      // Check if current line starts an outline marker or heading
      if (
        /^[A-Za-z0-9]+\.\s+/.test(currentLine) ||
        /^\([a-z0-9]+\)\s+/.test(currentLine) ||
        /^#/.test(currentLine) ||
        /^(secondly|second|thirdly|third|fourthly|finally|next),?\s+/i.test(currentLine) ||
        /^(intro|introduction|background|conclusion)$/i.test(currentLine) ||
        SCRIPTURE_HEADER_REGEX.test(currentLine)
      ) {
        insideBlock = false;
        usedFallback = true;
        break;
      }

      // Check verse number indicator e.g. "14 For we know..."
      const vMatch = currentLine.match(/^(\d{1,3})\s+(.*)/);
      if (vMatch) {
        const vNum = parseInt(vMatch[1], 10);
        if (vNum >= vStart && vNum <= vEnd) {
          currentVerse = vNum;
        } else if (vNum > vEnd) {
          // Exceeded verse range of this block
          insideBlock = false;
          break;
        }
      }

      // If we are at or past the last verse, check if the line content is part of the scripture
      if (currentVerse >= vEnd) {
        const lineContent = vMatch ? vMatch[2] : currentLine;
        const normContent = normalizeCompare(lineContent);
        if (normalizedLastVerse && normContent && !normalizedLastVerse.includes(normContent)) {
          // This line is preaching commentary (like "No more lowly body...")
          insideBlock = false;
          break;
        }
      }

      blockLines.push(`> ${currentLine}`);
      i++;
    }

    // Append block lines
    output.push(...blockLines);
    output.push(""); // empty line after callout

    if (usedFallback) {
      console.log(`[ScriptureBlocks] Note: End of scripture block for "${label}" reached next marker/heading boundary.`);
    }
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

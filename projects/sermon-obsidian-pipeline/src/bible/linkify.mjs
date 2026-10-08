import books from "./books.json" with { type: "json" };
import vaultIndex from "./vault-index.mjs";

// Build a fast lookup map and regex for book names
const ALIAS_MAP = new Map();
const SORTED_ALIASES = [];

for (const book of books) {
  for (const alias of book.aliases) {
    const norm = alias.toLowerCase().replace(/\./g, "").trim();
    if (!ALIAS_MAP.has(norm)) {
      ALIAS_MAP.set(norm, book);
      SORTED_ALIASES.push(alias);
    }
  }
}

// Sort aliases longest first for regex matching
SORTED_ALIASES.sort((a, b) => b.length - a.length);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BOOK_REGEX_PART = SORTED_ALIASES.map((a) => {
  const words = a.split(/\s+/).map(escapeRegex).join("\\s+");
  return `${words}\\.?`;
}).join("|");

// Regex to identify book + reference
const FULL_BIBLE_REGEX = new RegExp(
  `\\b(${BOOK_REGEX_PART})\\s+(\\d+)(?:[:_](\\d+)(?:\\s*[-–]\\s*(?:(\\d+)[:_])?(\\d+))?((?:\\s*[,;]\\s*\\d+(?:\\s*[-–]\\s*\\d+)?)*))?\\b`,
  "gi"
);

// Bare verse regex: e.g. "v. 21", "vv. 22-23", "verse 24", "verses 14-19"
const BARE_VERSE_REGEX = /\b(vv?\.|verses?)\s+(\d+)(?:\s*[-–]\s*(\d+))?\b/gi;

function resolveBook(raw) {
  if (!raw) return null;
  const norm = raw.toLowerCase().replace(/\./g, "").trim().replace(/\s+/g, " ");
  return ALIAS_MAP.get(norm) || null;
}

/**
 * Linkifies scripture references in markdown text.
 * 
 * @param {string} text - Input markdown text
 * @param {object} options
 * @param {{ bookName?: string, folder?: string, abbrev: string, chapter: number } | null} options.primaryContext
 * @param {boolean} [options.enableBareRefs=true]
 * @param {boolean} [options.isHeadingOrCallout=false]
 * @param {object} [options.report=null]
 * @returns {string} Linkified markdown text
 */
export function linkify(text, options = {}) {
  if (!text) return "";

  const {
    primaryContext = null,
    enableBareRefs = true,
    isHeadingOrCallout = false,
    report = { ok: 0, unresolved: [], bareRefs: 0 },
  } = options;

  // Protect code blocks, existing links, URLs
  const placeholders = [];
  let tokenCounter = 0;

  function storeToken(content) {
    const id = `___PROTECTED_TOKEN_${tokenCounter++}___`;
    placeholders.push({ id, content });
    return id;
  }

  // 1. Protect frontmatter if present at top
  let workingText = text.replace(/^---[\s\S]*?---\n/m, (m) => storeToken(m));

  // 2. Protect fenced code blocks ``` ... ```
  workingText = workingText.replace(/```[\s\S]*?```/g, (m) => storeToken(m));

  // 3. Protect inline code ` ... `
  workingText = workingText.replace(/`[^`\n]+`/g, (m) => storeToken(m));

  // 4. Protect existing markdown links [text](url)
  workingText = workingText.replace(/\[[^\]]*\]\([^\)]+\)/g, (m) => storeToken(m));

  // 5. Protect existing wikilinks [[ ... ]]
  workingText = workingText.replace(/\[\[[^\]]+\]\]/g, (m) => storeToken(m));

  // 6. Protect URLs
  workingText = workingText.replace(/https?:\/\/[^\s)\]]+/g, (m) => storeToken(m));

  // 7. Protect callout body lines if callouts exist
  // We process line by line to respect callout bodies and headings
  const lines = workingText.split("\n");
  let insideCalloutQuote = false;

  const processedLines = lines.map((line) => {
    const trimmed = line.trim();

    // Check if line is a callout header
    if (/^>\s*\[!/.test(trimmed)) {
      insideCalloutQuote = true;
      return line;
    }

    if (insideCalloutQuote) {
      if (trimmed.startsWith(">")) {
        // Do not linkify inside callout quote body per §6.7
        return line;
      } else {
        insideCalloutQuote = false;
      }
    }

    const isHeading = /^#{1,6}\s+/.test(trimmed);

    return linkifyLine(line, {
      primaryContext,
      enableBareRefs,
      noAnchors: isHeading || isHeadingOrCallout,
      report,
    });
  });

  workingText = processedLines.join("\n");

  // Restore protected tokens in reverse order
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const { id, content } = placeholders[i];
    workingText = workingText.replace(id, content);
  }

  return workingText;
}

function linkifyLine(line, { primaryContext, enableBareRefs, noAnchors, report }) {
  if (!line || !line.trim()) return line;

  // Pass 1: Book-based references
  let result = line.replace(
    FULL_BIBLE_REGEX,
    (match, bookRaw, chStr, vStartStr, crossChStr, vEndStr, extraList, offset, fullStr) => {
      const book = resolveBook(bookRaw);
      if (!book) return match;

      const ch = parseInt(chStr, 10);

      // Ambiguous single-word English books (Job, Mark, Acts, Ruth, Amos)
      if (book.ambiguous && !vStartStr) {
        // Chapter only form like "Mark 2" or "Job 1"
        // Must check if followed by lowercase word that isn't a verse marker
        const afterMatch = fullStr.slice(offset + match.length);
        const nextWordMatch = afterMatch.match(/^\s+([a-z]+)/);
        if (nextWordMatch) {
          const nextWord = nextWordMatch[1];
          if (!["v", "verse", "verses", "vv"].includes(nextWord)) {
            // Low confidence / ambiguous non-Bible usage
            return match;
          }
        }
      }

      // Check if chapter exists in vault
      if (!vaultIndex.hasChapter(book.abbrev, ch)) {
        report.unresolved.push(match);
        return match;
      }

      // Chapter-only reference: e.g. "Rom. 7", "Romans 6"
      if (!vStartStr) {
        report.ok++;
        return `[[${book.abbrev} ${ch}|${match}]]`;
      }

      const vStart = parseInt(vStartStr, 10);

      // Validate vStart
      if (!vaultIndex.hasVerse(book.abbrev, ch, vStart)) {
        report.unresolved.push(match);
        return match;
      }

      // Cross-chapter range: e.g. "Rom 7:25–8:1"
      if (crossChStr) {
        const ch2 = parseInt(crossChStr, 10);
        const vEnd = parseInt(vEndStr, 10);

        if (!vaultIndex.hasChapter(book.abbrev, ch2) || !vaultIndex.hasVerse(book.abbrev, ch2, vEnd)) {
          report.unresolved.push(match);
          return match;
        }

        report.ok++;
        const mainLink = `[[${book.abbrev} ${ch}#v${vStart}|${match}]]`;
        if (noAnchors) return mainLink;

        // Custom cross-chapter anchor expansion (§7.3)
        const anchors = [];
        const ch1Max = vaultIndex.getMaxVerse(book.abbrev, ch) || vStart;
        for (let v = vStart; v <= ch1Max; v++) {
          anchors.push(`[[${book.abbrev} ${ch}#v${v}|]]`);
        }
        for (let v = 1; v <= vEnd; v++) {
          anchors.push(`[[${book.abbrev} ${ch2}#v${v}|]]`);
        }

        return `${mainLink} ${anchors.join("")}`;
      }

      // Verse range within same chapter: e.g. "Rom. 7:14–19"
      if (vEndStr) {
        const vEnd = parseInt(vEndStr, 10);
        if (!vaultIndex.hasVerse(book.abbrev, ch, vEnd)) {
          report.unresolved.push(match);
          return match;
        }

        report.ok++;
        const mainLink = `[[${book.abbrev} ${ch}#v${vStart}|${match}]]`;
        if (noAnchors) return mainLink;

        const anchors = [];
        for (let v = vStart; v <= vEnd; v++) {
          anchors.push(`[[${book.abbrev} ${ch}#v${v}|]]`);
        }
        return `${mainLink} ${anchors.join("")}`;
      }

      // Single verse with extra list: e.g. "Rom 7:20, 22"
      if (extraList) {
        report.ok++;
        const mainLink = `[[${book.abbrev} ${ch}#v${vStart}|${bookRaw} ${ch}:${vStart}]]`;
        const listItems = extraList.split(/([,;]\s*)/);
        let builtList = "";

        for (const item of listItems) {
          if (!item.trim() || /[,;]/.test(item)) {
            builtList += item;
            continue;
          }
          const rangeMatch = item.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
          if (rangeMatch) {
            const extraV1 = parseInt(rangeMatch[1], 10);
            const extraV2 = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : null;
            if (vaultIndex.hasVerse(book.abbrev, ch, extraV1)) {
              if (extraV2) {
                const subLink = `[[${book.abbrev} ${ch}#v${extraV1}|${item}]]`;
                const subAnchors = [];
                if (!noAnchors) {
                  for (let v = extraV1; v <= extraV2; v++) {
                    subAnchors.push(`[[${book.abbrev} ${ch}#v${v}|]]`);
                  }
                }
                builtList += noAnchors ? subLink : `${subLink} ${subAnchors.join("")}`;
              } else {
                builtList += `[[${book.abbrev} ${ch}#v${extraV1}|${item}]]`;
              }
              report.ok++;
            } else {
              builtList += item;
              report.unresolved.push(`${book.folder} ${ch}:${item}`);
            }
          } else {
            builtList += item;
          }
        }

        return `${mainLink}${builtList}`;
      }

      // Single verse: e.g. "Romans 7:21"
      report.ok++;
      return `[[${book.abbrev} ${ch}#v${vStart}|${match}]]`;
    }
  );

  // Pass 2: Bare verse references: "v. 21", "vv. 22-23", "verse 24", "verses 14-19"
  if (enableBareRefs && primaryContext && primaryContext.abbrev && primaryContext.chapter) {
    const { abbrev, chapter } = primaryContext;

    result = result.replace(BARE_VERSE_REGEX, (match, prefix, vStartStr, vEndStr) => {
      const vStart = parseInt(vStartStr, 10);

      // Must exist in primary chapter
      if (!vaultIndex.hasVerse(abbrev, chapter, vStart)) {
        return match; // leave unlinked
      }

      if (vEndStr) {
        const vEnd = parseInt(vEndStr, 10);
        if (!vaultIndex.hasVerse(abbrev, chapter, vEnd)) {
          return match;
        }

        report.ok++;
        report.bareRefs++;
        const mainLink = `[[${abbrev} ${chapter}#v${vStart}|${match}]]`;
        if (noAnchors) return mainLink;

        const anchors = [];
        for (let v = vStart; v <= vEnd; v++) {
          anchors.push(`[[${abbrev} ${chapter}#v${v}|]]`);
        }
        return `${mainLink} ${anchors.join("")}`;
      }

      // Single bare verse
      report.ok++;
      report.bareRefs++;
      return `[[${abbrev} ${chapter}#v${vStart}|${match}]]`;
    });
  }

  return result;
}

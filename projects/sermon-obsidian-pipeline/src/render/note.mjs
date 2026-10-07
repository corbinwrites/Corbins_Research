import { linkify } from "../bible/linkify.mjs";

function yamlEscape(str) {
  if (!str) return '""';
  // If string contains newlines or double quotes
  const escaped = str.replace(/"/g, '\\"').replace(/\n+/g, " ");
  return `"${escaped}"`;
}

/**
 * Builds the primary passage blockquote with per-verse empty-alias anchors.
 * 
 * @param {object} book - Book definition object
 * @param {number} chapter
 * @param {number} verseStart
 * @param {number} verseEnd
 * @param {string} passageLabel
 * @returns {string}
 */
export function buildPrimaryPassageBlock(book, chapter, verseStart, verseEnd, passageLabel) {
  if (!book || !chapter) {
    return passageLabel ? `> ${passageLabel}` : "";
  }

  const abbrev = book.abbrev;
  const label = passageLabel || `${book.folder} ${chapter}:${verseStart}${verseEnd && verseEnd !== verseStart ? `–${verseEnd}` : ""}`;

  if (!verseStart) {
    return `> [[${abbrev} ${chapter}|${label}]]`;
  }

  const mainLink = `[[${abbrev} ${chapter}#v${verseStart}|${label}]]`;
  const end = verseEnd || verseStart;
  const anchors = [];

  for (let v = verseStart; v <= end; v++) {
    anchors.push(`[[${abbrev} ${chapter}#v${v}|]]`);
  }

  return `> ${mainLink} ${anchors.join("")}`;
}

/**
 * Renders the complete Markdown document according to §5 note spec.
 * 
 * @param {object} params
 * @returns {string} Complete Markdown note content
 */
export function renderNote(params) {
  const {
    title,
    sermonTitle,
    teacher = "Chris Gee",
    passage,
    book,
    chapter,
    verseStart,
    verseEnd,
    date,
    source = "WhatsApp",
    sourceFileName = "",
    importMatch = "message",
    bigIdea = "",
    questions = [],
    teachingNotes = "",
  } = params;

  const bookName = book ? book.folder : (params.bookName || "");
  const safePassage = passage || "";
  const fullTitle = title || (sermonTitle && safePassage ? `${sermonTitle} (${safePassage})` : sermonTitle || safePassage || "Untitled Sermon");
  const actualSermonTitle = sermonTitle || title || "Untitled";

  // Frontmatter
  const frontmatterLines = [
    "---",
    `title: ${yamlEscape(fullTitle)}`,
    `base: "[[Church Notes.base]]"`,
    `Teacher: ${yamlEscape(teacher)}`,
    `Type: Sermon`,
    `Location: Church`,
    `Status: Imported`,
    `Passage: ${yamlEscape(safePassage)}`,
    ...(bookName ? [`Book: ${yamlEscape(bookName)}`] : []),
    ...(date ? [`Date: ${date}`] : []),
    `Sermon Title: ${yamlEscape(actualSermonTitle)}`,
    ...(bigIdea ? [`Big Idea: ${yamlEscape(bigIdea)}`] : []),
    `Source: ${yamlEscape(source)}`,
    ...(sourceFileName ? [`PDF: ${yamlEscape(sourceFileName)}`] : []),
    `Import Match: ${yamlEscape(importMatch)}`,
    "---",
  ];

  // Body sections
  const sections = [frontmatterLines.join("\n"), ""];

  // 1. Passage
  const passageBlock = buildPrimaryPassageBlock(book, chapter, verseStart, verseEnd, safePassage);
  if (passageBlock) {
    sections.push("## Passage\n");
    sections.push(`${passageBlock}\n`);
  }

  // 2. Sermon Info
  sections.push("## Sermon Info\n");
  const infoLines = [];
  if (date) infoLines.push(`- **Date:** ${date}`);
  if (teacher) infoLines.push(`- **Teacher:** ${teacher}`);
  if (safePassage) infoLines.push(`- **Passage:** ${safePassage}`);
  if (actualSermonTitle) infoLines.push(`- **Title:** ${actualSermonTitle}`);
  sections.push(`${infoLines.join("\n")}\n`);

  // 3. Discussion Questions (omit if empty)
  if (questions && questions.length > 0) {
    sections.push("## Discussion Questions\n");
    const primaryContext = book && chapter ? { abbrev: book.abbrev, chapter } : null;
    const formattedQuestions = questions.map((q, idx) => {
      // Linkify inline scripture in questions
      const linked = linkify(q, { primaryContext, enableBareRefs: true });
      return `${idx + 1}. ${linked}`;
    });
    sections.push(`${formattedQuestions.join("\n")}\n`);
  }

  // 4. Teaching Notes
  sections.push("## Teaching Notes\n");
  sections.push(`${teachingNotes.trim()}\n`);

  // 5. Source File (linked, not embedded)
  if (sourceFileName) {
    sections.push("## Source File\n");
    sections.push(`[[Attachments/${sourceFileName}]]\n`);
  }

  return sections.join("\n");
}

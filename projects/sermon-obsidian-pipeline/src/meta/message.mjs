import teachers from "./teachers.json" with { type: "json" };
import books from "../bible/books.json" with { type: "json" };

function resolveTeacher(raw) {
  if (!raw) return "";
  const trim = raw.trim();
  return teachers[trim] || trim;
}

function resolveBook(raw) {
  if (!raw) return null;
  const clean = raw.toLowerCase().replace(/\./g, "").trim().replace(/\s+/g, " ");
  for (const b of books) {
    if (b.name.toLowerCase() === clean) return b;
    for (const a of b.aliases) {
      if (a.toLowerCase().replace(/\./g, "").trim() === clean) return b;
    }
  }
  return null;
}

function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // e.g. "27 September 2026" or "27 Sept 2026"
  const dayMonthYear = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dayMonthYear) {
    const day = parseInt(dayMonthYear[1], 10);
    const monthStr = dayMonthYear[2];
    const year = parseInt(dayMonthYear[3], 10);
    const parsed = new Date(`${monthStr} ${day}, ${year} 12:00:00 UTC`);
    if (!isNaN(parsed.getTime())) {
      const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const d = String(parsed.getUTCDate()).padStart(2, "0");
      return `${year}-${m}-${d}`;
    }
  }

  // e.g. "September 27, 2026"
  const monthDayYear = clean.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayYear) {
    const parsed = new Date(`${monthDayYear[1]} ${monthDayYear[2]}, ${monthDayYear[3]} 12:00:00 UTC`);
    if (!isNaN(parsed.getTime())) {
      const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const d = String(parsed.getUTCDate()).padStart(2, "0");
      return `${monthDayYear[3]}-${m}-${d}`;
    }
  }

  const generic = new Date(clean);
  if (!isNaN(generic.getTime())) {
    return generic.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Parses a WhatsApp text message containing sermon metadata and discussion questions.
 * 
 * @param {string} text - Raw WhatsApp message text
 * @returns {object} Parsed metadata object
 */
export function parseWhatsAppMessage(text) {
  if (!text) return null;

  const warnings = [];
  const trimmedText = text.trim();

  // Truncation detection
  if (trimmedText.endsWith("…") || trimmedText.endsWith("...")) {
    warnings.push('message ends with "…" (possibly truncated)');
  } else if (!/[.?!'"”’]$/.test(trimmedText)) {
    warnings.push("message appears truncated mid-sentence (no terminal punctuation)");
  }

  const lines = trimmedText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 3) {
    return null;
  }

  // Line 1: Title
  const title = lines[0];

  // Line 2: Date
  const dateISO = parseDateToISO(lines[1]);
  if (dateISO) {
    const d = new Date(`${dateISO}T12:00:00Z`);
    if (d.getUTCDay() !== 0) {
      warnings.push(`date ${dateISO} is not a Sunday`);
    }
  } else {
    warnings.push(`could not parse date from "${lines[1]}"`);
  }

  // Line 3: Passage
  let passageRaw = lines[2];
  let normalizedPassage = passageRaw.replace(/\s*[-–]\s*/g, "–");
  let book = null;
  let chapter = null;
  let verseStart = null;
  let verseEnd = null;

  const passageMatch = normalizedPassage.match(/^([1-3]?\s*[A-Za-z]+(?:\.[A-Za-z]+)?)\s+(\d+)[:_](\d+)(?:–(\d+))?$/);
  if (passageMatch) {
    book = resolveBook(passageMatch[1]);
    chapter = parseInt(passageMatch[2], 10);
    verseStart = parseInt(passageMatch[3], 10);
    verseEnd = passageMatch[4] ? parseInt(passageMatch[4], 10) : verseStart;
    if (book) {
      normalizedPassage = `${book.folder} ${chapter}:${verseStart}${verseEnd !== verseStart ? `–${verseEnd}` : ""}`;
    }
  }

  // Line 4: Teacher (if present and not a question)
  let teacher = "";
  let questionStartIndex = 3;

  if (lines.length > 3 && !lines[3].startsWith("#")) {
    teacher = resolveTeacher(lines[3]);
    questionStartIndex = 4;
  }

  // Questions: #1, #2, #3 ...
  const questions = [];
  let currentQuestion = "";

  for (let i = questionStartIndex; i < lines.length; i++) {
    const line = lines[i];
    const qMatch = line.match(/^#\d+[\.:]?\s*(.*)/);
    if (qMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion.trim());
      }
      currentQuestion = qMatch[1];
    } else {
      if (currentQuestion) {
        currentQuestion += " " + line;
      }
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion.trim());
  }

  return {
    title,
    date: dateISO,
    passage: normalizedPassage,
    book,
    chapter,
    verseStart,
    verseEnd,
    teacher,
    questions,
    warnings,
  };
}

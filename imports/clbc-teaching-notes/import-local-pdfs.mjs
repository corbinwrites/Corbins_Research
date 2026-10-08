#!/usr/bin/env node
/**
 * import-local-pdfs.mjs
 *
 * Imports sermon-notes PDFs / DOCX / DOC files from a local source directory
 * into the Obsidian vault at Ministry/Church/, enriching each note with data
 * from the City Light Sunday Service Schedule spreadsheet, generating
 * Bible-Linker-compatible wikilinks for the primary passage AND all inline
 * Scripture references throughout the manuscript text.
 *
 * Usage:
 *   node import-local-pdfs.mjs [--dry-run] [--skip-existing]
 */

import { mkdir, readFile, stat, writeFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

// ── Configuration ─────────────────────────────────────────────────────────────

const SOURCE_DIR =
  process.env.SOURCE_DIR || path.join(process.env.HOME, "Downloads", "Sermon Notes");

const VAULT_ROOT =
  process.env.VAULT_ROOT ||
  path.join(
    process.env.HOME,
    "Library",
    "Mobile Documents",
    "iCloud~md~obsidian",
    "Documents",
    "Corbin_Personal"
  );

const CHURCH_DIR = path.join(VAULT_ROOT, "Ministry", "Church");
const REPORTS_DIR = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "output",
  "local-import"
);

const SCHEDULE_XLSX =
  process.env.SCHEDULE_XLSX ||
  path.join(process.env.HOME, "Downloads", "City Light Bible Sunday Service Schedule 2025-26.xlsx");

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_EXISTING = process.argv.includes("--skip-existing");

// ── Book abbreviation map ─────────────────────────────────────────────────────

const BOOK_MAP = {
  genesis: { folder: "Genesis", abbrev: "Gen" },
  exodus: { folder: "Exodus", abbrev: "Exod" },
  leviticus: { folder: "Leviticus", abbrev: "Lev" },
  numbers: { folder: "Numbers", abbrev: "Num" },
  deuteronomy: { folder: "Deuteronomy", abbrev: "Deut" },
  joshua: { folder: "Joshua", abbrev: "Josh" },
  judges: { folder: "Judges", abbrev: "Judg" },
  ruth: { folder: "Ruth", abbrev: "Ruth" },
  "1 samuel": { folder: "1 Samuel", abbrev: "1 Sam" },
  "2 samuel": { folder: "2 Samuel", abbrev: "2 Sam" },
  "1 kings": { folder: "1 Kings", abbrev: "1 Kgs" },
  "2 kings": { folder: "2 Kings", abbrev: "2 Kgs" },
  "1 chronicles": { folder: "1 Chronicles", abbrev: "1 Chr" },
  "2 chronicles": { folder: "2 Chronicles", abbrev: "2 Chr" },
  ezra: { folder: "Ezra", abbrev: "Ezra" },
  nehemiah: { folder: "Nehemiah", abbrev: "Neh" },
  esther: { folder: "Esther", abbrev: "Esth" },
  job: { folder: "Job", abbrev: "Job" },
  psalms: { folder: "Psalms", abbrev: "Ps" },
  psalm: { folder: "Psalms", abbrev: "Ps" },
  proverbs: { folder: "Proverbs", abbrev: "Prov" },
  ecclesiastes: { folder: "Ecclesiastes", abbrev: "Eccl" },
  "song of solomon": { folder: "Song of Solomon", abbrev: "Song" },
  isaiah: { folder: "Isaiah", abbrev: "Isa" },
  jeremiah: { folder: "Jeremiah", abbrev: "Jer" },
  lamentations: { folder: "Lamentations", abbrev: "Lam" },
  ezekiel: { folder: "Ezekiel", abbrev: "Ezek" },
  daniel: { folder: "Daniel", abbrev: "Dan" },
  hosea: { folder: "Hosea", abbrev: "Hos" },
  joel: { folder: "Joel", abbrev: "Joel" },
  amos: { folder: "Amos", abbrev: "Amos" },
  obadiah: { folder: "Obadiah", abbrev: "Obad" },
  jonah: { folder: "Jonah", abbrev: "Jonah" },
  micah: { folder: "Micah", abbrev: "Mic" },
  nahum: { folder: "Nahum", abbrev: "Nah" },
  habakkuk: { folder: "Habakkuk", abbrev: "Hab" },
  zephaniah: { folder: "Zephaniah", abbrev: "Zeph" },
  haggai: { folder: "Haggai", abbrev: "Hag" },
  zechariah: { folder: "Zechariah", abbrev: "Zech" },
  malachi: { folder: "Malachi", abbrev: "Mal" },
  matthew: { folder: "Matthew", abbrev: "Matt" },
  mark: { folder: "Mark", abbrev: "Mark" },
  luke: { folder: "Luke", abbrev: "Luke" },
  john: { folder: "John", abbrev: "John" },
  acts: { folder: "Acts", abbrev: "Acts" },
  romans: { folder: "Romans", abbrev: "Rom" },
  "1 corinthians": { folder: "1 Corinthians", abbrev: "1 Cor" },
  "2 corinthians": { folder: "2 Corinthians", abbrev: "2 Cor" },
  galatians: { folder: "Galatians", abbrev: "Gal" },
  ephesians: { folder: "Ephesians", abbrev: "Eph" },
  philippians: { folder: "Philippians", abbrev: "Phil" },
  colossians: { folder: "Colossians", abbrev: "Col" },
  "1 thessalonians": { folder: "1 Thessalonians", abbrev: "1 Thess" },
  "2 thessalonians": { folder: "2 Thessalonians", abbrev: "2 Thess" },
  "1 timothy": { folder: "1 Timothy", abbrev: "1 Tim" },
  "2 timothy": { folder: "2 Timothy", abbrev: "2 Tim" },
  titus: { folder: "Titus", abbrev: "Titus" },
  philemon: { folder: "Philemon", abbrev: "Phlm" },
  hebrews: { folder: "Hebrews", abbrev: "Heb" },
  james: { folder: "James", abbrev: "Jas" },
  "1 peter": { folder: "1 Peter", abbrev: "1 Pet" },
  "2 peter": { folder: "2 Peter", abbrev: "2 Pet" },
  "1 john": { folder: "1 John", abbrev: "1 John" },
  "2 john": { folder: "2 John", abbrev: "2 John" },
  "3 john": { folder: "3 John", abbrev: "3 John" },
  jude: { folder: "Jude", abbrev: "Jude" },
  revelation: { folder: "Revelation", abbrev: "Rev" },
  rev: { folder: "Revelation", abbrev: "Rev" },
};

const ABBREV_TO_KEY = {
  gen: "genesis", exod: "exodus", lev: "leviticus", num: "numbers",
  deut: "deuteronomy", dt: "deuteronomy", josh: "joshua", judg: "judges", jdg: "judges",
  "1 sam": "1 samuel", "2 sam": "2 samuel", "1sam": "1 samuel", "2sam": "2 samuel",
  "1 kgs": "1 kings", "2 kgs": "2 kings", "1kgs": "1 kings", "2kgs": "2 kings",
  "1 chr": "1 chronicles", "2 chr": "2 chronicles", "1chr": "1 chronicles", "2chr": "2 chronicles",
  neh: "nehemiah", esth: "esther",
  ps: "psalms", psalm: "psalms", psalms: "psalms", prov: "proverbs", eccl: "ecclesiastes", ecc: "ecclesiastes",
  isa: "isaiah", is: "isaiah", jer: "jeremiah", lam: "lamentations",
  ezek: "ezekiel", ezk: "ezekiel", dan: "daniel", dn: "daniel", hos: "hosea",
  mic: "micah", nah: "nahum", hab: "habakkuk",
  zeph: "zephaniah", hag: "haggai", zech: "zechariah", mal: "malachi",
  matt: "matthew", mt: "matthew", mk: "mark", mrk: "mark", lk: "luke", luk: "luke", jn: "john", jhn: "john",
  rom: "romans", rm: "romans",
  "1 cor": "1 corinthians", "2 cor": "2 corinthians", "1cor": "1 corinthians", "2cor": "2 corinthians",
  gal: "galatians", eph: "ephesians", ephes: "ephesians", phil: "philippians", php: "philippians",
  col: "colossians",
  "1 thess": "1 thessalonians", "2 thess": "2 thessalonians", "1thess": "1 thessalonians", "2thess": "2 thessalonians",
  "1 tim": "1 timothy", "2 tim": "2 timothy", "1tim": "1 timothy", "2tim": "2 timothy",
  titus: "titus", tit: "titus",
  phlm: "philemon", phm: "philemon", heb: "hebrews", jas: "james", jm: "james",
  "1 pet": "1 peter", "2 pet": "2 peter", "1pet": "1 peter", "2pet": "2 peter",
  "1 john": "1 john", "2 john": "2 john", "3 john": "3 john",
  "1jn": "1 john", "2jn": "2 john", "3jn": "3 john",
  jude: "jude", rev: "revelation",
};

function resolveBook(bookRaw) {
  if (!bookRaw) return null;
  const key = bookRaw.toLowerCase().replace(/\./g, "").trim();
  if (BOOK_MAP[key]) return BOOK_MAP[key];
  if (ABBREV_TO_KEY[key]) return BOOK_MAP[ABBREV_TO_KEY[key]];
  const prefix = Object.keys(BOOK_MAP).find((k) => k.startsWith(key) || key.startsWith(k));
  return prefix ? BOOK_MAP[prefix] : null;
}

// ── In-Text Scripture Linkifier ───────────────────────────────────────────────

const BIBLE_REF_REGEX = /\b((?:[123]\s+)?[A-Za-z]+(?:\.[A-Za-z]+)?)\.?\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?\b/g;

function linkifyScripture(text) {
  if (!text) return "";
  return text.replace(BIBLE_REF_REGEX, (match, bookRaw, chStr, vStartStr, vEndStr) => {
    const book = resolveBook(bookRaw);
    if (!book) return match;

    const ch = parseInt(chStr, 10);
    const vStart = parseInt(vStartStr, 10);
    const vEnd = vEndStr ? parseInt(vEndStr, 10) : null;

    const fileRef = `${book.abbrev} ${ch}`;
    const dash = "–";
    const label = `${book.folder} ${ch}:${vStart}${vEnd && vEnd !== vStart ? dash + vEnd : ""}`;
    const mainLink = `[[${fileRef}#v${vStart}|${label}]]`;

    const end = vEnd || vStart;
    const anchors = Array.from({ length: Math.min(end - vStart + 1, 25) }, (_, i) => vStart + i)
      .map((v) => `[[${fileRef}#v${v}|]]`)
      .join("");

    return `${mainLink} ${anchors}`;
  });
}

// ── Filename parsing ──────────────────────────────────────────────────────────

function parseFilename(filename) {
  const base = filename.replace(/\.(pdf|docx?|pages_.*)$/i, "").trim();

  const partMatch = base.match(/Part\s*(\d+)/i);
  const partSuffix = partMatch ? ` (Part ${partMatch[1]})` : "";

  let occasion = "";
  let embeddedPassage = null;
  const parenMatches = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);

  for (const p of parenMatches) {
    if (/city light/gi.test(p)) {
      const occ = p.replace(/city light/gi, "").replace(/^[\s,]+|[\s,]+$/g, "").trim();
      if (occ) occasion = occ;
    } else if (/\d+\s+thess|romans|exodus|cor|john|matt|luke|peter|rev|thess/i.test(p)) {
      embeddedPassage = p;
    }
  }

  let withoutParen = base
    .replace(/\s*\(\d+\)$/, "")
    .replace(/\s*\([^)]*City Light[^)]*\)\s*$/gi, "")
    .replace(/,\s*Part\s*\d+/gi, "")
    .trim();

  const datePrefixMatch = withoutParen.match(/^(\d{4}-\d{2}-\d{2})[_\s]+(.+)/);
  const datePrefix = datePrefixMatch ? datePrefixMatch[1] : null;
  let coreText = datePrefixMatch ? datePrefixMatch[2] : (embeddedPassage || withoutParen);

  let cleanCore = coreText
    .replace(/^Exodus Two/i, "Exodus 2")
    .replace(/^Exodus Sermon/i, "Exodus")
    .replace(/\s*Preaching Notes.*/i, "")
    .replace(/\s*\(Manuscript\)/i, "")
    .replace(/\s+-\s+[A-Za-z_].*$/, "")
    .replace(/introduction/i, "")
    .trim();

  // 1 John 2-15-17 Message
  const dashVerse = cleanCore.match(/^(.+?)\s+(\d+)[-](\d+)[-](\d+)(?:\s+Message)?$/i);
  if (dashVerse) {
    return {
      bookRaw: dashVerse[1].trim(),
      chapter: parseInt(dashVerse[2], 10),
      verseStart: parseInt(dashVerse[3], 10),
      verseEnd: parseInt(dashVerse[4], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  // Cross chapter: 1 Thessalonians 2_17-3_8 or Revelation 21_19-22_5
  const crossPattern = /^(.+?)\s+(\d+)[_:](\d+)\s*[-–]\s*(\d+)[_:](\d+)$/;
  const crossMatch = cleanCore.match(crossPattern);
  if (crossMatch) {
    return {
      bookRaw: crossMatch[1].trim(),
      chapter: parseInt(crossMatch[2], 10),
      verseStart: parseInt(crossMatch[3], 10),
      chapterEnd: parseInt(crossMatch[4], 10),
      verseEnd: parseInt(crossMatch[5], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      isCross: true,
      partSuffix,
    };
  }

  // Semi-colon verse pattern: 2 Thessalonians 1_1-4; 11-12 or 2 Thessalonians 3_6; 14-15
  const semiPattern = /^(.+?)\s+(\d+)[_:](\d+)(?:[-–](\d+))?;\s*(\d+)(?:[-–](\d+))?$/;
  const semiMatch = cleanCore.match(semiPattern);
  if (semiMatch) {
    return {
      bookRaw: semiMatch[1].trim(),
      chapter: parseInt(semiMatch[2], 10),
      verseStart: parseInt(semiMatch[3], 10),
      verseEnd: parseInt(semiMatch[4] || semiMatch[3], 10),
      extraVerseStart: parseInt(semiMatch[5], 10),
      extraVerseEnd: parseInt(semiMatch[6] || semiMatch[5], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      isSemi: true,
      partSuffix,
    };
  }

  // Space-delimited chapter and verse: e.g. Genesis 4 1-16 or John 9 1-41
  const spaceVersePattern = /^(.+?)\s+(\d+)\s+(\d+)\s*[-–]\s*(\d+)$/;
  const spaceMatch = cleanCore.match(spaceVersePattern);
  if (spaceMatch) {
    return {
      bookRaw: spaceMatch[1].trim(),
      chapter: parseInt(spaceMatch[2], 10),
      verseStart: parseInt(spaceMatch[3], 10),
      verseEnd: parseInt(spaceMatch[4], 10),
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  // Chapter range: Exodus 7-10 or Exodus 16-40
  const chRangePattern = /^(.+?)\s+(\d+)\s*[-–]\s*(\d+)$/;
  const chMatch = cleanCore.match(chRangePattern);
  const numberedBookPrefixes = [
    "1 cor", "2 cor", "1 thess", "2 thess", "1 tim", "2 tim",
    "1 pet", "2 pet", "1 john", "2 john", "3 john",
    "1 sam", "2 sam", "1 kgs", "2 kgs", "1 chr", "2 chr",
  ];
  if (chMatch && !numberedBookPrefixes.includes(chMatch[1].toLowerCase().trim())) {
    return {
      bookRaw: chMatch[1].trim(),
      chapter: parseInt(chMatch[2], 10),
      chapterEnd: parseInt(chMatch[3], 10),
      verseStart: null,
      verseEnd: null,
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  // Standard: Book Ch_V1-V2 or Book Ch:V1-V2 or Book Ch V1-V2
  const standardPattern = /^(.+?)\s+(\d+)(?:[_:](\d+)(?:[-–](\d+))?)?$/;
  const stdMatch = cleanCore.match(standardPattern);
  if (stdMatch) {
    return {
      bookRaw: stdMatch[1].trim(),
      chapter: parseInt(stdMatch[2], 10),
      chapterEnd: null,
      verseStart: stdMatch[3] ? parseInt(stdMatch[3], 10) : null,
      verseEnd: stdMatch[4] ? parseInt(stdMatch[4], 10) : null,
      occasion,
      datePrefix,
      passageRaw: base,
      partSuffix,
    };
  }

  return {
    bookRaw: cleanCore,
    chapter: null,
    chapterEnd: null,
    verseStart: null,
    verseEnd: null,
    occasion,
    datePrefix,
    passageRaw: base,
    partSuffix,
  };
}

function buildPassageLabel(parsedInfo, book) {
  const bookName = book ? book.folder : parsedInfo.bookRaw;
  let label = bookName;

  if (parsedInfo.isCross) {
    label = `${bookName} ${parsedInfo.chapter}:${parsedInfo.verseStart}–${parsedInfo.chapterEnd}:${parsedInfo.verseEnd}`;
  } else if (parsedInfo.isSemi) {
    label = `${bookName} ${parsedInfo.chapter}:${parsedInfo.verseStart}–${parsedInfo.verseEnd}; ${parsedInfo.extraVerseStart}–${parsedInfo.extraVerseEnd}`;
  } else if (parsedInfo.chapterEnd) {
    label = `${bookName} ${parsedInfo.chapter}–${parsedInfo.chapterEnd}`;
  } else if (parsedInfo.chapter) {
    label = `${bookName} ${parsedInfo.chapter}`;
    if (parsedInfo.verseStart) {
      label += `:${parsedInfo.verseStart}`;
      if (parsedInfo.verseEnd && parsedInfo.verseEnd !== parsedInfo.verseStart) {
        label += `–${parsedInfo.verseEnd}`;
      }
    }
  }

  if (parsedInfo.partSuffix) label += parsedInfo.partSuffix;
  return label;
}

function buildBibleLinks(parsedInfo, book) {
  if (!book || !parsedInfo.chapter) return "";
  const abbrev = book.abbrev;
  const fileRef = `${abbrev} ${parsedInfo.chapter}`;

  if (parsedInfo.isCross) {
    const fileRef2 = `${abbrev} ${parsedInfo.chapterEnd}`;
    const label = `${book.folder} ${parsedInfo.chapter}:${parsedInfo.verseStart}–${parsedInfo.chapterEnd}:${parsedInfo.verseEnd}`;
    return `> [[${fileRef}#v${parsedInfo.verseStart}|${label}]] [[${fileRef}#v${parsedInfo.verseStart}|]][[${fileRef2}#v${parsedInfo.verseEnd}|]]`;
  }

  if (parsedInfo.isSemi) {
    const label = `${book.folder} ${parsedInfo.chapter}:${parsedInfo.verseStart}–${parsedInfo.verseEnd}; ${parsedInfo.extraVerseStart}–${parsedInfo.extraVerseEnd}`;
    return `> [[${fileRef}#v${parsedInfo.verseStart}|${label}]] [[${fileRef}#v${parsedInfo.verseStart}|]][[${fileRef}#v${parsedInfo.extraVerseStart}|]]`;
  }

  if (parsedInfo.chapterEnd) {
    const links = [];
    for (let c = parsedInfo.chapter; c <= parsedInfo.chapterEnd; c++) {
      links.push(`[[${abbrev} ${c}|${book.folder} ${c}]]`);
    }
    return `> ${links.join(" ")}`;
  }

  if (!parsedInfo.verseStart) {
    return `> [[${fileRef}|${book.folder} ${parsedInfo.chapter}]]`;
  }

  const label = `${book.folder} ${parsedInfo.chapter}:${parsedInfo.verseStart}${
    parsedInfo.verseEnd && parsedInfo.verseEnd !== parsedInfo.verseStart ? `–${parsedInfo.verseEnd}` : ""
  }`;
  const mainLink = `[[${fileRef}#v${parsedInfo.verseStart}|${label}]]`;
  const end = parsedInfo.verseEnd || parsedInfo.verseStart;
  const anchors = Array.from({ length: Math.min(end - parsedInfo.verseStart + 1, 50) }, (_, i) => parsedInfo.verseStart + i)
    .map((v) => `[[${fileRef}#v${v}|]]`)
    .join("");

  return `> ${mainLink} ${anchors}`;
}

// ── Schedule loading ──────────────────────────────────────────────────────────

async function loadSchedule() {
  let xlsx;
  try {
    xlsx = require("xlsx");
  } catch {
    console.warn("xlsx package not found — schedule matching disabled.");
    return [];
  }

  try {
    await stat(SCHEDULE_XLSX);
  } catch {
    console.warn(`Schedule file not found at ${SCHEDULE_XLSX}`);
    return [];
  }

  const workbook = xlsx.readFile(SCHEDULE_XLSX);
  const rows = [];

  for (const sheetName of ["Fall", "WinterSpring", "Summer"]) {
    if (!workbook.SheetNames.includes(sheetName)) continue;
    const ws = workbook.Sheets[sheetName];
    const rawArr = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

    let headerIdx = -1;
    let headers = null;
    for (let i = 0; i < rawArr.length; i++) {
      const r = (rawArr[i] || []).map((c) => String(c ?? "").trim());
      if (r.includes("Date") && (r.includes("Preacher") || r.includes("Speaker"))) {
        headerIdx = i;
        headers = r;
        break;
      }
    }
    if (!headers) continue;

    const col = (name) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const iDate = col("Date");
    const iPreacher = headers.findIndex((h) => /preacher|speaker/i.test(h));
    const iText = col("Text");
    const iTitle = col("Title");
    const iBigIdea = headers.findIndex((h) => /big\s*idea/i.test(h));
    const iSpecial = headers.findIndex((h) => /^special/i.test(h));
    const iNotes = headers.findIndex((h) => /notes/i.test(h));

    for (let r = headerIdx + 1; r < rawArr.length; r++) {
      const row = rawArr[r];
      const dateVal = row[iDate];
      if (!dateVal) continue;

      let dateISO = "";
      if (typeof dateVal === "number") {
        const d = xlsx.SSF.parse_date_code(dateVal);
        dateISO = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else {
        const parsed = new Date(String(dateVal));
        if (!isNaN(parsed)) {
          dateISO = parsed.toISOString().slice(0, 10);
        }
      }
      if (!dateISO) continue;

      rows.push({
        date: dateISO,
        preacher: String(row[iPreacher] ?? "").trim(),
        text: String(row[iText] ?? "").trim(),
        title: String(row[iTitle] ?? "").trim(),
        bigIdea: String(row[iBigIdea] ?? "").trim(),
        special: String(row[iSpecial] ?? "").trim(),
        sundayNotes: String(row[iNotes] ?? "").trim(),
        _sheet: sheetName,
      });
    }
  }

  return rows;
}

function normalizeTokens(str) {
  return str
    .toLowerCase()
    .replace(/[_:,;\u2013\-()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchSchedule(filename, parsedInfo, book, scheduleRows) {
  if (parsedInfo.datePrefix) {
    const byDate = scheduleRows.find((r) => r.date === parsedInfo.datePrefix);
    if (byDate) return { row: byDate, confidence: "date" };
  }

  if (book && parsedInfo.chapter) {
    for (const row of scheduleRows) {
      if (!row.text) continue;
      const rowNorm = ` ${normalizeTokens(row.text)} `;
      const bFolder = book.folder.toLowerCase();
      const bAbbrev = book.abbrev.toLowerCase();
      const hasBook = rowNorm.includes(` ${bFolder} `) || rowNorm.includes(` ${bAbbrev} `);
      if (!hasBook) continue;

      const hasChapter = rowNorm.includes(` ${parsedInfo.chapter} `) || rowNorm.includes(` ${parsedInfo.chapter}:`);
      if (!hasChapter) continue;

      if (parsedInfo.verseStart) {
        if (rowNorm.includes(` ${parsedInfo.verseStart} `) || rowNorm.includes(`:${parsedInfo.verseStart}`)) {
          return { row, confidence: "passage-match" };
        }
      } else {
        return { row, confidence: "chapter-match" };
      }
    }
  }

  const fileNorm = normalizeTokens(filename.replace(/\.(pdf|docx?)$/i, ""));
  for (const row of scheduleRows) {
    if (!row.text || row.text.length < 4) continue;
    const textNorm = normalizeTokens(row.text);
    if (fileNorm.includes(textNorm)) {
      return { row, confidence: "text" };
    }
  }

  for (const row of scheduleRows) {
    if (!row.title || row.title.length < 5) continue;
    const titleNorm = normalizeTokens(row.title);
    if (fileNorm.includes(titleNorm)) {
      return { row, confidence: "title-match" };
    }
  }

  return { row: null, confidence: "unmatched" };
}

// ── Text extraction ───────────────────────────────────────────────────────────

function cleanExtractedText(raw) {
  if (!raw) return "";
  return raw
    .replace(/\f/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(filePath) {
  try {
    const pdfParse = require("pdf-parse");
    const buffer = await readFile(filePath);
    const data = await pdfParse(buffer);
    return cleanExtractedText(data.text);
  } catch (err) {
    return `[PDF extraction failed: ${err.message}]`;
  }
}

async function extractDocxText(filePath) {
  try {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return cleanExtractedText(result.value);
  } catch (err) {
    return `[DOCX extraction failed: ${err.message}]`;
  }
}

async function extractDocText(filePath) {
  try {
    const { stdout } = await execFileAsync("textutil", ["-convert", "txt", filePath, "-stdout"]);
    if (stdout && stdout.trim().length > 0) {
      return cleanExtractedText(stdout);
    }
  } catch (err) {
    return `[DOC extraction failed: ${err.message}]`;
  }
  return "[Empty doc content]";
}

async function extractText(filePath, ext) {
  if (ext === ".pdf") return extractPdfText(filePath);
  if (ext === ".docx") return extractDocxText(filePath);
  if (ext === ".doc") return extractDocText(filePath);
  return "[Unsupported format]";
}

function yamlScalar(value) {
  return JSON.stringify(String(value ?? ""));
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// ── Note rendering ────────────────────────────────────────────────────────────

function renderNote({
  title,
  noteDate,
  teacher,
  passageLabel,
  passageRaw,
  bibleLinks,
  sermonTitle,
  bigIdea,
  special,
  sundayNotes,
  confidence,
  extractedText,
  occasion,
}) {
  const safeTitle = title || passageLabel || "Untitled Sermon";

  const frontmatter = [
    "---",
    `title: ${yamlScalar(safeTitle)}`,
    `base: "[[Church Notes.base]]"`,
    `Teacher: ${yamlScalar(teacher || "Unknown")}`,
    `Type: Sermon`,
    `Location: Church`,
    `Status: Imported`,
    `Passage: ${yamlScalar(passageLabel || passageRaw || "")}`,
    `Date: ${yamlScalar(noteDate || "")}`,
    `Sermon Title: ${yamlScalar(sermonTitle || safeTitle)}`,
    ...(bigIdea ? [`Big Idea: ${yamlScalar(bigIdea)}`] : []),
    ...(occasion ? [`Occasion: ${yamlScalar(occasion)}`] : []),
    `Source: "Local Import"`,
    `Import Match: ${yamlScalar(confidence)}`,
    "---",
  ].join("\n");

  const passageSection = bibleLinks
    ? `## Passage\n\n${bibleLinks}\n`
    : passageLabel
    ? `## Passage\n\n${passageLabel}\n`
    : "";

  const infoLines = [
    "## Sermon Info",
    "",
    `- **Date:** ${noteDate || "Unknown"}`,
    `- **Teacher:** ${teacher || "Unknown"}`,
    `- **Passage:** ${passageLabel || passageRaw || "Unknown"}`,
    `- **Title:** ${sermonTitle || safeTitle}`,
  ];
  if (bigIdea) infoLines.push(`- **Big Idea:** ${bigIdea}`);
  if (special) infoLines.push(`- **Special Elements:** ${special}`);
  if (sundayNotes) infoLines.push(`- **Context:** ${sundayNotes}`);
  if (occasion) infoLines.push(`- **Occasion:** ${occasion}`);
  infoLines.push("");

  // Linkify all in-text scripture citations inside the teaching notes body
  const linkedBody = linkifyScripture(extractedText);

  const textSection = linkedBody
    ? `## Teaching Notes\n\n${linkedBody}\n`
    : `## Teaching Notes\n\n*(notes not available)*\n`;

  return [frontmatter, "", passageSection, infoLines.join("\n"), textSection].join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const SUPPORTED_EXTS = new Set([".pdf", ".docx", ".doc"]);

  await mkdir(CHURCH_DIR, { recursive: true });
  await mkdir(REPORTS_DIR, { recursive: true });

  process.stderr.write("Loading schedule spreadsheet...\n");
  const scheduleRows = await loadSchedule();
  process.stderr.write(`Loaded ${scheduleRows.length} schedule rows.\n`);

  const allFiles = await readdir(SOURCE_DIR);
  const targetFiles = allFiles.filter((f) => SUPPORTED_EXTS.has(path.extname(f).toLowerCase()));
  process.stderr.write(`Found ${targetFiles.length} files to process.\n`);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    outputDir: CHURCH_DIR,
    dryRun: DRY_RUN,
    scheduleRows: scheduleRows.length,
    totalFiles: targetFiles.length,
    items: [],
  };

  let imported = 0,
    skipped = 0;

  for (const filename of targetFiles.sort()) {
    const ext = path.extname(filename).toLowerCase();
    const srcPath = path.join(SOURCE_DIR, filename);

    const parsedInfo = parseFilename(filename);
    const book = resolveBook(parsedInfo.bookRaw);
    const passageLabel = buildPassageLabel(parsedInfo, book);
    const bibleLinks = buildBibleLinks(parsedInfo, book);

    const { row: scheduleRow, confidence } = matchSchedule(filename, parsedInfo, book, scheduleRows);

    const teacher = scheduleRow?.preacher || "";
    const sermonTitle = scheduleRow?.title || passageLabel;
    const noteDate = scheduleRow?.date || parsedInfo.datePrefix || "";
    const bigIdea = scheduleRow?.bigIdea || "";
    const special = scheduleRow?.special || "";
    const sundayNotes = scheduleRow?.sundayNotes || "";

    const noteTitle =
      sermonTitle && sermonTitle !== passageLabel
        ? `${sermonTitle} (${passageLabel})`
        : passageLabel;

    const filePassagePart = passageLabel.replace(/:/g, ".");
    const datePrefix = noteDate || "undated";
    const baseName = `${datePrefix} - ${filePassagePart}`
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const noteName = `${baseName}.md`;
    const notePath = path.join(CHURCH_DIR, noteName);

    if (SKIP_EXISTING && (await pathExists(notePath))) {
      process.stderr.write(`SKIP (exists): ${noteName}\n`);
      skipped++;
      report.items.push({ filename, notePath, status: "skipped-existing", confidence });
      continue;
    }

    const item = {
      filename,
      ext,
      passageLabel,
      teacher,
      sermonTitle,
      date: noteDate,
      confidence,
      scheduleText: scheduleRow?.text || "",
      notePath,
      status: DRY_RUN ? "dry-run" : "pending",
    };

    if (DRY_RUN) {
      process.stderr.write(`DRY-RUN: ${filename} → ${noteName} [${confidence}]\n`);
      report.items.push(item);
      continue;
    }

    process.stderr.write(`Extracting & linking: ${filename}...\n`);
    const extractedText = await extractText(srcPath, ext);

    const noteContent = renderNote({
      title: noteTitle,
      noteDate,
      teacher,
      passageLabel,
      passageRaw: parsedInfo.passageRaw,
      bibleLinks,
      sermonTitle,
      bigIdea,
      special,
      sundayNotes,
      confidence,
      extractedText,
      occasion: parsedInfo.occasion,
    });

    await writeFile(notePath, noteContent, "utf8");

    item.status = "imported";
    imported++;
    process.stderr.write(`  done: ${noteName} [${confidence}]\n`);
    report.items.push(item);
  }

  await writeFile(path.join(REPORTS_DIR, "import-report.json"), JSON.stringify(report, null, 2));

  const unmatchedMd = [
    "# Unmatched / Low-Confidence Imports",
    "",
    ...report.items
      .filter((i) => !["text", "date", "passage-match", "chapter-match", "title-match"].includes(i.confidence) && i.status !== "skipped-existing")
      .map((i) => `- **${i.filename}** — match: \`${i.confidence || "n/a"}\`, schedule: _${i.scheduleText || "—"}_`),
    "",
  ].join("\n");
  await writeFile(path.join(REPORTS_DIR, "unmatched.md"), unmatchedMd);

  console.log(`\nImport complete`);
  console.log(`  Source:    ${SOURCE_DIR}`);
  console.log(`  Output:    ${CHURCH_DIR}`);
  console.log(`  Schedule:  ${scheduleRows.length} rows`);
  console.log(`  Files:     ${targetFiles.length} total`);
  console.log(`  Imported:  ${imported}`);
  console.log(`  Skipped:   ${skipped}`);
  if (DRY_RUN) console.log("  (Dry run -- no files written)");
  console.log(`  Report:    ${path.join(REPORTS_DIR, "import-report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

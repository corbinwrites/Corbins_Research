import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  VAULT_ROOT,
  CHURCH_DIR,
  ATTACHMENTS_DIR,
  SOURCE_DIR,
  SCHEDULE_XLSX,
  BACKUP_DIR,
  LAST_RUN_PATH,
} from "./config.mjs";

import { parseWhatsAppMessage } from "./meta/message.mjs";
import { parseFilename, buildPassageLabel } from "./meta/filename.mjs";
import { loadSchedule, matchScheduleByDate } from "./meta/schedule.mjs";
import { extractDocument } from "./extract/index.mjs";
import { stripPageNumbers } from "./clean/pages.mjs";
import { reflowText } from "./clean/reflow.mjs";
import { cleanOutlineToMarkdown } from "./clean/outline.mjs";
import { formatScriptureBlocks } from "./clean/scripture-blocks.mjs";
import { linkify } from "./bible/linkify.mjs";
import { renderNote } from "./render/note.mjs";
import books from "./bible/books.json" with { type: "json" };

const execFileAsync = promisify(execFile);

function resolveTilde(p) {
  if (!p) return "";
  if (p.startsWith("~/") || p === "~") {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
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

function findLatestSourceFile(sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  const entries = fs.readdirSync(sourceDir);
  const matched = [];

  for (const name of entries) {
    if (name.startsWith(".")) continue;
    if (/\(City Light\)\.(pdf|docx?)$/i.test(name)) {
      const fullPath = path.join(sourceDir, name);
      try {
        const stats = fs.statSync(fullPath);
        matched.push({ path: fullPath, mtime: stats.mtimeMs });
      } catch {}
    }
  }

  if (matched.length === 0) {
    throw new Error(`No "* (City Light).*" files found in ${sourceDir}`);
  }

  matched.sort((a, b) => b.mtime - a.mtime);
  return matched[0].path;
}

export function parseArgs(argv) {
  const options = {
    file: null,
    title: null,
    date: null,
    passage: null,
    teacher: null,
    paste: false,
    messageFile: null,
    message: null,
    dryRun: false,
    force: false,
    noBareRefs: false,
    noSchedule: false,
    open: false,
    latest: false,
    strict: false,
  };

  const args = argv.slice(2);
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === "--paste") {
      options.paste = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--no-bare-refs") {
      options.noBareRefs = true;
    } else if (arg === "--no-schedule") {
      options.noSchedule = true;
    } else if (arg === "--open") {
      options.open = true;
    } else if (arg === "--latest") {
      options.latest = true;
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--title") {
      options.title = args[++i];
    } else if (arg === "--date") {
      options.date = args[++i];
    } else if (arg === "--passage") {
      options.passage = args[++i];
    } else if (arg === "--teacher") {
      options.teacher = args[++i];
    } else if (arg === "--message-file") {
      options.messageFile = args[++i];
    } else if (arg === "--message") {
      options.message = args[++i];
    } else if (!arg.startsWith("-") && !options.file) {
      options.file = arg;
    }
    i++;
  }

  return options;
}

export async function run(argv) {
  const options = parseArgs(argv);
  const warnings = [];

  // 1. Resolve source file
  let sourceFilePath = null;
  if (options.file) {
    sourceFilePath = path.resolve(resolveTilde(options.file));
  } else if (options.latest) {
    sourceFilePath = findLatestSourceFile(SOURCE_DIR);
  } else {
    console.error("Error: Please provide a sermon document file path or use --latest.");
    console.error('Usage: sermon-import "~/Downloads/Romans 7_20-25 (City Light).pdf" --paste');
    return 1;
  }

  if (!fs.existsSync(sourceFilePath)) {
    console.error(`Error: Source file does not exist: ${sourceFilePath}`);
    return 1;
  }

  const sourceFileName = path.basename(sourceFilePath);

  // 2. Resolve WhatsApp Message if requested
  let parsedMessage = null;
  let rawMessageText = "";

  if (options.paste) {
    try {
      rawMessageText = execFileSync("pbpaste", { encoding: "utf-8" });
    } catch (err) {
      warnings.push(`failed to read macOS clipboard (pbpaste): ${err.message}`);
    }
  } else if (options.messageFile) {
    const msgPath = path.resolve(resolveTilde(options.messageFile));
    if (fs.existsSync(msgPath)) {
      rawMessageText = fs.readFileSync(msgPath, "utf-8");
    } else {
      warnings.push(`message file not found: ${msgPath}`);
    }
  } else if (options.message) {
    rawMessageText = options.message;
  }

  if (rawMessageText) {
    parsedMessage = parseWhatsAppMessage(rawMessageText);
    if (parsedMessage && parsedMessage.warnings) {
      warnings.push(...parsedMessage.warnings);
    }
  }

  // 3. Parse Filename
  const parsedFilename = parseFilename(sourceFileName);

  // 4. Precedence resolution
  // CLI flag > WhatsApp message > filename > schedule
  let title = options.title || (parsedMessage ? parsedMessage.title : "");
  let date = options.date || (parsedMessage ? parsedMessage.date : parsedFilename.datePrefix);
  let rawPassage = options.passage || (parsedMessage ? parsedMessage.passage : "");
  let teacher = options.teacher || (parsedMessage ? parsedMessage.teacher : "");

  let questions = parsedMessage ? parsedMessage.questions : [];

  // Book and passage resolution
  let book = null;
  let chapter = null;
  let verseStart = null;
  let verseEnd = null;

  if (rawPassage) {
    const pMatch = rawPassage.match(/^([1-3]?\s*[A-Za-z]+(?:\.[A-Za-z]+)?)\s+(\d+)[:_](\d+)(?:[–-](\d+))?$/);
    if (pMatch) {
      book = resolveBook(pMatch[1]);
      chapter = parseInt(pMatch[2], 10);
      verseStart = parseInt(pMatch[3], 10);
      verseEnd = pMatch[4] ? parseInt(pMatch[4], 10) : verseStart;
    }
  }

  if (!book && parsedFilename.book) {
    book = parsedFilename.book;
    chapter = parsedFilename.chapter;
    verseStart = parsedFilename.verseStart;
    verseEnd = parsedFilename.verseEnd;
    if (!rawPassage) {
      rawPassage = buildPassageLabel(parsedFilename, book);
    }
  }

  // Cross-check message passage vs filename passage
  if (parsedMessage && parsedMessage.passage && parsedFilename.passageRaw) {
    const fnLabel = buildPassageLabel(parsedFilename, parsedFilename.book);
    if (fnLabel && !fnLabel.toLowerCase().includes(parsedMessage.passage.toLowerCase()) && !parsedMessage.passage.toLowerCase().includes(fnLabel.toLowerCase())) {
      warnings.push(`passage cross-check warning: message has "${parsedMessage.passage}", filename suggests "${fnLabel}"`);
    }
  }

  // 5. Schedule sheet enrichment (exact date only)
  let bigIdea = "";
  let importMatch = parsedMessage ? "message" : "none";

  if (!options.noSchedule && date) {
    const scheduleRows = loadSchedule(SCHEDULE_XLSX);
    const matchedRow = matchScheduleByDate(date, scheduleRows);
    if (matchedRow) {
      if (!title && matchedRow.title) title = matchedRow.title;
      if (!teacher && matchedRow.preacher) teacher = matchedRow.preacher;
      if (matchedRow.bigIdea) bigIdea = matchedRow.bigIdea;
      if (importMatch === "none") importMatch = "date";
    }
  }

  if (!teacher) teacher = "Chris Gee";
  const passageLabel = rawPassage || (book && chapter ? `${book.folder} ${chapter}:${verseStart}${verseEnd !== verseStart ? `–${verseEnd}` : ""}` : "Sermon");

  // 6. Target file path in Ministry/Church
  // Filename format: YYYY-MM-DD - <PassageClean>.md (replace : with .)
  const cleanPassageForFile = passageLabel
    .replace(/:/g, ".")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim();

  const noteFileName = `${date || "Undated"} - ${cleanPassageForFile}.md`;
  const targetNotePath = path.join(CHURCH_DIR, noteFileName);

  // 7. Check if target note exists
  const noteExists = fs.existsSync(targetNotePath);
  if (noteExists && !options.force && !options.dryRun) {
    console.error(`Error: Target note already exists at:\n  ${targetNotePath}\nUse --force to overwrite (a backup will be saved outside the vault).`);
    return 2;
  }

  // 8. Extract Document Text
  const { pages, pageCount } = await extractDocument(sourceFilePath);
  const ext = path.extname(sourceFilePath).toLowerCase();

  let cleanedText = "";
  if (ext === ".pdf") {
    const stripped = stripPageNumbers(pages);
    cleanedText = stripped.join("\n\n");
  } else {
    cleanedText = pages.join("\n\n");
  }

  // 9. Cleaning pipeline
  const reflowed = reflowText(cleanedText);
  const primaryContext = book && chapter ? { abbrev: book.abbrev, chapter } : null;
  const outlined = cleanOutlineToMarkdown(reflowed, primaryContext);
  const withCallouts = formatScriptureBlocks(outlined);

  // 10. Linkify
  const linkReport = { ok: 0, unresolved: [], bareRefs: 0 };
  const linkifiedNotes = linkify(withCallouts, {
    primaryContext,
    enableBareRefs: !options.noBareRefs,
    report: linkReport,
  });

  // 11. Render note
  const renderedContent = renderNote({
    title,
    sermonTitle: title,
    teacher,
    passage: passageLabel,
    book,
    chapter,
    verseStart,
    verseEnd,
    date,
    source: parsedMessage ? "WhatsApp" : "Local Import",
    sourceFileName,
    importMatch,
    bigIdea,
    questions,
    teachingNotes: linkifiedNotes,
  });

  // 12. Backup and atomic write (unless dry run)
  if (options.dryRun) {
    console.log("=== DRY RUN MODE: No files written ===");
    console.log(`Target: ${targetNotePath}`);
    console.log(`Title: ${title} | Teacher: ${teacher} | Date: ${date} | Passage: ${passageLabel}`);
    console.log(`Pages: ${pageCount} | Questions: ${questions.length} | Links: ${linkReport.ok} ok / ${linkReport.unresolved.length} unresolved | Bare refs: ${linkReport.bareRefs}`);
    if (warnings.length > 0) {
      console.log(`Warnings:\n  - ${warnings.join("\n  - ")}`);
    }
    return 0;
  }

  // If force and file exists, backup outside vault
  if (noteExists) {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupDir = path.join(BACKUP_DIR, ts);
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(targetNotePath, path.join(backupDir, noteFileName));
  }

  // Ensure directories exist
  fs.mkdirSync(CHURCH_DIR, { recursive: true });
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

  // Copy attachment
  const targetAttachmentPath = path.join(ATTACHMENTS_DIR, sourceFileName);
  try {
    fs.copyFileSync(sourceFilePath, targetAttachmentPath);
  } catch (err) {
    warnings.push(`could not copy attachment to ${targetAttachmentPath}: ${err.message}`);
  }

  // Atomic write to temporary file then rename
  const tempPath = path.join(CHURCH_DIR, `.${noteFileName}.tmp.${Date.now()}`);
  fs.writeFileSync(tempPath, renderedContent, "utf-8");
  fs.renameSync(tempPath, targetNotePath);

  // 13. Write last-run.json
  const lastRunData = {
    targetFile: targetNotePath,
    sourceFile: sourceFilePath,
    title,
    teacher,
    date,
    passage: passageLabel,
    importMatch,
    pages: pageCount,
    questionsCount: questions.length,
    linksOk: linkReport.ok,
    unresolved: linkReport.unresolved,
    bareRefs: linkReport.bareRefs,
    warnings,
    timestamp: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(LAST_RUN_PATH), { recursive: true });
    fs.writeFileSync(LAST_RUN_PATH, JSON.stringify(lastRunData, null, 2), "utf-8");
  } catch {}

  // 14. Print compact summary (§8)
  const relVaultPath = path.relative(VAULT_ROOT, targetNotePath);
  console.log(`✔ ${relVaultPath}`);
  console.log(`  ${title} · ${teacher} · ${date || "Undated"} (${importMatch})`);
  console.log(`  pages ${pageCount} · questions ${questions.length} · links ${linkReport.ok} ok / ${linkReport.unresolved.length} unresolved · bare refs ${linkReport.bareRefs}`);
  if (warnings.length > 0) {
    console.log(`  warnings: ${warnings.join("; ")}`);
  }

  // 15. Open in Obsidian if requested
  if (options.open) {
    try {
      const vaultName = path.basename(VAULT_ROOT);
      const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relVaultPath)}`;
      await execFileAsync("open", [uri]);
    } catch (err) {
      console.warn(`Could not open Obsidian note via URI: ${err.message}`);
    }
  }

  if (options.strict && warnings.length > 0) {
    return 3;
  }

  return 0;
}

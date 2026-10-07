#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || "1285986200552996990";
const SHEET_ID = process.env.SERMON_SHEET_ID || "1-sgPrraY0382KQ_7HR6lCp8r2kJ998CsD_1Dw3V1VTw";
const SHEET_GID = process.env.SERMON_SHEET_GID || "5233834";
const OUTPUT_ROOT =
  process.env.OUTPUT_ROOT || path.join(process.env.HOME, "Downloads", "CLBC Teaching Notes");
const NOTES_DIR = path.join(OUTPUT_ROOT, "Notes");
const ATTACHMENTS_DIR = path.join(OUTPUT_ROOT, "Attachments");
const REPORTS_DIR = path.join(OUTPUT_ROOT, "Reports");
const DRY_RUN = process.argv.includes("--dry-run");

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN. Export a Discord bot token and rerun this script.");
  console.error("Required bot permissions: View Channel and Read Message History.");
  process.exit(1);
}

async function fetchOk(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText} for ${url}\n${text.slice(0, 500)}`);
  }
  return response;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeDate(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, month, day, yearRaw] = slash;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
  return "";
}

function dateFromDiscordContext(message) {
  const iso = message.timestamp?.slice(0, 10);
  return iso || "";
}

function sanitizeFileName(value) {
  return String(value || "Untitled")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s*\([^)]*City Light[^)]*\)\s*/gi, " ")
    .replace(/\s*-\s*City Light\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function yamlScalar(value) {
  const text = String(value ?? "");
  return JSON.stringify(text);
}

function rowsToObjects(rows) {
  const headerIndex = rows.findIndex((row) =>
    row.map((cell) => cell.trim().toLowerCase()).includes("date"),
  );
  if (headerIndex === -1) return [];

  const headers = rows[headerIndex].map((cell) => cell.trim());
  return rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const object = {};
      headers.forEach((header, index) => {
        object[header] = row[index]?.trim() || "";
      });
      object.normalizedDate = normalizeDate(object.Date);
      return object;
    });
}

async function fetchSheetRows() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
  const text = await fetchOk(url).then((response) => response.text());
  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(path.join(REPORTS_DIR, "sermons.csv"), text);
  return rowsToObjects(parseCsv(text));
}

async function fetchDiscordMessages() {
  const messages = [];
  let before = "";

  while (true) {
    const query = new URLSearchParams({ limit: "100" });
    if (before) query.set("before", before);
    const url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?${query}`;
    const batch = await fetchOk(url, {
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": "clbc-teaching-notes-import/1.0",
      },
    }).then((response) => response.json());

    if (!Array.isArray(batch) || batch.length === 0) break;
    messages.push(...batch);
    before = batch[batch.length - 1].id;
    process.stderr.write(`Fetched ${messages.length} Discord messages\r`);

    if (batch.length < 100) break;
  }

  process.stderr.write(`Fetched ${messages.length} Discord messages\n`);
  return messages;
}

function pdfAttachmentsFromMessages(messages) {
  return messages.flatMap((message) =>
    (message.attachments || [])
      .filter((attachment) => /\.pdf$/i.test(attachment.filename || attachment.url || ""))
      .map((attachment) => ({
        id: attachment.id,
        messageId: message.id,
        messageUrl: `https://discord.com/channels/1284362792266240024/${CHANNEL_ID}/${message.id}`,
        author: message.author?.global_name || message.author?.username || "",
        content: message.content || "",
        timestamp: message.timestamp,
        date: dateFromDiscordContext(message),
        filename: attachment.filename,
        url: attachment.url,
        size: attachment.size || 0,
      })),
  );
}

function chooseSermon(attachment, rows) {
  const sameDate = rows.filter((row) => row.normalizedDate === attachment.date);
  if (sameDate.length === 1) return { sermon: sameDate[0], confidence: "date" };
  if (sameDate.length > 1) return { sermon: sameDate[0], confidence: "ambiguous-date" };
  return { sermon: null, confidence: "unmatched" };
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function uniquePath(directory, filename) {
  const ext = path.extname(filename);
  const stem = filename.slice(0, -ext.length);
  let candidate = path.join(directory, filename);
  let suffix = 2;
  while (await pathExists(candidate)) {
    candidate = path.join(directory, `${stem} ${suffix}${ext}`);
    suffix += 1;
  }
  return candidate;
}

async function downloadFile(url, outputPath) {
  const response = await fetchOk(url);
  await pipeline(response.body, createWriteStream(outputPath));
}

function renderNote({ attachment, sermon, pdfName, title, noteDate, confidence }) {
  const teacher = sermon?.Preacher || attachment.author || "";
  const passage = sermon?.Text || titleFromFilename(attachment.filename);
  const bigIdea = sermon?.["Big Idea"] || "";
  const sermonTitle = sermon?.Title || titleFromFilename(attachment.filename);

  return `---\ntitle: ${yamlScalar(title)}\nbase: "[[Church Notes.base]]"\nTeacher: ${yamlScalar(teacher)}\nType: Sermon\nLocation: Church\nStatus: Imported\nPassage: ${yamlScalar(passage)}\nDate: ${yamlScalar(noteDate)}\nSermon Title: ${yamlScalar(sermonTitle)}\nSource: Discord\nDiscord Channel: ${yamlScalar(CHANNEL_ID)}\nDiscord Message: ${yamlScalar(attachment.messageUrl)}\nPDF: ${yamlScalar(pdfName)}\nImport Match: ${yamlScalar(confidence)}\n---\n\nSermon Notes: [[${sermonTitle}]]\n\n${passage ? `<read [[Bible/ESV/${passage}|${passage}]]>` : ""}\n\n## Sermon Info\n\n- Date: ${noteDate || "Unknown"}\n- Teacher: ${teacher || "Unknown"}\n- Passage: ${passage || "Unknown"}\n- Sermon title: ${sermonTitle || "Unknown"}\n${bigIdea ? `- Big idea: ${bigIdea}\n` : ""}\n## Source PDF\n\n![[Attachments/${pdfName}]]\n\n## Teaching Notes\n\n`;
}

async function main() {
  await mkdir(NOTES_DIR, { recursive: true });
  await mkdir(ATTACHMENTS_DIR, { recursive: true });
  await mkdir(REPORTS_DIR, { recursive: true });

  const [sermons, messages] = await Promise.all([fetchSheetRows(), fetchDiscordMessages()]);
  const attachments = pdfAttachmentsFromMessages(messages).sort((a, b) =>
    String(a.timestamp).localeCompare(String(b.timestamp)),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    channelId: CHANNEL_ID,
    outputRoot: OUTPUT_ROOT,
    sermonRows: sermons.length,
    pdfAttachments: attachments.length,
    dryRun: DRY_RUN,
    items: [],
  };

  for (const attachment of attachments) {
    const { sermon, confidence } = chooseSermon(attachment, sermons);
    const noteDate = sermon?.normalizedDate || attachment.date || "unknown-date";
    const sermonTitle = sermon?.Title || titleFromFilename(attachment.filename);
    const title = `${sermonTitle} - Church`;
    const baseName = sanitizeFileName(`${noteDate} - ${sermonTitle}`);
    const pdfName = `${baseName}.pdf`;
    const noteName = `${baseName}.md`;
    const pdfPath = await uniquePath(ATTACHMENTS_DIR, pdfName);
    const notePath = await uniquePath(NOTES_DIR, noteName);
    const finalPdfName = path.basename(pdfPath);

    const item = {
      date: noteDate,
      originalFilename: attachment.filename,
      pdf: pdfPath,
      note: notePath,
      title,
      teacher: sermon?.Preacher || attachment.author || "",
      passage: sermon?.Text || "",
      match: confidence,
      discordMessage: attachment.messageUrl,
    };
    report.items.push(item);

    if (DRY_RUN) continue;

    await downloadFile(attachment.url, pdfPath);
    await writeFile(
      notePath,
      renderNote({ attachment, sermon, pdfName: finalPdfName, title, noteDate, confidence }),
    );
  }

  await writeFile(path.join(REPORTS_DIR, "import-report.json"), JSON.stringify(report, null, 2));
  await writeFile(
    path.join(REPORTS_DIR, "unmatched.md"),
    [
      "# Unmatched or Ambiguous Imports",
      "",
      ...report.items
        .filter((item) => item.match !== "date")
        .map(
          (item) =>
            `- ${item.date}: ${item.originalFilename} (${item.match}) - ${item.discordMessage}`,
        ),
      "",
    ].join("\n"),
  );

  console.log(`Sermon rows: ${sermons.length}`);
  console.log(`PDF attachments: ${attachments.length}`);
  console.log(`Output: ${OUTPUT_ROOT}`);
  console.log(`Report: ${path.join(REPORTS_DIR, "import-report.json")}`);
  if (DRY_RUN) console.log("Dry run only; no PDFs or notes were written.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

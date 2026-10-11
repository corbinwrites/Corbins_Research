import fs from "node:fs";
import path from "node:path";
import books from "./src/bible/books.json" with { type: "json" };
import { CHURCH_DIR } from "./src/config.mjs";
import { cleanOutlineToMarkdown } from "./src/clean/outline.mjs";
import { formatScriptureBlocks } from "./src/clean/scripture-blocks.mjs";
import { linkify } from "./src/bible/linkify.mjs";
import { renderNote } from "./src/render/note.mjs";
import { parseFilename } from "./src/meta/filename.mjs";

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

const dateMappings = {
  "Undated - Romans 7.14–19.md": "2026-09-20",
  "2026-09-20 - Romans 7.14–19.md": "2026-09-20",
  "undated - 1 Peter 1.3–5.md": "2025-04-20",
  "2025-04-20 - 1 Peter 1.3–5.md": "2025-04-20",
  "undated - 1 Thessalonians 2.17–3.8.md": "2025-09-21",
  "2025-09-21 - 1 Thessalonians 2.17–3.8.md": "2025-09-21",
  "undated - Genesis 4.1–16.md": "2025-01-05",
  "2025-01-05 - Genesis 4.1–16.md": "2025-01-05",
  "undated - Evangelism 2- Motivation.md": "2025-12-15",
  "2025-12-15 - Evangelism 2- Motivation.md": "2025-12-15",
  "undated - Revelation 22.7–14.md": "2024-03-10",
  "2024-03-10 - Revelation 22.7–14.md": "2024-03-10"
};

const entries = fs.readdirSync(CHURCH_DIR);
const filesToProcess = entries.filter(e => {
  if (!e.endsWith(".md")) return false;
  const stat = fs.statSync(path.join(CHURCH_DIR, e));
  return stat.isFile();
});

console.log(`Processing ${filesToProcess.length} notes for pristine formatting.`);

for (const fname of filesToProcess) {
  const fpath = path.join(CHURCH_DIR, fname);
  if (!fs.existsSync(fpath)) continue;

  const originalContent = fs.readFileSync(fpath, "utf-8");

  // Extract existing YAML frontmatter if present
  let existingFM = {};
  let body = originalContent;
  const fmMatch = originalContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (fmMatch) {
    body = originalContent.slice(fmMatch[0].length);
    const fmLines = fmMatch[1].split("\n");
    for (const line of fmLines) {
      const idx = line.indexOf(":");
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        existingFM[key] = val;
      }
    }
  }

  const cleanName = fname.replace(/^(\d{4}-\d{2}-\d{2}\s*-\s*|undated\s*-\s*)/i, "").replace(/\.md$/, "").trim();
  const parsedMeta = parseFilename(cleanName + ".pdf");
  
  const passage = existingFM["Passage"] || (parsedMeta ? parsedMeta.passage : cleanName);
  const rawTitle = existingFM["Sermon Title"] || (parsedMeta ? parsedMeta.sermonTitle : cleanName) || cleanName;
  const sermonTitle = (typeof rawTitle === "string" ? rawTitle : cleanName).replace(/\s*\([^)]*\)$/, "");
  const teacher = existingFM["Teacher"] || "Chris Gee";
  const date = dateMappings[fname] || existingFM["Date"] || (fname.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]) || null;

  let book = parsedMeta ? parsedMeta.book : null;
  let chapter = parsedMeta ? parsedMeta.chapter : null;
  let verseStart = parsedMeta ? parsedMeta.verseStart : null;
  let verseEnd = parsedMeta ? parsedMeta.verseEnd : null;

  if (!book && passage) {
    const pMatch = passage.match(/^([1-3]?\s*[A-Za-z]+(?:\.[A-Za-z]+)?)\s*(\d+)(?:[:_](\d+)(?:[–-](\d+))?)?/);
    if (pMatch) {
      book = resolveBook(pMatch[1]);
      chapter = pMatch[2] ? parseInt(pMatch[2], 10) : null;
      verseStart = pMatch[3] ? parseInt(pMatch[3], 10) : null;
      verseEnd = pMatch[4] ? parseInt(pMatch[4], 10) : verseStart;
    }
  }

  const primaryContext = (book && chapter) ? { abbrev: book.abbrev, chapter } : null;

  // Clean body text by aggressively removing duplicate section headings and metadata bullet blocks
  let cleanBody = body
    .replace(/^#\s+.*$/gm, "") // remove H1 titles
    .replace(/^##\s+Passage[\s\S]*?(?=##|\n[A-Z#]|$)/gmi, "") // remove passage sections in body
    .replace(/^##\s+Sermon Info[\s\S]*?(?=##|\n[A-Z#]|$)/gmi, "") // remove sermon info sections in body
    .replace(/^##\s+Teaching Notes\s*\n/gmi, "") // remove teaching notes headings in body
    .replace(/^(?:-\s*\*\*(?:Date|Teacher|Passage|Title):\*\*.*(?:\n|$))+/gmi, "") // remove duplicate info bullets
    .replace(/^>\s*\[\[[^\]]+\]\](?:\s*\[\[[^\]]*\]\])*\s*(?:\n|$)+/gmi, "") // remove duplicate passage blockquotes
    .trim();

  // Format scripture blocks, outline, and links
  cleanBody = formatScriptureBlocks(cleanBody);
  cleanBody = cleanOutlineToMarkdown(cleanBody, primaryContext);
  cleanBody = linkify(cleanBody, { primaryContext, enableBareRefs: true });

  const displayTitle = (sermonTitle && passage && sermonTitle !== passage) 
    ? `${sermonTitle} (${passage})` 
    : (sermonTitle || passage);

  const newNoteContent = renderNote({
    title: displayTitle,
    sermonTitle: sermonTitle || passage,
    teacher: teacher,
    passage: passage,
    book: book,
    chapter: chapter,
    verseStart: verseStart,
    verseEnd: verseEnd,
    date: date,
    source: existingFM["Source"] || "Local Import",
    sourceFileName: existingFM["PDF"] || "",
    importMatch: "reformatted",
    teachingNotes: cleanBody
  });

  const newFname = date ? `${date} - ${cleanName}.md` : `${cleanName}.md`;
  const newFpath = path.join(CHURCH_DIR, newFname);

  if (newFpath !== fpath && fs.existsSync(fpath)) {
    fs.unlinkSync(fpath);
  }

  fs.writeFileSync(newFpath, newNoteContent, "utf-8");
}

console.log("All church notes have been reformatted to pristine standards!");

# Walkthrough - Local Sermon Notes Obsidian Import

All **85 files** from `/Users/corbin/Downloads/Sermon Notes` have been parsed, enriched, extracted, and imported directly into your Obsidian vault at:
`Ministry/Church/`

---

## Key Achievements

### 1. Created `import-local-pdfs.mjs`
Located at:
[import-local-pdfs.mjs](file:///Users/corbin/Hal9000/imports/clbc-teaching-notes/import-local-pdfs.mjs)

The script is reusable and can be run anytime with:
```bash
node /Users/corbin/Hal9000/imports/clbc-teaching-notes/import-local-pdfs.mjs
```
*(Supports `--dry-run` and `--skip-existing` flags)*

### 2. Comprehensive Text Extraction
- **PDFs**: Extracted clean text using `pdf-parse`.
- **.docx files**: Extracted full formatted text via `mammoth`.
- **.doc files (binary Word)**: Extracted text using macOS native `textutil`.

### 3. Sunday Service Schedule Enrichment (2025–2026)
Parsed [City Light Bible Sunday Service Schedule 2025-26.xlsx](file:///Users/corbin/Downloads/City%20Light%20Bible%20Sunday%20Service%20Schedule%202025-26.xlsx) across all seasonal tabs (`Fall`, `WinterSpring`, `Summer`), injecting:
- **Teacher/Preacher** (e.g., *Chris Gee*, *Jeff Singer*, *Riley Seid*, *David Landis*)
- **Official Sermon Titles** (e.g., *Real Christians Trust*, *The Power of One*, *A Gospel-Centered Hello*)
- **Date** (ISO format `YYYY-MM-DD`)
- **Big Idea** summaries
- **Special Elements** (testimonies, parent dedications, STM presentations)
- **Sunday context notes**

### 4. Native Bible Linker Plugin Integration
Formatted all passage references to match your vault's `Bible/ESV/<Book>/<Abbrev> <Ch>.md` schema:
```markdown
## Passage

> [[Rom 4#v1|Romans 4:1–8]] [[Rom 4#v1|]][[Rom 4#v2|]][[Rom 4#v3|]][[Rom 4#v4|]][[Rom 4#v5|]][[Rom 4#v6|]][[Rom 4#v7|]][[Rom 4#v8|]]
```
- Visible main link directly opens the chapter at the starting verse.
- Hidden verse anchor links generate individual backlinks for each verse in Obsidian.

### 5. Dataview Integration & Attachments
- Every note has `base: "[[Church Notes.base]]"` in its YAML frontmatter to immediately populate your Church Notes table/base.
- All 85 source files were copied into `Ministry/Church/Attachments/` and embedded with `![[Attachments/...]]`.

---

## Verification & Samples

### Sample 1: DOCX File ([`2026-01-25 - Romans 4.1–8.md`](file:///Users/corbin/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Ministry/Church/2026-01-25%20-%20Romans%204.1%E2%80%938.md))
```yaml
---
title: "Real Christians Trust (Romans 4:1–8)"
base: "[[Church Notes.base]]"
Teacher: "Chris"
Type: Sermon
Location: Church
Status: Imported
Passage: "Romans 4:1–8"
Date: "2026-01-25"
Sermon Title: "Real Christians Trust"
Big Idea: "Abraham serves as an example of saving faith. He believed in the promise of God and it was credited to him as righteousness..."
Source: "Local Import"
PDF: "Romans 4_1-8 (City Light).docx"
Import Match: "passage-match"
---
```

### Sample 2: PDF File ([`2026-04-19 - Romans 5.12–17.md`](file:///Users/corbin/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Ministry/Church/2026-04-19%20-%20Romans%205.12%E2%80%9317.md))
- Complete multi-page sermon text extracted under `## Teaching Notes`
- Bible Linker link: `> [[Rom 5#v12|Romans 5:12–17]] [[Rom 5#v12|]]...[[Rom 5#v17|]]`

### Sample 3: Binary .DOC File ([`2025-08-24 - Ephesians 2.1–10.md`](file:///Users/corbin/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Ministry/Church/2025-08-24%20-%20Ephesians%202.1%E2%80%9310.md))
- Fully extracted via `textutil` with all paragraphs and outlines intact.

---

## Import Reports
The full import log and matched items report are saved at:
- JSON Report: `/Users/corbin/Hal9000/imports/clbc-teaching-notes/output/local-import/import-report.json`
- Low-Confidence / Undated Summary: `/Users/corbin/Hal9000/imports/clbc-teaching-notes/output/local-import/unmatched.md`

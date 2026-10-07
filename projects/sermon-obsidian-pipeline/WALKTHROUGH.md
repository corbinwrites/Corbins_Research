# Sermon Notes Obsidian Pipeline

Turns a City Light sermon manuscript (PDF/DOCX/DOC from WhatsApp) plus the weekly discussion-questions message into a clean, correctly Bible-linked Obsidian note in `Ministry/Church/`.

```bash
sermon-import "~/Downloads/Romans 7_20-25 (City Light).pdf" --paste
```

---

## 📁 Repository Structure

```
projects/sermon-obsidian-pipeline/
├── bin/
│   └── sermon-import.mjs              # CLI entry point (npm link installs this globally)
├── src/
│   ├── config.mjs                     # Environment defaults (VAULT_ROOT, SOURCE_DIR, etc.)
│   ├── cli.mjs                        # Core import logic
│   ├── bible/
│   │   ├── books.json                 # Single source of truth: all 66 books, aliases, abbrevs
│   │   ├── vault-index.mjs            # Scans Bible/ESV/ to validate chapter and verse anchors
│   │   └── linkify.mjs                # Scripture reference → Bible-Linker wikilinks
│   ├── clean/
│   │   ├── pages.mjs                  # Strip leading page numbers per PDF page
│   │   ├── reflow.mjs                 # Unwrap hard-wrapped lines, fix marker spacing
│   │   ├── outline.mjs                # Outline markers → nested bullets + ### headings
│   │   └── scripture-blocks.mjs       # Scripture blocks → collapsible [!quote]- callouts
│   ├── extract/
│   │   ├── index.mjs                  # Format dispatcher
│   │   ├── pdf.mjs                    # Per-page PDF extraction (pdf-parse)
│   │   ├── docx.mjs                   # DOCX extraction (mammoth)
│   │   └── doc.mjs                    # Legacy .doc extraction (macOS textutil)
│   ├── meta/
│   │   ├── message.mjs                # WhatsApp message parser
│   │   ├── filename.mjs               # Filename → passage + metadata
│   │   ├── schedule.mjs               # Schedule spreadsheet (exact-date matching only)
│   │   └── teachers.json              # Teacher name alias map
│   └── render/
│       └── note.mjs                   # Assembles the final Obsidian Markdown note
├── test/
│   ├── fixtures/
│   │   ├── romans-7-20-25.pdf.txt     # Per-page extracted text from sample PDF
│   │   └── romans-7-20-25.message.txt # Sample WhatsApp discussion-questions message
│   ├── linkify.test.mjs               # Phase 2 linkifier unit tests
│   └── message.test.mjs               # Phase 3 message parser unit tests
├── docs/
│   ├── Sermon_Import_CLI_Implementation_Guide.md # Full implementation spec
│   ├── Bible_Study_Migration_Implementation_Guide.md
│   └── Bible_Study_Feature_Execution_Plan.md
├── import-local-pdfs.mjs              # Legacy batch importer (still works; now delegates to src/)
├── RECON.md                           # Phase 0 reconnaissance findings
├── WALKTHROUGH.md                     # This file
└── package.json
```

---

## ⚡ CLI Usage

```
sermon-import <file.pdf|docx|doc> [options]

Metadata (highest precedence first):
  --title "..."           override sermon title
  --date YYYY-MM-DD       override date
  --passage "Book Ch:V"  override passage
  --teacher "Name"        override teacher
  --paste                 read the WhatsApp text message from the macOS clipboard
  --message-file <path>   same, from a file
  --message "<text>"      same, inline

Behavior:
  --dry-run               print parsed result and link report, write nothing
  --force                 overwrite existing note (old copy backed up outside vault)
  --no-bare-refs          don't link "v. 21" / "verses 14-19"
  --no-schedule           skip spreadsheet enrichment
  --open                  open the note in Obsidian when done
  --latest                no file arg: use newest "* (City Light).*" in the source dir
  --strict                exit code 3 if any warnings
```

### Install

```bash
cd projects/sermon-obsidian-pipeline
npm link        # installs `sermon-import` to /opt/homebrew/bin/
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error |
| 2 | Target note already exists |
| 3 | Imported with warnings (only if `--strict`) |

---

## 📝 Generated Note Format

```yaml
---
title: "The Monster and the Master"
base: "[[Church Notes.base]]"
Teacher: "Chris Gee"
Type: Sermon
Location: Church
Status: Imported
Passage: "Romans 7:20–25"
Book: "Romans"
Date: 2026-09-27
Sermon Title: "The Monster and the Master"
Source: "WhatsApp"
PDF: "Romans 7_20-25 (City Light).pdf"
Import Match: "message"
---
```

Body:
- **## Passage** — primary passage blockquote with per-verse Bible-Linker anchors
- **## Sermon Info** — date, teacher, passage, title
- **## Discussion Questions** — numbered, with inline scripture links
- **## Teaching Notes** — full cleaned manuscript with headings, nested bullets, scripture callouts, and inline links
- **## Source File** — wikilink (not embed) to `Attachments/<filename>`

---

## 🔗 Bible Linker Integration

Links are generated in the format used by the Obsidian Bible Linker plugin's **Copy** command:

```markdown
> [[Rom 7#v20|Romans 7:20–25]] [[Rom 7#v20|]][[Rom 7#v21|]]…[[Rom 7#v25|]]
```

- `#v<N>` anchors match the `###### N` headings in `Bible/ESV/<Book>/<Abbrev> <Ch>.md`
- The vault is scanned at import time to validate chapter files and verse anchors exist
- Unresolved references are left as plain text and logged in the run report

---

## 🗂 Obsidian Bases Integration

Notes appear automatically in `Church Notes.base` via:
```yaml
base: "[[Church Notes.base]]"
```

The Bases filter is: `note["base"] == link("Church Notes.base")`.

> **Note:** `Church Notes.base` is an **Obsidian Bases** file (`.base`), not Dataview.

---

## 📊 Metadata Precedence

`CLI flag` > `WhatsApp message` > `filename` > `schedule sheet (exact date only)` > blank

Schedule matching is **exact date only** — no fuzzy book/chapter matching that could silently attach wrong data from older rows.

---

## 🧪 Tests

```bash
npm test
# or individually:
node --test test/linkify.test.mjs
node --test test/message.test.mjs
```

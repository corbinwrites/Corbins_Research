# 📖 Sermon Notes Obsidian Pipeline

An automated tool that transforms City Light sermon manuscripts (PDF, Word docs) and WhatsApp discussion questions into clean, beautifully formatted, and fully Bible-linked notes inside your Obsidian vault.

```bash
sermon-import --latest --paste --open
```

---

## 🌟 What This Tool Does

When you receive a sermon file and a WhatsApp discussion message, `sermon-import` does all the tedious formatting and linking for you in a single command:

1. **📄 Reads Your Sermon Files**: Supports PDF (`.pdf`), Word (`.docx`), and legacy Word (`.doc`) files.
2. **🧼 Cleans & Reflows Text**: Removes ugly line breaks, page numbers, and formatting artifacts.
3. **📌 Auto-Formats Outlines & Headings**:
   * Converts outline markers (`A.`, `1.`, `a.`, `i.`, `(a)`) into clean nested Markdown bullet points.
   * Promotes main section titles (like `Intro`, `#1 The Enemy`, `Secondly…`) into clear section headings (`###`).
4. **📜 Formats Scripture Blocks**: Wraps full scripture text blocks in neat, collapsible quote boxes (`[!quote]-`).
5. **🔗 Smart Bible Reference Linking**: Automatically turns every scripture reference into clickable links to your Obsidian Bible:
   * **Full passages**: `Romans 7:20-25` → `[[Rom 7#v20|Romans 7:20–25]]`
   * **Chapters**: `Romans 7` → `[[Rom 7|Romans 7]]`
   * **Verses**: `v. 21` or `verses 14–19` → contextual links to `[[Rom 7#v21|v. 21]]`
6. **💬 Integrates WhatsApp Discussion Questions**: Extracts the title, date, passage, teacher, and study questions directly from the copied WhatsApp message into the note's frontmatter and body.
7. **📂 Vault & Attachment Sync**: Places the final Markdown note safely in `Ministry/Church/` and saves a copy of the original PDF/Word file into `Ministry/Church/Attachments/`.

---

## ⚡ Quick Start: 3-Step Workflow

### Step 1: Download & Copy
1. Download your sermon manuscript (PDF or Word doc) to your **Downloads** folder.
2. Copy the weekly WhatsApp discussion questions message to your clipboard (**Cmd+C**).

### Step 2: Run in Terminal
Open your Terminal and run:

```bash
sermon-import --latest --paste --open
```

* `--latest`: Automatically finds the newest sermon file in your Downloads folder.
* `--paste`: Reads the copied WhatsApp message from your clipboard.
* `--open`: Immediately opens your newly created note in Obsidian!

---

## 🛠️ Installation & One-Time Setup

If you haven't set up the tool on your Mac yet:

1. **Open Terminal** and navigate to the project directory:
   ```bash
   cd ~/Hal9000/projects/sermon-obsidian-pipeline
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Enable global command**:
   ```bash
   npm link
   ```
   *This makes the `sermon-import` command available anywhere in your terminal!*

---

## 💡 Real-World Command Examples

| Goal | Command |
|------|---------|
| **Import newest sermon + clipboard message & open in Obsidian** *(Recommended)* | `sermon-import --latest --paste --open` |
| **Import a specific sermon PDF file** | `sermon-import "~/Downloads/Romans 7_20-25 (City Light).pdf" --paste` |
| **Preview without writing to vault (Dry Run)** | `sermon-import --latest --paste --dry-run` |
| **Overwrite an existing sermon note** | `sermon-import --latest --paste --force` |
| **Manually specify metadata** | `sermon-import sermon.pdf --title "Free in Christ" --teacher "Pastor John"` |

---

## 📋 Complete CLI Options Reference

```text
sermon-import [file] [options]
```

### Metadata Overrides
You can manually override metadata if needed:
* `--title "..."`: Manually set the sermon title.
* `--date YYYY-MM-DD`: Set the sermon date (e.g. `2026-10-05`).
* `--passage "Book Ch:V"`: Set the main sermon passage (e.g. `Romans 7:20–25`).
* `--teacher "Name"`: Set the speaker/teacher.
* `--paste`: Read WhatsApp discussion message directly from macOS clipboard.
* `--message-file <path>`: Read WhatsApp discussion message from a saved text file.
* `--message "<text>"`: Pass WhatsApp message directly inline.

### Workflow Controls
* `--latest`: Automatically pick the newest sermon file in Downloads matching `* (City Light).*`.
* `--open`: Automatically open the note in Obsidian after creation.
* `--dry-run`: Test run — prints the processed result and link report without writing files.
* `--force`: Overwrite an existing note (backed up outside the vault first).
* `--no-bare-refs`: Skip automatic linking of bare verse numbers like "v. 21".
* `--no-schedule`: Skip auto-detecting details from the Sunday schedule spreadsheet.
* `--strict`: Return error exit code if any minor warnings occur.

---

## ⚙️ Configuration & Custom Folders

The pipeline uses sensible default paths for your Obsidian vault and downloads:

| Setting | Default Location | Description |
|---------|------------------|-------------|
| `VAULT_ROOT` | `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal` | Path to your Obsidian vault |
| `SOURCE_DIR` | `~/Downloads` | Default directory where sermon files are downloaded |
| `SCHEDULE_XLSX` | `~/Downloads/City Light Bible Sunday Service Schedule 2025-26.xlsx` | Service schedule spreadsheet |

To override any of these, set the environment variable in your terminal session or `.bashrc`/`.zshrc`:
```bash
export SOURCE_DIR="~/Desktop"
```

---

## 🏗️ Technical Architecture & Module Layout

For developers or those curious about how the code is structured:

```
src/
├── config.mjs                Environment configuration & default paths
├── cli.mjs                   Main CLI orchestration flow
├── bible/
│   ├── books.json            Canonical list of 66 Bible books, abbreviations & aliases
│   ├── vault-index.mjs       Scans vault Bible/ESV/ folder to validate chapter/verse anchors
│   └── linkify.mjs           Scripture text parser & wikilink converter
├── clean/
│   ├── pages.mjs             PDF per-page page number artifact remover
│   ├── reflow.mjs            Line unwrapping & spacing fixer
│   ├── outline.mjs           Outline level identifier & bullet/heading formatter
│   └── scripture-blocks.mjs  Scripture text detection & quote callout formatter
├── extract/
│   ├── index.mjs             Format router (PDF vs DOCX vs DOC)
│   ├── pdf.mjs               PDF parser (pdf-parse)
│   ├── docx.mjs              DOCX parser (mammoth)
│   └── doc.mjs               Legacy DOC parser (macOS textutil)
├── meta/
│   ├── message.mjs           WhatsApp message parser
│   ├── filename.mjs          Filename passage metadata extraction
│   ├── schedule.mjs          Schedule spreadsheet loader
│   └── teachers.json         Teacher name canonicalization map
└── render/
    └── note.mjs              Assembles frontmatter + Markdown body note
```

### Running Unit Tests
```bash
npm test                           # Run all test suites
node --test test/linkify.test.mjs  # Run scripture linkifier tests
node --test test/message.test.mjs  # Run WhatsApp message parser tests
```

---

## 📊 Note Destination & Obsidian Base Integration

Notes are saved directly to:
`Ministry/Church/YYYY-MM-DD - Title (Passage).md`

Every note automatically includes `base: "[[Church Notes.base]]"` in its frontmatter, seamlessly integrating with your **Obsidian Bases** view.

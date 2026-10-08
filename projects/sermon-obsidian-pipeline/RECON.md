# Phase 0 Reconnaissance Report

## 1. Documentation & Code Drift Analysis

### WALKTHROUGH.md vs. import-local-pdfs.mjs vs. Existing Vault Notes
- **`PDF:` property:**
  - `WALKTHROUGH.md` (§5) claims notes have a `PDF:` frontmatter property (e.g. `PDF: "Romans 4_1-8 (City Light).docx"`).
  - Neither `renderNote()` in `import-local-pdfs.mjs` nor the 85 actual notes in `Ministry/Church/` contain the `PDF:` property.
  - Target design in Implementation Guide (§5.1) adds `PDF: "<filename>"` as additive frontmatter.
- **Attachments copying & embedding:**
  - `WALKTHROUGH.md` claims: "All 85 source files were copied into `Ministry/Church/Attachments/` and embedded with `![[Attachments/...]]`."
  - The actual notes in `Ministry/Church/` have **no embedded attachments** at the bottom.
  - The files in `Ministry/Church/Attachments/` were placed there during a previous process, but notes do not link or embed them.
  - Target design in Implementation Guide (§5.2) specifies copying the source file to `Ministry/Church/Attachments/` and adding a linked (not embedded) reference under `## Source File`: `[[Attachments/<filename>]]`.
- **Teacher name normalization:**
  - `WALKTHROUGH.md` notes show `Teacher: "Chris"`.
  - Schedule spreadsheet lists "Chris Gee", "Christopher Gee", or "Chris".
  - In `import-local-pdfs.mjs`: defaults to `Chris Gee` if not in schedule.
  - Target design: use `src/meta/teachers.json` alias mapping (e.g. "Christopher Gee" → "Chris Gee").
- **Repository path drift:**
  - `WALKTHROUGH.md` refers to `/Users/corbin/Hal9000/imports/clbc-teaching-notes/import-local-pdfs.mjs`. The active repository is `/Users/corbin/Hal9000/projects/sermon-obsidian-pipeline`.
- **Dataview vs. Obsidian Bases:**
  - `README.md` and `WALKTHROUGH.md` refer to "Dataview", but `Ministry/Church/Church Notes.base` is an **Obsidian Bases (.base)** configuration file introduced in newer Obsidian releases.

---

## 2. Vault Chapter & Verse Heading Format

Checked `Bible/ESV/Romans/Rom 7.md`:
- Heading structure: Verses are h6 Markdown headings formatted as:
  ```markdown
  ###### 1
  Or do you not know, brothers...
  ###### 2
  ...
  ###### 25
  Thanks be to God through Jesus Christ our Lord!...
  ```
- Linking conventions:
  - The vault standardizes on the Bible Linker plugin **Copy** command format:
    `> [[Rom 7#v20|Romans 7:20–25]] [[Rom 7#v20|]][[Rom 7#v21|]][[Rom 7#v22|]][[Rom 7#v23|]][[Rom 7#v24|]][[Rom 7#v25|]]`
  - Verse anchors are `#v<N>` (e.g., `#v20`, `#v21`).
  - Bible Linker plugin in Obsidian matches `#v<N>` or `#<N>`. The existing vault notes consistently use `#v<N>`.

---

## 3. Church Notes.base Inspection

File: `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Ministry/Church/Church Notes.base`
- **Filter:**
  ```yaml
  filters:
    and:
      - note["base"] == link("Church Notes.base")
  ```
  Every note MUST have `base: "[[Church Notes.base]]"` in YAML frontmatter to be indexed by this Base.
- **Properties tracked:**
  - `file.name` (Display: Note)
  - `Date` (Display: Date)
  - `Teacher` (Display: Teacher)
  - `Type` (Display: Type)
  - `Location` (Display: Location)
  - `Passage` (Display: Passage)
  - `Series` (Display: Series)
  - `Status` (Display: Status)
- **Date Handling:**
  - Existing notes had `Date: "2025-08-10"` (quoted string).
  - Unquoted ISO `YYYY-MM-DD` (e.g., `Date: 2026-09-27`) is parsed by Obsidian as a native date value, perfectly compatible with Base table sorting and filtering.

---

## 4. Test Fixtures Created

- `test/fixtures/romans-7-20-25.pdf.txt`: 18 pages extracted text from WhatsApp attachment `Romans 7_20-25 (City Light).pdf`.
- `test/fixtures/romans-7-20-25.message.txt`: Edwin Li's WhatsApp text message containing sermon title, date, passage, teacher, and 3 discussion questions.

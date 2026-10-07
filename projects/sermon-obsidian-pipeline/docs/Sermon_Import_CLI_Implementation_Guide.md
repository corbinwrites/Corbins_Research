# Sermon Import CLI — Implementation Guide (for AI agents)

**Goal:** one terminal command turns a City Light sermon manuscript (from WhatsApp) plus the weekly discussion-questions message into a clean, correctly Bible-linked Obsidian note in `Ministry/Church/`.

```bash
sermon-import "~/Downloads/Romans 7_20-25 (City Light).pdf" --paste
```

Read the whole guide. Do **Phase 0 first**. Do not assume the repo matches the docs (see §2).

---

## 1. What actually arrives (worked example: Sept 27, 2026)

Two separate WhatsApp messages per week, from two different people:

| Message | Sender | Content |
|---|---|---|
| Attachment | Christopher Gee (preacher) | `Romans 7_20-25 (City Light).pdf`, 18 pages, the manuscript |
| Text | Edwin Li | Title, date, passage, preacher, then discussion questions `#1`, `#2`, `#3`… |

The text message format:

```
The Monster and the Master
27 September 2026
Romans 7:20-25
Chris Gee
#1 Consider Paul's words in verse 21, ...
#2 When it comes to fighting "fire with fire" ...
#3 As you look to Romans 7:24, ...
```

**The text message is the best metadata source.** It has title, exact date, passage, teacher, and questions. The current script ignores it and depends on a 2025-26 spreadsheet, which does not cover Sept 2026.

Gotcha: WhatsApp truncates long messages behind "Read more". The parser must warn if the text ends in `…` or mid-sentence.

---

## 2. Known problems in the current pipeline

Verified against `import-local-pdfs.mjs` and the sample PDF.

### 2.1 Docs and code have drifted
- `WALKTHROUGH.md` says notes have a `PDF:` property, `Teacher: "Chris"`, and attachments copied to `Ministry/Church/Attachments/` and embedded. **`renderNote()` does none of this.** The script in the repo is not the one that produced the 85 notes, or it was edited afterward.
- `README.md` lists `import-discord-pdfs.mjs` and `package.json`. Neither was provided.
- Action: Phase 0 must diff a real existing note against what the script emits, and reconcile.

### 2.2 Metadata matching is fragile
- `SCHEDULE_XLSX` is hard-coded to the 2025-26 sheet. A Sept 2026 sermon returns `unmatched`.
- `matchSchedule()` fuzzy-matches on book + chapter + verse substrings. It can attach the **wrong date/title** from an older Romans row (e.g. a Romans 7:14–19 row). Silent wrong data is worse than blank data.

### 2.3 `resolveBook()` false positives
The prefix fallback (`k.startsWith(key) || key.startsWith(k)`) maps any word starting with a book name onto that book. `Marketing 9:30` → Mark 9:30. Remove the fallback; use an explicit whitelist only.

### 2.4 `BIBLE_REF_REGEX` misses most refs in this sermon
It only matches `Book Ch:V`. In the sample PDF these are **not** linked: `Rom. 7`, `Romans 6`, `v. 21`, `v. 24`, `verses 14-19`, `verses 24-25`, heading ranges like `(20-21)`, `(22-23)`.

### 2.5 Link generation gaps
- Anchor caps are inconsistent (25 inline, 50 primary) and **silently truncate** long ranges, so backlinks are incomplete.
- Cross-chapter refs emit only the start and end anchors; middle verses get none.
- Inline refs are rewritten to canonical labels (`Rom. 7:21` → `Romans 7:21`), changing the preacher's wording.
- Nothing checks that the target chapter file or verse heading exists in the vault.
- Anchors are appended inside headings, which pollutes the outline pane.

### 2.6 PDF extraction artifacts (this manuscript)
- **Page numbers are at the top of each page.** `pdf-parse` glues them onto the previous line: `…set free from sin.”2`, `Spurgeon said this:17`. The first page starts with a bare `1`.
- Lines are hard-wrapped mid-sentence.
- Outline indentation is lost. Markers: `A.` → `1.` → `a.` → `i.` → `(a)`. Spaces after markers are missing (`b.Even though`, `i.But`).
- The manuscript's own lettering is wrong in places (`B.` and `C.` repeat under one heading), so markers can't be trusted for structure.
- Scripture blocks appear as `Romans 7:14–25 (ESV)` followed by verse text with inline verse numbers, and no clear end marker (`Philippians 3:20–21 (ESV)` is followed by an unmarked paragraph, "No more lowly body…").
- Main-point headings: `#1 The Enemy (20-21)`, `#3 The Victory (24-25)`. Point 2 is written `Secondly, let’s look at The Battle (22-23)` with no `#2`. Section words: `Intro`, `Background`.

---

## 3. Conventions (researched)

### 3.1 Bible Linker (kuchejak/obsidian-bible-linker) — what to match
- The plugin's **Copy** command emits `>[[Gen-01#v1|Gen 1,1-3]] <verse text> [[Gen-01#v1|]][[Gen-01#v2|]][[Gen-01#v3|]]`. The empty-alias `[[…|]]` links are "invisible" in reading mode and visible only in source mode. They exist to create per-verse backlinks.
- Cross-chapter links are **not supported** by the plugin. Any cross-chapter handling here is a custom extension. Label it as such in code comments.
- The plugin's separate **Create links** command produces a different shape (`[[Gn 1#2]]`, no `v` prefix). Do not mix the two shapes in one vault. This pipeline standardizes on the Copy-command shape with `#v` anchors, which already matches `Bible/ESV/<Book>/<Abbrev> <Ch>.md`.
- Verify against the installed plugin version in `.obsidian/plugins/obsidian-bible-linker` and the real chapter files. Don't trust this guide or the docs over the vault.

### 3.2 Obsidian properties — what to match
- Internal links in text properties **must be quoted**. Keep `base: "[[Church Notes.base]]"`.
- A property's type is **vault-wide per property name**. `Date` and `date` are two different properties. Keep the existing Title-Case keys (`Teacher`, `Date`, `Passage`…). Do not rename; the 85 existing notes and `Church Notes.base` depend on them.
- Dates should be written unquoted as `YYYY-MM-DD` so they're real Date-type values. Existing notes quote them as strings; check what `Church Notes.base` filters/sorts on before changing.
- Text properties are single-line. Escape or collapse newlines in `Big Idea`.
- Project rule from the existing Bible-study docs, already correct here: **`Passage` is plain text in frontmatter; Bible links live only in the body.** Never write `[[…]]` Bible links into YAML.
- The README says "Dataview". `Church Notes.base` is an Obsidian **Bases** file. Fix the wording in the README.

---

## 4. Target design

### 4.1 CLI

```
sermon-import <file.pdf|docx|doc> [options]

Metadata (highest precedence first):
  --title "..." --date YYYY-MM-DD --passage "Romans 7:20-25" --teacher "Chris Gee"
  --paste                 read the WhatsApp text message from the macOS clipboard (pbpaste)
  --message-file <path>   same, from a file
  --message "<text>"      same, inline

Behavior:
  --dry-run               print the parsed result and link report, write nothing
  --force                 overwrite an existing note (old copy backed up outside the vault)
  --no-bare-refs          don't link "v. 21" / "verses 14-19"
  --no-schedule           skip spreadsheet enrichment
  --open                  open the note in Obsidian when done (obsidian:// URI)
  --latest                no file arg: use newest "* (City Light).*" in the source dir
```

- Install as a command via `package.json` `"bin"` + `npm link`, or a one-line shell wrapper in `~/bin`.
- Default is **refuse to overwrite**. Exit code 2 with a clear message if the target note exists.
- Keep `import-local-pdfs.mjs` working as a batch wrapper over the same modules. No behavior fork.
- No new paid services and no LLM/API calls. Everything local and deterministic. Prefer the existing deps (`pdf-parse`, `mammoth`, `xlsx`) and `node:test`.

### 4.2 Module layout

```
bin/sermon-import.mjs
src/config.mjs              env + defaults (VAULT_ROOT, SOURCE_DIR, SCHEDULE_XLSX)
src/cli.mjs
src/meta/message.mjs        WhatsApp text-message parser
src/meta/filename.mjs       existing parseFilename() moved here, unchanged behavior
src/meta/schedule.mjs       xlsx enrichment (exact-date only)
src/meta/teachers.json      alias map: "Christopher Gee" → "Chris Gee"
src/extract/{pdf,docx,doc}.mjs
src/clean/pages.mjs         strip page numbers (per-page extraction)
src/clean/reflow.mjs        unwrap lines, fix markers
src/clean/outline.mjs       markers → headings + nested bullets
src/clean/scripture-blocks.mjs
src/bible/books.json        single source of truth for names/abbrevs/aliases
src/bible/vault-index.mjs   scans Bible/ESV to validate chapters and verse anchors
src/bible/linkify.mjs
src/render/note.mjs
test/fixtures/              romans-7-20-25.pdf.txt, romans-7-20-25.message.txt, expected.md
test/*.test.mjs
```

`books.json` replaces the duplicated `BOOK_MAP`/`ABBREV_TO_KEY`. `Scripts/link_bible_refs.py` in the vault has its own alias map; leave it alone for now, but keep `books.json` in a shape the Python side could load later.

### 4.3 Metadata precedence, per field

`CLI flag` > `WhatsApp message` > `filename` > `schedule sheet (exact date match only)` > blank.

| Field | Source notes |
|---|---|
| Title | Message line 1 |
| Date | Message date line → ISO. Warn if not a Sunday. |
| Passage | Message passage line, normalized to `Romans 7:20–25` (en dash). Cross-check against filename; warn on mismatch. |
| Teacher | Message; else sender name. Normalize via `teachers.json`. |
| Big Idea / Special / Context | Schedule sheet only if the date matches exactly. **Never invent.** Leave blank otherwise. |
| Discussion questions | Message `#N` blocks |

Schedule matching: **exact date only.** Delete the book/chapter/verse fuzzy matching, or limit it to rows within ±14 days of a known date. Report `Import Match` as `message`, `date`, or `none`.

---

## 5. Note spec

### 5.1 Frontmatter (additive to the existing schema)

```yaml
---
title: "The Monster and the Master (Romans 7:20–25)"
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

- `Book` is new and additive (lets Bases group by book). Add `Series` only if Corbin wants it (§9).
- Omit empty optional keys; don't write `Big Idea: ""`.
- Don't touch or migrate the 85 existing notes in this task.

### 5.2 Body

```markdown
## Passage

> [[Rom 7#v20|Romans 7:20–25]] [[Rom 7#v20|]][[Rom 7#v21|]][[Rom 7#v22|]][[Rom 7#v23|]][[Rom 7#v24|]][[Rom 7#v25|]]

## Sermon Info

- **Date:** 2026-09-27
- **Teacher:** Chris Gee
- **Passage:** Romans 7:20–25
- **Title:** The Monster and the Master

## Discussion Questions

1. Consider Paul’s words in [[Rom 7#v21|verse 21]] ...
2. ...
3. As you look to [[Rom 7#v24|Romans 7:24]] ...

## Teaching Notes

### Intro
...
### Background
...
### #1 The Enemy ([[Rom 7#v20|20]]–[[Rom 7#v21|21]])
...

## Source File

[[Attachments/Romans 7_20-25 (City Light).pdf]]
```

- Copy the source file to `Ministry/Church/Attachments/`. **Link it, don't embed it** (an inline 18-page PDF is heavy on mobile).
- Omit `## Discussion Questions` if none were provided. Don't leave empty sections.

---

## 6. Cleaning the manuscript

Order matters:

1. **Extract per page.** Use `pdf-parse`'s `pagerender` option (or equivalent) so pages stay separate. For each page `n`, strip a leading standalone `n` (the page number). This kills `sin.”2`-style gluing at the source. DOCX/DOC have no page numbers; skip this step.
2. **Normalize.** NBSP → space, keep curly quotes and dashes, `\f` → newline, trim trailing whitespace.
3. **Fix markers.** Insert the missing space after markers (`b.Even` → `b. Even`, `i.But` → `i. But`).
4. **Reflow.** Join a line to the previous one unless it starts with an outline marker, a `#N` heading, a section word, or a Scripture-block header. Handle hyphenated wraps.
5. **Headings.**
   - `^#\d+\s+.+\(\d+[-–]\d+\)$` → `###`
   - `^(Secondly|Second|Thirdly|Next|Finally),?\s.+\(\d+[-–]\d+\)$` → `###` (numbered by order of appearance)
   - Standalone `Intro`, `Introduction`, `Background`, `Conclusion` → `###`
   - Verse ranges in heading parentheses link to the **primary passage chapter**: `(20-21)` → `([[Rom 7#v20|20]]–[[Rom 7#v21|21]])`. No anchors in headings.
6. **Outline → nested bullets.** Levels by marker type:

   | Level | Marker |
   |---|---|
   | 1 | `A.` `B.` … |
   | 2 | `1.` `2.` … |
   | 3 | `a.` `b.` … |
   | 4 | `i.` `ii.` … |
   | 5 | `(a)` `(b)` … |

   Drop the marker text and use `-` bullets with indentation. Dropping the markers also hides the manuscript's own lettering mistakes. Resolve `i.`/`v.`/`x.` (letter vs roman) by context: roman only if the previous marker was a level-3 letter or a roman. On any ambiguity, fall back to a flat bullet at the last known level and log it. Unmarked paragraphs stay as plain paragraphs.
7. **Scripture blocks.** Header `^Book Ch:V(–V)? \((ESV|NIV|NASB|…)\)$` becomes a collapsible callout:

   ```markdown
   > [!quote]- [[Rom 7#v14|Romans 7:14–25]] (ESV)
   > 14 For we know that the law is spiritual, ...
   ```

   Block end: prefer matching the last verse against the local `Bible/ESV` text (normalized string match) to find the exact end. Fallback: end at the next outline marker or heading. When the fallback runs, log it (the `Philippians 3:20–21` case is the test). Do not linkify inside the callout body. Title gets one link, no anchors.

If any cleaning step throws or produces suspiciously little output, fall back to the plain cleaned text with a warning. Never lose manuscript content.

---

## 7. Bible linking spec (`linkify.mjs`)

### 7.1 Recognition
- Build the book regex **from `books.json` aliases only**, longest first, case-insensitive, optional trailing period, word-boundary anchored. Numbered books: `1|2|3|I|II|III|First|Second|Third` + space + name.
- Patterns:

  | Form | Example | Output |
  |---|---|---|
  | chapter:verse | `Romans 7:21` | verse link |
  | verse range | `Rom. 7:14–19`, `7:14-19` | verse link + anchors |
  | verse list | `Rom 7:20, 22`, `7:20; 22` | one link per part |
  | cross-chapter | `Rom 7:25–8:1` | custom (§7.3) |
  | chapter only | `Rom. 7`, `Romans 6` | `[[Rom 7\|Rom. 7]]` |
  | bare verse | `v. 21`, `vv. 22-23`, `verse 24`, `verses 14-19` | primary-passage chapter |

- Chapter-only refs link only when the book matched via the whitelist. Never on a bare number.
- Bare verses resolve **only to the primary passage's chapter**, never to "the most recent ref" (the sample sermon jumps to Philippians and 1 John mid-stream). Skip them if the verse doesn't exist in that chapter per the vault index. Support `--no-bare-refs`.

### 7.2 Output
- **Preserve the author's surface text as the alias** for inline refs: `[[Rom 7#v21|v. 21]]`, `[[Rom 7|Rom. 7]]`. Canonical labels (`Romans 7:20–25`) are for the primary passage block only.
- Verse ranges: main link + one empty-alias anchor per verse, **no cap**.
- Anchors go in body text only. **No anchors in headings, callout titles, or table headers.**
- Never touch: frontmatter, fenced code, existing `[[…]]`/`[…](…)`, URLs, inline code.
- **Idempotent:** `linkify(linkify(x)) === linkify(x)`.

### 7.3 Cross-chapter (custom extension)
Bible Linker doesn't support this. Emit the main link at the start verse, then anchors for every verse in both chapters (`Rom 7#v25`, `Rom 8#v1`). Chapter verse counts come from the vault index.

### 7.4 Validation against the vault (`vault-index.mjs`)
- On startup, scan `Bible/ESV/<Book>/<Abbrev> <Ch>.md` and record which `v<N>` verse headings exist per chapter. **Phase 0: read one real chapter file and confirm the heading format before coding this.**
- Before emitting a link, confirm the file and the verse anchor exist. If not, leave the text unlinked and add it to the report's "unresolved" list.
- If the ESV folder is missing, warn once and link without validation (don't fail the import).

### 7.5 Must-not-link test strings
`19 years`, `1819`, `Marketing 9:30`, `at 10:30`, `144 planes`, `Sicily`, `the score was 6:5` (no book).

Ambiguous English-word books (`Job`, `Mark`, `Acts`, `Ruth`, `Amos`): link only when followed by `Ch:V`. For chapter-only forms (`Mark 2`), mark the link low-confidence in the report if the next word is lowercase and not a verse marker.

---

## 8. Safety, idempotency, reporting

- Never overwrite silently. `--force` copies the old note to `output/backup/<timestamp>/` **outside** the vault (iCloud syncs the vault, so backups inside it pollute it).
- Write atomically: temp file in the same directory, then rename.
- Filename: `YYYY-MM-DD - Romans 7.20–25.md` (keep the existing `:` → `.` replacement and ` (Part N)` suffix). Strip `<>:"/\|?*` and control chars.
- End of every run, print a compact summary:

  ```
  ✔ Ministry/Church/2026-09-27 - Romans 7.20–25.md
    The Monster and the Master · Chris Gee · 2026-09-27 (message)
    pages 18 · questions 3 · links 41 ok / 2 unresolved · bare refs 9
    warnings: message ends with "…" (possibly truncated)
  ```

- Write a machine-readable `output/sermon-import/last-run.json` with the same data plus every context-resolved bare ref, for spot-checking.
- Exit codes: `0` ok, `1` error, `2` target exists, `3` imported with warnings (opt-in via `--strict`).

---

## 9. Phases and acceptance criteria

### Phase 0 — Recon (no code changes)
1. Read the real `import-local-pdfs.mjs`, `package.json`, and one existing note from `Ministry/Church/`. Write down every difference from `WALKTHROUGH.md`.
2. Open `Bible/ESV/Romans/Rom 7.md`. Record the exact verse heading format.
3. Open `Church Notes.base` and record which properties it reads and how it filters/sorts `Date`.
4. Save the Romans 7:20–25 PDF text, WhatsApp message, and this guide's expected output under `test/fixtures/`.

**Done when:** a short `RECON.md` lists the drift and answers 2 and 3.

### Phase 1 — Extraction and cleaning
Implement §6. **Done when:** on the fixture, no line ends in a page-number glue (`/[.”"’:]\d{1,2}$/`), `Intro` / `Background` / `#1` / `Secondly…` / `#3` render as headings, and both Scripture blocks are callouts with correct extents.

### Phase 2 — Linkifier
Implement §7 with `node:test`. **Done when:**
- Every §2.4 miss now links (`Rom. 7`, `Romans 6`, `v. 21`, `verses 14-19`, `verses 24-25`).
- Every §7.5 string is untouched.
- Idempotence test passes.
- A range longer than 25 verses gets all its anchors.
- An invalid ref (`Romans 7:99`) stays plain text and appears in "unresolved".

### Phase 3 — Message parser and metadata
Implement §4.3 and `message.mjs`. **Done when:** the fixture message yields title `The Monster and the Master`, date `2026-09-27`, passage `Romans 7:20–25`, teacher `Chris Gee`, and 3 questions. Truncated input triggers a warning.

### Phase 4 — CLI, renderer, and install
Implement §4.1, §5, §8. **Done when:** the one-line command in the header produces a note matching `test/fixtures/expected.md`, opens correctly in Obsidian, and shows up in `Church Notes.base`. A second run exits `2`.

### Phase 5 — Docs
Update `README.md` (Bases not Dataview, new CLI, module layout) and rewrite `WALKTHROUGH.md` to match the code.

### Phase 6 — Optional
- `--from-chat-export <_chat.txt>`: parse a WhatsApp chat export, pair each PDF (`<attached: …>`) with the nearest question message by passage, batch import. Export line formats vary by locale, so build the parser against a real export.
- Backfill `Book` on the existing 85 notes (separate, reviewed change).

---

## 10. Decisions for Corbin (defaults in bold)

1. Attachment: **link** vs embed the PDF.
2. Outline: **nested bullets, markers dropped** vs keep `A.`/`1.` text.
3. Add a `Series` property (e.g. `Romans`)? Default **no** until asked.
4. Inline refs: **keep the preacher's wording as link text** vs canonical `Romans 7:21`.
5. `Date`: **unquoted date type** vs the current quoted string (depends on Phase 0 answer 3).

---

## 11. Do not

- Rename existing frontmatter keys.
- Write Bible links into frontmatter.
- Modify existing notes in `Ministry/Church/`.
- Use the Bible Linker "Create links" output shape.
- Add network calls, paid APIs, or LLM steps.
- Guess metadata. Blank beats wrong.

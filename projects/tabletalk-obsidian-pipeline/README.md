# Tabletalk → Obsidian Pipeline

Fetches Ligonier's **Tabletalk Magazine** (daily studies, features, columns) and writes clean Markdown notes into an Obsidian vault, with scripture references linked for the [Bible Linker](https://github.com/kuchejak/obsidian-bible-linker-plugin) plugin so every passage shows backlinks.

```bash
tabletalk sync       # pull the current + previous month
tabletalk relink     # refresh links/frontmatter on notes you already have
```

---

## What it does

1. **Discovers** issues from the sitemap and the issue TOC endpoint.
2. **Extracts** daily studies from the WordPress REST API and features/columns from page HTML.
3. **Cleans** everything to plain Markdown (no HTML, NBSP, or template artifacts) and **lints** it.
4. **Links scripture** (see [Bible linking](#bible-linking)).
5. **Writes** notes into the vault, preserving anything you type below `<!-- tt:end -->`.
6. **Tracks** processed items in a SQLite ledger and caches raw responses.
7. Optionally adds **AI summaries** (`--enrich`, Claude API).

---

## Install

Requires Python 3.11+.

```bash
cd ~/Hal9000/projects/tabletalk-obsidian-pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp config.example.yaml config.yaml     # then edit
tabletalk doctor
```

`config.yaml` is git-ignored because it can hold credentials. `config.example.yaml` is the tracked template.

Config lookup order: `--config <path>` → `$TABLETALK_CONFIG` → `./config.yaml` → `~/.config/tabletalk/config.yaml`.

| Env var | Overrides |
|---|---|
| `TABLETALK_VAULT` | `obsidian.vault_path` |
| `ANTHROPIC_API_KEY` | `anthropic.api_key` |
| `LIGONIER_EMAIL` | `ligonier.email` |
| `TABLETALK_CONFIG` | config file path |

---

## Commands

| Goal | Command |
|---|---|
| Check config, vault, connectivity | `tabletalk doctor` |
| Sync current + previous month | `tabletalk sync` |
| Preview without writing | `tabletalk sync --dry-run` |
| Sync with AI summaries | `tabletalk sync --enrich` |
| Backfill the archive (resumable) | `tabletalk backfill --from 2024-01 --to 2024-12` |
| Backfill one year | `tabletalk backfill --year 2025` |
| **Refresh links + frontmatter on existing notes** | `tabletalk relink` |
| Preview a relink | `tabletalk relink --dry-run` |
| Relink one issue | `tabletalk relink --issue 2026-09` |
| Coverage + lint report | `tabletalk verify` |
| Download an issue EPUB | `tabletalk archive --epub 2026-03` |

Exit codes for `sync`: `0` ok, `1` partial, `2` failure. `rebuild` (re-render from raw cache) is a stub and not implemented yet; use `relink` to refresh existing notes.

---

## Bible linking

### Format

Links follow the Bible Linker plugin: one note per chapter, verses marked by headings.

| Text in the article | Written as |
|---|---|
| `Romans 8:28` | `[[Rom 8#v28\|Romans 8:28]]` |
| `Romans 8` | `[[Rom 8\|Romans 8]]` |
| `1 John 2:9–11` | `[[1 John 2#v9\|1 John 2:9–11]][[1 John 2#v10\|]][[1 John 2#v11\|]]` |
| `Isaiah 18–20` | `[[Isa 18\|Isaiah 18–20]][[Isa 19\|]][[Isa 20\|]]` |
| `vv. 9–11` (after a 1 John 2 reference) | `[[1 John 2#v9\|vv. 9–11]]…` |
| `(2:2)`, `; 13:4`, `and 2:15–17` | linked against the book already in context |
| `Gen. 1:3, 6, 9` / `vv. 4, 10 and 12` | each verse linked |

- The alias is always the text exactly as written, so unlinking is lossless.
- The empty-alias links (`[[Gen 1#v2|]]`) are what the plugin's *Copy* command writes. They are invisible in reading view, but give every verse in a range a backlink. Turn off with `link_range_verses: false`. Ranges are capped at 40 extra links; cross-chapter ranges (`3:16–4:2`) link the first verse only.

### Where links go

| Content | Linked? |
|---|---|
| Daily study: passage (callout title `> [!quote] [[…]]`) | Yes |
| Daily study body and Coram Deo | Yes |
| Feature and column bodies | Yes |
| **For further study** | **Never** |
| **The Bible in a year** (and "Related Scripture") | **Never** |
| The scripture quotation itself, headings, code, existing links, URLs | No |
| Frontmatter (`passage`, `further_study`, …) | No (stays plain text for Dataview) |

### Match your vault (required once)

The plugin builds links from your **actual file and heading names**. Set these three in `config.yaml` so they match:

| Your chapter notes | Your verse headings | `chapter_note` | `verse_prefix` |
|---|---|---|---|
| `Gen 1` | `###### v1` | `"{book} {chapter}"` (default) | `"#v"` (default) |
| `Gen-01` | `###### v1` | `"{book}-{chapter:02d}"` | `"#v"` |
| `Genesis 1` | `###### 1` | `"{book_full} {chapter}"` | `"#"` |

Different abbreviations? Override per book: `abbreviations: {"Psalm": "Psa", "1 John": "1Jn"}`. Keys are canonical names (`Genesis`, `1 Samuel`, `Psalm`, `Song of Solomon`, …).

**Test it:** `tabletalk relink --dry-run`, then relink one issue (`--issue 2026-10`), open a note, and click a verse link. It should land on the right heading. If not, adjust the settings and run `relink` again; it rewrites links in whatever format you choose.

---

## Refreshing existing notes: `tabletalk relink`

Offline (no network, no cache). For every Tabletalk note in `notes_folder`:

**Body** (above `<!-- tt:end -->`)
1. Removes existing scripture links and invisible range links.
2. Re-links using your current `bible:` settings.

**Frontmatter** (a line is only touched if it's wrong)
- `issue: [[00 Issue]]` → `[[<vault-relative folder>/00 Issue]]`
- `authors: Roland  Mathews` → `Roland Mathews`
- `post_id` on features/columns → stable ID derived from `source_url`

Anything you wrote below `<!-- tt:end -->` is preserved byte-for-byte. Re-running is safe. Run it after changing any `bible:` setting.

---

## Vault layout

```
Ministry/Church/Devotionals/Tabletalk/
└── 2026-10 Faith and Work/
    ├── 00 Issue.md
    ├── Daily - 2026-10-12 - Abide in Him.md
    ├── Feature - Work After the Fall.md
    ├── Column - Coram Deo - Worthwhile Work.md
    └── …
```

Daily study note:

```markdown
---
type: tabletalk-daily-study
post_id: 32770
title: Abide in Him
date: 2026-10-12
issue: "[[Ministry/Church/Devotionals/Tabletalk/2026-10 Faith and Work/00 Issue]]"
passage: 1 John 2:28
further_study: [Matthew 24:42–44, Romans 13:11–14]
bible_in_a_year: [Isaiah 51–53, 1 Thessalonians 3:6–13]
weekend: false
source: rest
tags: [tabletalk]
---

> [!quote] [[1 John 2#v28|1 John 2:28]]
> “And now, little children, abide in him…”

To abide in the Son and the Father… (1 John 2:24–27)…

## Coram Deo
…
## For further study        ← plain text, never linked
## The Bible in a year      ← plain text, never linked

<!-- tt:end -->
(your notes here are never overwritten)
```

---

## Fixes in this release

| Bug | Effect | Fix |
|---|---|---|
| Feature/column `post_id` came from `hash(url)` | Python randomises string hashes per run, so IDs changed every sync and the ledger saw the same article as new | `util.stable_post_id` (SHA-1 of the URL) |
| Author names had double spaces (`Roland  Mathews`) | Messy frontmatter and `[[wikilinks]]` | `util.clean_name` in `discover.py` and `cli.py` |
| `issue: [[00 Issue]]` | Every issue folder has a note named `00 Issue`; the bare name is ambiguous in Obsidian | Full vault-relative path |
| Re-sync created `-<id>` duplicate notes | Existing notes were never overwritten, so the user-region preservation never ran | Same-article detection by `source_url`; the note is updated in place |
| `Path.with_suffix(".md")` on titles with periods | `Feature - Jesus vs. Caesar` was written as `Feature - Jesus vs.md` | Append the extension instead |
| Scripture matcher | "his 3" matched Isaiah; "Matt." with a period missed; `(2:2)` and verse lists ignored, which also broke `v.` context | Rewritten `refs.py` |

After upgrading, run `tabletalk relink` once to bring existing notes in line.

---

## Code map

```
tabletalk/
├── cli.py          Typer commands (doctor, sync, backfill, relink, rebuild, verify, archive)
├── config.py       Pydantic config + loader (incl. bible: settings)
├── discover.py     Sitemap, issue TOC, REST paging
├── extract_rest.py Daily studies from the REST API
├── extract_html.py Features/columns (and daily fallback) from page HTML
├── clean.py        HTML → Markdown
├── refs.py         Scripture detection + BibleLinker (link / unlink)
├── relink.py       Refresh existing notes (body links + frontmatter)
├── render.py       Notes, issue index, safe filenames, user-region preservation
├── lint.py         Quality gate + coverage check
├── ledger.py       SQLite ledger
├── http.py         Rate-limited cached HTTP client
├── enrich.py       Optional Claude summaries
├── util.py         stable_post_id, clean_name
├── model.py        Article dataclass
└── tests/
```

---

## Tests

```bash
pytest
pytest --cov=tabletalk
```

---

## Publishing to GitHub

Run from the project folder. Check for secrets first: `config.yaml` is git-ignored, and `config.example.yaml` must contain no real credentials.

```bash
cd ~/Hal9000/projects/tabletalk-obsidian-pipeline

# 1. Make sure no secrets are about to be committed
grep -nE '(password|api_key|email):\s*"[^"]+"' config.example.yaml || echo "example config clean"

# 2. Initialise (skip if this is already a git repo)
git init -b main

# 3. If config.yaml was ever tracked, untrack it (keeps the local file)
git rm --cached config.yaml 2>/dev/null || true

# 4. Review, then commit
git add .
git status
git commit -m "Add Bible Linker links, relink command, and fix IDs/authors/issue links/duplicate notes"

# 5a. Create the repo with the GitHub CLI and push
gh repo create tabletalk-obsidian-pipeline --private --source=. --remote=origin --push

# 5b. …or, if you created the repo on github.com first
git remote add origin git@github.com:corbinwrites/tabletalk-obsidian-pipeline.git
git push -u origin main
```

Later changes:

```bash
git add -A && git commit -m "Describe the change" && git push
```

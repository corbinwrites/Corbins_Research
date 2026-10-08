# 📚 Tabletalk Magazine Obsidian Pipeline

An automated, high-performance tool that fetches, parses, formats, and syncs Ligonier Ministries' **Tabletalk Magazine** issues (daily devotionals, articles, study questions, and series) directly into your Obsidian vault.

```bash
tabletalk sync
```

---

## 🌟 What This Tool Does

When you run `tabletalk`, the pipeline automates the entire download, parsing, and Obsidian vault creation process:

1. **📰 Issue & Article Discovery**: Automatically scans Ligonier's Tabletalk sitemaps and API endpoints to find current, recent, or archival magazine issues.
2. **🧼 Clean Text Extraction & Markdown Conversion**: Strips web clutter, navigation elements, and HTML artifacts to produce clean, beautifully structured Markdown text.
3. **🔗 Smart Bible Scripture Reference Linking**: Parses scripture references throughout devotionals and articles (e.g., `Genesis 1:1–5`, `Romans 8:28`, `John 3:16`) and converts them into clickable Obsidian wikilinks (`[[Gen 1#v1|Genesis 1:1–5]]`).
4. **📂 Obsidian Vault Sync**:
   * Places rendered notes into your vault under `Ministry/Church/Devotionals/Tabletalk/YYYY-MM - Month Year/`.
   * Automatically creates issue index notes (`_Issue Index - YYYY-MM.md`) summarizing the month's devotionals and articles.
   * Attaches YAML frontmatter (`tags`, `date`, `author`, `scripture`, `issue`, `source_url`).
5. **⚡ Smart Resumable Ledger & Caching**: Tracks processed articles in a local SQLite database (`~/.cache/tabletalk/ledger.db`). It will never re-download pages unnecessarily.
6. **🤖 Optional AI Enrichment**: Uses Anthropic's Claude API to generate article summaries and key takeaways when `--enrich` is passed.
7. **🔄 Offline Re-rendering**: Allows you to re-render all notes from local raw cache (`tabletalk rebuild`) instantly without making network requests.

---

## ⚡ Quick Start (3 Steps)

### Step 1: Run Pre-Flight Doctor Check
Check that your configuration, vault path, and site connectivity are ready:

```bash
tabletalk doctor
```

### Step 2: Sync the Latest Issues
Fetch and format the current and previous month's Tabletalk issues:

```bash
tabletalk sync
```

### Step 3: Open in Obsidian
Open Obsidian and navigate to:
`Ministry/Church/Devotionals/Tabletalk/`

---

## 🛠️ Installation & Setup

### System Requirements
* **Python**: `3.11` or higher
* **OS**: macOS, Linux, or Windows

### Step-by-Step Installation

1. **Navigate to project directory**:
   ```bash
   cd ~/Hal9000/projects/tabletalk-obsidian-pipeline
   ```

2. **Install the package in editable mode**:

   *Using standard Python environment:*
   ```bash
   pip3 install -e . --break-system-packages
   ```

   *Or using a virtual environment:*
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e .
   ```

3. **Verify the global command**:
   ```bash
   tabletalk --help
   ```

---

## ⚙️ Configuration (`config.yaml`)

The pipeline looks for a configuration file in the following order:
1. File path supplied via `--config <path>` argument.
2. File path in environment variable `TABLETALK_CONFIG`.
3. `./config.yaml` in the current working directory.
4. `~/.config/tabletalk/config.yaml`.

### Configuration Template

```yaml
ligonier:
  email: ""                    # Optional Ligonier subscriber email
  password: ""                 # Kept for optional 'archive' EPUB downloader

anthropic:
  api_key: ""                  # Optional: API key for AI enrichment (--enrich)

obsidian:
  vault_path: "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal"
  notes_folder: "Ministry/Church/Devotionals/Tabletalk"
  authors_as_wikilinks: false  # Set true to format author names as [[Author Name]]

cache:
  dir: "~/.cache/tabletalk"    # Directory for raw HTTP cache & ledger.db SQLite database

options:
  max_articles: 0              # Maximum articles to process (0 = no limit)
  include_posts: false         # Set true to include /posts/ online articles
  tags:
    - tabletalk
  enrich: false                # AI enrichment off by default
  request_delay: 1.0           # Seconds pause between web requests (polite rate limiting)
  concurrency: 2
```

### Environment Variable Overrides
You can override configuration defaults using standard environment variables:

| Variable | Description |
|----------|-------------|
| `TABLETALK_VAULT` | Overrides `obsidian.vault_path` |
| `ANTHROPIC_API_KEY` | Overrides `anthropic.api_key` |
| `LIGONIER_EMAIL` | Overrides `ligonier.email` |
| `TABLETALK_CONFIG` | Specifies path to a custom `config.yaml` file |

---

## 💡 Command Reference & Examples

| Goal | Command |
|------|---------|
| **Check environment & connectivity** | `tabletalk doctor` |
| **Sync current + previous month's issues** | `tabletalk sync` |
| **Preview sync without writing files (Dry Run)** | `tabletalk sync --dry-run` |
| **Sync with AI summaries (Claude API)** | `tabletalk sync --enrich` |
| **Backfill full archive (resumable)** | `tabletalk backfill` |
| **Backfill specific month range** | `tabletalk backfill --start 2024-01 --end 2024-12` |
| **Re-render vault notes offline from cache** | `tabletalk rebuild` |
| **Audit coverage vs sitemap & print lint report** | `tabletalk verify` |
| **Download issue EPUB to Attachments folder** | `tabletalk archive --issue 2026-03` |

### Detailed Subcommand Options

#### `tabletalk sync`
Syncs the active month and previous month.
* `--config / -c <path>`: Custom configuration file path.
* `--dry-run`: Performs discovery and parsing without writing `.md` files to disk.
* `--enrich`: Enables AI summarization using Anthropic Claude API.

#### `tabletalk backfill`
Processes archive issues starting from current date backwards or within a specified date range.
* `--start YYYY-MM`: Start date for backfill (e.g. `2020-01`).
* `--end YYYY-MM`: End date for backfill (e.g. `2026-03`).
* `--enrich`: Enable AI enrichment during backfill.

#### `tabletalk rebuild`
Re-generates Markdown files in your Obsidian vault directly from local cached HTML/JSON responses.
* Zero network calls made.
* Ideal after editing note templates, changing tag options, or updating Bible ref formatting rules.

#### `tabletalk verify`
Runs quality assurance and coverage lint checks:
* Compares sitemap article URLs against recorded entries in `ledger.db`.
* Reports missing articles, unparsed Bible references, or broken metadata.

---

## 📁 Obsidian Vault Folder Structure

When notes are rendered to your vault, they are structured cleanly by month:

```
Ministry/Church/Devotionals/Tabletalk/
└── 2026-03 - March 2026/
    ├── _Issue Index - 2026-03.md
    ├── 2026-03-01 - Living by Faith.md
    ├── 2026-03-02 - The Promises of God.md
    ├── 2026-03-03 - Grace in Suffering.md
    └── ...
```

### Sample Rendered Note Frontmatter & Body

```markdown
---
title: "Living by Faith"
date: 2026-03-01
author: "Burk Parsons"
issue: "2026-03"
passage: "Habakkuk 2:4"
tags:
  - tabletalk
  - devotional
source_url: "https://tabletalkmagazine.com/posts/living-by-faith/"
---

# Living by Faith

**Passage:** [[Hab 2#v4|Habakkuk 2:4]]
**Author:** Burk Parsons

> "Behold, his soul is puffed up; it is not upright within him, but the righteous shall live by his faith." (Habakkuk 2:4)

## Reflection

Faith is not a mere intellectual assent to truth...

---
*Synced from Tabletalk Magazine.*
```

---

## 🏗️ Repository Architecture & Codebase Map

The pipeline is packaged cleanly inside `tabletalk/`:

```
projects/tabletalk-obsidian-pipeline/
├── README.md               # User guide and documentation
├── config.yaml             # Working default configuration file
├── pyproject.toml          # Build configuration & dependency definitions
└── tabletalk/              # Core Python application package
    ├── __init__.py         # Package initialization
    ├── cli.py              # Typer CLI interface commands (doctor, sync, backfill, rebuild, verify, archive)
    ├── config.py           # Pydantic configuration model and YAML loader
    ├── discover.py         # Sitemap parser and issue TOC crawler
    ├── extract_html.py     # HTML page scraper & element parser
    ├── extract_rest.py     # Ligonier REST API article extractor
    ├── http.py             # Rate-limited HTTP client with raw caching & UA rotation
    ├── ledger.py           # SQLite database ledger tracking synced articles
    ├── lint.py             # Lint diagnostics & coverage checking suite
    ├── model.py            # Pydantic data models for Article and Issue data structures
    ├── clean.py            # Text sanitization & HTML-to-Markdown formatting engine
    ├── refs.py             # Scripture reference detector & Obsidian wikilink formatter
    ├── render.py           # Markdown note & issue index template renderer
    ├── enrich.py           # Anthropic Claude API enrichment handler
    └── tests/              # Comprehensive test suite (80 unit & integration tests)
        ├── test_clean.py
        ├── test_discover.py
        ├── test_extract_rest.py
        ├── test_lint.py
        └── test_render.py
```

---

## 🧪 Testing & Development

To run the complete unit and integration test suite:

```bash
pytest
```

To run test coverage report:

```bash
pytest --cov=tabletalk
```

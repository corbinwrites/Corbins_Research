# CLAUDE.md Addendum 4 — Score Persistence, History & AI Export

> Append to `CLAUDE.md`. Covers three things:
> 1. Scores are append-only — never overwritten
> 2. Score history visible in the Detail screen
> 3. Export to Finder-accessible files for use in other AI tools

---

## D1. Score Immutability — Append-Only Scoring

### The problem with the current implementation

`score_all_jobs()` skips jobs scored within `cache_ttl_hours`, but after that
window expires it re-scores and silently replaces the reasoning. This means:
- You cannot see why a job scored differently after a profile update
- Debugging scoring quality is impossible
- Historical signal is lost permanently

### The fix: always INSERT, never UPDATE

The `scores` table already has an auto-increment `id` — it was designed for this.
The scorer just needs to stop deleting or replacing old scores.

**Rule:** A score record is permanent once written. The scorer may add new rows
for a job, but may never modify or delete existing ones.

### Updated skip logic in `scorer.py`

```python
def score_job(self, job: dict) -> Optional[dict]:
    job_id = job["id"]

    # Skip if ANY score exists for this job — do not re-score unless forced
    existing = list(self.db.query(
        "SELECT id FROM scores WHERE job_id = ? LIMIT 1",
        [job_id]
    ))
    if existing:
        return None  # already scored — do not overwrite

    # Pre-filter, then score as normal...
```

### Force re-score flag

Add an optional `force: bool = False` parameter to `score_job()` and
`score_all_jobs()` for cases where a profile update warrants re-scoring:

```python
def score_job(self, job: dict, force: bool = False) -> Optional[dict]:
    if not force:
        existing = list(self.db.query(
            "SELECT id FROM scores WHERE job_id = ? LIMIT 1", [job_id]
        ))
        if existing:
            return None

    # Score and INSERT new row — never UPDATE
    ...
    insert_score(self.db, record)  # always INSERT, never UPDATE or upsert
```

Expose in CLI:

```bash
jobseer score --force    # re-score all jobs, appending new score rows
```

### `insert_score` must use INSERT, not INSERT OR REPLACE

```python
# db.py
def insert_score(db: Database, record: dict):
    # Use plain INSERT — do not use INSERT OR REPLACE or upsert
    # This preserves all historical score rows
    db["scores"].insert(record)  # sqlite-utils insert (no upsert)
```

---

## D2. Score History in the Detail Screen

Since scores are now append-only, the Detail screen must show the full history
for each job — not just the most recent score.

### Layout addition to Detail screen

Below the current score block, add a collapsible "Score History" section:

```
╔═══════════════════════════════════════════════════════════╗
║  DETAIL                                                   ║
║  Sr PM, AI Products — Google Cloud                       ║
║                                                           ║
║  ── Latest Score ──────────────────────────────────────  ║
║  91 · APPLY   scored 2 hours ago                         ║
║  Reasoning: Strong NowAssist alignment; LLM depth valued  ║
║  Gaps: Healthcare domain not mentioned                    ║
║                                                           ║
║  ── Score History ─────────────────────────────────────  ║
║  #  Score  Rec      Model                 Scored At       ║
║  3   91    apply    gemini-1.5-flash      2025-04-21 09:01║
║  2   78    consider gemini-1.5-flash      2025-04-19 07:45║
║  1   74    consider gemini-1.5-flash      2025-04-17 08:12║
║                                                           ║
║  [h] Toggle history                                       ║
╚═══════════════════════════════════════════════════════════╝
```

### Query for score history

```python
def get_score_history(db, job_id: str) -> list[dict]:
    return list(db.query(
        """SELECT score, recommendation_label, reasoning, gaps, model, scored_at
           FROM scores
           WHERE job_id = ?
           ORDER BY scored_at DESC""",
        [job_id]
    ))
```

### `h` shortcut on Detail screen

| Key | Action |
|-----|--------|
| `h` | Toggle score history section expanded/collapsed |

**What it does:**
1. Expands a scrollable table showing all score rows for this job, newest first
2. Each row shows: score, recommendation, model, scored_at
3. Selecting a row in the history table shows the full reasoning + gaps for that
   historical score in a sub-panel below
4. Press `h` again to collapse back to the latest-score-only view

---

## D3. Export for AI Tools (Finder-accessible)

### Purpose

Allow job data and scores to be exported as files you can:
- Upload directly to Claude (this chat) or another AI for analysis
- Open in Finder, share, archive
- Feed into a second-pass scoring or cover letter workflow

### Export location

All exports write to `~/JobSeer/exports/` — a human-readable location outside
the project directory, accessible from Finder without navigating into the
project folder.

```python
# In jobsearch/export.py
from pathlib import Path

EXPORT_DIR = Path.home() / "JobSeer" / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)
```

### Three export formats

#### Format 1: `scored_jobs.json` — full machine-readable export

All jobs with their complete score history. Suitable for uploading to Claude or
any AI tool for bulk analysis.

```json
[
  {
    "id": "abc123",
    "title": "Sr PM, AI Products",
    "company": "Google Cloud",
    "location": "Mountain View, CA",
    "sector": "private",
    "apply_url": "https://boards.greenhouse.io/google/jobs/...",
    "posted_at": "2025-04-19",
    "status": "new",
    "description_md": "...(full text)...",
    "scores": [
      {
        "score": 91,
        "recommendation": "apply",
        "reasoning": "Strong NowAssist alignment...",
        "gaps": ["Healthcare domain not mentioned"],
        "model": "gemini-1.5-flash",
        "scored_at": "2025-04-21T09:01:00"
      }
    ]
  }
]
```

#### Format 2: `top_jobs.md` — human-readable shortlist

Only jobs with score >= threshold (default 70), formatted as clean markdown.
Good for pasting into Claude for cover letter generation or interview prep.

```markdown
# JobSeer — Top Matches
Generated: 2025-04-21  Filter: score >= 70, Bay Area + Remote

---

## Sr PM, AI Products — Google Cloud
**Score:** 91 · **Recommendation:** Apply
**Location:** Mountain View, CA · **Sector:** Private
**Apply:** https://boards.greenhouse.io/google/jobs/...
**Reasoning:** Strong NowAssist alignment; LLM depth valued
**Gaps:** Healthcare domain not mentioned

### Job Description
...(full description)...

---

## Digital Services Manager — City of San Jose
**Score:** 82 · **Recommendation:** Apply
...
```

#### Format 3: `scores_only.csv` — lightweight signal export

Just the scores table with job title and company — no descriptions.
Fast to open in Numbers/Excel or upload to an AI when you only need the signal,
not the full text.

```csv
title,company,location,score,recommendation,reasoning,gaps,scored_at,apply_url
"Sr PM, AI Products","Google Cloud","Mountain View, CA",91,"apply","Strong NowAssist...","Healthcare domain","2025-04-21T09:01",https://...
```

### CLI commands

```bash
jobseer export                     # exports all three formats
jobseer export --format json       # scored_jobs.json only
jobseer export --format md         # top_jobs.md only
jobseer export --format csv        # scores_only.csv only
jobseer export --min-score 80      # override threshold for md export
jobseer export --open              # export then open ~/JobSeer/exports/ in Finder
```

The `--open` flag calls:
```python
import subprocess
subprocess.run(["open", str(EXPORT_DIR)])  # macOS Finder
```

### TUI shortcut

Add to Dashboard:

| Key | Action |
|-----|--------|
| `e` | Export all formats, then open exports folder in Finder |

**What it does:**
1. Runs all three exports to `~/JobSeer/exports/`
2. Opens `~/JobSeer/exports/` in Finder via `subprocess.run(["open", ...])`
3. Shows notification: `✓ Exported to ~/JobSeer/exports/`
4. Does not navigate away from Dashboard

---

## D4. Using exports in this Claude chat

Once `~/JobSeer/exports/top_jobs.md` or `scored_jobs.json` exists:

1. Press `e` in the TUI (or run `jobseer export`) to write the files
2. The Finder window opens automatically
3. Drag `top_jobs.md` into this Claude chat to ask things like:
   - *"Which of these roles best matches my Google Cloud interview prep?"*
   - *"Draft a cover letter for the highest-scored government role"*
   - *"Which gaps appear most frequently across all scored jobs?"*
   - *"Re-score these jobs with stricter seniority weighting"*

`top_jobs.md` is the best format for Claude — it's readable, contains full
descriptions, and fits well within context limits for up to ~30 jobs.

`scores_only.csv` is best when you have 100+ jobs and want a quick analysis
without burning context on full descriptions.

---

## D5. File naming convention

Exports are timestamped so you can compare runs over time:

```
~/JobSeer/exports/
  scored_jobs_2025-04-21.json
  top_jobs_2025-04-21.md
  scores_only_2025-04-21.csv
  scored_jobs_2025-04-19.json     ← previous run still here
  top_jobs_2025-04-19.md
```

The three "latest" symlinks always point to the most recent run:

```
~/JobSeer/exports/
  latest_scored_jobs.json  →  scored_jobs_2025-04-21.json
  latest_top_jobs.md       →  top_jobs_2025-04-21.md
  latest_scores.csv        →  scores_only_2025-04-21.csv
```

Symlinks are created/updated on every export run:

```python
def update_symlink(target: Path, link_name: str):
    link = EXPORT_DIR / link_name
    if link.exists() or link.is_symlink():
        link.unlink()
    link.symlink_to(target.name)
```

---

## D6. Updated testing checklist (scoring + export)

- [ ] Scoring a job twice (two separate runs) creates two rows in `scores`, not one?
- [ ] `score_job()` without `--force` skips already-scored jobs?
- [ ] `score_job(force=True)` inserts a new row without touching existing rows?
- [ ] Detail screen shows score history table with all rows, newest first?
- [ ] Selecting a history row shows that row's reasoning + gaps?
- [ ] `h` key toggles history section without navigating away?
- [ ] `jobseer export` creates all three files in `~/JobSeer/exports/`?
- [ ] Symlinks `latest_*.md / .json / .csv` point to newest file?
- [ ] `jobseer export --open` opens Finder at the exports directory?
- [ ] `e` key in TUI exports then opens Finder?
- [ ] `top_jobs.md` only includes jobs above threshold, sorted by score desc?
- [ ] `scored_jobs.json` includes the full `scores` array per job (not just latest)?

---

*Addendum 4 — April 2026*
*Score immutability + history UI + Finder export + AI chat integration*

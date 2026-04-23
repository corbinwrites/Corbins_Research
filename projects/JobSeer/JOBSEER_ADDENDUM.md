# CLAUDE.md Addendum — JobSeer
## Changes from Initial Build Guide

> **Append this to your project `CLAUDE.md`.**
> Sections here override or extend the corresponding sections in the main guide.
> When in conflict, this addendum takes precedence.

---

## A1. Project Name & CLI Entry Point

The project is now named **JobSeer**. The CLI command must be `jobseer`, not `jobsearch`.

Update `pyproject.toml`:

```toml
[project]
name = "jobseer"

[project.scripts]
jobseer = "jobsearch.cli:app"
```

The TUI is launched with:

```bash
jobseer ui
```

All other commands follow the same pattern:

```bash
jobseer discover
jobseer fetch
jobseer score
jobseer fetch --score
jobseer stats
```

The Textual app title displayed in the terminal header should read **"JobSeer"**.

---

## A2. Scoring Engine: Gemini replaces Claude

Windsurf swapped the scoring backend from Anthropic to Google Gemini free tier.
This is now the canonical implementation. Do not revert to Anthropic for scoring.

**Model:** `gemini-1.5-flash`
**Why:** Free tier is sufficient for daily scoring runs at this scale.
**Tradeoff:** No Batch API (Gemini free tier is synchronous only). Score jobs
sequentially with a 1-second sleep between calls to stay within rate limits.

### A2.1 Environment

```bash
# .env
# Get a free key at https://aistudio.google.com/
GOOGLE_API_KEY=

# USAJOBS — unchanged
USAJOBS_API_KEY=
USAJOBS_EMAIL=

# Optional discovery keys — unchanged
CRUNCHBASE_API_KEY=
GOOGLE_PLACES_API_KEY=
FIRECRAWL_API_KEY=
```

Remove `ANTHROPIC_API_KEY` from `.env.example`. It is no longer needed.

### A2.2 Dependency change

```bash
uv remove anthropic
uv add google-genai
```

`pyproject.toml` should no longer list `anthropic` as a dependency.

---

## A3. Scorer Corrections

Windsurf's rewrite introduced several regressions that must be fixed.
Below is the correct implementation of `jobsearch/scoring/scorer.py`.

### A3.1 SQL injection vulnerability — MUST FIX

Windsurf replaced parameterized queries with f-string interpolation.
This is a SQL injection vulnerability. Revert to parameterized queries.

```python
# ❌ WRONG — Windsurf wrote this (f-string with user data injected into SQL)
existing_score = list(self.db.query(
    f"SELECT * FROM scores WHERE job_id = '{job_id}' AND scored_at > '...'"
))

# ✅ CORRECT — always use parameterized queries
existing_score = list(self.db.query(
    "SELECT * FROM scores WHERE job_id = ? AND scored_at > ? ORDER BY scored_at DESC LIMIT 1",
    [job_id, (datetime.utcnow() - timedelta(hours=self.cache_ttl_hours)).isoformat()]
))
```

### A3.2 Settings loading removed — restore it

Windsurf removed `_load_settings()` and hardcoded values like `cache_ttl_hours=24`
and `max_description_words=1500`. These should remain configurable from
`config/settings.toml`.

```python
import tomllib  # restore this import

class Scorer:
    def __init__(self, db: Database):
        self.db = db
        self.settings = self._load_settings()
        scoring_settings = self.settings.get("scoring", {})
        self.cache_ttl_hours = scoring_settings.get("cache_ttl_hrs", 24)
        self.max_description_words = scoring_settings.get("max_description_words", 1500)

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set. Get a free key at https://aistudio.google.com/")
        genai.configure(api_key=api_key)
        self.model_name = "gemini-1.5-flash"
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=SYSTEM_PROMPT
        )

    def _load_settings(self) -> dict:
        settings_path = Path("config/settings.toml")
        if not settings_path.exists():
            return {}
        with settings_path.open("rb") as f:
            return tomllib.load(f)
```

### A3.3 `recommend` field type — fix DB type mismatch

Windsurf changed `recommend` to store `0.5` for "consider" — but the DB schema
defines `recommend` as `INTEGER`. This will silently truncate to `0`.

```python
# ❌ WRONG
"recommend": 1 if score_data["recommendation"] == "apply" else (0.5 if ... else 0)

# ✅ CORRECT — INTEGER only; use the full recommendation string separately
"recommend": 1 if score_data["recommendation"] == "apply" else 0,
"recommendation_label": score_data["recommendation"],  # "apply"|"consider"|"skip"
```

Add `recommendation_label TEXT` to the `scores` table in `db.py` if not already present:

```sql
ALTER TABLE scores ADD COLUMN recommendation_label TEXT;
```

Or add it to the initial `CREATE TABLE` statement so it's present from first run.

### A3.4 Rate limiting — add between Gemini calls

Gemini free tier has rate limits. Add a delay between sequential scoring calls
in `score_all_jobs()`:

```python
import time

def score_all_jobs(db: Database) -> int:
    scorer = Scorer(db)
    jobs = list(db.query("""
        SELECT j.* FROM jobs j
        LEFT JOIN scores s ON j.id = s.job_id
        WHERE s.id IS NULL
           OR s.scored_at < ?
    """, [(datetime.utcnow() - timedelta(hours=scorer.cache_ttl_hours)).isoformat()]))

    scored_count = 0
    for job in jobs:
        result = scorer.score_job(job)
        if result:
            scored_count += 1
        time.sleep(1.0)  # stay within Gemini free tier rate limits

    return scored_count
```

### A3.5 Complete corrected scorer (reference)

```python
# jobsearch/scoring/scorer.py
import os
import json
import time
import tomllib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from google import genai
from google.genai import types
from sqlite_utils import Database
from dotenv import load_dotenv

from jobsearch.db import insert_score
from jobsearch.utils.text import pre_filter_job, truncate_words

load_dotenv()

SYSTEM_PROMPT = """
You are a precise job-fit evaluator. Return ONLY valid JSON — no preamble,
no markdown fences, no explanation outside the JSON object.

Output schema:
{
  "score": <integer 0–100>,
  "recommendation": <"apply" | "consider" | "skip">,
  "reasoning": <string, max 80 words>,
  "gaps": [<string>],
  "title_equivalence": <string>
}

Scoring weights:
  Role alignment     30%
  Seniority match    25%
  Technical depth    25%
  Location           10%
  Growth trajectory  10%

Government title translation:
  Management Analyst       ≈ PM
  Digital Services Manager ≈ Senior PM
  CIO / CTO / CDO          ≈ Director

Output ONLY the JSON object.
"""

USER_PROMPT_TEMPLATE = """
## Candidate Profile
{profile}

## Job
Title: {title}
Company: {company}
Sector: {sector}
Location: {location}
Apply Link: {apply_url}

## Description
{description}
"""


class Scorer:
    def __init__(self, db: Database):
        self.db = db
        self.settings = self._load_settings()
        scoring = self.settings.get("scoring", {})
        self.cache_ttl_hours = scoring.get("cache_ttl_hrs", 24)
        self.max_description_words = scoring.get("max_description_words", 1500)

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GOOGLE_API_KEY not set. Get a free key at https://aistudio.google.com/"
            )
        genai.configure(api_key=api_key)
        self.model_name = "gemini-1.5-flash"
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=SYSTEM_PROMPT,
        )

    def _load_settings(self) -> dict:
        path = Path("config/settings.toml")
        if not path.exists():
            return {}
        with path.open("rb") as f:
            return tomllib.load(f)

    def get_profile(self) -> str:
        path = Path("config/profile.md")
        if not path.exists():
            return "Candidate seeking Staff PM / Director roles in Bay Area."
        with path.open("r", encoding="utf-8") as f:
            return f.read()

    def score_job(self, job: dict) -> Optional[dict]:
        job_id = job["id"]

        # Skip if scored recently
        existing = list(self.db.query(
            """SELECT * FROM scores
               WHERE job_id = ?
                 AND scored_at > ?
               ORDER BY scored_at DESC LIMIT 1""",
            [job_id, (datetime.utcnow() - timedelta(hours=self.cache_ttl_hours)).isoformat()]
        ))
        if existing:
            return existing[0]

        # Pre-filter before hitting the API
        if not pre_filter_job(job["title"], job.get("description_md", "") or ""):
            return None

        profile = self.get_profile()
        description = truncate_words(job.get("description_md", "") or "", self.max_description_words)

        prompt = USER_PROMPT_TEMPLATE.format(
            profile=profile,
            title=job["title"],
            company=job.get("company_name", ""),
            sector=job.get("sector", ""),
            location=job.get("location", ""),
            apply_url=job.get("apply_url", ""),
            description=description,
        )

        try:
            response = self.model.generate_content(prompt)
            text = response.text

            # Strip markdown fences if Gemini wraps the output
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            score_data = json.loads(text)

            record = {
                "job_id": job_id,
                "score": int(score_data["score"]),
                "reasoning": score_data.get("reasoning", ""),
                "gaps": json.dumps(score_data.get("gaps", [])),
                "recommend": 1 if score_data["recommendation"] == "apply" else 0,
                "recommendation_label": score_data["recommendation"],
                "model": self.model_name,
                "scored_at": datetime.utcnow().isoformat(),
            }
            insert_score(self.db, record)
            return record

        except (json.JSONDecodeError, KeyError, Exception) as e:
            print(f"[scorer] Failed for job {job_id}: {e}")
            return None


def score_all_jobs(db: Database) -> int:
    scorer = Scorer(db)
    jobs = list(db.query(
        """SELECT j.* FROM jobs j
           LEFT JOIN scores s ON j.id = s.job_id
           WHERE s.id IS NULL
              OR s.scored_at < ?""",
        [(datetime.utcnow() - timedelta(hours=scorer.cache_ttl_hours)).isoformat()]
    ))

    scored_count = 0
    for job in jobs:
        result = scorer.score_job(job)
        if result:
            scored_count += 1
        time.sleep(1.0)  # Gemini free tier rate limit buffer

    return scored_count
```

---

## A4. TUI — Launch Command

The Textual app is invoked via `jobseer ui`. The app title must reflect the new name.

In `jobsearch/tui/app.py`:

```python
from textual.app import App

class JobSeerApp(App):
    """JobSeer — AI-powered local job pipeline."""

    CSS_PATH = "app.tcss"
    TITLE = "JobSeer"
    SUB_TITLE = "AI-powered job pipeline · Santa Clara, CA"
    BINDINGS = [
        ("f", "fetch", "Fetch jobs"),
        ("p", "push_screen('pipeline')", "Pipeline"),
        ("q", "quit", "Quit"),
        ("?", "push_screen('help')", "Help"),
    ]
```

The CLI command in `jobsearch/cli.py`:

```python
import typer
from jobsearch.tui.app import JobSeerApp

app = typer.Typer(name="jobseer", help="JobSeer — AI-powered local job pipeline")

@app.command()
def ui():
    """Launch the JobSeer TUI."""
    JobSeerApp().run()

@app.command()
def fetch(score: bool = typer.Option(False, "--score", help="Score after fetching")):
    """Ingest jobs from all active companies."""
    ...

@app.command()
def score():
    """Score all unscored jobs with Gemini."""
    ...

@app.command()
def discover():
    """Run company discovery (private + government seed)."""
    ...

@app.command()
def stats():
    """Print pipeline summary."""
    ...
```

---

## A5. Updated Token Cost Strategy

The Batch API section in the main guide (Phase 4, Section 6.1) no longer applies.
Gemini free tier does not support batching. Replace with:

1. **Model:** `gemini-1.5-flash` — free tier, sufficient for daily runs
2. **Sequential scoring with 1s sleep** — stays within Gemini free tier rate limits
3. **Pre-filter before API calls** — unchanged from main guide, still the highest
   impact optimization
4. **Truncate descriptions at 1,500 words** — unchanged
5. **Cache TTL check** — skip jobs scored within `cache_ttl_hrs` (default 24h)

If volume grows beyond free tier limits (15 RPM / 1M tokens/day on Gemini 1.5 Flash),
upgrade path is: `gemini-1.5-flash` → `gemini-1.5-flash-8b` (higher free quota)
→ paid Gemini tier → revisit Anthropic Haiku Batch API.

---

## A6. Revised Testing Checklist (Scoring Only)

Replace the scoring section of the main checklist with:

- [ ] `GOOGLE_API_KEY` missing → `RuntimeError` with helpful message (not silent fail)?
- [ ] SQL queries in `score_job` use `?` parameterization, not f-strings?
- [ ] `recommend` column stores only `0` or `1` (INTEGER)?
- [ ] `recommendation_label` column stores `"apply"`, `"consider"`, or `"skip"`?
- [ ] `cache_ttl_hours` reads from `config/settings.toml`, not hardcoded?
- [ ] `max_description_words` reads from `config/settings.toml`, not hardcoded?
- [ ] 1-second sleep between Gemini calls present in `score_all_jobs()`?
- [ ] Gemini returning markdown-wrapped JSON is handled (strip ` ```json ` fences)?
- [ ] `jobseer ui` launches the Textual app correctly?
- [ ] TUI title bar displays "JobSeer"?

---

*Addendum — April 2026*
*Scoring: Google Gemini 1.5 Flash (free tier) · CLI command: jobseer*

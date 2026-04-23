# JobSearch — AI-Powered Local Job Pipeline
## Build Guide for Windsurf / Codex

> **How to use this file**
> Put this in the project root as `CLAUDE.md`.
> Windsurf should use it as the build contract and execute one phase at a time.
> Codex should be used mainly for critique, debugging, and narrow fixes, not for drafting large modules from scratch.

---

## 0. Operating Mode

The main goal of this guide is to reduce token waste.

### Windsurf should do the bulk of implementation work

Windsurf should:
- Create files and folder structure
- Write straightforward Python modules from the specs below
- Add tests for each completed phase
- Run the project locally after each phase
- Fix lint/test failures before moving on
- Use existing libraries directly instead of asking for custom abstractions first
- Stop after each phase and confirm acceptance criteria are met

### Use Codex only for high-leverage tasks

Ask Codex for:
- Critique of an implementation after Windsurf has written it
- Debugging specific failing behavior
- Refactoring when a phase becomes messy
- Reviewing schema, prompt design, scraping edge cases, or TUI behavior
- Small surgical patches where a second set of eyes is useful

Do not ask Codex to:
- Re-state this whole build plan
- Generate the entire repository in one shot
- Speculate about architecture already decided here
- Rebuild boilerplate that Windsurf can write directly

### Required workflow

For every phase, Windsurf should:
1. Read only the relevant section of this file
2. Implement the phase
3. Run the listed validation steps
4. Record any deviations in comments or README notes
5. Move on only after the phase is runnable

If blocked:
- First inspect the relevant library docs or error output
- Then make the smallest local fix
- Only then ask Codex a narrow question with file path, error, and attempted fix

---

## 1. Core Constraints

These rules apply to every module and should not be overridden:

1. Every job record must have an `apply_url`.
2. `apply_url` must be absolute before storage.
3. Aggregators are not primary sources. Prefer ATS APIs and employer career pages.
4. Claude is used for scoring only, not extraction.
5. HTTP calls must be rate-limited per domain. Default: `500ms`.
6. Each phase must end in runnable code plus tests or a manual verification note.

Important clarification:
- If a direct apply/posting link is unavailable, store the career page root in `apply_url`, set `apply_url_resolved = false`, and preserve the original page in `source_url`.
- Jobs should only be skipped when no valid absolute fallback URL exists at all.

---

## 2. Repository Structure

```text
jobsearch/
├── CLAUDE.md
├── pyproject.toml
├── .env.example
├── README.md
├── config/
│   ├── profile.md
│   ├── gov_entities.json
│   └── settings.toml
├── jobsearch/
│   ├── __init__.py
│   ├── cli.py
│   ├── db.py
│   ├── models.py
│   ├── utils/
│   │   ├── http.py
│   │   ├── text.py
│   │   └── urls.py
│   ├── discovery/
│   │   ├── private.py
│   │   └── government.py
│   ├── enrichment/
│   │   └── ats_detector.py
│   ├── ingestion/
│   │   ├── base.py
│   │   ├── greenhouse.py
│   │   ├── lever.py
│   │   ├── ashby.py
│   │   ├── workday.py
│   │   ├── neogov.py
│   │   ├── usajobs.py
│   │   ├── calcareers.py
│   │   └── firecrawl.py
│   ├── scoring/
│   │   └── scorer.py
│   └── tui/
│       ├── app.py
│       ├── screens/
│       │   ├── dashboard.py
│       │   ├── detail.py
│       │   └── pipeline.py
│       └── widgets/
│           ├── job_table.py
│           └── score_badge.py
├── tests/
│   ├── test_db.py
│   ├── test_base_ingester.py
│   ├── test_greenhouse.py
│   └── ...
└── scripts/
    └── fetch.sh
```

Notes for Windsurf:
- Create this structure directly.
- Add placeholder modules when later phases depend on imports.
- Do not ask Codex to scaffold this tree unless something unusual breaks.

---

## 3. Phase 0 — Bootstrap

### Deliverables

Windsurf should create:
- `pyproject.toml`
- `.env.example`
- `config/settings.toml`
- package folders with `__init__.py`
- a minimal `README.md`

### Dependencies

```bash
uv init jobsearch
cd jobsearch

uv add textual rich typer anthropic httpx beautifulsoup4 \
  sqlite-utils pydantic python-dotenv tomli pyperclip

uv add playwright playwright-stealth
uv add --dev pytest pytest-asyncio ruff

uv run playwright install chromium
```

### `.env.example`

```bash
ANTHROPIC_API_KEY=sk-ant-...

# USAJOBS
USAJOBS_API_KEY=
USAJOBS_EMAIL=

# Optional discovery / fallback APIs
CRUNCHBASE_API_KEY=
GOOGLE_PLACES_API_KEY=
FIRECRAWL_API_KEY=
```

### `config/settings.toml`

```toml
[discovery]
latitude = 37.3541
longitude = -121.9552
radius_miles = 35

[scoring]
threshold = 70
model = "claude-haiku-4-5-20251001"
batch_size = 20
cache_ttl_hrs = 24
max_description_words = 1500

[ingestion]
rate_limit_ms = 500
timeout_seconds = 30
user_agent = "jobsearch/0.1"
```

### Acceptance criteria

- `uv run python -c "import jobsearch"` succeeds
- `uv run ruff check .` succeeds
- `uv run pytest` runs even if only placeholder tests exist

---

## 4. Phase 1 — Database Schema

**File:** `jobsearch/db.py`

Use `sqlite-utils` plus raw SQL where convenient. Do not introduce an ORM.

### Windsurf should implement

- DB path configuration
- `init_db()`
- schema creation
- indexes
- helper insert/upsert methods for companies, jobs, scores, and skip log
- a small query helper used later by CLI/TUI

### Required schema

```python
SCHEMA = """
CREATE TABLE IF NOT EXISTS companies (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    domain          TEXT,
    hq_lat          REAL,
    hq_lng          REAL,
    distance_miles  REAL,
    sector          TEXT NOT NULL,
    ats_type        TEXT,
    ats_slug        TEXT,
    career_url      TEXT,
    last_crawled_at TEXT,
    active          INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_domain
ON companies(domain)
WHERE domain IS NOT NULL;

CREATE TABLE IF NOT EXISTS jobs (
    id                  TEXT PRIMARY KEY,
    company_id          TEXT NOT NULL REFERENCES companies(id),
    external_id         TEXT NOT NULL,
    title               TEXT NOT NULL,
    department          TEXT,
    location            TEXT,
    remote              INTEGER DEFAULT 0,
    salary_min          REAL,
    salary_max          REAL,
    posted_at           TEXT,
    description_md      TEXT,
    apply_url           TEXT NOT NULL,
    apply_url_resolved  INTEGER DEFAULT 1,
    source_url          TEXT,
    sector              TEXT,
    seen                INTEGER DEFAULT 0,
    applied             INTEGER DEFAULT 0,
    status              TEXT DEFAULT 'new',
    fetched_at          TEXT NOT NULL,
    UNIQUE(company_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at);

CREATE TABLE IF NOT EXISTS scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id      TEXT NOT NULL REFERENCES jobs(id),
    score       INTEGER NOT NULL,
    reasoning   TEXT,
    gaps        TEXT,
    recommend   INTEGER,
    model       TEXT,
    scored_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_job_id ON scores(job_id);

CREATE TABLE IF NOT EXISTS skip_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  TEXT,
    external_id TEXT,
    reason      TEXT,
    raw_url     TEXT,
    logged_at   TEXT NOT NULL
);
"""
```

### Acceptance criteria

- A new SQLite DB initializes cleanly
- Duplicate `(company_id, external_id)` inserts are rejected or upserted intentionally
- `apply_url` cannot be null

### Tests Windsurf should write

- schema init test
- `apply_url` constraint test
- duplicate job behavior test
- domain uniqueness behavior test

Ask Codex only if:
- schema choices conflict with later TUI/query needs
- you need help choosing between upsert behaviors

---

## 5. Phase 2 — Models and Shared Utilities

### Windsurf should implement

`jobsearch/models.py`
- `Company`
- `Job`
- `Score`

`jobsearch/utils/urls.py`
- absolute URL validation
- `urljoin` helpers
- domain normalization

`jobsearch/utils/text.py`
- markdown cleanup
- description truncation by word count
- cheap pre-filter helpers for scoring

`jobsearch/utils/http.py`
- a shared `httpx` client factory
- timeout handling
- basic retry policy for transient failures
- per-domain rate limiting helper

### Guidance

- Use Pydantic for validation at module boundaries
- Keep models thin; DB remains the source of truth
- Centralize URL validation once instead of duplicating it in every ingester

### Acceptance criteria

- Shared helpers are imported by ingesters instead of reimplemented
- Truncation and domain normalization have unit tests

---

## 6. Phase 3 — Ingestion Base Contract

**File:** `jobsearch/ingestion/base.py`

### Windsurf should implement

- a `BaseIngester` ABC
- shared `validate_apply_url()`
- shared job normalization helper
- shared skip-log helper

### Reference shape

```python
from abc import ABC, abstractmethod
from urllib.parse import urlparse

class BaseIngester(ABC):
    def validate_apply_url(
        self, url: str | None, fallback: str | None = None
    ) -> tuple[str, bool]:
        if url and self._valid(url):
            return url, True
        if fallback and self._valid(fallback):
            return fallback, False
        raise ValueError(f"No resolvable apply_url. tried={url!r} fallback={fallback!r}")

    def _valid(self, url: str) -> bool:
        try:
            p = urlparse(url)
            return p.scheme in ("http", "https") and bool(p.netloc)
        except Exception:
            return False

    @abstractmethod
    def fetch(self, company) -> list:
        ...
```

### Acceptance criteria

- All ingesters return normalized `Job` objects or dicts with the same shape
- Missing `apply_url` paths are logged consistently

### Tests Windsurf should write

- direct URL accepted
- fallback URL accepted
- relative or empty URL rejected

---

## 7. Phase 4 — Known ATS Ingesters

Build the easiest sources first. Windsurf should implement these in order and verify each one before adding the next.

### 4A. Greenhouse — `jobsearch/ingestion/greenhouse.py`

```python
# Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
# apply_url source: item["absolute_url"]
```

Windsurf should:
- call the public endpoint
- map records into the shared job shape
- use `absolute_url` directly as `apply_url`

### 4B. Lever — `jobsearch/ingestion/lever.py`

```python
# Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
# apply_url source: posting["hostedUrl"]
```

### 4C. Ashby — `jobsearch/ingestion/ashby.py`

```python
# Endpoint: https://api.ashbyhq.com/posting-api/job-board/{slug}
# apply_url source: job["jobUrl"]
```

### Per-ingester acceptance criteria

- network fetch succeeds for at least one real company slug
- returned jobs include absolute `apply_url`
- duplicate jobs do not create duplicate DB rows
- basic parser tests exist with fixture payloads

Ask Codex only if:
- one ATS response shape is unexpectedly inconsistent
- you need help designing a robust parser for sparse fields

---

## 8. Phase 5 — Government and Special Sources

### 5A. NEOGOV — `jobsearch/ingestion/neogov.py`

```python
# Job list: GET https://www.governmentjobs.com/careers/{slug}?format=json
# Fallback: parse HTML job cards if JSON is unavailable
# apply_url: https://www.governmentjobs.com/careers/{slug}/jobs/{job_id}
```

### 5B. USAJOBS — `jobsearch/ingestion/usajobs.py`

```python
# Endpoint: https://data.usajobs.gov/api/search
# apply_url priority:
# 1. MatchedObjectDescriptor.ApplyURI[0]
# 2. MatchedObjectDescriptor.PositionURI
```

Keyword sweeps:
- `product manager`
- `program manager`
- `digital services`
- `innovation manager`
- `technology director`
- `IT manager`
- `chief information`
- `data services`

### 5C. CalCareers — `jobsearch/ingestion/calcareers.py`

```python
# Search URL:
# https://www.calcareers.ca.gov/CalHRPublic/Search/AdvancedJobSearch.aspx
# apply_url pattern:
# https://www.calcareers.ca.gov/CalHRPublic/Jobs/JobPosting.aspx?JobControlId={id}
```

### 5D. Workday — `jobsearch/ingestion/workday.py`

```python
# Use Playwright
# Extract job links from listing pages
# Convert hrefs to absolute URLs with urljoin
```

Workday guidance:
- Build this later, after the simpler sources work
- Keep the first version narrow and reliable
- Do not ask Codex to invent a generic browser automation framework here

### 5E. Firecrawl fallback — `jobsearch/ingestion/firecrawl.py`

Use only for `ats_type == "unknown"`.

If Firecrawl does not return a valid absolute `apply_url`:
- write to `skip_log`
- do not insert the job

### Acceptance criteria

- Each source has at least one parser fixture test
- Fallback behavior is explicit and logged
- No source inserts a job with invalid `apply_url`

---

## 9. Phase 6 — Company Discovery

### 6A. ATS fingerprinting — `jobsearch/enrichment/ats_detector.py`

```python
CAREER_URL_PATTERNS = [
    "https://{domain}/careers",
    "https://{domain}/jobs",
    "https://careers.{domain}",
    "https://jobs.{domain}",
]

ATS_SIGNATURES = {
    "greenhouse": ["boards.greenhouse.io", "boards-api.greenhouse.io"],
    "lever": ["jobs.lever.co", "api.lever.co"],
    "ashby": ["jobs.ashbyhq.com"],
    "workday": ["myworkdayjobs.com", "workday.com/en-US"],
    "smartrecruiters": ["jobs.smartrecruiters.com"],
    "icims": ["careers.icims.com"],
    "taleo": ["taleo.net"],
    "rippling": ["ats.rippling.com"],
    "neogov": ["governmentjobs.com/careers"],
}
```

Windsurf should:
- probe candidate career URLs
- detect ATS type
- extract ATS slug where possible
- persist results back to `companies`

### 6B. Private discovery — `jobsearch/discovery/private.py`

Use sources in this order:

1. Crunchbase Basic API
2. Google Places API
3. BuiltIn SF scraper
4. YC Directory

Deduplicate by normalized domain.

### 6C. Government seed — `config/gov_entities.json`

Seed this file directly into `companies`. Keep it editable and human-readable.

```json
[
  {"name":"City of San Jose","sector":"municipal","ats_type":"neogov","ats_slug":"cityofsanjose","career_url":"https://www.governmentjobs.com/careers/cityofsanjose"},
  {"name":"City of Santa Clara","sector":"municipal","ats_type":"neogov","ats_slug":"santaclaracity","career_url":"https://www.governmentjobs.com/careers/santaclaracity"},
  {"name":"City of Sunnyvale","sector":"municipal","ats_type":"neogov","ats_slug":"sunnyvale","career_url":"https://www.governmentjobs.com/careers/sunnyvale"},
  {"name":"City of Mountain View","sector":"municipal","ats_type":"neogov","ats_slug":"mountainview","career_url":"https://www.governmentjobs.com/careers/mountainview"},
  {"name":"City of Palo Alto","sector":"municipal","ats_type":"neogov","ats_slug":"paloalto","career_url":"https://www.governmentjobs.com/careers/paloalto"},
  {"name":"City of Fremont","sector":"municipal","ats_type":"neogov","ats_slug":"cityoffremont","career_url":"https://www.governmentjobs.com/careers/cityoffremont"},
  {"name":"City of Oakland","sector":"municipal","ats_type":"neogov","ats_slug":"oaklandca","career_url":"https://www.governmentjobs.com/careers/oaklandca"},
  {"name":"Santa Clara County","sector":"county","ats_type":"neogov","ats_slug":"scccounty","career_url":"https://www.governmentjobs.com/careers/scccounty"},
  {"name":"Alameda County","sector":"county","ats_type":"neogov","ats_slug":"alamedacountyhr","career_url":"https://www.governmentjobs.com/careers/alamedacountyhr"},
  {"name":"VTA","sector":"special_district","ats_type":"neogov","ats_slug":"vta","career_url":"https://www.governmentjobs.com/careers/vta"},
  {"name":"Valley Water","sector":"special_district","ats_type":"neogov","ats_slug":"valleywater","career_url":"https://www.governmentjobs.com/careers/valleywater"},
  {"name":"BART","sector":"special_district","ats_type":"neogov","ats_slug":"bart","career_url":"https://www.governmentjobs.com/careers/bart"},
  {"name":"Caltrain","sector":"special_district","ats_type":"neogov","ats_slug":"caltrain","career_url":"https://www.governmentjobs.com/careers/caltrain"},
  {"name":"State of California","sector":"state","ats_type":"calcareers","ats_slug":null,"career_url":"https://www.calcareers.ca.gov"},
  {"name":"Federal - Bay Area","sector":"federal","ats_type":"usajobs","ats_slug":null,"career_url":"https://www.usajobs.gov"}
]
```

### Acceptance criteria

- domain dedupe works
- seed file loads cleanly
- ATS detection updates stored company rows

---

## 10. Phase 7 — AI Scoring

Claude should be used only after extraction and filtering are working.

### Token strategy

1. Use `claude-haiku-4-5-20251001`
2. Use Anthropic Batch API
3. Cache the candidate profile prompt block
4. Pre-filter obviously irrelevant jobs before scoring
5. Truncate descriptions to `1500` words

### `config/profile.md`

Store the candidate profile in a standalone markdown file so it can be edited without changing code.

### Scoring prompt contract

```python
SYSTEM_PROMPT = """
You are a precise job-fit evaluator. Given a job description and a candidate profile,
return ONLY valid JSON.

Output schema:
{
  "score": <integer 0-100>,
  "recommendation": <"apply" | "consider" | "skip">,
  "reasoning": <string, max 80 words>,
  "gaps": [<string>],
  "title_equivalence": <string>
}
"""
```

Windsurf should:
- implement the scorer
- persist score output to `scores`
- skip recently scored jobs within cache TTL
- add a cheap local pre-filter before sending jobs to Claude

Ask Codex only if:
- the prompt output becomes inconsistent
- score calibration feels off after real results

---

## 11. Phase 8 — TUI

Use Textual. Do not use curses, urwid, or prompt_toolkit.

### Windsurf should implement in this order

1. Dashboard
2. Detail screen
3. Pipeline screen

### Non-negotiable behavior

- The apply URL block is always visible on the detail screen
- `o` opens the URL
- `c` copies the URL
- skipped jobs are hidden from the default main view

### Apply URL display rules

If `apply_url_resolved = True`:
- label: `Apply directly:`

If `apply_url_resolved = False`:
- label: `Career page (direct link unavailable):`

If URL is unexpectedly missing:
- show a defensive warning and company careers fallback text

### Keyboard shortcuts

| Key | Action |
|---|---|
| `f` | Run fetch + score |
| `Enter` | Open detail screen |
| `o` | Open `apply_url` in browser |
| `c` | Copy `apply_url` |
| `a` | Mark applied |
| `s` | Skip job |
| `p` | Open pipeline |
| `1` | Private only |
| `2` | Municipal / county only |
| `3` | State / federal only |
| `0` | Clear sector filter |
| `q` | Quit |
| `?` | Help overlay |

### Acceptance criteria

- dashboard loads from live DB data
- detail view always shows the URL block
- at least one manual smoke test confirms browser open and clipboard copy

Ask Codex only if:
- Textual layout gets tangled
- keyboard event handling becomes confusing

---

## 12. Phase 9 — CLI and Automation

### CLI commands

```bash
jobsearch discover
jobsearch enrich
jobsearch fetch
jobsearch score
jobsearch fetch --score
jobsearch ui
jobsearch stats
```

### `pyproject.toml`

```toml
[project.scripts]
jobsearch = "jobsearch.cli:app"
```

### `scripts/fetch.sh`

```bash
#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env
uv run jobsearch fetch --score
echo "Completed: $(date)"
```

### Acceptance criteria

- each command runs without import errors
- `jobsearch stats` prints useful counts
- automation script works from cron-compatible shell execution

---

## 13. Libraries to Use

Use these instead of rebuilding from scratch:

| What | Use This | Notes |
|---|---|---|
| TUI | `textual` | Required |
| DB | `sqlite-utils` | Use with raw SQL where useful |
| CLI | `typer` | Do not use argparse |
| HTTP | `httpx` | Prefer over `requests` |
| Browser automation | `playwright` + `playwright-stealth` | For Workday |
| HTML parsing | `beautifulsoup4` | For scraper fallbacks |
| Clipboard | `pyperclip` | Cross-platform |

Do not use:
- JobSpy as primary ingestion
- SQLAlchemy or another ORM
- speculative framework layers before a direct implementation exists

---

## 14. Recommended Build Order

Windsurf should follow this exact sequence:

1. Bootstrap
2. Schema
3. Models and shared utils
4. Base ingester
5. Greenhouse
6. Lever
7. Ashby
8. Government seed loader
9. USAJOBS
10. NEOGOV
11. ATS fingerprinter
12. Private discovery
13. Workday
14. CalCareers
15. Firecrawl fallback
16. Claude scoring
17. TUI dashboard
18. TUI detail
19. TUI pipeline
20. CLI wiring
21. Cron script and README cleanup

Do not skip ahead unless a dependency is truly blocked.

---

## 15. Testing Checklist

### apply_url validation

- [ ] Greenhouse uses `absolute_url`
- [ ] Lever uses `hostedUrl`
- [ ] USAJOBS falls back from `ApplyURI[0]` to `PositionURI`
- [ ] NEOGOV constructs a valid posting URL
- [ ] Workday resolves relative hrefs to absolute URLs
- [ ] Firecrawl skips jobs with missing `apply_url`
- [ ] DB rejects null `apply_url`
- [ ] TUI detail always shows the apply URL block
- [ ] browser-open action uses the expected URL
- [ ] clipboard action copies the expected URL

### discovery

- [ ] private discovery respects radius filtering
- [ ] normalized-domain dedupe works
- [ ] government seed loads all entities

### scoring

- [ ] batch scoring writes results to DB
- [ ] prompt cache hits are observable on repeat run
- [ ] pre-filter removes obviously irrelevant jobs

### CLI / TUI

- [ ] CLI commands run without crashing
- [ ] TUI dashboard renders jobs from DB
- [ ] applied/skipped state changes persist

---

## 16. When Windsurf Should Pause and Ask Codex

Pause and ask Codex only if one of these is true:

- a source API response shape is ambiguous
- a parser works for one site but fails for the same ATS elsewhere
- the DB schema needs to change after multiple phases already depend on it
- the Claude scoring prompt produces unstable JSON
- a Textual behavior is awkward enough to merit redesign
- a bug persists after one local debugging pass

Good Codex request:
- "Review [jobsearch/ingestion/usajobs.py](/Users/corbin/Hal9000/jobsearch/ingestion/usajobs.py) for fallback logic. `ApplyURI` is often empty. Here is the failing payload and test."

Bad Codex request:
- "Build the whole USAJOBS integration for me."

---

## 17. Definition of Done

A phase is done only when:

- code exists
- imports resolve
- tests pass, or a manual verification note explains why automation is deferred
- the next phase can start without rethinking the previous one

If Windsurf finishes a phase but still needs architectural clarification, the phase is not done.

---

*Stack: Python 3.11, Textual, SQLite, Claude Haiku, Typer, uv*
*Last updated: April 21, 2026*

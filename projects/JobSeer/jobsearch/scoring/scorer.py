import json
import os  # Re-add os import
import time

try:
    import tomllib
except ImportError:
    import tomli as tomllib
from datetime import UTC, datetime
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel
from sqlite_utils import Database

from jobsearch import PROJECT_ROOT
from jobsearch.db import insert_score
from jobsearch.utils.text import pre_filter_job, truncate_words

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


class ScoreResponse(BaseModel):
    score: int
    recommendation: Literal["apply", "consider", "skip"]
    reasoning: str = ""
    gaps: list[str] = []
    title_equivalence: str = ""


def utcnow_iso() -> str:
    return datetime.now(UTC).isoformat()


def resolve_project_root():
    from jobsearch import resolve_project_root as _resolve_project_root

    return _resolve_project_root()


class Scorer:
    def __init__(self, db: Database):
        self.db = db
        self.settings = self._load_settings()
        scoring = self.settings.get("scoring", {})
        self.cache_ttl_hours = scoring.get("cache_ttl_hrs", 24)
        self.max_description_words = scoring.get("max_description_words", 1500)
        self.model_name = self._resolve_model_name(scoring.get("model"))

        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GOOGLE_API_KEY or GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/"
            )
        self.client = genai.Client(api_key=api_key)

    def _load_settings(self) -> dict:
        path = PROJECT_ROOT / "config" / "settings.toml"
        if not path.exists():
            return {}
        with path.open("rb") as f:
            return tomllib.load(f)

    def _resolve_model_name(self, configured_model: str | None) -> str:
        env_model = os.getenv("JOBSEER_SCORING_MODEL")
        candidate = env_model or configured_model or "gemini-2.5-flash"
        if candidate.startswith("gemini-"):
            return candidate
        return "gemini-2.5-flash"

    def get_profile(self) -> str:
        path = PROJECT_ROOT / "config" / "profile.md"
        if not path.exists():
            return "Candidate seeking Staff PM / Director roles in Bay Area."
        with path.open("r", encoding="utf-8") as f:
            return f.read()

    def score_job(self, job: dict, force: bool = False) -> dict | None:
        job_id = job["id"]

        if not force:
            # Skip if any score exists for this job (append-only)
            existing = list(
                self.db.query(
                    "SELECT id FROM scores WHERE job_id = ? ORDER BY scored_at DESC LIMIT 1",
                    [job_id],
                )
            )
            if existing:
                return None

        # Pre-filter before hitting the API
        if not pre_filter_job(job["title"], job.get("description_md", "") or ""):
            return None

        profile = self.get_profile()
        description = truncate_words(job.get("description_md", "") or "", self.max_description_words)

        # Get company name from joined query or dict
        company_name = job.get("company_name") or job.get("company_id", "Unknown")

        prompt = USER_PROMPT_TEMPLATE.format(
            profile=profile,
            title=job["title"],
            company=company_name,
            sector=job.get("sector", ""),
            location=job.get("location", ""),
            apply_url=job.get("apply_url", ""),
            description=description,
        )

        try:
            # Use `generate_content` for model interaction
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ScoreResponse,
                ),
            )

            # The API might return content directly as parsed if schema is used, or as text.
            if response.parsed:
                score_data = response.parsed.model_dump()
            else:
                score_data = json.loads(response.text)

            record = {
                "job_id": job_id,
                "score": int(score_data["score"]),
                "reasoning": score_data.get("reasoning", ""),
                "gaps": json.dumps(score_data.get("gaps", [])),
                "recommend": 1 if score_data["recommendation"] == "apply" else 0,
                "recommendation_label": score_data["recommendation"],
                "model": self.model_name,
                "scored_at": utcnow_iso(),
            }
            insert_score(self.db, record)
            return record

        except (json.JSONDecodeError, KeyError, Exception) as e:
            print(f"[scorer] Failed for job {job_id}: {e}")
            return None


def score_all_jobs(db: Database, force: bool = False) -> int:
    scorer = Scorer(db)
    query = """
        SELECT j.*, c.name as company_name
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
    """
    params: list[str] = []
    if not force:
        # Only select jobs that have NO scores (append-only logic)
        query += """
        WHERE NOT EXISTS (
            SELECT 1 FROM scores s WHERE s.job_id = j.id
        )
        """
    # If force is true, we select all jobs and re-score_job will handle it

    jobs = list(db.query(query, params))

    scored_count = 0
    for job in jobs:
        result = scorer.score_job(job, force=force)
        if result:
            scored_count += 1
        time.sleep(1.0)  # Gemini free tier rate limit buffer

    return scored_count


def score_all_new_jobs(db: Database, force: bool = False) -> int:
    """Backward-compatible alias for older callers."""
    return score_all_jobs(db, force=force)

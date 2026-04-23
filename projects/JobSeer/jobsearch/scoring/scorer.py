import os
import json
import time
try:
    import tomllib
except ImportError:
    import tomli as tomllib
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel
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


class ScoreResponse(BaseModel):
    score: int
    recommendation: Literal["apply", "consider", "skip"]
    reasoning: str = ""
    gaps: list[str] = []
    title_equivalence: str = ""


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Scorer:
    def __init__(self, db: Database):
        self.db = db
        self.settings = self._load_settings()
        scoring = self.settings.get("scoring", {})
        self.cache_ttl_hours = scoring.get("cache_ttl_hrs", 24)
        self.max_description_words = scoring.get("max_description_words", 1500)

        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GOOGLE_API_KEY or GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/"
            )
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-1.5-flash"

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

        # Skip if scored recently - ALWAYS use parameterized queries
        existing = list(self.db.query(
            """SELECT * FROM scores
               WHERE job_id = ?
                 AND scored_at > ?
               ORDER BY scored_at DESC LIMIT 1""",
            [job_id, (datetime.now(timezone.utc) - timedelta(hours=self.cache_ttl_hours)).isoformat()]
        ))
        if existing:
            return existing[0]

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
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ScoreResponse,
                ),
            )

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


def score_all_jobs(db: Database) -> int:
    scorer = Scorer(db)
    # Re-fetch with join to get company name if needed
    jobs = list(db.query(
        """SELECT j.*, c.name as company_name FROM jobs j
           JOIN companies c ON j.company_id = c.id
           LEFT JOIN scores s ON j.id = s.job_id
           WHERE s.id IS NULL
              OR s.scored_at < ?""",
        [(datetime.now(timezone.utc) - timedelta(hours=scorer.cache_ttl_hours)).isoformat()]
    ))

    scored_count = 0
    for job in jobs:
        result = scorer.score_job(job)
        if result:
            scored_count += 1
        time.sleep(1.0)  # Gemini free tier rate limit buffer

    return scored_count


def score_all_new_jobs(db: Database) -> int:
    """Backward-compatible alias for older callers."""
    return score_all_jobs(db)

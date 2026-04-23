import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlite_utils import Database

DEFAULT_DB_PATH = Path("jobs.db")

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
    recommendation_label TEXT,
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

def get_db(path: Optional[Path] = None) -> Database:
    """Get a connection to the SQLite database."""
    db_path = path or DEFAULT_DB_PATH
    return Database(str(db_path))

def init_db(path: Optional[Path] = None):
    """Initialize the database with the schema."""
    db = get_db(path)
    db.conn.executescript(SCHEMA)
    db.conn.commit()

def upsert_company(db: Database, company_data: Dict[str, Any]):
    """Upsert a company into the database."""
    db["companies"].insert(company_data, pk="id", replace=True)
    db.conn.commit()

def upsert_job(db: Database, job_data: Dict[str, Any]):
    """Upsert a job into the database."""
    # Ensure apply_url is present as per constraints
    if not job_data.get("apply_url"):
        raise ValueError("apply_url is required for job records")
    
    if "fetched_at" not in job_data:
        job_data["fetched_at"] = datetime.utcnow().isoformat()
        
    db["jobs"].insert(job_data, pk="id", replace=True)
    db.conn.commit()

def insert_score(db: Database, score_data: Dict[str, Any]):
    """Insert a score for a job."""
    if "scored_at" not in score_data:
        score_data["scored_at"] = datetime.utcnow().isoformat()
    db["scores"].insert(score_data)
    db.conn.commit()

def log_skip(db: Database, skip_data: Dict[str, Any]):
    """Log a skipped job/company."""
    if "logged_at" not in skip_data:
        skip_data["logged_at"] = datetime.utcnow().isoformat()
    db["skip_log"].insert(skip_data)
    db.conn.commit()

def get_job_by_id(db: Database, job_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single job by its ID."""
    try:
        return db["jobs"].get(job_id)
    except Exception:
        return None

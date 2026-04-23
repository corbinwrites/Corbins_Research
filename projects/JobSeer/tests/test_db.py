import pytest
from pathlib import Path
import sqlite3
from jobsearch.db import init_db, get_db, upsert_company, upsert_job
from sqlite_utils import Database

@pytest.fixture
def temp_db(tmp_path):
    db_path = tmp_path / "test_jobs.db"
    init_db(db_path)
    return get_db(db_path)

def test_init_db(temp_db):
    assert "companies" in temp_db.table_names()
    assert "jobs" in temp_db.table_names()
    assert "scores" in temp_db.table_names()
    assert "skip_log" in temp_db.table_names()
    
    # Inspect schema
    companies_sql = temp_db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='companies'").fetchone()[0]
    print(f"\nCompanies Schema:\n{companies_sql}")
    jobs_sql = temp_db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='jobs'").fetchone()[0]
    print(f"\nJobs Schema:\n{jobs_sql}")

def test_apply_url_constraint(temp_db):
    # upsert_job should raise ValueError if apply_url is missing
    job_data = {
        "id": "job1",
        "company_id": "comp1",
        "external_id": "ext1",
        "title": "Developer",
        "fetched_at": "2026-04-21T00:00:00"
    }
    with pytest.raises(ValueError, match="apply_url is required"):
        upsert_job(temp_db, job_data)

def test_duplicate_job_upsert(temp_db):
    temp_db["companies"].insert({"id": "comp1", "name": "Test Co", "sector": "tech"})
    
    job_data = {
        "id": "job1",
        "company_id": "comp1",
        "external_id": "ext1",
        "title": "Developer",
        "apply_url": "https://example.com/apply",
        "fetched_at": "2026-04-21T00:00:00"
    }
    temp_db["jobs"].insert(job_data)
    
    # Update title via upsert
    job_data["title"] = "Senior Developer"
    upsert_job(temp_db, job_data)
    
    jobs = list(temp_db["jobs"].rows)
    assert len(jobs) == 1
    assert jobs[0]["title"] == "Senior Developer"

def test_domain_uniqueness(temp_db):
    upsert_company(temp_db, {"id": "comp1", "name": "Co 1", "domain": "example.com", "sector": "tech"})
    assert len(list(temp_db["companies"].rows)) == 1
    
    with pytest.raises(sqlite3.IntegrityError):
        temp_db.conn.execute("INSERT INTO companies (id, name, domain, sector) VALUES (?, ?, ?, ?)", 
                        ("comp2", "Co 2", "example.com", "tech"))

def test_job_unique_company_external_id(temp_db):
    upsert_company(temp_db, {"id": "comp1", "name": "Co 1", "sector": "tech"})
    
    job1 = {
        "id": "job1",
        "company_id": "comp1",
        "external_id": "ext1",
        "title": "Dev 1",
        "apply_url": "https://example.com/1",
        "fetched_at": "2026-04-21T00:00:00"
    }
    upsert_job(temp_db, job1)
    assert len(list(temp_db["jobs"].rows)) == 1
    
    job2 = {
        "id": "job2", # Different ID but same (company_id, external_id)
        "company_id": "comp1",
        "external_id": "ext1",
        "title": "Dev 2",
        "apply_url": "https://example.com/2",
        "fetched_at": "2026-04-21T00:00:00"
    }
    
    with pytest.raises(sqlite3.IntegrityError):
         temp_db["jobs"].insert(job2)

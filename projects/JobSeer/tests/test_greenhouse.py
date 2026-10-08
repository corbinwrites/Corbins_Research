import pytest
from jobsearch.ingestion.greenhouse import GreenhouseIngester
from jobsearch.db import init_db, get_db
import httpx
from unittest.mock import MagicMock, patch

@pytest.fixture
def db(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)
    return get_db(db_path)

def test_greenhouse_fetch(db):
    ingester = GreenhouseIngester(db)
    company = {
        "id": "test_co",
        "name": "Test Company",
        "ats_slug": "testslug",
        "sector": "tech",
        "career_url": "https://example.com/careers"
    }
    
    mock_response = {
        "jobs": [
            {
                "id": 12345,
                "title": "Software Engineer",
                "absolute_url": "https://boards.greenhouse.io/testslug/jobs/12345",
                "location": {"name": "Remote"},
                "departments": [{"name": "Engineering"}],
                "content": "Job description here"
            }
        ]
    }
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = MagicMock(spec=httpx.Response)
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_response
        
        jobs = ingester.fetch(company)
        
        assert len(jobs) == 1
        job = jobs[0]
        assert job["title"] == "Software Engineer"
        assert job["company_id"] == "test_co"
        assert job["external_id"] == "12345"
        assert job["apply_url"] == "https://boards.greenhouse.io/testslug/jobs/12345"
        assert job["location"] == "Remote"
        assert job["department"] == "Engineering"

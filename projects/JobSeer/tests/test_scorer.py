import json

import pytest

from jobsearch.db import get_db, init_db
from jobsearch.scoring import scorer as scorer_module
from jobsearch.scoring.scorer import Scorer


class DummyModels:
    def generate_content(self, **kwargs):
        return type(
            "Resp",
            (),
            {
                "parsed": scorer_module.ScoreResponse(
                    score=80,
                    recommendation="consider",
                    reasoning="Looks promising.",
                    gaps=["Need domain depth"],
                    title_equivalence="Staff PM",
                ),
                "text": json.dumps(
                    {
                        "score": 80,
                        "recommendation": "consider",
                        "reasoning": "Looks promising.",
                        "gaps": ["Need domain depth"],
                        "title_equivalence": "Staff PM",
                    }
                ),
            },
        )()


class DummyClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.models = DummyModels()


@pytest.fixture
def temp_db(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(db_path)
    return get_db(db_path)


def test_scorer_requires_google_api_key(temp_db, monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="GOOGLE_API_KEY or GEMINI_API_KEY"):
        Scorer(temp_db)


def test_get_profile_uses_default_when_profile_missing(temp_db, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)

    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    monkeypatch.setattr(scorer_module.genai, "Client", DummyClient)

    scorer = Scorer(temp_db)

    assert "Candidate seeking Staff PM / Director roles in Bay Area." == scorer.get_profile()


def test_score_job_stores_integer_recommend_and_label(temp_db, monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    monkeypatch.setattr(scorer_module.genai, "Client", DummyClient)

    scorer = Scorer(temp_db)
    result = scorer.score_job(
        {
            "id": "job1",
            "title": "Senior Product Manager",
            "company_name": "Example Co",
            "sector": "tech",
            "location": "Santa Clara, CA",
            "apply_url": "https://example.com/apply",
            "description_md": "Product manager role for AI platform strategy and product leadership.",
        }
    )

    assert result is not None
    assert result["recommend"] == 0
    assert result["recommendation_label"] == "consider"

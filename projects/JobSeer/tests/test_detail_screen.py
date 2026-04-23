from jobsearch.db import get_db, init_db, upsert_company, upsert_job
from jobsearch.tui.screens import detail as detail_module
from jobsearch.tui.screens.detail import DetailScreen


def test_action_applied_updates_job_status(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    init_db(db_path)
    db = get_db(db_path)

    upsert_company(db, {"id": "comp1", "name": "Test Co", "sector": "tech"})
    upsert_job(
        db,
        {
            "id": "job1",
            "company_id": "comp1",
            "external_id": "ext1",
            "title": "Developer",
            "apply_url": "https://example.com/apply",
            "fetched_at": "2026-04-21T00:00:00",
        },
    )

    monkeypatch.setattr(detail_module, "get_db", lambda: db)

    screen = DetailScreen("job1")
    screen.notify = lambda *args, **kwargs: None
    object.__setattr__(screen, "_app", type("AppStub", (), {"pop_screen": lambda self: None})())

    screen.action_applied()

    updated = db["jobs"].get("job1")
    assert updated["status"] == "applied"
    assert updated["applied"] == 1

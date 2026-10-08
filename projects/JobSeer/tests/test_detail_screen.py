from jobsearch.db import get_db, init_db, insert_score, upsert_company, upsert_job
from jobsearch.tui.screens import detail as detail_module
from jobsearch.tui.screens.detail import DetailScreen
from jobsearch.tui.screens.pipeline import PipelineScreen


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


def test_toggle_history_shows_score_history(tmp_path, monkeypatch):
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
    insert_score(
        db,
        {
            "job_id": "job1",
            "score": 80,
            "reasoning": "Strong fit",
            "gaps": '["Domain depth"]',
            "recommend": 1,
            "recommendation_label": "apply",
            "model": "gemini-2.5-flash",
            "scored_at": "2026-04-21T01:00:00",
        },
    )

    monkeypatch.setattr(detail_module, "get_db", lambda: db)

    screen = DetailScreen("job1")
    visible = {"display": False}
    history_section = type("HistorySection", (), {"display": False})()
    history_table = type("TableStub", (), {"clear": lambda self: None, "add_row": lambda self, *args, **kwargs: None})()
    history_detail = type("DetailStub", (), {"update": lambda self, value: visible.update({"detail": value})})()
    latest_score = type("LatestStub", (), {"update": lambda self, value: visible.update({"latest": value})})()
    info_label = type("InfoStub", (), {"update": lambda self, value: visible.update({"info": value})})()
    description = type("DescStub", (), {"update": lambda self, value: visible.update({"description": value})})()

    def fake_query_one(selector, _=None):
        return {
            "#score-history-section": history_section,
            "#score-history-table": history_table,
            "#score-history-detail": history_detail,
            "#latest-score": latest_score,
            "#job-info": info_label,
            "#job-description": description,
        }[selector]

    screen.query_one = fake_query_one
    screen.load_job()
    assert "Strong fit" in visible["latest"]

    screen.action_toggle_history()
    assert screen.show_history is True


def test_pipeline_status_update_moves_job(tmp_path, monkeypatch):
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
            "status": "reviewing",
            "fetched_at": "2026-04-21T00:00:00",
        },
    )

    monkeypatch.setattr("jobsearch.tui.screens.pipeline.get_db", lambda: db)

    screen = PipelineScreen()
    screen.notify = lambda *args, **kwargs: None
    reviewing_table = type(
        "TableStub",
        (),
        {
            "has_focus": True,
            "cursor_row": 0,
            "row_count": 1,
            "coordinate_to_cell_key": lambda self, coord: type(
                "CellKey", (), {"row_key": type("RowKey", (), {"value": "job1"})()}
            )(),
            "cursor_coordinate": object(),
        },
    )()
    other_table = type("OtherTable", (), {"has_focus": False, "row_count": 0, "focus": lambda self: None})()

    table_map = {
        "#pipeline-reviewing": reviewing_table,
        "#pipeline-applied": other_table,
        "#pipeline-interviewing": other_table,
        "#pipeline-offer": other_table,
        "#pipeline-rejected": other_table,
    }
    screen.query_one = lambda selector, _=None: table_map[selector]
    screen.refresh_data = lambda: None

    screen.action_set_applied()

    updated = db["jobs"].get("job1")
    assert updated["status"] == "applied"
    assert updated["applied"] == 1

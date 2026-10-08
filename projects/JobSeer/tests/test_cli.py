from pathlib import Path

from typer.testing import CliRunner

from jobsearch import cli

runner = CliRunner()


def test_discover_calls_seed(monkeypatch):
    called = {}

    monkeypatch.setattr(cli, "get_db", lambda: object())

    def fake_seed(db, path):
        called["db"] = db
        called["path"] = path

    monkeypatch.setattr(cli, "seed_gov_entities", fake_seed)

    cli.discover()

    assert called["path"] == Path("config/gov_entities.json")


def test_fetch_with_score_calls_scorer(monkeypatch):
    class DummyDB:
        def query(self, query, params=None):
            assert " AND id = ?" not in query or params
            return []

    called = {"scored": False}

    monkeypatch.setattr(cli, "get_db", lambda: DummyDB())
    monkeypatch.setattr(cli, "score_all_jobs", lambda db, force=False: called.__setitem__("scored", True) or 0)

    cli.fetch(score=True)

    assert called["scored"] is True


def test_fetch_uses_parameterized_company_filter(monkeypatch):
    captured = {}

    class DummyDB:
        def query(self, query, params=None):
            captured["query"] = query
            captured["params"] = params
            return []

    monkeypatch.setattr(cli, "get_db", lambda: DummyDB())

    cli.fetch(company_id="comp1")

    assert captured["query"].endswith("AND id = ?")
    assert captured["params"] == ["comp1"]


def test_score_force_passes_through(monkeypatch):
    called = {}

    monkeypatch.setattr(cli, "get_db", lambda: object())
    monkeypatch.setattr(cli, "score_all_jobs", lambda db, force=False: called.setdefault("force", force) or 0)

    cli.score(force=True)

    assert called["force"] is True


def test_no_subcommand_launches_ui(monkeypatch):
    launched = {"ui": False}

    monkeypatch.setattr(cli, "ui", lambda: launched.__setitem__("ui", True))

    result = runner.invoke(cli.app, [])

    assert result.exit_code == 0
    assert launched["ui"] is True


def test_fetch_all_companies_uses_passed_db(monkeypatch):
    captured = {}

    class DummyIngester:
        def fetch(self, company):
            return [
                {
                    "id": "job1",
                    "company_id": company["id"],
                    "external_id": "ext1",
                    "title": "PM",
                    "apply_url": "https://example.com",
                    "fetched_at": "2026-04-21T00:00:00",
                }
            ]

    class DummyDB:
        def query(self, query, params=None):
            captured["query"] = query
            captured["params"] = params
            return [{"id": "comp1", "name": "Test", "ats_type": "greenhouse", "active": 1}]

    inserted = []
    db = DummyDB()

    monkeypatch.setattr(cli, "get_ingester_for_type", lambda ats_type, passed_db: DummyIngester())
    monkeypatch.setattr(cli, "upsert_job", lambda passed_db, job_data: inserted.append((passed_db, job_data)))

    total = cli.fetch_all_companies(db)

    assert total == 1
    assert inserted[0][0] is db


def test_export_command_calls_exporter(monkeypatch):
    called = {}

    monkeypatch.setattr(cli, "get_db", lambda: object())
    monkeypatch.setattr(cli, "export_jobs", lambda db, export_format="all", min_score=None: called.update({"format": export_format, "min_score": min_score}) or [])
    monkeypatch.setattr(cli, "open_exports_dir", lambda: called.update({"opened": True}))

    cli.export(format="md", min_score=80, open=True)

    assert called["format"] == "md"
    assert called["min_score"] == 80
    assert called["opened"] is True

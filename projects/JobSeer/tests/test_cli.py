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
    monkeypatch.setattr(cli, "score_all_jobs", lambda db: called.__setitem__("scored", True) or 0)

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


def test_no_subcommand_launches_ui(monkeypatch):
    launched = {"ui": False}

    monkeypatch.setattr(cli, "ui", lambda: launched.__setitem__("ui", True))

    result = runner.invoke(cli.app, [])

    assert result.exit_code == 0
    assert launched["ui"] is True

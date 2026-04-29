import pytest
from textual.app import App

from jobsearch.db import get_db, init_db, upsert_company, upsert_job
from jobsearch.tui.screens import dashboard as dashboard_module
from jobsearch.tui.screens import detail as detail_module
from jobsearch.tui.screens import pipeline as pipeline_module
from jobsearch.tui.screens.dashboard import DashboardScreen
from jobsearch.tui.screens.detail import DetailScreen
from jobsearch.tui.screens.help import HelpScreen
from jobsearch.tui.screens.pipeline import PipelineScreen


class ScreenHarness(App):
    fetch_in_progress = False

    def __init__(self, screen):
        super().__init__()
        self.screen_to_mount = screen

    def on_mount(self) -> None:
        self.push_screen(self.screen_to_mount)

    def set_fetch_overlay_visible(self, visible: bool) -> None:
        self.fetch_in_progress = visible


class RecordingDashboard(DashboardScreen):
    def __init__(self):
        super().__init__()
        self.calls = []

    def action_fetch_jobs(self) -> None:
        self.calls.append("fetch")

    def action_score_jobs(self, force: bool = False) -> None:
        self.calls.append("score")

    def action_export_jobs(self) -> None:
        self.calls.append("export")

    def action_enrich_companies(self) -> None:
        self.calls.append("enrich")

    def action_refresh(self) -> None:
        self.calls.append("refresh")

    def action_cycle_location(self) -> None:
        self.calls.append("location")

    def action_show_help(self) -> None:
        self.calls.append("help")


@pytest.fixture
def tui_db(tmp_path, monkeypatch):
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
            "title": "Senior Product Manager",
            "location": "San Jose, CA",
            "apply_url": "https://example.com/apply",
            "status": "new",
            "fetched_at": "2026-04-21T00:00:00",
        },
    )

    monkeypatch.setattr(dashboard_module, "get_db", lambda: db)
    monkeypatch.setattr(detail_module, "get_db", lambda: db)
    monkeypatch.setattr(pipeline_module, "get_db", lambda: db)
    return db


@pytest.mark.asyncio
async def test_dashboard_keybindings_dispatch_to_screen_actions(tui_db):
    screen = RecordingDashboard()
    app = ScreenHarness(screen)

    async with app.run_test() as pilot:
        for key in ["f", "s", "e", "x", "r", "l", "?"]:
            await pilot.press(key)

    assert screen.calls == ["fetch", "score", "export", "enrich", "refresh", "location", "help"]


@pytest.mark.asyncio
async def test_dashboard_enter_opens_detail_and_escape_returns(tui_db):
    app = ScreenHarness(DashboardScreen())

    async with app.run_test() as pilot:
        await pilot.press("enter")
        await pilot.pause()
        assert isinstance(app.screen, DetailScreen)

        await pilot.press("escape")
        await pilot.pause()
        assert isinstance(app.screen, DashboardScreen)


@pytest.mark.asyncio
async def test_dashboard_help_key_opens_and_closes_help(tui_db):
    app = ScreenHarness(DashboardScreen())

    async with app.run_test() as pilot:
        await pilot.press("?")
        await pilot.pause()
        assert isinstance(app.screen, HelpScreen)

        await pilot.press("escape")
        await pilot.pause()
        assert isinstance(app.screen, DashboardScreen)


@pytest.mark.asyncio
async def test_pipeline_number_key_moves_selected_job(tui_db):
    db = tui_db
    db["jobs"].update("job1", {"status": "reviewing"})
    app = ScreenHarness(PipelineScreen())

    async with app.run_test() as pilot:
        await pilot.press("2")
        await pilot.pause()

    updated = db["jobs"].get("job1")
    assert updated["status"] == "applied"
    assert updated["applied"] == 1

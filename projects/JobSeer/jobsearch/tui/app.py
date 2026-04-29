from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Static, Label, Button, LoadingIndicator
from textual.containers import Container, Vertical, Horizontal
from textual.screen import Screen
from textual.worker import Worker, WorkerState
from textual import on
from textual.notifications import Notification
from sqlite_utils import Database # Add this import

from jobsearch.db import get_db
from jobsearch.tui.screens.dashboard import DashboardScreen
from jobsearch.tui.screens.detail import DetailScreen
from jobsearch.tui.screens.pipeline import PipelineScreen
from jobsearch.cli import _do_fetch, _do_score, _do_init, _do_discover, _do_enrich # Import core logic functions

class JobSeerApp(App):
    """JobSeer — AI-powered local job pipeline."""

    TITLE = "JobSeer"
    SUB_TITLE = "AI-powered job pipeline · Santa Clara, CA"
    
    BINDINGS = [
        ("q", "quit", "Quit"),
        ("?", "push_screen('help')", "Help"), # Assuming a help screen will be added
    ]

    # This attribute is used in dashboard.py to track fetch state
    fetch_in_progress = False 

    # Overlay management
    def set_fetch_overlay_visible(self, visible: bool) -> None:
        self.fetch_in_progress = visible

    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        yield Header()
        yield Footer()

    def on_mount(self) -> None:
        # Check if DB is initialized. If not, run init task.
        db = get_db()
        if not db.table_names():
            self.run_worker(self.init_db_task(), exclusive=True, group="init_db")
        else:
            self.push_screen(DashboardScreen())

    async def init_db_task(self):
        self.notify("Initializing database...", title="JobSeer Init")
        try:
            _do_init()
            self.notify("Database initialized. Starting discovery...", title="JobSeer Init")
            await self.run_worker(self.discover_task(), exclusive=True, group="discover").wait()
            self.notify("Discovery complete. Fetching initial jobs...", title="JobSeer Init")
            await self.run_worker(self.fetch_and_score_task(), exclusive=True, group="initial_fetch_score").wait()
            self.notify("Initial setup complete!", title="JobSeer Init")
        except Exception as e:
            self.notify(f"Initialization failed: {e}", title="JobSeer Init", severity="error")
        finally:
            self.push_screen(DashboardScreen()) # Always push dashboard after init attempt

    async def discover_task(self):
        db = get_db()
        _do_discover(db)
        return "Discovery complete."

    async def fetch_and_score_task(self):
        db = get_db()
        fetched = _do_fetch(db)
        scored = _do_score(db)
        return {"fetched": fetched, "scored": scored}

    # --- Screen Management ---
    def action_push_screen(self, screen_instance: Screen | str, job_id: str = None) -> None:
        if isinstance(screen_instance, str):
            if screen_instance == "dashboard":
                self.push_screen(DashboardScreen())
            elif screen_instance == "detail":
                if job_id:
                    self.push_screen(DetailScreen(job_id))
                else:
                    self.notify("Cannot open detail view without job ID.", severity="error")
            elif screen_instance == "pipeline":
                self.push_screen(PipelineScreen())
            elif screen_instance == "help": # Assuming help screen
                from jobsearch.tui.screens.help import HelpScreen
                self.push_screen(HelpScreen("Help", [])) # Placeholder
            else:
                super().action_push_screen(screen_instance) # Fallback to default if not recognized
        else:
            self.push_screen(screen_instance)

    # --- Worker State Handlers ---
    @on(Worker.StateChanged)
    def handle_worker_state(self, event: Worker.StateChanged) -> None:
        if event.state == WorkerState.SUCCESS or event.state == WorkerState.ERROR:
            # Refresh dashboard if it's the current screen and worker finished
            if isinstance(self.screen, DashboardScreen) and event.state == WorkerState.SUCCESS:
                self.screen.refresh_data()
        
        if event.worker.group == "init_db" and event.state == WorkerState.SUCCESS:
            self.notify("JobSeer is ready!", title="Initialization Complete")
        elif event.worker.group == "fetch_jobs" and event.state == WorkerState.SUCCESS:
            pass # DashboardScreen handles notification
        elif event.worker.group == "score_jobs" and event.state == WorkerState.SUCCESS:
            pass # DashboardScreen handles notification
        elif event.worker.group == "enrich_companies_manual" and event.state == WorkerState.SUCCESS:
            self.notify(f"{event.worker.result}", title="Company Enrich Complete")

if __name__ == "__main__":
    app = JobSeerApp()
    app.run()

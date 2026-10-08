from dataclasses import replace

from textual import on  # Add this import
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import DataTable, Footer, Header, Label, LoadingIndicator
from textual.worker import Worker, WorkerState

from jobsearch.cli import _do_enrich, _do_export, _do_fetch, _do_score
from jobsearch.db import get_db
from jobsearch.export import open_exports_dir  # Only open_exports_dir needed here

LOCATION_MODES = [
    ("bay_remote", "Bay Area + Remote"),
    ("bay_only", "Bay Area only"),
    ("remote_only", "Remote only"),
    ("all", "All locations"),
]

BAY_AREA_TERMS = (
    "san francisco",
    "oakland",
    "berkeley",
    "san jose",
    "santa clara",
    "mountain view",
    "palo alto",
    "sunnyvale",
    "redwood city",
    "fremont",
    "bay area",
)


class DashboardScreen(Screen):
    BINDINGS = [
        Binding("f", "fetch_jobs", "Fetch Jobs"),
        Binding("s", "score_jobs", "Score Jobs"),
        Binding("e", "export_jobs", "Export"),
        Binding("x", "enrich_companies", "Enrich Companies"),
        Binding("r", "refresh", "Refresh"),
        Binding("l", "cycle_location", "Location: Bay Area + Remote"),
        Binding("enter", "open_detail", "Detail", priority=True),
        Binding("a", "mark_applied", "Applied"),
        Binding("k", "mark_skipped", "Skip"), # Changed from 's' to 'k' to avoid conflict with score_jobs
        Binding("p", "open_pipeline", "Pipeline"),
        Binding("?", "show_help", "Help"),
    ]

    def __init__(self):
        super().__init__()
        self.location_mode_index = 0

    def compose(self) -> ComposeResult:
        yield Header()
        with Container():
            with Horizontal(id="stats-bar"):
                yield Label("Jobs: 0", id="stat-jobs")
                yield Label("Scored: 0", id="stat-scores")
            yield DataTable(id="job-table")
            with Vertical(id="fetch-overlay"):
                yield LoadingIndicator()
                yield Label("Processing...", id="fetch-label")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one(DataTable)
        table.add_columns("Score", "Title", "Company", "Location", "Status")
        table.cursor_type = "row"
        self._set_overlay_visible(False) # Hide overlay initially
        self.refresh_data()
        self._update_location_binding()

    def _set_overlay_visible(self, visible: bool, message: str = "Processing...") -> None:
        overlay = self.query_one("#fetch-overlay", Vertical)
        label = self.query_one("#fetch-label", Label)
        label.update(message)
        overlay.display = visible
        self.app.set_fetch_overlay_visible(visible) # Update app-level flag

    def _fetch_and_score_jobs_task(self) -> dict:
        print("Starting _fetch_and_score_jobs_task") # Debug print
        try:
            db = get_db()
            fetched = _do_fetch(db)
            scored = _do_score(db)
            print(f"Finished _fetch_and_score_jobs_task: fetched={fetched}, scored={scored}") # Debug print
            return {"fetched": fetched, "scored": scored}
        except Exception as e:
            print(f"Error in _fetch_and_score_jobs_task: {e}") # Debug print
            self.notify(f"Error in fetch task: {e}", severity="error")
            raise # Re-raise to be caught by Textual's worker error handler

    def action_fetch_jobs(self) -> None:
        print("--- action_fetch_jobs triggered ---") # Debug print: Check if this appears
        self._set_overlay_visible(True, "Fetching jobs...")
        # Removing try-except and exclusive=True for minimal worker launch test
        self.run_worker(self._fetch_and_score_jobs_task, thread=True, description="Fetching jobs", group="fetch_jobs_dashboard")

    def action_score_jobs(self, force: bool = False) -> None:
        print("Action score jobs triggered") # Debug print
        try:
            self._set_overlay_visible(True, "Scoring jobs...")
            self.run_worker(self._score_jobs_task, thread=True, exclusive=False, description="Scoring jobs", group="score_jobs_dashboard")
        except Exception as e:
            print(f"Error starting score worker: {e}") # Debug print
            self.notify(f"Error starting score: {e}", severity="error", timeout=6)
            self._set_overlay_visible(False) # Ensure overlay is hidden if worker fails to start

    def _score_jobs_task(self, force: bool = False) -> int:
        print("Starting _score_jobs_task") # Debug print
        try:
            db = get_db()
            scored_count = _do_score(db, force=force)
            print(f"Finished _score_jobs_task: scored={scored_count}") # Debug print
            return scored_count
        except Exception as e:
            print(f"Error in _score_jobs_task: {e}") # Debug print
            self.notify(f"Error in score task: {e}", severity="error")
            raise # Re-raise to be caught by Textual's worker error handler

    def _update_location_binding(self) -> None:
        label = LOCATION_MODES[self.location_mode_index][1]
        bindings = self._bindings.key_to_bindings.get("l", [])
        for index, binding in enumerate(bindings):
            bindings[index] = replace(binding, description=f"Location: {label}")
        self.refresh_bindings()

    def _get_selected_job_id(self) -> str | None:
        table = self.query_one(DataTable)
        if table.cursor_row is None or table.row_count == 0:
            return None
        row_key = table.coordinate_to_cell_key(table.cursor_coordinate).row_key
        return row_key.value if row_key else None

    def _get_next_job_id(self) -> str | None:
        table = self.query_one(DataTable)
        if table.row_count == 0:
            return None
        next_row = min(table.cursor_row + 1, table.row_count - 1)
        row_key = table.ordered_rows[next_row].key
        return row_key.value if row_key else None

    def _location_where_clause(self) -> tuple[str, list[str]]:
        mode, _label = LOCATION_MODES[self.location_mode_index]
        if mode == "all":
            return "", []

        bay_area_clauses = ["LOWER(COALESCE(j.location, '')) LIKE ?" for _ in BAY_AREA_TERMS]
        bay_area_sql = "(" + " OR ".join(bay_area_clauses) + ")"
        bay_area_params = [f"%{term}%" for term in BAY_AREA_TERMS]
        remote_sql = "(j.remote = 1 OR LOWER(COALESCE(j.location, '')) LIKE '%remote%')"

        if mode == "bay_remote":
            return f" AND ({bay_area_sql} OR {remote_sql})", bay_area_params
        if mode == "bay_only":
            return f" AND {bay_area_sql}", bay_area_params
        return f" AND {remote_sql}", []

    def refresh_data(self, preserve_cursor: bool = True, preferred_job_id: str | None = None) -> None:
        db = get_db()
        selected_job_id = preferred_job_id
        if preserve_cursor and selected_job_id is None:
            selected_job_id = self._get_selected_job_id()

        location_clause, location_params = self._location_where_clause()
        query = """
            SELECT
                COALESCE(s.score, 0) as score,
                j.title,
                c.name as company,
                j.location,
                j.status,
                j.id
            FROM jobs j
            JOIN companies c ON j.company_id = c.id
            LEFT JOIN scores s
                ON s.id = (
                    SELECT id
                    FROM scores
                    WHERE job_id = j.id
                    ORDER BY scored_at DESC
                    LIMIT 1
                )
            WHERE j.status IN ('new', 'reviewing')
        """ + location_clause + """
            ORDER BY s.score DESC, j.fetched_at DESC
        """
        jobs = list(db.query(query, location_params))

        table = self.query_one(DataTable)
        table.clear()
        target_row = 0
        for job in jobs:
            table.add_row(
                f"{job['score']}",
                job['title'],
                job['company'],
                job['location'] or "N/A",
                job['status'],
                key=job['id']
            )

        if jobs:
            job_ids = [job["id"] for job in jobs]
            if selected_job_id in job_ids:
                target_row = job_ids.index(selected_job_id)
            table.move_cursor(row=target_row, animate=False, scroll=True)

        self.query_one("#stat-jobs", Label).update(f"Jobs: {len(jobs)}")
        self.query_one("#stat-scores", Label).update(f"Scored: {db['scores'].count}")

    def action_refresh(self) -> None:
        self.refresh_data()
        self.notify("Refreshed jobs list", timeout=2)

    def action_cycle_location(self) -> None:
        self.location_mode_index = (self.location_mode_index + 1) % len(LOCATION_MODES)
        self._update_location_binding()
        self.refresh_data(preserve_cursor=False)

    def action_open_pipeline(self) -> None:
        from jobsearch.tui.screens.pipeline import PipelineScreen
        self.app.push_screen(PipelineScreen())

    def action_open_detail(self) -> None:
        job_id = self._get_selected_job_id()
        if job_id:
            from jobsearch.tui.screens.detail import DetailScreen
            self.app.push_screen(DetailScreen(job_id))

    def _update_selected_job_status(self, status: str, applied: int, notification: str) -> None:
        job_id = self._get_selected_job_id()
        if not job_id:
            return

        next_job_id = self._get_next_job_id()
        db = get_db()
        db["jobs"].update(job_id, {"status": status, "applied": applied})
        self.refresh_data(preferred_job_id=next_job_id)
        self.notify(notification, timeout=3)

    def action_mark_applied(self) -> None:
        self._update_selected_job_status(
            "applied",
            1,
            "Marked as applied - view in Pipeline (p)",
        )

    def action_mark_skipped(self) -> None:
        self._update_selected_job_status("skipped", 0, "Skipped job")

    def action_enrich_companies(self) -> None:
        if self.app.fetch_in_progress:
            self.notify("Operation already in progress.", severity="warning", timeout=2)
            return
        self._set_overlay_visible(True, "Enriching companies...")
        self.run_worker(self._enrich_companies_task, thread=True, exclusive=True, description="Enriching companies", group="enrich_companies_dashboard")

    def _enrich_companies_task(self) -> str:
        self.log("Starting _enrich_companies_task")
        try:
            db = get_db()
            result_message = _do_enrich(db)
            self.log(f"Finished _enrich_companies_task: {result_message}")
            return result_message
        except Exception as e:
            self.log(f"Error in _enrich_companies_task: {e}")
            self.notify(f"Error in enrich task: {e}", severity="error")
            raise # Re-raise to be caught by Textual's worker error handler

    def action_show_help(self) -> None:
        from jobsearch.tui.screens.help import HelpScreen  # Import locally
        lines = [
            "f  Fetch and score jobs in the background.",
            "s  Score all unscored jobs in the background.",
            "e  Export files and open the exports folder.",
            "r  Refresh the current job list from the database.",
            "x  Enrich companies with ATS data.",
            f"l  Cycle location filter. Current: {LOCATION_MODES[self.location_mode_index][1]}",
            "Enter  Open the highlighted job detail screen.",
            "a  Mark the highlighted job as applied.",
            "k  Skip the highlighted job.",
            "p  Open the pipeline screen.",
            "?  Show this help overlay.",
            "q  Quit the app.",
        ]
        self.app.push_screen(HelpScreen("Dashboard Shortcuts", lines))

    def action_export_jobs(self) -> None:
        db = get_db()
        _do_export(db, export_format="all")
        open_exports_dir()
        self.notify("Exported to ~/JobSeer/exports/", timeout=3)

    @on(Worker.StateChanged)
    def on_worker_state_changed(self, event: Worker.StateChanged) -> None:
        print(f"Worker state changed: {event.worker.group} - {event.state}") # Debug print
        if event.worker.group in ["fetch_jobs_dashboard", "score_jobs_dashboard", "enrich_companies_dashboard"]:
            if event.state == WorkerState.SUCCESS:
                self._set_overlay_visible(False)
                if event.worker.group == "fetch_jobs_dashboard":
                    result = event.worker.result or {"fetched": 0, "scored": 0}
                    print(f"Fetch worker success: {result}") # Debug print
                    self.notify(f"Fetch complete. Jobs: {result['fetched']}  Scored: {result['scored']}", timeout=3)
                elif event.worker.group == "score_jobs_dashboard":
                    print(f"Score worker success: {event.worker.result}") # Debug print
                    self.notify(f"Scored {event.worker.result} jobs.", timeout=3)
                elif event.worker.group == "enrich_companies_dashboard":
                    print(f"Enrich worker success: {event.worker.result}") # Debug print
                    self.notify(event.worker.result, timeout=3)
                self.refresh_data()
            elif event.state == WorkerState.ERROR:
                self._set_overlay_visible(False)
                print(f"Worker error: {event.worker.error}") # Debug print
                self.notify(f"Operation failed: {event.worker.error}", severity="error", timeout=6)
            elif event.state == WorkerState.CANCELLED:
                self._set_overlay_visible(False)
                print("Worker cancelled.") # Debug print
                self.notify("Operation cancelled.", severity="warning", timeout=3)

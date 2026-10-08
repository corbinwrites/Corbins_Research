from textual.app import ComposeResult
from textual.app import ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import DataTable, Footer, Header, Label

from jobsearch.db import get_db


PIPELINE_STATUSES = [
    ("reviewing", "Reviewing"),
    ("applied", "Applied"),
    ("interviewing", "Interviewing"),
    ("offer", "Offer"),
    ("rejected", "Rejected"),
]


class PipelineScreen(Screen):
    BINDINGS = [
        ("enter", "open_detail", "Detail"),
        ("left", "back", "Back"),
        ("escape", "back", "Back"),
        ("1", "set_reviewing", "Reviewing"),
        ("2", "set_applied", "Applied"),
        ("3", "set_interviewing", "Interviewing"),
        ("4", "set_offer", "Offer"),
        ("5", "set_rejected", "Rejected"),
        ("?", "show_help", "Help"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with Container():
            yield Label("Job Pipeline", id="pipeline-title")
            with Horizontal(id="pipeline-columns"):
                for status, title in PIPELINE_STATUSES:
                    with Vertical(classes="pipeline-column"):
                        yield Label(title, classes="pipeline-column-title")
                        yield DataTable(id=f"pipeline-{status}")
        yield Footer()

    def on_mount(self) -> None:
        for status, _title in PIPELINE_STATUSES:
            table = self.query_one(f"#pipeline-{status}", DataTable)
            table.add_columns("Score", "Title", "Company")
            table.cursor_type = "row"
        self.refresh_data()
        self._focus_first_table()

    def _tables(self):
        return [self.query_one(f"#pipeline-{status}", DataTable) for status, _ in PIPELINE_STATUSES]

    def _focus_first_table(self) -> None:
        for table in self._tables():
            if table.row_count:
                table.focus()
                table.move_cursor(row=0, animate=False, scroll=True)
                return
        self._tables()[0].focus()

    def refresh_data(self) -> None:
        db = get_db()
        query = """
            SELECT 
                COALESCE(s.score, 0) as score,
                j.title,
                c.name as company,
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
            WHERE j.status IN ('reviewing', 'applied', 'interviewing', 'offer', 'rejected')
            ORDER BY s.score DESC, j.fetched_at DESC
        """
        jobs = list(db.query(query))

        tables = {status: self.query_one(f"#pipeline-{status}", DataTable) for status, _ in PIPELINE_STATUSES}
        for table in tables.values():
            table.clear()
        for job in jobs:
            table = tables.get(job["status"])
            if table is None:
                continue
            table.add_row(f"{job['score']}", job["title"], job["company"], key=job["id"])

    def _active_table(self) -> DataTable:
        for table in self._tables():
            if table.has_focus:
                return table
        return self._tables()[0]

    def _selected_job_id(self) -> str | None:
        table = self._active_table()
        if table.cursor_row is None or table.row_count == 0:
            return None
        row_key = table.coordinate_to_cell_key(table.cursor_coordinate).row_key
        return row_key.value if row_key else None

    def _update_status(self, status: str) -> None:
        job_id = self._selected_job_id()
        if not job_id:
            return

        db = get_db()
        db["jobs"].update(job_id, {"status": status, "applied": 1 if status == "applied" else 0})
        self.refresh_data()
        target = self.query_one(f"#pipeline-{status}", DataTable)
        if target.row_count:
            target.focus()
        self.notify(f"Moved to {status}", timeout=2)

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_open_detail(self) -> None:
        job_id = self._selected_job_id()
        if job_id:
            from jobsearch.tui.screens.detail import DetailScreen
            self.app.push_screen(DetailScreen(job_id))

    def action_set_reviewing(self) -> None:
        self._update_status("reviewing")

    def action_set_applied(self) -> None:
        self._update_status("applied")

    def action_set_interviewing(self) -> None:
        self._update_status("interviewing")

    def action_set_offer(self) -> None:
        self._update_status("offer")

    def action_set_rejected(self) -> None:
        self._update_status("rejected")

    def action_show_help(self) -> None:
        from jobsearch.tui.screens.help import HelpScreen

        lines = [
            "Enter  Open the highlighted job detail screen.",
            "1  Move the highlighted job to Reviewing.",
            "2  Move the highlighted job to Applied.",
            "3  Move the highlighted job to Interviewing.",
            "4  Move the highlighted job to Offer.",
            "5  Move the highlighted job to Rejected.",
            "Left / Esc  Return to Dashboard.",
            "?  Show this help overlay.",
            "q  Quit the app.",
        ]
        self.app.push_screen(HelpScreen("Pipeline Shortcuts", lines))

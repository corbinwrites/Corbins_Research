from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, DataTable, Label
from textual.containers import Container, Horizontal
from jobsearch.db import get_db

class DashboardScreen(Screen):
    BINDINGS = [
        ("f", "fetch", "Fetch & Score"),
        ("r", "refresh", "Refresh"),
        ("p", "open_pipeline", "Pipeline"),
        ("Enter", "open_detail", "Detail"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with Container():
            with Horizontal(id="stats-bar"):
                yield Label("Jobs: 0", id="stat-jobs")
                yield Label("Scores: 0", id="stat-scores")
            yield DataTable(id="job-table")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one(DataTable)
        table.add_columns("Score", "Title", "Company", "Location", "Status")
        table.cursor_type = "row"
        self.refresh_data()

    def refresh_data(self) -> None:
        db = get_db()
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
            WHERE j.status != 'skipped'
            ORDER BY s.score DESC, j.fetched_at DESC
        """
        jobs = list(db.query(query))
        
        table = self.query_one(DataTable)
        table.clear()
        for job in jobs:
            table.add_row(
                f"{job['score']}",
                job['title'],
                job['company'],
                job['location'] or "N/A",
                job['status'],
                key=job['id']
            )
            
        self.query_one("#stat-jobs", Label).update(f"Jobs: {len(jobs)}")
        self.query_one("#stat-scores", Label).update(f"Scores: {db['scores'].count}")

    def action_refresh(self) -> None:
        self.refresh_data()

    def action_fetch(self) -> None:
        from jobsearch.cli import fetch as fetch_jobs

        self.notify("Fetching and scoring jobs...")
        fetch_jobs(score=True)
        self.refresh_data()
        self.notify("Fetch complete.")

    def action_open_pipeline(self) -> None:
        from jobsearch.tui.screens.pipeline import PipelineScreen
        self.app.push_screen(PipelineScreen())

    def action_open_detail(self) -> None:
        table = self.query_one(DataTable)
        if table.cursor_row is not None:
            # row_key is the job_id
            row_key = table.coordinate_to_cell_key(table.cursor_coordinate).row_key
            if row_key:
                from jobsearch.tui.screens.detail import DetailScreen
                self.app.push_screen(DetailScreen(row_key.value))

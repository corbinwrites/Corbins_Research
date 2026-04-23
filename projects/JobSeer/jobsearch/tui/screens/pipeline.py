from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, DataTable, Label
from textual.containers import Container
from jobsearch.db import get_db

class PipelineScreen(Screen):
    BINDINGS = [
        ("escape", "back", "Back"),
        ("Enter", "open_detail", "Detail"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with Container():
            yield Label("Job Pipeline (Apply/Applied)", id="pipeline-title")
            yield DataTable(id="pipeline-table")
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one(DataTable)
        table.add_columns("Score", "Title", "Company", "Status")
        table.cursor_type = "row"
        self.refresh_data()

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
            WHERE j.status = 'applied' OR s.score >= 70
            ORDER BY s.score DESC
        """
        jobs = list(db.query(query))
        
        table = self.query_one(DataTable)
        table.clear()
        for job in jobs:
            table.add_row(
                f"{job['score']}",
                job['title'],
                job['company'],
                job['status'],
                key=job['id']
            )

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_open_detail(self) -> None:
        table = self.query_one(DataTable)
        if table.cursor_row is not None:
            row_key = table.coordinate_to_cell_key(table.cursor_coordinate).row_key
            if row_key:
                from jobsearch.tui.screens.detail import DetailScreen
                self.app.push_screen(DetailScreen(row_key.value))

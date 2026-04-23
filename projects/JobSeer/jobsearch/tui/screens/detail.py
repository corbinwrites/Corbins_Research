from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, Label, Button
from textual.containers import Container, Vertical, Horizontal
from jobsearch.db import get_db, get_job_by_id
import webbrowser
import pyperclip

class DetailScreen(Screen):
    BINDINGS = [
        ("escape", "back", "Back"),
        ("o", "open_url", "Open URL"),
        ("c", "copy_url", "Copy URL"),
        ("s", "skip", "Skip"),
        ("a", "applied", "Applied"),
    ]

    def __init__(self, job_id: str):
        super().__init__()
        self.job_id = job_id

    def compose(self) -> ComposeResult:
        yield Header()
        with Container():
            yield Label("Job Details", id="detail-title")
            with Vertical(id="detail-container"):
                yield Label("Loading...", id="job-info")
                yield Static("", id="job-description")
            with Horizontal(id="action-bar"):
                yield Button("Open URL (o)", id="open-btn")
                yield Button("Copy URL (c)", id="copy-btn")
        yield Footer()

    def on_mount(self) -> None:
        self.load_job()

    def load_job(self) -> None:
        db = get_db()
        job = get_job_by_id(db, self.job_id)
        if not job:
            self.query_one("#job-info", Label).update("Job not found.")
            return

        company = db["companies"].get(job["company_id"])
        score_record = list(
            db.query(
                "SELECT * FROM scores WHERE job_id = ? ORDER BY scored_at DESC LIMIT 1",
                [self.job_id],
            )
        )
        score_val = score_record[0]["score"] if score_record else "Unscored"
        
        info = f"[bold]{job['title']}[/bold]\n"
        info += f"Company: {company['name']}\n"
        info += f"Location: {job['location'] or 'N/A'}\n"
        info += f"Score: {score_val}\n"
        info += f"Apply URL: {job['apply_url']}\n"
        
        self.query_one("#job-info", Label).update(info)
        self.query_one("#job-description", Static).update(job.get("description_md", "No description available."))
        self.job_url = job["apply_url"]

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_open_url(self) -> None:
        if hasattr(self, "job_url"):
            webbrowser.open(self.job_url)
            self.notify("Opening browser...")

    def action_copy_url(self) -> None:
        if hasattr(self, "job_url"):
            pyperclip.copy(self.job_url)
            self.notify("URL copied to clipboard")

    def action_applied(self) -> None:
        db = get_db()
        db["jobs"].update(self.job_id, {"status": "applied", "applied": 1})
        self.notify("Marked as applied")
        try:
            self.app.pop_screen()
        except Exception:
            pass

    def action_skip(self) -> None:
        db = get_db()
        db["jobs"].update(self.job_id, {"status": "skipped", "applied": 0})
        self.notify("Job skipped")
        try:
            self.app.pop_screen()
        except Exception:
            pass

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "open-btn":
            self.action_open_url()
        elif event.button.id == "copy-btn":
            self.action_copy_url()

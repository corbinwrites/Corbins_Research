import webbrowser

import pyperclip
from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import Button, DataTable, Footer, Header, Label, Static

from jobsearch.db import get_db, get_job_by_id, get_score_history


class DetailScreen(Screen):
    BINDINGS = [
        Binding("left", "back", "Back", priority=True),
        Binding("escape", "back", "Back", priority=True),
        ("o", "open_url", "Open in browser"),
        ("c", "copy_url", "Copy link"),
        ("a", "applied", "Applied"),
        ("s", "skip", "Skip"),
        ("h", "toggle_history", "History"),
        ("?", "show_help", "Help"),
    ]

    def __init__(self, job_id: str):
        super().__init__()
        self.job_id = job_id
        self.job = None
        self.show_history = False
        self.score_history = []

    def compose(self) -> ComposeResult:
        yield Header()
        with Container():
            yield Label("Job Details", id="detail-title")
            with Vertical(id="detail-container"):
                yield Label("Loading...", id="job-info")
                yield Static("", id="latest-score")
                with Vertical(id="score-history-section"):
                    yield Label("Score History", id="score-history-title")
                    yield DataTable(id="score-history-table")
                    yield Static("", id="score-history-detail")
                yield Static("", id="job-description")
            with Horizontal(id="action-bar"):
                yield Button("Open URL (o)", id="open-btn")
                yield Button("Copy URL (c)", id="copy-btn")
        yield Footer()

    def on_mount(self) -> None:
        history_table = self.query_one("#score-history-table", DataTable)
        history_table.add_columns("#", "Score", "Rec", "Model", "Scored At")
        self._set_history_visible(False)
        self.load_job()

    def _set_history_visible(self, visible: bool) -> None:
        self.show_history = visible
        self.query_one("#score-history-section", Vertical).display = visible

    def load_job(self) -> None:
        db = get_db()
        job = get_job_by_id(db, self.job_id)
        if not job:
            self.query_one("#job-info", Label).update("Job not found.")
            return
        self.job = job

        company = db["companies"].get(job["company_id"])
        self.score_history = get_score_history(db, self.job_id)
        latest_score = self.score_history[0] if self.score_history else None
        score_val = latest_score["score"] if latest_score else "Unscored"

        info = f"[bold]{job['title']}[/bold]\n"
        info += f"Company: {company['name']}\n"
        info += f"Location: {job['location'] or 'N/A'}\n"
        info += f"Score: {score_val}\n"
        info += f"Apply URL: {job['apply_url']}\n"

        self.query_one("#job-info", Label).update(info)
        self.query_one("#latest-score", Static).update(self._render_latest_score())
        self._populate_history_table()
        self.query_one("#job-description", Static).update(
            job.get("description_md") or "No description available."
        )
        self.job_url = job["apply_url"]

    def _render_latest_score(self) -> str:
        if not self.score_history:
            return "Latest Score\nUnscored"
        latest = self.score_history[0]
        gaps = ", ".join(eval_gaps(latest.get("gaps")))
        lines = [
            "Latest Score",
            f"{latest['score']} - {(latest.get('recommendation_label') or 'n/a').upper()}  scored {latest.get('scored_at')}",
            f"Reasoning: {latest.get('reasoning') or 'No reasoning recorded.'}",
            f"Gaps: {gaps or 'None noted'}",
        ]
        return "\n".join(lines)

    def _populate_history_table(self) -> None:
        table = self.query_one("#score-history-table", DataTable)
        table.clear()
        for index, score in enumerate(self.score_history, start=1):
            table.add_row(
                str(index),
                str(score["score"]),
                score.get("recommendation_label") or "",
                score.get("model") or "",
                score.get("scored_at") or "",
                key=str(score["id"]),
            )
        if self.score_history:
            self._update_history_detail(self.score_history[0])

    def _update_history_detail(self, score_record: dict) -> None:
        gaps = ", ".join(eval_gaps(score_record.get("gaps")))
        detail = [
            f"Reasoning: {score_record.get('reasoning') or 'No reasoning recorded.'}",
            f"Gaps: {gaps or 'None noted'}",
        ]
        self.query_one("#score-history-detail", Static).update("\n".join(detail))

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_open_url(self) -> None:
        if hasattr(self, "job_url"):
            webbrowser.open(self.job_url)
            if self.job and not self.job.get("apply_url_resolved", 1):
                self.notify(
                    "Opening career page - direct apply link was unavailable",
                    severity="warning",
                    timeout=4,
                )
            else:
                self.notify("Opened in browser", timeout=2)

    def action_copy_url(self) -> None:
        if hasattr(self, "job_url"):
            pyperclip.copy(self.job_url)
            self.notify("Copied to clipboard", timeout=2)

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
        self.notify("Skipped job")
        try:
            self.app.pop_screen()
        except Exception:
            pass

    def action_toggle_history(self) -> None:
        self._set_history_visible(not self.show_history)

    def on_data_table_row_highlighted(self, event: DataTable.RowHighlighted) -> None:
        if event.data_table.id != "score-history-table":
            return
        for score in self.score_history:
            if str(score["id"]) == event.row_key.value:
                self._update_history_detail(score)
                break

    def action_show_help(self) -> None:
        from jobsearch.tui.screens.help import HelpScreen

        lines = [
            "o  Open the apply link in your browser.",
            "c  Copy the apply link to the clipboard.",
            "a  Mark this job as applied and return.",
            "s  Skip this job and return.",
            "h  Toggle score history.",
            "Left / Esc  Go back to the previous screen.",
            "?  Show this help overlay.",
            "q  Quit the app.",
        ]
        self.app.push_screen(HelpScreen("Detail Shortcuts", lines))

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "open-btn":
            self.action_open_url()
        elif event.button.id == "copy-btn":
            self.action_copy_url()


def eval_gaps(raw_gaps) -> list[str]:
    import json

    if not raw_gaps:
        return []
    if isinstance(raw_gaps, list):
        return raw_gaps
    try:
        return json.loads(raw_gaps)
    except Exception:
        return [str(raw_gaps)]

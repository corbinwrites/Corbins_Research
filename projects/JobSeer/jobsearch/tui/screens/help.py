from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Header, Footer, Static, Label
from textual.containers import Container, Vertical
from textual.binding import Binding

class HelpScreen(ModalScreen):
    BINDINGS = [
        Binding("escape", "dismiss", "Close Help"),
    ]

    def __init__(self, title: str, help_text_lines: list[str]):
        super().__init__()
        self.title = title
        self.help_text_lines = help_text_lines

    def compose(self) -> ComposeResult:
        with Container(id="help-dialog"):
            yield Label(self.title, classes="help-title")
            with Vertical(id="help-content"):
                for line in self.help_text_lines:
                    yield Static(line)
        yield Footer()

    def action_dismiss(self) -> None:
        self.app.pop_screen()

    def on_mount(self) -> None:
        self.query_one("#help-dialog").border_title = "Help"

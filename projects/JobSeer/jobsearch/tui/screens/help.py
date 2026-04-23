from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Footer, Header, Static


class HelpScreen(ModalScreen):
    BINDINGS = [("escape", "dismiss", "Close"), ("q", "dismiss", "Close")]

    def compose(self) -> ComposeResult:
        yield Header()
        yield Static(
            "\n".join(
                [
                    "JobSeer Help",
                    "",
                    "f  Fetch jobs and score",
                    "p  Open pipeline",
                    "Enter  Open selected job",
                    "o  Open apply URL",
                    "c  Copy apply URL",
                    "a  Mark applied",
                    "s  Skip job",
                    "q / Esc  Close or quit",
                ]
            )
        )
        yield Footer()

    def action_dismiss(self) -> None:
        self.app.pop_screen()

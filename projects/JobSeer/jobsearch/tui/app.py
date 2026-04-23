from textual.app import App
from jobsearch.tui.screens.dashboard import DashboardScreen
from jobsearch.tui.screens.detail import DetailScreen
from jobsearch.tui.screens.help import HelpScreen
from jobsearch.tui.screens.pipeline import PipelineScreen

class JobSeerApp(App):
    """JobSeer — AI-powered local job pipeline."""

    TITLE = "JobSeer"
    SUB_TITLE = "AI-powered job pipeline · Santa Clara, CA"
    
    SCREENS = {
        "dashboard": DashboardScreen,
        "help": HelpScreen,
        "pipeline": PipelineScreen,
    }
    
    BINDINGS = [
        ("f", "fetch", "Fetch jobs"),
        ("p", "push_screen('pipeline')", "Pipeline"),
        ("q", "quit", "Quit"),
        ("?", "push_screen('help')", "Help"),
    ]

    def on_mount(self) -> None:
        self.push_screen("dashboard")

    def action_fetch(self) -> None:
        from jobsearch.cli import fetch as fetch_jobs

        self.notify("Fetching and scoring jobs...")
        fetch_jobs(score=True)
        screen = self.screen
        if hasattr(screen, "refresh_data"):
            screen.refresh_data()
        self.notify("Fetch complete.")

    def action_push_screen(self, screen_name: str, job_id: str = None) -> None:
        if screen_name == "detail":
            self.push_screen(DetailScreen(job_id))
        else:
            self.push_screen(screen_name)

if __name__ == "__main__":
    app = JobSeerApp()
    app.run()

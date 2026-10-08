from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Static
from textual.containers import Container
from textual.worker import Worker
import asyncio # Needed for asyncio.sleep
import sys # To print to stderr for debugging

class MinimalWorkerApp(App):
    """A simple Textual app to test workers."""

    BINDINGS = [("w", "run_test_worker", "Run Worker")]

    def compose(self) -> ComposeResult:
        yield Header()
        with Container():
            yield Static("Press 'w' to run a worker.")
        yield Footer()

    def action_run_test_worker(self) -> None:
        self.log("Action: run_test_worker triggered.")
        self.notify("Starting worker...", title="Worker Test")
        # We need to run the actual worker task.
        # Let's define a simple async function that does work and prints.
        # Then use run_worker on that async function.
        self.run_worker(self.simple_worker_task, thread=True, description="Testing worker", group="test_worker")

    async def simple_worker_task(self) -> None:
        print("--- Simple worker: Starting! ---", file=sys.stderr) # Print to terminal stderr
        try:
            await asyncio.sleep(3) # Simulate work
            print("--- Simple worker: Finished! ---", file=sys.stderr) # Print to terminal stderr
            self.notify("Worker finished successfully!", title="Worker Test")
        except Exception as e:
            print(f"Error in simple worker: {e}", file=sys.stderr) # Print error to terminal
            self.notify(f"Worker error: {e}", severity="error", title="Worker Test")
            raise

if __name__ == "__main__":
    app = MinimalWorkerApp()
    app.run()

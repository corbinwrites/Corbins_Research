# JobSeer TUI Debug Log - Fetch/Score Freezing Issue

## Problem Description
User reports that launching the `jobseer ui` works, and other keybindings function, but pressing 'f' (Fetch Jobs) or 's' (Score Jobs) causes the TUI to freeze without any visual feedback (loading overlay, notifications) or error messages in the terminal where the TUI was launched. This indicates that the background worker tasks responsible for fetching and scoring are either not starting, crashing silently, or not communicating their state back to the UI.

## Debugging Steps Taken & Issues Encountered

### Phase 1: Initial Launch Errors (Before Freeze)

1.  **`RuntimeError: GOOGLE_API_KEY or GEMINI_API_KEY not set.`**
    *   **Cause**: `GOOGLE_API_KEY` was not consistently loaded into the environment when the TUI launched, leading to `scorer.py` failing to initialize. The `fetch.sh` script loaded it, but direct `uv run` for the TUI did not.
    *   **Fix**: Centralized `.env` loading in `jobsearch/__init__.py` (added `resolve_project_root()` and `load_dotenv()` there) and removed redundant loading from `scorer.py`.

2.  **`NameError: name 'Optional' is not defined`**
    *   **Cause**: Missing `from typing import Optional` in `jobsearch/ingestion/__init__.py`.
    *   **Fix**: Added the import.

3.  **`SyntaxError: unterminated f-string literal`**
    *   **Cause**: Incorrect multiline f-string usage (implicit newlines) in `jobsearch/export.py` within `export_to_markdown`.
    *   **Fix**: Corrected the f-string formatting.

4.  **`NameError: name 'List' is not defined`**
    *   **Cause**: Missing `from typing import List` in `jobsearch/cli.py`.
    *   **Fix**: Added the import.

5.  **`ImportError: cannot import name 'export_jobs'`**
    *   **Cause**: `jobsearch/tui/screens/dashboard.py` was trying to import `export_jobs` directly from `jobsearch/export.py` instead of using the refactored `_do_export` from `jobsearch/cli.py` or `export_jobs_cli`.
    *   **Fix**: Corrected the import statement in `dashboard.py` to import `open_exports_dir` only, and call `_do_export` from `cli`.

6.  **`NameError: name 'Database' is not defined`**
    *   **Cause**: Missing `from sqlite_utils import Database` in `jobsearch/tui/app.py`.
    *   **Fix**: Added the import.

7.  **`NameError: name 'on' is not defined`**
    *   **Cause**: Missing `from textual import on` in `jobsearch/tui/screens/dashboard.py`.
    *   **Fix**: Added the import.

### Phase 2: TUI Freeze on 'f' (Fetch Jobs) / 's' (Score Jobs)

1.  **Issue**: TUI launches, but pressing 'f' or 's' causes it to freeze. No loading overlay appears, no notifications are displayed, and no error messages are printed to the terminal.
2.  **Initial Hypothesis**: Problem with the `fetch-overlay` widget, worker communication, or `fetch_in_progress` flag management.
3.  **Debugging Steps**:
    *   **Moved `fetch-overlay`**: Moved the `fetch-overlay` definition from `jobsearch/tui/app.py`'s `compose` method to `jobsearch/tui/screens/dashboard.py`'s `compose` method. This centralizes overlay management within the screen where the action is initiated.
    *   **Refactored `fetch_in_progress` management**:
        *   Re-added `set_fetch_overlay_visible(self, visible: bool)` to `jobsearch/tui/app.py` to solely manage the `self.fetch_in_progress` flag at the app level.
        *   Updated `_set_overlay_visible` in `dashboard.py` to call `self.app.set_fetch_overlay_visible(visible)` to ensure the app-level flag is synchronized.
    *   **Added comprehensive logging/notifications**:
        *   Added `print()` and `self.log()` statements to the entry/exit of `_fetch_and_score_jobs_task`, `_score_jobs_task`, and `_enrich_companies_task` in `dashboard.py`.
        *   Added `print()` statements in the `except` blocks of these tasks and in `on_worker_state_changed`.
        *   Ensured `self.notify` calls are made for both success and error states.
4.  **Current Status**: Despite these changes and added `print()` statements, no output is observed in the terminal after pressing 'f', and no overlay/notification appears. This strongly suggests the worker tasks are **not being executed at all**, or are failing *before* their first `print` statement within the Textual worker context.
5.  **Simple Worker Diagnostic**:
    *   **Action**: Replaced `_fetch_and_score_jobs_task` with a simple static method `_test_worker_task` that only `print`s a message and `time.sleep`s. Removed `exclusive=True` from `run_worker` for this test.
    *   **Result**: Still no `print` output observed in the terminal.
    *   **Conclusion**: Textual's worker system appears to be failing to launch or execute even the simplest worker in this environment. The problem is not with the complexity of our worker logic, but likely with Textual's worker mechanism itself or the environment's compatibility with it.

---
*End of Log*

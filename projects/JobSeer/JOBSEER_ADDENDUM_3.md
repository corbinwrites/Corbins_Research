# CLAUDE.md Addendum 3 — Keyboard Shortcut Behavioral Specifications

> Append to `CLAUDE.md`.
> This addendum replaces the shortcut tables in all prior guides.
> Each shortcut includes the exact behavior the coding agent must implement —
> not just the key binding. Do not add a binding without implementing its action.

---

## C1. Scope

Shortcuts are defined per screen. A shortcut listed under Dashboard does not
automatically exist on Detail or Pipeline — implement each screen independently.

All shortcuts must:
1. Have a visible label in the footer bar at the bottom of the screen
2. Do something observable when pressed — never bind a key that is a no-op
3. Be listed in the `BINDINGS` class variable of the relevant Textual `Screen`

---

## C2. Dashboard Screen Shortcuts

### `f` — Fetch & Score

**Label in footer:** `f Fetch & Score`

**What it does:**
1. Shows a progress bar or spinner overlay labeled "Fetching jobs..."
2. Runs the full ingestion pipeline (`fetch_all_companies()`) in a background
   worker so the TUI remains responsive
3. After ingestion completes, immediately runs `score_all_jobs()` in the same
   background worker
4. When both are done, refreshes the job table automatically
5. Updates the header stat line: `Jobs: N  Scored: M`
6. If ingestion or scoring throws an error, shows a dismissable error notification
   — does NOT silently fail

**What it does NOT do:**
- Does not block the UI thread
- Does not require the user to press a second key to trigger scoring
- Does not navigate away from Dashboard

---

### `r` — Refresh

**Label in footer:** `r Refresh`

**What it does:**
1. Re-queries the database and redraws the job table with current data
2. Does NOT trigger a new network fetch or scoring run
3. Use case: you ran `jobseer score` in a separate terminal and want the TUI
   to reflect the new scores without closing and reopening

**What it does NOT do:**
- Does not hit any external API
- Does not reset filters or cursor position

---

### `l` — Cycle Location Filter

**Label in footer:** `l Location: {current_label}`

**What it does:**
1. Cycles through four location modes in order on each keypress:
   - `Bay Area + Remote` (default on startup)
   - `Bay Area only`
   - `Remote only`
   - `All locations`
2. Immediately re-queries the DB and redraws the job table with the new filter
3. Updates the footer label to show the current active filter, e.g. `l Location: Remote only`
4. The active filter persists for the session but resets to `Bay Area + Remote`
   on next launch

**What it does NOT do:**
- Does not open a modal or dropdown
- Does not affect the Pipeline screen

---

### `Enter` — Open Job Detail

**Label in footer:** `Enter Detail`

**What it does:**
1. Pushes the Detail screen onto the screen stack for the currently highlighted row
2. The Detail screen receives the full job record including `apply_url`,
   `description_md`, and the latest score record if one exists
3. Pressing `Escape` or `←` on the Detail screen pops back to Dashboard with
   cursor position preserved

**What it does NOT do:**
- Does not open a browser
- Does not mark the job as seen automatically

---

### `a` — Mark as Applied

**Label in footer:** `a Applied`

**What it does:**
1. Sets `status = 'applied'` and `applied = 1` on the highlighted job in the DB
2. Moves the job out of the default `new` / `reviewing` view — it will no longer
   appear in the main job list unless the Status filter is set to show applied jobs
3. Shows a brief inline notification: `✓ Marked as applied — view in Pipeline (p)`
4. Cursor automatically moves to the next job in the list

**What it does NOT do:**
- Does not open the browser
- Does not send any application — it is a local status flag only
- Does not require confirmation

---

### `s` — Skip Job

**Label in footer:** `s Skip`

**What it does:**
1. Sets `status = 'skipped'` on the highlighted job in the DB
2. Immediately removes the job from the current view (no undo prompt)
3. Cursor automatically moves to the next job in the list
4. Skipped jobs are never shown in Dashboard unless the Status filter is explicitly
   set to include them

**What it does NOT do:**
- Does not delete the record from the DB (recoverable via SQL if needed)
- Does not require confirmation

---

### `p` — Go to Pipeline

**Label in footer:** `p Pipeline`

**What it does:**
1. Pushes the Pipeline screen onto the screen stack
2. Pipeline shows all jobs with `status` in:
   `reviewing`, `applied`, `interviewing`, `offer`, `rejected`
3. Pressing `Escape` or `←` on Pipeline pops back to Dashboard

---

### `?` — Help Overlay

**Label in footer:** `? Help`

**What it does:**
1. Pushes a Help screen (or modal) that lists every shortcut for the current screen
   with a one-line plain-English description of what each one does
2. Pressing `Escape` or `?` again dismisses it

---

## C3. Detail Screen Shortcuts

### `o` — Open in Browser

**Label in footer:** `o Open in browser`

**What it does:**
1. Calls `webbrowser.open(job["apply_url"])` to open the apply link in the
   user's default browser
2. Shows a brief inline notification: `✓ Opened in browser`
3. If `apply_url_resolved = False` (fell back to career page root), shows:
   `⚠ Opening career page — direct apply link was unavailable`

**What it does NOT do:**
- Does not change job status
- Does not navigate away from the Detail screen

---

### `c` — Copy Apply Link

**Label in footer:** `c Copy link`

**What it does:**
1. Calls `pyperclip.copy(job["apply_url"])` to copy the URL to the system clipboard
2. Shows a brief inline notification: `✓ Copied to clipboard`

**What it does NOT do:**
- Does not open a browser
- Does not change job status

---

### `a` — Mark as Applied (Detail screen)

**Label in footer:** `a Applied`

**What it does:**
Same behavior as Dashboard `a`, but:
1. After marking, pops back to Dashboard automatically (the job is no longer
   in the default view so there is nothing to return to on Detail)
2. Shows the notification on Dashboard: `✓ Marked as applied`

---

### `s` — Skip (Detail screen)

**Label in footer:** `s Skip`

**What it does:**
Same behavior as Dashboard `s`, but:
1. After skipping, pops back to Dashboard automatically

---

### `←` or `Escape` — Back

**Label in footer:** `← Back`

**What it does:**
1. Pops the Detail screen off the stack, returning to Dashboard
2. Restores cursor to the job that was open

---

## C4. Pipeline Screen Shortcuts

### `Enter` — Open Job Detail from Pipeline

**What it does:**
Same as Dashboard `Enter` — pushes Detail screen for the highlighted job card.
Pressing back from Detail returns to Pipeline (not Dashboard).

### `←` or `Escape` — Back to Dashboard

**What it does:**
Pops Pipeline off the stack, returning to Dashboard.

### Status update keys (on a highlighted job card)

| Key | Sets `status` to | Label |
|-----|-----------------|-------|
| `1` | `reviewing` | Reviewing |
| `2` | `applied` | Applied |
| `3` | `interviewing` | Interviewing |
| `4` | `offer` | Offer |
| `5` | `rejected` | Rejected |

**What each does:**
1. Updates `status` in the DB immediately
2. Moves the job card to the correct column in the Pipeline view
3. No confirmation required

---

## C5. Global Shortcuts (all screens)

### `q` — Quit

**What it does:**
1. Exits the Textual app cleanly
2. No confirmation prompt unless a background fetch/score task is still running,
   in which case: show `Fetch in progress. Quit anyway? (y/n)`

---

## C6. Implementation Notes for Coding Agent

- **Background tasks:** `f` (Fetch & Score) must use `self.run_worker()` in
  Textual so the UI thread is never blocked. The worker posts a message back to
  the app when complete to trigger a table refresh.

- **Notifications:** Use Textual's `self.notify()` method for all inline
  confirmations. Duration should be 2–3 seconds. Do not use `print()`.

- **Footer labels:** Use Textual's `Footer` widget with `BINDINGS` defined on
  each Screen. The footer auto-renders from `BINDINGS` — do not hardcode footer
  text manually.

- **Cursor preservation:** When the job table is refreshed (after `f` or `r`),
  restore the cursor to the previously selected row by matching on `job_id`,
  not row index.

- **Error handling:** Any shortcut that calls an external service (`f`, `o`)
  must catch exceptions and show a notification. Never let an unhandled exception
  crash the TUI.

- **DB writes are synchronous:** Status changes (`a`, `s`, Pipeline status keys)
  write to SQLite synchronously — they are fast enough that no worker is needed.
  UI updates (remove row, move card) happen immediately after the write succeeds.

---

*Addendum 3 — April 2026*
*Defines exact behavior for every keyboard shortcut — coding agent must implement
the action described, not just register the key binding.*

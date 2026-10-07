"""
ledger.py — SQLite-backed record of every article the pipeline has processed.

Schema
------
articles(
    post_id        INTEGER PRIMARY KEY,
    url            TEXT NOT NULL,
    kind           TEXT NOT NULL,           -- 'daily' | 'feature' | 'column'
    issue          TEXT,                    -- 'YYYY-MM'
    study_date     TEXT,                    -- 'YYYY-MM-DD' (dailies only)
    modified       TEXT,                    -- ISO-8601 from REST
    content_hash   TEXT,
    parser_version INTEGER DEFAULT 1,
    note_path      TEXT,                    -- absolute path written to disk
    status         TEXT DEFAULT 'ok',      -- 'ok' | 'error' | 'skipped'
    fetched_at     TEXT,                    -- ISO-8601 UTC
    error          TEXT                     -- last error message if status='error'
)
"""

from __future__ import annotations

import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator, Iterable

logger = logging.getLogger(__name__)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS articles (
    post_id        INTEGER PRIMARY KEY,
    url            TEXT NOT NULL,
    kind           TEXT NOT NULL,
    issue          TEXT,
    study_date     TEXT,
    modified       TEXT,
    content_hash   TEXT,
    parser_version INTEGER DEFAULT 1,
    note_path      TEXT,
    status         TEXT DEFAULT 'ok',
    fetched_at     TEXT,
    error          TEXT
);

CREATE INDEX IF NOT EXISTS idx_issue       ON articles(issue);
CREATE INDEX IF NOT EXISTS idx_status      ON articles(status);
CREATE INDEX IF NOT EXISTS idx_study_date  ON articles(study_date);
CREATE INDEX IF NOT EXISTS idx_modified    ON articles(modified);
"""


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


class Ledger:
    """
    Thin wrapper around a SQLite database.

    Always use as a context manager to get a connection:

        with Ledger(path) as ledger:
            ledger.upsert(...)
    """

    def __init__(self, db_path: Path):
        self._path = db_path
        self._db_path = db_path
        db_path.parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def _conn(self) -> Generator[sqlite3.Connection, None, None]:
        con = sqlite3.connect(self._db_path)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("PRAGMA foreign_keys=ON")
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    def migrate(self) -> None:
        """Create or update schema."""
        with self._conn() as con:
            con.executescript(_SCHEMA)
        logger.debug("Ledger ready at %s", self._db_path)

    # ── Writes ────────────────────────────────────────────────────────────────

    def upsert(
        self,
        *,
        post_id: int,
        url: str,
        kind: str,
        issue: str | None = None,
        study_date: str | None = None,
        modified: str | None = None,
        content_hash: str | None = None,
        parser_version: int = 1,
        note_path: str | None = None,
        status: str = "ok",
        error: str | None = None,
    ) -> None:
        with self._conn() as con:
            con.execute(
                """
                INSERT INTO articles
                    (post_id, url, kind, issue, study_date, modified,
                     content_hash, parser_version, note_path, status,
                     fetched_at, error)
                VALUES
                    (:post_id, :url, :kind, :issue, :study_date, :modified,
                     :content_hash, :parser_version, :note_path, :status,
                     :fetched_at, :error)
                ON CONFLICT(post_id) DO UPDATE SET
                    url            = excluded.url,
                    kind           = excluded.kind,
                    issue          = excluded.issue,
                    study_date     = excluded.study_date,
                    modified       = excluded.modified,
                    content_hash   = excluded.content_hash,
                    parser_version = excluded.parser_version,
                    note_path      = COALESCE(excluded.note_path, articles.note_path),
                    status         = excluded.status,
                    fetched_at     = excluded.fetched_at,
                    error          = excluded.error
                """,
                {
                    "post_id": post_id,
                    "url": url,
                    "kind": kind,
                    "issue": issue,
                    "study_date": study_date,
                    "modified": modified,
                    "content_hash": content_hash,
                    "parser_version": parser_version,
                    "note_path": note_path,
                    "status": status,
                    "fetched_at": _now_utc(),
                    "error": error,
                },
            )

    def mark_error(self, post_id: int, url: str, error: str, kind: str = "unknown") -> None:
        self.upsert(post_id=post_id, url=url, kind=kind, status="error", error=error)

    def update_note_path(self, post_id: int, note_path: str) -> None:
        with self._conn() as con:
            con.execute(
                "UPDATE articles SET note_path = ? WHERE post_id = ?",
                (note_path, post_id),
            )

    # ── Reads ─────────────────────────────────────────────────────────────────

    def get(self, post_id: int) -> sqlite3.Row | None:
        with self._conn() as con:
            row = con.execute(
                "SELECT * FROM articles WHERE post_id = ?", (post_id,)
            ).fetchone()
        return row

    def get_by_url(self, url: str) -> sqlite3.Row | None:
        with self._conn() as con:
            row = con.execute(
                "SELECT * FROM articles WHERE url = ?", (url,)
            ).fetchone()
        return row

    def known_ids(self) -> set[int]:
        with self._conn() as con:
            rows = con.execute("SELECT post_id FROM articles").fetchall()
        return {r["post_id"] for r in rows}

    def errored(self) -> list[sqlite3.Row]:
        with self._conn() as con:
            return con.execute(
                "SELECT * FROM articles WHERE status = 'error'"
            ).fetchall()

    def by_issue(self, issue: str) -> list[sqlite3.Row]:
        with self._conn() as con:
            return con.execute(
                "SELECT * FROM articles WHERE issue = ? ORDER BY study_date, kind",
                (issue,),
            ).fetchall()

    def all_note_paths(self) -> dict[int, str]:
        """post_id → note_path mapping."""
        with self._conn() as con:
            rows = con.execute(
                "SELECT post_id, note_path FROM articles WHERE note_path IS NOT NULL"
            ).fetchall()
        return {r["post_id"]: r["note_path"] for r in rows}

    # ── Diff helpers ──────────────────────────────────────────────────────────

    def needs_update(self, post_id: int, modified: str, parser_version: int) -> bool:
        """True if the article is absent or was modified/parser changed."""
        row = self.get(post_id)
        if row is None:
            return True
        if row["status"] == "error":
            return True
        if row["modified"] != modified:
            return True
        if row["parser_version"] != parser_version:
            return True
        return False

    # ── Stats ─────────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        with self._conn() as con:
            total = con.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
            ok = con.execute("SELECT COUNT(*) FROM articles WHERE status='ok'").fetchone()[0]
            errors = con.execute("SELECT COUNT(*) FROM articles WHERE status='error'").fetchone()[0]
            issues = con.execute("SELECT COUNT(DISTINCT issue) FROM articles").fetchone()[0]
        return {"total": total, "ok": ok, "errors": errors, "issues": issues}

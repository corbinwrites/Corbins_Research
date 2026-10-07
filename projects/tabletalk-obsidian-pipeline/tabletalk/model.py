"""
model.py — Shared Article dataclass produced by both RestExtractor and HtmlExtractor.

All text fields arrive as plain Markdown strings (already cleaned by clean.py).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


Kind = Literal["daily", "feature", "column"]
Source = Literal["rest", "html"]


@dataclass
class Article:
    """Normalised record for one Tabletalk content item."""

    # ── Identity ──────────────────────────────────────────────────────────────
    post_id: int
    url: str
    kind: Kind

    # ── Issue context ─────────────────────────────────────────────────────────
    issue: str          # "YYYY-MM"
    issue_title: str    # e.g. "Assurance of Salvation"
    issue_id: int | None = None

    # ── Common metadata ───────────────────────────────────────────────────────
    title: str = ""
    authors: list[str] = field(default_factory=list)
    rubric: str = ""    # column department name, e.g. "Coram Deo"

    # ── Daily-study fields ────────────────────────────────────────────────────
    study_date: str = ""          # "YYYY-MM-DD" (weekday and weekend studies)
    weekend: bool = False
    passage: str = ""             # "1 John 2:9–11"
    scripture_text_md: str = ""   # blockquote-formatted scripture quotation
    coram_deo_md: str = ""
    further_study: list[str] = field(default_factory=list)
    bible_in_a_year: list[str] = field(default_factory=list)
    introduction: bool = False    # daily_studies_featured flag

    # ── Shared body ───────────────────────────────────────────────────────────
    body_md: str = ""

    # ── Provenance ────────────────────────────────────────────────────────────
    source: Source = "rest"
    modified: str = ""            # ISO-8601 from REST; empty for HTML-only items
    content_hash: str = ""        # SHA-256 of the canonical body text
    parser_version: int = 1

    # ── QA ────────────────────────────────────────────────────────────────────
    needs_review: bool = False
    lint_errors: list[str] = field(default_factory=list)

    # ── Raw reference (for re-extraction from cache) ──────────────────────────
    raw_ref: str = ""             # cache key: "rest:<post_id>" or "html:<url>"

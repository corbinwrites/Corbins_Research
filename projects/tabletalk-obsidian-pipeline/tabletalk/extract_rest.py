"""
extract_rest.py — Extracts Article records from WordPress REST API responses.

Daily studies are fetched in bulk (100/page) and have rich ACF fields.
This extractor handles both modern (2026) and historical (2009+) shapes.
"""

from __future__ import annotations

import hashlib
import logging
import re
from typing import Any

from .clean import fragment_to_md, scripture_to_blockquote
from .model import Article

logger = logging.getLogger(__name__)


# ── Reference list helpers ────────────────────────────────────────────────────

def _parse_reference_list(ref_list: list[dict]) -> list[str]:
    """
    Extract items from the ACF reference_list_left / _right structure.

    Shape: [{"list_header": "For further study", "list_item": [{"item": "Matt 5:21–24"}, …]}]
    """
    items: list[str] = []
    for group in (ref_list or []):
        for entry in group.get("list_item", []):
            val = (entry.get("item") or "").strip()
            if val:
                items.append(val)
    return items


# ── Display date parsing ──────────────────────────────────────────────────────

_DISPLAY_DATE_RE = re.compile(r"^(\d{4})(\d{2})(\d{2})$")


def _parse_display_date(display_date: str) -> str:
    """Convert 'YYYYMMDD' → 'YYYY-MM-DD'. Returns '' on failure."""
    if m := _DISPLAY_DATE_RE.match(str(display_date or "")):
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return ""


def _parse_issue(date_str: str) -> str:
    """Extract 'YYYY-MM' from 'YYYY-MM-DD'."""
    return date_str[:7] if len(date_str) >= 7 else ""


# ── Author resolution ─────────────────────────────────────────────────────────

def _resolve_authors(acf: dict) -> list[str]:
    """
    Attempt to resolve daily author from the ACF field.

    daily_author may be:
      - null / [] → anonymous (Tabletalk staff)
      - [int, …]  → contributor IDs (resolve via separate lookup if needed)
      - "string"  → already a name
    """
    author = acf.get("daily_author")
    if not author:
        return []
    if isinstance(author, str):
        return [author.strip()] if author.strip() else []
    if isinstance(author, list):
        # IDs — caller can enrich later; return placeholder for now
        return [f"contributor:{aid}" for aid in author if aid]
    return []


# ── Content hash ──────────────────────────────────────────────────────────────

def _content_hash(body_md: str) -> str:
    return hashlib.sha256(body_md.encode()).hexdigest()[:16]


# ── Main extractor ────────────────────────────────────────────────────────────

class RestExtractor:
    """Extract Article records from REST API JSON blobs."""

    def __init__(self, issue: str = "", issue_title: str = "", issue_id: int | None = None):
        self.issue = issue
        self.issue_title = issue_title
        self.issue_id = issue_id

    def extract_daily(self, raw: dict[str, Any]) -> Article | None:
        """
        Convert a single daily-study REST record to an Article.

        Handles both modern (weekday with all fields) and weekend/historical shapes.
        """
        try:
            return self._extract_daily_inner(raw)
        except Exception as exc:
            post_id = raw.get("id", 0)
            logger.error("RestExtractor.extract_daily(%d) failed: %s", post_id, exc)
            return None

    def _extract_daily_inner(self, raw: dict[str, Any]) -> Article:
        post_id: int = raw["id"]
        acf: dict = raw.get("acf") or {}
        title: str = (raw.get("title") or {}).get("rendered", "").strip()
        url: str = raw.get("link", "")
        modified: str = raw.get("modified", "")

        # ── Dates ──────────────────────────────────────────────────────────────
        study_date = _parse_display_date(acf.get("display_date", ""))
        issue = self.issue or _parse_issue(study_date)

        # ── Study type ────────────────────────────────────────────────────────
        weekend_flag = str(acf.get("weekday_or_weekend", "weekday")).lower() == "weekend"
        introduction = bool(acf.get("introduction", False))

        # ── Passage ───────────────────────────────────────────────────────────
        passage = (acf.get("scripture_reference") or "").strip()

        # ── Scripture text → blockquote Markdown ──────────────────────────────
        raw_scripture = (acf.get("scripture_text") or "").strip()
        scripture_text_md = scripture_to_blockquote(raw_scripture) if raw_scripture else ""

        # ── Body ──────────────────────────────────────────────────────────────
        raw_body = acf.get("body_content") or ""
        body_md = fragment_to_md(raw_body) if raw_body else ""

        # ── Coram Deo ─────────────────────────────────────────────────────────
        raw_coram = (acf.get("coram_deo") or "").strip()
        coram_deo_md = fragment_to_md(raw_coram) if raw_coram else ""

        # ── Reference lists ───────────────────────────────────────────────────
        further_study = _parse_reference_list(acf.get("reference_list_left") or [])
        bible_in_a_year = _parse_reference_list(acf.get("reference_list_right") or [])

        # ── Authors ───────────────────────────────────────────────────────────
        authors = _resolve_authors(acf)

        body_hash = _content_hash(body_md)

        return Article(
            post_id=post_id,
            url=url,
            kind="daily",
            issue=issue,
            issue_title=self.issue_title,
            issue_id=self.issue_id,
            title=title,
            authors=authors,
            study_date=study_date,
            weekend=weekend_flag,
            passage=passage,
            scripture_text_md=scripture_text_md,
            body_md=body_md,
            coram_deo_md=coram_deo_md,
            further_study=further_study,
            bible_in_a_year=bible_in_a_year,
            introduction=introduction,
            source="rest",
            modified=modified,
            content_hash=body_hash,
            raw_ref=f"rest:{post_id}",
        )

    def extract_daily_batch(self, records: list[dict]) -> list[Article]:
        """Process a batch of REST daily-study records."""
        articles = []
        for raw in records:
            article = self.extract_daily(raw)
            if article:
                articles.append(article)
        return articles

"""
extract_html.py — Extracts Article records from page HTML.

Used for:
  - Features and columns (REST content.rendered is empty)
  - Any daily study where REST extraction fails parity
  - Full fallback when REST is unavailable

Selector strategy comes from recon-findings.md.
"""

from __future__ import annotations

import hashlib
import logging
import re
from typing import Any

from selectolax.lexbor import LexborHTMLParser as HTMLParser, LexborNode as Node

from .clean import html_to_md, scripture_to_blockquote
from .model import Article

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _text(node: Node | None) -> str:
    if node is None:
        return ""
    return (node.text(deep=True) or "").strip()


def _inner_html(node: Node | None) -> str:
    if node is None:
        return ""
    return node.html or ""


def _content_hash(body_md: str) -> str:
    return hashlib.sha256(body_md.encode()).hexdigest()[:16]


# ── Daily study HTML extractor ────────────────────────────────────────────────

class DailyHtmlExtractor:
    """
    Extracts a single daily-study Article from page HTML.

    Selector map (from recon-findings.md §3):
      - .article__meta
      - section.article__body
        - .article__verse           → passage + scripture text
        - .drop-case                → body paragraphs
        - Coram Deo paragraph
        - .article__footnotes       → further study + bible in a year
    """

    def extract(
        self,
        html: str,
        *,
        url: str,
        post_id: int = 0,
        issue: str = "",
        issue_title: str = "",
        issue_id: int | None = None,
    ) -> Article | None:
        try:
            return self._extract_inner(
                html,
                url=url,
                post_id=post_id,
                issue=issue,
                issue_title=issue_title,
                issue_id=issue_id,
            )
        except Exception as exc:
            logger.error("DailyHtmlExtractor.extract(%s) failed: %s", url, exc)
            return None

    def _extract_inner(
        self,
        html: str,
        *,
        url: str,
        post_id: int,
        issue: str,
        issue_title: str,
        issue_id: int | None,
    ) -> Article:
        tree = HTMLParser(html)

        # ── Title ──────────────────────────────────────────────────────────────
        title = _text(tree.css_first(".article__header h1"))

        # ── Day number and weekday label ───────────────────────────────────────
        day_num = _text(tree.css_first(".article__number .font__lead-num"))
        day_of_week = _text(tree.css_first(".article__number .h6")).lower()
        weekend = day_of_week in ("saturday", "sunday")

        # ── Study date: infer from issue + day_num ─────────────────────────────
        study_date = ""
        if issue and day_num.isdigit():
            study_date = f"{issue}-{day_num.zfill(2)}"

        # ── Passage and scripture text ─────────────────────────────────────────
        verse_node = tree.css_first(".article__verse")
        passage = _text(verse_node.css_first("strong")) if verse_node else ""
        # Scripture text is the remaining text after the ref strong
        raw_scripture = ""
        if verse_node:
            raw_scripture = _text(verse_node).removeprefix(passage).strip()
        scripture_text_md = scripture_to_blockquote(raw_scripture) if raw_scripture else ""

        # ── Body ──────────────────────────────────────────────────────────────
        drop_case = tree.css_first(".drop-case.wysiwyg") or tree.css_first(".drop-case")
        body_md = html_to_md(_inner_html(drop_case)) if drop_case else ""

        # ── Coram Deo ──────────────────────────────────────────────────────────
        coram_deo_md = self._extract_coram_deo(tree)

        # ── Further study / Bible in a year ────────────────────────────────────
        further_study, bible_in_a_year = self._extract_footnotes(tree)

        body_hash = _content_hash(body_md)

        return Article(
            post_id=post_id,
            url=url,
            kind="daily",
            issue=issue,
            issue_title=issue_title,
            issue_id=issue_id,
            title=title,
            study_date=study_date,
            weekend=weekend,
            passage=passage,
            scripture_text_md=scripture_text_md,
            body_md=body_md,
            coram_deo_md=coram_deo_md,
            further_study=further_study,
            bible_in_a_year=bible_in_a_year,
            source="html",
            content_hash=body_hash,
            raw_ref=f"html:{url}",
        )

    def _extract_coram_deo(self, tree: HTMLParser) -> str:
        """
        The Coram Deo text lives in a <p> that immediately follows a
        <span class="h6 text-uppercase"> containing "Coram Deo".
        """
        for span in tree.css("span.h6.text-uppercase, span.text-uppercase"):
            if "coram deo" in _text(span).lower():
                parent = span.parent
                if parent:
                    # The Coram Deo paragraph may be the parent's next sibling
                    # or may follow inside .font-sans
                    for candidate in tree.css("p.font-sans"):
                        txt = _text(candidate)
                        if txt:
                            return html_to_md(candidate.html or txt)
                break
        return ""

    def _extract_footnotes(
        self, tree: HTMLParser
    ) -> tuple[list[str], list[str]]:
        """
        Parse .article__footnotes for 'For further study' and 'The bible in a year' lists.
        """
        further: list[str] = []
        biy: list[str] = []
        footnotes = tree.css_first(".article__footnotes")
        if not footnotes:
            return further, biy

        current: list[str] | None = None
        for child in footnotes.iter():
            tag = child.tag
            if tag in ("-text",):
                continue
            text = _text(child)
            low = text.lower()
            if "further study" in low:
                current = further
            elif "bible in a year" in low or "related scripture" in low:
                current = biy
            elif tag == "li" and current is not None:
                val = text.strip()
                if val:
                    current.append(val)

        return further, biy


# ── Article (feature / column) HTML extractor ─────────────────────────────────

class ArticleHtmlExtractor:
    """
    Extracts a feature or column Article from page HTML.

    Selector map (from recon-findings.md §3):
      - div.article__header
        - h1                                      → title
        - .header-base__column--first p.post-color → author
        - .single-taxonomy-column p               → rubric
      - .article__body → .wysiwyg                → prose
      - Discard: .share-buttons, .article__footer, .adjpst__section, .wayfinder
    """

    # CSS selectors for junk nodes to remove before body extraction
    _JUNK_SELECTORS = [
        ".share-buttons", ".article__footer", ".adjpst__section",
        ".wayfinder", ".article__audioplayer", "section.article__paywall",
    ]

    def extract(
        self,
        html: str,
        *,
        url: str,
        post_id: int = 0,
        kind: str = "feature",
        rubric: str = "",
        authors: list[str] | None = None,
        issue: str = "",
        issue_title: str = "",
        issue_id: int | None = None,
    ) -> Article | None:
        try:
            return self._extract_inner(
                html,
                url=url,
                post_id=post_id,
                kind=kind,
                rubric_hint=rubric,
                authors_hint=authors or [],
                issue=issue,
                issue_title=issue_title,
                issue_id=issue_id,
            )
        except Exception as exc:
            logger.error("ArticleHtmlExtractor.extract(%s) failed: %s", url, exc)
            return None

    def _extract_inner(
        self,
        html: str,
        *,
        url: str,
        post_id: int,
        kind: str,
        rubric_hint: str,
        authors_hint: list[str],
        issue: str,
        issue_title: str,
        issue_id: int | None,
    ) -> Article:
        tree = HTMLParser(html)

        # ── Remove junk nodes in-place ─────────────────────────────────────────
        for sel in self._JUNK_SELECTORS:
            for node in tree.css(sel):
                node.decompose()

        # ── Header ─────────────────────────────────────────────────────────────
        title = _text(tree.css_first("div.article__header h1"))
        if not title:
            title = _text(tree.css_first("h1"))

        # Author: prefer explicit hint from TOC; fall back to page
        if authors_hint:
            authors = authors_hint
        else:
            raw_author = _text(
                tree.css_first(".header-base__column--first p.post-color")
                or tree.css_first(".article__author")
            )
            authors = [raw_author] if raw_author else []

        # Rubric: prefer hint from TOC
        rubric = rubric_hint
        if not rubric:
            rubric = _text(tree.css_first(".single-taxonomy-column p"))

        # ── Body ──────────────────────────────────────────────────────────────
        wysiwyg = (
            tree.css_first("article.article__body .wysiwyg")
            or tree.css_first(".article__body .wysiwyg")
            or tree.css_first(".wysiwyg")
        )
        body_md = html_to_md(_inner_html(wysiwyg)) if wysiwyg else ""

        body_hash = _content_hash(body_md)

        return Article(
            post_id=post_id,
            url=url,
            kind=kind,  # type: ignore[arg-type]
            issue=issue,
            issue_title=issue_title,
            issue_id=issue_id,
            title=title,
            authors=authors,
            rubric=rubric,
            body_md=body_md,
            source="html",
            content_hash=body_hash,
            raw_ref=f"html:{url}",
        )

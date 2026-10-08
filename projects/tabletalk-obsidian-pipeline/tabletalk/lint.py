"""
lint.py — Article quality gate.

Lint failures set needs_review=True and append to article.lint_errors.
The note is still written; the flag prompts a human review.

Rules
-----
1. No template artifacts ({{ ... }}, U+FFFD, raw NBSP)
2. No HTML tags surviving in Markdown output
3. Weekday daily: passage, scripture_text_md, body_md, coram_deo_md all present
   Weekend daily (weekend=True): body_md only required
4. study_date falls within issue month
5. Body starts with a capital letter or opening quotation mark
6. Coverage: every manifest item produced exactly one note
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Sequence

from .model import Article


# ── Patterns ──────────────────────────────────────────────────────────────────

_TEMPLATE_RE = re.compile(r"\{\{[^}]+\}\}")
_FFFD_RE = re.compile(r"\ufffd")
_NBSP_RE = re.compile(r"\u00a0")
_HTML_TAG_RE = re.compile(r"<[a-zA-Z/][^>]*>")
_OPENS_WITH_CAPITAL_OR_QUOTE = re.compile(r'^[A-Z"\u201c\u2018\'"(]')


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class LintResult:
    passed: bool
    errors: list[str]


# ── Per-article lint ──────────────────────────────────────────────────────────

def lint_article(article: Article) -> LintResult:
    """Run all lint rules against a single article. Mutates article in-place."""
    errors: list[str] = []

    # ── Rule 1: No template artifacts ─────────────────────────────────────────
    all_text = "\n".join([
        article.body_md,
        article.scripture_text_md,
        article.coram_deo_md,
        article.title,
    ])
    if _TEMPLATE_RE.search(all_text):
        errors.append("Template artifact ({{ ... }}) found in output")
    if _FFFD_RE.search(all_text):
        errors.append("Replacement character U+FFFD found — possible encoding error")
    if _NBSP_RE.search(all_text):
        errors.append("Non-breaking space (U+00A0) survived cleaning")

    # ── Rule 2: No surviving HTML tags ────────────────────────────────────────
    if _HTML_TAG_RE.search(article.body_md):
        errors.append("Surviving HTML tags in body_md")

    # ── Rule 3: Required fields by study type ─────────────────────────────────
    if article.kind == "daily":
        if not article.body_md.strip():
            errors.append("body_md is empty")
        if not article.weekend:
            if not article.passage.strip():
                errors.append("weekday daily: passage is empty")
            if not article.scripture_text_md.strip():
                errors.append("weekday daily: scripture_text_md is empty")
            if not article.coram_deo_md.strip():
                errors.append("weekday daily: coram_deo_md is empty")

    # ── Rule 4: study_date in issue month ─────────────────────────────────────
    if article.kind == "daily" and article.study_date and article.issue:
        if not article.study_date.startswith(article.issue):
            errors.append(
                f"study_date {article.study_date!r} does not fall in issue {article.issue!r}"
            )

    # ── Rule 5: Body starts with capital or opening quote ─────────────────────
    body_stripped = article.body_md.strip()
    if body_stripped and not _OPENS_WITH_CAPITAL_OR_QUOTE.match(body_stripped):
        errors.append(
            f"body_md starts with unexpected character: {body_stripped[:20]!r}"
        )

    passed = len(errors) == 0
    if not passed:
        article.needs_review = True
        article.lint_errors = errors

    return LintResult(passed=passed, errors=errors)


# ── Coverage lint ─────────────────────────────────────────────────────────────

@dataclass
class CoverageResult:
    missing: list[str]
    extra: list[str]
    passed: bool


def lint_coverage(
    manifest_urls: Sequence[str],
    produced_urls: Sequence[str],
) -> CoverageResult:
    """
    Compare a manifest's expected URLs against the set that actually produced notes.

    ``manifest_urls``: every URL the TOC listed.
    ``produced_urls``: every URL that produced an Article successfully.
    """
    expected = set(manifest_urls)
    produced = set(produced_urls)
    missing = sorted(expected - produced)
    extra = sorted(produced - expected)
    return CoverageResult(
        missing=missing,
        extra=extra,
        passed=not missing and not extra,
    )


# ── Batch lint ────────────────────────────────────────────────────────────────

def lint_batch(articles: list[Article]) -> tuple[list[Article], list[Article]]:
    """
    Run lint on a list of articles.

    Returns:
        (clean, flagged) — two lists; articles appear in exactly one.
    """
    clean: list[Article] = []
    flagged: list[Article] = []
    for article in articles:
        result = lint_article(article)
        if result.passed:
            clean.append(article)
        else:
            flagged.append(article)
    return clean, flagged

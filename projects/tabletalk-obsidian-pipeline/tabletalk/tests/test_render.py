"""
tests/test_render.py — Unit tests for the note renderer.
"""

from __future__ import annotations

import pytest

from tabletalk.model import Article
from tabletalk.render import (
    safe_filename,
    render_daily,
    render_article,
    _article_base_filename,
    _preserve_user_region,
    _USER_REGION_MARKER,
)


# ── Filename safety ───────────────────────────────────────────────────────────

def test_safe_filename_strips_illegal_chars():
    name = "Assurance: God's Plan [Vol. 1] | <Test>"
    result = safe_filename(name)
    assert ":" not in result
    assert "[" not in result
    assert "]" not in result
    assert "<" not in result
    assert ">" not in result
    assert "|" not in result


def test_safe_filename_caps_length():
    long_name = "A" * 200
    result = safe_filename(long_name)
    assert len(result) <= 120


def test_safe_filename_collapses_whitespace():
    name = "Too   many   spaces"
    result = safe_filename(name)
    assert "  " not in result


# ── Base filename logic ───────────────────────────────────────────────────────

def test_daily_filename():
    article = Article(
        post_id=123, url="https://example.com", kind="daily",
        issue="2026-09", issue_title="Test Issue",
        title="Whoever Loves His Brother", study_date="2026-09-29",
    )
    name = _article_base_filename(article)
    assert name.startswith("Daily - 2026-09-29 - ")
    assert "Whoever Loves His Brother" in name


def test_feature_filename():
    article = Article(
        post_id=200, url="https://example.com", kind="feature",
        issue="2026-09", issue_title="Test Issue",
        title="The Ground of Assurance",
    )
    name = _article_base_filename(article)
    assert name.startswith("Feature - ")
    assert "Ground of Assurance" in name


def test_column_filename_with_rubric():
    article = Article(
        post_id=201, url="https://example.com", kind="column",
        issue="2026-09", issue_title="Test Issue",
        title="Secure in Christ", rubric="Coram Deo",
    )
    name = _article_base_filename(article)
    assert "Column" in name
    assert "Coram Deo" in name
    assert "Secure in Christ" in name


# ── Daily study rendering ─────────────────────────────────────────────────────

@pytest.fixture
def weekday_article():
    return Article(
        post_id=32657,
        url="https://tabletalkmagazine.com/daily-study/2026/09/whoever-loves-his-brother/",
        kind="daily",
        issue="2026-09",
        issue_title="Assurance of Salvation",
        title="Whoever Loves His Brother",
        study_date="2026-09-29",
        weekend=False,
        passage="1 John 2:9–11",
        scripture_text_md="> [!quote]\n> Scripture text here.",
        body_md="John has described the love commandment.",
        coram_deo_md="Examine yourself today.",
        further_study=["Matthew 5:21–24", "John 15:12–17"],
        bible_in_a_year=["Isaiah 18–20", "Ephesians 4"],
        source="rest",
        content_hash="abc123",
    )


def test_daily_renders_frontmatter(weekday_article):
    md = render_daily(weekday_article)
    assert "---" in md
    assert "type: tabletalk-daily-study" in md
    assert "post_id: 32657" in md
    assert "passage: 1 John 2:9\u201311" in md
    assert "weekend: false" in md


def test_daily_renders_body(weekday_article):
    md = render_daily(weekday_article)
    assert "> [!quote]" in md
    assert "John has described the love commandment." in md
    assert "## Coram Deo" in md
    assert "Examine yourself today." in md
    assert "## For further study" in md
    assert "- Matthew 5:21–24" in md
    assert "## The Bible in a year" in md
    assert "- Isaiah 18–20" in md


def test_daily_has_user_region_marker(weekday_article):
    md = render_daily(weekday_article)
    assert _USER_REGION_MARKER in md


def test_daily_issue_wikilink(weekday_article):
    md = render_daily(weekday_article)
    assert "[[00 Issue]]" in md


# ── User region preservation ──────────────────────────────────────────────────

def test_user_region_preserved():
    existing = (
        "# Existing note\n\nMachine content.\n\n"
        f"{_USER_REGION_MARKER}\n\nMy personal notes here."
    )
    new_machine = "# Updated note\n\nNew machine content.\n\n"
    result = _preserve_user_region(existing, new_machine)
    assert "My personal notes here." in result
    assert "New machine content." in result


def test_user_region_not_present():
    existing = "# No marker"
    new = "# New content"
    result = _preserve_user_region(existing, new)
    assert result == new


# ── Article rendering ─────────────────────────────────────────────────────────

def test_article_renders_frontmatter():
    article = Article(
        post_id=32582,
        url="https://tabletalkmagazine.com/article/2026/09/assurance-in-scripture/",
        kind="feature",
        issue="2026-09",
        issue_title="Assurance of Salvation",
        title="Assurance of Salvation in Scripture",
        authors=["Cornelis P. Venema"],
        body_md="Although the assurance of salvation brings joy...",
        source="html",
        content_hash="def456",
    )
    md = render_article(article)
    assert "type: tabletalk-article" in md
    assert "kind: feature" in md
    assert "Cornelis P. Venema" in md
    assert "Although the assurance" in md
    assert _USER_REGION_MARKER in md

"""
tests/test_lint.py — Unit tests for the lint gate.
"""

from __future__ import annotations

import pytest

from tabletalk.lint import lint_article, lint_coverage
from tabletalk.model import Article


def _make_weekday(**kwargs) -> Article:
    defaults = dict(
        post_id=1,
        url="https://tabletalkmagazine.com/daily-study/2026/09/test/",
        kind="daily",
        issue="2026-09",
        issue_title="Test Issue",
        title="Test Title",
        study_date="2026-09-15",
        weekend=False,
        passage="1 John 2:9",
        scripture_text_md="> [!quote]\n> Scripture.",
        body_md="Body content here.",
        coram_deo_md="Coram Deo content.",
    )
    defaults.update(kwargs)
    return Article(**defaults)


def _make_weekend(**kwargs) -> Article:
    defaults = dict(
        post_id=2,
        url="https://tabletalkmagazine.com/daily-study/2015/05/test/",
        kind="daily",
        issue="2015-05",
        issue_title="Test Issue",
        title="Weekend Title",
        study_date="2015-05-02",
        weekend=True,
        body_md="Weekend body here.",
    )
    defaults.update(kwargs)
    return Article(**defaults)


# ── Passing cases ─────────────────────────────────────────────────────────────

def test_weekday_all_fields_passes():
    article = _make_weekday()
    result = lint_article(article)
    assert result.passed
    assert not article.needs_review


def test_weekend_body_only_passes():
    article = _make_weekend()
    result = lint_article(article)
    assert result.passed


# ── Rule violations ───────────────────────────────────────────────────────────

def test_template_artifact_fails():
    article = _make_weekday(body_md="{{ template_var }}")
    result = lint_article(article)
    assert not result.passed
    assert any("template" in e.lower() for e in result.errors)
    assert article.needs_review


def test_fffd_fails():
    article = _make_weekday(body_md="Some text \ufffd here.")
    result = lint_article(article)
    assert not result.passed


def test_surviving_html_fails():
    article = _make_weekday(body_md="<p>HTML survived.</p>")
    result = lint_article(article)
    assert not result.passed
    assert any("html" in e.lower() for e in result.errors)


def test_weekday_missing_passage():
    article = _make_weekday(passage="")
    result = lint_article(article)
    assert not result.passed
    assert any("passage" in e for e in result.errors)


def test_weekday_missing_scripture_text():
    article = _make_weekday(scripture_text_md="")
    result = lint_article(article)
    assert not result.passed


def test_weekday_missing_coram_deo():
    article = _make_weekday(coram_deo_md="")
    result = lint_article(article)
    assert not result.passed


def test_weekday_missing_body():
    article = _make_weekday(body_md="")
    result = lint_article(article)
    assert not result.passed


def test_study_date_not_in_issue():
    article = _make_weekday(study_date="2026-10-15", issue="2026-09")
    result = lint_article(article)
    assert not result.passed
    assert any("study_date" in e for e in result.errors)


def test_body_lowercase_start_fails():
    article = _make_weekday(body_md="and in the beginning...")
    result = lint_article(article)
    assert not result.passed


def test_body_quote_start_passes():
    article = _make_weekday(body_md="\u201cIn the beginning...\u201d")
    result = lint_article(article)
    assert result.passed


# ── Coverage ──────────────────────────────────────────────────────────────────

def test_coverage_perfect():
    manifest = ["https://a.com/1", "https://a.com/2"]
    produced = ["https://a.com/1", "https://a.com/2"]
    result = lint_coverage(manifest, produced)
    assert result.passed
    assert result.missing == []
    assert result.extra == []


def test_coverage_missing():
    manifest = ["https://a.com/1", "https://a.com/2"]
    produced = ["https://a.com/1"]
    result = lint_coverage(manifest, produced)
    assert not result.passed
    assert "https://a.com/2" in result.missing


def test_coverage_extra():
    manifest = ["https://a.com/1"]
    produced = ["https://a.com/1", "https://a.com/extra"]
    result = lint_coverage(manifest, produced)
    assert not result.passed
    assert "https://a.com/extra" in result.extra

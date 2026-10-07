"""
tests/test_discover.py — Unit tests for discovery utilities.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tabletalk.discover import (
    _classify_url,
    extract_issue_id,
    fetch_issue_toc,
    IssueToc,
)

FIXTURES = Path(__file__).parent / "fixtures"


# ── URL classification ────────────────────────────────────────────────────────

def test_classify_issue_url():
    url = "https://tabletalkmagazine.com/issue/2026/09/assurance-of-salvation/"
    entry = _classify_url(url)
    assert entry.kind == "issue"
    assert entry.year == 2026
    assert entry.month == 9


def test_classify_daily_study_url():
    url = "https://tabletalkmagazine.com/daily-study/2026/09/whoever-loves-his-brother/"
    entry = _classify_url(url)
    assert entry.kind == "daily-study"
    assert entry.year == 2026
    assert entry.month == 9


def test_classify_article_url():
    url = "https://tabletalkmagazine.com/article/2026/09/assurance-in-scripture/"
    entry = _classify_url(url)
    assert entry.kind == "article"


def test_classify_post_url():
    url = "https://tabletalkmagazine.com/posts/some-blog-post/"
    entry = _classify_url(url)
    assert entry.kind == "post"


def test_classify_contributor_url():
    url = "https://tabletalkmagazine.com/contributor/r-c-sproul/"
    entry = _classify_url(url)
    assert entry.kind == "contributor"


# ── Issue ID extraction ───────────────────────────────────────────────────────

def test_extract_issue_id_from_html():
    html = '<div class="toc toc-static" data-issue-id="32578"></div>'
    assert extract_issue_id(html) == 32578


def test_extract_issue_id_single_quotes():
    html = "<div data-issue-id='12345'></div>"
    assert extract_issue_id(html) == 12345


def test_extract_issue_id_not_found():
    html = "<div class='no-id'></div>"
    assert extract_issue_id(html) is None


# ── TOC parsing ───────────────────────────────────────────────────────────────

class _MockClient:
    """Minimal mock client that returns fixture JSON."""
    def __init__(self, fixture_path: Path):
        self._data = json.loads(fixture_path.read_text())
        self._using_fallback_ua = False

    def post_json(self, url, *, data=None, cache=True):
        return self._data


def test_fetch_issue_toc_parses_correctly():
    client = _MockClient(FIXTURES / "issue_toc_2026_09.json")
    toc = fetch_issue_toc(client, 32578, "https://tabletalkmagazine.com/issue/2026/09/test/")

    assert toc.issue_title == "Assurance of Salvation"
    assert toc.issue_date == "September 2026"
    assert len(toc.articles) == 3
    assert len(toc.dailies) == 4
    assert len(toc.featured_dailies) == 1


def test_toc_articles_parsed():
    client = _MockClient(FIXTURES / "issue_toc_2026_09.json")
    toc = fetch_issue_toc(client, 32578, "https://tabletalkmagazine.com/issue/2026/09/test/")

    # First article is a column
    col = toc.articles[0]
    assert col.title == "Secure in Christ"
    assert "column" in col.content_type.lower()
    assert col.rubric == "Coram Deo"
    assert "Brewer" in col.author

    # Second is a feature
    feat = toc.articles[1]
    assert feat.content_type == "feature"
    assert "Venema" in feat.author


def test_toc_featured_daily_has_introduction_flag():
    client = _MockClient(FIXTURES / "issue_toc_2026_09.json")
    toc = fetch_issue_toc(client, 32578, "https://tabletalkmagazine.com/issue/2026/09/test/")
    featured = toc.featured_dailies[0]
    assert featured.introduction is True
    assert featured.title == "Walking in the Light"

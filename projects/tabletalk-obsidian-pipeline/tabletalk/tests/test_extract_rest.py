"""
tests/test_extract_rest.py — Unit tests for the REST extractor.

Covers modern weekday daily (2026), historical weekend daily (2015),
reference list parsing, and content hash stability.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tabletalk.extract_rest import RestExtractor, _parse_display_date, _parse_reference_list

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def weekday_raw():
    return json.loads((FIXTURES / "daily_weekday_2026.json").read_text())


@pytest.fixture
def weekend_raw():
    return json.loads((FIXTURES / "daily_weekend_2015.json").read_text())


# ── Date parsing ──────────────────────────────────────────────────────────────

def test_parse_display_date_modern():
    assert _parse_display_date("20260929") == "2026-09-29"


def test_parse_display_date_historical():
    assert _parse_display_date("20150502") == "2015-05-02"


def test_parse_display_date_empty():
    assert _parse_display_date("") == ""
    assert _parse_display_date(None) == ""


# ── Reference lists ───────────────────────────────────────────────────────────

def test_parse_reference_list_populated():
    data = [{"list_header": "For further study", "list_item": [
        {"item": "Matthew 5:21–24"},
        {"item": "John 15:12–17"},
    ]}]
    result = _parse_reference_list(data)
    assert result == ["Matthew 5:21–24", "John 15:12–17"]


def test_parse_reference_list_empty_items():
    data = [{"list_header": "For Further Study", "list_item": [
        {"item": ""}, {"item": ""}, {"item": ""},
    ]}]
    result = _parse_reference_list(data)
    assert result == []  # empty strings stripped


def test_parse_reference_list_empty():
    assert _parse_reference_list([]) == []
    assert _parse_reference_list(None) == []


# ── Weekday daily extraction ──────────────────────────────────────────────────

class TestWeekdayDaily:
    def setup_method(self):
        self.extractor = RestExtractor(issue="2026-09", issue_title="Assurance of Salvation")

    def test_basic_fields(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert article is not None
        assert article.post_id == 32657
        assert article.title == "Whoever Loves His Brother"
        assert article.kind == "daily"
        assert article.issue == "2026-09"
        assert article.issue_title == "Assurance of Salvation"

    def test_study_date(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert article.study_date == "2026-09-29"

    def test_not_weekend(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert article.weekend is False

    def test_passage(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert "1 John" in article.passage
        assert "2:9" in article.passage

    def test_scripture_text_is_blockquote(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert article.scripture_text_md.startswith("> [!quote]")
        assert "darkness" in article.scripture_text_md

    def test_body_not_empty(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert len(article.body_md) > 50

    def test_coram_deo(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert "Examine yourself" in article.coram_deo_md

    def test_further_study(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert "Matthew 5:21–24" in article.further_study
        assert "John 15:12–17" in article.further_study

    def test_bible_in_a_year(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert "Isaiah 18–20" in article.bible_in_a_year
        assert "Ephesians 4" in article.bible_in_a_year

    def test_source_is_rest(self, weekday_raw):
        article = self.extractor.extract_daily(weekday_raw)
        assert article.source == "rest"
        assert article.raw_ref == "rest:32657"

    def test_content_hash_stable(self, weekday_raw):
        a1 = self.extractor.extract_daily(weekday_raw)
        a2 = self.extractor.extract_daily(weekday_raw)
        assert a1.content_hash == a2.content_hash
        assert len(a1.content_hash) == 16


# ── Weekend daily extraction ──────────────────────────────────────────────────

class TestWeekendDaily:
    def setup_method(self):
        self.extractor = RestExtractor(issue="2015-05", issue_title="Test Issue")

    def test_basic_fields(self, weekend_raw):
        article = self.extractor.extract_daily(weekend_raw)
        assert article is not None
        assert article.post_id == 8049
        assert article.weekend is True

    def test_study_date(self, weekend_raw):
        article = self.extractor.extract_daily(weekend_raw)
        assert article.study_date == "2015-05-02"

    def test_no_passage(self, weekend_raw):
        article = self.extractor.extract_daily(weekend_raw)
        assert article.passage == ""
        assert article.scripture_text_md == ""

    def test_html_body_cleaned(self, weekend_raw):
        """HTML markup in body_content must be cleaned to Markdown."""
        article = self.extractor.extract_daily(weekend_raw)
        assert "<p>" not in article.body_md
        assert "&rsquo;" not in article.body_md
        assert "Psalm 88" in article.body_md

    def test_no_coram_deo(self, weekend_raw):
        article = self.extractor.extract_daily(weekend_raw)
        assert article.coram_deo_md == ""

    def test_empty_reference_lists_filtered(self, weekend_raw):
        """Empty items in reference lists should be filtered out."""
        article = self.extractor.extract_daily(weekend_raw)
        assert article.further_study == []
        assert article.bible_in_a_year == []

    def test_author_is_contributor_placeholder(self, weekend_raw):
        """daily_author=[6755] → contributor:6755 placeholder."""
        article = self.extractor.extract_daily(weekend_raw)
        assert "contributor:6755" in article.authors

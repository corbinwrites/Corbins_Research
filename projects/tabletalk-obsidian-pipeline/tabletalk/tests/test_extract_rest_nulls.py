"""
tests/test_extract_rest_nulls.py — ACF null-handling regressions.

The featured intro study returned null for list_item, which crashed extraction
("'NoneType' object is not iterable") and silently dropped the note.
"""

from __future__ import annotations

from tabletalk.extract_rest import RestExtractor, _parse_reference_list


def test_list_item_null():
    assert _parse_reference_list([{"list_header": "x", "list_item": None}]) == []


def test_group_null_and_entry_null():
    assert _parse_reference_list([None, {"list_item": [None, {"item": None}]}]) == []


def test_mixed_valid_and_null():
    data = [
        {"list_item": None},
        {"list_item": [{"item": "John 3:16"}, None, {"item": "  "}]},
    ]
    assert _parse_reference_list(data) == ["John 3:16"]


def test_featured_daily_with_null_lists_extracts():
    raw = {
        "id": 99999,
        "link": "https://tabletalkmagazine.com/daily-study/2026/10/intro/",
        "modified": "2026-09-01T00:00:00",
        "title": {"rendered": "Introduction"},
        "acf": {
            "weekday_or_weekend": "weekday",
            "display_date": "20261001",
            "introduction": True,
            "scripture_reference": "",
            "scripture_text": "",
            "body_content": "<p>Welcome to this issue.</p>",
            "coram_deo": "",
            "reference_list_left": [{"list_header": "For further study", "list_item": None}],
            "reference_list_right": None,
        },
    }
    article = RestExtractor(issue="2026-10", issue_title="Faith and Work").extract_daily(raw)
    assert article is not None
    assert article.introduction is True
    assert article.further_study == []
    assert article.bible_in_a_year == []

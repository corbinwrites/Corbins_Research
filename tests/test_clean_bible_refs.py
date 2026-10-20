import pytest
from scripts.tools.clean_bible_refs import clean_markdown_text

def test_clean_bible_esv_wikilink():
    raw = "2. God communicates by verbalizing His thoughts (2 Timothy 3:16, [[Bible/ESV/2 Peter/2 Pet 1#21|2 Peter 1:21]])"
    expected = "2. God communicates by verbalizing His thoughts (2 Timothy 3:16, 2 Peter 1:21)"
    assert clean_markdown_text(raw) == expected

def test_clean_bible_esv_wikilink_escaped_pipe():
    raw = "| Purpose | so that | Goal | [[Bible/ESV/1 Peter/1 Pet 2#9\\|1 Peter 2:9]] — But you are a chosen race |"
    expected = "| Purpose | so that | Goal | 1 Peter 2:9 — But you are a chosen race |"
    assert clean_markdown_text(raw) == expected

def test_clean_invisible_range_links():
    raw = "[[Rom 5#v12|Romans 5:12–17]] [[Rom 5#v13|]][[Rom 5#v14|]]"
    expected = "Romans 5:12–17 "
    assert clean_markdown_text(raw) == expected

def test_clean_generic_bible_linker_link():
    raw = "See [[Rom 8#v28|Romans 8:28]] for more."
    expected = "See Romans 8:28 for more."
    assert clean_markdown_text(raw) == expected

def test_preserves_non_bible_links():
    raw = "Check out [[00 Issue]], [[Author Name]], and [[Chapter 10 Silence and Solitude|Chapter 10]]."
    assert clean_markdown_text(raw) == raw

def test_preserves_plain_text():
    raw = "God is perfect (1 John 1:5, 3:5) and (Psalm 19:7, 119:130)."
    assert clean_markdown_text(raw) == raw

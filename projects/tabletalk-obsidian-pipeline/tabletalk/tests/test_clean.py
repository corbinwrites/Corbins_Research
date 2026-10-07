"""
tests/test_clean.py — Unit tests for the HTML→Markdown cleaner.
"""

from __future__ import annotations

import pytest

from tabletalk.clean import html_to_md, fragment_to_md, scripture_to_blockquote


# ── Basic tag handling ────────────────────────────────────────────────────────

def test_plain_paragraphs():
    html = "<p>First paragraph.</p><p>Second paragraph.</p>"
    md = html_to_md(html)
    assert "First paragraph." in md
    assert "Second paragraph." in md


def test_bold_and_em():
    html = "<p>This is <strong>bold</strong> and <em>italic</em>.</p>"
    md = html_to_md(html)
    assert "**bold**" in md
    assert "*italic*" in md


def test_blockquote():
    html = "<blockquote><p>A quote.</p></blockquote>"
    md = html_to_md(html)
    assert "> A quote." in md


def test_unordered_list():
    html = "<ul><li>First</li><li>Second</li></ul>"
    md = html_to_md(html)
    assert "- First" in md
    assert "- Second" in md


def test_heading():
    html = "<h2>Section Title</h2>"
    md = html_to_md(html)
    assert "## Section Title" in md


def test_html_entities_decoded():
    html = "<p>God&rsquo;s Word is true. &ldquo;Yes.&rdquo;</p>"
    md = html_to_md(html)
    assert "God\u2019s Word" in md
    assert "\u201cYes.\u201d" in md


def test_nbsp_removed():
    html = "<p>word\u00a0another</p>"
    md = html_to_md(html)
    assert "\u00a0" not in md
    assert "word another" in md


def test_no_script_tags():
    html = "<p>Text</p><script>alert('xss')</script>"
    md = html_to_md(html)
    assert "script" not in md
    assert "alert" not in md


def test_empty_input():
    assert html_to_md("") == ""
    assert html_to_md("   ") == ""


def test_junk_classes_discarded():
    html = """
    <div>
        <p>Good content.</p>
        <div class="share-buttons">Share stuff</div>
        <div class="article__audioplayer">Audio</div>
    </div>
    """
    md = html_to_md(html)
    assert "Good content." in md
    assert "Share stuff" not in md
    assert "Audio" not in md


def test_link_preserved():
    html = '<p>See <a href="https://example.com">this site</a>.</p>'
    md = html_to_md(html)
    assert "[this site](https://example.com)" in md


def test_multiple_blank_lines_collapsed():
    html = "<p>A</p><p>B</p><p>C</p>"
    md = html_to_md(html)
    # Should not have 3+ consecutive newlines
    assert "\n\n\n" not in md


# ── Scripture blockquote ──────────────────────────────────────────────────────

def test_scripture_to_blockquote_single_line():
    text = "For God so loved the world."
    result = scripture_to_blockquote(text)
    assert result.startswith("> [!quote]")
    assert "> For God so loved the world." in result


def test_scripture_to_blockquote_empty():
    assert scripture_to_blockquote("") == ""
    assert scripture_to_blockquote("   ") == ""


def test_scripture_to_blockquote_multiline():
    text = "Line one.\nLine two."
    result = scripture_to_blockquote(text)
    assert "> Line one." in result
    assert "> Line two." in result


# ── Historical content (HTML markup in REST body) ─────────────────────────────

def test_historical_weekend_body():
    """Body with <p>, <span>, HTML entities should clean to plain Markdown."""
    html = (
        '<p>Psalm 88 is one of the most disturbing expressions of despair '
        'in the entire Bible. &ldquo;Darkness is my closest friend.&rdquo;</p>'
    )
    md = fragment_to_md(html)
    assert "<p>" not in md
    assert "&ldquo;" not in md
    assert "Psalm 88" in md
    assert "\u201c" in md or "\u201cDarkness" in md


# ── Obsidian escaping ─────────────────────────────────────────────────────────

def test_hashtag_escaped():
    html = "<p>Read #Psalm for context.</p>"
    md = html_to_md(html)
    # # followed by word should be escaped
    assert "\\#Psalm" in md

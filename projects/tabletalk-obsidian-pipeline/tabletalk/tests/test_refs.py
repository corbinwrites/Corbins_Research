"""
tests/test_refs.py — Scripture reference detection and linking.
"""

from __future__ import annotations

import pytest

from tabletalk.refs import BibleLinker, normalize_ref, parse_refs

L = BibleLinker(range_links=False)   # exact-output tests
R = BibleLinker()                    # default: invisible range links


def link(text: str) -> str:
    return L.link_markdown(text)


# ── Basic linking ─────────────────────────────────────────────────────────────

def test_verse():
    assert link("See Romans 8:28.") == "See [[Rom 8#v28|Romans 8:28]]."


def test_abbrev_with_period_and_parens():
    assert link("(Ps. 23:1)") == "([[Ps 23#v1|Ps. 23:1]])"


def test_numbered_book_and_range():
    assert link("1 John 2:9–11") == "[[1 John 2#v9|1 John 2:9–11]]"


def test_spelled_out_numeral():
    assert link("Second Corinthians 5:17") == "[[2 Cor 5#v17|Second Corinthians 5:17]]"


def test_chapter_only():
    assert link("Romans 8") == "[[Rom 8|Romans 8]]"


def test_chapter_range_links_first_chapter():
    assert link("Isaiah 18–20") == "[[Isa 18|Isaiah 18–20]]"


def test_cross_chapter_range():
    assert link("Luke 3:16–4:2") == "[[Luke 3#v16|Luke 3:16–4:2]]"


def test_single_chapter_books():
    assert link("Jude 3") == "[[Jude 1#v3|Jude 3]]"
    assert link("2 John 6") == "[[2 John 1#v6|2 John 6]]"


def test_multiword_book():
    assert link("Song of Solomon 2:4") == "[[Song 2#v4|Song of Solomon 2:4]]"


# ── Context carry-forward ─────────────────────────────────────────────────────

def test_bare_verses_use_last_ref():
    out = link("In Ephesians 2:8 we read; see vv. 9–10 and verse 12.")
    assert "[[Eph 2#v9|vv. 9–10]]" in out
    assert "[[Eph 2#v12|verse 12]]" in out


def test_bare_verse_without_context_not_linked():
    assert link("see vv. 9–10") == "see vv. 9–10"


def test_semicolon_continuation():
    out = link("Rom. 3:23; 6:23; 8:1–4")
    assert out == "[[Rom 3#v23|Rom. 3:23]]; [[Rom 6#v23|6:23]]; [[Rom 8#v1|8:1–4]]"


def test_seeded_context_from_passage():
    ctx = L.new_context("1 John 2:9–11")
    assert L.link_markdown("(vv. 9–11)", ctx) == "([[1 John 2#v9|vv. 9–11]])"


# ── False positives ───────────────────────────────────────────────────────────

@pytest.mark.parametrize("text", [
    "He is 3 years old.",
    "We met at 10:30 today.",
    "his 3 sons",
    "Mark my words",
    "Acts of kindness",
    "Phil 4 is a name",
    "romans 8:28 lowercase is left alone",
    "3 Samuel 4:1 does not exist",
])
def test_not_linked(text):
    assert link(text) == text


def test_ambiguous_short_name_needs_verse():
    assert link("Phil 4:13") == "[[Phil 4#v13|Phil 4:13]]"


# ── Protected regions ─────────────────────────────────────────────────────────

def test_existing_links_code_urls_untouched():
    text = (
        "[[Gen 1#v1|Genesis 1:1]] [Rom 8:1](http://x.com/a) "
        "`John 3:16` http://a.com/John3:16"
    )
    assert link(text) == text


def test_headings_and_fences_skipped():
    text = "## John 3:16\n\n```\nJohn 3:16\n```\n"
    assert link(text) == text


def test_callout_skipped():
    text = "> [!quote]\n> Isaiah 53:5 text\n\nBody Romans 8:28."
    out = link(text)
    assert "> Isaiah 53:5 text" in out
    assert "[[Rom 8#v28|Romans 8:28]]" in out


def test_further_study_and_bible_in_a_year_never_linked():
    text = (
        "Body John 3:16.\n\n"
        "## Coram Deo\n\nSee Romans 8:28.\n\n"
        "## For further study\n\n- John 14:15–21\n- 1 John 5:1–3\n\n"
        "## The Bible in a year\n\n- Proverbs 21–22\n\n"
        "<!-- tt:end -->"
    )
    out = link(text)
    assert "[[John 3#v16|John 3:16]]" in out
    assert "[[Rom 8#v28|Romans 8:28]]" in out
    assert "- John 14:15–21" in out
    assert "- 1 John 5:1–3" in out
    assert "- Proverbs 21–22" in out
    assert out.count("[[") == 2


def test_related_scripture_not_linked():
    text = "## Related Scripture\n\n- John 1:1"
    assert link(text) == text


# ── Round trip / idempotence ──────────────────────────────────────────────────

@pytest.mark.parametrize("text", [
    "Luke 3:16–4:2 then v. 3.",
    "Matt. 5:3, Jn 3:16 and Mark 4 and Job 38–41.",
    "Rom. 3:23; 6:23 and Psalm 119:105a.",
])
def test_unlink_roundtrip_and_idempotent(text):
    linked = link(text)
    assert L.unlink_markdown(linked) == text
    assert link(linked) == linked


def test_unlink_leaves_non_scripture_links():
    text = "[[00 Issue]] and [[Some Note|some words]]"
    assert L.unlink_markdown(text) == text


# ── Configuration ─────────────────────────────────────────────────────────────

def test_custom_template_and_prefix():
    custom = BibleLinker(chapter_note="{book_full}-{chapter:02d}", verse_prefix="#")
    assert custom.link_markdown("Gen. 1:1") == "[[Genesis-01#1|Gen. 1:1]]"
    assert custom.link_markdown("Psalm 3") == "[[Psalm-03|Psalm 3]]"


def test_abbreviation_override():
    custom = BibleLinker(abbreviations={"Psalm": "Psa", "1 John": "1Jn"})
    assert custom.link_markdown("Psalm 23:1") == "[[Psa 23#v1|Psalm 23:1]]"
    assert custom.link_markdown("1 John 1:9") == "[[1Jn 1#v9|1 John 1:9]]"


# ── Helpers ───────────────────────────────────────────────────────────────────

def test_parse_refs():
    assert parse_refs("1 Jn 2:9-11; 3:1") == ["1 John 2:9–11", "1 John 3:1"]


def test_normalize_ref():
    assert normalize_ref("1 Jn 2:9-11") == "1 John 2:9–11"
    assert normalize_ref("not a ref") == "not a ref"


# ── Ranges: plugin-style invisible links ──────────────────────────────────────

def test_range_gets_invisible_verse_links():
    assert R.link_markdown("1 John 2:9–11") == (
        "[[1 John 2#v9|1 John 2:9–11]][[1 John 2#v10|]][[1 John 2#v11|]]"
    )


def test_chapter_range_gets_invisible_chapter_links():
    assert R.link_markdown("Isaiah 18–20") == "[[Isa 18|Isaiah 18–20]][[Isa 19|]][[Isa 20|]]"


def test_cross_chapter_range_links_first_only():
    assert R.link_markdown("Luke 3:16–4:2") == "[[Luke 3#v16|Luke 3:16–4:2]]"


def test_range_links_roundtrip_and_idempotent():
    text = "See Rom. 8:28–30 and vv. 31–32 and Psalm 119:1–176."
    linked = R.link_markdown(text)
    assert R.unlink_markdown(linked) == text
    assert R.link_markdown(linked) == linked


def test_range_links_capped():
    out = R.link_markdown("Psalm 119:1–176")
    assert out.count("|]]") == 40


# ── Real-sample regressions (Tabletalk Oct 2026) ──────────────────────────────

def test_bare_chapter_verse_in_parens_updates_context():
    out = L.link_markdown("Genesis 1:26 ... rested (2:2), blessed it (v. 3), exile (3:1–7; vv. 22–24).")
    assert "[[Gen 2#v2|2:2]]" in out
    assert "[[Gen 2#v3|v. 3]]" in out
    assert "[[Gen 3#v22|vv. 22–24]]" in out


def test_and_continuation():
    out = L.link_markdown("Genesis 1:26–28 and 2:15–17 demonstrate")
    assert "[[Gen 2#v15|2:15–17]]" in out


def test_verse_lists():
    out = L.link_markdown("(Gen. 1:3, 6, 9, 11) and (vv. 4, 10 and 12)")
    for v in ("3", "6", "9", "11"):
        assert f"[[Gen 1#v{v}|" in out
    assert "[[Gen 1#v10|10]]" in out and "[[Gen 1#v12|12]]" in out


@pytest.mark.parametrize("text", [
    "Genesis 1:1 happened at 10:30 today",
    "Genesis 1:1 at (10:30 a.m.) sharp",
    "Genesis 1:1, 2000 years ago",
    "John 3:16, 5 people believed",
])
def test_bare_numbers_not_overlinked(text):
    out = L.link_markdown(text)
    assert out.count("[[") == 1

"""
tests/test_relink.py — Vault refresh of Bible links.
"""

from __future__ import annotations

from tabletalk.model import Article
from tabletalk.refs import BibleLinker
from tabletalk.relink import relink_note_text, relink_vault
from tabletalk.render import _USER_REGION_MARKER, render_article, render_daily
from tabletalk.util import stable_post_id

L = BibleLinker()


def _daily() -> Article:
    return Article(
        post_id=32608,
        url="https://tabletalkmagazine.com/daily-study/2026/09/x/",
        kind="daily",
        issue="2026-09",
        issue_title="Assurance of Salvation",
        title="That Which Was from the Beginning",
        study_date="2026-09-02",
        passage="1 John 1:1–2",
        scripture_text_md="> [!quote]\n> That which was from the beginning.",
        body_md="John opens his letter (vv. 1–2), as 1 John 5:13 and Luke 1:2 confirm.",
        coram_deo_md="Read John 20:24–29 and Acts 1:1–3.",
        further_study=["Luke 24:36–43", "John 20:24–29"],
        bible_in_a_year=["Proverbs 2–4", "1 Corinthians 14"],
    )


def _feature() -> Article:
    return Article(
        post_id=stable_post_id("https://example.com/a"), url="https://example.com/a", kind="feature",
        issue="2026-09", issue_title="T", title="Ground of Assurance",
        body_md="Compare “the Lord rejoices over me” (Zeph. 3:17) with Psalm 23:1.",
    )


def test_daily_render_links_passage_body_and_coram_deo():
    md = render_daily(_daily(), linker=L)
    assert "> [!quote] [[1 John 1#v1|1 John 1:1–2]]" in md
    assert "[[1 John 5#v13|1 John 5:13]]" in md
    assert "[[1 John 1#v1|vv. 1–2]]" in md       # resolved via the passage
    assert "[[John 20#v24|John 20:24–29]]" in md
    assert "[[Acts 1#v1|Acts 1:1–3]]" in md


def test_daily_further_study_and_biay_stay_plain():
    md = render_daily(_daily(), linker=L)
    assert "- Luke 24:36–43\n" in md
    assert "- John 20:24–29\n- " not in md.split("## Coram Deo")[0]
    tail = md.split("## For further study")[1]
    assert "[[" not in tail


def test_daily_frontmatter_passage_stays_plain():
    md = render_daily(_daily(), linker=L)
    assert "passage: 1 John 1:1–2\n" in md


def test_feature_render_links_inline_refs():
    md = render_article(_feature(), linker=L)
    assert "[[Zeph 3#v17|Zeph. 3:17]]" in md
    assert "[[Ps 23#v1|Psalm 23:1]]" in md


def test_no_linker_means_no_links():
    assert "[[" not in render_daily(_daily()).replace("[[00 Issue]]", "")


def test_relink_matches_fresh_render():
    old = render_daily(_daily())                  # note created before linking existed
    assert relink_note_text(old, L) == render_daily(_daily(), linker=L)


def test_relink_feature_matches_fresh_render():
    old = render_article(_feature())
    assert relink_note_text(old, L) == render_article(_feature(), linker=L)


def test_relink_is_idempotent():
    once = relink_note_text(render_daily(_daily()), L)
    assert relink_note_text(once, L) == once


def test_relink_preserves_user_region():
    old = render_daily(_daily()).replace(
        _USER_REGION_MARKER,
        _USER_REGION_MARKER + "\n\nMy notes: Romans 8:28 stays as typed.",
    )
    new = relink_note_text(old, L)
    assert new.endswith("My notes: Romans 8:28 stays as typed.\n") or \
        new.endswith("My notes: Romans 8:28 stays as typed.")
    assert new.split(_USER_REGION_MARKER)[1] == old.split(_USER_REGION_MARKER)[1]


def test_relink_switches_format():
    linked = relink_note_text(render_daily(_daily()), L)
    other = BibleLinker(chapter_note="{book_full}-{chapter:02d}", verse_prefix="#")
    out = relink_note_text(linked, other)
    assert "[[1 John-01#1|1 John 1:1–2]]" in out
    assert "#v" not in out


def test_relink_ignores_other_notes():
    text = "---\ntype: tabletalk-issue\n---\n\n# Issue\n\nJohn 3:16\n"
    assert relink_note_text(text, L) == text
    plain = "# My note\n\nJohn 3:16\n"
    assert relink_note_text(plain, L) == plain


def test_relink_vault(tmp_path):
    folder = tmp_path / "2026-09 Assurance of Salvation"
    folder.mkdir()
    note = folder / "Daily - 2026-09-02 - X.md"
    note.write_text(render_daily(_daily()), encoding="utf-8")
    other = tmp_path / "2026-08 Other"
    other.mkdir()
    (other / "Feature - Y.md").write_text(render_article(_feature()), encoding="utf-8")

    dry = relink_vault(tmp_path, L, issue="2026-09", dry_run=True)
    assert dry.changed == 1 and "[[1 John" not in note.read_text(encoding="utf-8")

    stats = relink_vault(tmp_path, L, issue="2026-09")
    assert stats.changed == 1 and not stats.errors
    assert "[[1 John 1#v1|1 John 1:1–2]]" in note.read_text(encoding="utf-8")
    assert "[[Zeph" not in (other / "Feature - Y.md").read_text(encoding="utf-8")

    again = relink_vault(tmp_path, L)
    assert again.changed == 1   # only the 2026-08 feature, now linked
    assert relink_vault(tmp_path, L).changed == 0

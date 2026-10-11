"""
tests/test_note_paths.py — Re-run safety: note paths, user notes, stable IDs.
"""

from __future__ import annotations

from tabletalk.ids import stable_id
from tabletalk.model import Article
from tabletalk.render import render_note_path, write_article_note

FOLDER = "2026-09 Test Issue"


def _daily(**kwargs) -> Article:
    defaults = dict(
        post_id=1,
        url="https://tabletalkmagazine.com/daily-study/2026/09/a/",
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


def test_rerun_overwrites_same_file(tmp_path):
    a = _daily()
    p1 = write_article_note(a, tmp_path, FOLDER)
    p2 = write_article_note(a, tmp_path, FOLDER)
    assert p1 == p2
    assert len(list((tmp_path / FOLDER).glob("*.md"))) == 1


def test_user_notes_survive_rerun(tmp_path):
    a = _daily()
    p = write_article_note(a, tmp_path, FOLDER)
    p.write_text(p.read_text(encoding="utf-8") + "\nMy personal notes\n", encoding="utf-8")

    a.body_md = "Updated body."
    write_article_note(a, tmp_path, FOLDER)

    text = p.read_text(encoding="utf-8")
    assert "My personal notes" in text
    assert "Updated body." in text


def test_different_article_same_name_gets_new_path(tmp_path):
    a = _daily(post_id=1, url="https://tabletalkmagazine.com/daily-study/2026/09/a/")
    b = _daily(post_id=2, url="https://tabletalkmagazine.com/daily-study/2026/09/b/")
    pa = write_article_note(a, tmp_path, FOLDER)
    pb = write_article_note(b, tmp_path, FOLDER)
    assert pa != pb
    assert pa.exists() and pb.exists()
    # Re-running each stays stable
    assert write_article_note(a, tmp_path, FOLDER) == pa
    assert write_article_note(b, tmp_path, FOLDER) == pb


def test_title_with_period_not_truncated(tmp_path):
    a = _daily(title="Dr. Sproul")
    p = render_note_path(a, tmp_path, FOLDER)
    assert p.name.endswith("Dr. Sproul.md")


def test_existing_file_without_marker_is_replaced_with_marker(tmp_path):
    a = _daily()
    p = render_note_path(a, tmp_path, FOLDER)
    p.parent.mkdir(parents=True)
    p.write_text(f"old note for {a.url}\n", encoding="utf-8")
    write_article_note(a, tmp_path, FOLDER)
    assert "<!-- tt:end -->" in p.read_text(encoding="utf-8")


def test_stable_id_deterministic():
    url = "https://tabletalkmagazine.com/article/2026/09/secure-in-christ/"
    assert stable_id(url) == stable_id(url)
    assert stable_id(url) == stable_id(url.rstrip("/"))


def test_stable_id_differs_between_urls():
    assert stable_id("https://x.com/a/") != stable_id("https://x.com/b/")

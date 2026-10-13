"""
tests/test_fixes.py — Stable IDs, name cleaning, issue links, path reuse, filename safety,
and frontmatter normalisation in relink.
"""

from __future__ import annotations

import subprocess
import sys
import textwrap
from pathlib import Path

from tabletalk.model import Article
from tabletalk.refs import BibleLinker
from tabletalk.relink import relink_note_text, relink_vault
from tabletalk.render import (
    render_article,
    render_daily,
    render_note_path,
    write_article_note,
)
from tabletalk.util import clean_name, stable_post_id

L = BibleLinker()
URL = "https://tabletalkmagazine.com/article/2026/10/work-after-the-fall/"


def _feature(title="Work After the Fall", url=URL, **kw) -> Article:
    return Article(
        post_id=stable_post_id(url), url=url, kind="feature",
        issue="2026-10", issue_title="Faith and Work", title=title,
        authors=["Matthew H. Patton"], rubric="Feature Article",
        body_md="See Gen. 3:17.", **kw,
    )


# ── stable_post_id / clean_name ───────────────────────────────────────────────

def test_stable_post_id_is_deterministic_and_url_normalised():
    assert stable_post_id(URL) == stable_post_id(URL.rstrip("/"))
    assert stable_post_id(URL) != stable_post_id(URL + "x")


def test_stable_post_id_same_across_processes():
    code = (
        "from tabletalk.util import stable_post_id;"
        f"print(stable_post_id({URL!r}))"
    )
    out = [
        subprocess.run([sys.executable, "-c", code], capture_output=True, text=True,
                       cwd=Path(__file__).parents[2]).stdout.strip()
        for _ in range(2)
    ]
    assert out[0] == out[1] == str(stable_post_id(URL))


def test_stable_post_id_fits_sqlite_integer():
    assert 0 < stable_post_id(URL) < 2**63


def test_clean_name():
    assert clean_name("Roland  Mathews") == "Roland Mathews"
    assert clean_name("Jonathan  L.  Master") == "Jonathan L. Master"
    assert clean_name("R. Carlton\u00a0 Wynne ") == "R. Carlton Wynne"
    assert clean_name(None) == ""


# ── Issue link ────────────────────────────────────────────────────────────────

def test_issue_link_full_path():
    link = "Ministry/Tabletalk/2026-10 Faith and Work/00 Issue"
    assert f'[[{link}]]' in render_article(_feature(), issue_link=link)
    assert "issue: '[[00 Issue]]'" in render_article(_feature()) or \
        "[[00 Issue]]" in render_article(_feature())


# ── Duplicate notes on re-sync / periods in titles ────────────────────────────

def test_resync_overwrites_same_note_and_keeps_user_region(tmp_path):
    a = _feature()
    p1 = write_article_note(a, tmp_path, "2026-10 Faith and Work")
    p1.write_text(p1.read_text(encoding="utf-8") + "\nMY NOTES\n", encoding="utf-8")
    p2 = write_article_note(a, tmp_path, "2026-10 Faith and Work")
    assert p1 == p2
    assert len(list(p1.parent.glob("*.md"))) == 1
    assert "MY NOTES" in p2.read_text(encoding="utf-8")


def test_different_article_same_title_still_gets_own_file(tmp_path):
    a = _feature()
    b = _feature(url="https://tabletalkmagazine.com/article/2026/10/other/")
    pa = write_article_note(a, tmp_path, "f")
    pb = write_article_note(b, tmp_path, "f")
    assert pa != pb and pa.exists() and pb.exists()


def test_title_with_period_not_truncated(tmp_path):
    a = _feature(title="Jesus vs. Caesar")
    p = render_note_path(a, tmp_path, "f")
    assert p.name == "Feature - Jesus vs. Caesar.md"


# ── relink normalises old notes ───────────────────────────────────────────────

OLD = textwrap.dedent("""\
    ---
    type: tabletalk-article
    kind: feature
    post_id: 55163989466870
    title: Work After the Fall
    issue: '[[00 Issue]]'
    authors:
      - Roland  Mathews
    rubric: Feature Article
    source: html
    source_url: https://tabletalkmagazine.com/article/2026/10/work-after-the-fall/
    content_hash: 6eb6a3adcf999c17
    tags:
      - tabletalk
    ---

    See Gen. 3:17.

    <!-- tt:end -->
    my notes
    """)


def test_relink_normalises_frontmatter():
    link = "Ministry/Tabletalk/2026-10 Faith and Work/00 Issue"
    out = relink_note_text(OLD, L, issue_link=link)
    assert f'issue: "[[{link}]]"' in out
    assert "  - Roland Mathews\n" in out and "Roland  Mathews" not in out
    assert f"post_id: {stable_post_id(URL)}\n" in out
    assert "[[Gen 3#v17|Gen. 3:17]]" in out
    assert out.endswith("<!-- tt:end -->\nmy notes\n")


def test_relink_frontmatter_untouched_when_already_correct():
    link = "Ministry/Tabletalk/2026-10 Faith and Work/00 Issue"
    once = relink_note_text(OLD, L, issue_link=link)
    assert relink_note_text(once, L, issue_link=link) == once


def test_relink_vault_derives_issue_link_from_folder(tmp_path):
    notes = tmp_path / "Ministry" / "Tabletalk"
    folder = notes / "2026-10 Faith and Work"
    folder.mkdir(parents=True)
    f = folder / "Feature - Work After the Fall.md"
    f.write_text(OLD, encoding="utf-8")
    stats = relink_vault(notes, L, vault_root=tmp_path)
    assert stats.changed == 1 and not stats.errors
    assert 'issue: "[[Ministry/Tabletalk/2026-10 Faith and Work/00 Issue]]"' in f.read_text(
        encoding="utf-8"
    )

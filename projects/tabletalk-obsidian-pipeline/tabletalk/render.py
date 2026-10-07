"""
render.py — Renders Article records to Obsidian Markdown notes.

Features:
  - Safe filenames (strips Obsidian-illegal chars, caps length, deduplicates)
  - YAML frontmatter per the v3 schema
  - Machine-owned body with preserved <!-- tt:end --> user region
  - Issue folder + 00 Issue.md from the TOC manifest ordering
  - Atomic writes (write to temp file, rename)
"""

from __future__ import annotations

import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Sequence

import yaml

from .model import Article
from .discover import IssueToc

logger = logging.getLogger(__name__)

# ── Filename safety ────────────────────────────────────────────────────────────

# Characters illegal in Obsidian / common filesystems
_ILLEGAL_CHARS_RE = re.compile(r'[:/\\?*"<>|#\^\[\]]')
_MULTI_SPACE_RE = re.compile(r"\s+")
_MAX_FILENAME_LEN = 120
_USER_REGION_MARKER = "<!-- tt:end -->"


def safe_filename(name: str, max_len: int = _MAX_FILENAME_LEN) -> str:
    """
    Strip illegal characters, collapse whitespace, cap length.
    Does NOT add an extension.
    """
    name = _ILLEGAL_CHARS_RE.sub("", name)
    name = _MULTI_SPACE_RE.sub(" ", name).strip()
    if len(name) > max_len:
        name = name[:max_len].rstrip()
    return name


def _unique_path(base: Path, extension: str, post_id: int | None = None) -> Path:
    """
    Return a path that does not yet exist.
    On collision, appends -<post_id> or a counter.
    """
    candidate = base.with_suffix(extension)
    if not candidate.exists():
        return candidate
    if post_id:
        candidate = base.parent / f"{base.name}-{post_id}{extension}"
        if not candidate.exists():
            return candidate
    counter = 2
    while True:
        candidate = base.parent / f"{base.name}-{counter}{extension}"
        if not candidate.exists():
            return candidate
        counter += 1


# ── Atomic write ──────────────────────────────────────────────────────────────

def _atomic_write(path: Path, content: str) -> None:
    """Write content to path atomically (temp-file → rename)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ── User region preservation ──────────────────────────────────────────────────

def _preserve_user_region(existing_content: str, new_machine_content: str) -> str:
    """
    If the existing file has a <!-- tt:end --> marker, preserve everything
    after it. Otherwise return the new machine content as-is.
    """
    if _USER_REGION_MARKER in existing_content:
        user_part = existing_content.split(_USER_REGION_MARKER, 1)[1]
        return new_machine_content + _USER_REGION_MARKER + user_part
    return new_machine_content


# ── Issue → YYYY-MM ───────────────────────────────────────────────────────────

def _issue_to_month(toc: IssueToc) -> str:
    """Derive 'YYYY-MM' from issue_url or issue_date."""
    # Try URL first: /issue/YYYY/MM/
    m = re.search(r"/issue/(\d{4})/(\d{2})/", toc.issue_url)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return ""


# ── Frontmatter helpers ───────────────────────────────────────────────────────

def _dump_frontmatter(data: dict) -> str:
    return "---\n" + yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False) + "---\n"


def _authors_field(authors: list[str], as_wikilinks: bool) -> list[str] | str:
    if not authors:
        return []
    if as_wikilinks:
        return [f'"[[{a}]]"' for a in authors]
    return authors


# ── Daily study renderer ──────────────────────────────────────────────────────

def render_daily(
    article: Article,
    *,
    tags: list[str] | None = None,
    authors_as_wikilinks: bool = False,
) -> str:
    """
    Render a daily-study Article to Markdown with frontmatter.

    Body layout:
      > [!quote] scripture text
      study body
      ## Coram Deo
      ## For further study
      ## The Bible in a year
      <!-- tt:end -->
      (user notes below)
    """
    tags = tags or ["tabletalk"]

    fm: dict = {
        "type": "tabletalk-daily-study",
        "post_id": article.post_id,
        "title": article.title,
        "date": article.study_date,
        "issue": "[[00 Issue]]",
        "passage": article.passage,
        "further_study": article.further_study,
        "bible_in_a_year": article.bible_in_a_year,
        "weekend": article.weekend,
        "source": article.source,
        "source_url": article.url,
        "content_hash": article.content_hash,
        "parser_version": article.parser_version,
        "needs_review": article.needs_review,
        "tags": tags,
    }

    if article.authors:
        fm["authors"] = _authors_field(article.authors, authors_as_wikilinks)

    body_parts: list[str] = []

    if article.scripture_text_md:
        body_parts.append(article.scripture_text_md)

    if article.body_md:
        body_parts.append(article.body_md)

    if article.coram_deo_md:
        body_parts.append("## Coram Deo\n\n" + article.coram_deo_md)

    if article.further_study:
        refs = "\n".join(f"- {r}" for r in article.further_study)
        body_parts.append("## For further study\n\n" + refs)

    if article.bible_in_a_year:
        refs = "\n".join(f"- {r}" for r in article.bible_in_a_year)
        body_parts.append("## The Bible in a year\n\n" + refs)

    body_parts.append(_USER_REGION_MARKER)

    content = _dump_frontmatter(fm) + "\n" + "\n\n".join(body_parts) + "\n"
    return content


# ── Article (feature/column) renderer ─────────────────────────────────────────

def render_article(
    article: Article,
    *,
    tags: list[str] | None = None,
    authors_as_wikilinks: bool = False,
) -> str:
    """Render a feature or column Article to Markdown."""
    tags = tags or ["tabletalk"]

    fm: dict = {
        "type": "tabletalk-article",
        "kind": article.kind,
        "post_id": article.post_id,
        "title": article.title,
        "issue": "[[00 Issue]]",
        "authors": _authors_field(article.authors, authors_as_wikilinks),
        "rubric": article.rubric,
        "source": article.source,
        "source_url": article.url,
        "content_hash": article.content_hash,
        "parser_version": article.parser_version,
        "needs_review": article.needs_review,
        "tags": tags,
    }

    body_parts = [article.body_md, _USER_REGION_MARKER]
    content = _dump_frontmatter(fm) + "\n" + "\n\n".join(body_parts) + "\n"
    return content


# ── Issue index (00 Issue.md) ─────────────────────────────────────────────────

def render_issue_index(
    toc: IssueToc,
    articles: list[Article],
    *,
    ai_synthesis: str = "",
    tags: list[str] | None = None,
) -> str:
    """
    Render 00 Issue.md from the TOC manifest ordering.

    TOC order: features → columns → dailies by date.
    Each item is a wikilink using the filename that render_note_path() would produce.
    """
    tags = tags or ["tabletalk"]
    issue_month = _issue_to_month(toc)

    fm: dict = {
        "type": "tabletalk-issue",
        "title": toc.issue_title,
        "issue": issue_month,
        "issue_date": toc.issue_date,
        "tags": tags,
    }

    # Build a URL → wikilink name map from the rendered articles
    url_to_link: dict[str, str] = {}
    for a in articles:
        fname = _article_base_filename(a)
        url_to_link[a.url.rstrip("/")] = fname

    lines: list[str] = []

    if toc.articles:
        lines.append("## Articles\n")
        for ta in toc.articles:
            url_key = ta.url.rstrip("/")
            link_name = url_to_link.get(url_key, ta.title)
            kind_label = "Column" if "column" in ta.content_type.lower() else "Feature"
            lines.append(f"- **{kind_label}** — [[{link_name}]]")
        lines.append("")

    if toc.featured_dailies:
        lines.append("## Featured Study\n")
        for d in toc.featured_dailies:
            url_key = (d.url or "").rstrip("/")
            link_name = url_to_link.get(url_key, d.title)
            lines.append(f"- [[{link_name}]]")
        lines.append("")

    if toc.dailies:
        lines.append("## Daily Studies\n")
        for d in sorted(toc.dailies, key=lambda x: x.day):
            url_key = (d.url or "").rstrip("/")
            link_name = url_to_link.get(url_key, d.title)
            lines.append(f"- Day {d.day} — [[{link_name}]]")
        lines.append("")

    if ai_synthesis:
        lines.append("## Synthesis\n")
        lines.append(ai_synthesis)
        lines.append("")

    body = "\n".join(lines)
    return _dump_frontmatter(fm) + "\n# " + toc.issue_title + "\n\n" + body


# ── Filename helpers ──────────────────────────────────────────────────────────

def _article_base_filename(article: Article) -> str:
    """Derive the base filename (no extension) for an article."""
    if article.kind == "daily":
        return safe_filename(
            f"Daily - {article.study_date} - {article.title}"
        )
    elif article.kind == "column":
        rubric_part = f" - {article.rubric}" if article.rubric else ""
        return safe_filename(f"Column{rubric_part} - {article.title}")
    else:
        return safe_filename(f"Feature - {article.title}")


def render_note_path(
    article: Article,
    notes_root: Path,
    issue_folder: str,
) -> Path:
    """
    Compute the absolute path for an article's note file.
    Does NOT write anything.
    """
    base_name = _article_base_filename(article)
    issue_dir = notes_root / issue_folder
    base = issue_dir / base_name
    return _unique_path(base, ".md", post_id=article.post_id)


# ── Issue folder name ─────────────────────────────────────────────────────────

def issue_folder_name(issue: str, title: str) -> str:
    """e.g. '2026-09 Assurance of Salvation'"""
    return safe_filename(f"{issue} {title}")


# ── Write helpers ─────────────────────────────────────────────────────────────

def write_note(path: Path, content: str) -> None:
    """
    Write a note to disk, preserving the user region if the file already exists.
    Uses an atomic write.
    """
    if path.exists():
        existing = path.read_text(encoding="utf-8")
        content = _preserve_user_region(existing, content.split(_USER_REGION_MARKER)[0])
    _atomic_write(path, content)
    logger.debug("Wrote %s", path)


def write_issue_index(
    toc: IssueToc,
    notes_root: Path,
    articles: list[Article],
    *,
    ai_synthesis: str = "",
    tags: list[str] | None = None,
) -> Path:
    """Render and write the 00 Issue.md file. Returns the path."""
    issue_month = _issue_to_month(toc)
    folder = issue_folder_name(issue_month, toc.issue_title)
    issue_dir = notes_root / folder
    issue_dir.mkdir(parents=True, exist_ok=True)

    index_path = issue_dir / "00 Issue.md"
    content = render_issue_index(toc, articles, ai_synthesis=ai_synthesis, tags=tags)
    _atomic_write(index_path, content)
    logger.info("Wrote issue index: %s", index_path)
    return index_path


def write_article_note(
    article: Article,
    notes_root: Path,
    issue_folder: str,
    *,
    tags: list[str] | None = None,
    authors_as_wikilinks: bool = False,
) -> Path:
    """
    Render and write a single article note. Returns the path.
    Preserves user region on re-run.
    """
    path = render_note_path(article, notes_root, issue_folder)

    if article.kind == "daily":
        content = render_daily(article, tags=tags, authors_as_wikilinks=authors_as_wikilinks)
    else:
        content = render_article(article, tags=tags, authors_as_wikilinks=authors_as_wikilinks)

    write_note(path, content)
    return path

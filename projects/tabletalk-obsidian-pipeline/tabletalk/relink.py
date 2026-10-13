"""
relink.py — Refresh notes that already exist in the vault.

Offline: no network, no cache. Works on the note text itself.

For every Tabletalk note (frontmatter type tabletalk-daily-study / tabletalk-article):

  Body (above <!-- tt:end -->)
    1. Unwrap existing scripture links (alias == ref text, lossless) and invisible range links
    2. Re-link with the current BibleLinker settings

  Frontmatter normalisation (only touches a line when it is wrong)
    - issue:    [[00 Issue]] -> [[<vault-relative folder>/00 Issue]]   (needs vault_root)
    - authors:  "Roland  Mathews" -> "Roland Mathews"
    - post_id:  features/columns -> stable_post_id(source_url)  (old IDs came from hash(url))

Everything below the marker is preserved byte-for-byte. Safe to re-run.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .refs import BibleLinker
from .render import _USER_REGION_MARKER, _atomic_write
from .util import clean_name, stable_post_id

logger = logging.getLogger(__name__)

_FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.S)
_CALLOUT_LINE_RE = re.compile(r"^> \[!quote\][^\n]*", re.M)
_NOTE_TYPES = {"tabletalk-daily-study", "tabletalk-article"}


@dataclass
class RelinkStats:
    scanned: int = 0
    changed: int = 0
    errors: list[str] = field(default_factory=list)


def _set_callout_title(machine: str, title: str) -> str:
    """Put the passage link on the first '> [!quote]' line."""
    if "[[" not in title:
        return machine
    return _CALLOUT_LINE_RE.sub(lambda _: f"> [!quote] {title}", machine, count=1)


def _normalize_frontmatter(head: str, fm: dict, issue_link: str | None) -> str:
    """Fix known frontmatter problems with line-level edits (keeps the rest byte-identical)."""
    if issue_link is not None:
        wanted = f"[[{issue_link}]]"
        if fm.get("issue") != wanted:
            head = re.sub(
                r"^issue: .*$", lambda _: f'issue: "{wanted}"', head, count=1, flags=re.M
            )

    authors = fm.get("authors")
    if isinstance(authors, list):
        for a in authors:
            if isinstance(a, str) and clean_name(a) != a:
                head = head.replace(f"  - {a}\n", f"  - {clean_name(a)}\n")

    if fm.get("type") == "tabletalk-article" and fm.get("source_url"):
        new_id = stable_post_id(str(fm["source_url"]))
        if fm.get("post_id") != new_id:
            head = re.sub(
                r"^post_id: .*$", lambda _: f"post_id: {new_id}", head, count=1, flags=re.M
            )
    return head


def relink_note_text(
    text: str,
    linker: BibleLinker,
    *,
    issue_link: str | None = None,
) -> str:
    """
    Pure function: return note text with links and frontmatter refreshed.
    Text that is not a Tabletalk note is returned unchanged.
    """
    m = _FM_RE.match(text)
    if not m:
        return text
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return text
    if not isinstance(fm, dict) or fm.get("type") not in _NOTE_TYPES:
        return text

    head = _normalize_frontmatter(text[:m.end()], fm, issue_link)
    rest = text[m.end():]
    machine, marker, user = rest.partition(_USER_REGION_MARKER)

    machine = linker.unlink_markdown(machine)

    passage = str(fm.get("passage") or "")
    if fm["type"] == "tabletalk-daily-study" and passage:
        machine = _set_callout_title(machine, linker.link_markdown(passage))

    machine = linker.link_markdown(machine, linker.new_context(passage))
    return head + machine + marker + user


def relink_vault(
    notes_root: Path,
    linker: BibleLinker,
    *,
    vault_root: Path | None = None,
    issue: str | None = None,
    dry_run: bool = False,
) -> RelinkStats:
    """
    Refresh every Tabletalk note under notes_root.

    ``vault_root`` enables the issue-link fix (the link target is the note's folder,
    relative to the vault, plus "/00 Issue"). ``issue`` limits to a YYYY-MM folder.
    """
    stats = RelinkStats()
    for path in sorted(notes_root.rglob("*.md")):
        if issue:
            folders = path.relative_to(notes_root).parts[:-1]
            if not any(p.startswith(issue) for p in folders):
                continue
        try:
            issue_link = None
            if vault_root is not None:
                issue_link = f"{path.parent.relative_to(vault_root).as_posix()}/00 Issue"
            text = path.read_text(encoding="utf-8")
            new = relink_note_text(text, linker, issue_link=issue_link)
            stats.scanned += 1
            if new != text:
                stats.changed += 1
                if not dry_run:
                    _atomic_write(path, new)
        except Exception as exc:  # keep going; report at the end
            stats.errors.append(f"{path.name}: {exc}")
            logger.error("relink failed for %s: %s", path, exc)
    return stats

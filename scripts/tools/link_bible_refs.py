#!/usr/bin/env python3
"""
Usage:
  python3 link_bible_refs.py --file /path/to/note.md
  python3 link_bible_refs.py --root /path/to/folder --apply

Best-effort script that converts common Bible references in Markdown text into
local Obsidian links pointing at the imported ESV vault files.

It is intentionally conservative:
- it skips text already inside Markdown links
- it only rewrites clearly recognized references
- it supports both verse references and chapter-only references
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path


DEFAULT_VAULT = Path(
    "/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal"
)
VAULT_ROOT = Path(os.environ.get("CORBIN_VAULT_PATH", str(DEFAULT_VAULT))).expanduser()
VAULT_BIBLE = VAULT_ROOT / "Bible" / "ESV"

BOOK_ALIASES = {
    "1 Cor": "1 Corinthians",
    "1 Corinthians": "1 Corinthians",
    "1 John": "1 John",
    "1 Pet": "1 Peter",
    "1 Peter": "1 Peter",
    "1 Thess": "1 Thessalonians",
    "1 Thes": "1 Thessalonians",
    "1 Thessalonians": "1 Thessalonians",
    "1 Tim": "1 Timothy",
    "1 Timothy": "1 Timothy",
    "2 Cor": "2 Corinthians",
    "2 Corinthians": "2 Corinthians",
    "2 John": "2 John",
    "2 Pet": "2 Peter",
    "2 Peter": "2 Peter",
    "2 Thess": "2 Thessalonians",
    "2 Thes": "2 Thessalonians",
    "2 Thessalonians": "2 Thessalonians",
    "2 Tim": "2 Timothy",
    "2 Timothy": "2 Timothy",
    "3 John": "3 John",
    "Acts": "Acts",
    "Col": "Colossians",
    "Colossians": "Colossians",
    "Deut": "Deuteronomy",
    "Deuteronomy": "Deuteronomy",
    "Eph": "Ephesians",
    "Ephesians": "Ephesians",
    "Ex": "Exodus",
    "Exodus": "Exodus",
    "Gen": "Genesis",
    "Genesis": "Genesis",
    "Heb": "Hebrews",
    "Hebrews": "Hebrews",
    "Isa": "Isaiah",
    "Isaiah": "Isaiah",
    "James": "James",
    "John": "John",
    "Judg": "Judges",
    "Judges": "Judges",
    "Luke": "Luke",
    "Matt": "Matthew",
    "Matthew": "Matthew",
    "Mark": "Mark",
    "Phil": "Philippians",
    "Philippians": "Philippians",
    "Ps": "Psalms",
    "Psalm": "Psalms",
    "Psalms": "Psalms",
    "Prov": "Proverbs",
    "Proverbs": "Proverbs",
    "Rom": "Romans",
    "Romans": "Romans",
}

REF_RE = re.compile(
    r"(?<![\w\[])(?P<book>(?:[1-3]\s)?[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)\s+"
    r"(?P<chapter>\d+)"
    r"(?::(?P<verse_start>\d+)(?:[-–](?P<verse_end>\d+))?)?"
    r"(?![\w\]])"
)


def resolve_book(book: str) -> str | None:
    return BOOK_ALIASES.get(book)


def chapter_file(book: str, chapter: int) -> Path | None:
    folder = VAULT_BIBLE / book
    if not folder.exists():
        return None

    candidates = sorted(folder.glob(f"* {chapter}.md"))
    if candidates:
        return candidates[0]

    # Fallback for single-chapter books or alternate naming.
    candidates = sorted(folder.glob(f"*.md"))
    for candidate in candidates:
        if candidate.stem.endswith(f" {chapter}") or candidate.stem == book:
            return candidate
    return None


def link_for_match(match: re.Match[str]) -> str:
    raw_book = match.group("book")
    book = resolve_book(raw_book)
    if not book:
        return match.group(0)

    chapter = int(match.group("chapter"))
    verse_start = match.group("verse_start")
    verse_end = match.group("verse_end")
    file_path = chapter_file(book, chapter)
    if not file_path:
        return match.group(0)

    if verse_start:
        label = raw_book + f" {chapter}:{verse_start}"
        if verse_end:
            label += f"-{verse_end}"
        return f"[[Bible/ESV/{book}/{file_path.stem}#{verse_start}|{label}]]"

    return f"[[Bible/ESV/{book}/{file_path.stem}|{raw_book} {chapter}]]"


def rewrite_text(text: str) -> str:
    out: list[str] = []
    last = 0
    for match in REF_RE.finditer(text):
        # Skip matches that are already part of a Markdown link target or label.
        if match.start() > 0 and text[match.start() - 1] == "(":
            continue
        if match.start() > 0 and text[match.start() - 1] == "]":
            continue
        out.append(text[last:match.start()])
        out.append(link_for_match(match))
        last = match.end()
    out.append(text[last:])
    return "".join(out)


def process_file(path: Path, apply: bool) -> bool:
    original = path.read_text(encoding="utf-8")
    updated = rewrite_text(original)
    if updated == original:
        return False
    if apply:
        path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=Path, help="Process one markdown file")
    parser.add_argument("--root", type=Path, help="Process all markdown files under a folder")
    parser.add_argument("--apply", action="store_true", help="Write changes back to disk")
    args = parser.parse_args()

    targets: list[Path] = []
    if args.file:
        targets = [args.file]
    elif args.root:
        targets = sorted(args.root.rglob("*.md"))
    else:
        parser.error("Provide --file or --root")

    changed = 0
    for target in targets:
        if process_file(target, args.apply):
            print(target)
            changed += 1

    print(f"matched files: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

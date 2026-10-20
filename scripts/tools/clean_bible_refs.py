#!/usr/bin/env python3
r"""
clean_bible_refs.py

Unwraps / cleans Obsidian Bible Linker wikilinks in Markdown files back into clean,
plain text scripture references suitable for Quartz and Crossway's ESV Cross-Reference script.

Examples:
  [[Bible/ESV/2 Peter/2 Pet 1#21|2 Peter 1:21]]       -> 2 Peter 1:21
  [[Bible/ESV/2 Peter/2 Pet 1#21\|2 Peter 1:21]]     -> 2 Peter 1:21 (escaped pipe in tables)
  [[Bible/ESV/Deuteronomy/Deut 30#11|Deuteronomy 30:11-14]] -> Deuteronomy 30:11-14
  [[Rom 8#v28|Romans 8:28]]                           -> Romans 8:28
  [[Bible/ESV/John/John 9|John 9]]                    -> John 9
  [[Bible/ESV/James/Jas 4#13|James 4:13-15]]          -> James 4:13-15
  [[Bible/ESV/John/John 9#17|]]                       -> (removed invisible link)
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

# Match invisible range links like [[Bible/ESV/...#17|]] or [[Rom 8#v28|]]
INVISIBLE_LINK_RE = re.compile(r"\[\[[^\]\n]+(?:\\?\|)\s*\]\]")

# Match wikilinks to Bible/ESV or with scripture-style targets/aliases
# Matches both regular `|` and escaped `\|` (used in markdown tables)
BIBLE_ESV_WIKILINK_RE = re.compile(
    r"\[\[Bible/ESV/[^\]\n]+?(?:\\?\|)(?P<label>[^\]\n]+?)\]\]"
)

# Also handle bare [[Bible/ESV/Book/File#Anchor]] without alias if any exist
BIBLE_ESV_BARE_RE = re.compile(
    r"\[\[Bible/ESV/(?:[^/\]\n]+/)*(?P<file>[^/#\]\n]+)(?:#(?P<anchor>\d+))?\]\]"
)

# Canonical and abbreviated Bible book names to prevent matching "Chapter 10", "Part 2", etc.
BIBLE_BOOKS = [
    "Genesis", "Gen", "Gn", "Exodus", "Exod", "Exo", "Ex", "Leviticus", "Lev", "Lv",
    "Numbers", "Num", "Nm", "Deuteronomy", "Deut", "Dt", "Joshua", "Josh", "Judges", "Judg", "Jdg",
    "Ruth", "1 Samuel", "1 Sam", "2 Samuel", "2 Sam", "1 Kings", "1 Kgs", "Ki", "2 Kings", "2 Kgs",
    "1 Chronicles", "1 Chr", "2 Chronicles", "2 Chr", "Ezra", "Nehemiah", "Neh", "Esther", "Esth",
    "Job", "Psalms", "Psalm", "Pss", "Ps", "Proverbs", "Prov", "Pr", "Ecclesiastes", "Eccl", "Ecc",
    "Song of Solomon", "Song of Songs", "Song", "Isaiah", "Isa", "Jeremiah", "Jer", "Lamentations", "Lam",
    "Ezekiel", "Ezek", "Eze", "Daniel", "Dan", "Hosea", "Hos", "Joel", "Amos", "Obadiah", "Obad",
    "Jonah", "Micah", "Mic", "Nahum", "Nah", "Habakkuk", "Hab", "Zephaniah", "Zeph", "Zep",
    "Haggai", "Hag", "Zechariah", "Zech", "Zec", "Malachi", "Mal",
    "Matthew", "Matt", "Mt", "Mark", "Mk", "Luke", "Lk", "John", "Jn", "Acts",
    "Romans", "Rom", "1 Corinthians", "1 Cor", "2 Corinthians", "2 Cor", "Galatians", "Gal",
    "Ephesians", "Eph", "Philippians", "Phil", "Php", "Colossians", "Col",
    "1 Thessalonians", "1 Thess", "1 Thes", "2 Thessalonians", "2 Thess", "2 Thes",
    "1 Timothy", "1 Tim", "2 Timothy", "2 Tim", "Titus", "Philemon", "Phlm", "Phm",
    "Hebrews", "Heb", "James", "Jas", "1 Peter", "1 Pet", "2 Peter", "2 Pet",
    "1 John", "2 John", "3 John", "Jude", "Revelation", "Rev"
]

_BOOK_ALT = "|".join(re.escape(b) for b in sorted(BIBLE_BOOKS, key=len, reverse=True))

# Match general chapter#verse Bible Linker style links, e.g. [[Rom 8#v28|Romans 8:28]]
GENERIC_BIBLE_LINKER_RE = re.compile(
    rf"\[\[(?:{_BOOK_ALT})\s+\d+(?:#[^\]|\n]+)?(?:\\?\|)(?P<label>[^\]\n]+?)\]\]",
    re.IGNORECASE
)


def clean_markdown_text(text: str) -> str:
    """Strip Bible Linker links to plain text references."""
    # 1. Remove empty-label invisible range anchors
    text = INVISIBLE_LINK_RE.sub("", text)

    # 2. Unwrap [[Bible/ESV/...|Label]] or [[Bible/ESV/...\|Label]]
    text = BIBLE_ESV_WIKILINK_RE.sub(r"\g<label>", text)

    # 3. Unwrap bare [[Bible/ESV/...]] if any
    def _unwrap_bare(m: re.Match[str]) -> str:
        f = m.group("file").replace("_", " ")
        anchor = m.group("anchor")
        if anchor:
            return f"{f}:{anchor}"
        return f

    text = BIBLE_ESV_BARE_RE.sub(_unwrap_bare, text)

    # 4. Unwrap generic short Bible Linker links like [[Rom 8#v28|Romans 8:28]]
    # Only if the label looks like a scripture reference
    def _unwrap_generic(m: re.Match[str]) -> str:
        label = m.group("label").strip()
        return label

    text = GENERIC_BIBLE_LINKER_RE.sub(_unwrap_generic, text)

    return text


def process_file(path: Path, apply: bool) -> bool:
    original = path.read_text(encoding="utf-8")
    cleaned = clean_markdown_text(original)
    if cleaned == original:
        return False
    if apply:
        path.write_text(cleaned, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean Bible Linker wikilinks in Markdown files.")
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
            action = "Updated" if args.apply else "Needs update"
            print(f"{action}: {target}")
            changed += 1

    verb = "updated" if args.apply else "would be updated"
    print(f"Total files {verb}: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

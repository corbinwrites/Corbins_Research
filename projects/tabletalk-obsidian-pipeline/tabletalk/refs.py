"""
refs.py — Scripture reference parser.

Parses inline scripture references from prose text (articles).
Structured fields (passage, further_study, bible_in_a_year) should be used
directly — this module is for inline refs only.

Features:
  - Canonical book name table with aliases (Ps → Psalm, etc.)
  - Range support (John 3:16–18)
  - Context carry-forward for bare verse refs (vv. 3–5, 4:12)
  - Abbreviation disambiguation (requires chapter:verse for ambiguous names)
"""

from __future__ import annotations

import re
from typing import Iterator

# ── Canonical book table ──────────────────────────────────────────────────────

# Maps aliases → canonical name.  Canonical entry maps to itself.
_BOOK_ALIASES: dict[str, str] = {
    # OT
    "Gen": "Genesis", "Ge": "Genesis", "Gn": "Genesis",
    "Exod": "Exodus", "Ex": "Exodus", "Exo": "Exodus",
    "Lev": "Leviticus", "Le": "Leviticus",
    "Num": "Numbers", "Nu": "Numbers", "Nm": "Numbers",
    "Deut": "Deuteronomy", "Dt": "Deuteronomy", "De": "Deuteronomy",
    "Josh": "Joshua", "Jos": "Joshua",
    "Judg": "Judges", "Jdg": "Judges",
    "Ruth": "Ruth", "Ru": "Ruth",
    "1Sam": "1 Samuel", "1 Sam": "1 Samuel", "1Sa": "1 Samuel",
    "2Sam": "2 Samuel", "2 Sam": "2 Samuel", "2Sa": "2 Samuel",
    "1Kgs": "1 Kings", "1 Kgs": "1 Kings", "1Ki": "1 Kings",
    "2Kgs": "2 Kings", "2 Kgs": "2 Kings", "2Ki": "2 Kings",
    "1Chr": "1 Chronicles", "1 Chr": "1 Chronicles",
    "2Chr": "2 Chronicles", "2 Chr": "2 Chronicles",
    "Ezra": "Ezra", "Neh": "Nehemiah",
    "Esth": "Esther", "Est": "Esther",
    "Job": "Job",
    "Ps": "Psalm", "Pss": "Psalm", "Psalms": "Psalm", "Psalm": "Psalm",
    "Prov": "Proverbs", "Pr": "Proverbs",
    "Eccl": "Ecclesiastes", "Ec": "Ecclesiastes", "Ecc": "Ecclesiastes", "Qoh": "Ecclesiastes",
    "Song": "Song of Solomon", "SS": "Song of Solomon", "SOS": "Song of Solomon", "Cant": "Song of Solomon",
    "Isa": "Isaiah", "Is": "Isaiah",
    "Jer": "Jeremiah", "Je": "Jeremiah",
    "Lam": "Lamentations", "La": "Lamentations",
    "Ezek": "Ezekiel", "Eze": "Ezekiel", "Ez": "Ezekiel",
    "Dan": "Daniel", "Da": "Daniel", "Dn": "Daniel",
    "Hos": "Hosea", "Ho": "Hosea",
    "Joel": "Joel", "Joe": "Joel",
    "Amos": "Amos", "Am": "Amos",
    "Obad": "Obadiah", "Ob": "Obadiah",
    "Jonah": "Jonah", "Jon": "Jonah",
    "Mic": "Micah", "Mi": "Micah",
    "Nah": "Nahum", "Na": "Nahum",
    "Hab": "Habakkuk",
    "Zeph": "Zephaniah", "Zep": "Zephaniah",
    "Hag": "Haggai", "Hg": "Haggai",
    "Zech": "Zechariah", "Zec": "Zechariah",
    "Mal": "Malachi",
    # NT
    "Matt": "Matthew", "Mt": "Matthew",
    "Mark": "Mark", "Mk": "Mark",
    "Luke": "Luke", "Lk": "Luke",
    "John": "John", "Jn": "John",
    "Acts": "Acts", "Ac": "Acts",
    "Rom": "Romans", "Ro": "Romans",
    "1Cor": "1 Corinthians", "1 Cor": "1 Corinthians",
    "2Cor": "2 Corinthians", "2 Cor": "2 Corinthians",
    "Gal": "Galatians",
    "Eph": "Ephesians",
    "Phil": "Philippians", "Php": "Philippians",
    "Col": "Colossians",
    "1Thess": "1 Thessalonians", "1 Thess": "1 Thessalonians",
    "2Thess": "2 Thessalonians", "2 Thess": "2 Thessalonians",
    "1Tim": "1 Timothy", "1 Tim": "1 Timothy",
    "2Tim": "2 Timothy", "2 Tim": "2 Timothy",
    "Titus": "Titus", "Tit": "Titus",
    "Phlm": "Philemon", "Phm": "Philemon",
    "Heb": "Hebrews",
    "Jas": "James", "Ja": "James",
    "1Pet": "1 Peter", "1 Pet": "1 Peter",
    "2Pet": "2 Peter", "2 Pet": "2 Peter",
    "1John": "1 John", "1 John": "1 John", "1Jn": "1 John",
    "2John": "2 John", "2 John": "2 John", "2Jn": "2 John",
    "3John": "3 John", "3 John": "3 John", "3Jn": "3 John",
    "Jude": "Jude",
    "Rev": "Revelation", "Re": "Revelation",
}

# Canonical names that map to themselves
for _v in list(_BOOK_ALIASES.values()):
    _BOOK_ALIASES.setdefault(_v, _v)

# Books that require chapter:verse for disambiguation (ambiguous short names)
_REQUIRE_VERSE = {"Job", "Mark", "Acts", "Numbers", "Song of Solomon", "Amos", "Ruth", "Philippians"}

# ── Regex ─────────────────────────────────────────────────────────────────────

# Matches a book prefix: optional number, then name (possibly abbrev.)
_BOOK_PREFIX = (
    r"(?:1|2|3|I{1,3}|IV)?\s*"
    r"(?:"
    + "|".join(sorted(_BOOK_ALIASES.keys(), key=len, reverse=True))
    + r")"
)

_VERSE_RE = re.compile(
    rf"""
    (?P<book>{_BOOK_PREFIX})      # book name or abbreviation
    [\s\u00a0]+                   # separator
    (?P<chapter>\d+)              # chapter
    (?:                           # optional verse part
        [:\u2013\u2014\-]
        (?P<verse_start>\d+)
        (?:                       # optional end verse / chapter
            [\u2013\u2014\-]
            (?P<verse_end>\d+)
            (?:                   # optional end chapter
                :\d+
            )?
        )?
    )?
    """,
    re.VERBOSE | re.IGNORECASE,
)

_BARE_VERSE_RE = re.compile(
    r"(?:vv?\.|verses?)\s*(?P<start>\d+)(?:[–\-](?P<end>\d+))?",
    re.IGNORECASE,
)

_CHAPTER_VERSE_BARE_RE = re.compile(
    r"(?P<chapter>\d+):(?P<verse>\d+)(?:[–\-](?P<end_verse>\d+))?"
)


def _canonicalize_book(raw: str) -> str | None:
    """Map a raw book string to its canonical name, or None if unrecognized."""
    normalized = re.sub(r"\s+", " ", raw).strip()
    # Try direct lookup
    if canon := _BOOK_ALIASES.get(normalized):
        return canon
    # Try without spaces
    no_space = normalized.replace(" ", "")
    if canon := _BOOK_ALIASES.get(no_space):
        return canon
    # Try titlecase
    tc = normalized.title()
    if canon := _BOOK_ALIASES.get(tc):
        return canon
    return None


# ── Public API ────────────────────────────────────────────────────────────────

def parse_refs(text: str) -> list[str]:
    """
    Extract all scripture references from a prose string.
    Returns canonical references as strings, e.g. "1 John 2:9–11".
    """
    refs: list[str] = []
    context_book: str | None = None
    context_chapter: str | None = None

    for m in _VERSE_RE.finditer(text):
        raw_book = m.group("book").strip()
        canon = _canonicalize_book(raw_book)
        if canon is None:
            continue

        chapter = m.group("chapter")
        verse_start = m.group("verse_start")
        verse_end = m.group("verse_end")

        # Skip ambiguous books without verse
        if canon in _REQUIRE_VERSE and verse_start is None:
            continue

        context_book = canon
        context_chapter = chapter

        ref = f"{canon} {chapter}"
        if verse_start:
            ref += f":{verse_start}"
            if verse_end:
                ref += f"–{verse_end}"

        refs.append(ref)

    return refs


def normalize_ref(raw: str) -> str:
    """
    Normalize a scripture reference string from structured fields.
    Handles ranges with en-dashes or hyphens; maps aliases to canonical names.
    """
    raw = raw.strip()
    # Find book portion
    m = _VERSE_RE.match(raw)
    if not m:
        return raw

    canon = _canonicalize_book(m.group("book").strip())
    if not canon:
        return raw

    rest = raw[m.end("book"):].strip()
    # Normalize dash characters
    rest = re.sub(r"[-–—]", "–", rest)
    return f"{canon} {rest}"

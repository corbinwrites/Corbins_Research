"""
refs.py — Scripture reference detection and Obsidian Bible Linker-style linking.

Used in two places:
  - render.py  : links refs when a note is first written
  - relink.py  : refreshes links in notes that already exist in the vault

Link format (configurable, defaults match the Bible Linker plugin / Bible Study Kit):

    [[Rom 8#v28|Romans 8:28]]      verse   -> chapter note + verse heading
    [[Rom 8|Romans 8]]             chapter -> chapter note only
    [[Eph 2#v9|vv. 9–11]]          bare verse refs resolve against the last full ref

The alias is always the text exactly as written, so unlinking is lossless.

Never linked (by design):
  - "For further study" / "The Bible in a year" / "Related Scripture" sections
  - the scripture callout (> [!quote]) body
  - headings, code, existing links, URLs, HTML
"""

from __future__ import annotations

import re
from dataclasses import dataclass


# ── Book table ────────────────────────────────────────────────────────────────
# (canonical name, default note abbreviation, names usable in prose)
# Numbered books list their names WITHOUT the numeral.

_BOOKS: list[tuple[str, str, list[str]]] = [
    ("Genesis", "Gen", ["Genesis", "Gen", "Gn"]),
    ("Exodus", "Exod", ["Exodus", "Exod", "Exo", "Ex"]),
    ("Leviticus", "Lev", ["Leviticus", "Lev", "Lv"]),
    ("Numbers", "Num", ["Numbers", "Num", "Nm"]),
    ("Deuteronomy", "Deut", ["Deuteronomy", "Deut", "Dt"]),
    ("Joshua", "Josh", ["Joshua", "Josh"]),
    ("Judges", "Judg", ["Judges", "Judg", "Jdg"]),
    ("Ruth", "Ruth", ["Ruth"]),
    ("1 Samuel", "1 Sam", ["Samuel", "Sam"]),
    ("2 Samuel", "2 Sam", ["Samuel", "Sam"]),
    ("1 Kings", "1 Kgs", ["Kings", "Kgs", "Ki"]),
    ("2 Kings", "2 Kgs", ["Kings", "Kgs", "Ki"]),
    ("1 Chronicles", "1 Chr", ["Chronicles", "Chron", "Chr"]),
    ("2 Chronicles", "2 Chr", ["Chronicles", "Chron", "Chr"]),
    ("Ezra", "Ezra", ["Ezra"]),
    ("Nehemiah", "Neh", ["Nehemiah", "Neh"]),
    ("Esther", "Esth", ["Esther", "Esth", "Est"]),
    ("Job", "Job", ["Job"]),
    ("Psalm", "Ps", ["Psalms", "Psalm", "Pss", "Ps"]),
    ("Proverbs", "Prov", ["Proverbs", "Prov", "Pr"]),
    ("Ecclesiastes", "Eccl", ["Ecclesiastes", "Eccles", "Eccl", "Ecc"]),
    ("Song of Solomon", "Song", ["Song of Solomon", "Song of Songs", "Song"]),
    ("Isaiah", "Isa", ["Isaiah", "Isa"]),
    ("Jeremiah", "Jer", ["Jeremiah", "Jer"]),
    ("Lamentations", "Lam", ["Lamentations", "Lam"]),
    ("Ezekiel", "Ezek", ["Ezekiel", "Ezek", "Eze"]),
    ("Daniel", "Dan", ["Daniel", "Dan"]),
    ("Hosea", "Hos", ["Hosea", "Hos"]),
    ("Joel", "Joel", ["Joel"]),
    ("Amos", "Amos", ["Amos"]),
    ("Obadiah", "Obad", ["Obadiah", "Obad"]),
    ("Jonah", "Jonah", ["Jonah"]),
    ("Micah", "Mic", ["Micah", "Mic"]),
    ("Nahum", "Nah", ["Nahum", "Nah"]),
    ("Habakkuk", "Hab", ["Habakkuk", "Hab"]),
    ("Zephaniah", "Zeph", ["Zephaniah", "Zeph", "Zep"]),
    ("Haggai", "Hag", ["Haggai", "Hag"]),
    ("Zechariah", "Zech", ["Zechariah", "Zech", "Zec"]),
    ("Malachi", "Mal", ["Malachi", "Mal"]),
    ("Matthew", "Matt", ["Matthew", "Matt", "Mt"]),
    ("Mark", "Mark", ["Mark", "Mk"]),
    ("Luke", "Luke", ["Luke", "Lk"]),
    ("John", "John", ["John", "Jn"]),
    ("Acts", "Acts", ["Acts"]),
    ("Romans", "Rom", ["Romans", "Rom"]),
    ("1 Corinthians", "1 Cor", ["Corinthians", "Cor"]),
    ("2 Corinthians", "2 Cor", ["Corinthians", "Cor"]),
    ("Galatians", "Gal", ["Galatians", "Gal"]),
    ("Ephesians", "Eph", ["Ephesians", "Eph"]),
    ("Philippians", "Phil", ["Philippians", "Phil", "Php"]),
    ("Colossians", "Col", ["Colossians", "Col"]),
    ("1 Thessalonians", "1 Thess", ["Thessalonians", "Thess", "Thes"]),
    ("2 Thessalonians", "2 Thess", ["Thessalonians", "Thess", "Thes"]),
    ("1 Timothy", "1 Tim", ["Timothy", "Tim"]),
    ("2 Timothy", "2 Tim", ["Timothy", "Tim"]),
    ("Titus", "Titus", ["Titus"]),
    ("Philemon", "Phlm", ["Philemon", "Phlm", "Phm"]),
    ("Hebrews", "Heb", ["Hebrews", "Heb"]),
    ("James", "Jas", ["James", "Jas"]),
    ("1 Peter", "1 Pet", ["Peter", "Pet"]),
    ("2 Peter", "2 Pet", ["Peter", "Pet"]),
    ("1 John", "1 John", ["John", "Jn"]),
    ("2 John", "2 John", ["John", "Jn"]),
    ("3 John", "3 John", ["John", "Jn"]),
    ("Jude", "Jude", ["Jude"]),
    ("Revelation", "Rev", ["Revelation", "Rev"]),
]

DEFAULT_ABBREVIATIONS: dict[str, str] = {canon: abbr for canon, abbr, _ in _BOOKS}

_PLAIN: dict[str, str] = {}                      # "Romans"   -> "Romans"
_NUMBERED: dict[tuple[str, str], str] = {}       # ("1","Sam") -> "1 Samuel"
for _canon, _abbr, _names in _BOOKS:
    if _canon[0].isdigit():
        for _n in _names:
            _NUMBERED[(_canon[0], _n)] = _canon
    else:
        for _n in _names:
            _PLAIN[_n] = _canon

_NUMBER_WORDS = {"1": "1", "2": "2", "3": "3", "First": "1", "Second": "2", "Third": "3"}

# Books with one chapter: "Jude 3" means Jude 1:3.
_SINGLE_CHAPTER = {"Obadiah", "Philemon", "2 John", "3 John", "Jude"}

# Names that collide with ordinary words/names: only link when a verse is given.
# (All aliases of 2 letters or fewer get the same treatment.)
_VERSE_REQUIRED = {"Phil", "Dan"}


# ── Regex ─────────────────────────────────────────────────────────────────────

def _alt(names) -> str:
    return "|".join(
        re.escape(n).replace("\\ ", "[ \u00a0]")
        for n in sorted(set(names), key=len, reverse=True)
    )


_DASH = "[\u2013\u2014\\-]"
_SP = "[ \u00a0]"

# A: full reference — book chapter[:verse[-verse]]
_A_SRC = (
    r"(?<!\w)"
    r"(?:"
    r"(?P<num>[123]|First|Second|Third)\.?" + _SP + r"*(?P<nname>" + _alt(n for (_, n) in _NUMBERED) + r")"
    r"|"
    r"(?P<name>" + _alt(_PLAIN) + r")"
    r")"
    r"\.?" + _SP + r"+"
    r"(?P<chap>\d{1,3})"
    r"(?:"
    r":(?P<v1>\d{1,3})(?:[a-c](?!\w))?"
    r"(?:" + _DASH + r"(?P<v2>\d{1,3})(?:[a-c](?!\w))?(?::(?P<v2v>\d{1,3}))?)?"
    r"|"
    r"(?:" + _DASH + r"(?P<c2>\d{1,3}))?"
    r")"
    r"(?!\d)"
)

# B: bare chapter:verse — "(2:2)", "Rom. 3:23; 6:23", "Gen. 1:26–28 and 2:15–17".
# Only linked when a book is in context AND it is parenthesised or follows a ref
# (see _scan), so times like "10:30" are left alone.
_B_SRC = (
    r"(?<![\w:])(?P<cchap>\d{1,3}):(?P<cv1>\d{1,3})(?:[a-c](?!\w))?"
    r"(?:" + _DASH + r"(?P<cv2>\d{1,3}))?(?!\d)(?!\s?[AaPp]\.?[Mm]\b)"
)

# C: bare verse — "v. 9", "vv. 9–11", "verses 3-5"
_C_SRC = (
    r"(?<!\w)(?:[Vv]v?\.|[Vv]erses?)" + _SP + r"*(?P<bv1>\d{1,3})"
    r"(?:" + _DASH + r"(?P<bv2>\d{1,3}))?(?!\d)"
)

# D: further verse in a list — "Gen. 1:3, 6, 9" / "vv. 4, 10 and 12"
_D_SRC = (
    r"(?<![\w:.])(?P<dv1>\d{1,3})(?:" + _DASH + r"(?P<dv2>\d{1,3}))?"
    r"(?![\d:])(?!\s+(?!(?:and|or)\b)[a-z])"
)

_SCAN_RE = re.compile(f"{_A_SRC}|{_B_SRC}|{_C_SRC}|{_D_SRC}")
_FULL_RES = [re.compile(s) for s in (_A_SRC, _B_SRC, _C_SRC, _D_SRC)]
_GAP_RE = re.compile(r"\s*(?:[;,]|,?\s+(?:and|or)|\s+cf\.|\s+see)\s*", re.IGNORECASE)
_LIST_GAP_RE = re.compile(r"\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+")
_MAX_VERSE = 176
_MAX_RANGE_LINKS = 40           # cap on invisible per-verse links for one range
_INVISIBLE_RE = re.compile(r"\[\[[^\]|\n]+\|\]\]")   # [[note#v2|]]

# Spans we never touch inside a line.
_PROTECTED_RE = re.compile(
    r"\[\[.*?\]\]"                 # wikilinks
    r"|!?\[[^\]]*\]\([^)]*\)"      # markdown links / images
    r"|`[^`]*`"                    # inline code
    r"|<[A-Za-z/!][^>\n]*>"        # html tags / comments
    r"|https?://[^\s)\]]+"         # bare urls
)

_WIKI_ALIAS_RE = re.compile(r"\[\[([^\]|\n]+)\|([^\]\n]+)\]\]")
_FENCE_RE = re.compile(r"^\s*(```|~~~)")
_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s+(.*)$")
_CALLOUT_RE = re.compile(r"^>\s*\[!")
_SKIP_HEADING_RE = re.compile(
    r"^(for further study|the bible in a year|related scripture)\b", re.IGNORECASE
)


# ── Data types ────────────────────────────────────────────────────────────────

@dataclass
class RefContext:
    """Carry-forward state so bare refs ('vv. 9–11') resolve to the last book/chapter."""
    book: str | None = None
    chapter: int | None = None
    prev_end: int | None = None     # end offset of the previous ref in the current chunk
    list_ok: bool = False           # previous ref named a verse, so ", 6, 9" may follow


@dataclass(frozen=True)
class Ref:
    book: str            # canonical, e.g. "1 John"
    chapter: int
    verse: int | None
    end: str             # "" | "11" | "4:2" (verse / chapter range end)
    start: int
    stop: int
    text: str            # exactly as written

    def canonical(self) -> str:
        s = f"{self.book} {self.chapter}"
        if self.verse is not None:
            s += f":{self.verse}"
        if self.end:
            s += f"–{self.end}"
        return s


# ── Scanner ───────────────────────────────────────────────────────────────────

def _from_full(m: re.Match) -> Ref | None:
    if m.group("name"):
        alias = m.group("name")
        canon = _PLAIN.get(alias)
    else:
        alias = m.group("nname")
        canon = _NUMBERED.get((_NUMBER_WORDS[m.group("num")], alias))
    if not canon:
        return None

    chap = int(m.group("chap"))
    v1, v2, v2v, c2 = m.group("v1"), m.group("v2"), m.group("v2v"), m.group("c2")

    if v1 is None and (len(alias) <= 2 or alias in _VERSE_REQUIRED):
        return None
    if chap == 0 or chap > 150:
        return None

    if v1 is not None:
        verse: int | None = int(v1)
        end = (v2 + (f":{v2v}" if v2v else "")) if v2 else ""
        chapter = chap
    elif canon in _SINGLE_CHAPTER:
        chapter, verse, end = 1, chap, (c2 or "")
    else:
        chapter, verse, end = chap, None, (c2 or "")

    return Ref(canon, chapter, verse, end, m.start(), m.end(), m.group(0))


def _scan(text: str, ctx: RefContext) -> list[Ref]:
    refs: list[Ref] = []
    ctx.prev_end = None
    ctx.list_ok = False
    for m in _SCAN_RE.finditer(text):
        ref: Ref | None = None
        gap = text[ctx.prev_end:m.start()] if ctx.prev_end is not None else None

        if m.group("chap") is not None:                       # A: full ref
            ref = _from_full(m)
            if ref:
                ctx.book = ref.book
                ctx.chapter = int(m.group("v2")) if m.group("v2v") else ref.chapter
                ctx.list_ok = ref.verse is not None
        elif m.group("cchap") is not None:                    # B: chapter:verse
            parenthesised = m.start() > 0 and text[m.start() - 1] == "("
            follows_ref = gap is not None and _GAP_RE.fullmatch(gap) is not None
            chap, verse = int(m.group("cchap")), int(m.group("cv1"))
            if (
                ctx.book
                and (parenthesised or follows_ref)
                and 0 < chap <= 150
                and verse <= _MAX_VERSE
            ):
                ref = Ref(ctx.book, chap, verse, m.group("cv2") or "",
                          m.start(), m.end(), m.group(0))
                ctx.chapter = chap
                ctx.list_ok = True
        elif m.group("bv1") is not None:                      # C: v. / vv.
            if ctx.book and ctx.chapter:
                ref = Ref(ctx.book, ctx.chapter, int(m.group("bv1")),
                          m.group("bv2") or "", m.start(), m.end(), m.group(0))
                ctx.list_ok = True
        elif m.group("dv1") is not None:                      # D: list item
            if (
                ctx.book and ctx.chapter and ctx.list_ok
                and gap is not None and _LIST_GAP_RE.fullmatch(gap)
                and 0 < int(m.group("dv1")) <= _MAX_VERSE
            ):
                ref = Ref(ctx.book, ctx.chapter, int(m.group("dv1")),
                          m.group("dv2") or "", m.start(), m.end(), m.group(0))

        if ref:
            refs.append(ref)
            ctx.prev_end = m.end()
    return refs


def _is_ref_text(s: str) -> bool:
    return any(r.fullmatch(s) for r in _FULL_RES)


# ── Linker ────────────────────────────────────────────────────────────────────

class BibleLinker:
    """
    Turns scripture references in Markdown into Obsidian wikilinks.

    chapter_note : chapter note filename template. Placeholders:
                   {book} (abbreviation), {book_full}, {chapter}  (e.g. "{book}-{chapter:02d}")
    verse_prefix : anchor before the verse number. "#v" -> [[Gen 1#v1]], "#" -> [[Gen 1#1]]
    abbreviations: per-book overrides keyed by canonical name, e.g. {"Psalm": "Psa"}
    range_links  : like the plugin's "Copy bible verses" command, follow a range's first link
                   with invisible empty-alias links for the other verses/chapters so every
                   verse in the range shows backlinks:
                   [[1 John 2#v9|1 John 2:9–11]][[1 John 2#v10|]][[1 John 2#v11|]]
    """

    def __init__(
        self,
        chapter_note: str = "{book} {chapter}",
        verse_prefix: str = "#v",
        abbreviations: dict[str, str] | None = None,
        range_links: bool = True,
    ):
        self.chapter_note = chapter_note
        self.verse_prefix = verse_prefix
        self.range_links = range_links
        self.abbreviations = {**DEFAULT_ABBREVIATIONS, **(abbreviations or {})}

    # ── naming ────────────────────────────────────────────────────────────────

    def note_name(self, book: str, chapter: int) -> str:
        return self.chapter_note.format(
            book=self.abbreviations.get(book, book), book_full=book, chapter=chapter
        )

    def link_for(self, ref: Ref) -> str:
        note = self.note_name(ref.book, ref.chapter)
        anchor = f"{self.verse_prefix}{ref.verse}" if ref.verse is not None else ""
        return f"[[{note}{anchor}|{ref.text}]]" + self._range_extras(ref)

    def _range_extras(self, ref: Ref) -> str:
        """Invisible links for the rest of a same-chapter verse range or a chapter range."""
        if not self.range_links or not ref.end or not ref.end.isdigit():
            return ""                      # no range, or cross-chapter verse range
        end = int(ref.end)
        if ref.verse is not None:
            if not ref.verse < end <= _MAX_VERSE:
                return ""
            note = self.note_name(ref.book, ref.chapter)
            verses = range(ref.verse + 1, min(end, ref.verse + _MAX_RANGE_LINKS) + 1)
            return "".join(f"[[{note}{self.verse_prefix}{v}|]]" for v in verses)
        if not ref.chapter < end <= 150:
            return ""
        chapters = range(ref.chapter + 1, min(end, ref.chapter + _MAX_RANGE_LINKS) + 1)
        return "".join(f"[[{self.note_name(ref.book, c)}|]]" for c in chapters)

    # ── linking ───────────────────────────────────────────────────────────────

    def new_context(self, passage: str = "") -> RefContext:
        """Context seeded from a passage string like '1 John 2:9–11'."""
        ctx = RefContext()
        if passage:
            _scan(passage, ctx)
        ctx.prev_end = None
        ctx.list_ok = False
        return ctx

    def _link_chunk(self, chunk: str, ctx: RefContext) -> str:
        refs = _scan(chunk, ctx)
        if not refs:
            return chunk
        out: list[str] = []
        pos = 0
        for r in refs:
            out.append(chunk[pos:r.start])
            out.append(self.link_for(r))
            pos = r.stop
        out.append(chunk[pos:])
        return "".join(out)

    def link_line(self, line: str, ctx: RefContext) -> str:
        out: list[str] = []
        pos = 0
        for m in _PROTECTED_RE.finditer(line):
            out.append(self._link_chunk(line[pos:m.start()], ctx))
            out.append(m.group(0))
            pos = m.end()
        out.append(self._link_chunk(line[pos:], ctx))
        return "".join(out)

    def link_markdown(self, text: str, ctx: RefContext | None = None) -> str:
        """Link refs in Markdown prose. Idempotent; skips protected regions."""
        if ctx is None:
            ctx = RefContext()
        out: list[str] = []
        in_fence = in_callout = skip_section = False
        for line in text.split("\n"):
            if _FENCE_RE.match(line):
                in_fence = not in_fence
                out.append(line)
                continue
            if in_fence:
                out.append(line)
                continue
            if _CALLOUT_RE.match(line):
                in_callout = True
                out.append(line)
                continue
            if in_callout:
                if line.startswith(">"):
                    out.append(line)
                    continue
                in_callout = False
            h = _HEADING_RE.match(line)
            if h:
                title = h.group(1).strip().lstrip("*_ ").lower()
                skip_section = bool(_SKIP_HEADING_RE.match(title))
                out.append(line)
                continue
            if skip_section:
                out.append(line)
                continue
            out.append(self.link_line(line, ctx))
        return "\n".join(out)

    @staticmethod
    def unlink_markdown(text: str) -> str:
        """Remove invisible range links and unwrap [[note#anchor|ref text]] scripture links."""
        text = _INVISIBLE_RE.sub("", text)
        return _WIKI_ALIAS_RE.sub(
            lambda m: m.group(2)
            if re.search(r"\d", m.group(1)) and _is_ref_text(m.group(2))
            else m.group(0),
            text,
        )


# ── Back-compat helpers ───────────────────────────────────────────────────────

def parse_refs(text: str) -> list[str]:
    """All scripture references in prose, as canonical strings ('1 John 2:9–11')."""
    return [r.canonical() for r in _scan(text, RefContext())]


def normalize_ref(raw: str) -> str:
    """Canonicalise a structured-field reference ('1 Jn 2:9-11' -> '1 John 2:9–11')."""
    raw = raw.strip()
    refs = _scan(raw, RefContext())
    if len(refs) == 1 and refs[0].start == 0 and refs[0].stop == len(raw):
        return refs[0].canonical()
    return raw

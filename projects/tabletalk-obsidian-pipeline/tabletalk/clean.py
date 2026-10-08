"""
clean.py — Single HTML-fragment-to-Markdown cleaner shared by both extractors.

Takes raw HTML (from REST body_content or from a page element's inner HTML)
and returns clean Markdown suitable for writing to an Obsidian note.

Pipeline
--------
1. Unicode normalization (NFC, NBSP, soft-hyphen, zero-width)
2. selectolax / lxml parse
3. Strip disallowed tags and junk nodes
4. Walk tree → Markdown using an explicit whitelist
5. Post-process: escape Obsidian special chars, normalize whitespace
"""

from __future__ import annotations

import re
import unicodedata
from html import unescape

from selectolax.lexbor import LexborHTMLParser as HTMLParser, LexborNode as Node


# ── Unicode pre-processing ────────────────────────────────────────────────────

_ZERO_WIDTH = re.compile(r"[\u200b\u200c\u200d\ufeff]")
_SOFT_HYPHEN = re.compile(r"\u00ad")
_NBSP = re.compile(r"\u00a0")


def _normalize_unicode(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = _ZERO_WIDTH.sub("", text)
    text = _SOFT_HYPHEN.sub("", text)
    text = _NBSP.sub(" ", text)
    return text


# ── Node helpers ──────────────────────────────────────────────────────────────

_BLOCK_TAGS = {
    "p", "div", "article", "section", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "hr", "br",
    "pre", "figure", "figcaption",
}

_INLINE_TAGS = {
    "a", "abbr", "acronym", "b", "cite", "code", "dfn", "em",
    "i", "kbd", "mark", "q", "s", "samp", "small", "span",
    "strong", "sub", "sup", "time", "u", "var",
}

# Tags whose content is silently discarded (including their children)
_DISCARD_TAGS = {
    "script", "style", "noscript", "iframe", "object", "embed",
    "form", "input", "select", "textarea", "button",
    "nav", "footer", "header", "aside",
    # Tabletalk-specific junk
    "share-buttons", "audio", "video",
}

# CSS class fragments that mark junk containers
_JUNK_CLASSES = {
    "share-buttons", "article__audioplayer", "article__paywall",
    "adjpst__section", "article__footer", "wayfinder",
    "article__footnotes",   # references are pulled structurally elsewhere
    "pull-quote",           # handled separately in HtmlExtractor
}


def _is_junk(node: Node) -> bool:
    classes = (node.attributes.get("class") or "").split()
    return any(junk in cls for cls in classes for junk in _JUNK_CLASSES)


# ── Walker ────────────────────────────────────────────────────────────────────

def _walk(node: Node, depth: int = 0) -> str:
    """Recursively convert a node tree to Markdown."""
    tag = node.tag

    if tag == "-text":
        text = _normalize_unicode(unescape(node.text_content or ""))
        return _escape_obsidian(text)

    if tag in _DISCARD_TAGS:
        return ""

    if _is_junk(node):
        return ""

    # ── Block elements ────────────────────────────────────────────────────────
    if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        level = int(tag[1])
        inner = _children(node, depth)
        return f"\n\n{'#' * level} {inner.strip()}\n\n"

    if tag in ("p", "div", "article", "section", "figure", "figcaption"):
        inner = _children(node, depth)
        if not inner.strip():
            return ""
        return f"\n\n{inner.strip()}\n\n"

    if tag == "blockquote":
        inner = _children(node, depth + 1)
        # Prefix every non-empty line with "> "
        lines = inner.strip().splitlines()
        quoted = "\n".join(f"> {line}" if line.strip() else ">" for line in lines)
        return f"\n\n{quoted}\n\n"

    if tag == "ul":
        items = _list_items(node, depth, ordered=False)
        return f"\n\n{items}\n\n"

    if tag == "ol":
        items = _list_items(node, depth, ordered=True)
        return f"\n\n{items}\n\n"

    if tag == "li":
        inner = _children(node, depth)
        return inner.strip()

    if tag == "hr":
        return "\n\n---\n\n"

    if tag == "br":
        return "  \n"

    if tag == "pre":
        inner = node.text_content or ""
        return f"\n\n```\n{inner.strip()}\n```\n\n"

    # ── Inline elements ───────────────────────────────────────────────────────
    if tag in ("strong", "b"):
        inner = _children(node, depth)
        return f"**{inner.strip()}**" if inner.strip() else ""

    if tag in ("em", "i"):
        inner = _children(node, depth)
        return f"*{inner.strip()}*" if inner.strip() else ""

    if tag == "a":
        inner = _children(node, depth)
        href = node.attributes.get("href") or ""
        text = inner.strip()
        if not text:
            return ""
        if href.startswith("http"):
            return f"[{text}]({href})"
        return text

    if tag in ("code", "kbd", "samp"):
        inner = _children(node, depth)
        return f"`{inner.strip()}`" if inner.strip() else ""

    if tag == "q":
        inner = _children(node, depth)
        return f'"{inner.strip()}"' if inner.strip() else ""

    if tag in ("s", "del"):
        inner = _children(node, depth)
        return f"~~{inner.strip()}~~" if inner.strip() else ""

    if tag == "sup":
        inner = _children(node, depth)
        return f"^{inner.strip()}" if inner.strip() else ""

    if tag == "sub":
        inner = _children(node, depth)
        return f"~{inner.strip()}~" if inner.strip() else ""

    if tag == "mark":
        inner = _children(node, depth)
        return f"=={inner.strip()}==" if inner.strip() else ""

    # ── Passthrough containers ────────────────────────────────────────────────
    if tag in _INLINE_TAGS or tag in ("span", "time", "abbr", "acronym"):
        return _children(node, depth)

    # ── Unknown / generic containers ──────────────────────────────────────────
    return _children(node, depth)


def _children(node: Node, depth: int) -> str:
    return "".join(_walk(child, depth) for child in node.iter(include_text=True))


def _list_items(node: Node, depth: int, ordered: bool) -> str:
    lines = []
    counter = 1
    for child in node.iter(include_text=True):
        if child.tag == "li":
            inner = _walk(child, depth)
            prefix = f"{counter}." if ordered else "-"
            indent = "  " * depth
            lines.append(f"{indent}{prefix} {inner.strip()}")
            counter += 1
    return "\n".join(lines)


# ── Obsidian escape ───────────────────────────────────────────────────────────

_HASHTAG_RE = re.compile(r"(?<!\S)#(\w)")
_WIKILINK_RE = re.compile(r"\[\[")
_PIPE_RE = re.compile(r"(?<!\|)\|(?!\|)")    # stray single pipe
_FFFD_RE = re.compile(r"\ufffd")


def _escape_obsidian(text: str) -> str:
    """Escape characters that would be misinterpreted by Obsidian."""
    text = _HASHTAG_RE.sub(r"\#\1", text)
    text = _WIKILINK_RE.sub(r"\[\[", text)
    # Don't escape pipes inside table rows; simple heuristic: only outside [ ]
    return text


# ── Post-processing ───────────────────────────────────────────────────────────

_MULTI_BLANK_RE = re.compile(r"\n{3,}")


def _post_process(md: str) -> str:
    # Collapse 3+ blank lines to 2
    md = _MULTI_BLANK_RE.sub("\n\n", md)
    # Remove trailing whitespace on each line
    lines = [line.rstrip() for line in md.splitlines()]
    return "\n".join(lines).strip()


# ── Public entry point ────────────────────────────────────────────────────────

def html_to_md(html: str) -> str:
    """
    Convert an HTML fragment (or full document) to Markdown.

    Suitable for both:
      - REST ``body_content`` field (HTML fragment, may contain entities/markup)
      - Page HTML selected element inner HTML
    """
    if not html or not html.strip():
        return ""

    # Normalise Unicode before parsing
    html = _normalize_unicode(unescape(html))

    tree = HTMLParser(html)
    target = tree.body or tree.root
    md = _walk(target, depth=0)
    return _post_process(md)


def fragment_to_md(html: str) -> str:
    """Alias for ``html_to_md`` — explicit name for REST field cleaning."""
    return html_to_md(html)


def scripture_to_blockquote(text: str) -> str:
    """
    Wrap a scripture quotation string in an Obsidian callout-style blockquote.
    Input is plain text (not HTML).
    """
    if not text.strip():
        return ""
    text = _normalize_unicode(text.strip())
    lines = text.splitlines()
    quoted = "\n".join(f"> {line}" if line.strip() else ">" for line in lines)
    return f"> [!quote]\n{quoted}"

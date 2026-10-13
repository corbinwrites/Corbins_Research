"""
util.py — Small shared helpers.

stable_post_id : deterministic ID for items that have no WordPress post ID
                 (features/columns). Replaces hash(url), which Python randomises
                 per process, so IDs differed on every run.
clean_name     : collapse runs of whitespace ("Roland  Mathews" -> "Roland Mathews").
"""

from __future__ import annotations

import hashlib


def stable_post_id(url: str) -> int:
    """Deterministic 48-bit integer derived from the URL (fits SQLite INTEGER / YAML)."""
    norm = url.strip().rstrip("/")
    return int(hashlib.sha1(norm.encode("utf-8")).hexdigest()[:12], 16)


def clean_name(value: str | None) -> str:
    """Collapse all internal whitespace (incl. NBSP) to single spaces and trim."""
    return " ".join((value or "").split())

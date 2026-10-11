"""
ids.py — Stable synthetic IDs.

Features/columns are extracted from HTML and have no WordPress post_id.
Python's built-in hash() is randomized per process, so it can't be used as a
ledger key. This derives a deterministic 48-bit integer from the URL instead.
(Real WP IDs are ~5 digits, so the two ranges never collide in practice.)
"""

from __future__ import annotations

import hashlib


def stable_id(url: str) -> int:
    """Deterministic integer ID for a URL (trailing slash ignored)."""
    digest = hashlib.sha256(url.rstrip("/").encode("utf-8")).hexdigest()
    return int(digest[:12], 16)

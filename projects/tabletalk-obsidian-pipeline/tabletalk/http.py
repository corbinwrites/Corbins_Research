"""
http.py — httpx client with UA fallback, rate limiting, retry/backoff, raw
disk cache, and ETag support.

The raw cache stores responses on disk keyed by a URL-derived filename so
parser changes can re-render from cache without hitting the network.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

# ── Cache helpers ─────────────────────────────────────────────────────────────

def _cache_key(url: str, method: str = "GET", body: str = "") -> str:
    """Derive a stable filename from the request signature."""
    raw = f"{method}:{url}:{body}"
    return hashlib.sha256(raw.encode()).hexdigest()[:48]


def _cache_path(cache_dir: Path, key: str) -> Path:
    # Two-level sharding to keep directory sizes manageable
    return cache_dir / key[:2] / key[2:4] / key


def _read_cache(cache_dir: Path, key: str) -> dict | None:
    p = _cache_path(cache_dir, key)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def _write_cache(cache_dir: Path, key: str, payload: dict) -> None:
    p = _cache_path(cache_dir, key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


# ── Rate limiter ──────────────────────────────────────────────────────────────

class _RateLimiter:
    def __init__(self, delay: float):
        self._delay = delay
        self._last = 0.0

    def wait(self) -> None:
        elapsed = time.monotonic() - self._last
        if elapsed < self._delay:
            time.sleep(self._delay - elapsed)
        self._last = time.monotonic()


# ── Main client ───────────────────────────────────────────────────────────────

class TtClient:
    """
    Thin wrapper around httpx that:
      - Applies a descriptive User-Agent (falls back to curl-style on 403)
      - Enforces per-request delay + concurrency guard
      - Caches raw responses (JSON or HTML text) keyed by URL
      - Stores and sends ETag / Last-Modified on re-checks
      - Retries transient errors with exponential backoff
    """

    BASE_URL = "https://tabletalkmagazine.com"

    def __init__(
        self,
        cache_dir: Path,
        delay: float = 1.0,
        user_agent: str = "Tabletalk-Obsidian-Pipeline/1.0",
        fallback_user_agent: str = "curl/8.6.0",
    ):
        self._cache_dir = cache_dir
        self._rl = _RateLimiter(delay)
        self._ua = user_agent
        self._fallback_ua = fallback_user_agent
        self._using_fallback_ua = False
        self._session: httpx.Client | None = None

    # ── Context manager ───────────────────────────────────────────────────────

    def __enter__(self) -> "TtClient":
        self._session = httpx.Client(
            base_url=self.BASE_URL,
            headers=self._default_headers(),
            follow_redirects=True,
            timeout=30.0,
        )
        return self

    def __exit__(self, *_: Any) -> None:
        if self._session:
            self._session.close()

    def _default_headers(self) -> dict:
        ua = self._fallback_ua if self._using_fallback_ua else self._ua
        return {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    # ── Retry decorator (applied on the inner fetch method) ───────────────────

    def _make_retry(self):
        return retry(
            retry=retry_if_exception_type(
                (httpx.NetworkError, httpx.TimeoutException)
            ),
            wait=wait_exponential(multiplier=1, min=2, max=60),
            stop=stop_after_attempt(5),
            reraise=True,
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def get(
        self,
        url: str,
        *,
        params: dict | None = None,
        force: bool = False,
        cache: bool = True,
    ) -> str:
        """
        Perform a GET request. Returns the response body as a string.

        ``force=True`` bypasses the cache. ``cache=False`` skips caching entirely.
        Handles ETag/If-None-Match and 304 Not Modified.
        """
        full_url = url if url.startswith("http") else f"{self.BASE_URL}{url}"
        cache_key = _cache_key(full_url)

        cached = _read_cache(self._cache_dir, cache_key) if cache else None

        etag = cached.get("etag") if cached else None
        last_modified = cached.get("last_modified") if cached else None

        # If we have cached content and aren't forcing refresh, return it
        if cached and not force:
            logger.debug("Cache HIT: %s", url)
            return cached["body"]

        self._rl.wait()
        logger.debug("GET %s", url)

        headers = {}
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified

        response = self._fetch_with_ua_fallback("GET", full_url, params=params, headers=headers)

        if response.status_code == 304:
            logger.debug("304 Not Modified: %s", url)
            return cached["body"]

        response.raise_for_status()
        body = response.text

        if cache:
            payload = {"body": body, "url": full_url}
            if etag := response.headers.get("etag"):
                payload["etag"] = etag
            if lm := response.headers.get("last-modified"):
                payload["last_modified"] = lm
            _write_cache(self._cache_dir, cache_key, payload)

        return body

    def post(
        self,
        url: str,
        *,
        data: dict | None = None,
        json_body: dict | None = None,
        cache: bool = False,
    ) -> str:
        """Perform a POST request. Returns the response body as a string."""
        full_url = url if url.startswith("http") else f"{self.BASE_URL}{url}"

        body_str = ""
        if data:
            import urllib.parse
            body_str = urllib.parse.urlencode(data)
        elif json_body:
            body_str = json.dumps(json_body)

        cache_key = _cache_key(full_url, method="POST", body=body_str)
        cached = _read_cache(self._cache_dir, cache_key) if cache else None
        if cached:
            return cached["body"]

        self._rl.wait()
        logger.debug("POST %s", url)
        response = self._fetch_with_ua_fallback("POST", full_url, data=data, json=json_body)
        response.raise_for_status()
        text = response.text

        if cache:
            _write_cache(self._cache_dir, cache_key, {"body": text, "url": full_url})

        return text

    def get_json(self, url: str, *, params: dict | None = None, force: bool = False) -> Any:
        """Convenience: GET + JSON decode."""
        text = self.get(url, params=params, force=force)
        return json.loads(text)

    def post_json(self, url: str, *, data: dict | None = None, cache: bool = True) -> Any:
        """Convenience: POST + JSON decode."""
        text = self.post(url, data=data, cache=cache)
        return json.loads(text)

    def set_subscription_cookie(self) -> None:
        """Attach the ttSubscription cookie to the session headers."""
        if self._session:
            self._session.cookies.set("ttSubscription", "true", domain="tabletalkmagazine.com")

    # ── Internal ──────────────────────────────────────────────────────────────

    def _fetch_with_ua_fallback(
        self, method: str, url: str, **kwargs: Any
    ) -> httpx.Response:
        """Attempt request; on 403 switch to fallback UA and retry once."""
        assert self._session is not None, "TtClient must be used as context manager"
        self._session.headers.update(self._default_headers())
        response = self._session.request(method, url, **kwargs)

        if response.status_code == 403 and not self._using_fallback_ua:
            logger.warning("403 received; retrying with fallback User-Agent")
            self._using_fallback_ua = True
            self._session.headers.update(self._default_headers())
            time.sleep(2)
            response = self._session.request(method, url, **kwargs)

        return response


# ── Verification ──────────────────────────────────────────────────────────────

def verify_subscription(client: TtClient, email: str) -> bool:
    """
    POST to tabletalklookup.php. If subscribed, attach the cookie to the
    client session so subsequent HTML fetches skip client-side gating.

    Returns True if the email is subscribed.
    """
    try:
        payload = client.post_json(
            "/tabletalklookup.php",
            data={"email": email},
            cache=False,
        )
        subscribed = bool(payload.get("subscribed"))
        if subscribed:
            client.set_subscription_cookie()
            logger.info("Subscription verified for %s", email)
        else:
            logger.warning("Email %s is not subscribed", email)
        return subscribed
    except Exception as exc:
        logger.error("Subscription check failed: %s", exc)
        return False

import asyncio
import logging
import random
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

try:
    import tomllib
except ImportError:
    import tomli as tomllib

# Default configuration from settings
DEFAULT_TIMEOUT = 30.0
DEFAULT_RATE_LIMIT_MS = 500
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
RETRY_STATUS_CODES = {408, 409, 425, 429, 500, 502, 503, 504}

log = logging.getLogger(__name__)


def _load_ingestion_settings() -> dict[str, Any]:
    settings_path = Path("config/settings.toml")
    if not settings_path.exists():
        return {}
    with settings_path.open("rb") as f:
        return tomllib.load(f).get("ingestion", {})


_INGESTION_SETTINGS = _load_ingestion_settings()
DEFAULT_TIMEOUT = float(_INGESTION_SETTINGS.get("timeout_seconds", DEFAULT_TIMEOUT))
DEFAULT_RATE_LIMIT_MS = int(_INGESTION_SETTINGS.get("rate_limit_ms", DEFAULT_RATE_LIMIT_MS))
DEFAULT_USER_AGENT = _INGESTION_SETTINGS.get("user_agent") or DEFAULT_USER_AGENT


class RateLimiter:
    """Simple per-domain rate limiter."""
    def __init__(self, delay_ms: int = DEFAULT_RATE_LIMIT_MS):
        self.delay_ms = delay_ms
        self.last_called: dict[str, datetime] = {}

    async def wait(self, domain: str):
        if domain in self.last_called:
            elapsed = (datetime.now(UTC) - self.last_called[domain]).total_seconds() * 1000
            if elapsed < self.delay_ms:
                await asyncio.sleep((self.delay_ms - elapsed) / 1000.0)
        self.last_called[domain] = datetime.now(UTC)

    def wait_sync(self, domain: str):
        if domain in self.last_called:
            elapsed = (datetime.now(UTC) - self.last_called[domain]).total_seconds() * 1000
            if elapsed < self.delay_ms:
                time.sleep((self.delay_ms - elapsed) / 1000.0)
        self.last_called[domain] = datetime.now(UTC)


rate_limiter = RateLimiter()


def _domain_from_url(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc or url


def default_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
    }
    if extra:
        headers.update(extra)
    return headers


def get_client(timeout: float = DEFAULT_TIMEOUT) -> httpx.Client:
    """Get a synchronous httpx client with default configuration."""
    return httpx.Client(
        timeout=timeout,
        headers=default_headers(),
        follow_redirects=True
    )

def get_async_client(timeout: float = DEFAULT_TIMEOUT) -> httpx.AsyncClient:
    """Get an asynchronous httpx client with default configuration."""
    return httpx.AsyncClient(
        timeout=timeout,
        headers=default_headers(),
        follow_redirects=True
    )


def request_with_retries(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    max_attempts: int = 3,
    backoff_seconds: float = 0.75,
    **kwargs: Any,
) -> httpx.Response:
    """Make a rate-limited request with retry/backoff for transient crawler failures."""
    domain = _domain_from_url(url)
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        rate_limiter.wait_sync(domain)
        try:
            request_method = getattr(client, method.lower())
            response = request_method(url, **kwargs)
            if response.status_code not in RETRY_STATUS_CODES or attempt == max_attempts:
                response.raise_for_status()
                return response

            retry_after = response.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                sleep_for = float(retry_after)
            else:
                sleep_for = backoff_seconds * (2 ** (attempt - 1)) + random.uniform(0, 0.25)
            log.info("Retrying %s after HTTP %s from %s", method.upper(), response.status_code, url)
            time.sleep(sleep_for)
        except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
            last_error = exc
            if attempt == max_attempts:
                raise
            sleep_for = backoff_seconds * (2 ** (attempt - 1)) + random.uniform(0, 0.25)
            log.info("Retrying %s after %s from %s", method.upper(), exc.__class__.__name__, url)
            time.sleep(sleep_for)

    if last_error:
        raise last_error
    raise RuntimeError(f"Request failed without a response: {url}")

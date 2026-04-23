import httpx
import time
import asyncio
from typing import Dict
from datetime import datetime, timedelta

# Default configuration from settings
DEFAULT_TIMEOUT = 30.0
DEFAULT_RATE_LIMIT_MS = 500

class RateLimiter:
    """Simple per-domain rate limiter."""
    def __init__(self, delay_ms: int = DEFAULT_RATE_LIMIT_MS):
        self.delay_ms = delay_ms
        self.last_called: Dict[str, datetime] = {}

    async def wait(self, domain: str):
        if domain in self.last_called:
            elapsed = (datetime.utcnow() - self.last_called[domain]).total_seconds() * 1000
            if elapsed < self.delay_ms:
                await asyncio.sleep((self.delay_ms - elapsed) / 1000.0)
        self.last_called[domain] = datetime.utcnow()

    def wait_sync(self, domain: str):
        if domain in self.last_called:
            elapsed = (datetime.utcnow() - self.last_called[domain]).total_seconds() * 1000
            if elapsed < self.delay_ms:
                time.sleep((self.delay_ms - elapsed) / 1000.0)
        self.last_called[domain] = datetime.utcnow()

def get_client(timeout: float = DEFAULT_TIMEOUT) -> httpx.Client:
    """Get a synchronous httpx client with default configuration."""
    return httpx.Client(
        timeout=timeout,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
        follow_redirects=True
    )

def get_async_client(timeout: float = DEFAULT_TIMEOUT) -> httpx.AsyncClient:
    """Get an asynchronous httpx client with default configuration."""
    return httpx.AsyncClient(
        timeout=timeout,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
        follow_redirects=True
    )

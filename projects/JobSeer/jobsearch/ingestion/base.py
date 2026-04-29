import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from sqlite_utils import Database

from jobsearch.db import log_skip
from jobsearch.utils.http import get_client, request_with_retries


class BaseIngester(ABC):
    def __init__(self, db: Database):
        self.db = db

    def validate_apply_url(
        self, url: str | None, fallback: str | None = None
    ) -> tuple[str, bool]:
        """Validate an apply URL, falling back if necessary. Returns (url, is_resolved)."""
        if url and self._valid(url):
            return url, True
        if fallback and self._valid(fallback):
            return fallback, False
        raise ValueError(f"No resolvable apply_url. tried={url!r} fallback={fallback!r}")

    def _valid(self, url: str) -> bool:
        try:
            p = urlparse(url)
            return p.scheme in ("http", "https") and bool(p.netloc)
        except Exception:
            return False

    def stable_job_id(self, company_id: str, external_id: str) -> str:
        return hashlib.md5(f"{company_id}:{external_id}".encode()).hexdigest()

    def fetch_json(self, url: str, **kwargs) -> Any:
        with get_client() as client:
            response = request_with_retries(client, "GET", url, **kwargs)
            return response.json()

    def fetch_text(self, url: str, **kwargs) -> str:
        with get_client() as client:
            response = request_with_retries(client, "GET", url, **kwargs)
            return response.text

    def log_skip_reason(self, company_id: str | None, external_id: str | None, reason: str, raw_url: str | None):
        """Helper to log a skipped job."""
        log_skip(self.db, {
            "company_id": company_id,
            "external_id": external_id,
            "reason": reason,
            "raw_url": raw_url,
            "logged_at": datetime.utcnow().isoformat()
        })

    @abstractmethod
    def fetch(self, company: dict[str, Any]) -> list[dict[str, Any]]:
        """Fetch jobs from a specific source for a given company."""
        ...

from abc import ABC, abstractmethod
from urllib.parse import urlparse
from typing import List, Dict, Any, Tuple, Optional
from jobsearch.models import Job, Company
from jobsearch.db import log_skip, upsert_job
from sqlite_utils import Database
from datetime import datetime

class BaseIngester(ABC):
    def __init__(self, db: Database):
        self.db = db

    def validate_apply_url(
        self, url: Optional[str], fallback: Optional[str] = None
    ) -> Tuple[str, bool]:
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

    def log_skip_reason(self, company_id: Optional[str], external_id: Optional[str], reason: str, raw_url: Optional[str]):
        """Helper to log a skipped job."""
        log_skip(self.db, {
            "company_id": company_id,
            "external_id": external_id,
            "reason": reason,
            "raw_url": raw_url,
            "logged_at": datetime.utcnow().isoformat()
        })

    @abstractmethod
    def fetch(self, company: Dict[str, Any]) -> List[Job]:
        """Fetch jobs from a specific source for a given company."""
        ...

from urllib.parse import urlparse, urljoin
import re
from typing import Optional

def normalize_domain(url: str) -> Optional[str]:
    """Extract and normalize domain from a URL."""
    if not url:
        return None
    try:
        if "://" not in url:
            url = "https://" + url
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove www.
        if domain.startswith("www."):
            domain = domain[4:]
        return domain if domain else None
    except Exception:
        return None

def make_absolute(url: str, base_url: str) -> str:
    """Ensure a URL is absolute by joining it with a base URL if needed."""
    if not url:
        return ""
    return urljoin(base_url, url)

def is_absolute(url: str) -> bool:
    """Check if a URL is absolute (has scheme and netloc)."""
    try:
        parsed = urlparse(url)
        return bool(parsed.scheme and parsed.netloc)
    except Exception:
        return False

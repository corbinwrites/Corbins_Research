import httpx
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse
from jobsearch.utils.http import get_client
from jobsearch.utils.urls import normalize_domain

CAREER_URL_PATTERNS = [
    "https://{domain}/careers",
    "https://{domain}/jobs",
    "https://careers.{domain}",
    "https://jobs.{domain}",
]

ATS_SIGNATURES = {
    "greenhouse": ["boards.greenhouse.io", "boards-api.greenhouse.io"],
    "lever": ["jobs.lever.co", "api.lever.co"],
    "ashby": ["jobs.ashbyhq.com"],
    "workday": ["myworkdayjobs.com", "workday.com/en-US"],
    "smartrecruiters": ["jobs.smartrecruiters.com"],
    "icims": ["careers.icims.com"],
    "taleo": ["taleo.net"],
    "rippling": ["ats.rippling.com"],
    "neogov": ["governmentjobs.com/careers"],
}

def detect_ats(url: str) -> Tuple[Optional[str], Optional[str]]:
    """Detect ATS type and slug from a career URL. Returns (ats_type, ats_slug)."""
    with get_client() as client:
        try:
            response = client.get(url, follow_redirects=True)
            final_url = str(response.url)
            
            # 1. Check final URL against signatures
            for ats_type, sigs in ATS_SIGNATURES.items():
                for sig in sigs:
                    if sig in final_url:
                        # Extract slug if possible
                        slug = _extract_slug(ats_type, final_url)
                        return ats_type, slug
            
            # 2. Check HTML content for signatures (optional, more robust)
            # ...
            
            return None, None
        except Exception:
            return None, None

def _extract_slug(ats_type: str, url: str) -> Optional[str]:
    """Extract ATS slug from a URL based on ATS type."""
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    
    if ats_type == "greenhouse":
        # boards.greenhouse.io/slug/...
        parts = path.split("/")
        return parts[0] if parts else None
    
    if ats_type == "lever":
        # jobs.lever.co/slug/...
        parts = path.split("/")
        return parts[0] if parts else None
        
    if ats_type == "ashby":
        # jobs.ashbyhq.com/slug/...
        parts = path.split("/")
        return parts[0] if parts else None
        
    if ats_type == "neogov":
        # governmentjobs.com/careers/slug
        if "careers/" in path:
            return path.split("careers/")[1].split("/")[0]
        return None
        
    return None

def enrich_company_ats(db, company_id: str):
    """Probes for career URL and detects ATS for a company."""
    company = db["companies"].get(company_id)
    if not company or company.get("ats_type"):
        return
        
    domain = company.get("domain")
    if not domain:
        return
        
    for pattern in CAREER_URL_PATTERNS:
        url = pattern.format(domain=domain)
        ats_type, ats_slug = detect_ats(url)
        if ats_type:
            db["companies"].update(company_id, {
                "ats_type": ats_type,
                "ats_slug": ats_slug,
                "career_url": url
            })
            return

from typing import List, Dict, Any
from jobsearch.ingestion.base import BaseIngester
from jobsearch.models import Job
from jobsearch.utils.http import get_client
from jobsearch.utils.text import clean_description
from sqlite_utils import Database
import hashlib

class LeverIngester(BaseIngester):
    def fetch(self, company: Dict[str, Any]) -> List[Dict[str, Any]]:
        slug = company.get("ats_slug")
        if not slug:
            return []
        
        url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
        with get_client() as client:
            try:
                response = client.get(url)
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                self.log_skip_reason(company["id"], None, f"Lever fetch error: {e}", url)
                return []

        results = []
        for item in data:
            try:
                external_id = str(item["id"])
                # Generate unique ID based on company and external ID
                job_id = hashlib.md5(f"{company['id']}:{external_id}".encode()).hexdigest()
                
                apply_url, resolved = self.validate_apply_url(
                    item.get("hostedUrl"), 
                    fallback=company.get("career_url")
                )
                
                job = {
                    "id": job_id,
                    "company_id": company["id"],
                    "external_id": external_id,
                    "title": item["text"],
                    "department": item.get("categories", {}).get("department"),
                    "location": item.get("categories", {}).get("location"),
                    "description_md": clean_description(item.get("descriptionHtml", "")),
                    "apply_url": apply_url,
                    "apply_url_resolved": 1 if resolved else 0,
                    "source_url": item.get("hostedUrl"),
                    "sector": company.get("sector"),
                }
                results.append(job)
            except Exception as e:
                self.log_skip_reason(company["id"], str(item.get("id")), f"Lever parsing error: {e}", None)
                continue
                
        return results

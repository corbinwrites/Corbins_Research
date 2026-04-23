from typing import List, Dict, Any
from jobsearch.ingestion.base import BaseIngester
from jobsearch.models import Job
from jobsearch.utils.http import get_client
from jobsearch.utils.text import clean_description
from sqlite_utils import Database
import hashlib

class GreenhouseIngester(BaseIngester):
    def fetch(self, company: Dict[str, Any]) -> List[Dict[str, Any]]:
        slug = company.get("ats_slug")
        if not slug:
            return []
        
        url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
        with get_client() as client:
            try:
                response = client.get(url)
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                self.log_skip_reason(company["id"], None, f"Greenhouse fetch error: {e}", url)
                return []

        jobs_data = data.get("jobs", [])
        results = []
        for item in jobs_data:
            try:
                external_id = str(item["id"])
                # Generate unique ID based on company and external ID
                job_id = hashlib.md5(f"{company['id']}:{external_id}".encode()).hexdigest()
                
                apply_url, resolved = self.validate_apply_url(
                    item.get("absolute_url"), 
                    fallback=company.get("career_url")
                )
                
                job = {
                    "id": job_id,
                    "company_id": company["id"],
                    "external_id": external_id,
                    "title": item["title"],
                    "department": item.get("departments", [{}])[0].get("name") if item.get("departments") else None,
                    "location": item.get("location", {}).get("name"),
                    "description_md": clean_description(item.get("content", "")),
                    "apply_url": apply_url,
                    "apply_url_resolved": 1 if resolved else 0,
                    "source_url": url,
                    "sector": company.get("sector"),
                }
                results.append(job)
            except Exception as e:
                self.log_skip_reason(company["id"], str(item.get("id")), f"Greenhouse parsing error: {e}", None)
                continue
                
        return results

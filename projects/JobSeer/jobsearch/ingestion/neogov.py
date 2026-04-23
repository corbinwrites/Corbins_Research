from typing import List, Dict, Any
from jobsearch.ingestion.base import BaseIngester
from jobsearch.models import Job
from jobsearch.utils.http import get_client
from jobsearch.utils.text import clean_description
from sqlite_utils import Database
import hashlib

from bs4 import BeautifulSoup
import httpx

class NeogovIngester(BaseIngester):
    def fetch(self, company: Dict[str, Any]) -> List[Dict[str, Any]]:
        slug = company.get("ats_slug")
        if not slug:
            return []
        
        url = f"https://www.governmentjobs.com/careers/{slug}"
        with get_client() as client:
            try:
                # Try JSON first with correct Accept header
                headers = {"Accept": "application/json"}
                response = client.get(url + "?format=json", headers=headers)
                if response.status_code == 200 and ("application/json" in response.headers.get("Content-Type", "") or "json" in response.text[:10].lower()):
                    data = response.json()
                    return self._parse_json(company, data, url)
                
                # Fallback to HTML
                response = client.get(url)
                response.raise_for_status()
                return self._parse_html(company, response.text, url)
            except Exception as e:
                self.log_skip_reason(company["id"], None, f"Neogov fetch error: {e}", url)
                return []

    def _parse_json(self, company: Dict[str, Any], data: Dict[str, Any], source_url: str) -> List[Dict[str, Any]]:
        jobs_data = data.get("jobs", [])
        results = []
        slug = company.get("ats_slug")
        for item in jobs_data:
            try:
                external_id = str(item["jobId"])
                job_id = hashlib.md5(f"{company['id']}:{external_id}".encode()).hexdigest()
                raw_apply_url = f"https://www.governmentjobs.com/careers/{slug}/jobs/{external_id}"
                apply_url, resolved = self.validate_apply_url(raw_apply_url, fallback=company.get("career_url"))
                
                job = {
                    "id": job_id,
                    "company_id": company["id"],
                    "external_id": external_id,
                    "title": item["title"],
                    "department": item.get("department"),
                    "location": item.get("location"),
                    "description_md": clean_description(item.get("description", "")),
                    "apply_url": apply_url,
                    "apply_url_resolved": 1 if resolved else 0,
                    "source_url": raw_apply_url,
                    "sector": company.get("sector"),
                }
                results.append(job)
            except Exception as e:
                self.log_skip_reason(company["id"], str(item.get("jobId")), f"Neogov JSON parsing error: {e}", None)
        return results

    def _parse_html(self, company: Dict[str, Any], html: str, source_url: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        results = []
        slug = company.get("ats_slug")
        
        # Neogov usually has job-item or similar classes
        # This is a bit brittle, but common for scraper fallbacks
        items = soup.find_all("li", class_="job-item")
        for item in items:
            try:
                title_link = item.find("a", class_="job-details-link")
                if not title_link:
                    continue
                
                title = title_link.text.strip()
                link = title_link["href"] # e.g. /careers/cityofsanjose/jobs/4470000/some-title
                external_id = link.split("/jobs/")[1].split("/")[0]
                
                job_id = hashlib.md5(f"{company['id']}:{external_id}".encode()).hexdigest()
                raw_apply_url = f"https://www.governmentjobs.com/careers/{slug}/jobs/{external_id}"
                apply_url, resolved = self.validate_apply_url(raw_apply_url, fallback=company.get("career_url"))
                
                job = {
                    "id": job_id,
                    "company_id": company["id"],
                    "external_id": external_id,
                    "title": title,
                    "apply_url": apply_url,
                    "apply_url_resolved": 1 if resolved else 0,
                    "source_url": raw_apply_url,
                    "sector": company.get("sector"),
                }
                results.append(job)
            except Exception as e:
                self.log_skip_reason(company["id"], None, f"Neogov HTML parsing error: {e}", None)
        return results

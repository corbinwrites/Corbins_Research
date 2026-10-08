from typing import Any

from jobsearch.ingestion.base import BaseIngester
from jobsearch.utils.text import clean_description


class AshbyIngester(BaseIngester):
    def fetch(self, company: dict[str, Any]) -> list[dict[str, Any]]:
        slug = company.get("ats_slug")
        if not slug:
            return []

        url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"
        try:
            data = self.fetch_json(url)
        except Exception as e:
            self.log_skip_reason(company["id"], None, f"Ashby fetch error: {e}", url)
            return []

        jobs_data = data.get("jobs", [])
        results = []
        for item in jobs_data:
            try:
                external_id = str(item["id"])
                job_id = self.stable_job_id(company["id"], external_id)

                apply_url, resolved = self.validate_apply_url(
                    item.get("jobUrl"),
                    fallback=company.get("career_url")
                )

                job = {
                    "id": job_id,
                    "company_id": company["id"],
                    "external_id": external_id,
                    "title": item["title"],
                    "department": item.get("department"),
                    "location": item.get("location"),
                    "description_md": clean_description(item.get("descriptionHtml", "")),
                    "apply_url": apply_url,
                    "apply_url_resolved": 1 if resolved else 0,
                    "source_url": item.get("jobUrl"),
                    "sector": company.get("sector"),
                }
                results.append(job)
            except Exception as e:
                self.log_skip_reason(company["id"], str(item.get("id")), f"Ashby parsing error: {e}", None)
                continue

        return results

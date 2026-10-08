from typing import Any

from jobsearch.ingestion.base import BaseIngester
from jobsearch.utils.text import clean_description


class LeverIngester(BaseIngester):
    def fetch(self, company: dict[str, Any]) -> list[dict[str, Any]]:
        slug = company.get("ats_slug")
        if not slug:
            return []

        url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
        try:
            data = self.fetch_json(url, headers={"Accept": "application/json"})
        except Exception as e:
            self.log_skip_reason(company["id"], None, f"Lever fetch error: {e}", url)
            return []

        results = []
        for item in data:
            try:
                external_id = str(item["id"])
                job_id = self.stable_job_id(company["id"], external_id)

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

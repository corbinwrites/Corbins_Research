import os
from typing import Any

from dotenv import load_dotenv

from jobsearch.ingestion.base import BaseIngester
from jobsearch.utils.http import get_client, request_with_retries
from jobsearch.utils.text import clean_description

load_dotenv()

class USAJobsIngester(BaseIngester):
    def fetch(self, company: dict[str, Any]) -> list[dict[str, Any]]:
        api_key = os.getenv("USAJOBS_API_KEY")
        email = os.getenv("USAJOBS_EMAIL")

        if not api_key or not email:
            print("USAJOBS_API_KEY or USAJOBS_EMAIL missing in .env")
            return []

        headers = {
            "Host": "data.usajobs.gov",
            "User-Agent": email,
            "Authorization-Key": api_key
        }

        keywords = [
            "product manager", "program manager", "digital services",
            "innovation manager", "technology director", "IT manager",
            "chief information", "data services"
        ]

        results = []
        with get_client() as client:
            for kw in keywords:
                # Search by keyword and location (if provided in company/settings)
                # For federal, we might want to search broad or specific to CA/Bay Area
                url = "https://data.usajobs.gov/api/search"

                try:
                    response = request_with_retries(
                        client,
                        "GET",
                        url,
                        headers=headers,
                        params={"Keyword": kw, "LocationName": "San Francisco, California"},
                    )
                    data = response.json()
                except Exception as e:
                    self.log_skip_reason(company["id"], None, f"USAJOBS fetch error for {kw}: {e}", url)
                    continue

                items = data.get("SearchResult", {}).get("SearchResultItems", [])
                for item in items:
                    try:
                        desc = item.get("MatchedObjectDescriptor", {})
                        external_id = str(desc.get("PositionID"))
                        job_id = self.stable_job_id(company["id"], external_id)

                        # Apply URI priority
                        apply_uri_list = desc.get("ApplyURI", [])
                        raw_apply_url = apply_uri_list[0] if apply_uri_list else desc.get("PositionURI")

                        apply_url, resolved = self.validate_apply_url(
                            raw_apply_url,
                            fallback=company.get("career_url")
                        )

                        job = {
                            "id": job_id,
                            "company_id": company["id"],
                            "external_id": external_id,
                            "title": desc.get("PositionTitle"),
                            "department": desc.get("OrganizationName"),
                            "location": desc.get("PositionLocation", [{}])[0].get("LocationName"),
                            "description_md": clean_description(desc.get("QualificationSummary", "") + "\n" + desc.get("JobSummary", "")),
                            "apply_url": apply_url,
                            "apply_url_resolved": 1 if resolved else 0,
                            "source_url": desc.get("PositionURI"),
                            "sector": company.get("sector"),
                        }
                        results.append(job)
                    except Exception as e:
                        self.log_skip_reason(company["id"], str(item.get("MatchedObjectDescriptor", {}).get("PositionID")), f"USAJOBS parsing error: {e}", None)
                        continue

        return results

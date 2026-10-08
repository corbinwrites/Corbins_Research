from typing import Any
from urllib.parse import urlencode

from bs4 import BeautifulSoup

from jobsearch.ingestion.base import BaseIngester
from jobsearch.utils.text import clean_description


class NeogovIngester(BaseIngester):
    def fetch(self, company: dict[str, Any]) -> list[dict[str, Any]]:
        slug = company.get("ats_slug")
        if not slug:
            return []

        agency, department_folder = self._split_slug(slug)
        query = {"agency": agency}
        if department_folder:
            query["departmentFolder"] = department_folder
        source_url = f"https://www.governmentjobs.com/careers/{slug}"
        list_url = f"https://www.governmentjobs.com/careers/home/index?{urlencode(query)}"

        try:
            html = self.fetch_text(list_url, headers={"X-Requested-With": "XMLHttpRequest"})
            jobs = self._parse_html(company, html, list_url)
            if jobs:
                return jobs

            # Last-resort page parse for older/static agency pages.
            html = self.fetch_text(source_url)
            return self._parse_html(company, html, source_url)
        except Exception as e:
            self.log_skip_reason(company["id"], None, f"Neogov fetch error: {e}", list_url)
            return []

    def _split_slug(self, slug: str) -> tuple[str, str | None]:
        parts = [part for part in slug.strip("/").split("/") if part]
        if len(parts) > 1:
            return parts[0], "/".join(parts[1:])
        return slug, None

    def _parse_json(self, company: dict[str, Any], data: dict[str, Any], source_url: str) -> list[dict[str, Any]]:
        jobs_data = data.get("jobs", [])
        results = []
        slug = company.get("ats_slug")
        for item in jobs_data:
            try:
                external_id = str(item["jobId"])
                job_id = self.stable_job_id(company["id"], external_id)
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

    def _parse_html(self, company: dict[str, Any], html: str, source_url: str) -> list[dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        results = []
        slug = company.get("ats_slug", "").strip("/")

        items = soup.select("li.list-item, li.job-item")
        for item in items:
            try:
                title_link = item.select_one("a.item-details-link, a.job-details-link")
                if not title_link:
                    continue

                title = title_link.get_text(" ", strip=True)
                link = title_link.get("href", "")
                external_id = str(item.get("data-job-id") or "")
                if not external_id and "/jobs/" in link:
                    external_id = link.split("/jobs/")[1].split("/")[0]
                if not external_id:
                    continue

                job_id = self.stable_job_id(company["id"], external_id)
                raw_apply_url = link if link.startswith("http") else f"https://www.governmentjobs.com{link}"
                if not self._valid(raw_apply_url):
                    raw_apply_url = f"https://www.governmentjobs.com/careers/{slug}/jobs/{external_id}"
                apply_url, resolved = self.validate_apply_url(raw_apply_url, fallback=company.get("career_url"))
                meta_items = [li.get_text(" ", strip=True) for li in item.select("ul.list-meta li")]
                department = title_link.get("data-department-name")
                for meta in meta_items:
                    if meta.startswith("DEPART:"):
                        department = meta.replace("DEPART:", "", 1).strip()
                description = item.select_one(".list-entry")

                job = {
                    "id": job_id,
                    "company_id": company["id"],
                    "external_id": external_id,
                    "title": title,
                    "department": department,
                    "location": meta_items[0] if meta_items else None,
                    "description_md": clean_description(description.decode_contents() if description else ""),
                    "apply_url": apply_url,
                    "apply_url_resolved": 1 if resolved else 0,
                    "source_url": raw_apply_url,
                    "sector": company.get("sector"),
                }
                results.append(job)
            except Exception as e:
                self.log_skip_reason(company["id"], None, f"Neogov HTML parsing error: {e}", None)
        return results

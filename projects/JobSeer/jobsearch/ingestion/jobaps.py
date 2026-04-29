import html
import json
from typing import Any

from bs4 import BeautifulSoup

from jobsearch.ingestion.base import BaseIngester
from jobsearch.utils.text import clean_description


class JobApsIngester(BaseIngester):
    def fetch(self, company: dict[str, Any]) -> list[dict[str, Any]]:
        slug = company.get("ats_slug")
        if not slug:
            return []

        source_url = f"https://www.jobapscloud.com/{slug}/jobboard.asp"
        try:
            page = self.fetch_text(source_url)
        except Exception as e:
            self.log_skip_reason(company["id"], None, f"JobAps fetch error: {e}", source_url)
            return []

        return self._parse_html(company, page, source_url)

    def _parse_html(self, company: dict[str, Any], html_text: str, source_url: str) -> list[dict[str, Any]]:
        soup = BeautifulSoup(html_text, "html.parser")
        results: list[dict[str, Any]] = []

        for row in soup.select("table.JobListing tr"):
            props_input = row.select_one("input[id^='rowJobProps_']")
            if not props_input:
                continue

            try:
                props = json.loads(html.unescape(props_input.get("value", "")))
                external_id = str(props.get("rn") or "").strip()
                title = str(props.get("link") or "").strip()
                raw_apply_url = props.get("apply")
                source = props.get("url") or source_url
                if not external_id or not title:
                    continue

                apply_url, resolved = self.validate_apply_url(raw_apply_url, fallback=source)
                cells = [cell.get_text(" ", strip=True) for cell in row.select("td")]

                results.append(
                    {
                        "id": self.stable_job_id(company["id"], external_id),
                        "company_id": company["id"],
                        "external_id": external_id,
                        "title": title,
                        "location": None,
                        "description_md": clean_description(" ".join(cells)),
                        "apply_url": apply_url,
                        "apply_url_resolved": 1 if resolved else 0,
                        "source_url": source,
                        "sector": company.get("sector"),
                    }
                )
            except Exception as e:
                self.log_skip_reason(company["id"], None, f"JobAps parsing error: {e}", source_url)

        return results

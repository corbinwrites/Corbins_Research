"""
discover.py — Site discovery layer.

Provides:
  - Sitemap parsing → all issue / daily-study / article URLs
  - Issue page fetch → data-issue-id attribute
  - issue_toc AJAX call → structured manifest
  - REST bulk paging for daily studies and articles
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Generator

from selectolax.lexbor import LexborHTMLParser as HTMLParser

from .http import TtClient

logger = logging.getLogger(__name__)

SITEMAP_URL = "https://tabletalkmagazine.com/sitemap.xml"
TOC_AJAX_URL = "/wp-admin/admin-ajax.php"
REST_DAILY = "/wp-json/wp/v2/daily-study"
REST_ARTICLE = "/wp-json/wp/v2/article"


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class TocArticle:
    title: str
    url: str
    content_type: str   # "feature" | "column:" | …
    rubric: str         # column rubric (from "before" field)
    author: str         # from "after" field


@dataclass
class TocDaily:
    title: str
    day: str            # "01" .. "31"
    url: str | None
    introduction: bool


@dataclass
class IssueToc:
    issue_id: int
    issue_title: str
    issue_date: str     # "September 2026"
    issue_url: str
    articles: list[TocArticle] = field(default_factory=list)
    dailies: list[TocDaily] = field(default_factory=list)
    featured_dailies: list[TocDaily] = field(default_factory=list)


@dataclass
class SitemapEntry:
    url: str
    kind: str           # "issue" | "daily-study" | "article" | "post" | "contributor"
    year: int | None
    month: int | None


# ── Sitemap ───────────────────────────────────────────────────────────────────

_ISSUE_RE = re.compile(r"/issue/(\d{4})/(\d{2})/")
_DAILY_RE = re.compile(r"/daily-study/(\d{4})/(\d{2})/")
_ARTICLE_RE = re.compile(r"/article/(\d{4})/(\d{2})/")
_POST_RE = re.compile(r"/posts/")
_CONTRIB_RE = re.compile(r"/contributor/")


def _classify_url(url: str) -> SitemapEntry:
    if m := _ISSUE_RE.search(url):
        return SitemapEntry(url, "issue", int(m.group(1)), int(m.group(2)))
    if m := _DAILY_RE.search(url):
        return SitemapEntry(url, "daily-study", int(m.group(1)), int(m.group(2)))
    if m := _ARTICLE_RE.search(url):
        return SitemapEntry(url, "article", int(m.group(1)), int(m.group(2)))
    if _POST_RE.search(url):
        return SitemapEntry(url, "post", None, None)
    if _CONTRIB_RE.search(url):
        return SitemapEntry(url, "contributor", None, None)
    return SitemapEntry(url, "other", None, None)


def fetch_sitemap(client: TtClient) -> list[SitemapEntry]:
    """
    Fetch and parse sitemap.xml (and any sub-sitemaps).
    Returns all entries classified by kind.
    """
    logger.info("Fetching sitemap…")
    xml = client.get(SITEMAP_URL)

    urls: list[str] = []

    # Check for sitemap index
    if "<sitemapindex" in xml:
        sub_urls = re.findall(r"<loc>(https?://[^<]+)</loc>", xml)
        for sub_url in sub_urls:
            logger.debug("Fetching sub-sitemap: %s", sub_url)
            sub_xml = client.get(sub_url)
            urls.extend(re.findall(r"<loc>(https?://[^<]+)</loc>", sub_xml))
    else:
        urls = re.findall(r"<loc>(https?://[^<]+)</loc>", xml)

    entries = [_classify_url(u) for u in urls]
    logger.info(
        "Sitemap: %d total URLs (%d issues, %d daily-studies, %d articles)",
        len(entries),
        sum(1 for e in entries if e.kind == "issue"),
        sum(1 for e in entries if e.kind == "daily-study"),
        sum(1 for e in entries if e.kind == "article"),
    )
    return entries


# ── Issue ID extraction ───────────────────────────────────────────────────────

_DATA_ISSUE_ID_RE = re.compile(r'data-issue-id=["\'](\d+)["\']')


def extract_issue_id(html: str) -> int | None:
    """Extract the data-issue-id attribute from an issue page."""
    m = _DATA_ISSUE_ID_RE.search(html)
    if m:
        return int(m.group(1))
    # Fallback: parse with selectolax
    tree = HTMLParser(html)
    node = tree.css_first("[data-issue-id]")
    if node:
        return int(node.attributes.get("data-issue-id", 0)) or None
    return None


def fetch_issue_id(client: TtClient, issue_url: str) -> int | None:
    """Fetch an issue page and return its WordPress issue ID."""
    html = client.get(issue_url)
    issue_id = extract_issue_id(html)
    if issue_id:
        logger.debug("Issue %s → id=%d", issue_url, issue_id)
    else:
        logger.warning("Could not find data-issue-id on %s", issue_url)
    return issue_id


# ── Issue TOC ─────────────────────────────────────────────────────────────────

def fetch_issue_toc(client: TtClient, issue_id: int, issue_url: str) -> IssueToc:
    """
    POST to admin-ajax.php to retrieve the full issue manifest.
    Works back to 2009.
    """
    logger.info("Fetching TOC for issue id=%d", issue_id)
    data = client.post_json(
        TOC_AJAX_URL,
        data={"action": "issue_toc", "id": str(issue_id), "dataType": "json"},
        cache=True,
    )

    toc = IssueToc(
        issue_id=issue_id,
        issue_title=data.get("issue_title", ""),
        issue_date=data.get("issue_date", ""),
        issue_url=issue_url,
    )

    for a in data.get("articles_sans_dailies", []):
        toc.articles.append(
            TocArticle(
                title=a.get("title", ""),
                url=a.get("url", ""),
                content_type=a.get("content_type", "feature"),
                rubric=(a.get("before") or "").strip(),
                author=(a.get("after") or "").strip(),
            )
        )

    for d in data.get("daily_studies", []):
        toc.dailies.append(
            TocDaily(
                title=d.get("daily_title", ""),
                day=str(d.get("post_day", "")).zfill(2),
                url=d.get("post_link"),
                introduction=bool(d.get("introduction")),
            )
        )

    for d in data.get("daily_studies_featured", []):
        toc.featured_dailies.append(
            TocDaily(
                title=d.get("daily_title", ""),
                day=str(d.get("post_day", "")).zfill(2),
                url=d.get("post_link"),
                introduction=bool(d.get("introduction")),
            )
        )

    logger.info(
        "TOC '%s': %d articles, %d dailies, %d featured",
        toc.issue_title,
        len(toc.articles),
        len(toc.dailies),
        len(toc.featured_dailies),
    )
    return toc


# ── REST bulk paging ──────────────────────────────────────────────────────────

def iter_rest_pages(
    client: TtClient,
    endpoint: str,
    *,
    per_page: int = 100,
    modified_after: str | None = None,
    extra_params: dict | None = None,
) -> Generator[dict, None, None]:
    """
    Yield individual REST items from a paginated collection endpoint.

    Handles X-WP-TotalPages header to stop iteration automatically.
    """
    page = 1
    while True:
        params: dict = {"per_page": per_page, "page": page, "_embed": "false"}
        if modified_after:
            params["modified_after"] = modified_after
        if extra_params:
            params.update(extra_params)

        # We need the response headers for pagination info; use get_json for body
        # but also check total pages from a prior call
        try:
            items = client.get_json(endpoint, params=params)
        except Exception as exc:
            logger.error("REST %s page %d failed: %s", endpoint, page, exc)
            break

        if not items:
            break

        for item in items:
            yield item

        # WP REST sets X-WP-TotalPages; without headers we detect exhaustion by
        # whether the page returned fewer items than requested.
        if len(items) < per_page:
            break

        page += 1


def fetch_all_daily_studies(
    client: TtClient,
    *,
    modified_after: str | None = None,
) -> list[dict]:
    """Return all daily-study REST records (may take ~57 requests for full archive)."""
    logger.info("Fetching all daily studies from REST (modified_after=%s)…", modified_after)
    items = list(iter_rest_pages(client, REST_DAILY, modified_after=modified_after))
    logger.info("Fetched %d daily-study records", len(items))
    return items


def fetch_contributor_name(client: TtClient, contributor_id: int) -> str:
    """Fetch a contributor's display name by ID."""
    try:
        data = client.get_json(f"/wp-json/wp/v2/contributor/{contributor_id}")
        return data.get("name") or data.get("title", {}).get("rendered", "")
    except Exception as exc:
        logger.warning("Could not fetch contributor %d: %s", contributor_id, exc)
        return ""

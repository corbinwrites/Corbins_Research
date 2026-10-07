"""
enrich.py — Optional AI enrichment stage using Claude.

Generates per-article summaries and an issue-level synthesis.
Off by default in backfill; enabled with --enrich flag.

Ported from the original enricher.py with updated imports for the v3 model.
"""

from __future__ import annotations

import logging

import anthropic
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .model import Article

logger = logging.getLogger(__name__)


SUMMARY_SYSTEM = """\
You are a theological research assistant helping a pastor or Bible teacher \
prepare lessons. Given an article from Tabletalk magazine, provide a concise, \
useful summary structured for lesson planning. Be direct and practical. \
Keep the summary to 3–5 sentences.\
"""

SYNTHESIS_SYSTEM = """\
You are a theological research assistant. Given the full text and article \
summaries from one issue of Tabletalk magazine, write a brief synthesis \
(4–6 sentences) that identifies: the unifying theme across articles, the \
most significant theological claims made, and 2–3 discussion questions \
useful for a Bible study or sermon preparation.\
"""

_api_retry = retry(
    retry=retry_if_exception_type(
        (anthropic.APIConnectionError, anthropic.RateLimitError, anthropic.InternalServerError)
    ),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(4),
    reraise=True,
)


@_api_retry
def _call_claude(
    client: anthropic.Anthropic,
    system: str,
    user: str,
    max_tokens: int = 400,
) -> str:
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text.strip()


def _safe_truncate(text: str, max_chars: int = 2500) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"


def summarize_article(client: anthropic.Anthropic, article: Article) -> str:
    """Generate a lesson-planning summary for one article."""
    body_excerpt = _safe_truncate(article.body_md, 2500)
    prompt = (
        f"Article title: {article.title}\n\n"
        f"Passage: {article.passage or '(none)'}\n\n"
        f"Article text (excerpt):\n{body_excerpt}\n\n"
        "Write a 3–5 sentence summary for Bible lesson planning."
    )
    return _call_claude(client, SUMMARY_SYSTEM, prompt, max_tokens=350)


def synthesize_issue(
    client: anthropic.Anthropic,
    issue_title: str,
    article_summaries: list[tuple[str, str]],
) -> str:
    """Generate an issue-level synthesis from article summaries."""
    summaries_block = "\n\n".join(
        f"**{title}**\n{summary}" for title, summary in article_summaries
    )
    prompt = (
        f"Issue theme: {issue_title}\n\n"
        f"Article summaries:\n\n{summaries_block}\n\n"
        "Write a 4–6 sentence synthesis identifying the unifying theme, "
        "key theological claims, and 2–3 discussion questions for a Bible study."
    )
    return _call_claude(client, SYNTHESIS_SYSTEM, prompt, max_tokens=500)


def enrich_articles(
    api_key: str,
    articles: list[Article],
    issue_title: str,
    *,
    max_articles: int = 0,
) -> dict:
    """
    Run AI enrichment on a list of articles.

    Returns:
        {
            "article_summaries": [(title, summary), ...],
            "issue_synthesis":   "...",
        }
    """
    client = anthropic.Anthropic(api_key=api_key)
    to_process = articles[:max_articles] if max_articles > 0 else articles

    logger.info("Enriching %d articles with Claude…", len(to_process))
    summaries: list[tuple[str, str]] = []
    for i, article in enumerate(to_process):
        logger.info("  (%d/%d) %s", i + 1, len(to_process), article.title[:60])
        try:
            summary = summarize_article(client, article)
            summaries.append((article.title, summary))
        except Exception as exc:
            logger.error("Failed to summarize '%s': %s", article.title, exc)
            summaries.append((article.title, ""))

    synthesis = ""
    if summaries:
        logger.info("Generating issue synthesis…")
        try:
            synthesis = synthesize_issue(client, issue_title, summaries)
        except Exception as exc:
            logger.error("Failed to synthesize issue: %s", exc)

    return {"article_summaries": summaries, "issue_synthesis": synthesis}

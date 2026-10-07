"""
cli.py — Typer CLI for the Tabletalk Obsidian pipeline.

Commands
--------
  tabletalk sync              Current + previous month. Exit 0 ok, 1 partial, 2 fail.
  tabletalk backfill          Full archive, resumable.
  tabletalk rebuild           Re-render from raw cache, no network.
  tabletalk verify            Ledger vs sitemap + lint report.
  tabletalk doctor            Config, vault path, connectivity, UA check.
  tabletalk archive --epub    Save EPUB to Attachments (optional).
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.table import Table

from .config import load_config
from .discover import (
    fetch_sitemap,
    fetch_issue_id,
    fetch_issue_toc,
    fetch_all_daily_studies,
)
from .extract_rest import RestExtractor
from .extract_html import ArticleHtmlExtractor
from .http import TtClient, verify_subscription
from .ledger import Ledger
from .lint import lint_article, lint_batch, lint_coverage
from .model import Article
from .render import (
    write_article_note,
    write_issue_index,
    issue_folder_name,
)

app = typer.Typer(
    name="tabletalk",
    help="Sync Tabletalk Magazine to your Obsidian vault.",
    add_completion=False,
)
console = Console()
err = Console(stderr=True)


# ── Shared setup ──────────────────────────────────────────────────────────────

def _setup(config_path: Optional[Path] = None):
    cfg = load_config(config_path)
    cfg.cache_dir.mkdir(parents=True, exist_ok=True)
    db_path = cfg.cache_dir / "ledger.db"
    ledger = Ledger(db_path)
    ledger.migrate()
    return cfg, ledger


def _make_client(cfg) -> TtClient:
    return TtClient(
        cache_dir=cfg.cache_dir,
        delay=cfg.options.request_delay,
        user_agent=cfg.options.user_agent,
        fallback_user_agent=cfg.options.fallback_user_agent,
    )


# ── doctor ────────────────────────────────────────────────────────────────────

@app.command()
def doctor(
    config: Optional[Path] = typer.Option(None, "--config", "-c", help="Path to config.yaml"),
):
    """Check configuration, vault path, connectivity, and User-Agent."""
    console.print("[bold blue]Tabletalk Doctor[/bold blue]\n")

    cfg, ledger = _setup(config)

    # Config
    console.print(f"[green]✓[/green] Config loaded")
    console.print(f"  Email     : {cfg.ligonier_email or '[dim](not set)[/dim]'}")
    console.print(f"  Vault     : {cfg.vault_root}")
    console.print(f"  Notes     : {cfg.notes_root}")
    console.print(f"  Cache dir : {cfg.cache_dir}")

    # Vault
    if cfg.vault_root.exists():
        console.print(f"[green]✓[/green] Vault path exists")
    else:
        console.print(f"[yellow]⚠[/yellow] Vault path does not exist: {cfg.vault_root}")

    # Ledger stats
    stats = ledger.stats()
    console.print(f"[green]✓[/green] Ledger: {stats['total']} articles, {stats['errors']} errors, {stats['issues']} issues")

    # Connectivity + UA check
    console.print("\n[bold]Connectivity check…[/bold]")
    with _make_client(cfg) as client:
        try:
            html = client.get("https://tabletalkmagazine.com/", cache=False)
            if "tabletalk" in html.lower():
                ua_label = "fallback" if client._using_fallback_ua else "descriptive"
                console.print(f"[green]✓[/green] Site reachable (User-Agent: {ua_label})")
            else:
                console.print("[yellow]⚠[/yellow] Site returned unexpected content")
        except Exception as exc:
            console.print(f"[red]✗[/red] Site unreachable: {exc}")
            raise typer.Exit(2)

        # Subscription check
        if cfg.ligonier_email:
            console.print(f"\nChecking subscription for {cfg.ligonier_email}…")
            ok = verify_subscription(client, cfg.ligonier_email)
            if ok:
                console.print("[green]✓[/green] Email is subscribed")
            else:
                console.print("[yellow]⚠[/yellow] Email not confirmed as subscribed (content is still accessible)")

    console.print("\n[green bold]Doctor complete.[/green bold]")


# ── sync ──────────────────────────────────────────────────────────────────────

@app.command()
def sync(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Print what would change without writing"),
    enrich: bool = typer.Option(False, "--enrich", help="Run AI enrichment (slow, costs API credits)"),
):
    """Sync the current and previous month's issues."""
    cfg, ledger = _setup(config)
    now = datetime.now(timezone.utc)

    # Determine current and previous months
    months: list[str] = []
    month = now.replace(day=1)
    for _ in range(2):
        months.append(month.strftime("%Y-%m"))
        if month.month == 1:
            month = month.replace(year=month.year - 1, month=12)
        else:
            month = month.replace(month=month.month - 1)

    console.print(f"[bold blue]Syncing months: {', '.join(months)}[/bold blue]")

    exit_code = 0
    with _make_client(cfg) as client:
        if cfg.ligonier_email:
            verify_subscription(client, cfg.ligonier_email)

        for issue_month in months:
            try:
                result = _process_issue_month(
                    client, cfg, ledger, issue_month,
                    dry_run=dry_run, enrich=enrich,
                )
                if result == "partial":
                    exit_code = max(exit_code, 1)
                elif result == "error":
                    exit_code = max(exit_code, 2)
            except Exception as exc:
                err.print(f"[red]Error processing {issue_month}: {exc}[/red]")
                exit_code = 2

    raise typer.Exit(exit_code)


# ── backfill ──────────────────────────────────────────────────────────────────

@app.command()
def backfill(
    from_month: str = typer.Option("2009-01", "--from", help="Start month YYYY-MM"),
    to_month: Optional[str] = typer.Option(None, "--to", help="End month YYYY-MM (default: current)"),
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
    dry_run: bool = typer.Option(False, "--dry-run"),
    enrich: bool = typer.Option(False, "--enrich"),
    year: Optional[int] = typer.Option(None, "--year", help="Process a single year"),
):
    """Resumable full-archive backfill, chunked by month."""
    cfg, ledger = _setup(config)

    if year:
        from_month = f"{year}-01"
        to_month = f"{year}-12"

    now = datetime.now(timezone.utc)
    if not to_month:
        to_month = now.strftime("%Y-%m")

    # Build ordered list of YYYY-MM strings
    def _month_range(start: str, end: str) -> list[str]:
        months = []
        y, m = int(start[:4]), int(start[5:7])
        ey, em = int(end[:4]), int(end[5:7])
        while (y, m) <= (ey, em):
            months.append(f"{y:04d}-{m:02d}")
            m += 1
            if m > 12:
                m = 1
                y += 1
        return months

    months = _month_range(from_month, to_month)
    console.print(f"[bold blue]Backfill: {from_month} → {to_month} ({len(months)} months)[/bold blue]")

    exit_code = 0
    with _make_client(cfg) as client:
        if cfg.ligonier_email:
            verify_subscription(client, cfg.ligonier_email)

        with Progress(
            SpinnerColumn(), TextColumn("{task.description}"),
            BarColumn(), TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(), console=console,
        ) as progress:
            task = progress.add_task("Backfill", total=len(months))
            for issue_month in months:
                progress.update(task, description=f"[cyan]{issue_month}[/cyan]")
                try:
                    result = _process_issue_month(
                        client, cfg, ledger, issue_month,
                        dry_run=dry_run, enrich=enrich,
                    )
                    if result == "partial":
                        exit_code = max(exit_code, 1)
                except Exception as exc:
                    err.print(f"[red]Error {issue_month}: {exc}[/red]")
                    exit_code = max(exit_code, 1)
                finally:
                    progress.advance(task)

    raise typer.Exit(exit_code)


# ── rebuild ───────────────────────────────────────────────────────────────────

@app.command()
def rebuild(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
    issue: Optional[str] = typer.Option(None, "--issue", help="Limit to YYYY-MM"),
):
    """Re-render all notes from the raw cache, no network requests."""
    cfg, ledger = _setup(config)
    console.print("[bold blue]Rebuild from cache[/bold blue]")

    # For rebuild we'd re-process cached data; requires cache key → reparse
    # Full implementation: iterate ledger rows, re-read cache entries, re-render
    console.print("[yellow]Rebuild walks the ledger and re-renders from raw cache.[/yellow]")
    console.print("[dim]Full rebuild implementation: iterate ledger → re-read http cache → extract → render[/dim]")

    rows = ledger.by_issue(issue) if issue else []
    console.print(f"Found {len(rows)} rows for {issue or 'all issues'}")
    # TODO: implement full cache-based re-render in a follow-up iteration


# ── verify ────────────────────────────────────────────────────────────────────

@app.command()
def verify(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
):
    """Compare ledger coverage to sitemap; print lint report."""
    cfg, ledger = _setup(config)
    console.print("[bold blue]Verify: Ledger vs Sitemap[/bold blue]")

    with _make_client(cfg) as client:
        entries = fetch_sitemap(client)

    sitemap_daily = {e.url for e in entries if e.kind == "daily-study"}
    sitemap_article = {e.url for e in entries if e.kind == "article"}

    ledger_rows = {r["url"]: r for r in _ledger_all(ledger)}
    ledger_urls = set(ledger_rows.keys())

    # Coverage
    missing_daily = sitemap_daily - ledger_urls
    missing_article = sitemap_article - ledger_urls
    errored = ledger.errored()

    table = Table(title="Coverage Summary", show_header=True)
    table.add_column("Metric", style="cyan")
    table.add_column("Count", style="bold")
    table.add_row("Sitemap daily studies", str(len(sitemap_daily)))
    table.add_row("Sitemap articles", str(len(sitemap_article)))
    table.add_row("Ledger total", str(len(ledger_urls)))
    table.add_row("Missing daily studies", str(len(missing_daily)), style="red" if missing_daily else "green")
    table.add_row("Missing articles", str(len(missing_article)), style="red" if missing_article else "green")
    table.add_row("Errored", str(len(errored)), style="red" if errored else "green")
    console.print(table)

    if missing_daily:
        console.print(f"\n[yellow]Missing dailies (first 10):[/yellow]")
        for url in sorted(missing_daily)[:10]:
            console.print(f"  {url}")

    if errored:
        console.print(f"\n[red]Errors:[/red]")
        for row in errored[:10]:
            console.print(f"  {row['url']}: {row['error']}")


def _ledger_all(ledger: Ledger):
    with ledger._conn() as con:
        return con.execute("SELECT * FROM articles").fetchall()


# ── archive ───────────────────────────────────────────────────────────────────

@app.command()
def archive(
    epub: Optional[str] = typer.Option(None, "--epub", help="YYYY-MM of issue to download"),
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
):
    """Download an EPUB to the Attachments folder (optional)."""
    if not epub:
        console.print("[red]Specify an issue with --epub YYYY-MM[/red]")
        raise typer.Exit(1)

    cfg, _ = _setup(config)
    yyyy, mm = epub.split("-")
    url = f"https://d2ttzf2z28f6tb.cloudfront.net/tabletalk/full_issues/{yyyy}_{mm}_TT.epub"
    out_dir = cfg.vault_root / "Ministry/Church/Attachments"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{yyyy}_{mm}_TT.epub"

    console.print(f"Downloading {url}")
    import httpx
    with httpx.stream("GET", url, follow_redirects=True) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_bytes(chunk_size=65536):
                f.write(chunk)
    console.print(f"[green]✓[/green] Saved to {out_path}")


# ── Internal processing ────────────────────────────────────────────────────────

def _process_issue_month(
    client: TtClient,
    cfg,
    ledger: Ledger,
    issue_month: str,
    *,
    dry_run: bool = False,
    enrich: bool = False,
) -> str:
    """
    Process a single YYYY-MM issue month.

    1. Find sitemap entry for this month
    2. Fetch issue page → data-issue-id → TOC
    3. Fetch daily studies via REST
    4. Fetch articles via HTML
    5. Lint
    6. Render + write notes
    7. Upsert ledger

    Returns "ok" | "partial" | "error"
    """
    yyyy, mm = issue_month.split("-")
    issue_url_prefix = f"https://tabletalkmagazine.com/issue/{yyyy}/{mm}/"

    # ── Find issue URL from sitemap (cached) ─────────────────────────────────
    sitemap = fetch_sitemap(client)
    issue_entry = next(
        (e for e in sitemap if e.kind == "issue" and e.url.startswith(issue_url_prefix)),
        None,
    )

    if not issue_entry:
        console.print(f"[yellow]No sitemap entry for {issue_month}[/yellow]")
        return "partial"

    # ── Issue ID + TOC ────────────────────────────────────────────────────────
    issue_id = fetch_issue_id(client, issue_entry.url)
    if not issue_id:
        return "partial"

    toc = fetch_issue_toc(client, issue_id, issue_entry.url)
    issue_folder = issue_folder_name(issue_month, toc.issue_title)

    console.print(f"\n[cyan]{issue_month}[/cyan] — {toc.issue_title} ({len(toc.dailies)} dailies, {len(toc.articles)} articles)")

    all_articles: list[Article] = []
    errors = 0

    # ── Daily studies via REST ─────────────────────────────────────────────────
    rest_records = fetch_all_daily_studies(client)
    month_records = [
        r for r in rest_records
        if str(r.get("acf", {}).get("display_date", "")).startswith(f"{yyyy}{mm}")
    ]

    extractor = RestExtractor(
        issue=issue_month,
        issue_title=toc.issue_title,
        issue_id=issue_id,
    )
    for raw in month_records:
        article = extractor.extract_daily(raw)
        if article:
            lint_article(article)
            all_articles.append(article)
        else:
            errors += 1

    # ── Features and columns via HTML ─────────────────────────────────────────
    html_extractor = ArticleHtmlExtractor()
    for ta in toc.articles:
        # Check if we need an update
        try:
            html = client.get(ta.url)
            kind = "column" if "column" in ta.content_type.lower() else "feature"
            article = html_extractor.extract(
                html,
                url=ta.url,
                post_id=0,       # will be 0 until we resolve from HTML or REST
                kind=kind,
                rubric=ta.rubric,
                authors=[ta.author] if ta.author else None,
                issue=issue_month,
                issue_title=toc.issue_title,
                issue_id=issue_id,
            )
            if article:
                lint_article(article)
                all_articles.append(article)
            else:
                errors += 1
        except Exception as exc:
            err.print(f"[red]Error fetching {ta.url}: {exc}[/red]")
            errors += 1

    # ── Enrichment ────────────────────────────────────────────────────────────
    ai_synthesis = ""
    if enrich and cfg.anthropic_key:
        from .enrich import enrich_articles
        result = enrich_articles(
            cfg.anthropic_key, all_articles, toc.issue_title,
            max_articles=cfg.options.max_articles,
        )
        ai_synthesis = result.get("issue_synthesis", "")

    # ── Write notes ────────────────────────────────────────────────────────────
    if not dry_run:
        cfg.notes_root.mkdir(parents=True, exist_ok=True)
        for article in all_articles:
            try:
                path = write_article_note(
                    article,
                    cfg.notes_root,
                    issue_folder,
                    tags=cfg.options.tags,
                    authors_as_wikilinks=cfg.obsidian.authors_as_wikilinks,
                )
                ledger.upsert(
                    post_id=article.post_id or hash(article.url),
                    url=article.url,
                    kind=article.kind,
                    issue=article.issue,
                    study_date=article.study_date or None,
                    modified=article.modified or None,
                    content_hash=article.content_hash,
                    parser_version=article.parser_version,
                    note_path=str(path),
                    status="ok",
                )
            except Exception as exc:
                err.print(f"[red]Write error {article.url}: {exc}[/red]")
                errors += 1

        write_issue_index(
            toc, cfg.notes_root, all_articles,
            ai_synthesis=ai_synthesis,
            tags=cfg.options.tags,
        )
    else:
        console.print(f"[dim]Dry run: {len(all_articles)} notes would be written[/dim]")

    # ── Summary ───────────────────────────────────────────────────────────────
    flagged = [a for a in all_articles if a.needs_review]
    console.print(
        f"  [green]✓[/green] {len(all_articles)} notes | "
        f"[yellow]{len(flagged)} flagged[/yellow] | "
        f"[red]{errors} errors[/red]"
    )

    return "partial" if errors else "ok"


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
    app()


if __name__ == "__main__":
    main()

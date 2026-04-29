from pathlib import Path
from typing import Annotated

import typer
from sqlite_utils import Database  # Import Database type for type hinting

from jobsearch.db import get_db, init_db, upsert_job
from jobsearch.discovery.government import seed_gov_entities
from jobsearch.enrichment.ats_detector import enrich_company_ats
from jobsearch.export import export_jobs_cli, open_exports_dir
from jobsearch.ingestion import get_ingester_for_type
from jobsearch.scoring.scorer import score_all_jobs

app = typer.Typer(
    name="jobseer",
    help="JobSeer — AI-powered local job pipeline",
    invoke_without_command=True,
    no_args_is_help=False,
)

# --- Core Logic Functions (callable from CLI and TUI) ---

def _do_init():
    """Core logic for initializing the database schema."""
    init_db()
    return "Database initialized."

def _do_discover(db: Database):
    """Core logic for discovering and seeding companies."""
    seed_gov_entities(db, Path("config/gov_entities.json"))
    return "Discovery complete."

def _do_fetch(db: Database, company_id: str | None = None) -> int:
    """Core logic for ingesting jobs from active companies."""
    query = "SELECT * FROM companies WHERE active = 1"
    params = []
    if company_id:
        query += " AND id = ?"
        params.append(company_id)

    companies = list(db.query(query, params))

    total_jobs_fetched = 0
    for company in companies:
        ats_type = company.get("ats_type")
        if not ats_type:
            typer.echo(f"Skipping {company['name']} (no ats_type)")
            continue

        ingester = get_ingester_for_type(ats_type, db)
        if not ingester:
            typer.echo(f"Skipping {company['name']} (unsupported ATS type: {ats_type})")
            continue

        typer.echo(f"Fetching {company['name']} ({ats_type})...")
        try:
            jobs = ingester.fetch(company)

            new_jobs_for_company = 0
            for job_data in jobs:
                upsert_job(db, job_data)
                new_jobs_for_company += 1
            total_jobs_fetched += new_jobs_for_company
            typer.echo(f"  Done. Added/updated {new_jobs_for_company} jobs for {company['name']}.")
        except Exception as e:
            typer.echo(f"  Error fetching {company['name']}: {e}")
            # Re-raise for TUI to catch and notify, but for CLI we just log and continue
            # If we're not in TUI, we log and continue here
            continue

    return total_jobs_fetched


def fetch_all_companies(db: Database, company_id: str | None = None) -> int:
    """Backward-compatible wrapper for callers/tests using the old public helper."""
    return _do_fetch(db, company_id=company_id)

def _do_score(db: Database, force: bool = False) -> int:
    """Core logic for scoring all unscored jobs with Gemini."""
    scored_count = score_all_jobs(db, force=force)
    return scored_count

def _do_enrich(db: Database):
    """Core logic for enriching companies with ATS fingerprinting."""
    companies = list(db.query("SELECT * FROM companies WHERE ats_type IS NULL"))
    for company in companies:
        enrich_company_ats(db, company["id"])
    return f"Enriched {len(companies)} companies."

def _do_export(db: Database, export_format: str = "all", min_score: int | None = None) -> list[Path]:
    """Core logic for exporting jobs and scores."""
    outputs = export_jobs(db, export_format=export_format, min_score=min_score)
    return outputs


def export_jobs(db: Database, export_format: str = "all", min_score: int | None = None) -> list[Path]:
    """Backward-compatible wrapper for the exporter helper."""
    return export_jobs_cli(db, export_format=export_format, min_score=min_score)


def _get_stats(db: Database) -> dict:
    """Core logic for printing database statistics."""
    companies_count = db["companies"].count
    jobs_count = db["jobs"].count
    scores_count = db["scores"].count
    skipped_count = db["skip_log"].count

    status_counts = list(db.query("SELECT status, count(*) as count FROM jobs GROUP BY status"))

    return {
        "companies": companies_count,
        "jobs": jobs_count,
        "scores": scores_count,
        "skipped": skipped_count,
        "status_breakdown": status_counts
    }


# --- CLI Command Definitions ---

@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """Launch the TUI when no subcommand is supplied."""
    if ctx.invoked_subcommand is None:
        ui()

@app.command()
def ui():
    """Launch the JobSeer TUI."""
    from jobsearch.tui.app import JobSeerApp
    JobSeerApp().run()

@app.command()
def init():
    """Initialize the database schema."""
    typer.echo(_do_init())

@app.command()
def discover():
    """Run company discovery (private + government seed)."""
    db = get_db()
    typer.echo(_do_discover(db))

@app.command()
def fetch(
    company_id: Annotated[str | None, typer.Option("--company", "-c")] = None,
    score: Annotated[bool, typer.Option("--score", "-s", help="Score after fetching")] = False,
    force: Annotated[bool, typer.Option("--force", help="Force re-score and append new score rows")] = False,
):
    """Ingest jobs from all active companies."""
    db = get_db()
    total_jobs_fetched = _do_fetch(db, company_id)
    typer.echo(f"Fetched {total_jobs_fetched} jobs total.")
    if score:
        typer.echo("Scoring new jobs with Gemini...")
        scored = _do_score(db, force=force)
        typer.echo(f"  Scored {scored} jobs.")

@app.command()
def score(
    force: Annotated[bool, typer.Option("--force", help="Force re-score and append new score rows")] = False,
):
    """Score all unscored jobs with Gemini."""
    db = get_db()
    typer.echo("Scoring new jobs with Gemini...")
    scored = _do_score(db, force=force)
    typer.echo(f"  Scored {scored} jobs.")

@app.command()
def enrich():
    """Enrich companies with ATS fingerprinting."""
    db = get_db()
    typer.echo(_do_enrich(db))


@app.command()
def stats():
    """Print pipeline summary."""
    db = get_db()
    stats_data = _get_stats(db)

    typer.echo(f"Companies: {stats_data['companies']}")
    typer.echo(f"Jobs:      {stats_data['jobs']}")
    for sc in stats_data['status_breakdown']:
        typer.echo(f"  - {sc['status']}: {sc['count']}")
    typer.echo(f"Scores:    {stats_data['scores']}")
    typer.echo(f"Skipped:   {stats_data['skipped']}")


@app.command()
def export(
    format: Annotated[str, typer.Option("--format", help="all, json, md, or csv")] = "all",
    min_score: Annotated[int | None, typer.Option("--min-score")] = None,
    open: Annotated[bool, typer.Option("--open", help="Open exports folder in Finder")] = False,
):
    """Export jobs and scores for use in other AI tools."""
    db = get_db()
    outputs = _do_export(db, export_format=format, min_score=min_score)
    for output in outputs:
        typer.echo(f"Exported {output}")
    if open:
        open_exports_dir()

if __name__ == "__main__":
    app()

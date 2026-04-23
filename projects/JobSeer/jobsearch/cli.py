import typer
from typing import Annotated, Optional
from pathlib import Path
from jobsearch.db import init_db, get_db
from jobsearch.ingestion import get_ingester_for_type
from jobsearch.db import upsert_job
from jobsearch.enrichment.ats_detector import enrich_company_ats
from jobsearch.scoring.scorer import score_all_jobs
from jobsearch.discovery.government import seed_gov_entities

app = typer.Typer(
    name="jobseer",
    help="JobSeer — AI-powered local job pipeline",
    invoke_without_command=True,
    no_args_is_help=False,
)


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
def fetch(
    company_id: Annotated[Optional[str], typer.Option("--company", "-c")] = None,
    score: Annotated[bool, typer.Option("--score", "-s", help="Score after fetching")] = False,
):
    """Ingest jobs from all active companies."""
    db = get_db()
    
    query = "SELECT * FROM companies WHERE active = 1"
    params = []
    if company_id:
        query += " AND id = ?"
        params.append(company_id)
        
    companies = list(db.query(query, params))
    
    for company in companies:
        ats_type = company.get("ats_type")
        if not ats_type:
            typer.echo(f"Skipping {company['name']} (no ats_type)")
            continue
            
        typer.echo(f"Fetching {company['name']} ({ats_type})...")
        try:
            ingester = get_ingester_for_type(ats_type, db)
            jobs = ingester.fetch(company)
            
            new_jobs = 0
            for job_data in jobs:
                upsert_job(db, job_data)
                new_jobs += 1
            
            typer.echo(f"  Done. Added/updated {new_jobs} jobs.")
        except Exception as e:
            typer.echo(f"  Error fetching {company['name']}: {e}")
            
    if score:
        typer.echo("Scoring new jobs with Gemini...")
        scored = score_all_jobs(db)
        typer.echo(f"  Scored {scored} jobs.")

@app.command()
def score():
    """Score all unscored jobs with Gemini."""
    db = get_db()
    typer.echo("Scoring new jobs with Gemini...")
    scored = score_all_jobs(db)
    typer.echo(f"  Scored {scored} jobs.")

@app.command()
def discover():
    """Run company discovery (private + government seed)."""
    db = get_db()
    seed_gov_entities(db, Path("config/gov_entities.json"))
    typer.echo("Discovery complete.")

@app.command()
def enrich():
    """Enrich companies with ATS fingerprinting."""
    db = get_db()
    companies = list(db.query("SELECT * FROM companies WHERE ats_type IS NULL"))
    typer.echo(f"Probing {len(companies)} companies...")
    for company in companies:
        typer.echo(f"  Probing {company['name']}...")
        enrich_company_ats(db, company["id"])
    typer.echo("Enrichment complete.")

@app.command()
def init():
    """Initialize the database schema."""
    init_db()
    typer.echo("Database initialized.")

@app.command()
def stats():
    """Print pipeline summary."""
    db = get_db()
    companies_count = db["companies"].count
    jobs_count = db["jobs"].count
    scores_count = db["scores"].count
    skipped_count = db["skip_log"].count
    
    # Status breakdown
    status_counts = list(db.query("SELECT status, count(*) as count FROM jobs GROUP BY status"))
    
    typer.echo(f"Companies: {companies_count}")
    typer.echo(f"Jobs:      {jobs_count}")
    for sc in status_counts:
        typer.echo(f"  - {sc['status']}: {sc['count']}")
    typer.echo(f"Scores:    {scores_count}")
    typer.echo(f"Skipped:   {skipped_count}")

if __name__ == "__main__":
    app()

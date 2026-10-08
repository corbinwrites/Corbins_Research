import json
import csv
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlite_utils import Database

EXPORT_DIR = Path.home() / "JobSeer" / "exports"

def update_symlink(target: Path, link_name: str):
    """Creates or updates a symlink to the target file."""
    link = EXPORT_DIR / link_name
    if link.exists() or link.is_symlink():
        link.unlink()
    link.symlink_to(target.name)

def get_job_details_for_export(db: Database, min_score: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Fetches job details including their full score history for export.
    Combines job, company, and all associated scores.
    """
    jobs_with_scores = []
    
    # Fetch all jobs with their company data
    job_query = """
        SELECT
            j.id, j.title, j.location, j.apply_url, j.description_md, j.posted_at, j.status,
            j.external_id, j.apply_url_resolved, j.source_url, j.fetched_at,
            c.name AS company_name, c.sector, c.domain, c.ats_type, c.ats_slug
        FROM jobs j
        JOIN companies c ON j.company_id = c.id
        WHERE j.status NOT IN ('skipped')
    """
    
    for job_row in db.query(job_query):
        job_id = job_row["id"]
        scores_query = """
            SELECT
                id, score, recommendation_label, reasoning, gaps, model, scored_at
            FROM scores
            WHERE job_id = ?
            ORDER BY scored_at DESC
        """
        job_scores = list(db.query(scores_query, [job_id]))
        
        # Filter by min_score for 'top_jobs.md' later, but keep all for 'scored_jobs.json'
        if min_score is not None and not job_scores:
            continue # Skip jobs without scores if min_score is set
        if min_score is not None and job_scores and job_scores[0]["score"] < min_score:
            continue # Skip if latest score is below threshold

        job_data = dict(job_row)
        job_data["company"] = job_row.pop("company_name") # Rename for consistency
        job_data["scores"] = job_scores
        jobs_with_scores.append(job_data)
        
    # Sort by latest score if available, otherwise by fetched_at
    def sort_key(job):
        if job["scores"]:
            return job["scores"][0]["score"] # Sort by latest score descending
        return 0 # Default if no scores

    jobs_with_scores.sort(key=sort_key, reverse=True)
    return jobs_with_scores

def export_to_json(jobs_data: List[Dict[str, Any]]) -> Path:
    """Exports all job data with scores to a timestamped JSON file."""
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y-%m-%d")
    file_name = f"scored_jobs_{timestamp}.json"
    file_path = EXPORT_DIR / file_name
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(jobs_data, f, indent=2, ensure_ascii=False)
    
    update_symlink(file_path, "latest_scored_jobs.json")
    return file_path

def export_to_markdown(jobs_data: List[Dict[str, Any]], min_score: Optional[int] = None) -> Path:
    """Exports top jobs (score >= min_score) to a timestamped Markdown file."""
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y-%m-%d")
    file_name = f"top_jobs_{timestamp}.md"
    file_path = EXPORT_DIR / file_name

    md_content = []
    md_content.append(f"# JobSeer — Top Matches")
    md_content.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    md_content.append(f"Filter: score >= {min_score or 0}\n\n---")

    for job in jobs_data:
        latest_score = job["scores"][0] if job["scores"] else None
        if not latest_score or (min_score is not None and latest_score["score"] < min_score):
            continue

        md_content.append(f"\n## {job['title']} — {job['company']}")
        md_content.append(f"**Score:** {latest_score['score']} · **Recommendation:** {latest_score.get('recommendation_label', 'N/A').capitalize()}")
        md_content.append(f"**Location:** {job['location'] or 'N/A'} · **Sector:** {job['sector'] or 'N/A'}")
        md_content.append(f"**Apply:** {job['apply_url']}")
        md_content.append(f"**Reasoning:** {latest_score.get('reasoning', 'No reasoning recorded.')}")
        gaps = ", ".join(json.loads(latest_score.get('gaps', '[]')))
        md_content.append(f"**Gaps:** {gaps or 'None noted'}\n")

        md_content.append(f"### Job Description\n{job['description_md'] or 'No description available.'}\n\n---")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_content))

        
    update_symlink(file_path, "latest_top_jobs.md")
    return file_path

def export_to_csv(jobs_data: List[Dict[str, Any]]) -> Path:
    """Exports job and latest score data to a timestamped CSV file."""
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y-%m-%d")
    file_name = f"scores_only_{timestamp}.csv"
    file_path = EXPORT_DIR / file_name
    
    headers = [
        "title", "company", "location", "score", "recommendation",
        "reasoning", "gaps", "scored_at", "apply_url", "sector", "status"
    ]
    
    with open(file_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for job in jobs_data:
            latest_score = job["scores"][0] if job["scores"] else {}
            gaps = ", ".join(json.loads(latest_score.get('gaps', '[]')))
            writer.writerow({
                "title": job['title'],
                "company": job['company'],
                "location": job['location'] or "N/A",
                "score": latest_score.get('score', ''),
                "recommendation": latest_score.get('recommendation_label', ''),
                "reasoning": latest_score.get('reasoning', ''),
                "gaps": gaps,
                "scored_at": latest_score.get('scored_at', ''),
                "apply_url": job['apply_url'],
                "sector": job['sector'] or "N/A",
                "status": job['status'],
            })
            
    update_symlink(file_path, "latest_scores.csv")
    return file_path


def export_jobs_cli(db: Database, export_format: str = "all", min_score: Optional[int] = None) -> List[Path]:
    """CLI-facing function to export job data in various formats."""
    all_jobs_data = get_job_details_for_export(db, min_score=min_score)
    
    outputs = []
    if export_format == "all" or export_format == "json":
        outputs.append(export_to_json(all_jobs_data))
    if export_format == "all" or export_format == "md":
        outputs.append(export_to_markdown(all_jobs_data, min_score=min_score))
    if export_format == "all" or export_format == "csv":
        outputs.append(export_to_csv(all_jobs_data))
        
    return outputs

def open_exports_dir() -> None:
    """Opens the exports directory in the default file browser."""
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.run(["open", str(EXPORT_DIR)], check=True) # Assumes macOS 'open' command

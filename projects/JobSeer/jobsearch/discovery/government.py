import json
from pathlib import Path
from typing import Dict, Any, List
from jobsearch.db import upsert_company, init_db, get_db
from sqlite_utils import Database

def seed_gov_entities(db: Database, config_path: Path):
    """Seed the database with government entities from a JSON file."""
    if not config_path.exists():
        print(f"Seed file not found: {config_path}")
        return
    
    with open(config_path, "r") as f:
        entities = json.load(f)
        
    for entity in entities:
        # Each entity should match the 'companies' table schema
        upsert_company(db, entity)
    
    print(f"Seeded {len(entities)} government entities.")

if __name__ == "__main__":
    # For manual testing
    db = get_db()
    init_db()
    seed_gov_entities(db, Path("config/gov_entities.json"))

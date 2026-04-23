from typing import Dict, Type
from jobsearch.ingestion.base import BaseIngester
from jobsearch.ingestion.greenhouse import GreenhouseIngester
from jobsearch.ingestion.lever import LeverIngester
from jobsearch.ingestion.ashby import AshbyIngester
from jobsearch.ingestion.neogov import NeogovIngester
from jobsearch.ingestion.usajobs import USAJobsIngester

INGESTER_REGISTRY: Dict[str, Type[BaseIngester]] = {
    "greenhouse": GreenhouseIngester,
    "lever": LeverIngester,
    "ashby": AshbyIngester,
    "neogov": NeogovIngester,
    "usajobs": USAJobsIngester
}

def get_ingester_for_type(ats_type: str, db) -> BaseIngester:
    ingester_class = INGESTER_REGISTRY.get(ats_type)
    if not ingester_class:
        raise ValueError(f"No ingester found for ATS type: {ats_type}")
    return ingester_class(db)

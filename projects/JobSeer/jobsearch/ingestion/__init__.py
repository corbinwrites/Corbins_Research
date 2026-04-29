import logging

from jobsearch.ingestion.ashby import AshbyIngester
from jobsearch.ingestion.base import BaseIngester
from jobsearch.ingestion.greenhouse import GreenhouseIngester
from jobsearch.ingestion.jobaps import JobApsIngester
from jobsearch.ingestion.lever import LeverIngester
from jobsearch.ingestion.neogov import NeogovIngester
from jobsearch.ingestion.usajobs import USAJobsIngester

log = logging.getLogger(__name__)
INGESTER_REGISTRY: dict[str, type[BaseIngester]] = {
    "greenhouse": GreenhouseIngester,
    "lever": LeverIngester,
    "ashby": AshbyIngester,
    "neogov": NeogovIngester,
    "jobaps": JobApsIngester,
    "usajobs": USAJobsIngester,
}


def get_ingester_for_type(ats_type: str, db) -> BaseIngester | None:
    ingester_class = INGESTER_REGISTRY.get(ats_type)
    if not ingester_class:
        log.warning(f"No ingester found for ATS type: {ats_type}. Skipping.")
        return None
    return ingester_class(db)

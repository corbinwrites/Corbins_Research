from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime

class Company(BaseModel):
    id: str
    name: str
    domain: Optional[str] = None
    hq_lat: Optional[float] = None
    hq_lng: Optional[float] = None
    distance_miles: Optional[float] = None
    sector: str
    ats_type: Optional[str] = None
    ats_slug: Optional[str] = None
    career_url: Optional[str] = None
    last_crawled_at: Optional[str] = None
    active: int = 1

class Job(BaseModel):
    id: str
    company_id: str
    external_id: str
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    remote: int = 0
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    posted_at: Optional[str] = None
    description_md: Optional[str] = None
    apply_url: str
    apply_url_resolved: int = 1
    source_url: Optional[str] = None
    sector: Optional[str] = None
    seen: int = 0
    applied: int = 0
    status: str = "new"
    fetched_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Score(BaseModel):
    id: Optional[int] = None
    job_id: str
    score: int
    reasoning: Optional[str] = None
    gaps: Optional[str] = None
    recommend: Optional[int] = None
    model: Optional[str] = None
    scored_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

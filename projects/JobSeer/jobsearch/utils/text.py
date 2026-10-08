import re
from typing import List

def clean_description(text: str) -> str:
    """Basic cleanup of job description text."""
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def truncate_words(text: str, max_words: int = 1500) -> str:
    """Truncate text to a maximum number of words."""
    if not text:
        return ""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words])

def pre_filter_job(title: str, description: str, keywords: List[str] = None) -> bool:
    """Cheap pre-filter to see if a job is worth scoring."""
    if not keywords:
        # Default keywords from USAJOBS sweep list in Phase 5B
        keywords = ["product manager", "program manager", "digital", "innovation", "technology", "IT", "data"]
    
    title_lower = title.lower()
    description_lower = (description or "").lower()
    
    # Check if any keyword is in title or description
    for kw in keywords:
        if kw.lower() in title_lower or kw.lower() in description_lower:
            return True
    return False

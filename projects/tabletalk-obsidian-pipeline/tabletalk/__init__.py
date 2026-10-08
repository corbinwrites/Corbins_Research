"""
tabletalk — Tabletalk Magazine → Obsidian pipeline.

Phase 1 foundations package.
"""

from .model import Article
from .config import Config, load_config

__all__ = ["Article", "Config", "load_config"]
__version__ = "0.1.0"

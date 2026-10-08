"""
config.py — Configuration model and loader.

Reads config.yaml (or a path given by TABLETALK_CONFIG env var) and merges
environment-variable overrides.
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml
from pydantic import BaseModel, Field


# ── Sub-models ────────────────────────────────────────────────────────────────

class LigonierConfig(BaseModel):
    email: str = ""
    password: str = ""          # kept for optional EPUB archive command


class AnthropicConfig(BaseModel):
    api_key: str = ""


class ObsidianConfig(BaseModel):
    vault_path: str = "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal"
    notes_folder: str = "Ministry/Church/Devotionals/Tabletalk"
    authors_as_wikilinks: bool = False


class CacheConfig(BaseModel):
    dir: str = "~/.cache/tabletalk"


class Options(BaseModel):
    max_articles: int = 0           # 0 = no limit
    include_posts: bool = False     # /posts/ online exclusives
    tags: list[str] = Field(default_factory=lambda: ["tabletalk"])
    enrich: bool = False            # AI enrichment (off by default in backfill)
    request_delay: float = 1.0     # seconds between requests
    concurrency: int = 2
    user_agent: str = (
        "Tabletalk-Obsidian-Pipeline/1.0 (personal archive; +https://github.com/corbinwrites)"
    )
    fallback_user_agent: str = (
        "curl/8.6.0"
    )
    parser_version: int = 1


# ── Root config ───────────────────────────────────────────────────────────────

class Config(BaseModel):
    ligonier: LigonierConfig = Field(default_factory=LigonierConfig)
    anthropic: AnthropicConfig = Field(default_factory=AnthropicConfig)
    obsidian: ObsidianConfig = Field(default_factory=ObsidianConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    options: Options = Field(default_factory=Options)

    # ── Helpers ───────────────────────────────────────────────────────────────

    @property
    def vault_root(self) -> Path:
        return Path(self.obsidian.vault_path).expanduser()

    @property
    def notes_root(self) -> Path:
        return self.vault_root / self.obsidian.notes_folder

    @property
    def cache_dir(self) -> Path:
        return Path(self.cache.dir).expanduser()

    @property
    def anthropic_key(self) -> str:
        return self.anthropic.api_key or os.environ.get("ANTHROPIC_API_KEY", "")

    @property
    def ligonier_email(self) -> str:
        return self.ligonier.email or os.environ.get("LIGONIER_EMAIL", "")


# ── Loader ────────────────────────────────────────────────────────────────────

_DEFAULT_PATHS = [
    Path("config.yaml"),
    Path("config.yml"),
    Path.home() / ".config" / "tabletalk" / "config.yaml",
]


def load_config(path: str | Path | None = None) -> Config:
    """Load configuration from a YAML file, merging environment overrides."""

    # 1. Find the config file
    if path:
        cfg_path = Path(path)
    else:
        env_path = os.environ.get("TABLETALK_CONFIG")
        if env_path:
            cfg_path = Path(env_path)
        else:
            cfg_path = next((p for p in _DEFAULT_PATHS if p.exists()), None)

    raw: dict = {}
    if cfg_path and cfg_path.exists():
        with open(cfg_path) as f:
            raw = yaml.safe_load(f) or {}

    cfg = Config.model_validate(raw)

    # 2. Environment overrides
    if key := os.environ.get("ANTHROPIC_API_KEY"):
        cfg.anthropic.api_key = key
    if email := os.environ.get("LIGONIER_EMAIL"):
        cfg.ligonier.email = email
    if vault := os.environ.get("TABLETALK_VAULT"):
        cfg.obsidian.vault_path = vault

    return cfg

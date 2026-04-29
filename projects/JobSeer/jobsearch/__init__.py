import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

def resolve_project_root() -> Path:
    env_root = os.getenv("JOBSEER_HOME")
    if env_root:
        candidate = Path(env_root).expanduser().resolve()
        if candidate.exists():
            return candidate

    cwd = Path.cwd().resolve()
    for candidate in (cwd, *cwd.parents):
        if (candidate / "config").exists() or (candidate / ".env").exists():
            return candidate

    return Path.cwd().resolve() # Fallback to current working directory


PROJECT_ROOT = resolve_project_root()
# Load environment variables as early as possible
load_dotenv(find_dotenv(usecwd=True) or str(PROJECT_ROOT / ".env"))

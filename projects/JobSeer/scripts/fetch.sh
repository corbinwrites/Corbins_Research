#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Check if .env exists and source it
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
uv run jobseer fetch --score
echo "Completed: $(date)"

#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./push_corbins_research.sh [commit message]
# Defaults to committing all changes in /Users/corbin/Hal9000/projects/Corbins_Research and pushing main.

REPO="/Users/corbin/Hal9000/projects/Corbins_Research"
DEFAULT_MSG="Update Quartz Bible study site"
MSG="${1:-$DEFAULT_MSG}"

if [[ ! -d "$REPO/.git" ]]; then
  echo "Error: $REPO is not a git repository." >&2
  exit 1
fi

git -C "$REPO" status --short
git -C "$REPO" add -A

if git -C "$REPO" diff --cached --quiet; then
  echo "No changes to commit."
else
  git -C "$REPO" commit -m "$MSG"
fi

git -C "$REPO" push -u origin main

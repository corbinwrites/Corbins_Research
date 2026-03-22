#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./diagnose_corbins_research.sh
# Prints a compact health check for the live Obsidian vault and Quartz repo.

DEFAULT_VAULT="/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal"
VAULT="${CORBIN_VAULT_PATH:-$DEFAULT_VAULT}"
REPO="/Users/corbin/Hal9000/Corbins_Research"
ARCHIVE="/Users/corbin/Hal9000/Archived_Vault_Content/Corbin_Personal_2026-03-21"

echo "== Vault =="
echo "Vault root: $VAULT"
if [[ -d "$VAULT" ]]; then
  find "$VAULT" -maxdepth 2 -type d | sort | sed -n '1,40p'
else
  echo "Missing vault directory"
fi

echo
echo "== Obsidian =="
if [[ -f "$VAULT/.obsidian/community-plugins.json" ]]; then
  echo "Community plugins:"
  sed -n '1,80p' "$VAULT/.obsidian/community-plugins.json"
else
  echo "No community-plugins.json found"
fi

if [[ -d "$VAULT/.obsidian/plugins/obsidian-bible-linker" ]]; then
  echo "Bible Linker installed: yes"
else
  echo "Bible Linker installed: no"
fi

echo
echo "== Study Layout =="
find "$VAULT/Studies" -maxdepth 3 -type f | sort | sed -n '1,60p'

echo
echo "== Archived Notion =="
if [[ -d "$ARCHIVE" ]]; then
  find "$ARCHIVE" -maxdepth 2 | sort | sed -n '1,40p'
else
  echo "No archived Notion folder found"
fi

echo
echo "== Passage Frontmatter With Links =="
rg -n '^Passage:.*\[\[' "$VAULT/Studies" || true

echo
echo "== Repo =="
if [[ -d "$REPO/.git" ]]; then
  git -C "$REPO" status --short
  git -C "$REPO" branch --show-current
  git -C "$REPO" remote -v
else
  echo "Missing repo directory"
fi

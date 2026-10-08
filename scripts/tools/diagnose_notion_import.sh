#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./diagnose_notion_import.sh
# Focuses on the archived Notion import and highlights the common failure modes.

ARCHIVE_ROOT="/Users/corbin/Hal9000/Archived_Vault_Content/Corbin_Personal_2026-03-21"
NOTION="$ARCHIVE_ROOT/Notion"
NOTION_IMPORT="$ARCHIVE_ROOT/Notion Import"

if [[ ! -d "$NOTION" ]]; then
  echo "No archived Notion folder found at: $NOTION" >&2
  exit 1
fi

echo "== Archive roots =="
find "$ARCHIVE_ROOT" -maxdepth 2 | sort | sed -n '1,80p'

echo
echo "== Long file paths (top 25) =="
find "$NOTION" -type f | awk '{ print length($0), $0 }' | sort -nr | sed -n '1,25p'

echo
echo "== Duplicate file names =="
find "$NOTION" -type f | sed 's#.*/##' | sort | uniq -d | sed -n '1,80p'

echo
echo "== Synced block markers =="
rg -n "synced block|ai_block|Database|base" "$NOTION" "$NOTION_IMPORT" || true

echo
echo "== Likely ENAMETOOLONG candidates =="
find "$NOTION" -type f | awk 'length($0) > 220 { print length($0), $0 }' | sort -nr | sed -n '1,80p'

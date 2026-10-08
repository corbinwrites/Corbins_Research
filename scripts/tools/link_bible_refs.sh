#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./link_bible_refs.sh --root "/path/to/folder"
#   ./link_bible_refs.sh --file "/path/to/note.md"
# Add --apply to write changes.

python3 "/Users/corbin/Hal9000/Scripts/link_bible_refs.py" "$@"

# Script Helpers

These helpers live in [`/Users/corbin/Hal9000/Scripts`](/Users/corbin/Hal9000/Scripts) and are intended for repeatable maintenance of the live vault and Quartz repo.

## `push_corbins_research.sh`

Pushes the Quartz repo at [`/Users/corbin/Hal9000/Corbins_Research`](/Users/corbin/Hal9000/Corbins_Research).

Usage:

```bash
./push_corbins_research.sh
./push_corbins_research.sh "Update study notes"
```

Suggested behavior:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo='/Users/corbin/Hal9000/Corbins_Research'
message="${1:-Update Quartz site}"

git -C "$repo" status --short
git -C "$repo" add -A
git -C "$repo" commit -m "$message"
git -C "$repo" push -u origin main
```

## `diagnose_corbins_research.sh`

Prints a quick health check for the live vault and Quartz repo.

Usage:

```bash
./diagnose_corbins_research.sh
```

Suggested behavior:

```bash
#!/usr/bin/env bash
set -euo pipefail

default_vault='/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal'
vault="${CORBIN_VAULT_PATH:-$default_vault}"
repo='/Users/corbin/Hal9000/Corbins_Research'
archive='/Users/corbin/Hal9000/Archived_Vault_Content/Corbin_Personal_2026-03-21'

echo "Vault: $vault"
find "$vault" -maxdepth 2 -mindepth 1 | sort | sed -n '1,40p'
echo
echo "Archived import:"
find "$archive" -maxdepth 2 | sort | sed -n '1,40p'
echo
echo "Passage frontmatter with links:"
rg -n '^Passage:.*\[\[' "$vault/Studies" || true
echo
echo "Repo status:"
git -C "$repo" status --short
```

## `diagnose_notion_import.sh`

Checks the archived Notion tree for path-length risk, duplicate names, and common sync markers.

Usage:

```bash
./diagnose_notion_import.sh
```

Suggested behavior:

```bash
#!/usr/bin/env bash
set -euo pipefail

notion='/Users/corbin/Hal9000/Archived_Vault_Content/Corbin_Personal_2026-03-21/Notion'

find "$notion" -type f | awk '{ print length($0), $0 }' | sort -nr | head -20
echo
find "$notion" -type f | sed 's#.*/##' | sort | uniq -d
```

## Notes

- These scripts are intentionally shell-based for fast ad hoc troubleshooting.
- `push_corbins_research.sh` assumes the repo remote already points at `CleverCharlatan/Corbins_Research`.
- The diagnostics only read files. They do not mutate the vault or the archive.
- The live vault path for this setup is `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`.
- `CORBIN_VAULT_PATH` can override the default vault path during migration or testing.

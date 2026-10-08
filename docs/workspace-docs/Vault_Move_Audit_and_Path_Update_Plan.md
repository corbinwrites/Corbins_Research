# Vault Move Audit and Path Update Plan

## Purpose

This document records the path changes required to move the live Obsidian vault into the location that Obsidian mobile will actually detect on this machine.

Current live vault path:

- `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`

Previous attempted mobile path:

- `/Users/corbin/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/Corbin_Personal`

Original pre-move vault path:

- `/Users/corbin/Library/Mobile Documents/com~apple~CloudDocs/Corbin_Personal`

## Part 1: Breakage Audit

The following files contained hard-coded references to the old vault location and would break or become misleading after the move.

### Scripts

- `Scripts/link_bible_refs.py`
- `Scripts/diagnose_corbins_research.sh`

### Documentation

- `Documents/Bible_Study_Migration_Implementation_Guide.md`
- `Documents/Bible_Study_Troubleshooting_Guide.md`
- `Documents/Future_Features.md`
- `Documents/Script Helpers.md`

## Part 2: Exact Path Changes

### Script changes applied

#### `Scripts/link_bible_refs.py`

- default vault path now points to:
  - `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`
- Bible source path is now derived from the vault root instead of being duplicated inline
- supports override with:
  - `CORBIN_VAULT_PATH=/custom/path`

#### `Scripts/diagnose_corbins_research.sh`

- default vault path now points to:
  - `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`
- supports override with:
  - `CORBIN_VAULT_PATH=/custom/path ./diagnose_corbins_research.sh`

### Documentation changes applied

#### `Documents/Bible_Study_Migration_Implementation_Guide.md`

- updated the live vault path
- updated the ESV path under the vault
- updated the diagnostic shell commands
- added a note that the vault should live in Obsidian's working iCloud container path for mobile detection

#### `Documents/Bible_Study_Troubleshooting_Guide.md`

- updated the `Passage` frontmatter diagnostic command
- added a practical note about the required Obsidian iCloud container location

#### `Documents/Future_Features.md`

- updated the baseline vault path

#### `Documents/Script Helpers.md`

- updated the sample diagnostic script to the new vault path
- documented `CORBIN_VAULT_PATH`

## Move Outcome

The live vault was moved in two steps:

1. from iCloud Drive root to `com~apple~CloudDocs/Obsidian/Corbin_Personal`
2. then into Obsidian's app container at `iCloud~md~obsidian/Documents/Corbin_Personal`

The second location is the current live path.

## Files Still Dependent On The Actual Move

The repo and scripts now point at the final app-container location.

The following still depend on iCloud and mobile finishing sync:

- Obsidian mobile vault detection
- hidden `.obsidian` data syncing to iPhone or iPad
- any local command run before iCloud finishes materializing the moved files on another device

## Safe Execution Order

1. Make a backup of the live vault.
2. Move `Corbin_Personal` into Obsidian's iCloud app container.
3. Open Obsidian on Mac and confirm the vault opens from the new location.
4. Open Obsidian on iPhone or iPad and confirm the vault is detected.
5. Run diagnostics and sample linking commands.
6. If needed during transition, use `CORBIN_VAULT_PATH` temporarily for any script runs against a non-final location.

## Verification Commands

```bash
test -d "/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal" && echo "Vault found"
```

```bash
CORBIN_VAULT_PATH="/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal" \
/Users/corbin/Hal9000/Scripts/diagnose_corbins_research.sh
```

```bash
rg -n "/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal|/Users/corbin/Library/Mobile Documents/com~apple~CloudDocs/Obsidian/Corbin_Personal|/Users/corbin/Library/Mobile Documents/com~apple~CloudDocs/Corbin_Personal" /Users/corbin/Hal9000
```

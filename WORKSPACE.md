# Hal9000 Workspace

Top-level layout:

- `projects/`: active repos, tools, and skills
- `scripts/`: reusable workspace scripts and automation helpers
- `docs/`: workspace docs, plans, and notes
- `artifacts/`: screenshots, logs, temporary runtime state, and disposable local environments
- `archives/`: backups, seeds, release snapshots, and retired content
- `secrets/`: local-only secret material

Conventions:

- Keep the workspace root shallow. New work should go into one of the top-level buckets above.
- Prefer creating new repos under `projects/`.
- Put one-off screenshots, exports, and diagnostics under `artifacts/` instead of the root.
- Put temporary backups and release copies under `archives/`.
- Keep credentials and private keys under `secrets/`.

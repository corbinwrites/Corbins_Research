# Bible Study Troubleshooting Guide

## Purpose

This guide captures the current failure modes in the Notion -> Obsidian -> Quartz pipeline and how to recover from them without losing work.

## Known Issues

### Notion API `ai_block`

Symptoms:

- Import shows `Block type ai_block is not supported via the API for your bot type`

Cause:

- The Notion workspace contains AI-backed blocks that the API importer cannot fetch for this bot type

Recovery:

- Leave the failed content in place as a known gap
- Recreate the useful content manually in Obsidian if it matters
- Use Notion export zip or manual copy for anything that must be preserved

### Notion API `502`

Symptoms:

- Import fails on specific pages with `Request to Notion API failed with status: 502`

Cause:

- Transient Notion-side failure or rate-limit style instability

Recovery:

- Retry the specific page later
- Do not rerun the whole import blindly if most of it already succeeded
- If repeated, use the export zip or manual reconstruction for the page

### `ENAMETOOLONG`

Symptoms:

- Import fails with a path-length error while writing to iCloud/Obsidian

Cause:

- The vault path plus very long Notion page titles exceed filesystem filename limits

Recovery:

- Retry the import in a shorter staging path
- Shorten the imported folder name or the page title before moving it into the final vault
- Avoid embedding the full Notion title chain into nested folder names

### Synced Block Collisions

Symptoms:

- Import fails with `Synced block: ... File already exists`

Cause:

- Duplicate imported filenames or synced-block content colliding during file generation

Recovery:

- Compare the duplicate files and keep the cleaner one
- Rename one side if both matter
- Prefer a clean re-import of the specific page rather than manual duplication

## Build Issues

### Quartz `CustomOgImages` fetch failure

Symptoms:

- Local build fails in `CustomOgImages` with a fetch/network error

Cause:

- Optional OG image generation depends on network fetches and can fail in restricted or flaky environments

Recovery:

- Leave `CustomOgImages` disabled if the build is otherwise healthy
- Re-enable only if you specifically need generated OG images

### `npx quartz build` Cache Permission Error

Symptoms:

- `npx` fails with an npm cache ownership or `EPERM` error

Cause:

- Local npm cache has permission issues from a previous run

Recovery:

- Prefer `node ./quartz/bootstrap-cli.mjs build`
- Fix npm cache permissions separately only if `npx` is required for another workflow

## Verification Problems

### Bible Linker does not resolve verses

Check:

- Bible files live under `Bible/ESV/`
- Files are still one chapter per file
- Verse headings use a predictable format
- The relevant translation path is set in plugin settings

Recovery:

- Adjust `verseOffset`
- Adjust `verseHeadingLevel`
- Try the simpler link-only command first if the copy command is too strict

### Passage frontmatter shows linked Bible references

Symptoms:

- The `Passage` field in the Base view renders as a wiki link
- Study metadata looks noisy or becomes harder to filter cleanly

Cause:

- A note imported linked scripture into YAML frontmatter instead of plain text

Recovery:

- Keep `Passage` as plain text only, for example `James 1:13-18`
- Keep Bible Linker output in the note body, not in frontmatter
- Run:

```sh
rg -n '^Passage:.*\[\[' '/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Studies'
```

- If any matches remain, clean them manually or with a targeted script pass

### Crossway popups do not appear on the public site

Check:

- Passage references are written in body text, not only headings
- The site layout still injects the Crossway script
- `window.ESV_CROSSREF_OPTIONS` is loaded before the script

Recovery:

- Repeat the passage reference near the top of the body
- Avoid placing the only reference inside a heading or anchor
- Inspect the published HTML for the injected script tag

### Quartz pages look wrong under GitHub Pages

Check:

- `baseUrl` includes the GitHub Pages subpath
- Build succeeds locally
- GitHub Pages is configured to deploy from GitHub Actions

Recovery:

- Rebuild locally and verify the `public/` output
- Confirm the repo name and base path match exactly
- Clear any stale GitHub Pages settings in the repo if needed

## Operational Recovery Flow

1. Stop the failing job.
2. Identify whether the failure is Notion import, vault pathing, or Quartz build/publish.
3. Retry only the smallest failing unit.
4. Keep a clean backup before any risky re-run.
5. Move cleaned content into `Studies/Passages`, `Studies/Reference`, `People/Contacts`, or `People/Meetings` only after validation.

## Recommended Triage Order

1. Fix filesystem/path issues first.
2. Fix Notion API gaps page by page.
3. Verify Bible Linker against known-good ESV files.
4. Verify Quartz build locally.
5. Verify public site behavior last.

## Practical Notes

- For this setup, keep the live vault in Obsidian's iCloud app container at `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`.
- Do not try to preserve every Notion database behavior exactly. Normalize the content into Markdown and Obsidian properties.
- Keep the people database separate from meeting notes. That makes later CRM cleanup much easier.
- Use the archive under `/Users/corbin/Hal9000/Archived_Vault_Content/Corbin_Personal_2026-03-21` as the first recovery point.
- Use the export zip as a fallback, not as the primary migration path.
- Prefer short paths for retries when Notion page names are extremely long.

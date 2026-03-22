# Bible Study Migration Implementation Guide

## Purpose

This document describes the current migration and publishing setup for Corbin's Bible study workflow:

- Notion as the source of legacy content
- Obsidian as the local working vault
- Quartz as the public publishing layer
- GitHub Pages as the free hosting target
- Bible Linker for local scripture linking and verse copying

## Current State

- Live Obsidian vault path: `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`
- Imported ESV source path inside the vault: `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Bible/ESV`
- Archived Notion import root: `/Users/corbin/Hal9000/Archived_Vault_Content/Corbin_Personal_2026-03-21`
- Raw imported Bible notes should be treated as source material, not the final structure
- Bible Linker is installed in `.obsidian/plugins/obsidian-bible-linker`
- Quartz repo lives at `/Users/corbin/Hal9000/Corbins_Research`
- Quartz build is configured for GitHub Pages project hosting at `https://clevercharlatan.github.io/Corbins_Research`

## Architecture

### Local Authoring

Obsidian is the source of truth for day-to-day editing. The vault is organized around durable Markdown notes and lightweight properties instead of relying on Notion database behavior.

The key local working areas are:

- `Studies/Passages/` for passage-driven Bible study notes grouped by book
- `Studies/Reference/` for methods, topical notes, and external teaching notes
- `Studies/Series/` for series landing pages and future grouped study collections
- `Studies/Study Notes.base` as the operating view for study metadata
- `People/Contacts/` for one note per person
- `People/Meetings/` for interaction and follow-up notes
- `Bible/ESV/` for the local scripture corpus used by Bible Linker
- `Assets/Images/` and `Assets/Files/` for attachments and media
- `Public/` for notes intended to be published

### Public Publishing

Quartz generates the public site from the curated public subset of the vault. The public site should not expose raw imports or private shepherding notes.

For published scripture references:

- Do not publish long ESV passage bodies directly
- Keep references in body text so the Crossway popup script can detect them
- Use `ESV Cross-Reference Tool` hover popups for readers

### Bible Workflow

Bible Linker is used only for the local vault workflow.

- It links notes to scripture files inside the vault
- It can copy verses into notes
- It expects one file per chapter with verse headings in a predictable format
- Cross-chapter references remain a limitation to verify case by case

## Recommended Folder Structure

### Studies

- `Studies/Passages/<Book>/`
- `Studies/Reference/Methods/`
- `Studies/Reference/Topical/`
- `Studies/Reference/External Teaching/`
- `Studies/Series/`
- `Studies/Study Notes.base`

Use `Studies/Passages/` for notes built around a specific text. Use `Studies/Reference/` for everything that informs teaching but is not itself a passage study note.

The `Passage` property must always remain plain text. Do not store Bible wikilinks in frontmatter. Keep Bible links in the note body only.

### People CRM

- `People/Contacts/`
- `People/Meetings/`
- `People/People CRM.base`
- `People/Meeting Log.base`
- `People/People Workflow.md`

This is the mini-CRM layer. The contact note should hold stable contact and follow-up fields, while meeting notes hold the narrative record.

### Publishing

- `Public/`
- `Templates/`
- `Assets/Images/`
- `Assets/Files/`

Published notes should be written from the template in `Templates/Study Note.md` and then moved or linked into the public subtree.

## Note Templates

### Study Note Template

Use the study note template for Bible-study content that will later be published.

Required fields:

- `title`
- `Passage`
- `Book`
- `Series`
- `Status`
- `Publish`
- `Date`
- `Audience`

Required note sections:

- Big Idea
- Structure of the Text
- Key Observations
- Discussion Questions
- Cross References
- Application
- Prayer

### Person Template

Use the person template for ministry relationships and CRM data.

Required fields:

- `Status`
- `Last Contact`
- `Next Follow-up`
- `Birthday`
- `Small Group`
- `Email`
- `Phone`
- `Apple Contact Ref`

### Meeting Template

Use the meeting template for shepherding notes, follow-ups, and pastoral conversations.

Required fields:

- `Date`
- `Person`
- `Type`
- `Follow Up By`
- `Next Step`

## Operational Workflows

### Importing From Notion

1. Run Obsidian Importer with Notion API first.
2. Import into a temporary location only.
3. Audit a representative sample of notes for links, properties, and attachments.
4. Move Bible-study notes into `Studies/Passages/` or `Studies/Reference/` based on actual use.
5. Move people records into `People/Contacts/` and interaction logs into `People/Meetings/`.
6. Archive the raw Notion tree outside the live vault once the curated copies are verified.
7. Use the export zip only for recovery or for pages the API import misses.

### Building a New Study Note

1. Create the note from `Templates/Study Note.md`.
2. Put the main passage reference in frontmatter as plain text, for example `Passage: James 1:13-18`.
3. Repeat the passage reference near the top of the body.
4. Add cross references in the body and use Bible Linker there if needed.
5. Mark `Publish: true` only when the note is ready for the public subtree.

### Managing People

1. Create or update a note in `People/Contacts/`.
2. Add or update meeting notes in `People/Meetings/`.
3. Link each meeting note back to the person note.
4. Update `Last Contact` and `Next Follow-up` on the person note after every interaction.
5. Keep sensitive relational notes out of Apple Contacts.

### Publishing

1. Keep public notes in the `Public/` subtree.
2. Build Quartz locally before pushing.
3. Deploy through GitHub Pages using GitHub Actions.
4. Confirm that body-text scripture references trigger the Crossway popup.

## Diagnostics

### Vault Location Requirement

For reliable Obsidian iPhone and iPad detection on this setup, the live vault should live inside Obsidian's iCloud app container:

- `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`

The earlier `com~apple~CloudDocs/Obsidian/...` path was not sufficient on this machine. The app container path above is the working target to verify.

### Useful Paths

- Vault root: `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`
- Quartz repo: `/Users/corbin/Hal9000/Corbins_Research`
- Backup snapshot: `/Users/corbin/Hal9000/Corbin_Personal_backup_2026-03-20T2359`

### Useful Commands

```sh
find '/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal' -maxdepth 2 -mindepth 1 | sort
```

```sh
rg -n '^Passage:.*\[\[' '/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal/Studies'
```

```sh
cd '/Users/corbin/Hal9000/Corbins_Research' && node ./quartz/bootstrap-cli.mjs build
```

```sh
git -C '/Users/corbin/Hal9000/Corbins_Research' status --short
```

## Working Rules

- Do not reintroduce raw Notion trees into the live vault.
- Keep Bible source files local.
- Use plain Markdown and frontmatter for long-term durability.
- Treat archived Notion content as recovery material only.
- Keep public and private content separated early instead of after the fact.

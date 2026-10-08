# Bible Study Feature Execution Plan

## Purpose

This plan turns the current Bible-study enhancement ideas into an execution sequence for the Obsidian -> Quartz workflow.

Primary source documents reviewed:

- `Documents/Future_Features.md`
- `Documents/Bible_Study_Migration_Implementation_Guide.md`
- `Documents/Bible_Study_Troubleshooting_Guide.md`
- `vault_seed/Publishing Workflow.md`
- `vault_seed/Study Note.md`
- `vault_seed/Study Notes.base`
- `Scripts/link_bible_refs.py`
- `Scripts/bible_linker.py`

## Execution Goals

1. Normalize the study-note system so notes, templates, metadata, and folders all agree.
2. Make Bible-linking and passage-reference handling predictable in local documents.
3. Separate public study content from private working content early.
4. Add lightweight diagnostics and publishing automation so the workflow is repeatable.
5. Create the first real browse structure for series, topics, and passage studies.

## Current Gaps To Resolve First

These should be treated as blockers before broader feature work:

- Folder strategy is inconsistent across documents:
  - `Studies/Passages`, `Studies/Reference`, `Studies/Series`
  - `Studies/Inbox`, `Studies/Curated`
  - `Series`, `Topics`, `Indexes`
- Database naming is inconsistent:
  - `Study Notes.base`
  - `Bible Study Database.base`
- Template path is inconsistent:
  - docs reference `Templates/Study Note.md`
  - seed file currently lives at `vault_seed/Study Note.md`
- Bible tooling overlaps without a clear split:
  - `Scripts/link_bible_refs.py` rewrites note content into Obsidian links
  - `Scripts/bible_linker.py` fetches verse text from chapter files

## Recommended Target Model

Use one durable structure and update docs and tooling around it.

### Folder model

- `Studies/Inbox/` for raw or recently imported notes that still need cleanup
- `Studies/Passages/<Book>/` for curated passage-based studies
- `Studies/Reference/Methods/` for teaching process notes
- `Studies/Reference/Topical/` for doctrine and themes
- `Studies/Reference/External Teaching/` for conference, sermon, and external material
- `Studies/Series/` for publishable series landing pages
- `Public/Studies/` for notes approved for Quartz publishing
- `Indexes/` for browse pages if needed on the public-facing side

### Metadata model

Keep one study database name:

- `Study Notes.base`

Required fields:

- `title`
- `Passage`
- `Book`
- `Series`
- `Status`
- `Publish`
- `Date`
- `Audience`

Rules:

- `Passage` stays plain text only
- Bible links stay in the body, not YAML
- `Publish: true` means the note is eligible for public sync/publish

### Tooling split

- Keep `link_bible_refs.py` as the note-rewrite utility
- Keep `bible_linker.py` as the passage-text utility
- Do not let either script write Bible links into frontmatter

## Phased Action Plan

## Phase 1: Normalize The Content Model

Objective:
Lock the folder structure, metadata names, and template conventions before further migration or automation.

Tasks:

1. Choose the canonical study structure listed above and remove contradictory references from docs.
2. Standardize on `Study Notes.base` as the operating database unless there is a specific reason to rename it.
3. Create a real vault template location, ideally `Templates/Study Note.md`, and align the template body with the migration guide.
4. Update all guidance so `Passage` is plain text and repeated near the top of the note body.
5. Define what qualifies a note for `Studies/Inbox` versus `Studies/Passages` versus `Public/Studies`.

Deliverables:

- Updated documentation set with one folder model
- Canonical study note template
- Canonical database name and property list

Verification:

- `rg -n "Bible Study Database\\.base|Studies/Curated|^Series/$|Templates/Study Note\\.md" Documents vault_seed`
- confirm remaining matches are intentional

## Phase 2: Audit And Curate Existing Bible Study Documents

Objective:
Move the current Bible-study material out of mixed imported states and into the final operating structure.

Tasks:

1. Inventory existing study notes from the archived Notion content and live vault.
2. Classify each note as:
   - passage study
   - reference/method
   - reference/topical
   - reference/external teaching
   - series landing page
   - archive-only
3. Move raw imports into `Studies/Inbox/`.
4. Curate high-value notes into `Studies/Passages/`, `Studies/Reference/`, or `Studies/Series/`.
5. Remove or shorten problematic filenames discovered during migration.
6. Confirm frontmatter is normalized on curated notes.

Deliverables:

- Clean intake queue in `Studies/Inbox/`
- First curated note set in final folders
- Archive policy for notes that remain recovery-only

Verification:

- run a metadata spot-check on a representative sample
- run `rg -n '^Passage:.*\\[\\[' <Studies root>` to confirm frontmatter is clean

## Phase 3: Harden Local Bible Linking In Documents

Objective:
Make scripture references inside study documents predictable and low-friction.

Tasks:

1. Verify the actual `Bible/ESV/` chapter-file structure against both scripts and the plugin assumptions.
2. Test `link_bible_refs.py` against representative study notes:
   - single verse
   - verse range
   - chapter reference
   - unsupported or ambiguous patterns
3. Decide where auto-linking is safe enough to run in batch and where it should remain manual.
4. Expand book alias coverage if the current alias map misses common abbreviations in your notes.
5. Add a guardrail so link rewrites never touch YAML frontmatter.
6. Document the approved reference-writing style for study authors.

Deliverables:

- Validated Bible-linking workflow
- Safer rewrite behavior for study notes
- Reference style guide for note authors

Verification:

- dry-run link rewriting on a sample directory
- confirm no YAML fields were changed
- confirm Obsidian links resolve against `Bible/ESV/`

## Phase 4: Build Public Publishing Readiness

Objective:
Separate publishable study notes from private study material and make Quartz output reliable.

Tasks:

1. Define the publish flow from curated notes into `Public/Studies/`.
2. Confirm published study notes keep body-text passage references near the top.
3. Verify Quartz still injects the Crossway popup script correctly.
4. Add or implement `sync_public_notes.sh` to move or copy approved notes into the publishing subtree.
5. Test a local Quartz build against a small public study set.
6. Validate GitHub Pages pathing and public output.

Deliverables:

- repeatable public-note sync path
- verified local Quartz build for Bible-study pages
- clear rule for what stays private versus public

Verification:

- local Quartz build succeeds
- public pages show passage references in readable positions
- Crossway popup behavior works on sample study pages

## Phase 5: Create Browse And Discovery Features

Objective:
Turn the study notes into a usable study library instead of a flat file dump.

Tasks:

1. Create at least one real `Studies/Series/` landing page from the existing template.
2. Create index pages for:
   - passage studies by book
   - topical/reference studies
   - series
3. Decide whether browse pages live in the vault, Quartz content layer, or both.
4. Add consistent cross-links between study notes, series pages, and topical pages.
5. Pick a small pilot set of notes to fully prepare for public use.

Deliverables:

- first publishable series page
- first browse/index pages
- clear navigation between studies

Verification:

- pilot notes can be found by book, topic, and series
- internal links resolve locally and in published output

## Phase 6: Add Diagnostics And Repeatable Operations

Objective:
Reduce manual drift and make the workflow safer to maintain.

Tasks:

1. Implement `vault_health_check.sh`.
2. Implement `notion_cleanup_report.sh`.
3. Add a study-note diagnostics script or command set for:
   - missing required frontmatter
   - wiki-linked `Passage` fields
   - notes missing `Publish`
   - notes in the wrong folder for their type
4. Keep `push_corbins_research.sh` as the publish command and optionally wrap it later in Shortcuts.
5. Document the routine weekly maintenance flow.

Deliverables:

- diagnostics scripts
- publish script documented as the standard push path
- routine maintenance checklist

Verification:

- scripts run cleanly on the vault and produce actionable output
- publishing flow is one command plus local build verification

## Priority Order

Execute in this order:

1. Phase 1: Normalize the content model
2. Phase 2: Audit and curate existing documents
3. Phase 3: Harden local Bible linking
4. Phase 4: Build public publishing readiness
5. Phase 5: Create browse and discovery features
6. Phase 6: Add diagnostics and repeatable operations

## Immediate Next Actions

These are the highest-value next steps for the next work session:

1. Standardize the naming and folder model across the existing docs.
2. Create the real `Templates/Study Note.md` and align it with the agreed metadata model.
3. Inventory current Bible-study notes into `Inbox`, `Curated`, and `Archive-only` buckets.
4. Run a targeted frontmatter cleanup for `Passage` fields.
5. Test the link-rewrite script on a small sample of curated notes.

## Suggested Work Breakdown

If executed as a short project, this is the practical order:

- Day 1:
  - resolve naming and folder-model conflicts
  - finalize the template and metadata contract
- Day 2:
  - inventory and classify current study notes
  - curate the first usable passage-study set
- Day 3:
  - test and refine Bible-linking behavior
  - clean frontmatter edge cases
- Day 4:
  - implement public-note sync and verify Quartz output
  - publish one pilot series or study page
- Day 5:
  - add diagnostics scripts
  - document the maintenance and publishing routine

## Success Criteria

The enhancement work is complete when:

- all Bible-study docs point to one structure and one metadata model
- study notes are separated into inbox, curated, and public-ready states
- passage references are reliable locally and clean in frontmatter
- Quartz can publish a small set of Bible-study notes consistently
- browse pages exist for at least one series and one passage-study grouping
- diagnostics can catch the common failure modes before publish

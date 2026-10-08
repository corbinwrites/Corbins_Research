# Future Features for Corbin's Research Vault

This document tracks the next useful capabilities for the `Corbin_Personal` vault and the Quartz publishing repo `Corbins_Research`.

Current baseline:

- Vault: `/Users/corbin/Library/Mobile Documents/iCloud~md~obsidian/Documents/Corbin_Personal`
- Publishing repo: `/Users/corbin/Hal9000/Corbins_Research`
- People CRM files: `People/Contacts/`, `People/Meetings/`, `People CRM.base`
- Study files: `Studies/Passages/`, `Studies/Reference/`, `Studies/Series/`, `Study Notes.base`

## 1. Apple Contacts To Obsidian People CRM

Goal: keep Apple Contacts as the communication directory, while Obsidian holds the ministry context, history, and follow-up workflow.

### Recommended workflow

1. Keep one Obsidian note per person in `People/Contacts/`.
2. Use the `People CRM.base` table as the operating view.
3. Put relational notes in `People/Meetings/`, not in the person record itself.
4. Use `Apple Contact Ref` as the bridge field for the matching Apple contact entry.
5. Keep `Last Contact` and `Next Follow-up` current after every interaction.

### Bridge options

1. Manual `vCard` export/import.
2. `CardDAV` sync later if you decide you want a true two-way contact backend.
3. An Obsidian contacts plugin if you want to import/export contact cards inside the vault.

### Step-by-step manual bridge

1. In Apple Contacts, export the relevant contact set as a `vCard`.
2. Save the export somewhere predictable, such as `/Users/corbin/Hal9000/Documents/exports/contacts/YYYY-MM-DD.vcf`.
3. Create or update the matching person note in `People/Contacts/`.
4. Copy over the stable fields into Obsidian:
   - name
   - phone
   - email
   - birthday
   - family relationships
   - group membership
5. Add the Apple contact reference to the `Apple Contact Ref` field.
6. Add a meeting note in `People/Meetings/` for any substantive interaction.
7. Update `Last Contact` and `Next Follow-up` on the person note.
8. Repeat the export/import cycle when needed instead of trying to force full sync too early.

### When to move beyond manual import

- You have more than a few dozen active contacts.
- You want Apple Contacts and Obsidian to stay aligned with less manual work.
- You are comfortable maintaining a CardDAV source or a sync plugin.

### CardDAV direction

If you later want a real sync layer, the clean model is:

- Apple Contacts stays the user-facing phone book.
- Obsidian stays the shepherding/CRM layer.
- A CardDAV-compatible backend or plugin handles transport.

That direction is better than trying to make Obsidian the primary contact editor for everything.

## 2. GitHub Push Options

Goal: make pushing `Corbins_Research` boring and repeatable.

### Option A: Direct git command

Best for full control.

```bash
cd /Users/corbin/Hal9000/Corbins_Research
git status
git add .
git commit -m "Update vault and docs"
git push origin main
```

Use this when you are already at the machine and want the least magic.

### Option B: Small shell script

Best for repeat use.

Recommended script path:
`/Users/corbin/Hal9000/Scripts/push_corbins_research.sh`

Recommended behavior:

- check status
- stage changes
- create a timestamped commit message if one is not passed in
- push to `origin main`

### Option C: Apple Shortcuts

Best when you want a one-tap workflow from Mac, iPhone, or iPad.

Recommended shortcut flow:

1. Ask for commit message.
2. Run a shell script on the Mac, or run an SSH command if you want remote execution.
3. Execute the same `git add`, `git commit`, `git push` flow as the shell script.
4. Show the push result in a notification.

This is most useful if you want a quick publish button without opening Terminal.

### Recommended push path today

Use the shell script first, then wrap it in an Apple Shortcut later if you still want the UX improvement.

### Recommended Apple Shortcut

1. Create a new Shortcut named `Publish Corbins Research`.
2. Add `Ask for Input` for the commit message.
3. Add `Run Shell Script`.
4. Use this script body:

```bash
/Users/corbin/Hal9000/Scripts/push_corbins_research.sh "$1"
```

5. Pass the Shortcut input as the first argument.
6. Run it from Mac, iPhone, or iPad if your Mac is available for execution.

If you want a zero-input version, skip the prompt and call the script with no arguments.

## 3. Study Notes Expansion

The imported Bible database content should become the new study note system, not a throwaway import.

### Recommended structure

- `Studies/Passages/<Book>/` for passage-driven studies
- `Studies/Reference/Methods/` for process and ministry method notes
- `Studies/Reference/Topical/` for doctrinal or thematic notes
- `Studies/Reference/External Teaching/` for conference and sermon-note material
- `Studies/Series/` for future publishable series groupings

### Note template rules

- Keep `Passage` as plain text in frontmatter.
- Put the passage reference near the top of the note body.
- Use explicit sections like `Big Idea`, `Key Observations`, `Discussion Questions`, and `Prayer`.
- Keep public notes `Publish: true`.
- Keep internal notes `Publish: false`.

### Bible-linking rule

- Use Bible Linker for local study workflow.
- Use the ESV Cross-Reference popup tool on the public site.
- Do not duplicate long Bible text into public notes.

## 4. Helpful Scripts To Add Next

These are the most useful scripts to create in `Scripts/` later:

1. `vault_health_check.sh`
2. `notion_cleanup_report.sh`
3. `contacts_export_index.sh`
4. `sync_public_notes.sh`

### Suggested diagnostics

`vault_health_check.sh` should print:

- the vault path
- top-level folder list
- archived import status
- file count by major folder
- long-path candidates

`notion_cleanup_report.sh` should print:

- files under the archived `Notion/`
- failed import collision candidates
- duplicate filenames
- paths that likely need shortening

## 5. What To Build Next

Priority order:

1. Refine the study taxonomy and create first real `Studies/Series/` landing pages.
2. Continue shaping the people CRM around the imported people database.
3. Add an Apple Shortcut wrapper around the GitHub push script.
4. Decide whether Apple Contacts stays manual-vCard only or grows into a CardDAV-backed sync flow.

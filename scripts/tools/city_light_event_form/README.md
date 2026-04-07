# City Light Event Form Apps Script

This folder is the local source for the Google Apps Script project that will manage the City Light event request workflow.

## What is included

- `Code.js`: form parsing, spreadsheet-backed routing, email sending, trigger installation, and logging
- `appsscript.json`: Apps Script manifest with the required scopes

## Intended workflow

1. Link this folder to an Apps Script project with `clasp`.
2. Push the files to Google Apps Script.
3. Run `setupProject` once to seed the routing sheet, add tracking columns, and install the submit trigger.
4. Review or edit the `Routing Rules` tab in the linked response spreadsheet.
5. Submit test entries and verify email routing.

## Suggested local setup

Install `clasp`:

```bash
npm install -g @google/clasp
```

Authenticate:

```bash
clasp login
```

Create or clone an Apps Script project in this directory:

```bash
cd /Users/corbin/Hal9000/Scripts/city_light_event_form
clasp create --type standalone --title "City Light Event Form"
```

If you already have a project, copy its script ID into `.clasp.json` and push:

```bash
clasp push
```

Open the Apps Script editor:

```bash
clasp open
```

## Deployment notes

- `FORM_CONFIG.formId` is already set to the form referenced in the recommendations document.
- The script expects the Google Form to be linked to a response spreadsheet.
- Notification rules now live in the `Routing Rules` sheet in the linked response spreadsheet.
- Each row in `Routing Rules` is a single trigger condition for one role.
- Editors can update recipients, reason text, action text, and subject prefixes without editing code.
- Email logging is written to the `Email Log` sheet in the response spreadsheet.

## Routing Rules columns

- `Active`
- `Role`
- `Names`
- `Emails`
- `Trigger Type`
- `Target Question`
- `Target Value`
- `Reason Explanation`
- `Action Needed`
- `Subject Prefix`
- `Notes`

## Recommended manual verification

- Basic event with no support requests
- Sound + projection request
- Livestream + media request
- Attendance `30`
- Attendance `29`
- Childcare request without `Children` selected in announcements
- Planning Center + social media request

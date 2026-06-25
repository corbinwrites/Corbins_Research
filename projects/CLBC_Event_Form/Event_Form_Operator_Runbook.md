# Event Form Operator Runbook

## Purpose

Use this runbook to diagnose and restore the City Light event form notification workflow when submissions are not sending email notifications.

This runbook is written for an operator, not a developer. It assumes you will work inside Google Forms, Google Sheets, and Google Apps Script.

## System Overview

Production form ID:
`19PVaJlgSDh6G1CxYMHkoG4aNJVjF8NXJNesLNY7vuC8`

Apps Script project ID:
`1EbMx1D1MSucv9oSjP1eWRQ80bTl_URCtrehLFW517On10Vb0AtJ57U9J`

The workflow depends on:

1. The correct Google Form being used.
2. The form being linked to a response spreadsheet.
3. The Apps Script project being authorized.
4. The installable form-submit trigger existing and pointing to `onEventFormSubmit`.
5. The response spreadsheet containing valid `Routing Rules`.

## Before You Start

Use the Google account that is supposed to own and run the automation.

Do not assume a different Google account can safely validate the system. Installable triggers run as the account that created them.

Have these available before starting:

1. Access to the Google Form.
2. Access to the response spreadsheet.
3. Access to the Apps Script project.
4. A test email address you can monitor.

## Part 1: Confirm You Are Looking At the Correct Form

### Open the production form

1. Open the live form:
   `https://docs.google.com/forms/d/19PVaJlgSDh6G1CxYMHkoG4aNJVjF8NXJNesLNY7vuC8/edit`
2. Confirm the title matches the production event request form.
3. Confirm this is not a copied form.

### If this is not the correct form

Stop here.

The automation is hardcoded to this form ID. If staff are using a different form, the script will not process those submissions.

## Part 2: Confirm the Form Is Linked to a Response Spreadsheet

### Click path in Google Forms

1. Open the form editor.
2. Click the `Responses` tab.
3. Look for the Google Sheets icon near the top-right of the Responses panel.

### What to verify

1. A spreadsheet is linked.
2. Clicking the Sheets icon opens the correct response spreadsheet.

### If no spreadsheet is linked

This is a blocking issue.

Fix:

1. In the `Responses` tab, click the Sheets icon.
2. Choose to create or select the intended spreadsheet.
3. Link the form to the spreadsheet.
4. After linking, continue to Part 4 and run `setupProject()`.

Reason:
The script expects the form to have a response spreadsheet. If it does not, it cannot create routing sheets or logs.

## Part 3: Confirm the Response Spreadsheet Has the Required Tabs

### Click path in Google Sheets

1. Open the linked response spreadsheet from the form.
2. Look at the sheet tabs at the bottom.

### Required tabs

1. `Form Responses 1`
2. `Routing Rules`
3. `Email Log`

### If one or more tabs are missing

Do this:

1. Continue to Part 4.
2. Run `setupProject()` from Apps Script.
3. Return to the spreadsheet and confirm the tabs were created.

If the tabs still do not appear after running `setupProject()`, go to Part 7 and inspect execution errors.

## Part 4: Open the Apps Script Project and Reauthorize It

### Open the Apps Script project

Use either of these:

1. From the script URL if you have it.
2. Or open:
   `https://script.google.com/home/projects/1EbMx1D1MSucv9oSjP1eWRQ80bTl_URCtrehLFW517On10Vb0AtJ57U9J/edit`

### What to verify

1. The project contains `Code.js`.
2. The project contains `appsscript.json`.
3. The code references the production form ID.

### Reauthorize the script

1. In the Apps Script editor, locate the function dropdown near the top toolbar.
2. Choose `setupProject`.
3. Click `Run`.
4. If Google prompts for authorization, complete the flow.
5. Approve the requested access.

### Expected result

`setupProject()` should:

1. Ensure tracking columns exist.
2. Create or seed `Routing Rules`.
3. Install the form-submit trigger.

### If authorization fails

This is likely the root cause.

Fix:

1. Make sure you are in the intended owner account.
2. Retry the authorization flow.
3. If the browser is using multiple Google accounts, sign out of the wrong one or use an incognito window with only the intended owner account.

## Part 5: Confirm the Trigger Exists

### Click path in Apps Script

1. Open the Apps Script project.
2. In the left sidebar, click `Triggers`.
   The icon usually looks like a clock or alarm.

### What to verify

There should be exactly one form-submit trigger with:

1. Function: `onEventFormSubmit`
2. Event source: `From form`
3. Event type: `On form submit`

### If there is no trigger

Do this:

1. Return to the editor.
2. Choose `setupProject` from the function list.
3. Click `Run`.
4. Return to `Triggers`.
5. Confirm the trigger now exists.

### If there are duplicate triggers

Do this:

1. In `Triggers`, delete duplicate `onEventFormSubmit` entries.
2. Keep only one trigger for the production form.
3. If you are unsure which one is correct, delete all `onEventFormSubmit` triggers and rerun `setupProject()`.

Reason:
Duplicate triggers can create duplicate emails. Missing triggers create no emails.

## Part 6: Confirm the Routing Rules Sheet Is Valid

### Click path in Google Sheets

1. Open the linked response spreadsheet.
2. Click the `Routing Rules` tab.

### Required header row

The first row should contain these exact columns:

1. `Active`
2. `Role`
3. `Names`
4. `Emails`
5. `Trigger Type`
6. `Target Question`
7. `Target Value`
8. `Reason Explanation`
9. `Action Needed`
10. `Subject Prefix`
11. `Notes`

### What to verify in the rows

1. At least one row is active.
2. The Admin Lead row is active.
3. Recipient emails are present and valid.
4. Trigger types are valid values such as:
   `always`
   `equals`
   `contains`
   `greater_or_equal`
   `has_any_value`

### If the headers do not match

This can break routing.

Fix:

1. Correct the headers to exactly match the required names.
2. If the sheet is badly altered, rerun `setupProject()`.
3. If the sheet was manually customized and you do not want to overwrite it blindly, duplicate the spreadsheet first.

### If the rows are blank or corrupted

Fix:

1. Duplicate the spreadsheet as backup.
2. Rerun `setupProject()` if safe.
3. Restore valid routing rows.

## Part 7: Inspect Execution History

### Click path in Apps Script

1. Open the Apps Script project.
2. In the left sidebar, click `Executions`.

### What to look for

Find recent executions of `onEventFormSubmit`.

Record:

1. Date and time
2. Status
3. Error message if any
4. Executing user

### Interpret what you see

#### No executions for recent submissions

Likely cause:

1. Missing trigger
2. Trigger created by the wrong account
3. Trigger auth expired
4. Staff are submitting a different form

Action:

1. Reconfirm the form ID.
2. Reconfirm the trigger exists.
3. Delete all `onEventFormSubmit` triggers.
4. Rerun `setupProject()`.
5. Submit a fresh test response.

#### Executions exist but fail

Likely cause:

1. Missing spreadsheet link
2. Missing tabs
3. Permission issues
4. Runtime error

Action:

1. Open the failing execution.
2. Read the error details.
3. Fix the specific issue.
4. Rerun a test submission.

#### Executions succeed but recipients did not get email

Likely cause:

1. Routing rules did not match
2. Recipient emails are wrong
3. Mail was filtered to spam or quarantine
4. Google Workspace policy interfered

Action:

1. Continue to Part 8.
2. Then continue to Part 9.

## Part 8: Inspect the Email Log

### Click path in Google Sheets

1. Open the linked response spreadsheet.
2. Click the `Email Log` tab.

### What to verify

Each processed submission should append a row containing:

1. Timestamp
2. Status
3. Event Name
4. Contact Email
5. Matched Roles
6. Recipient Emails
7. Reason Explanations
8. Details

### How to interpret the log

#### No new row appears after a fresh submission

The trigger likely did not run.

Return to:

1. Part 4
2. Part 5
3. Part 7

#### Status is `Routing Error`

The trigger fired, but `Routing Rules` is malformed.

Return to:

1. Part 6

#### Status is `Sent`

The script believes emails were sent.

Next step:

1. Compare `Recipient Emails` to the intended recipients.
2. Check spam folders and mail quarantine.
3. Verify recipient addresses are current.

## Part 9: Submit a Controlled QA Test

### Why this matters

Do not rely on historical assumptions. Submit a fresh test response and verify the system in real time.

### Click path in Google Forms

1. Open the form editor.
2. Click the `Preview` icon near the top-right.
3. Submit a controlled test entry.

### Recommended baseline test

Use a simple event with:

1. A clear event name such as `QA Test - Baseline`
2. Your own test email as contact email
3. No optional support requests

### Expected result

1. A new row appears in `Form Responses 1`.
2. A new execution appears in Apps Script.
3. A new row appears in `Email Log`.
4. Admin Lead receives an email.

### If the baseline test passes

Continue with targeted QA below.

## Part 10: Targeted QA Scenarios

Run these one at a time and record results.

### Test 1: Setup routing

Submit an event requiring tables or room layout changes.

Expected:

1. Admin Lead notified
2. Setup Lead notified

### Test 2: Tech routing

Submit an event with Sound and Projection needs.

Expected:

1. Admin Lead notified
2. Tech Lead notified
3. Sound Lead notified
4. Projection Lead notified
5. Tech Scheduling notified

### Test 3: Safety threshold

Submit attendance `30`.

Expected:

1. Safety notified

Submit attendance `29`.

Expected:

1. Safety not notified

### Test 4: Childcare

Submit childcare = `Yes`.

Expected:

1. Children’s Ministries notified

### Test 5: Planning Center and social

Submit both toggles as `Yes`.

Expected:

1. Planning Center recipient notified
2. Social Media recipient notified

### For every QA test, verify all of the following

1. A new response row appears.
2. A new execution appears.
3. A new `Email Log` row appears.
4. Expected recipients match the log.
5. Actual inbox delivery matches the log.

## Part 11: If Trigger or Auth Is Not the Issue

If the trigger exists, runs successfully, and is authorized, investigate these in order.

### A. Trigger event-object mismatch

This incident exposed an important Apps Script detail:

1. A form installable trigger may provide `e.response`
2. A spreadsheet-oriented handler may expect `e.namedValues`

If the code expects the wrong event shape, the trigger can fire correctly and still fail immediately.

Known failure signature:

`Error: onEventFormSubmit requires the installable form submit event object.`

What to do:

1. Open Apps Script `Executions`
2. Open the failed execution details
3. If the error is the event-object mismatch, update the handler to normalize `e.response` into the same structure used by the rest of the routing code

This check should happen before assuming mail delivery, routing rules, or trigger installation are the primary problem.

### A. Form structure drift

The script maps live question titles to expected question titles.

If the form questions were renamed, the routing logic may degrade.

What to do:

1. Compare the live question titles in the form against the expected production questions.
2. If titles changed recently, involve SWE to update the script mapping.

### B. Spreadsheet tab drift

If `Form Responses 1` was renamed or the form was pointed to a different sheet, the script may partially work and still fail downstream.

What to do:

1. Confirm the linked spreadsheet is the intended one.
2. Confirm the tabs still use the expected names.

### C. Wrong production asset

A copied form is a common failure mode.

What to do:

1. Confirm staff are using the exact production form ID.
2. Confirm website or shared links do not point to an old or copied form.

### D. Mail deliverability

The script may succeed while mail is blocked downstream.

What to do:

1. Check recipient spam folders.
2. Check Google Workspace admin quarantine if applicable.
3. Test with a personal Gmail recipient you control.

### E. Manual edits to `Routing Rules`

Spreadsheet-managed routing is operationally flexible but easy to break.

What to do:

1. Check for renamed headers.
2. Check for inactive rows.
3. Check for invalid emails.
4. Check for incorrect trigger types or target questions.

## Part 12: Recovery Checklist

The system is considered restored only when all of these are true:

1. A fresh form submission creates an Apps Script execution.
2. The execution succeeds.
3. `Email Log` records the submission.
4. Expected recipients receive the notification.
5. The trigger owner is known and documented.
6. The response spreadsheet and routing sheet are confirmed valid.

## Part 13: Operational Notes To Keep

After recovery, record these in your operations notes:

1. Production form URL
2. Production form ID
3. Apps Script project URL
4. Apps Script project ID
5. Response spreadsheet URL
6. Trigger owner account
7. Date of last successful QA test
8. Any custom changes made in `Routing Rules`

## Escalate To SWE When

Escalate if any of these are true:

1. The script throws runtime errors you do not understand.
2. The form question titles changed and the mapping likely needs code updates.
3. `setupProject()` fails even after successful authorization.
4. The form and spreadsheet are correct but no trigger can be created.
5. Apps Script executions succeed and `Email Log` says `Sent`, but delivery still fails and appears to be a domain or policy problem.

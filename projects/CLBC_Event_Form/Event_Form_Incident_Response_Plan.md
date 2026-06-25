# Event Form Incident Response Plan

## Objective

Restore reliable email notifications for submissions to the Google Form `19PVaJlgSDh6G1CxYMHkoG4aNJVjF8NXJNesLNY7vuC8`, verify end-to-end behavior, and document operational ownership so the workflow does not silently fail again.

## Context

The local source in `Scripts/city_light_event_form` shows that this workflow depends on four things being true at the same time:

1. The correct Apps Script project is attached to the deployment flow.
2. The script has valid authorization to use Forms, Sheets, Drive, triggers, and MailApp.
3. `setupProject()` has been run successfully at least once.
4. The Google Form is linked to a response spreadsheet containing `Routing Rules` and `Email Log`.

If any one of those is false, the workflow will fail or degrade.

## Working Assumption

The highest-probability failure is trigger installation or authorization drift, not the email-sending code itself.

Reason:

- The script uses an installable form-submit trigger.
- The script sends mail with `MailApp.sendEmail(...)`.
- The default routing rules include an `always` notification for Admin Lead.
- If nobody got any emails at all, the most likely explanation is that the trigger never fired, fired under the wrong account, or lost authorization.

## Phase 1: Establish the Live State

1. Identify the live Apps Script project.
   Use script ID `1EbMx1D1MSucv9oSjP1eWRQ80bTl_URCtrehLFW517On10Vb0AtJ57U9J`.
   Open the Apps Script editor directly for that project.
   Confirm the project contains the expected `Code.js` and `appsscript.json`.

2. Confirm the executing Google account.
   In Apps Script, verify which Google account owns the project and which account created the trigger.
   Installable triggers run as the account that created them.

3. Reauthenticate the project owner.
   Open the Apps Script project under the intended owner account.
   Run a harmless function if needed to force the OAuth prompt.
   Approve all requested scopes.
   Confirm no authorization warnings remain.

4. Confirm the form binding target.
   In the live script, verify `FORM_CONFIG.formId` still equals `19PVaJlgSDh6G1CxYMHkoG4aNJVjF8NXJNesLNY7vuC8`.
   Confirm the live Google Form is the intended production form, not a copy.

5. Confirm the response spreadsheet exists.
   In the Google Form, verify responses are linked to a sheet.
   Open that sheet and confirm these tabs exist:
   `Form Responses 1`
   `Routing Rules`
   `Email Log`

## Phase 2: Validate the Expected Setup

1. Run `setupProject()` manually in Apps Script.
   This should:
   add tracking columns,
   create or seed `Routing Rules`,
   install the form-submit trigger.

2. Inspect triggers in Apps Script.
   There should be exactly one installable form-submit trigger for `onEventFormSubmit`.
   Remove duplicates if present.
   Confirm the trigger source is the correct form.

3. Inspect `Routing Rules`.
   Verify headers exactly match expected names.
   Verify at least one active rule exists.
   Verify the Admin Lead row is active.
   Verify all emails are valid and not blank.

4. Inspect `Email Log`.
   Confirm the sheet exists.
   Check whether prior failures were logged as:
   `Routing Error`
   `Sent`
   or nothing at all.
   If there is nothing logged after recent submissions, that strongly suggests the trigger never fired.

5. Inspect Apps Script executions.
   Open Executions in Apps Script.
   Look for recent runs of `onEventFormSubmit`.
   Record:
   run time,
   success or failure,
   error message,
   executing user.

## Phase 3: Root Cause Decision Tree

### Case A: No executions exist for recent form submissions

Most likely issue: trigger missing, wrong trigger, wrong account, or expired auth.

Actions:

1. Delete all existing `onEventFormSubmit` triggers.
2. Re-run `setupProject()`.
3. Recreate exactly one form-submit trigger.
4. Submit a fresh test response.
5. Confirm a new execution appears.

If this fixes it:
Root cause is trigger installation or authorization drift.

### Case B: Executions exist, but fail before email is sent

Most likely issue: missing spreadsheet link, missing sheet, bad permissions, or runtime error.

Actions:

1. Inspect the failing execution stack trace.
2. If the error mentions response spreadsheet or destination ID:
   relink the form to the correct spreadsheet.
3. If the error mentions permissions:
   re-run authorization under the trigger owner account.
4. If the error mentions missing sheet names:
   rerun `setupProject()` and restore exact tab names.

If this fixes it:
Root cause is environment or configuration drift.

### Case C: Executions succeed, but no one receives email

Most likely issue: routing rules produced no matches, recipient addresses are wrong, mail is being filtered, or Google mail quotas or policies interfered.

Actions:

1. Check `Email Log`.
2. If status is `Sent`, inspect the recipient list captured there.
3. Verify the Admin Lead email row is active.
4. Send to a known internal mailbox and inspect spam or quarantine.
5. Check Google Workspace admin routing or spam policies if managed domains are involved.

If this fixes it:
Root cause is mail delivery or routing outside the Apps Script runtime.

### Case D: Executions show `Routing Error`

Most likely issue: malformed `Routing Rules` sheet.

Actions:

1. Compare headers to the required list.
2. Validate every active row has:
   `Role`
   `Emails`
   supported `Trigger Type`
   valid `Target Question` when required
   valid `Target Value` when required
3. Restore from defaults if the sheet was manually edited incorrectly.

If this fixes it:
Root cause is spreadsheet-managed configuration corruption.

## Phase 4: QA Plan

Use a dedicated QA mailbox and a controlled test cycle.

1. Baseline trigger test.
   Submit a minimal event with no support requests.
   Expected:
   one execution,
   one Admin Lead email,
   one `Sent` row in `Email Log`.

2. Setup routing test.
   Submit an event requiring tables or room layout.
   Expected:
   Admin Lead plus Setup Lead.

3. Tech routing test.
   Submit an event with Sound and Projection.
   Expected:
   Admin Lead,
   Tech Lead,
   Sound Lead,
   Projection Lead,
   Tech Scheduling.

4. Safety threshold test.
   Submit attendance `30`.
   Expected:
   Safety receives notification.
   Submit attendance `29`.
   Expected:
   Safety does not receive notification.

5. Childcare test.
   Submit childcare = `Yes`.
   Expected:
   Children’s Ministries is notified even if target ministries do not include Children.

6. Planning Center and social test.
   Submit both toggles as `Yes`.
   Expected:
   Planning Center recipient and Social Media recipient receive mail.

7. Logging test.
   For every QA submission, confirm:
   an Apps Script execution exists,
   `Email Log` row was appended,
   recipient list matches expectation.

8. Negative config test.
   Temporarily deactivate one noncritical rule.
   Submit a matching request.
   Expected:
   that recipient does not receive mail,
   other matching rules still work.
   Restore the rule after the test.

## Phase 5: If Trigger or Auth Is Not the Issue

If the trigger exists, runs successfully, and is authorized, investigate these next in order:

1. Form structure drift.
   The script maps live question titles to canonical fields.
   If form question titles changed materially, routing inputs may degrade.
   Compare the current live form titles against `FORM_CONFIG.currentHeaders`.

2. Spreadsheet tab drift.
   If `Form Responses 1` was renamed or the destination sheet changed unexpectedly, setup logic may still partially work while downstream assumptions break.

3. Mail deliverability.
   Check recipient spam folders.
   Check Google Workspace admin quarantine.
   Check sending quotas and organizational restrictions.
   Use a controlled Gmail recipient for verification.

4. Ownership mismatch.
   If one person authored the script, another edited the form, and a third owns the spreadsheet, access edge cases can appear.
   Consolidate operational ownership under one maintained service owner if possible.

5. Wrong production asset.
   Confirm the active form in use by staff is the same form ID hardcoded in the script.
   A copied form is a common failure mode.

6. Manual edits to `Routing Rules`.
   Since routing is spreadsheet-driven, a harmless header rename or inactive row can disable notifications without code changes.

## Phase 6: Hardening After the Fix

1. Add an operational runbook.
   Include:
   script ID,
   form ID,
   spreadsheet URL,
   trigger owner,
   how to reauthorize,
   how to run `setupProject()` safely.

2. Add a health check.
   Create a small manual function that validates:
   form linked to spreadsheet,
   trigger exists,
   routing sheet present,
   admin rule active.
   Run it weekly or after major edits.

3. Add failure alerting.
   Keep admin alerts for routing errors.
   Add an explicit admin alert when `onEventFormSubmit` throws unexpected exceptions.

4. Reduce single-user fragility.
   Use a designated operations account or shared ownership model so the workflow does not depend on one personal Google session remaining authorized.

5. Preserve a known-good routing snapshot.
   Export the `Routing Rules` sheet or keep it in versioned documentation.

## Definition of Done

The issue is resolved only when all of the following are true:

1. A fresh form submission creates an Apps Script execution.
2. The execution succeeds without manual intervention.
3. Expected recipients receive email.
4. `Email Log` records the submission and recipients.
5. The trigger owner and reauth procedure are documented.
6. SWE has completed the QA matrix above and recorded outcomes.

## Reference Notes From Local Source

- `setupProject()` is intended to install the trigger and seed spreadsheet configuration.
- The script expects the form to be linked to a response spreadsheet.
- Routing rules are managed in the spreadsheet, not hardcoded operationally.
- Email logging is written to `Email Log`.
- There is an `always` Admin Lead route, so complete silence is more consistent with trigger or environment failure than with ordinary routing failure.

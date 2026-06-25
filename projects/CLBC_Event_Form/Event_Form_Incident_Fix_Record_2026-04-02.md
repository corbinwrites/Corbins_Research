# Event Form Incident Fix Record

## Incident Summary

Date:
`2026-04-02`

System:
City Light event intake workflow using:

1. Google Forms
2. Google Apps Script
3. Linked Google Sheets response spreadsheet

Primary symptom:
Form submissions were being recorded, but notification emails were not being sent.

## Final Root Cause

The live Apps Script trigger was configured correctly as an installable form-submit trigger:

- Event source: `From form`
- Event type: `On form submit`
- Function: `onEventFormSubmit`

However, the handler implementation expected `e.namedValues`, which is not the event shape produced by this trigger type.

For a form installable trigger, Apps Script provides `e.response`, not `e.namedValues`.

Because of that mismatch, every live trigger execution failed immediately with:

`Error: onEventFormSubmit requires the installable form submit event object.`

## What Was Initially Suspected

Early investigation considered several possible causes:

1. Trigger missing
2. Trigger installed under the wrong account
3. Trigger authorization expired
4. Form not linked to a response spreadsheet
5. Bad `Routing Rules`
6. Mail delivery failure

Those were reasonable initial hypotheses, but not the final cause.

## What Was Confirmed During Investigation

### Confirmed true

1. The correct live Apps Script project was in use.
2. The script referenced the correct production form ID.
3. `setupProject()` ran successfully.
4. The response spreadsheet existed.
5. A valid installable trigger existed.
6. A fresh post-fix submission did fire the trigger.

### Confirmed false

1. The issue was not simply “no trigger exists.”
2. The issue was not simply “`setupProject()` was never run.”
3. The issue was not merely email deliverability.

## Timeline of Key Findings

1. Local source review showed the workflow depended on:
   a linked response spreadsheet,
   seeded `Routing Rules`,
   an installable trigger,
   and `MailApp.sendEmail`.

2. Live Apps Script screenshots showed `setupProject()` had completed successfully.

3. Live trigger inspection showed exactly one trigger:
   `onEventFormSubmit`
   `From form - On form submit`

4. Execution history showed:
   an older failed trigger run,
   then successful reruns of `setupProject()`,
   then a new trigger with no run history yet.

5. A fresh test submission after trigger recreation produced a new trigger execution.

6. That execution failed with the same message:
   `onEventFormSubmit requires the installable form submit event object.`

7. This proved the trigger itself was firing correctly and the bug was in the handler implementation.

## Exact Technical Cause

The original live handler started with logic equivalent to:

```js
function onEventFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error("onEventFormSubmit requires the installable form submit event object.");
  }
}
```

That is only valid if the event object includes `namedValues`.

But the live trigger was a form trigger, and the event data arrived through `e.response`.

Therefore:

1. trigger fired correctly
2. handler rejected the event shape
3. execution failed before routing or email send logic ran

## Fix Applied

The live Apps Script was updated so `onEventFormSubmit` supports both event shapes:

1. `e.namedValues`
2. `e.response.getItemResponses()`

The fix added a normalization helper:

- `extractNamedValuesFromEvent_`

That helper converts a form-trigger event into the same question-title-to-answer structure expected by the rest of the routing pipeline.

## Live Change Applied

The live Apps Script project was updated directly in the Apps Script editor and saved to Drive.

The fix was also added to the local source here:

- [Code.js](/Users/corbin/Hal9000/Scripts/city_light_event_form/Code.js#L175)

## Code Reference

Updated handler:

- [Code.js](/Users/corbin/Hal9000/Scripts/city_light_event_form/Code.js#L175)

Normalization helper:

- [Code.js](/Users/corbin/Hal9000/Scripts/city_light_event_form/Code.js#L204)

## Operational Lesson

This workflow is sensitive to the difference between Google Apps Script trigger types.

Two event shapes matter here:

1. Spreadsheet-style submit handlers may expose `e.namedValues`
2. Form installable triggers expose `e.response`

Future changes must not assume those are interchangeable.

## Required Future Safeguards

1. Keep the handler compatible with both `e.namedValues` and `e.response`
2. Do not treat a trigger screenshot alone as proof the workflow is healthy
3. Always validate with:
   fresh submission
   Apps Script execution
   `Email Log`
   actual inbox delivery
4. After changing trigger type or project binding, always run a fresh test submission

## Recommended Verification Procedure

After any future changes:

1. Submit a fresh test response
2. Open Apps Script `Executions`
3. Confirm `onEventFormSubmit` ran
4. Confirm status is `Completed`
5. Open the linked spreadsheet
6. Confirm `Email Log` contains a new row
7. Confirm expected recipients actually received mail

## If This Happens Again

Check in this order:

1. Trigger exists
2. Trigger fired for a fresh submission
3. Execution error message
4. Event object compatibility
5. `Routing Rules`
6. `Email Log`
7. Mail delivery

## Status At Time Of Documentation

At the time this record was written:

1. Root cause had been identified
2. Live code fix had been applied
3. Fresh post-fix verification submission was pending or in progress

Do not mark the incident fully closed until a fresh submission completes successfully and email delivery is verified.

# City Light Event Form Optimization Recommendations

This document defines a practical, free, and maintainable event-request workflow for City Light using Google Forms as the intake layer and Google Apps Script as the notification engine.

The goal is simple: when someone submits an event request, the right ministry team leaders should immediately receive enough information to act without chasing the requester for missing basics.

## Recommended Platform

### Primary recommendation: Google Forms + Google Sheets + Google Apps Script

This should remain the primary solution because it is:

- free for the church to operate,
- already aligned with the current form workflow,
- flexible enough to send conditional notifications,
- easy to maintain without adding another vendor,
- able to store form responses in a Google Sheet for tracking and follow-up.

### Why this is the best fit

Google Forms by itself is good at collecting information, but weak at role-based routing. Apps Script solves that gap cleanly:

- the form collects consistent, structured answers,
- the response sheet becomes the source of truth,
- an installable form-submit trigger evaluates the submission,
- the script emails only the leads whose help is actually needed,
- the email can include the full response summary so each lead knows what to do.

This is a better long-term fit than relying on a paid workflow tool or a third-party add-on unless account restrictions later make Apps Script unusable.

## Design Goals

The event form should be optimized for four outcomes:

1. The requester can fill it out quickly without confusion.
2. Ministry leaders receive alerts only when their involvement is needed.
3. Each alerted leader gets enough context to take action immediately.
4. The form structure is predictable enough for automation and future maintenance.

## Core Workflow

1. A requester fills out the Google Form.
2. The form writes the response into a linked Google Sheet.
3. An Apps Script form-submit trigger reads the submission.
4. The script checks the response against a routing table.
5. The script emails the matching ministry leaders.
6. Admin and key coordinators can review the response sheet for tracking and follow-up.

## Current Problems To Fix

The existing form direction is good, but the structure should be tightened so automation is reliable and leaders are not under-informed.

The biggest problems to solve are:

- too much free-text input,
- combined fields that are hard for scripts to parse,
- unclear ownership of support requests,
- inconsistent trigger logic for tech, ministry announcements, and operations,
- no clear standard for who is always alerted versus conditionally alerted.

## Recommended Form Structure

The form should be organized into sections with structured, reusable question titles. The exact question titles matter because the Apps Script routing logic should match them exactly.

### Section 1: Requester Information

Use these questions:

- `Contact Name`
- `Contact Email`
- `Requesting Ministry / Team`
- `Event Owner / Primary Ministry`

Notes:

- `Contact Email` should use email validation.
- Do not combine name and email into one field.
- These fields should be required.

### Section 2: Event Basics

Use these questions:

- `Event Name`
- `Event Date`
- `Event Start Time`
- `Event End Time`
- `Location`
- `Estimated Attendance`
- `Registration Deadline (if applicable)`

Notes:

- `Estimated Attendance` should be a short answer with number validation.
- This numeric structure is required for Safety automation.
- If room names are known and stable, use a dropdown for `Location`. If not, keep it short-answer.

### Section 3: Event Purpose And Audience

Use these questions:

- `Event Type`
- `Who Is This Event For?`
- `Target Ministries For Announcement`

Recommended format:

- `Event Type`: dropdown or multiple choice.
- `Target Ministries For Announcement`: checkboxes.

Standard options for `Target Ministries For Announcement`:

- `Students`
- `Children`
- `College`
- `Young Adults`
- `40s Plus`

### Section 4: Operational Support Needs

Use structured Yes/No or checkbox questions instead of broad free-text prompts.

Use these questions:

- `Setup Support Needed`
- `Setup Details`
- `Room Layout Changes Needed`
- `Check-In Or Registration Needed`
- `Welcome / Follow-Up Support Needed`
- `Childcare Needed`
- `Hospitality Support Needed`
- `Special Safety Considerations`

Notes:

- `Setup Details` can remain free text, but it should be the exception, not the norm.
- `Childcare Needed` should be a Yes/No trigger field.
- `Welcome / Follow-Up Support Needed` should be a Yes/No trigger field.

### Section 5: Tech Support Needs

This section should be script-friendly and role-based.

Use these questions:

- `Any Tech Support Needed?`
- `Tech Roles Needed`
- `Live Music Or Worship Support Needed`
- `Media Capture Needed`

Recommended format:

- `Any Tech Support Needed?`: Yes/No
- `Tech Roles Needed`: checkboxes
- `Live Music Or Worship Support Needed`: Yes/No
- `Media Capture Needed`: Yes/No

Standard checkbox options for `Tech Roles Needed`:

- `Sound`
- `Projection`
- `Livestream`
- `Stage and Strike`

Notes:

- Avoid using a grid for tech routing.
- A checkbox list is easier to automate and easier for requesters to understand.
- `Media Capture Needed` should remain separate from `Tech Roles Needed` so Media can be routed independently.

### Section 6: Communications And Publishing

Use these questions:

- `Planning Center Event Posting Needed`
- `Social Media Promotion Needed`
- `Announcement Details`

Notes:

- `Planning Center Event Posting Needed` should be explicit. Do not assume every event needs Planning Center.
- `Social Media Promotion Needed` should be explicit. Do not bury this inside a general notes field.
- `Announcement Details` can provide wording, timing, or context for announcement-related teams.

### Section 7: Final Details

Use these questions:

- `Additional Details We Should Know`

This should be the main catch-all field. Keep it as one final open-text area rather than scattering free-text questions throughout the form.

## Required Structural Improvements

These changes should be considered mandatory for reliable automation.

### 1. Split name and email into separate fields

Replace:

- `Who is the main contact and his/her email`

With:

- `Contact Name`
- `Contact Email`

This makes it possible to:

- CC or reply to the requester reliably,
- validate the email address,
- use the contact name cleanly in email content.

### 2. Make attendance numeric

Replace attendance ranges or descriptive entries with a single numeric field:

- `Estimated Attendance`

This allows the script to apply exact rules such as:

- alert Safety when attendance is `30 or more`.

### 3. Replace grid-based tech selection

Replace any tech grid or matrix question with:

- `Tech Roles Needed`

as a checkbox field.

This is much easier to map into conditional notification logic.

### 4. Keep question titles stable

The Google Form question titles should match the routing configuration exactly. If titles change later, the script or routing sheet will break unless updated.

## Notification Strategy

The routing model should follow this rule:

`Lead + Specialist`

That means:

- the relevant lead gets visibility and can coordinate,
- the specialist gets notified when direct action may be required,
- inbox noise stays controlled because unrelated teams are not notified.

## Contact Routing Table

Use the following contact list as the default email-routing roster.

| Position | Emails | When alerted |
| :--- | :--- | :--- |
| Admin Lead | `austin.ychiang@gmail.com` | Always |
| Admin - Setup Lead | `rjellks@gmail.com` | When setup, room layout, logistics, or physical support is needed |
| Tech Lead | `corbinmichaelharris@gmail.com` | When any tech-related need is selected |
| Tech - Sound Lead | `tykaneshige@gmail.com` | When `Sound` is selected |
| Tech - Projection Lead | `viviannazhang@gmail.com` | When `Projection` is selected |
| Tech - Livestream Lead | `katiejocampbell19@gmail.com` | When `Livestream` is selected |
| Tech - Stage and Strike | `hectorchi1234@gmail.com` | When `Stage and Strike` is selected |
| Tech - Scheduling | `kristinamarie0413@gmail.com` | When any tech role is selected |
| Student's Ministries | `davidjlandismsu2021@gmail.com, jonathan.oharra1@gmail.com, alexiarhuber@gmail.com, maddylovemontana@gmail.com` | When Students should be informed or announced to |
| Children's Ministries | `jonbonjy@gmail.com, helenyang14@gmail.com` | When Children should be informed or childcare is needed |
| College Lead | `mathews.georgie@gmail.com` | When College should be informed or announced to |
| Young Adults Lead | `t.cam36@gmail.com` | When Young Adults should be informed or announced to |
| Music Lead | `kyle.deguzman@citylightbible.org` | When live music or worship support is needed |
| Social Media Lead | `kristinamarie0413@gmail.com` | When social media support is needed |
| Welcome/Follow-up | `dustin.shung@gmail.com` | When welcome, registration, or follow-up support is needed |
| Safety | `dycaulboy@gmail.com` | When estimated attendance is `30 or more` or special safety considerations are identified |
| Media Lead | `srp15cc@gmail.com` | When media capture, photography, video, or recap assets are needed |
| 40s Plus | `paul.brown@southbaybiblicalcounseling.org` | When 40s Plus should be informed or announced to |
| Planning Center Events | `laurelvillar@gmail.com` | When Planning Center posting is needed |

## Recommended Routing Rules

The script or routing sheet should use a predictable schema:

- `role`
- `emails`
- `trigger_type`
- `target_question`
- `target_value`

Recommended trigger types:

- `always`
- `contains`
- `equals`
- `greater_or_equal`

### Recommended routing logic

| Role | Trigger Type | Target Question | Target Value |
| :--- | :--- | :--- | :--- |
| Admin Lead | `always` |  |  |
| Admin - Setup Lead | `equals` or `contains` | `Setup Support Needed` / `Room Layout Changes Needed` | `Yes` |
| Tech Lead | `equals` | `Any Tech Support Needed?` | `Yes` |
| Tech - Sound Lead | `contains` | `Tech Roles Needed` | `Sound` |
| Tech - Projection Lead | `contains` | `Tech Roles Needed` | `Projection` |
| Tech - Livestream Lead | `contains` | `Tech Roles Needed` | `Livestream` |
| Tech - Stage and Strike | `contains` | `Tech Roles Needed` | `Stage and Strike` |
| Tech - Scheduling | `contains` | `Tech Roles Needed` | any selected value |
| Student's Ministries | `contains` | `Target Ministries For Announcement` | `Students` |
| Children's Ministries | `contains` / `equals` | `Target Ministries For Announcement` / `Childcare Needed` | `Children` / `Yes` |
| College Lead | `contains` | `Target Ministries For Announcement` | `College` |
| Young Adults Lead | `contains` | `Target Ministries For Announcement` | `Young Adults` |
| Music Lead | `equals` | `Live Music Or Worship Support Needed` | `Yes` |
| Social Media Lead | `equals` | `Social Media Promotion Needed` | `Yes` |
| Welcome/Follow-up | `equals` | `Welcome / Follow-Up Support Needed` | `Yes` |
| Safety | `greater_or_equal` | `Estimated Attendance` | `30` |
| Media Lead | `equals` | `Media Capture Needed` | `Yes` |
| 40s Plus | `contains` | `Target Ministries For Announcement` | `40s Plus` |
| Planning Center Events | `equals` | `Planning Center Event Posting Needed` | `Yes` |

### Important rule for Safety

Safety should be alerted when:

- `Estimated Attendance >= 30`

If a future policy change is made, this should be updated in both the form documentation and script configuration.

## Email Content Standard

Every notification email should include enough context for a leader to respond without opening the spreadsheet first.

### Suggested email subject

`Event Request: <Event Name> | <Event Date> | Action Needed`

### Suggested email body sections

Each email should include:

- event name,
- date,
- time,
- location,
- estimated attendance,
- requester name,
- requester email,
- requesting ministry,
- selected support needs,
- target ministries for announcement,
- relevant notes,
- any registration or deadline details.

### Email philosophy

Do not send vague messages such as "You were selected for support." The email should explain:

- what the event is,
- why this person is receiving the email,
- what help was requested,
- who requested it,
- how to follow up.

## Apps Script Implementation Guidance

The recommended implementation is a Google Apps Script bound to the response spreadsheet or form.

### Recommended approach

- use an installable form-submit trigger,
- read the response row,
- normalize checkbox answers into arrays or consistent strings,
- compare answers against a routing table,
- collect matched recipients,
- send one email per role or per logical recipient group,
- log what was sent for troubleshooting.

### Important implementation details

#### 1. Use one source of truth for routing

Do not hard-code routing rules in multiple places.

Use either:

- a config object in Apps Script, or
- a dedicated `Event Form Email List` sheet.

If a sheet is used, it should mirror the schema above:

- `role`
- `emails`
- `trigger_type`
- `target_question`
- `target_value`

#### 2. Normalize checkbox answers

Checkbox responses may arrive as comma-separated values or arrays depending on how they are processed. Normalize them before matching so `contains` rules are reliable.

#### 3. Avoid duplicate trigger installs

Make sure only one installable trigger is responsible for the routing email function. Duplicate triggers can cause duplicate emails.

#### 4. Keep question titles exact

Apps Script matching will be much more reliable if the form question titles remain identical to the titles used in the routing configuration.

#### 5. Keep Admin visibility

Admin Lead should always be notified, even if no other team is triggered. This prevents orphaned requests.

## Response Tracking Recommendation

The form itself should focus on intake, not fulfillment. Tracking should happen in the Google Sheet.

Add internal columns in the linked response sheet such as:

- `Internal Status`
- `Assigned To`
- `Follow-Up Notes`
- `Last Updated`

Suggested `Internal Status` values:

- `Pending`
- `In Progress`
- `Coordinated`
- `Completed`

This gives ministry leaders a lightweight operations board without adding another system.

## Form Design Guidance

### Keep the form easy for requesters

Use a mix of:

- required fields for essential data,
- yes/no questions for triggers,
- checkboxes for multi-team needs,
- a single final notes box for edge cases.

### Avoid overusing free text

Every free-text field makes routing less reliable. Use structured answers wherever a decision needs to be automated.

### Avoid excessive skip logic

Some skip logic is fine for usability, but do not hide questions that the routing logic depends on unless the automation is explicitly built to handle blank values safely.

## Suggested Go-Live Checklist

Before launching this workflow, complete the following:

1. Update the Google Form titles to match this document.
2. Confirm all required checkbox and yes/no options exist exactly as named.
3. Confirm the linked Google Sheet is receiving responses.
4. Build the Apps Script routing logic.
5. Install exactly one form-submit trigger.
6. Test sample submissions for every major ministry path.
7. Confirm the right emails receive alerts and unrelated teams do not.
8. Review the email content for clarity and completeness.
9. Train Admin and key leads on how to use the response sheet for status tracking.

## Test Scenarios

At minimum, test these cases before rollout:

### Basic event with no special support

Expected:

- Admin Lead receives the notification.
- No unrelated specialty teams receive alerts.

### Tech event requiring sound and projection

Expected:

- Tech Lead receives alert.
- Tech - Scheduling receives alert.
- Tech - Sound Lead receives alert.
- Tech - Projection Lead receives alert.

### Event requiring livestream and media capture

Expected:

- Tech Lead receives alert.
- Tech - Scheduling receives alert.
- Tech - Livestream Lead receives alert.
- Media Lead receives alert.

### Event attendance of 30

Expected:

- Safety receives alert.

### Event attendance of 29

Expected:

- Safety does not receive alert unless manually selected through another safety-related mechanism.

### Event needing announcement to Students and College

Expected:

- Student's Ministries receives alert.
- College Lead receives alert.

### Event needing childcare

Expected:

- Children's Ministries receives alert even if `Children` is not selected in `Target Ministries For Announcement`.

### Event needing Planning Center posting and social media

Expected:

- Planning Center Events receives alert.
- Social Media Lead receives alert.

## Free Alternatives

The main recommendation should remain Google Forms + Apps Script, but these alternatives are worth noting.

### Option 1: Google Forms add-ons

Examples exist that can send notifications without custom code. This can reduce setup time, but it introduces dependency on a third-party add-on and may limit routing flexibility.

Best use case:

- fast setup,
- lower technical ownership,
- acceptable tradeoff if custom logic is minimal.

Tradeoffs:

- less control,
- possible pricing or feature changes later,
- more vendor dependence.

### Option 2: Tally

Tally has a strong free offering and a clean form-building experience. It is a good alternative if the church ever wants a nicer front-end form experience.

However, for this workflow it is not the primary recommendation because:

- the current process already centers on Google Forms,
- the notification workflow still needs careful routing logic,
- Google Apps Script is more direct for Google-native intake and spreadsheet operations.

### Option 3: Jotform

Jotform can handle notifications and workflows, but its free-plan limits are more restrictive for an ongoing church operations workflow.

It is better suited as a fallback option than as the first choice here.

## Current Recommendation Summary

The best path is:

1. Keep the event request hosted in Google Forms.
2. Restructure the form around script-friendly question types and titles.
3. Use Google Apps Script to send conditional ministry-leader emails.
4. Track coordination status in the linked Google Sheet.

This gives City Light a free, maintainable intake system that informs the right leaders at the right time without over-complicating the process.

## Reference Links

- Google Apps Script installable triggers: https://developers.google.com/apps-script/guides/triggers/installable
- Google Apps Script event objects: https://developers.google.com/apps-script/guides/triggers/events
- Tally help center: https://tally.so/help
- Jotform free plan limits: https://www.jotform.com/answers/10286751-what-does-jotform-plans-include
- Current Google Form: https://docs.google.com/forms/d/19PVaJlgSDh6G1CxYMHkoG4aNJVjF8NXJNesLNY7vuC8/edit

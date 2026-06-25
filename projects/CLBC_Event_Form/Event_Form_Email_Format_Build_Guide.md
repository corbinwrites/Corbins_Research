# Email Format Build Guide
## City Light Event Form — Role-Aware, Readable Notifications

**Target file:** `Code.js`  
**Problem:** Every role receives an identical wall of text with all fields, including those irrelevant to their job, and multi-value detail fields collapse into unreadable pipe-separated single lines.  
**Fix in two phases:**  
- Phase 1 — Fix detail field line formatting (pipe-separated → multi-line)  
- Phase 2 — Add role-aware section filtering (each role gets only relevant fields)

---

## Current Email — What's Wrong

Looking at the Tech Lead email in the screenshot:

```
Setup Details: Self lock/unlock: No | Tables required: View Options p: No Preference | Chair notes: No main room setup...
Additional Details We Should Know: Purpose: To train the Safety Team... | Food needed: Yes... | Dietary: Gluten free: 0 | Vegetarian: 0 | Sunday announcement: Yes | Ministry communication: Yes | ...
```

Two distinct problems:

1. **Pipe-separated inline fields** — `joinNonEmpty_` glues all sub-items together with ` | ` into one long line. In plain-text email this is unreadable.
2. **No role filtering** — Tech Lead receives setup logistics, food details, planning center info, full announcement copy, dietary counts, and everything else — none of which affects their job.

---

## Phase 1: Fix Multi-line Detail Fields

### Step 1.1 — Add `joinLines_` helper

Add this function near the existing `joinNonEmpty_` helper (around line 1183):

```js
function joinLines_(values) {
  return values.filter(function(v) {
    return normalizeString_(v) !== "";
  }).join("\n");
}
```

### Step 1.2 — Change `setupDetails` to use `joinLines_`

In `buildCanonicalAnswers_`, find this block (around line 773):

```js
// BEFORE
answers[FORM_CONFIG.canonicalQuestions.setupDetails] = joinNonEmpty_([
  prefixedValue_("Self lock/unlock", rawAnswers[FORM_CONFIG.currentHeaders.selfLockup]),
  prefixedValue_("Tables required", rawAnswers[FORM_CONFIG.currentHeaders.tables]),
  prefixedValue_("Chair setup", rawAnswers[FORM_CONFIG.currentHeaders.chairs]),
  prefixedValue_("Chair notes", rawAnswers[FORM_CONFIG.currentHeaders.chairNotes]),
  prefixedValue_("Additional rooms", rawAnswers[FORM_CONFIG.currentHeaders.additionalRooms])
]);
```

Change to:

```js
// AFTER
answers[FORM_CONFIG.canonicalQuestions.setupDetails] = joinLines_([
  prefixedValue_("Self lock/unlock", rawAnswers[FORM_CONFIG.currentHeaders.selfLockup]),
  prefixedValue_("Tables required", rawAnswers[FORM_CONFIG.currentHeaders.tables]),
  prefixedValue_("Chair setup", rawAnswers[FORM_CONFIG.currentHeaders.chairs]),
  prefixedValue_("Chair notes", rawAnswers[FORM_CONFIG.currentHeaders.chairNotes]),
  prefixedValue_("Additional rooms", rawAnswers[FORM_CONFIG.currentHeaders.additionalRooms])
]);
```

### Step 1.3 — Change `additionalDetails` to use `joinLines_`

In `buildCanonicalAnswers_`, find this block (around line 838):

```js
// BEFORE
answers[FORM_CONFIG.canonicalQuestions.additionalDetails] = joinNonEmpty_([
  prefixedValue_("Purpose", rawAnswers[FORM_CONFIG.currentHeaders.eventPurpose]),
  prefixedValue_("Date details", rawAnswers[FORM_CONFIG.currentHeaders.dateDetails]),
  prefixedValue_("Food needed", rawAnswers[FORM_CONFIG.currentHeaders.foodNeeded]),
  prefixedValue_("Meals", buildMealsSummary_(rawAnswers)),
  prefixedValue_("Dietary", buildDietarySummary_(rawAnswers)),
  prefixedValue_("Sunday announcement", rawAnswers[FORM_CONFIG.currentHeaders.sundayAnnouncement]),
  prefixedValue_("Ministry communication", rawAnswers[FORM_CONFIG.currentHeaders.ministryCommunication]),
  prefixedValue_("Printed material", rawAnswers[FORM_CONFIG.currentHeaders.printedMaterial]),
  prefixedValue_("Tech notes", rawAnswers[FORM_CONFIG.currentHeaders.techNotes]),
  prefixedValue_("Children anticipated", rawAnswers[FORM_CONFIG.currentHeaders.childrenCount])
]);
```

Change to:

```js
// AFTER
answers[FORM_CONFIG.canonicalQuestions.additionalDetails] = joinLines_([
  prefixedValue_("Purpose", rawAnswers[FORM_CONFIG.currentHeaders.eventPurpose]),
  prefixedValue_("Date details", rawAnswers[FORM_CONFIG.currentHeaders.dateDetails]),
  prefixedValue_("Food needed", rawAnswers[FORM_CONFIG.currentHeaders.foodNeeded]),
  prefixedValue_("Meals", buildMealsSummary_(rawAnswers)),
  prefixedValue_("Dietary", buildDietarySummary_(rawAnswers)),
  prefixedValue_("Sunday announcement", rawAnswers[FORM_CONFIG.currentHeaders.sundayAnnouncement]),
  prefixedValue_("Ministry communication", rawAnswers[FORM_CONFIG.currentHeaders.ministryCommunication]),
  prefixedValue_("Printed material", rawAnswers[FORM_CONFIG.currentHeaders.printedMaterial]),
  prefixedValue_("Tech notes", rawAnswers[FORM_CONFIG.currentHeaders.techNotes]),
  prefixedValue_("Children anticipated", rawAnswers[FORM_CONFIG.currentHeaders.childrenCount])
]);
```

### Step 1.4 — Add `buildMultilineField_` helper

`buildFieldLine_` puts the label and value on one line. When the value now contains `\n` characters, that label only shows on the first line, which looks fine in most clients — but for clarity, add a dedicated helper that renders multi-line values with an indented block.

Add this function near `buildFieldLine_` (around line 1111):

```js
function buildMultilineField_(answers, key, label) {
  var value = getAnswerOrBlank_(answers, key);
  if (!value) {
    return "";
  }
  var parts = value.split("\n").filter(function(p) {
    return p.trim() !== "";
  });
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return label + ": " + parts[0];
  }
  return label + ":\n  " + parts.join("\n  ");
}
```

### Step 1.5 — Update `buildEventSummaryLines_` to use `buildMultilineField_` for detail fields

In `buildEventSummaryLines_` (around line 519), find the `supportRequests` section:

```js
// BEFORE
var supportRequests = [
  buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.setupSupport, "Setup Support Needed"),
  buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.setupDetails, "Setup Details"),
  ...
];
```

Change `setupDetails` and `additionalDetails` to use the new helper:

```js
// AFTER (just these two lines change)
  buildMultilineField_(answers, FORM_CONFIG.canonicalQuestions.setupDetails, "Setup Details"),
  ...
  buildMultilineField_(answers, FORM_CONFIG.canonicalQuestions.additionalDetails, "Additional Details We Should Know")
```

**Expected result after Phase 1:**

```
Setup Details:
  Self lock/unlock: No
  Tables required: Yes
  Chair setup: No main room setup. Gilmore overflow would be ideal.
  Additional rooms: No, 1 room is only needed
```

---

## Phase 2: Role-Aware Section Filtering

### Step 2.1 — Add `EMAIL_ROLE_SECTIONS` to `FORM_CONFIG`

This mapping defines which sections each role receives. Add it to `FORM_CONFIG` (around line 37, after `supportedTriggerTypes`):

```js
emailRoleSections: {
  "Admin Lead":             ["summary", "requester", "setup", "tech", "hospitality", "childcare", "communications", "media", "safety", "additional"],
  "Admin - Setup Lead":     ["summary", "requester", "setup", "hospitality"],
  "Tech Lead":              ["summary", "requester", "tech"],
  "Tech - Sound Lead":      ["summary", "requester", "tech"],
  "Tech - Projection Lead": ["summary", "requester", "tech"],
  "Tech - Livestream Lead": ["summary", "requester", "tech"],
  "Tech - Stage and Strike":["summary", "requester", "tech"],
  "Tech - Scheduling":      ["summary", "requester", "tech"],
  "Music Lead":             ["summary", "requester", "tech"],
  "Children's Ministries":  ["summary", "requester", "childcare", "communications"],
  "Safety":                 ["summary", "requester", "safety", "additional"],
  "Media Lead":             ["summary", "requester", "media"],
  "Social Media Lead":      ["summary", "requester", "communications"],
  "Planning Center Events": ["summary", "requester", "communications"],
  "Student's Ministries":   ["summary", "requester", "communications"],
  "College Lead":           ["summary", "requester", "communications"],
  "Young Adults Lead":      ["summary", "requester", "communications"],
  "40s Plus":               ["summary", "requester", "communications"]
},
defaultEmailSections: ["summary", "requester", "setup", "tech", "childcare", "communications", "additional"]
```

### Step 2.2 — Add `getSectionsForRole_` helper

Add this function near the other small helpers (around line 1103):

```js
function getSectionsForRole_(roleName) {
  var sectionMap = FORM_CONFIG.emailRoleSections;
  if (sectionMap && sectionMap[roleName]) {
    return sectionMap[roleName];
  }
  return FORM_CONFIG.defaultEmailSections;
}
```

### Step 2.3 — Refactor `buildEventSummaryLines_` to accept `roleName`

**Current signature:**
```js
function buildEventSummaryLines_(answers) {
```

**New signature:**
```js
function buildEventSummaryLines_(answers, roleName) {
```

Then replace the function body so each section is only appended when the role's section list includes it. Here is the full replacement:

```js
function buildEventSummaryLines_(answers, roleName) {
  var sections = getSectionsForRole_(roleName || "");
  var lines = [];

  // "summary" — always shown; if missing from a role's list it still renders
  // (Event Summary and Requester are never omitted)
  var eventSummary = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.eventName, "Event Name"),
    buildEventTimeLine_(answers),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.location, "Location"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.attendance, "Estimated Attendance")
  ];
  appendSection_(lines, "Event Summary", eventSummary);

  var requester = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.contactName, "Contact Name"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.contactEmail, "Contact Email"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.requestingMinistry, "Requesting Ministry / Team")
  ];
  appendSection_(lines, "Requester", requester);

  // "setup"
  if (sections.indexOf("setup") !== -1) {
    var setupFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.setupSupport, "Setup Support Needed"),
      buildMultilineField_(answers, FORM_CONFIG.canonicalQuestions.setupDetails, "Setup Details"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.roomLayout, "Room Layout Changes Needed"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.checkIn, "Check-In Or Registration Needed")
    ];
    appendSection_(lines, "Setup", setupFields);
  }

  // "hospitality"
  if (sections.indexOf("hospitality") !== -1) {
    var hospFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.hospitality, "Hospitality Support Needed")
    ];
    appendSection_(lines, "Hospitality", hospFields);
  }

  // "tech"
  if (sections.indexOf("tech") !== -1) {
    var techFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.anyTechSupport, "Any Tech Support Needed?"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.techRoles, "Tech Roles Needed"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.liveMusic, "Live Music Or Worship Support Needed"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.mediaCapture, "Media Capture Needed")
    ];
    appendSection_(lines, "Tech Needs", techFields);
  }

  // "childcare"
  if (sections.indexOf("childcare") !== -1) {
    var childcareFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.childcare, "Childcare Needed")
    ];
    appendSection_(lines, "Childcare", childcareFields);
  }

  // "safety"
  if (sections.indexOf("safety") !== -1) {
    var safetyFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.attendance, "Estimated Attendance"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.safetyNotes, "Special Safety Considerations")
    ];
    appendSection_(lines, "Safety Notes", safetyFields);
  }

  // "communications"
  if (sections.indexOf("communications") !== -1) {
    var commFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.targetMinistries, "Target Ministries For Announcement"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.planningCenter, "Planning Center Event Posting Needed"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.socialMedia, "Social Media Promotion Needed"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.announcementDetails, "Announcement Details"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.registrationDeadline, "Registration Deadline (if applicable)")
    ];
    appendSection_(lines, "Communications", commFields);
  }

  // "media"
  if (sections.indexOf("media") !== -1) {
    var mediaFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.mediaCapture, "Media Capture Needed")
    ];
    appendSection_(lines, "Media", mediaFields);
  }

  // "additional" — only for roles that need it (Admin Lead, Safety)
  if (sections.indexOf("additional") !== -1) {
    var addFields = [
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.audience, "Who Is This Event For?"),
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.eventType, "Event Type"),
      buildMultilineField_(answers, FORM_CONFIG.canonicalQuestions.additionalDetails, "Additional Details We Should Know")
    ];
    appendSection_(lines, "Additional Details", addFields);
  }

  return lines;
}
```

### Step 2.4 — Update `buildEmailBody_` to pass role name

In `buildEmailBody_` (around line 499), change the final line that calls `buildEventSummaryLines_`:

```js
// BEFORE
lines = lines.concat(buildEventSummaryLines_(answers));

// AFTER
lines = lines.concat(buildEventSummaryLines_(answers, match.role.role));
```

---

## What Each Role Will Now Receive

| Role | Sections |
|---|---|
| Admin Lead | All sections — full picture |
| Admin - Setup Lead | Event Summary, Requester, Setup, Hospitality |
| Tech Lead | Event Summary, Requester, Tech Needs |
| Tech - Sound/Projection/Livestream/Stage | Event Summary, Requester, Tech Needs |
| Tech - Scheduling | Event Summary, Requester, Tech Needs |
| Music Lead | Event Summary, Requester, Tech Needs |
| Children's Ministries | Event Summary, Requester, Childcare, Communications |
| Safety | Event Summary, Requester, Safety Notes |
| Social Media Lead | Event Summary, Requester, Communications |
| Planning Center Events | Event Summary, Requester, Communications |
| Ministry Leads (Students/College/etc.) | Event Summary, Requester, Communications |
| Media Lead | Event Summary, Requester, Media |

---

## Expected Tech Lead Email After Both Phases

```
You are receiving this because tech support was requested for this event.

Action Needed: Review the requested tech needs and assign the appropriate team members.
Role: Tech Lead
Matched Conditions: Any Tech Support Needed?: Yes

Event Summary
Event Name: Safety Ministry First Aid Training & Fellowship
Event Time: 2026-06-28 09:00 - 2026-06-28 10:00
Location: Mission College
Estimated Attendance: 40

Requester
Contact Name: Dylan Caulboy
Contact Email: dycaulboy@gmail.com
Requesting Ministry / Team: Children's Ministry (Elementary and Lower), Young Adults

Tech Needs
Any Tech Support Needed?: Yes
Live Music Or Worship Support Needed: No
Media Capture Needed: No
```

Versus the current email which also dumps Setup Details, Childcare, Hospitality, Communications, Announcement Details, food/dietary data, and the full Additional Details blob.

---

## Files To Change

| File | What Changes |
|---|---|
| `Code.js` | Add `joinLines_` helper |
| `Code.js` | Change `setupDetails` assignment to use `joinLines_` |
| `Code.js` | Change `additionalDetails` assignment to use `joinLines_` |
| `Code.js` | Add `buildMultilineField_` helper |
| `Code.js` | Add `emailRoleSections` and `defaultEmailSections` to `FORM_CONFIG` |
| `Code.js` | Add `getSectionsForRole_` helper |
| `Code.js` | Refactor `buildEventSummaryLines_` to accept `roleName` and filter sections |
| `Code.js` | Update `buildEmailBody_` to pass `match.role.role` |

**No changes required to:**
- The Google Form
- The Routing Rules spreadsheet
- The trigger configuration
- `setupProject()`
- Any routing logic

---

## Verification Steps

After deploying both phases, run a fresh test submission through the form and verify:

1. Tech Lead email contains only: Event Summary, Requester, Tech Needs
2. Setup Lead email contains only: Event Summary, Requester, Setup, Hospitality
3. Admin Lead email contains all sections
4. Setup Details renders as individual lines, not a pipe-separated string
5. Additional Details renders as individual lines, not a pipe-separated string
6. Email Log still records correctly (no changes to logging logic)
7. All existing routing rules still fire as expected

Use the QA scenarios from the Operator Runbook (Part 10) to validate each role type.

var FORM_CONFIG = {
  formId: "19PVaJlgSDh6G1CxYMHkoG4aNJVjF8NXJNesLNY7vuC8",
  currentFormMode: true,
  trackingSheetName: "Form Responses 1",
  routingSheetName: "Routing Rules",
  emailLogSheetName: "Email Log",
  adminAlertEmails: ["austin.ychiang@gmail.com"],
  internalColumns: [
    "Internal Status",
    "Assigned To",
    "Follow-Up Notes",
    "Last Updated"
  ],
  routingColumns: [
    "Active",
    "Role",
    "Names",
    "Emails",
    "Trigger Type",
    "Target Question",
    "Target Value",
    "Reason Explanation",
    "Action Needed",
    "Subject Prefix",
    "Notes"
  ],
  emailLogColumns: [
    "Timestamp",
    "Status",
    "Event Name",
    "Contact Email",
    "Matched Roles",
    "Recipient Emails",
    "Reason Explanations",
    "Details"
  ],
  supportedTriggerTypes: [
    "always",
    "equals",
    "contains",
    "greater_or_equal",
    "has_any_value"
  ],
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
  defaultEmailSections: ["summary", "requester", "setup", "tech", "childcare", "communications", "additional"],
  currentHeaders: {
    eventName: "What is the name of your event?",
    contactName: "Who is the main contact for your event?",
    contactEmail: "What is the email for the main contact?",
    eventPurpose: "What is the purpose of your event?",
    attendance: "How many people are you expecting to host?",
    location: "Where will your event be held?",
    selfLockup: "Can you unlock and lock up the facility on your own?",
    eventType: "What type of event will be?",
    eventStartTime: "When will your event start?",
    eventEndTime: "When will your event end?",
    dateDetails: "Include the dates, start times, and end times",
    foodNeeded: "I want food at this event",
    breakfast: "What meal(s) will need to be provided? [Breakfast]",
    lunch: "What meal(s) will need to be provided? [Lunch]",
    dinner: "What meal(s) will need to be provided? [Dinner]",
    snack: "What meal(s) will need to be provided? [Snack]",
    glutenFree: "How many people will need a gluten free option?",
    vegetarian: "How many people will need a vegetarian option?",
    tables: "Will your event require tables?",
    chairs: "How should the chairs be setup for your event?",
    chairNotes: "Any further clarifications on chair setup for the main room?",
    additionalRooms: "This event will require additional rooms",
    worshipRequest: "Request corporate worship through music?",
    avRequest: "Request A/V at the event (Speakers, Projection, and Livestream)",
    techProjection: "Which of the following will you need at your event? [Slides (Projector, Screens)]",
    techSound: "Which of the following will you need at your event? [Sound (speakers, mics, recorded music)]",
    techLiveMusic: "Which of the following will you need at your event? [Live Music (Piano, guitar, cajon, etc.)]",
    techLivestream: "Which of the following will you need at your event? [Livestream]",
    techAudioRecording: "Which of the following will you need at your event? [Audio recording]",
    techVideoRecording: "Which of the following will you need at your event? [Video recording]",
    techStage: "Which of the following will you need at your event? [A stage]",
    techPulpit: "Which of the following will you need at your event? [Pulpit/music stand(s)]",
    techNotes: "Anything else you want our tech team to know?",
    socialMedia: "This event can be shared on City Light Bible Church’s social media accounts (Instagram, Facebook)",
    planningCenter: "Request this to be posted on the City Light Events page?",
    sundayAnnouncement: "Request that this event be announced on a Sunday morning?",
    ministryCommunication: "Request that this event be communicated within various ministries at church?",
    announcementDetails: "If you have selected yes to any of the following questions, please include a description of the event so we can communicate this on your behalf",
    photographer: "Request a photographer for this event?",
    videographer: "Request a videographer for this event?",
    printedMaterial: "Request printed material (i.e. flyer, bulletin, pamphlet)?",
    targetMinistries: "What ministry do you anticipate your event will reach?",
    childcare: "Request childcare for this event?",
    childrenCount: "How many children are anticipated?"
  },
  canonicalQuestions: {
    contactName: "Contact Name",
    contactEmail: "Contact Email",
    requestingMinistry: "Requesting Ministry / Team",
    eventOwner: "Event Owner / Primary Ministry",
    eventName: "Event Name",
    eventDate: "Event Date",
    eventStartTime: "Event Start Time",
    eventEndTime: "Event End Time",
    location: "Location",
    attendance: "Estimated Attendance",
    registrationDeadline: "Registration Deadline (if applicable)",
    eventType: "Event Type",
    audience: "Who Is This Event For?",
    targetMinistries: "Target Ministries For Announcement",
    setupSupport: "Setup Support Needed",
    setupDetails: "Setup Details",
    roomLayout: "Room Layout Changes Needed",
    checkIn: "Check-In Or Registration Needed",
    welcome: "Welcome / Follow-Up Support Needed",
    childcare: "Childcare Needed",
    hospitality: "Hospitality Support Needed",
    safetyNotes: "Special Safety Considerations",
    anyTechSupport: "Any Tech Support Needed?",
    techRoles: "Tech Roles Needed",
    liveMusic: "Live Music Or Worship Support Needed",
    mediaCapture: "Media Capture Needed",
    planningCenter: "Planning Center Event Posting Needed",
    socialMedia: "Social Media Promotion Needed",
    announcementDetails: "Announcement Details",
    additionalDetails: "Additional Details We Should Know"
  },
  standardOptions: {
    targetMinistries: [
      "Students",
      "Children",
      "College",
      "Young Adults",
      "40s Plus"
    ],
    techRoles: [
      "Sound",
      "Projection",
      "Livestream",
      "Stage and Strike"
    ]
  }
};

function setupProject() {
  optimizeEventFormStructure();
  ensureTrackingColumns();
  ensureRoutingRulesSheet();
  installFormSubmitTrigger();
}

/**
 * Re-sends notification emails for response sheet rows whose "Internal Status"
 * column is set to "Resend".
 *
 * HOW TO USE:
 *   1. Open the linked response spreadsheet ("Form Responses 1" tab).
 *   2. Find the row(s) you want to resend.
 *   3. In the "Internal Status" column for that row, type exactly:  Resend
 *   4. Return to the Apps Script editor and run this function.
 *   5. Each matched row will be re-processed through the full notification
 *      pipeline and its "Internal Status" will be updated to "Resent ✓".
 *
 * SAFETY: only rows explicitly marked "Resend" are touched — all others are
 * skipped. If routing errors exist they are reported to the admin alert email.
 */
function resendFailedNotifications() {
  var sheet = getTrackingSheet_();
  var data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    Logger.log("No data rows found in the response sheet.");
    return;
  }

  var headers = data[0];

  // Locate the Internal Status column (case-insensitive)
  var statusColIndex = -1;
  for (var h = 0; h < headers.length; h++) {
    if (normalizeString_(headers[h]) === "internal status") {
      statusColIndex = h;
      break;
    }
  }

  if (statusColIndex === -1) {
    Logger.log("Could not find an 'Internal Status' column. Please run setupProject() first.");
    return;
  }

  var routingResult = loadRoutingRules_();
  if (routingResult.errors.length > 0) {
    Logger.log("Routing rule errors: " + routingResult.errors.join(" | "));
    return;
  }

  var resendCount = 0;

  for (var rowIndex = 1; rowIndex < data.length; rowIndex++) {
    var row = data[rowIndex];
    var status = normalizeString_(row[statusColIndex]);

    if (status !== "resend") {
      continue;
    }

    // Reconstruct namedValues from the header + row values
    var namedValues = {};
    for (var col = 0; col < headers.length; col++) {
      var headerName = String(headers[col] || "").trim();
      if (!headerName) {
        continue;
      }
      // Skip internal tracking columns — they are not form questions
      var isInternal = FORM_CONFIG.internalColumns.indexOf(headerName) !== -1;
      if (isInternal) {
        continue;
      }
      var cellValue = String(row[col] || "").trim();
      namedValues[headerName] = [cellValue];
    }

    var answers = buildCanonicalAnswers_(normalizeNamedValues_(namedValues));
    var matches = getMatchingRoutes_(answers, routingResult.rules);

    for (var m = 0; m < matches.length; m++) {
      sendNotificationEmail_(matches[m], answers);
    }

    logSubmission_(
      answers,
      matches,
      matches.length,
      "Resent",
      "Manually resent from row " + (rowIndex + 1) + ". " +
      (matches.length > 0 ? "Notifications delivered." : "No routing rules matched.")
    );

    // Update the cell in-place so the operator can see it was processed
    sheet.getRange(rowIndex + 1, statusColIndex + 1).setValue("Resent \u2713");
    resendCount++;

    Logger.log("Row " + (rowIndex + 1) + " (" + (answers[FORM_CONFIG.canonicalQuestions.eventName] || "unknown event") + ") resent to " + matches.length + " role(s).");
  }

  if (resendCount === 0) {
    Logger.log("No rows were marked 'Resend'. Set a row's Internal Status to 'Resend' to trigger a resend.");
  } else {
    Logger.log("Done. Resent notifications for " + resendCount + " row(s).");
  }
}

function ensureRoutingRulesSheet() {
  var sheet = getOrCreateSheet_(getTrackingSpreadsheet_(), FORM_CONFIG.routingSheetName);
  ensureHeaderRow_(sheet, FORM_CONFIG.routingColumns);

  if (sheet.getLastRow() <= 1) {
    seedRoutingRulesSheet(true);
  }
}

function seedRoutingRulesSheet(forceReset) {
  var sheet = getOrCreateSheet_(getTrackingSpreadsheet_(), FORM_CONFIG.routingSheetName);
  var shouldReset = forceReset === true;

  if (shouldReset) {
    sheet.clearContents();
  }

  ensureHeaderRow_(sheet, FORM_CONFIG.routingColumns);

  if (!shouldReset && sheet.getLastRow() > 1) {
    return;
  }

  var rows = buildDefaultRoutingRuleRows_();
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, FORM_CONFIG.routingColumns.length).setValues(rows);
  }
}

function onEventFormSubmit(e) {
  var namedValues = extractNamedValuesFromEvent_(e);
  if (!namedValues) {
    throw new Error("onEventFormSubmit requires a form submit event object with either namedValues or response data.");
  }

  var answers = buildCanonicalAnswers_(normalizeNamedValues_(namedValues));
  var routingResult = loadRoutingRules_();

  if (routingResult.errors.length > 0) {
    notifyAdminOfRoutingErrors_(routingResult.errors, answers);
    logSubmission_(answers, [], 0, "Routing Error", routingResult.errors.join(" | "));
    return;
  }

  var matches = getMatchingRoutes_(answers, routingResult.rules);
  for (var i = 0; i < matches.length; i++) {
    sendNotificationEmail_(matches[i], answers);
  }

  logSubmission_(
    answers,
    matches,
    matches.length,
    "Sent",
    matches.length > 0 ? "Notifications delivered successfully." : "No routing rules matched this submission."
  );
}

function extractNamedValuesFromEvent_(e) {
  if (!e) {
    return null;
  }

  if (e.namedValues) {
    return e.namedValues;
  }

  if (!e.response || !e.response.getItemResponses) {
    return null;
  }

  var itemResponses = e.response.getItemResponses();
  var namedValues = {};

  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    var item = itemResponse.getItem && itemResponse.getItem();
    var title = item && item.getTitle ? item.getTitle() : "";

    if (!title) {
      continue;
    }

    var response = itemResponse.getResponse();
    namedValues[title] = Array.isArray(response)
      ? response
      : [response];
  }

  return namedValues;
}

function installFormSubmitTrigger() {
  var form = getConfiguredForm_();
  var existing = ScriptApp.getProjectTriggers();
  var handlerName = "onEventFormSubmit";
  var keptExisting = false;

  for (var i = 0; i < existing.length; i++) {
    var trigger = existing[i];
    if (trigger.getHandlerFunction() !== handlerName) {
      continue;
    }

    if (
      !keptExisting &&
      trigger.getTriggerSource() === ScriptApp.TriggerSource.FORMS &&
      trigger.getTriggerSourceId &&
      trigger.getTriggerSourceId() === form.getId()
    ) {
      keptExisting = true;
      continue;
    }

    ScriptApp.deleteTrigger(trigger);
  }

  if (!keptExisting) {
    ScriptApp.newTrigger(handlerName).forForm(form).onFormSubmit().create();
  }
}

function ensureTrackingColumns() {
  var sheet = getTrackingSheet_();
  var headers = getHeaderRow_(sheet);
  var changed = false;

  for (var i = 0; i < FORM_CONFIG.internalColumns.length; i++) {
    if (headers.indexOf(FORM_CONFIG.internalColumns[i]) === -1) {
      headers.push(FORM_CONFIG.internalColumns[i]);
      changed = true;
    }
  }

  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function optimizeEventFormStructure() {
  if (FORM_CONFIG.currentFormMode) {
    Logger.log("Form optimization skipped because the script is mapped to the current live form structure.");
    return;
  }

  var form = getConfiguredForm_();
  enforceContactFields_(form);
  enforceAttendanceField_(form);
  enforceCheckboxQuestion_(
    form,
    ["Tech Roles Needed", "Which tech roles are required?", "Tech Needs"],
    FORM_CONFIG.canonicalQuestions.techRoles,
    FORM_CONFIG.standardOptions.techRoles,
    true
  );
  enforceCheckboxQuestion_(
    form,
    ["Target Ministries For Announcement"],
    FORM_CONFIG.canonicalQuestions.targetMinistries,
    FORM_CONFIG.standardOptions.targetMinistries,
    false
  );
  Logger.log("Form optimization completed.");
}

function exportQuestionsToCSV() {
  var form = getConfiguredForm_();
  var items = form.getItems();
  var csvContent = "Question Title,Item Type,Possible Values\n";

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var type = item.getType();

    if (
      type === FormApp.ItemType.IMAGE ||
      type === FormApp.ItemType.PAGE_BREAK ||
      type === FormApp.ItemType.SECTION_HEADER ||
      type === FormApp.ItemType.VIDEO
    ) {
      continue;
    }

    var title = item.getTitle().replace(/"/g, '""');
    var values = getPossibleValues_(item).replace(/"/g, '""');
    csvContent += '"' + title + '","' + type + '","' + values + '"\n';
  }

  var fileName = form.getTitle() + " - Question Mapping Data.csv";
  var file = DriveApp.createFile(fileName, csvContent, MimeType.CSV);
  Logger.log("CSV created: %s", file.getUrl());
}

function testRoutingWithSampleData() {
  var sampleAnswers = buildCanonicalAnswers_(normalizeNamedValues_({
    "What is the name of your event?": ["Spring Worship Night"],
    "Who is the main contact for your event?": ["Example Requester"],
    "What is the email for the main contact?": ["requester@example.com"],
    "What is the purpose of your event?": ["Student worship and outreach night."],
    "How many people are you expecting to host?": ["75"],
    "Where will your event be held?": ["Main Hall"],
    "Can you unlock and lock up the facility on your own?": ["Yes, I have access to the keys and know the procedure to open and close the site"],
    "What type of event will be?": ["Worship Night"],
    "When will your event start?": ["7:00 PM"],
    "When will your event end?": ["9:00 PM"],
    "Include the dates, start times, and end times": ["April 10, 2026 from 7:00 PM to 9:00 PM"],
    "I want food at this event": ["Yes, I need help from admin team to coordinate"],
    "Will your event require tables?": ["Yes"],
    "How should the chairs be setup for your event?": ["Rows facing the stage"],
    "Any further clarifications on chair setup for the main room?": ["Leave center aisle open."],
    "This event will require additional rooms": ["No"],
    "Request corporate worship through music?": ["Yes"],
    "Request A/V at the event (Speakers, Projection, and Livestream)": ["Yes"],
    "Which of the following will you need at your event? [Slides (Projector, Screens)]": ["Yes"],
    "Which of the following will you need at your event? [Sound (speakers, mics, recorded music)]": ["Yes"],
    "Which of the following will you need at your event? [Live Music (Piano, guitar, cajon, etc.)]": ["Yes"],
    "Which of the following will you need at your event? [Livestream]": ["No"],
    "Which of the following will you need at your event? [Audio recording]": ["No"],
    "Which of the following will you need at your event? [Video recording]": ["Yes"],
    "Which of the following will you need at your event? [A stage]": ["Yes"],
    "Which of the following will you need at your event? [Pulpit/music stand(s)]": ["Yes"],
    "Anything else you want our tech team to know?": ["Need wireless handhelds and confidence monitor."],
    "This event can be shared on City Light Bible Church’s social media accounts (Instagram, Facebook)": ["Yes"],
    "Request this to be posted on the City Light Events page?": ["Yes"],
    "Request that this event be announced on a Sunday morning?": ["Yes"],
    "Request that this event be communicated within various ministries at church?": ["Yes"],
    "If you have selected yes to any of the following questions, please include a description of the event so we can communicate this on your behalf": ["Please announce to students and college ministries."],
    "Request a photographer for this event?": ["Yes"],
    "Request a videographer for this event?": ["No"],
    "Request printed material (i.e. flyer, bulletin, pamphlet)?": ["No"],
    "What ministry do you anticipate your event will reach?": ["Students' Ministry (Middle/High School), College Ministry"],
    "Request childcare for this event?": ["No"],
    "How many children are anticipated?": [""]
  }));

  var routingRules = buildDefaultRoutingRules_();
  var matches = getMatchingRoutes_(sampleAnswers, routingRules);
  Logger.log("Matched roles: %s", matches.map(function(match) {
    return match.role.role;
  }).join(", "));
}

function loadRoutingRules_() {
  var sheet = getTrackingSpreadsheet_().getSheetByName(FORM_CONFIG.routingSheetName);
  var errors = [];

  if (!sheet) {
    return {
      rules: [],
      errors: ["Routing sheet '" + FORM_CONFIG.routingSheetName + "' was not found."]
    };
  }

  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return {
      rules: [],
      errors: ["Routing sheet '" + FORM_CONFIG.routingSheetName + "' is empty."]
    };
  }

  var header = values[0];
  var headerMap = buildHeaderMap_(header);
  errors = errors.concat(validateRoutingHeaders_(headerMap));

  var rules = [];
  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    var row = values[rowIndex];
    if (isBlankRow_(row)) {
      continue;
    }

    var parsed = parseRoutingRuleRow_(row, headerMap, rowIndex + 1);
    if (parsed.errors.length > 0) {
      errors = errors.concat(parsed.errors);
      continue;
    }

    if (parsed.rule) {
      rules.push(parsed.rule);
    }
  }

  if (rules.length === 0) {
    errors.push("No active routing rules were found.");
  }

  return {
    rules: rules,
    errors: dedupeStrings_(errors)
  };
}

function getMatchingRoutes_(answers, rules) {
  var groupedMatches = {};

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var evaluation = evaluateCondition_(rule, answers);

    if (!evaluation.matched) {
      continue;
    }

    var groupKey = buildMatchGroupKey_(rule);
    if (!groupedMatches[groupKey]) {
      groupedMatches[groupKey] = {
        role: rule,
        reasons: [],
        reasonExplanations: []
      };
    }

    groupedMatches[groupKey].reasons.push(evaluation.reason);
    if (hasTextValue_(rule.reasonExplanation)) {
      groupedMatches[groupKey].reasonExplanations.push(rule.reasonExplanation);
    }
  }

  return Object.keys(groupedMatches).map(function(key) {
    groupedMatches[key].reasons = dedupeStrings_(groupedMatches[key].reasons);
    groupedMatches[key].reasonExplanations = dedupeStrings_(groupedMatches[key].reasonExplanations);
    return groupedMatches[key];
  });
}

function sendNotificationEmail_(match, answers) {
  var subject = buildEmailSubject_(answers, match.role);
  var body = buildEmailBody_(match, answers);
  var htmlBody = buildEmailHtmlBody_(match, answers);

  MailApp.sendEmail({
    to: match.role.emails.join(","),
    replyTo: answers[FORM_CONFIG.canonicalQuestions.contactEmail] || "",
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: "City Light Event Form"
  });
}

function buildEmailSubject_(answers, role) {
  var subject = "Event Request: " +
    getAnswerOrPlaceholder_(answers, FORM_CONFIG.canonicalQuestions.eventName) +
    " | " +
    getAnswerOrPlaceholder_(answers, FORM_CONFIG.canonicalQuestions.eventDate) +
    " | Action Needed";

  if (hasTextValue_(role.subjectPrefix)) {
    return role.subjectPrefix + " | " + subject;
  }

  return subject;
}

function buildEmailBody_(match, answers) {
  var eventName = answers[FORM_CONFIG.canonicalQuestions.eventName] || "(not provided)";
  var eventDate = answers[FORM_CONFIG.canonicalQuestions.eventDate] || "(not provided)";
  var eventTime = buildEventTimeLine_(answers) || "";
  var requesterName = answers[FORM_CONFIG.canonicalQuestions.contactName] || "(not provided)";
  var requesterEmail = answers[FORM_CONFIG.canonicalQuestions.contactEmail] || "";
  var requestingMinistry = answers[FORM_CONFIG.canonicalQuestions.requestingMinistry] || "";
  var purpose = answers[FORM_CONFIG.canonicalQuestions.audience] || "";

  var actionNeeded = hasTextValue_(match.role.actionNeeded)
    ? match.role.actionNeeded
    : "Review the event details below and follow up with the requester as needed.";
  var matchedConditions = match.reasons.join("; ");

  var lines = [
    "========================================================",
    "EVENT REQUEST: " + eventName,
    "Date: " + eventDate + (eventTime ? " (" + eventTime.replace("Event Time: ", "") + ")" : ""),
    "Requested By: " + requesterName + (requesterEmail ? " (" + requesterEmail + ")" : "") + (requestingMinistry ? " | Ministry: " + requestingMinistry : ""),
    "========================================================",
    "",
    "Action Needed: " + actionNeeded,
    "Role: " + match.role.role,
    "Matched Conditions: " + matchedConditions,
    ""
  ];

  if (purpose) {
    lines.push("Event Description:");
    lines.push(purpose);
    lines.push("");
  }

  lines = lines.concat(buildEventSummaryLines_(answers, match.role.role));
  return lines.join("\n");
}

function buildEventSummaryLines_(answers, roleName) {
  var sections = getSectionsForRole_(roleName || "");
  var lines = [];

  // "summary" — Event Summary and Requester are never omitted
  var eventSummary = [
    buildEventTimeLine_(answers),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.location, "Location"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.attendance, "Estimated Attendance")
  ];
  appendSection_(lines, "Event Summary", eventSummary);

  var requester = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.requestingMinistry, "Requesting Ministry / Team")
  ];
  appendSection_(lines, "Requester Details", requester);

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
      buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.eventType, "Event Type"),
      buildMultilineField_(answers, FORM_CONFIG.canonicalQuestions.additionalDetails, "Additional Details We Should Know")
    ];
    appendSection_(lines, "Additional Details", addFields);
  }

  return lines;
}

function notifyAdminOfRoutingErrors_(errors, answers) {
  var subject = "Event Form Routing Error | " + getAnswerOrPlaceholder_(answers, FORM_CONFIG.canonicalQuestions.eventName);
  var body = [
    "The City Light event notification script found configuration errors in the Routing Rules sheet.",
    "",
    "Errors:",
    errors.join("\n"),
    "",
    "Event Name: " + getAnswerOrPlaceholder_(answers, FORM_CONFIG.canonicalQuestions.eventName),
    "Contact Email: " + getAnswerOrPlaceholder_(answers, FORM_CONFIG.canonicalQuestions.contactEmail),
    "Please review the '" + FORM_CONFIG.routingSheetName + "' sheet before processing new submissions."
  ].join("\n");

  MailApp.sendEmail({
    to: FORM_CONFIG.adminAlertEmails.join(","),
    subject: subject,
    body: body,
    name: "City Light Event Form"
  });
}

function logSubmission_(answers, matches, sentCount, status, details) {
  var sheet = getOrCreateSheet_(getTrackingSpreadsheet_(), FORM_CONFIG.emailLogSheetName);
  ensureHeaderRow_(sheet, FORM_CONFIG.emailLogColumns);

  var roles = matches.map(function(match) { return match.role.role; }).join(", ");
  var recipients = dedupeRecipients_(matches).join(", ");
  var reasonExplanations = matches.map(function(match) {
    var summary = match.reasonExplanations.length > 0
      ? match.reasonExplanations.join(" / ")
      : match.reasons.join("; ");
    return match.role.role + ": " + summary;
  }).join(" | ");

  sheet.appendRow([
    new Date(),
    status || "Sent",
    answers[FORM_CONFIG.canonicalQuestions.eventName] || "",
    answers[FORM_CONFIG.canonicalQuestions.contactEmail] || "",
    roles,
    recipients,
    reasonExplanations,
    details || "Sent " + sentCount + " notification(s)."
  ]);
}

function getTrackingSpreadsheet_() {
  var form = getConfiguredForm_();
  var destinationId = form.getDestinationId();

  if (!destinationId) {
    throw new Error("The form is not linked to a response spreadsheet.");
  }

  return SpreadsheetApp.openById(destinationId);
}

function getTrackingSheet_() {
  var spreadsheet = getTrackingSpreadsheet_();
  var configuredSheet = spreadsheet.getSheetByName(FORM_CONFIG.trackingSheetName);

  if (configuredSheet) {
    return configuredSheet;
  }

  var sheets = spreadsheet.getSheets();
  if (sheets.length === 0) {
    return spreadsheet.insertSheet(FORM_CONFIG.trackingSheetName);
  }

  return sheets[0];
}

function getConfiguredForm_() {
  return FORM_CONFIG.formId
    ? FormApp.openById(FORM_CONFIG.formId)
    : FormApp.getActiveForm();
}

function getOrCreateSheet_(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  return sheet || spreadsheet.insertSheet(name);
}

function getHeaderRow_(sheet) {
  if (sheet.getLastColumn() === 0) {
    return [];
  }

  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function ensureHeaderRow_(sheet, headers) {
  var existing = getHeaderRow_(sheet);
  if (existing.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  var merged = existing.slice();
  for (var i = 0; i < headers.length; i++) {
    if (merged.indexOf(headers[i]) === -1) {
      merged.push(headers[i]);
    }
  }

  if (merged.length !== existing.length) {
    sheet.getRange(1, 1, 1, merged.length).setValues([merged]);
  }
}

function normalizeNamedValues_(namedValues) {
  var normalized = {};
  var keys = Object.keys(namedValues);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = namedValues[key];
    normalized[key] = Array.isArray(value) ? value.join(", ").trim() : String(value || "").trim();
  }

  return normalized;
}

function buildCanonicalAnswers_(rawAnswers) {
  var answers = {};

  answers[FORM_CONFIG.canonicalQuestions.contactName] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.contactName,
    FORM_CONFIG.canonicalQuestions.contactName
  );
  answers[FORM_CONFIG.canonicalQuestions.contactEmail] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.contactEmail,
    FORM_CONFIG.canonicalQuestions.contactEmail
  );
  answers[FORM_CONFIG.canonicalQuestions.requestingMinistry] = mapMinistriesToCanonical_(firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.targetMinistries,
    FORM_CONFIG.canonicalQuestions.requestingMinistry
  ));
  answers[FORM_CONFIG.canonicalQuestions.eventOwner] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.contactName,
    FORM_CONFIG.canonicalQuestions.eventOwner
  );
  answers[FORM_CONFIG.canonicalQuestions.eventName] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.eventName,
    FORM_CONFIG.canonicalQuestions.eventName
  );
  answers[FORM_CONFIG.canonicalQuestions.eventDate] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.dateDetails,
    FORM_CONFIG.canonicalQuestions.eventDate
  );
  answers[FORM_CONFIG.canonicalQuestions.eventStartTime] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.eventStartTime,
    FORM_CONFIG.canonicalQuestions.eventStartTime
  );
  answers[FORM_CONFIG.canonicalQuestions.eventEndTime] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.eventEndTime,
    FORM_CONFIG.canonicalQuestions.eventEndTime
  );
  answers[FORM_CONFIG.canonicalQuestions.location] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.location,
    FORM_CONFIG.canonicalQuestions.location
  );
  answers[FORM_CONFIG.canonicalQuestions.attendance] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.attendance,
    FORM_CONFIG.canonicalQuestions.attendance
  );
  answers[FORM_CONFIG.canonicalQuestions.registrationDeadline] = "";
  answers[FORM_CONFIG.canonicalQuestions.eventType] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.eventType,
    FORM_CONFIG.canonicalQuestions.eventType
  );
  answers[FORM_CONFIG.canonicalQuestions.audience] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.eventPurpose,
    FORM_CONFIG.canonicalQuestions.audience
  );
  answers[FORM_CONFIG.canonicalQuestions.targetMinistries] = mapMinistriesToCanonical_(firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.targetMinistries,
    FORM_CONFIG.canonicalQuestions.targetMinistries
  ));
  answers[FORM_CONFIG.canonicalQuestions.setupSupport] = toYesNo_(
    anyTrue_(
      rawAnswers[FORM_CONFIG.currentHeaders.selfLockup] && !isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.selfLockup]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.tables]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.additionalRooms]),
      hasTextValue_(rawAnswers[FORM_CONFIG.currentHeaders.chairs]),
      hasTextValue_(rawAnswers[FORM_CONFIG.currentHeaders.chairNotes])
    )
  );
  answers[FORM_CONFIG.canonicalQuestions.setupDetails] = joinLines_([
    prefixedValue_("Self lock/unlock", rawAnswers[FORM_CONFIG.currentHeaders.selfLockup]),
    prefixedValue_("Tables required", rawAnswers[FORM_CONFIG.currentHeaders.tables]),
    prefixedValue_("Chair setup", rawAnswers[FORM_CONFIG.currentHeaders.chairs]),
    prefixedValue_("Chair notes", rawAnswers[FORM_CONFIG.currentHeaders.chairNotes]),
    prefixedValue_("Additional rooms", rawAnswers[FORM_CONFIG.currentHeaders.additionalRooms])
  ]);
  answers[FORM_CONFIG.canonicalQuestions.roomLayout] = toYesNo_(
    anyTrue_(
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.tables]),
      hasTextValue_(rawAnswers[FORM_CONFIG.currentHeaders.chairs]),
      hasTextValue_(rawAnswers[FORM_CONFIG.currentHeaders.chairNotes]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.additionalRooms])
    )
  );
  answers[FORM_CONFIG.canonicalQuestions.checkIn] = "";
  answers[FORM_CONFIG.canonicalQuestions.welcome] = "";
  answers[FORM_CONFIG.canonicalQuestions.childcare] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.childcare,
    FORM_CONFIG.canonicalQuestions.childcare
  );
  var foodAnswer = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.foodNeeded,
    FORM_CONFIG.canonicalQuestions.hospitality
  );
  answers[FORM_CONFIG.canonicalQuestions.hospitality] = (normalizeString_(foodAnswer).indexOf("yes, i need help") === 0) ? "Yes" : "No";
  answers[FORM_CONFIG.canonicalQuestions.safetyNotes] = "";
  answers[FORM_CONFIG.canonicalQuestions.anyTechSupport] = toYesNo_(
    anyTrue_(
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.avRequest]),
      hasTextValue_(buildCurrentTechRoles_(rawAnswers)),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.worshipRequest])
    )
  );
  answers[FORM_CONFIG.canonicalQuestions.techRoles] = buildCurrentTechRoles_(rawAnswers);
  answers[FORM_CONFIG.canonicalQuestions.liveMusic] = toYesNo_(
    anyTrue_(
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.worshipRequest]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.techLiveMusic])
    )
  );
  answers[FORM_CONFIG.canonicalQuestions.mediaCapture] = toYesNo_(
    anyTrue_(
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.photographer]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.videographer]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.techAudioRecording]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.techVideoRecording])
    )
  );
  answers[FORM_CONFIG.canonicalQuestions.planningCenter] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.planningCenter,
    FORM_CONFIG.canonicalQuestions.planningCenter
  );
  answers[FORM_CONFIG.canonicalQuestions.socialMedia] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.socialMedia,
    FORM_CONFIG.canonicalQuestions.socialMedia
  );
  answers[FORM_CONFIG.canonicalQuestions.announcementDetails] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.announcementDetails,
    FORM_CONFIG.canonicalQuestions.announcementDetails
  );
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

  return answers;
}

function buildDefaultRoutingRules_() {
  return [
    buildDefaultRule_("Admin Lead", "Austin Chiang", "austin.ychiang@gmail.com", "always", "", "", "You are receiving this because Admin Lead is always copied on event requests.", "Review the request and coordinate follow-up if no other team responds.", "Admin"),
    buildDefaultRule_("Admin - Setup Lead", "RJ Ellks", "rjellks@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.setupSupport, "Yes", "You are receiving this because setup support was requested for this event.", "Review setup needs and coordinate room and logistics support.", "Setup"),
    buildDefaultRule_("Admin - Setup Lead", "RJ Ellks", "rjellks@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.roomLayout, "Yes", "You are receiving this because room layout changes were requested for this event.", "Review setup needs and coordinate room and logistics support.", "Setup"),
    buildDefaultRule_("Admin - Setup Lead", "RJ Ellks", "rjellks@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.hospitality, "Yes", "You are receiving this because hospitality support was requested for this event.", "Review setup needs and coordinate room and logistics support.", "Setup"),
    buildDefaultRule_("Tech Lead", "Corbin Harris", "corbinmichaelharris@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.anyTechSupport, "Yes", "You are receiving this because tech support was requested for this event.", "Review the requested tech needs and assign the appropriate team members.", "Tech"),
    buildDefaultRule_("Tech - Sound Lead", "Ty Kaneshige", "tykaneshige@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.techRoles, "Sound", "You are receiving this because sound support was requested.", "Review the sound needs and confirm coverage.", "Tech"),
    buildDefaultRule_("Tech - Projection Lead", "Vivianna Zhang", "viviannazhang@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.techRoles, "Projection", "You are receiving this because projection support was requested.", "Review projection needs and confirm coverage.", "Tech"),
    buildDefaultRule_("Tech - Livestream Lead", "Katie Campbell", "katiejocampbell19@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.techRoles, "Livestream", "You are receiving this because livestream support was requested.", "Review livestream needs and confirm coverage.", "Tech"),
    buildDefaultRule_("Tech - Stage and Strike", "Hector Chi", "hectorchi1234@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.techRoles, "Stage and Strike", "You are receiving this because stage or platform support was requested.", "Review stage needs and confirm setup support.", "Tech"),
    buildDefaultRule_("Tech - Scheduling", "Kristina Marie", "kristinamarie0413@gmail.com", "has_any_value", FORM_CONFIG.canonicalQuestions.techRoles, "", "You are receiving this because at least one tech role was requested.", "Coordinate staffing for the requested tech roles.", "Tech"),
    buildDefaultRule_("Student's Ministries", "Student Ministry Team", "davidjlandismsu2021@gmail.com, jonathan.oharra1@gmail.com, alexiarhuber@gmail.com, maddylovemontana@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.targetMinistries, "Students", "You are receiving this because the event is intended for Students.", "Review whether this event should be communicated within Students ministry.", "Students"),
    buildDefaultRule_("Children's Ministries", "Children's Ministry Team", "jonbonjy@gmail.com, helenyang14@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.targetMinistries, "Children", "You are receiving this because the event is intended for Children.", "Review whether this event should be communicated within Children's ministry.", "Children"),
    buildDefaultRule_("Children's Ministries", "Children's Ministry Team", "jonbonjy@gmail.com, helenyang14@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.childcare, "Yes", "You are receiving this because childcare was requested for this event.", "Review childcare staffing needs and follow up with the requester.", "Children"),
    buildDefaultRule_("College Lead", "Mathews Georgie", "mathews.georgie@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.targetMinistries, "College", "You are receiving this because the event is intended for College ministry.", "Review whether this event should be communicated within College ministry.", "College"),
    buildDefaultRule_("Young Adults Lead", "T Cam", "t.cam36@gmail.com", "contains", FORM_CONFIG.canonicalQuestions.targetMinistries, "Young Adults", "You are receiving this because the event is intended for Young Adults ministry.", "Review whether this event should be communicated within Young Adults ministry.", "Young Adults"),
    buildDefaultRule_("Music Lead", "Kyle De Guzman", "kyle.deguzman@citylightbible.org", "equals", FORM_CONFIG.canonicalQuestions.liveMusic, "Yes", "You are receiving this because worship or live music support was requested.", "Review the music needs and follow up on worship support.", "Music"),
    buildDefaultRule_("Social Media Lead", "Kristina Marie", "kristinamarie0413@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.socialMedia, "Yes", "You are receiving this because social media promotion was requested.", "Review the event description and schedule promotion if appropriate.", "Social"),
    buildDefaultRule_("Safety", "Dylan Caulboy", "dycaulboy@gmail.com", "greater_or_equal", FORM_CONFIG.canonicalQuestions.attendance, "30", "You are receiving this because expected attendance is 30 or more.", "Review safety needs and determine whether additional planning is required.", "Safety"),
    buildDefaultRule_("Media Lead", "SRP", "srp15cc@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.mediaCapture, "Yes", "You are receiving this because media capture was requested.", "Review photography or video needs and confirm coverage.", "Media"),
    buildDefaultRule_("40s Plus", "Paul Brown", "paul.brown@southbaybiblicalcounseling.org", "contains", FORM_CONFIG.canonicalQuestions.targetMinistries, "40s Plus", "You are receiving this because the event is intended for 40s Plus ministry.", "Review whether this event should be communicated within 40s Plus.", "40s Plus"),
    buildDefaultRule_("Planning Center Events", "Laurel Villar", "laurelvillar@gmail.com", "equals", FORM_CONFIG.canonicalQuestions.planningCenter, "Yes", "You are receiving this because the event needs to be posted on the City Light Events page.", "Create or update the Planning Center event entry using the details below.", "Planning Center")
  ];
}

function buildDefaultRoutingRuleRows_() {
  return buildDefaultRoutingRules_().map(function(rule) {
    return [
      "Yes",
      rule.role,
      rule.names,
      rule.emails.join(", "),
      rule.triggerType,
      rule.targetQuestion,
      rule.targetValue,
      rule.reasonExplanation,
      rule.actionNeeded,
      rule.subjectPrefix,
      ""
    ];
  });
}

function buildDefaultRule_(role, names, emails, triggerType, targetQuestion, targetValue, reasonExplanation, actionNeeded, subjectPrefix) {
  return {
    role: role,
    names: names,
    emails: parseEmails_(emails),
    triggerType: triggerType,
    targetQuestion: targetQuestion,
    targetValue: targetValue,
    reasonExplanation: reasonExplanation,
    actionNeeded: actionNeeded,
    subjectPrefix: subjectPrefix || ""
  };
}

function validateRoutingHeaders_(headerMap) {
  var errors = [];
  for (var i = 0; i < FORM_CONFIG.routingColumns.length; i++) {
    if (headerMap[FORM_CONFIG.routingColumns[i]] === undefined) {
      errors.push("Routing sheet is missing required column '" + FORM_CONFIG.routingColumns[i] + "'.");
    }
  }
  return errors;
}

function parseRoutingRuleRow_(row, headerMap, rowNumber) {
  var active = getCellByHeader_(row, headerMap, "Active");
  if (!isYesValue_(active)) {
    return { rule: null, errors: [] };
  }

  var role = getCellByHeader_(row, headerMap, "Role");
  var names = getCellByHeader_(row, headerMap, "Names");
  var emailsRaw = getCellByHeader_(row, headerMap, "Emails");
  var triggerType = normalizeString_(getCellByHeader_(row, headerMap, "Trigger Type"));
  var targetQuestion = getCellByHeader_(row, headerMap, "Target Question");
  var targetValue = getCellByHeader_(row, headerMap, "Target Value");
  var reasonExplanation = getCellByHeader_(row, headerMap, "Reason Explanation");
  var actionNeeded = getCellByHeader_(row, headerMap, "Action Needed");
  var subjectPrefix = getCellByHeader_(row, headerMap, "Subject Prefix");
  var errors = [];

  if (!hasTextValue_(role)) {
    errors.push("Row " + rowNumber + ": Role is required for active routing rules.");
  }

  if (!hasTextValue_(emailsRaw)) {
    errors.push("Row " + rowNumber + ": Emails are required for active routing rules.");
  }

  if (FORM_CONFIG.supportedTriggerTypes.indexOf(triggerType) === -1) {
    errors.push("Row " + rowNumber + ": Trigger Type '" + triggerType + "' is not supported.");
  }

  if (triggerType !== "always") {
    if (!hasTextValue_(targetQuestion)) {
      errors.push("Row " + rowNumber + ": Target Question is required for trigger type '" + triggerType + "'.");
    } else if (!isSupportedCanonicalQuestion_(targetQuestion)) {
      errors.push("Row " + rowNumber + ": Target Question '" + targetQuestion + "' is not a supported canonical question.");
    }
  }

  if (triggerType === "equals" || triggerType === "contains" || triggerType === "greater_or_equal") {
    if (!hasTextValue_(targetValue)) {
      errors.push("Row " + rowNumber + ": Target Value is required for trigger type '" + triggerType + "'.");
    }
  }

  var emails = parseEmails_(emailsRaw);
  if (emails.length === 0) {
    errors.push("Row " + rowNumber + ": No valid email addresses were found.");
  }

  if (errors.length > 0) {
    return { rule: null, errors: errors };
  }

  return {
    rule: {
      role: role,
      names: names,
      emails: emails,
      triggerType: triggerType,
      targetQuestion: targetQuestion,
      targetValue: targetValue,
      reasonExplanation: reasonExplanation,
      actionNeeded: actionNeeded,
      subjectPrefix: subjectPrefix
    },
    errors: []
  };
}

function evaluateCondition_(rule, answers) {
  var question = rule.targetQuestion;
  var actualValue = question ? answers[question] : "";
  var targetValue = rule.targetValue || "";
  var normalizedActual = normalizeString_(actualValue);
  var normalizedTarget = normalizeString_(targetValue);

  switch (rule.triggerType) {
    case "always":
      return { matched: true, reason: "Always notified" };
    case "equals":
      return {
        matched: normalizedActual === normalizedTarget,
        reason: buildReason_(question, actualValue)
      };
    case "contains":
      return {
        matched: arrayContainsNormalized_(toNormalizedArray_(actualValue), normalizedTarget),
        reason: buildReason_(question, actualValue)
      };
    case "greater_or_equal":
      var actualNumber = parseFloat(actualValue);
      var targetNumber = parseFloat(targetValue);
      return {
        matched: !isNaN(actualNumber) && !isNaN(targetNumber) && actualNumber >= targetNumber,
        reason: buildReason_(question, actualValue)
      };
    case "has_any_value":
      return {
        matched: hasTextValue_(actualValue),
        reason: buildReason_(question, actualValue)
      };
    default:
      return { matched: false, reason: "" };
  }
}

function buildMatchGroupKey_(rule) {
  return [
    rule.role,
    rule.emails.join(","),
    rule.actionNeeded,
    rule.subjectPrefix
  ].join("||");
}

function buildHeaderMap_(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    map[String(headerRow[i]).trim()] = i;
  }
  return map;
}

function getCellByHeader_(row, headerMap, header) {
  var index = headerMap[header];
  return index === undefined ? "" : String(row[index] || "").trim();
}

function isSupportedCanonicalQuestion_(questionName) {
  var values = Object.keys(FORM_CONFIG.canonicalQuestions).map(function(key) {
    return FORM_CONFIG.canonicalQuestions[key];
  });
  return values.indexOf(questionName) !== -1;
}

function isBlankRow_(row) {
  for (var i = 0; i < row.length; i++) {
    if (String(row[i] || "").trim() !== "") {
      return false;
    }
  }
  return true;
}

function parseEmails_(emailsRaw) {
  return String(emailsRaw || "")
    .split(",")
    .map(function(email) { return email.trim(); })
    .filter(function(email) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email); });
}

function dedupeRecipients_(matches) {
  var seen = {};
  var recipients = [];

  for (var i = 0; i < matches.length; i++) {
    for (var j = 0; j < matches[i].role.emails.length; j++) {
      var email = matches[i].role.emails[j];
      if (!seen[email]) {
        seen[email] = true;
        recipients.push(email);
      }
    }
  }

  return recipients;
}

function dedupeStrings_(values) {
  var seen = {};
  var result = [];

  for (var i = 0; i < values.length; i++) {
    if (!seen[values[i]]) {
      seen[values[i]] = true;
      result.push(values[i]);
    }
  }

  return result;
}

function getAnswerOrPlaceholder_(answers, key) {
  return answers[key] || "(not provided)";
}

function getSectionsForRole_(roleName) {
  var sectionMap = FORM_CONFIG.emailRoleSections;
  if (sectionMap && sectionMap[roleName]) {
    return sectionMap[roleName];
  }
  return FORM_CONFIG.defaultEmailSections;
}

function getAnswerOrBlank_(answers, key) {
  return String(answers[key] || "").trim();
}

function buildFieldLine_(answers, key, label) {
  var value = getAnswerOrBlank_(answers, key);
  return value ? label + ": " + value : "";
}

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

function buildEventTimeLine_(answers) {
  var start = getAnswerOrBlank_(answers, FORM_CONFIG.canonicalQuestions.eventStartTime);
  var end = getAnswerOrBlank_(answers, FORM_CONFIG.canonicalQuestions.eventEndTime);

  if (start && end) {
    return "Event Time: " + start + " - " + end;
  }
  if (start) {
    return "Event Time: " + start;
  }
  if (end) {
    return "Event Time: " + end;
  }
  return "";
}

function appendSection_(lines, title, sectionLines) {
  var filtered = sectionLines.filter(function(line) {
    return hasTextValue_(line);
  });

  if (filtered.length === 0) {
    return;
  }

  if (lines.length > 0) {
    lines.push("");
  }

  lines.push(title);
  for (var i = 0; i < filtered.length; i++) {
    lines.push(filtered[i]);
  }
}

function firstAnswer_(answers) {
  for (var i = 1; i < arguments.length; i++) {
    var key = arguments[i];
    if (answers[key]) {
      return answers[key];
    }
  }
  return "";
}

function isYesValue_(value) {
  var normalized = normalizeString_(value);
  return normalized === "yes" || normalized === "true" || normalized.indexOf("yes") === 0;
}

function hasTextValue_(value) {
  return normalizeString_(value) !== "";
}

function anyTrue_() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i]) {
      return true;
    }
  }
  return false;
}

function toYesNo_(value) {
  return value ? "Yes" : "No";
}

function joinNonEmpty_(values) {
  return values.filter(function(value) {
    return normalizeString_(value) !== "";
  }).join(" | ");
}

function joinLines_(values) {
  return values.filter(function(v) {
    return normalizeString_(v) !== "";
  }).join("\n");
}

function prefixedValue_(label, value) {
  if (!hasTextValue_(value)) {
    return "";
  }
  return label + ": " + value;
}

function buildMealsSummary_(answers) {
  var meals = [];
  if (isYesValue_(answers[FORM_CONFIG.currentHeaders.breakfast])) {
    meals.push("Breakfast");
  }
  if (isYesValue_(answers[FORM_CONFIG.currentHeaders.lunch])) {
    meals.push("Lunch");
  }
  if (isYesValue_(answers[FORM_CONFIG.currentHeaders.dinner])) {
    meals.push("Dinner");
  }
  if (isYesValue_(answers[FORM_CONFIG.currentHeaders.snack])) {
    meals.push("Snack");
  }
  return meals.join(", ");
}

function buildDietarySummary_(answers) {
  return joinNonEmpty_([
    prefixedValue_("Gluten free", answers[FORM_CONFIG.currentHeaders.glutenFree]),
    prefixedValue_("Vegetarian", answers[FORM_CONFIG.currentHeaders.vegetarian])
  ]);
}

function buildCurrentTechRoles_(answers) {
  var roles = [];

  if (isYesValue_(answers[FORM_CONFIG.currentHeaders.techSound])) {
    roles.push("Sound");
  }
  if (isYesValue_(answers[FORM_CONFIG.currentHeaders.techProjection])) {
    roles.push("Projection");
  }
  if (isYesValue_(answers[FORM_CONFIG.currentHeaders.techLivestream])) {
    roles.push("Livestream");
  }
  if (
    isYesValue_(answers[FORM_CONFIG.currentHeaders.techStage]) ||
    isYesValue_(answers[FORM_CONFIG.currentHeaders.techPulpit])
  ) {
    roles.push("Stage and Strike");
  }

  return roles.join(", ");
}

function toNormalizedArray_(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map(function(entry) { return normalizeString_(entry); })
    .filter(function(entry) { return entry !== ""; });
}

function arrayContainsNormalized_(values, target) {
  for (var i = 0; i < values.length; i++) {
    if (values[i] === target) {
      return true;
    }
  }
  return false;
}

function normalizeString_(value) {
  return String(value || "").trim().toLowerCase();
}

function buildReason_(question, actualValue) {
  return question + ": " + actualValue;
}

function getPossibleValues_(item) {
  var type = item.getType();

  try {
    if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
      return item.asMultipleChoiceItem().getChoices().map(function(choice) {
        return choice.getValue();
      }).join(" | ");
    }
    if (type === FormApp.ItemType.CHECKBOX) {
      return item.asCheckboxItem().getChoices().map(function(choice) {
        return choice.getValue();
      }).join(" | ");
    }
    if (type === FormApp.ItemType.LIST) {
      return item.asListItem().getChoices().map(function(choice) {
        return choice.getValue();
      }).join(" | ");
    }
    if (type === FormApp.ItemType.CHECKBOX_GRID) {
      var checkboxGrid = item.asCheckboxGridItem();
      return "Rows: " + checkboxGrid.getRows().join(", ") + " | Columns: " + checkboxGrid.getColumns().join(", ");
    }
    if (type === FormApp.ItemType.GRID) {
      var grid = item.asGridItem();
      return "Rows: " + grid.getRows().join(", ") + " | Columns: " + grid.getColumns().join(", ");
    }
  } catch (err) {
    return "Error extracting values: " + err.message;
  }

  return "";
}

function enforceContactFields_(form) {
  var oldTitle = "Who is the main contact and his/her email";
  var existingName = findQuestionByTitle_(form, FORM_CONFIG.canonicalQuestions.contactName);
  var existingEmail = findQuestionByTitle_(form, FORM_CONFIG.canonicalQuestions.contactEmail);
  var oldItem = findQuestionByTitle_(form, oldTitle);

  if (!existingName && !existingEmail && oldItem) {
    var originalIndex = getItemIndexById_(form, oldItem.getId());
    form.deleteItem(originalIndex);

    var nameItem = form.addTextItem().setTitle(FORM_CONFIG.canonicalQuestions.contactName);
    nameItem.setRequired(true);
    form.moveItem(form.getItems().length - 1, originalIndex);

    var emailItem = form.addTextItem().setTitle(FORM_CONFIG.canonicalQuestions.contactEmail);
    emailItem.setRequired(true);
    emailItem.setValidation(
      FormApp.createTextValidation()
        .requireTextIsEmail()
        .setHelpText("Please enter a valid email address.")
        .build()
    );
    form.moveItem(form.getItems().length - 1, originalIndex + 1);
    return;
  }

  if (existingName && existingName.getType() === FormApp.ItemType.TEXT) {
    existingName.asTextItem().setRequired(true);
  }

  if (existingEmail && existingEmail.getType() === FormApp.ItemType.TEXT) {
    existingEmail.asTextItem()
      .setRequired(true)
      .setValidation(
        FormApp.createTextValidation()
          .requireTextIsEmail()
          .setHelpText("Please enter a valid email address.")
          .build()
      );
  }
}

function enforceAttendanceField_(form) {
  var title = FORM_CONFIG.canonicalQuestions.attendance;
  var item = findQuestionByTitle_(form, title);

  if (!item) {
    return;
  }

  if (item.getType() === FormApp.ItemType.TEXT) {
    item.asTextItem()
      .setRequired(true)
      .setValidation(
        FormApp.createTextValidation()
          .requireNumber()
          .setHelpText("Please enter a number.")
          .build()
      );
    return;
  }

  var index = getItemIndexById_(form, item.getId());
  form.deleteItem(index);
  var newItem = form.addTextItem().setTitle(title);
  newItem.setRequired(true);
  newItem.setValidation(
    FormApp.createTextValidation()
      .requireNumber()
      .setHelpText("Please enter a number.")
      .build()
  );
  form.moveItem(form.getItems().length - 1, index);
}

function enforceCheckboxQuestion_(form, aliases, targetTitle, options, required) {
  var item = null;

  for (var i = 0; i < aliases.length; i++) {
    item = findQuestionByTitle_(form, aliases[i]);
    if (item) {
      break;
    }
  }

  if (!item) {
    return;
  }

  if (item.getType() === FormApp.ItemType.CHECKBOX) {
    item.asCheckboxItem()
      .setTitle(targetTitle)
      .setChoices(options.map(function(option) {
        return item.asCheckboxItem().createChoice(option);
      }))
      .setRequired(required);
    return;
  }

  var index = getItemIndexById_(form, item.getId());
  form.deleteItem(index);
  var checkboxItem = form.addCheckboxItem().setTitle(targetTitle);
  checkboxItem.setChoices(options.map(function(option) {
    return checkboxItem.createChoice(option);
  }));
  checkboxItem.setRequired(required);
  form.moveItem(form.getItems().length - 1, index);
}

function findQuestionByTitle_(form, title) {
  var items = form.getItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === title) {
      return items[i];
    }
  }
  return null;
}

function getItemIndexById_(form, itemId) {
  var items = form.getItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].getId() === itemId) {
      return i;
    }
  }
  return -1;
}

function mapMinistriesToCanonical_(value) {
  if (!value) {
    return "";
  }
  var parts = value.split(",").map(function(part) {
    return part.trim();
  });
  var mapped = [];
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var normalized = normalizeString_(part);
    if (normalized.indexOf("children") !== -1) {
      mapped.push("Children");
    } else if (normalized.indexOf("students") !== -1) {
      mapped.push("Students");
    } else if (normalized.indexOf("college") !== -1) {
      mapped.push("College");
    } else if (normalized.indexOf("young adults") !== -1) {
      mapped.push("Young Adults");
    } else if (normalized.indexOf("40s") !== -1) {
      mapped.push("40s Plus");
    } else {
      mapped.push(part);
    }
  }
  return mapped.join(", ");
}

function buildEmailHtmlBody_(match, answers) {
  var roleName = match.role.role || "";
  var sections = getSectionsForRole_(roleName);

  var eventName = answers[FORM_CONFIG.canonicalQuestions.eventName] || "(not provided)";
  var eventDate = answers[FORM_CONFIG.canonicalQuestions.eventDate] || "(not provided)";
  var eventTime = buildEventTimeLine_(answers) || "";
  var location = answers[FORM_CONFIG.canonicalQuestions.location] || "(not provided)";
  var attendance = answers[FORM_CONFIG.canonicalQuestions.attendance] || "";

  var requesterName = answers[FORM_CONFIG.canonicalQuestions.contactName] || "(not provided)";
  var requesterEmail = answers[FORM_CONFIG.canonicalQuestions.contactEmail] || "";
  var requestingMinistry = answers[FORM_CONFIG.canonicalQuestions.requestingMinistry] || "";
  
  var purpose = answers[FORM_CONFIG.canonicalQuestions.audience] || "";

  var actionNeeded = hasTextValue_(match.role.actionNeeded)
    ? match.role.actionNeeded
    : "Review the event details below and follow up with the requester as needed.";
  var matchedConditions = match.reasons.join("; ");

  var html = [];
  
  // Style and Container
  html.push('<div style="font-family: \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #2D3748; line-height: 1.6; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background-color: #F8FAFC;">');
  
  // Header Section
  html.push('  <div style="background-color: #3B82F6; color: #FFFFFF; padding: 24px; border-radius: 6px 6px 0 0; margin-bottom: 20px;">');
  html.push('    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; opacity: 0.9; margin-bottom: 4px;">City Light Event Request</div>');
  html.push('    <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.2;">' + escapeHtml_(eventName) + '</h1>');
  html.push('    <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">');
  html.push('      <span>🗓️ ' + escapeHtml_(eventDate) + (eventTime ? ' (' + escapeHtml_(eventTime.replace("Event Time: ", "")) + ')' : '') + '</span>');
  html.push('    </div>');
  html.push('    <div style="font-size: 14px; opacity: 0.95; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; margin-top: 10px;">');
  html.push('      <strong>Requested By:</strong> ' + escapeHtml_(requesterName) + (requesterEmail ? ' (<a href="mailto:' + escapeHtml_(requesterEmail) + '" style="color: #FFFFFF; text-decoration: underline;">' + escapeHtml_(requesterEmail) + '</a>)' : '') + (requestingMinistry ? ' | <strong>Ministry:</strong> ' + escapeHtml_(requestingMinistry) : ''));
  html.push('    </div>');
  html.push('  </div>');

  // Metadata / Action Block
  html.push('  <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; border-radius: 0 4px 4px 0; margin-bottom: 24px;">');
  html.push('    <div style="margin-bottom: 6px; font-size: 15px;"><strong>Action Needed:</strong> <span style="color: #1E40AF; font-weight: 600;">' + escapeHtml_(actionNeeded) + '</span></div>');
  html.push('    <div style="font-size: 13px; color: #4B5563;"><strong>Role:</strong> ' + escapeHtml_(roleName) + ' | <strong>Matched:</strong> ' + escapeHtml_(matchedConditions) + '</div>');
  html.push('  </div>');

  // Event Purpose/Description
  if (purpose) {
    html.push('  <div style="margin-bottom: 24px; background-color: #FFFFFF; padding: 16px; border: 1px solid #E2E8F0; border-radius: 6px;">');
    html.push('    <h3 style="margin-top: 0; margin-bottom: 8px; color: #1E293B; font-size: 15px; font-weight: 700; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em;">Event Description</h3>');
    html.push('    <p style="margin: 0; color: #475569; font-size: 14px; white-space: pre-wrap;">' + escapeHtml_(purpose) + '</p>');
    html.push('  </div>');
  }

  // Helper to render sections as bold headers with tables
  function renderSectionTable(title, fields) {
    var validFields = [];
    for (var i = 0; i < fields.length; i++) {
      var val = getAnswerOrBlank_(answers, fields[i].key);
      if (val) {
        validFields.push({ label: fields[i].label, value: val, isMultiline: fields[i].isMultiline });
      }
    }
    
    if (validFields.length === 0) {
      return '';
    }

    var sectionHtml = [];
    sectionHtml.push('  <div style="margin-bottom: 24px;">');
    sectionHtml.push('    <h3 style="margin-top: 0; margin-bottom: 12px; color: #1E293B; font-size: 15px; font-weight: 700; border-bottom: 2px solid #E2E8F0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.02em;">' + escapeHtml_(title) + '</h3>');
    sectionHtml.push('    <table style="width: 100%; border-collapse: collapse; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; font-size: 14px;">');
    
    for (var j = 0; j < validFields.length; j++) {
      var field = validFields[j];
      var rowBg = (j % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
      sectionHtml.push('      <tr style="background-color: ' + rowBg + '; border-bottom: 1px solid #F1F5F9;">');
      sectionHtml.push('        <td style="padding: 10px 12px; font-weight: bold; width: 40%; color: #475569; vertical-align: top; border-right: 1px solid #F1F5F9;">' + escapeHtml_(field.label) + '</td>');
      
      if (field.isMultiline) {
        sectionHtml.push('        <td style="padding: 10px 12px; color: #334155; vertical-align: top; white-space: pre-wrap;">' + escapeHtml_(field.value) + '</td>');
      } else {
        var valHtml = escapeHtml_(field.value);
        var normVal = normalizeString_(field.value);
        if (normVal === 'yes') {
          valHtml = '<span style="background-color: #DCFCE7; color: #15803D; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 12px; display: inline-block;">Yes</span>';
        } else if (normVal === 'no') {
          valHtml = '<span style="background-color: #FEE2E2; color: #B91C1C; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 12px; display: inline-block;">No</span>';
        }
        sectionHtml.push('        <td style="padding: 10px 12px; color: #334155; vertical-align: top;">' + valHtml + '</td>');
      }
      sectionHtml.push('      </tr>');
    }
    
    sectionHtml.push('    </table>');
    sectionHtml.push('  </div>');
    return sectionHtml.join('\n');
  }

  // Render sections
  
  // "summary" (Basic Details)
  var summaryFields = [
    { key: FORM_CONFIG.canonicalQuestions.location, label: "Location" },
    { key: FORM_CONFIG.canonicalQuestions.attendance, label: "Estimated Attendance" }
  ];
  html.push(renderSectionTable("Basic Details", summaryFields));

  // "setup"
  if (sections.indexOf("setup") !== -1) {
    var setupFields = [
      { key: FORM_CONFIG.canonicalQuestions.setupSupport, label: "Setup Support Needed" },
      { key: FORM_CONFIG.canonicalQuestions.roomLayout, label: "Room Layout Changes Needed" },
      { key: FORM_CONFIG.canonicalQuestions.checkIn, label: "Check-In Or Registration Needed" },
      { key: FORM_CONFIG.canonicalQuestions.setupDetails, label: "Setup Details", isMultiline: true }
    ];
    html.push(renderSectionTable("Setup & Logistics", setupFields));
  }

  // "hospitality"
  if (sections.indexOf("hospitality") !== -1) {
    var hospitalityFields = [
      { key: FORM_CONFIG.canonicalQuestions.hospitality, label: "Hospitality Support Needed" },
      { key: FORM_CONFIG.canonicalQuestions.additionalDetails, label: "Food & Meals Details", isMultiline: true }
    ];
    html.push(renderSectionTable("Hospitality & Food", hospitalityFields));
  }

  // "tech"
  if (sections.indexOf("tech") !== -1) {
    var techFields = [
      { key: FORM_CONFIG.canonicalQuestions.anyTechSupport, label: "Any Tech Support Needed?" },
      { key: FORM_CONFIG.canonicalQuestions.techRoles, label: "Tech Roles Needed" },
      { key: FORM_CONFIG.canonicalQuestions.liveMusic, label: "Live Music Or Worship Support Needed" },
      { key: FORM_CONFIG.canonicalQuestions.mediaCapture, label: "Media Capture Needed" },
      { key: FORM_CONFIG.canonicalQuestions.additionalDetails, label: "Tech Notes & Details", isMultiline: true }
    ];
    html.push(renderSectionTable("Tech & Audio/Visual Needs", techFields));
  }

  // "childcare"
  if (sections.indexOf("childcare") !== -1) {
    var childcareFields = [
      { key: FORM_CONFIG.canonicalQuestions.childcare, label: "Childcare Needed" },
      { key: FORM_CONFIG.canonicalQuestions.additionalDetails, label: "Childcare Details", isMultiline: true }
    ];
    html.push(renderSectionTable("Childcare", childcareFields));
  }

  // "safety"
  if (sections.indexOf("safety") !== -1) {
    var safetyFields = [
      { key: FORM_CONFIG.canonicalQuestions.safetyNotes, label: "Special Safety Considerations" }
    ];
    html.push(renderSectionTable("Safety Notes", safetyFields));
  }

  // "communications"
  if (sections.indexOf("communications") !== -1) {
    var commFields = [
      { key: FORM_CONFIG.canonicalQuestions.targetMinistries, label: "Target Ministries For Announcement" },
      { key: FORM_CONFIG.canonicalQuestions.planningCenter, label: "Planning Center Event Posting Needed" },
      { key: FORM_CONFIG.canonicalQuestions.socialMedia, label: "Social Media Promotion Needed" },
      { key: FORM_CONFIG.canonicalQuestions.announcementDetails, label: "Announcement Details" },
      { key: FORM_CONFIG.canonicalQuestions.registrationDeadline, label: "Registration Deadline" }
    ];
    html.push(renderSectionTable("Communications & Announcements", commFields));
  }

  // "media"
  if (sections.indexOf("media") !== -1) {
    var mediaFields = [
      { key: FORM_CONFIG.canonicalQuestions.mediaCapture, label: "Media Capture Needed" }
    ];
    html.push(renderSectionTable("Media Needs", mediaFields));
  }

  // "additional"
  if (sections.indexOf("additional") !== -1) {
    var addFields = [
      { key: FORM_CONFIG.canonicalQuestions.audience, label: "Who Is This Event For?" },
      { key: FORM_CONFIG.canonicalQuestions.eventType, label: "Event Type" },
      { key: FORM_CONFIG.canonicalQuestions.additionalDetails, label: "Additional Details We Should Know", isMultiline: true }
    ];
    html.push(renderSectionTable("Additional Details", addFields));
  }

  html.push('</div>');
  return html.join('\n');
}

function escapeHtml_(text) {
  if (!text) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

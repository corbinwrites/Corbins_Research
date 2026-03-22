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
  currentHeaders: {
    eventName: "What's the name of your event?",
    contactName: "Who is the main contact for this event",
    contactEmail: "What is the main contact for this event's email address?",
    eventPurpose: "What is the purpose of your event?",
    attendance: "How many people will you host at your event?",
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
  if (!e || !e.namedValues) {
    throw new Error("onEventFormSubmit requires the installable form submit event object.");
  }

  var answers = buildCanonicalAnswers_(normalizeNamedValues_(e.namedValues));
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
    "What's the name of your event?": ["Spring Worship Night"],
    "Who is the main contact for this event": ["Example Requester"],
    "What is the main contact for this event's email address?": ["requester@example.com"],
    "What is the purpose of your event?": ["Student worship and outreach night."],
    "How many people will you host at your event?": ["75"],
    "Where will your event be held?": ["Main Hall"],
    "Can you unlock and lock up the facility on your own?": ["No"],
    "What type of event will be?": ["Worship Night"],
    "When will your event start?": ["7:00 PM"],
    "When will your event end?": ["9:00 PM"],
    "Include the dates, start times, and end times": ["April 10, 2026 from 7:00 PM to 9:00 PM"],
    "I want food at this event": ["No"],
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
    "What ministry do you anticipate your event will reach?": ["Students, College"],
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

  MailApp.sendEmail({
    to: match.role.emails.join(","),
    replyTo: answers[FORM_CONFIG.canonicalQuestions.contactEmail] || "",
    subject: subject,
    body: body,
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
  var introLines = match.reasonExplanations.length > 0
    ? match.reasonExplanations
    : ["You are receiving this message because your role was matched by the City Light event request workflow."];

  var lines = [
    introLines.join("\n"),
    "",
    hasTextValue_(match.role.actionNeeded)
      ? "Action Needed: " + match.role.actionNeeded
      : "Action Needed: Review the event details below and follow up with the requester as needed.",
    "Role: " + match.role.role,
    "Matched Conditions: " + match.reasons.join("; "),
    ""
  ];

  lines = lines.concat(buildEventSummaryLines_(answers));
  return lines.join("\n");
}

function buildEventSummaryLines_(answers) {
  var lines = [];
  var eventSummary = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.eventName, "Event Name"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.eventDate, "Event Date"),
    buildEventTimeLine_(answers),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.location, "Location"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.attendance, "Estimated Attendance")
  ];
  appendSection_(lines, "Event Summary", eventSummary);

  var requester = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.contactName, "Contact Name"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.contactEmail, "Contact Email"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.requestingMinistry, "Requesting Ministry / Team"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.eventOwner, "Event Owner / Primary Ministry")
  ];
  appendSection_(lines, "Requester", requester);

  var supportRequests = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.setupSupport, "Setup Support Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.setupDetails, "Setup Details"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.roomLayout, "Room Layout Changes Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.childcare, "Childcare Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.hospitality, "Hospitality Support Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.safetyNotes, "Special Safety Considerations"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.anyTechSupport, "Any Tech Support Needed?"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.techRoles, "Tech Roles Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.liveMusic, "Live Music Or Worship Support Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.mediaCapture, "Media Capture Needed")
  ];
  appendSection_(lines, "Support Requests", supportRequests);

  var communications = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.targetMinistries, "Target Ministries For Announcement"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.planningCenter, "Planning Center Event Posting Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.socialMedia, "Social Media Promotion Needed"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.announcementDetails, "Announcement Details"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.registrationDeadline, "Registration Deadline (if applicable)")
  ];
  appendSection_(lines, "Communications", communications);

  var additionalDetails = [
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.audience, "Who Is This Event For?"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.eventType, "Event Type"),
    buildFieldLine_(answers, FORM_CONFIG.canonicalQuestions.additionalDetails, "Additional Details We Should Know")
  ];
  appendSection_(lines, "Additional Details", additionalDetails);

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
  answers[FORM_CONFIG.canonicalQuestions.requestingMinistry] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.targetMinistries,
    FORM_CONFIG.canonicalQuestions.requestingMinistry
  );
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
  answers[FORM_CONFIG.canonicalQuestions.targetMinistries] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.targetMinistries,
    FORM_CONFIG.canonicalQuestions.targetMinistries
  );
  answers[FORM_CONFIG.canonicalQuestions.setupSupport] = toYesNo_(
    anyTrue_(
      rawAnswers[FORM_CONFIG.currentHeaders.selfLockup] && !isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.selfLockup]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.tables]),
      isYesValue_(rawAnswers[FORM_CONFIG.currentHeaders.additionalRooms]),
      hasTextValue_(rawAnswers[FORM_CONFIG.currentHeaders.chairs]),
      hasTextValue_(rawAnswers[FORM_CONFIG.currentHeaders.chairNotes])
    )
  );
  answers[FORM_CONFIG.canonicalQuestions.setupDetails] = joinNonEmpty_([
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
  answers[FORM_CONFIG.canonicalQuestions.hospitality] = firstAnswer_(
    rawAnswers,
    FORM_CONFIG.currentHeaders.foodNeeded,
    FORM_CONFIG.canonicalQuestions.hospitality
  );
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

function getAnswerOrBlank_(answers, key) {
  return String(answers[key] || "").trim();
}

function buildFieldLine_(answers, key, label) {
  var value = getAnswerOrBlank_(answers, key);
  return value ? label + ": " + value : "";
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
  return normalized === "yes" || normalized === "true";
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

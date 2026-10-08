const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, ExternalHyperlink, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');

// Color palette matching existing runbook style
const BLUE_DARK = "1F3864";
const BLUE_MID  = "2E75B6";
const BLUE_LIGHT = "D5E8F0";
const YELLOW_BG = "FFF2CC";
const YELLOW_BORDER = "D6B656";
const RED_BG = "FFE6E6";
const RED_BORDER = "C00000";
const GREEN_BG = "E2EFDA";
const GRAY_BG = "F2F2F2";
const GRAY_BORDER = "CCCCCC";
const WHITE = "FFFFFF";

const border = { style: BorderStyle.SINGLE, size: 1, color: GRAY_BORDER };
const borders = { top: border, bottom: border, left: border, right: border };

const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

// ── helpers ──────────────────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE_MID, space: 1 } },
    children: [new TextRun({ text, bold: true, size: 32, color: BLUE_DARK, font: "Arial" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: BLUE_MID, font: "Arial" })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: BLUE_DARK, font: "Arial" })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts })]
  });
}

function paraChildren(children, opts = {}) {
  return new Paragraph({ spacing: { before: 60, after: 80 }, children, ...opts });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
    shading: { fill: "1E1E1E", type: ShadingType.CLEAR },
    children: [new TextRun({ text, size: 20, font: "Courier New", color: "D4D4D4" })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}

function numberedChildren(children, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 60, after: 60 },
    children
  });
}

function link(display, url) {
  return new ExternalHyperlink({
    link: url,
    children: [new TextRun({ text: display, style: "Hyperlink", size: 22, font: "Arial", color: BLUE_MID })]
  });
}

function blankLine() {
  return new Paragraph({ spacing: { before: 0, after: 60 }, children: [] });
}

// Callout box (single-cell table acting as alert)
function callout(label, text, fillColor, borderColor) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 4, color: borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
              left:   { style: BorderStyle.THICK,  size: 12, color: borderColor },
              right:  { style: BorderStyle.SINGLE, size: 4, color: borderColor },
            },
            shading: { fill: fillColor, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: label + " ", bold: true, size: 22, font: "Arial", color: borderColor }),
                  new TextRun({ text, size: 22, font: "Arial" })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function warningBox(text) { return callout("⚠️ WARNING:", text, YELLOW_BG, YELLOW_BORDER); }
function noteBox(text)    { return callout("📋 NOTE:", text, BLUE_LIGHT, BLUE_MID); }
function tipBox(text)     { return callout("✅ TIP:", text, GREEN_BG, "70AD47"); }

// Two-column table
function twoColTable(rows, headerRow = null) {
  const tableRows = [];
  if (headerRow) {
    tableRows.push(new TableRow({
      tableHeader: true,
      children: headerRow.map((text, i) =>
        new TableCell({
          borders,
          width: { size: i === 0 ? 3120 : 6240, type: WidthType.DXA },
          shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 22, font: "Arial", color: WHITE })] })]
        })
      )
    }));
  }
  rows.forEach((row, ri) => {
    const fill = ri % 2 === 0 ? WHITE : GRAY_BG;
    tableRows.push(new TableRow({
      children: row.map((cell, i) => {
        let cellChildren;
        if (typeof cell === 'string') {
          cellChildren = [new Paragraph({ children: [new TextRun({ text: cell, size: 22, font: "Arial" })] })];
        } else {
          cellChildren = cell; // array of Paragraphs
        }
        return new TableCell({
          borders,
          width: { size: i === 0 ? 3120 : 6240, type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR },
          margins: cellMargins,
          children: cellChildren
        });
      })
    }));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 6240], rows: tableRows });
}

// ── Document Content ─────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } },
                     run: { font: "Arial" } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } },
                     run: { font: "Arial" } } },
        ]
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } },
                     run: { font: "Arial" } } },
          { level: 1, format: LevelFormat.DECIMAL, text: "%1.%2.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } },
                     run: { font: "Arial" } } },
        ]
      },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: BLUE_DARK },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: BLUE_MID },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [

      // ─── COVER BLOCK ───────────────────────────────────────────────────────
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: "CITY LIGHT BIBLE CHURCH", bold: true, size: 36, font: "Arial", color: WHITE, highlight: undefined })]
      }),
      // Title banner as a single-cell table
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          shading: { fill: BLUE_DARK, type: ShadingType.CLEAR },
          margins: { top: 200, bottom: 200, left: 240, right: 240 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CITY LIGHT BIBLE CHURCH", bold: true, size: 40, font: "Arial", color: WHITE })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "YouTube Livestream Creation Automation", bold: true, size: 30, font: "Arial", color: "BDD7EE" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: "Build Guide for Automated Weekly Stream Scheduling", size: 22, font: "Arial", color: "9DC3E6" })] }),
          ]
        })]})],
      }),
      blankLine(),

      // Metadata table
      twoColTable([
        ["Owner", "tech@citylightbible.org"],
        ["YouTube Channel", "City Light Bible (Brand Account) — UCBJ-DjAtIcy1n6O2gBf5Seg"],
        ["Related Runbook", "CLBC YouTube Livestream Automation Operations & Troubleshooting Runbook"],
        ["Last Updated", "June 2026"],
      ]),
      blankLine(),

      // ─── SECTION 1 ─────────────────────────────────────────────────────────
      h1("1. Purpose & Scope"),
      para("This guide describes how to build a fully automated system that creates a new YouTube livestream every week for City Light Bible Church. The system will:"),
      bullet("Automatically schedule a new unlisted Sunday livestream each week at 10:00 AM"),
      bullet("Apply a consistent title format: e.g., 6/14/26 Sunday Service at City Light Bible Church"),
      bullet("Apply a standard description with links to connect, give, and watch past sermons"),
      bullet("Set the correct category (Nonprofits & Activism), audience (not for kids), and visibility (Unlisted)"),
      bullet("Disable all live chat customization options"),
      bullet("Append the new stream URL to the existing Livestream Links Google Sheet"),
      blankLine(),
      noteBox("This system complements the existing fetchUnlistedUpcomingStreams() script documented in the main runbook. That script reads streams from YouTube; this new script creates them."),
      blankLine(),

      // ─── SECTION 2 ─────────────────────────────────────────────────────────
      h1("2. How It Will Work"),
      para("The automation uses the same OAuth infrastructure already in place for the existing runbook. A new Apps Script function (createWeeklyLivestream) will:"),
      numbered("Calculate the date of the next upcoming Sunday"),
      numbered("Format a title string: M/D/YY Sunday Service at City Light Bible Church"),
      numbered("Call the YouTube Data API v3 liveBroadcasts.insert endpoint to create the stream"),
      numbered("Call the YouTube Data API v3 liveStreams.insert endpoint to create the bound stream"),
      numbered("Bind the broadcast to the stream via liveBroadcasts.bind"),
      numbered("Append the new stream URL and metadata to the Livestream Links Google Sheet"),
      blankLine(),

      h2("Architecture"),
      twoColTable([
        ["Trigger", "Weekly, Sunday 6–7 AM (runs before the service, creates next week's stream)"],
        ["Function", "createWeeklyLivestream()"],
        ["Script", "Same Apps Script project: \"Youtube Links\""],
        ["API Endpoints Used", "liveBroadcasts.insert, liveStreams.insert, liveBroadcasts.bind"],
        ["Auth", "Same YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN already in Script Properties"],
        ["Output", "New unlisted livestream on YouTube + new row in Livestream Links sheet"],
      ], ["Component", "Details"]),
      blankLine(),

      // ─── SECTION 3 ─────────────────────────────────────────────────────────
      h1("3. Prerequisites"),
      para("Before building, confirm the following are already in place (all documented in the main runbook):"),
      bullet("Apps Script project \"Youtube Links\" exists at script.google.com (signed in as tech@citylightbible.org)"),
      bullet("Script Properties contain valid values for YT_CLIENT_ID, YT_CLIENT_SECRET, and YT_REFRESH_TOKEN"),
      bullet("The GCP project \"City Light Youtube\" has YouTube Data API v3 enabled"),
      bullet("The existing fetchUnlistedUpcomingStreams() function runs successfully"),
      blankLine(),
      noteBox("Run debugProps() in the existing script to verify Script Properties are populated before proceeding."),
      blankLine(),

      // ─── SECTION 4 ─────────────────────────────────────────────────────────
      h1("4. Step-by-Step Build Instructions"),

      h2("Step 1 — Open the Existing Apps Script Project"),
      numbered("Go to script.google.com and sign in as tech@citylightbible.org"),
      numbered("Open the \"Youtube Links\" project (find it under All Projects if not in My Projects)"),
      numbered("You will see the existing script file — you will add new code to this same project"),
      blankLine(),

      h2("Step 2 — Add the createWeeklyLivestream() Function"),
      para("In the Apps Script editor, add the following code as a new function in the same file (or in a new file within the same project). This is the complete function:"),
      blankLine(),
      code("function createWeeklyLivestream() {"),
      code("  // ── 1. Calculate next Sunday ──────────────────────────────────────"),
      code("  var now     = new Date();"),
      code("  var day     = now.getDay(); // 0=Sun, 1=Mon … 6=Sat"),
      code("  var daysUntilSunday = (day === 0) ? 7 : 7 - day;"),
      code("  var nextSunday = new Date(now);"),
      code("  nextSunday.setDate(now.getDate() + daysUntilSunday);"),
      code("  nextSunday.setHours(10, 0, 0, 0); // 10:00 AM local"),
      code(""),
      code("  // ── 2. Build title ───────────────────────────────────────────────"),
      code("  var m = nextSunday.getMonth() + 1;"),
      code("  var d = nextSunday.getDate();"),
      code("  var yy = String(nextSunday.getFullYear()).slice(-2);"),
      code("  var title = m + '/' + d + '/' + yy + ' Sunday Service at City Light Bible Church';"),
      code(""),
      code("  // ── 3. Description ───────────────────────────────────────────────"),
      code("  var description ="),
      code("    'Connect with us: https://www.citylightbible.org/connect\\n' +"),
      code("    'Give to us: https://citylightbible.churchcenter.com/giving\\n' +"),
      code("    'Watch past sermons: https://www.citylightbible.org/sermons';"),
      code(""),
      code("  // ── 4. Get access token ──────────────────────────────────────────"),
      code("  var props       = PropertiesService.getScriptProperties();"),
      code("  var clientId     = props.getProperty('YT_CLIENT_ID');"),
      code("  var clientSecret = props.getProperty('YT_CLIENT_SECRET');"),
      code("  var refreshToken = props.getProperty('YT_REFRESH_TOKEN');"),
      code(""),
      code("  var tokenResp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {"),
      code("    method: 'post',"),
      code("    contentType: 'application/x-www-form-urlencoded',"),
      code("    payload: 'client_id='     + encodeURIComponent(clientId) +"),
      code("             '&client_secret=' + encodeURIComponent(clientSecret) +"),
      code("             '&refresh_token=' + encodeURIComponent(refreshToken) +"),
      code("             '&grant_type=refresh_token'"),
      code("  });"),
      code("  var accessToken = JSON.parse(tokenResp.getContentText()).access_token;"),
      code("  var authHeader  = { Authorization: 'Bearer ' + accessToken };"),
      code(""),
      code("  // ── 5. Create liveBroadcast ──────────────────────────────────────"),
      code("  var scheduledStart = nextSunday.toISOString();"),
      code("  var broadcastBody = {"),
      code("    snippet: {"),
      code("      title:              title,"),
      code("      description:        description,"),
      code("      scheduledStartTime: scheduledStart"),
      code("    },"),
      code("    status: {"),
      code("      privacyStatus:        'unlisted',"),
      code("      selfDeclaredMadeForKids: false"),
      code("    },"),
      code("    contentDetails: {"),
      code("      enableAutoStart:  false,"),
      code("      enableAutoStop:   false,"),
      code("      enableDvr:        true,"),
      code("      recordFromStart:  true,"),
      code("      enableLiveChatReplay: false,"),
      code("      // Live chat options — all disabled"),
      code("      enableChat:           false,"),
      code("      enableSuperChat:      false,"),
      code("      enableSuperSticker:   false"),
      code("    }"),
      code("  };"),
      code(""),
      code("  var broadcastResp = UrlFetchApp.fetch("),
      code("    'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails',"),
      code("    { method: 'post', contentType: 'application/json',"),
      code("      headers: authHeader, payload: JSON.stringify(broadcastBody),"),
      code("      muteHttpExceptions: true }"),
      code("  );"),
      code("  var broadcast = JSON.parse(broadcastResp.getContentText());"),
      code("  if (!broadcast.id) {"),
      code("    Logger.log('ERROR creating broadcast: ' + broadcastResp.getContentText());"),
      code("    return;"),
      code("  }"),
      code("  Logger.log('Broadcast created: ' + broadcast.id);"),
      code(""),
      code("  // ── 6. Create liveStream (encoder binding) ───────────────────────"),
      code("  var streamBody = {"),
      code("    snippet: { title: title },"),
      code("    cdn: {"),
      code("      frameRate:    '30fps',"),
      code("      ingestionType: 'rtmp',"),
      code("      resolution:   '1080p'"),
      code("    }"),
      code("  };"),
      code(""),
      code("  var streamResp = UrlFetchApp.fetch("),
      code("    'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn',"),
      code("    { method: 'post', contentType: 'application/json',"),
      code("      headers: authHeader, payload: JSON.stringify(streamBody),"),
      code("      muteHttpExceptions: true }"),
      code("  );"),
      code("  var stream = JSON.parse(streamResp.getContentText());"),
      code("  if (!stream.id) {"),
      code("    Logger.log('ERROR creating stream: ' + streamResp.getContentText());"),
      code("    return;"),
      code("  }"),
      code("  Logger.log('Stream created: ' + stream.id);"),
      code(""),
      code("  // ── 7. Bind broadcast to stream ──────────────────────────────────"),
      code("  var bindResp = UrlFetchApp.fetch("),
      code("    'https://www.googleapis.com/youtube/v3/liveBroadcasts/bind' +"),
      code("    '?id=' + broadcast.id +"),
      code("    '&streamId=' + stream.id +"),
      code("    '&part=id,contentDetails',"),
      code("    { method: 'post', headers: authHeader, muteHttpExceptions: true }"),
      code("  );"),
      code("  Logger.log('Bind response: ' + bindResp.getContentText());"),
      code(""),
      code("  // ── 8. Set category via Videos.update ────────────────────────────"),
      code("  // Category 29 = Nonprofits & Activism"),
      code("  var videoBody = {"),
      code("    id: broadcast.id,"),
      code("    snippet: {"),
      code("      title:       title,"),
      code("      description: description,"),
      code("      categoryId:  '29'"),
      code("    }"),
      code("  };"),
      code("  UrlFetchApp.fetch("),
      code("    'https://www.googleapis.com/youtube/v3/videos?part=snippet',"),
      code("    { method: 'put', contentType: 'application/json',"),
      code("      headers: authHeader, payload: JSON.stringify(videoBody),"),
      code("      muteHttpExceptions: true }"),
      code("  );"),
      code("  Logger.log('Category set to Nonprofits & Activism (29)');"),
      code(""),
      code("  // ── 9. Append to Google Sheet ─────────────────────────────────────"),
      code("  var ss     = SpreadsheetApp.openById('1z2rRPxpydv9HMc8WqJ8ciyEf-P6KtRdCFxm8iyPdpb8');"),
      code("  var sheet  = ss.getSheetByName('Livestream Links');"),
      code("  var videoUrl = 'https://www.youtube.com/watch?v=' + broadcast.id;"),
      code("  sheet.appendRow([title, scheduledStart, videoUrl, broadcast.id]);"),
      code("  Logger.log('Appended to sheet: ' + videoUrl);"),
      code("}"),
      blankLine(),
      warningBox("Do not change the Spreadsheet ID or sheet tab name. They are hardcoded to match the existing system documented in the main runbook."),
      blankLine(),

      h2("Step 3 — Save the Script"),
      numbered("Click the floppy disk icon (or press Ctrl+S / Cmd+S) to save"),
      numbered("Verify no red error indicators appear in the editor gutter"),
      blankLine(),

      h2("Step 4 — Test the Function Manually"),
      numbered("In the function dropdown at the top of the editor, select createWeeklyLivestream"),
      numbered("Click Run"),
      numbered("On first run, an OAuth consent screen may appear — select tech@citylightbible.org and grant access"),
      numbered("Open the Execution Log (View > Execution Log) and confirm you see:"),
      bullet("Broadcast created: <some video ID>", 1),
      bullet("Stream created: <some stream ID>", 1),
      bullet("Bind response: (a JSON object with contentDetails)", 1),
      bullet("Category set to Nonprofits & Activism (29)", 1),
      bullet("Appended to sheet: https://www.youtube.com/watch?v=...", 1),
      numbered("Open the Google Sheet (Livestream Links tab) and confirm a new row was added"),
      numbered("Open YouTube Studio and confirm the stream appears in the schedule with correct title, description, category, and visibility"),
      blankLine(),
      tipBox("After the test run creates a stream for next Sunday, you can delete it in YouTube Studio if you do not want it to remain. The sheet row can also be removed manually."),
      blankLine(),

      h2("Step 5 — Create the Weekly Trigger"),
      numbered("In the Apps Script left sidebar, click the clock icon (Triggers)"),
      numbered("Click + Add Trigger (bottom right)"),
      numbered("Configure the trigger as follows:"),
      blankLine(),
      twoColTable([
        ["Function to run", "createWeeklyLivestream"],
        ["Deployment to run", "Head"],
        ["Event source", "Time-driven"],
        ["Type of time-based trigger", "Week timer"],
        ["Day of week", "Sunday"],
        ["Time of day", "6am to 7am"],
      ], ["Setting", "Value"]),
      blankLine(),
      numbered("Click Save"),
      numbered("Confirm the trigger appears in the Triggers list, owned by tech@citylightbible.org"),
      blankLine(),
      noteBox("The trigger runs on Sunday morning (6–7 AM) to create next week's stream automatically. It will fire every Sunday, always calculating the next Sunday's date from the run date."),
      blankLine(),
      warningBox("If the trigger is created while logged in as a different account, delete it and recreate it as tech@citylightbible.org. A trigger owned by a wrong account will fail silently when that account loses access."),
      blankLine(),

      // ─── SECTION 5 ─────────────────────────────────────────────────────────
      h1("5. Stream Settings Reference"),
      para("The function sets the following values on every stream it creates. This table serves as both a reference and a verification checklist."),
      blankLine(),
      twoColTable([
        ["Title format", "M/D/YY Sunday Service at City Light Bible Church (e.g., 6/14/26 Sunday Service at City Light Bible Church)"],
        ["Description", "Connect with us: https://www.citylightbible.org/connect\nGive to us: https://citylightbible.churchcenter.com/giving\nWatch past sermons: https://www.citylightbible.org/sermons"],
        ["Category", "Nonprofits & Activism (categoryId: 29)"],
        ["Made for kids", "No (selfDeclaredMadeForKids: false)"],
        ["Live chat", "Disabled (enableChat: false)"],
        ["Super Chat / Super Sticker", "Disabled"],
        ["Live chat replay", "Disabled (enableLiveChatReplay: false)"],
        ["Privacy / Visibility", "Unlisted"],
        ["Scheduled time", "10:00 AM on the next upcoming Sunday"],
        ["Frame rate / Resolution", "30fps / 1080p (RTMP ingest)"],
      ], ["Setting", "Value Applied"]),
      blankLine(),
      noteBox("The live chat settings (enableChat, enableSuperChat, enableSuperSticker) correspond to the Customization step in the manual workflow: \"Uncheck all boxes for live chat.\""),
      blankLine(),

      // ─── SECTION 6 ─────────────────────────────────────────────────────────
      h1("6. Verification Checklist"),
      para("After the trigger has run for the first time automatically (or after a manual test run), verify the following:"),
      blankLine(),
      twoColTable([
        ["YouTube Studio", "New stream appears at studio.youtube.com/channel/UCBJ-DjAtIcy1n6O2gBf5Seg/livestreaming with correct title, description, category, and visibility (Unlisted)"],
        ["Google Sheet", "New row added to Livestream Links tab with Title, Scheduled Time, Video URL, Video ID"],
        ["Execution Log", "No ERROR lines; all five success log lines present"],
        ["Trigger ownership", "Trigger shown as owned by tech@citylightbible.org in Apps Script → Triggers"],
        ["Deduplication", "fetchUnlistedUpcomingStreams() (existing Monday trigger) will also pick up the new stream and deduplicate by Video ID — no duplicate rows"],
      ], ["Item", "Expected Result"]),
      blankLine(),

      // ─── SECTION 7 ─────────────────────────────────────────────────────────
      h1("7. Troubleshooting"),

      h2("Error: Broadcast created but category is not set"),
      para("The Videos.update call (Step 8 in the function) requires the video to exist as a resource before it can be patched. If the category remains as the default after creation:"),
      bullet("Wait 30 seconds and run the category-update portion manually, or"),
      bullet("Add a Utilities.sleep(5000) before the Videos.update call in the script"),
      blankLine(),

      h2("Error: 401 Unauthorized on any API call"),
      para("The refresh token is invalid or expired. Follow the \"Generate a new refresh token\" procedure in Section 4 of the main Operations & Troubleshooting Runbook."),
      blankLine(),

      h2("Error: enableChat or enableSuperChat fields rejected"),
      para("Older YouTube API behavior may not accept all chat fields at broadcast creation time. If this occurs:"),
      bullet("Remove enableSuperChat and enableSuperSticker from broadcastBody"),
      bullet("Verify in YouTube Studio manually after creation that chat is set correctly"),
      bullet("Note: the primary enableChat: false field is the most important one"),
      blankLine(),

      h2("Stream created with wrong date"),
      para("If the function runs on a Sunday and calculates 7 days ahead (creating a stream two Sundays out instead of next Sunday), verify the timezone of the Apps Script project. To explicitly set the next Sunday relative to Pacific Time:"),
      bullet("Go to Project Settings (gear icon) in Apps Script"),
      bullet("Confirm the script time zone is set to America/Los_Angeles"),
      blankLine(),

      h2("Duplicate rows in the Google Sheet"),
      para("Both createWeeklyLivestream() (this new function) and fetchUnlistedUpcomingStreams() (existing Monday trigger) write to the Livestream Links tab. The existing function deduplicates by Video ID, so no true duplicates should appear. If you see duplicates, check whether the Video ID column is being populated correctly in the new function's appendRow call."),
      blankLine(),

      // ─── SECTION 8 ─────────────────────────────────────────────────────────
      h1("8. Maintenance"),

      h2("Annual"),
      bullet("Verify the trigger is still active and owned by tech@citylightbible.org in Apps Script → Triggers"),
      bullet("Confirm the OAuth consent screen in GCP is still set to External and In Production (not Testing)"),
      bullet("Review the stream settings reference table (Section 5) and update the function if any defaults change"),
      blankLine(),

      h2("If the Description or Title Format Changes"),
      para("Edit the description and title variables directly in the createWeeklyLivestream() function in Apps Script. No trigger changes are needed."),
      blankLine(),

      h2("If Credentials Change"),
      para("This function uses the same YT_CLIENT_ID, YT_CLIENT_SECRET, and YT_REFRESH_TOKEN as the existing system. If those are regenerated (see Section 4 of the main runbook), no changes are needed here — the new values in Script Properties will be picked up automatically."),
      blankLine(),

      // ─── SECTION 9 ─────────────────────────────────────────────────────────
      h1("9. Quick Reference"),
      twoColTable([
        ["Apps Script Project", "script.google.com → sign in as tech@citylightbible.org → Youtube Links"],
        ["Google Sheet", "docs.google.com/spreadsheets/d/1z2rRPxpydv9HMc8WqJ8ciyEf-P6KtRdCFxm8iyPdpb8"],
        ["YouTube Studio Live Streams", "studio.youtube.com/channel/UCBJ-DjAtIcy1n6O2gBf5Seg/livestreaming"],
        ["YouTube Category ID Reference", "developers.google.com/youtube/v3/docs/videoCategories — Category 29 = Nonprofits & Activism"],
        ["OAuth Troubleshooting", "See Section 3 of the main Operations & Troubleshooting Runbook"],
      ], ["Resource", "URL / Notes"]),
      blankLine(),
      blankLine(),

      // Footer note
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE_MID, space: 6 } },
        children: [new TextRun({ text: "City Light Bible Church  |  YouTube Livestream Creation Automation  |  Build Guide  |  June 2026", size: 18, font: "Arial", color: "888888" })]
      })

    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/claude/CLBC_YouTube_Creation_BuildGuide.docx', buffer);
  console.log('Done!');
});

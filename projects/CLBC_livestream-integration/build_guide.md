# CITY LIGHT BIBLE CHURCH
## YouTube Livestream Creation Automation
### Build Guide — 8-Week Buffer System

| Metric | Details |
|---|---|
| **Owner** | tech@citylightbible.org |
| **YouTube Channel** | City Light Bible (Brand Account) — UCBJ-DjAtIcy1n6O2gBf5Seg |
| **Related Runbook** | CLBC YouTube Livestream Automation Operations & Troubleshooting Runbook |
| **Last Updated** | June 2026 |

---

# 1. Purpose & Scope

This guide describes how to build an automated system that maintains a rolling 8-week buffer of scheduled YouTube livestreams for City Light Bible Church. Instead of creating one stream at a time, the system runs every week and checks whether all 8 upcoming Sundays already have a stream — creating any that are missing.

On each run the function will:
- Calculate the next 8 Sundays from the current date
- Read existing scheduled broadcasts from YouTube and the Google Sheet
- Create a stream only for each Sunday that does not already have one
- Append any newly created streams to the Livestream Links Google Sheet

> [!NOTE]
> This is idempotent — running it multiple times in a week is safe. It will never create a duplicate for a Sunday that already has a stream.

---

# 2. How It Works

### Buffer Logic
Every Sunday morning the trigger fires. The function:
1. Fetches a fresh access token using the stored refresh token.
2. Reads the Video ID column from the Livestream Links sheet to build a dedup set.
3. Calls `liveBroadcasts.list` (`broadcastStatus=upcoming`) on YouTube to build a second dedup set keyed by scheduled date.
4. Calculates 8 target Sundays starting from next Sunday.
5. For each target Sunday: if no broadcast already exists for that date on YouTube, creates one (broadcast + stream + bind + category + sheet row).

### Why Two Dedup Checks?
The sheet check catches streams that were previously created by this function. The YouTube API check catches streams that exist on YouTube but haven't been written to the sheet yet (e.g., streams created manually in YouTube Studio). Using both prevents any duplicate creation.

### Architecture

| Component | Details |
|---|---|
| **Trigger** | Weekly, Sunday 6–7 AM |
| **Function** | `ensureEightWeekBuffer()` |
| **Script** | Same Apps Script project: "Youtube Links" |
| **API Endpoints** | `liveBroadcasts.list`, `liveBroadcasts.insert`, `liveStreams.insert`, `liveBroadcasts.bind`, `videos.update` |
| **Auth** | Same `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` in Script Properties |
| **Output** | Up to 8 new unlisted streams on YouTube + corresponding rows in Livestream Links sheet |

---

# 3. Prerequisites

All of the following must already be in place before building this:
- Apps Script project "Youtube Links" exists at script.google.com (signed in as tech@citylightbible.org)
- Script Properties contain valid values for `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, and `YT_REFRESH_TOKEN`
- The GCP project "City Light Youtube" has YouTube Data API v3 enabled
- The Livestream Links sheet (column D = Video ID) is accessible to the script

> [!NOTE]
> Run `debugProps()` in the existing script to verify Script Properties are populated before proceeding.

---

# 4. Step-by-Step Build Instructions

### Step 1 — Open the Existing Apps Script Project
1. Go to script.google.com and sign in as tech@citylightbible.org.
2. Open the "Youtube Links" project (check All Projects if not visible under My Projects).
3. You will add the new function to this same project — no new project needed.

### Step 2 — Add the ensureEightWeekBuffer() Function
In the Apps Script editor, add the following as a new function in the same file (or a new file within the same project). This is the complete, ready-to-paste function:

```javascript
function ensureEightWeekBuffer() {
  try {
    var BUFFER_WEEKS = 8;
    var SPREADSHEET_ID = '1z2rRPxpydv9HMc8WqJ8ciyEf-P6KtRdCFxm8iyPdpb8';
    var SHEET_NAME = 'Livestream Links';

    Logger.log('Starting ensureEightWeekBuffer execution...');

    // ── 1. Get access token ───────────────────────────────────────────────
    var props        = PropertiesService.getScriptProperties();
    var clientId     = props.getProperty('YT_CLIENT_ID');
    var clientSecret = props.getProperty('YT_CLIENT_SECRET');
    var refreshToken = props.getProperty('YT_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Missing OAuth credentials in Script Properties (YT_CLIENT_ID, YT_CLIENT_SECRET, or YT_REFRESH_TOKEN).");
    }

    var tokenResp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: 'client_id='     + encodeURIComponent(clientId) +
               '&client_secret=' + encodeURIComponent(clientSecret) +
               '&refresh_token=' + encodeURIComponent(refreshToken) +
               '&grant_type=refresh_token',
      muteHttpExceptions: true
    });
    
    if (tokenResp.getResponseCode() !== 200) {
      throw new Error("Failed to get OAuth token. Your Refresh Token may have expired. Response: " + tokenResp.getContentText());
    }

    var accessToken = JSON.parse(tokenResp.getContentText()).access_token;
    var authHeader  = { Authorization: 'Bearer ' + accessToken };
    Logger.log('OAuth access token successfully retrieved.');

    // ── 2. Read existing Video IDs and dates from the sheet ─────────────────────────
    var ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet       = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error("Could not find the sheet tab named '" + SHEET_NAME + "'.");
    }

    var data        = sheet.getDataRange().getValues(); // [[title, time, url, videoId], ...]
    var existingIds = {};
    var existingSheetDates = {}; // 'YYYY-MM-DD' => true
    for (var i = 1; i < data.length; i++) { // skip header row
      var row = data[i];
      var timeVal = row[1]; // column B = Scheduled Time
      var vid = row[3]; // column D = Video ID
      
      if (vid) {
        existingIds[String(vid).trim()] = true;
      }
      
      if (timeVal) {
        var dateObj = (timeVal instanceof Date) ? timeVal : new Date(timeVal);
        if (!isNaN(dateObj.getTime())) {
          var dateKey = dateObj.toISOString().substring(0, 10);
          existingSheetDates[dateKey] = true;
        }
      }
    }
    Logger.log('Read ' + (data.length - 1) + ' rows from the sheet. Found ' + Object.keys(existingSheetDates).length + ' unique scheduled dates.');

    // ── 3. Build the list of 8 target Sundays ────────────────────────────
    var now = new Date();
    var day = now.getDay(); // 0=Sun … 6=Sat
    var daysToNextSunday = (day === 0) ? 7 : 7 - day;
    var targets = [];
    for (var w = 0; w < BUFFER_WEEKS; w++) {
      var sunday = new Date(now);
      sunday.setDate(now.getDate() + daysToNextSunday + (w * 7));
      sunday.setHours(10, 0, 0, 0); // 10:00 AM local
      targets.push(sunday);
    }
    Logger.log('Target Sundays calculated: ' + targets.map(function(d) { return d.toDateString(); }).join(', '));

    // ── 4. Read scheduled times from YouTube to catch streams not ───
    // yet written to the sheet (belt-and-suspenders dedup) ───────────
    var ytResp = UrlFetchApp.fetch(
      'https://www.googleapis.com/youtube/v3/liveBroadcasts' +
      '?part=snippet,status&broadcastStatus=upcoming&broadcastType=all&maxResults=50',
      { headers: authHeader, muteHttpExceptions: true }
    );
    if (ytResp.getResponseCode() !== 200) {
      throw new Error("Failed to fetch upcoming broadcasts from YouTube. Response: " + ytResp.getContentText());
    }

    var ytData = JSON.parse(ytResp.getContentText());
    var existingYtTimes = {}; // ISO date string (date only) => true
    if (ytData.items) {
      ytData.items.forEach(function(item) {
        var start = item.snippet && item.snippet.scheduledStartTime;
        if (start) {
          var dateKey = start.substring(0, 10); // 'YYYY-MM-DD'
          existingYtTimes[dateKey] = true;
        }
      });
    }
    Logger.log('Retrieved ' + (ytData.items ? ytData.items.length : 0) + ' upcoming streams from YouTube API.');

    // ── 5. Loop over targets — create only missing ones ───────────────────
    var description =
      'Connect with us: https://www.citylightbible.org/connect\n' +
      'Give to us: https://citylightbible.churchcenter.com/giving\n' +
      'Watch past sermons: https://www.citylightbible.org/sermons';

    var createdCount = 0;

    targets.forEach(function(sunday) {
      var dateKey = sunday.toISOString().substring(0, 10);
      var formattedDate = Utilities.formatDate(sunday, Session.getScriptTimeZone(), 'M/d/yyyy h:mm:ss a');
      
      // De-duplicate check against BOTH YouTube API and Sheet dates
      if (existingYtTimes[dateKey] || existingSheetDates[dateKey]) {
        Logger.log('Already exists for ' + dateKey + ' (YouTube: ' + !!existingYtTimes[dateKey] + ', Sheet: ' + !!existingSheetDates[dateKey] + ') — skipping');
        return;
      }

      var m = sunday.getMonth() + 1;
      var d = sunday.getDate();
      var yy = String(sunday.getFullYear()).slice(-2);
      var title = m + '/' + d + '/' + yy + ' Sunday Service at City Light Bible Church';
      var scheduledStart = sunday.toISOString();

      Logger.log('Creating stream for date ' + dateKey + ': "' + title + '"');

      // 5a. Create liveBroadcast
      var broadcastBody = {
        snippet: { title: title, description: description, scheduledStartTime: scheduledStart },
        status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false },
        contentDetails: {
          enableAutoStart: false, enableAutoStop: false,
          enableDvr: true, recordFromStart: true,
          enableLiveChatReplay: false,
          enableChat: false, enableSuperChat: false, enableSuperSticker: false
        }
      };
      var broadcastResp = UrlFetchApp.fetch(
        'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails',
        { method: 'post', contentType: 'application/json',
          headers: authHeader, payload: JSON.stringify(broadcastBody),
          muteHttpExceptions: true }
      );
      
      var broadcast = JSON.parse(broadcastResp.getContentText());
      if (!broadcast.id) {
        throw new Error('ERROR creating broadcast for ' + dateKey + ':\n' + broadcastResp.getContentText());
      }
      Logger.log('Broadcast created for ' + dateKey + ': ' + broadcast.id);

      // 5b. Create liveStream (encoder binding)
      var streamBody = {
        snippet: { title: title },
        cdn: { frameRate: '30fps', ingestionType: 'rtmp', resolution: '1080p' }
      };
      var streamResp = UrlFetchApp.fetch(
        'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn',
        { method: 'post', contentType: 'application/json',
          headers: authHeader, payload: JSON.stringify(streamBody),
          muteHttpExceptions: true }
      );
      var stream = JSON.parse(streamResp.getContentText());
      if (!stream.id) {
        throw new Error('ERROR creating stream for ' + dateKey + ':\n' + streamResp.getContentText());
      }
      Logger.log('Stream created for ' + dateKey + ': ' + stream.id);

      // 5c. Bind broadcast to stream
      var bindResp = UrlFetchApp.fetch(
        'https://www.googleapis.com/youtube/v3/liveBroadcasts/bind' +
        '?id=' + broadcast.id + '&streamId=' + stream.id + '&part=id,contentDetails',
        { method: 'post', headers: authHeader, muteHttpExceptions: true }
      );
      if (bindResp.getResponseCode() !== 200) {
        throw new Error('ERROR binding stream ' + dateKey + ':\n' + bindResp.getContentText());
      }
      Logger.log('Bound broadcast and stream for ' + dateKey);

      // 5d. Set category (29 = Nonprofits & Activism)
      var catResp = UrlFetchApp.fetch(
        'https://www.googleapis.com/youtube/v3/videos?part=snippet',
        { method: 'put', contentType: 'application/json', headers: authHeader,
          payload: JSON.stringify({
            id: broadcast.id,
            snippet: { title: title, description: description, categoryId: '29' }
          }),
          muteHttpExceptions: true }
      );
      if (catResp.getResponseCode() !== 200) {
        throw new Error('ERROR setting category for ' + dateKey + ':\n' + catResp.getContentText());
      }
      Logger.log('Set category to Nonprofits & Activism (29) for ' + dateKey);

      // 5e. Append to sheet (only if not already in sheet by Video ID)
      if (!existingIds[broadcast.id]) {
        var videoUrl = 'https://www.youtube.com/watch?v=' + broadcast.id;
        sheet.appendRow([title, formattedDate, videoUrl, broadcast.id]);
        Logger.log('Appended to sheet: ' + videoUrl + ' with date ' + formattedDate);
      }
      
      createdCount++;
    });

    Logger.log('ensureEightWeekBuffer complete. Created ' + createdCount + ' new streams.');
    
  } catch (err) {
    var ownerEmail = 'tech@citylightbible.org';
    
    var warningMessage = 
      "❌ URGENT: YouTube Livestream Automation Failed ❌\n\n" +
      "The script encountered an error while trying to create the upcoming 8-week buffer of streams.\n\n" +
      "DETAILS:\n" + err.message + "\n\n" +
      "HOW TO FIX THIS:\n" +
      "1. Go to the Script Editor: https://script.google.com\n" +
      "2. Open the 'Youtube Links' project and check the Execution Log to see the full context.\n" +
      "3. IF 'Refresh Token Expired' or '401 Unauthorized' is mentioned:\n" +
      "   ➔ You must generate a new OAuth Refresh Token. See Section 4 of the 'Operations & Troubleshooting Runbook'.\n" +
      "4. IF it's a spreadsheet error:\n" +
      "   ➔ Make sure the Livestream Links sheet hasn't been renamed or deleted.\n" +
      "5. IF it's a YouTube quota or upload limit error:\n" +
      "   ➔ If your channel is relatively new or unverified, YouTube may limit you to 1 new livestream creation per day. " +
      "The script will run weekly and naturally build up to the 8-week buffer over time. Alternatively, you can run it manually once per day, or verify your channel to lift this limit.\n\n" +
      "Once fixed, you can manually run 'ensureEightWeekBuffer' from the script editor to verify.";
      
    Logger.log("===============================");
    Logger.log(warningMessage);
    Logger.log("===============================");
    
    MailApp.sendEmail(ownerEmail, "🚨 YouTube Automation Failed", warningMessage);
    throw err;
  }
}
```

> [!WARNING]
> Do not change `SPREADSHEET_ID` or `SHEET_NAME`. They are hardcoded to match the existing system. Do not rename the function — the trigger in Step 5 references it by name.

### Step 3 — Save the Script
1. Press `Ctrl+S` / `Cmd+S` (or click the floppy disk icon).
2. Confirm no red error indicators appear in the gutter.

### Step 4 — Run a Manual Test
1. In the function selector dropdown at the top of the editor, choose `ensureEightWeekBuffer`.
2. Click **Run**.
3. On first run an OAuth consent screen may appear — select `tech@citylightbible.org` and grant access.
4. Open **View > Execution Log** and confirm output similar to:
   - `Broadcast created for 2026-06-21: <videoId>`
   - `Appended to sheet: https://www.youtube.com/watch?v=...`
   - *(repeated for each of the 8 Sundays not yet covered)*
   - `ensureEightWeekBuffer complete.`
5. Run it a second time immediately — the log should show "Already exists on YouTube" for all 8 dates and create nothing new.
6. Open the Google Sheet (Livestream Links tab) and verify up to 8 new rows were added.
7. Open YouTube Studio and verify the streams appear with correct title, description, category, and Unlisted visibility.

> [!TIP]
> The first run may create all 8 streams at once if starting from scratch. This is expected. Subsequent weekly runs will create only 1 new stream (the one that is now 8 weeks out).

### Step 5 — Create the Weekly Trigger
1. In the Apps Script left sidebar, click the clock icon (**Triggers**).
2. Click **+ Add Trigger** (bottom right).
3. Configure as follows:

| Setting | Value |
|---|---|
| **Function to run** | `ensureEightWeekBuffer` |
| **Deployment to run** | `Head` |
| **Event source** | `Time-driven` |
| **Type of time-based trigger** | `Week timer` |
| **Day of week** | `Sunday` |
| **Time of day** | `6am to 7am` |

4. Click **Save**.
5. Confirm the trigger appears in the list, owned by `tech@citylightbible.org`.

> [!NOTE]
> Every Sunday at 6–7 AM, the function runs and creates any stream that is missing from the 8-week window. In steady state this means one new stream is created each week (for the Sunday that just entered the 8-week window).

> [!WARNING]
> If the trigger was created under a different account, delete it and recreate it as `tech@citylightbible.org`. A trigger owned by the wrong account will fail silently if that account loses access.

### Step 6 — Remove the Old Single-Stream Trigger (if present)
If an earlier version of `createWeeklyLivestream()` exists with its own trigger, that trigger should be deleted to avoid overlap:
1. In Apps Script → Triggers, find any trigger pointing to `createWeeklyLivestream`.
2. Click the three-dot menu → **Delete**.
3. The old function code can remain in the file — it will not run without a trigger.

---

# 5. Stream Settings Applied

Every stream created by `ensureEightWeekBuffer()` uses these values:

| Setting | Value Applied |
|---|---|
| **Title format** | `M/D/YY Sunday Service at City Light Bible Church` |
| **Description** | `Connect with us: https://www.citylightbible.org/connect Give to us: https://citylightbible.churchcenter.com/giving Watch past sermons: https://www.citylightbible.org/sermons` |
| **Category** | `Nonprofits & Activism (categoryId: 29)` |
| **Made for kids** | `No (selfDeclaredMadeForKids: false)` |
| **Live chat** | `Disabled (enableChat: false)` |
| **Super Chat / Super Sticker** | `Disabled` |
| **Live chat replay** | `Disabled (enableLiveChatReplay: false)` |
| **Privacy / Visibility** | `Unlisted` |
| **Scheduled time** | `10:00 AM local on the target Sunday` |
| **Frame rate / Resolution** | `30fps / 1080p (RTMP ingest)` |
| **Buffer size** | `8 Sundays ahead from the current date` |

---

# 6. Verification Checklist

After the trigger runs for the first time (automatically or via manual test):

| Check | Expected Result |
|---|---|
| **Buffer depth** | YouTube Studio shows 8 upcoming unlisted Sunday streams, all at 10:00 AM |
| **Sheet rows** | Livestream Links tab has a row for each of the 8 streams: `Title | Scheduled Time | Video URL | Video ID` |
| **No duplicates** | Running the function a second time immediately creates nothing new — all 8 log lines show "Already exists on YouTube" |
| **Execution Log** | No ERROR lines present; final line reads `ensureEightWeekBuffer complete.` |
| **Trigger ownership** | Trigger shown as owned by `tech@citylightbible.org` |
| **Steady-state behavior** | The following Sunday, the trigger fires and creates exactly 1 new stream (for the Sunday now entering the 8-week window) |

---

# 7. Troubleshooting

### Function creates 0 streams even though none should exist
The YouTube API dedup check may be matching dates incorrectly due to timezone offset. The `toISOString()` method returns UTC, so a 10:00 AM Pacific stream appears as 17:00 or 18:00 UTC on the same calendar date — this is fine. But if the script timezone is set to UTC, the Sunday date may roll forward by one day. Fix:
- Go to **Apps Script → Project Settings** (gear icon)
- Confirm **Time zone** is set to `America/Los_Angeles`
- Save and re-run

### Error: 401 Unauthorized on any API call
The refresh token is invalid or expired. Follow the "Generate a new refresh token" procedure in Section 4 of the main Operations & Troubleshooting Runbook.

### Error: Broadcast created but category is not set
The `Videos.update` call patches the broadcast after creation. If the category does not appear in YouTube Studio, the update call may have fired before the broadcast was fully indexed. Add `Utilities.sleep(3000)` immediately before the `videos.update` fetch call in the function.

### Duplicate streams appearing in YouTube Studio
This should not happen due to the two-layer dedup. If it does:
- Check whether a second trigger is still running `createWeeklyLivestream()` from a prior version.
- Delete any redundant trigger (Section 4, Step 6 above).
- Manually delete the duplicate streams in YouTube Studio.

### Sheet has rows but YouTube check still creates streams
The YouTube API check (`existingYtTimes`) is the authoritative dedup gate. If the sheet has rows but YouTube does not have the corresponding broadcasts (e.g., they were deleted in Studio), the function will re-create them. This is correct behavior — the sheet is a log, not the source of truth.

### First run created fewer than 8 streams
If some Sundays already had streams on YouTube (created manually or by an older script), those were skipped. Check YouTube Studio — the total across existing + newly created should equal 8.

---

# 8. Maintenance

### Changing the Buffer Size
To change from 8 weeks to a different number, edit the `BUFFER_WEEKS` constant at the top of the function:
```javascript
var BUFFER_WEEKS = 8; // change this value
```
No trigger changes are needed.

### Changing Title, Description, or Stream Settings
Edit the relevant variables directly in `ensureEightWeekBuffer()` in Apps Script. Changes take effect on the next trigger run. Already-created streams are not retroactively updated.

### Annual Checks
- Verify the trigger is active and owned by `tech@citylightbible.org` in **Apps Script → Triggers**
- Confirm the GCP OAuth consent screen is still **External** and **In Production** (not Testing)
- Spot-check YouTube Studio to confirm 8 upcoming Sunday streams exist at all times

### If Credentials Change
This function reads `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, and `YT_REFRESH_TOKEN` from Script Properties at runtime. If those are regenerated per Section 4 of the main runbook, no changes to this function are needed.

---

# 9. Quick Reference

| Resource | URL / Notes |
|---|---|
| **Apps Script Project** | `script.google.com` → sign in as `tech@citylightbible.org` → **Youtube Links** |
| **Google Sheet** | `docs.google.com/spreadsheets/d/1z2rRPxpydv9HMc8WqJ8ciyEf-P6KtRdCFxm8iyPdpb8` |
| **YouTube Studio Live Streams** | `studio.youtube.com/channel/UCBJ-DjAtIcy1n6O2gBf5Seg/livestreaming` |
| **Function name** | `ensureEightWeekBuffer` |
| **Trigger schedule** | Weekly, Sunday, 6–7 AM, owned by `tech@citylightbible.org` |
| **Buffer constant** | `BUFFER_WEEKS = 8` (top of function) |
| **OAuth Troubleshooting** | Section 4 of the main Operations & Troubleshooting Runbook |

---
*City Light Bible Church | YouTube Livestream Automation | 8-Week Buffer Build Guide | June 2026*

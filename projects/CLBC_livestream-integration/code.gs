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

function fetchUnlistedUpcomingStreams() {
  var spreadsheetId = '1z2rRPxpydv9HMc8WqJ8ciyEf-P6KtRdCFxm8iyPdpb8';
  var sheetName = 'Livestream Links';
  var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  var headers = ['Title', 'Scheduled Time', 'URL', 'Video ID'];

  try {
    if (!sheet) {
      throw new Error("Sheet '" + sheetName + "' was not found.");
    }

    ensureHeaderRow_(sheet, headers);

    var response = YouTube.LiveBroadcasts.list('id,snippet,status', {
      broadcastStatus: 'upcoming',
      broadcastType: 'all',
      maxResults: 50
    });

    if (!response.items || response.items.length === 0) {
      Logger.log('No upcoming broadcasts found. Check that the script is authorized for the Church Brand Account.');
      return;
    }

    var existingIds = getExistingVideoIds_(sheet);
    var rowsToAppend = [];

    response.items.forEach(function(item) {
      var status = item.status.lifeCycleStatus;
      
      var isNotStarted = (
        status === 'created' ||
        status === 'ready' ||
        status === 'testing'
      );

      if (isNotStarted) {
        var videoId = item.id;
        if (existingIds.indexOf(videoId) === -1) {
          var title = item.snippet.title;
          var url = 'https://www.youtube.com/watch?v=' + videoId;
          var scheduledTime = item.snippet.scheduledStartTime;
          
          rowsToAppend.push([
            title, 
            scheduledTime ? formatScheduledTime_(scheduledTime) : 'Not Scheduled',
            url, 
            videoId
          ]);
          Logger.log('Added ' + status + ' stream: ' + title);
        }
      }
    });

    if (rowsToAppend.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length)
        .setValues(rowsToAppend);
    } else {
      Logger.log('No new upcoming streams to add.');
    }

  } catch (e) {
    Logger.log('Error: ' + (e && e.stack ? e.stack : e.message));
    throw e;
  }
}

function ensureHeaderRow_(sheet, headers) {
  var existing = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
    : [];

  var needsHeader = existing.join('').trim() === '';
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getExistingVideoIds_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  return sheet
    .getRange(2, 4, lastRow - 1, 1)
    .getValues()
    .map(function(row) { return String(row[0] || '').trim(); })
    .filter(function(videoId) { return videoId !== ''; });
}

function formatScheduledTime_(scheduledTime) {
  return Utilities.formatDate(
    new Date(scheduledTime),
    Session.getScriptTimeZone(),
    'M/d/yyyy h:mm:ss a'
  );
}

function revokeAuth() {
  ScriptApp.invalidateAuth();
  Logger.log('Auth revoked. Run the main function now to re-authenticate.');
}

function debugProps() {
  var props = PropertiesService.getScriptProperties().getProperties();
  Logger.log(JSON.stringify(props));
}
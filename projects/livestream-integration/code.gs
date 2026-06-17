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

    // Ask YouTube for upcoming broadcasts directly. The Live Streaming API
    // exposes "upcoming" as a list filter; item.status.lifeCycleStatus uses
    // values like "created", "ready", and "testing".
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
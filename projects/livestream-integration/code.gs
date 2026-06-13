function fetchUnlistedUpcomingStreams() {
  var spreadsheetId = '1z2rRPxpydv9HMc8WqJ8ciyEf-P6KtRdCFxm8iyPdpb8';
  var sheetName = 'Livestream Links';
  var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);

  try {
    // We fetch ALL broadcasts with broadcastType: 'all' to ensure 
    // we see unlisted, scheduled, and persistent streams.
    var response = YouTube.LiveBroadcasts.list('snippet,status', {
      mine: true,
      broadcastType: 'all',
      maxResults: 50
    });

    if (!response.items || response.items.length === 0) {
      Logger.log('No broadcasts found. Check if you selected the Church Brand Account.');
      return;
    }

    var existingIds = sheet.getLastRow() > 1 ? 
        sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getValues().flat() : [];

    response.items.forEach(function(item) {
      var status = item.status.lifeCycleStatus;
      
      // BROADENED FILTER: Catch 'upcoming', 'ready', and 'created'
      var isNotStarted = (status === 'upcoming' || status === 'ready' || status === 'created');

      if (isNotStarted) {
        var videoId = item.id;
        if (existingIds.indexOf(videoId) === -1) {
          var title = item.snippet.title;
          var url = 'https://www.youtube.com/watch?v=' + videoId;
          
          // Use item.snippet.scheduledStartTime (not item.snippet.snippet)
          var scheduledTime = item.snippet.scheduledStartTime;
          
          sheet.appendRow([
            title, 
            scheduledTime ? new Date(scheduledTime).toLocaleString() : 'Not Scheduled', 
            url, 
            videoId
          ]);
          Logger.log('Added ' + status + ' stream: ' + title);
        }
      }
    });

  } catch (e) {
    Logger.log('Error: ' + e.message);
  }
}
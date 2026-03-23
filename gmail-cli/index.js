const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to proceed with settings.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
  const gmail = google.gmail({version: 'v1', auth});
  const res = await gmail.users.labels.list({
    userId: 'me',
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log('No labels found.');
    return;
  }
  console.log('Labels:');
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });
}

/**
 * Search for messages based on a query.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} query The search query string.
 */
async function searchMessages(auth, query) {
  const gmail = google.gmail({version: 'v1', auth});
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10,
  });
  const messages = res.data.messages;
  if (!messages || messages.length === 0) {
    console.log('No messages found matching that query.');
    return;
  }
  console.log('Search Results:');
  for (const message of messages) {
    const msgRes = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
    });
    const headers = msgRes.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
    const from = headers.find(h => h.name === 'From')?.value || '(No From)';
    console.log(`[${message.id}] ${from} - ${subject}`);
  }
}

/**
 * Read a specific message by ID.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} id The message ID.
 */
async function readMessage(auth, id) {
  const gmail = google.gmail({version: 'v1', auth});
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: id,
  });
  console.log(JSON.stringify(res.data, null, 2));
}

const args = process.argv.slice(2);
const command = args[0];
const param = args.slice(1).join(' ');

authorize().then(async (auth) => {
  switch (command) {
    case 'labels':
      await listLabels(auth);
      break;
    case 'search':
      await searchMessages(auth, param);
      break;
    case 'read':
      await readMessage(auth, param);
      break;
    default:
      console.log('Usage: node index.js [labels|search <query>|read <id>]');
  }
}).catch(console.error);

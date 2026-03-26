const { execFile } = require('child_process');

const DEFAULT_GMAIL_TAB_HINT = 'mail.google.com';
const DEFAULT_TIMEOUT_MS = 15000;
const TAX_QUERY = [
  'after:2024/12/31',
  '(',
  '"tax"',
  'OR',
  '"taxes"',
  'OR',
  '"accountant"',
  'OR',
  '"IRS"',
  'OR',
  '"W-2"',
  'OR',
  '"1099"',
  'OR',
  '"1098"',
  'OR',
  '"K-1"',
  'OR',
  '"brokerage"',
  'OR',
  '"investment"',
  'OR',
  '"dividend"',
  'OR',
  '"interest income"',
  'OR',
  '"mortgage interest"',
  'OR',
  '"property tax"',
  'OR',
  '"charitable donation"',
  'OR',
  '"donation receipt"',
  'OR',
  '"health insurance"',
  'OR',
  '"1095-A"',
  'OR',
  '"1095-B"',
  'OR',
  '"1095-C"',
  'OR',
  '"tuition"',
  'OR',
  '"529"',
  'OR',
  '"HSA"',
  'OR',
  '"medical expense"',
  ')',
].join(' ');

function parseArgs(argv) {
  const options = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const next = argv[i + 1];
    const value = inlineValue !== undefined
      ? inlineValue
      : next && !next.startsWith('--')
        ? (i += 1, next)
        : true;

    options[key] = value;
  }

  return { options, positionals };
}

function execFileAsync(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { maxBuffer: 1024 * 1024 * 20, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function jsonForAppleScript(value) {
  return JSON.stringify(String(value));
}

function jsForAppleScript(value) {
  return JSON.stringify(String(value)).slice(1, -1).replace(/"/g, '\\"');
}

function buildSearchExpression(query, limit) {
  return `
(() => {
  const done = (payload) => JSON.stringify(payload);
  const query = ${JSON.stringify(query)};
  const limit = ${Number(limit)};

  function waitForRows(deadline) {
    const rows = Array.from(document.querySelectorAll('tr[role="row"]'))
      .filter((row) => row.querySelector('.bog, [data-thread-id]'));
    if (rows.length > 0) {
      return rows;
    }
    if (Date.now() > deadline) {
      return [];
    }
    return null;
  }

  function extractRow(row) {
    const fromNode =
      row.querySelector('span[email]') ||
      row.querySelector('.yP') ||
      row.querySelector('.yW span');
    const subjectNode =
      row.querySelector('.bog') ||
      row.querySelector('[role="link"] .bog');
    const snippetNode =
      row.querySelector('.y2') ||
      row.querySelector('.y6 span');
    const dateNode =
      row.querySelector('td.xW span') ||
      row.querySelector('span[title][data-time]');

    const linkNode =
      row.querySelector('a[href*="#inbox/"], a[href*="#all/"], a[href*="#search/"]');

    return {
      from: fromNode ? (fromNode.getAttribute('email') || fromNode.getAttribute('name') || fromNode.textContent || '').trim() : '',
      subject: subjectNode ? (subjectNode.textContent || '').trim() : '',
      snippet: snippetNode ? (snippetNode.textContent || '').trim() : '',
      date: dateNode ? (dateNode.getAttribute('title') || dateNode.textContent || '').trim() : '',
      href: linkNode ? linkNode.href : '',
      threadId: row.getAttribute('data-legacy-thread-id') || row.dataset.threadId || '',
    };
  }

  function readRowsWithRetry(resolve, deadline) {
    const rows = waitForRows(deadline);
    if (rows === null) {
      window.setTimeout(() => readRowsWithRetry(resolve, deadline), 250);
      return;
    }
    resolve(done({
      query,
      url: window.location.href,
      title: document.title,
      results: rows.slice(0, limit).map(extractRow),
    }));
  }

  const encoded = encodeURIComponent(query);
  if (!window.location.hash.includes('#search/')) {
    window.location.hash = '#search/' + encoded;
  } else if (!window.location.hash.endsWith(encoded)) {
    window.location.hash = '#search/' + encoded;
  }

  return new Promise((resolve) => {
    const searchBox = document.querySelector('input[aria-label="Search mail"], input[placeholder*="Search"]');
    if (searchBox) {
      searchBox.focus();
      searchBox.value = query;
      searchBox.dispatchEvent(new Event('input', { bubbles: true }));
      searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true }));
      searchBox.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true }));
    }

    const deadline = Date.now() + ${DEFAULT_TIMEOUT_MS};
    window.setTimeout(() => readRowsWithRetry(resolve, deadline), 700);
  });
})()
`.trim();
}

function buildReadExpression(threadIdHint) {
  return `
(() => {
  const done = (payload) => JSON.stringify(payload);
  const hint = ${threadIdHint ? JSON.stringify(threadIdHint) : '""'};

  function normalize(text) {
    return (text || '').replace(/\\s+/g, ' ').trim();
  }

  function collectMessageBodies() {
    return Array.from(document.querySelectorAll('.a3s'))
      .map((node) => normalize(node.innerText))
      .filter(Boolean);
  }

  function collectMetadata() {
    const subjectNode = document.querySelector('h2.hP, h2[data-thread-perm-id]');
    const chips = Array.from(document.querySelectorAll('span[email], .gD'))
      .map((node) => ({
        name: normalize(node.textContent),
        email: node.getAttribute('email') || '',
      }))
      .filter((entry) => entry.name || entry.email);

    return {
      subject: subjectNode ? normalize(subjectNode.textContent) : '',
      participants: chips,
    };
  }

  function openTargetThread() {
    if (!hint) {
      return true;
    }

    const row = Array.from(document.querySelectorAll('tr[role="row"]')).find((candidate) => {
      return candidate.getAttribute('data-legacy-thread-id') === hint || candidate.dataset.threadId === hint;
    });

    if (!row) {
      return false;
    }

    row.click();
    return true;
  }

  return new Promise((resolve) => {
    const opened = openTargetThread();
    const deadline = Date.now() + ${DEFAULT_TIMEOUT_MS};

    function poll() {
      const bodies = collectMessageBodies();
      const metadata = collectMetadata();
      if ((metadata.subject || bodies.length > 0) || Date.now() > deadline) {
        resolve(done({
          opened,
          url: window.location.href,
          title: document.title,
          ...metadata,
          bodies,
        }));
        return;
      }
      window.setTimeout(poll, 250);
    }

    window.setTimeout(poll, 600);
  });
})()
`.trim();
}

async function runAppleScript(scriptLines) {
  const args = scriptLines.flatMap((line) => ['-e', line]);
  const { stdout } = await execFileAsync('osascript', args);
  return stdout.trim();
}

async function findChromeGmailTab() {
  const script = [
    'tell application "Google Chrome"',
    'repeat with w in windows',
    'repeat with t in tabs of w',
    `if (URL of t) contains ${jsonForAppleScript(DEFAULT_GMAIL_TAB_HINT)} then`,
    'return {index of w, index of t, URL of t}',
    'end if',
    'end repeat',
    'end repeat',
    'return ""',
    'end tell',
  ];

  const output = await runAppleScript(script);
  if (!output) {
    return null;
  }

  const parts = output.split(/,\s*/);
  if (parts.length < 3) {
    return null;
  }

  return {
    windowIndex: Number(parts[0]),
    tabIndex: Number(parts[1]),
    url: parts.slice(2).join(', '),
  };
}

async function executeInGmailTab(expression) {
  const location = await findChromeGmailTab();
  if (!location) {
    throw new Error('No Gmail tab found in Google Chrome. Open Gmail in Chrome first.');
  }

  const script = [
    'tell application "Google Chrome"',
    `set jsResult to execute (tab ${location.tabIndex} of window ${location.windowIndex}) javascript "${jsForAppleScript(expression)}"`,
    'return jsResult',
    'end tell',
  ];

  const raw = await runAppleScript(script);
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function runStatus() {
  try {
    const location = await findChromeGmailTab();
    if (!location) {
      console.log(JSON.stringify({
        ok: false,
        message: 'Chrome is reachable, but no Gmail tab was found.',
      }, null, 2));
      return;
    }

    console.log(JSON.stringify({
      ok: true,
      message: 'Chrome scripting is available and a Gmail tab was found.',
      url: location.url,
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      ok: false,
      message: error.message,
      hint: 'Make sure Google Chrome is open and "Allow JavaScript from Apple Events" is enabled in Chrome View > Developer.',
    }, null, 2));
  }
}

async function runSearch(query, limit) {
  const payload = await executeInGmailTab(buildSearchExpression(query, limit));
  console.log(JSON.stringify(payload, null, 2));
}

async function runRead(threadIdHint) {
  const payload = await executeInGmailTab(buildReadExpression(threadIdHint));
  console.log(JSON.stringify(payload, null, 2));
}

function usage() {
  console.log([
    'Usage:',
    '  node index.js status',
    '  node index.js search "<gmail query>" [--limit 10]',
    '  node index.js tax-search [--limit 25]',
    '  node index.js read [threadId]',
    '',
    'Examples:',
    '  node index.js status',
    '  node index.js search \'from:irs after:2025/01/01\'',
    '  node index.js tax-search --limit 25',
  ].join('\n'));
}

async function main() {
  const { options, positionals } = parseArgs(process.argv.slice(2));
  const command = positionals[0];
  const rest = positionals.slice(1);
  const limit = Number(options.limit || 10);

  if (!command) {
    usage();
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case 'status':
      await runStatus();
      break;
    case 'search':
      if (rest.length === 0) {
        throw new Error('search requires a Gmail query string.');
      }
      await runSearch(rest.join(' '), limit);
      break;
    case 'tax-search':
      await runSearch(TAX_QUERY, limit);
      break;
    case 'read':
      await runRead(rest[0] || '');
      break;
    default:
      usage();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

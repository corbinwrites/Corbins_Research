import puppeteer from 'puppeteer-core';
import minimist from 'minimist';
import process from 'process';

const argv = minimist(process.argv.slice(2));
const action = argv.action;
const url = argv.url;
const selector = argv.selector;
const text = argv.text;
const output = argv.output;
const expression = argv.expression;
const targetUrl = argv.target;

async function run() {
  if (!action) {
    console.error('Error: --action argument is required.');
    process.exit(1);
  }

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null // Respect existing window size
    });
  } catch (err) {
    console.error('Error connecting to Chrome on port 9222. Is it running with --remote-debugging-port=9222?');
    console.error(err.message);
    process.exit(1);
  }

  // Helper to find the right page
  let page;
  const pages = await browser.pages();
  
  if (targetUrl) {
    page = pages.find(p => p.url().includes(targetUrl));
    if (!page) {
      console.error(`Error: No tab found matching URL part "${targetUrl}"`);
      await browser.disconnect();
      process.exit(1);
    }
  } else {
    // Default to the first visible page (often the active one)
    page = pages[0];
  }

  if (!page && action !== 'list_tabs') {
    // If no pages exist (rare), create one
    page = await browser.newPage();
  }

  try {
    let result = null;

    switch (action) {
      case 'navigate':
        if (!url) throw new Error('--url is required for navigate action');
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        result = { success: true, url: page.url(), title: await page.title() };
        break;

      case 'click':
        if (!selector) throw new Error('--selector is required for click action');
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        result = { success: true, message: `Clicked ${selector}` };
        break;

      case 'type':
        if (!selector || text === undefined) throw new Error('--selector and --text are required for type action');
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.type(selector, String(text));
        result = { success: true, message: `Typed "${text}" into ${selector}` };
        break;

      case 'read':
        // If selector is provided, read that. Otherwise read whole body text.
        if (selector) {
            await page.waitForSelector(selector, { timeout: 5000 });
            const content = await page.$eval(selector, el => el.innerText);
            result = { success: true, content };
        } else {
            const content = await page.evaluate(() => document.body.innerText);
            result = { success: true, content };
        }
        break;

      case 'screenshot':
        const path = output || 'screenshot.png';
        await page.screenshot({ path, fullPage: true });
        result = { success: true, path };
        break;
      
      case 'evaluate':
        if (!expression) throw new Error('--expression is required for evaluate action');
        // Evaluating string expression safely-ish
        const evalResult = await page.evaluate((expr) => {
            // This runs in the browser context
            return eval(expr);
        }, expression);
        result = { success: true, result: evalResult };
        break;

      case 'list_tabs':
        const tabs = await Promise.all(pages.map(async (p) => ({
          title: await p.title(),
          url: p.url()
        })));
        result = { success: true, tabs };
        break;
      
      case 'switch_tab':
         if (!targetUrl) throw new Error('--target (url part) is required for switch_tab action');
         await page.bringToFront();
         result = { success: true, message: `Switched to tab matching "${targetUrl}"` };
         break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  } finally {
    // Keep the browser open, just disconnect the CDP session
    await browser.disconnect();
  }
}

run();

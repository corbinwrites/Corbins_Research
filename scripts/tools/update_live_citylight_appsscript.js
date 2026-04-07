const fs = require("fs");
const path = require("path");
const { chromium } = require("../playwright-cli/node_modules/playwright");

async function waitForSaved(page) {
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return text.includes("Saved to Drive");
  }, null, { timeout: 30000 });
}

async function main() {
  const codePath = path.join(__dirname, "city_light_event_form", "Code.js");
  const code = fs.readFileSync(codePath, "utf8");

  const context = await chromium.launchPersistentContext("/tmp/citylight-playwright-profile", {
    channel: "chrome",
    headless: true,
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto("https://script.google.com/home/projects/1EbMx1D1MSucv9oSjP1eWRQ80bTl_URCtrehLFW517On10Vb0AtJ57U9J/edit", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(5000);

  await page.evaluate((nextCode) => {
    const models = window.monaco && window.monaco.editor && window.monaco.editor.getModels
      ? window.monaco.editor.getModels()
      : [];
    if (!models.length) {
      throw new Error("Monaco editor model was not found.");
    }
    models[0].setValue(nextCode);
  }, code);

  await page.keyboard.press("Meta+S");
  await waitForSaved(page);

  console.log("Live Apps Script code updated and saved.");
  await context.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

const { chromium } = require("../playwright-cli/node_modules/playwright");

async function main() {
  const userDataDir = "/tmp/citylight-playwright-profile";
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chrome",
    headless: false,
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto("https://script.google.com/home/projects/1EbMx1D1MSucv9oSjP1eWRQ80bTl_URCtrehLFW517On10Vb0AtJ57U9J/edit", {
    waitUntil: "domcontentloaded",
  });

  console.log("Playwright browser opened.");
  console.log("Sign into Google in that window if needed.");
  console.log("Leave this process running while the session stays open.");

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

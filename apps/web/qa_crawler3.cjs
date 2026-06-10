const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {};
  const record = (step, pass, msg) => {
    results[step] = pass ? "PASS" : `FAIL: ${msg}`;
    console.log(`[QA] ${step} -> ${results[step]}`);
  };

  try {
    // 1. Login
    await page.goto('https://wwassistant.bridgebox.ai');
    await page.fill('input[type="email"]', 'nedpearson@gmail.com');
    await page.fill('input[type="password"]', '1Pearson2');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector(':has-text("Start Route"), :has-text("Today"), :has-text("Dashboard")', { timeout: 10000 });
    record("1. Login", true, "");

    // 2. Dashboard - "Start Route" button
    const startRouteBtn = await page.locator(':has-text("Start Route")').first();
    if (await startRouteBtn.count() > 0) {
      record("2. Dashboard - Start Route Button", true, "Found");
      await startRouteBtn.click();
    } else {
      record("2. Dashboard - Start Route Button", false, "Not Found");
    }

    // Capture screenshot
    await page.screenshot({ path: 'dashboard3.png' });

  } catch (e) {
    console.log("Error:", e.message);
  } finally {
    fs.writeFileSync('qa_results.json', JSON.stringify(results, null, 2));
    await browser.close();
  }
})();

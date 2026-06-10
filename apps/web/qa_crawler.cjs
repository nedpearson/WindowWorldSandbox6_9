const { chromium } = require('playwright');

(async () => {
  console.log("Starting QA Crawler against https://wwassistant.bridgebox.ai...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}`));
  page.on('requestfailed', request => console.log(`[NETWORK ERROR] ${request.url()} - ${request.failure()?.errorText}`));
  
  let passFailMatrix = {};
  const record = (step, pass, msg) => {
    passFailMatrix[step] = pass ? "PASS" : `FAIL: ${msg}`;
    console.log(`Step: ${step} - ${pass ? "PASS" : "FAIL (" + msg + ")"}`);
  }

  try {
    // 1. login
    await page.goto('https://wwassistant.bridgebox.ai');
    await page.waitForLoadState('networkidle');
    record("1. Load Login", true);
    
    // Fill login
    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passInput = await page.locator('input[type="password"], input[name="password"]');
    
    if (await emailInput.count() > 0) {
      await emailInput.first().fill('nedpearson@gmail.com');
      await passInput.first().fill('1Pearson2');
      const submit = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
      await submit.first().click();
      await page.waitForLoadState('networkidle');
      // Check if we reached dashboard
      if (page.url().includes('dashboard') || page.url().includes('home') || await page.locator(':has-text("Dashboard"), :has-text("Today")').count() > 0) {
        record("1. Login", true);
      } else {
        record("1. Login", false, "Did not navigate to dashboard after login");
      }
    } else {
      record("1. Login", false, "Could not find email input");
    }

    // Capture screenshot of dashboard
    await page.screenshot({ path: 'dashboard.png' });

  } catch (e) {
    console.error("Crawler threw an exception: ", e);
  } finally {
    console.log("MATRIX:", JSON.stringify(passFailMatrix, null, 2));
    await browser.close();
  }
})();

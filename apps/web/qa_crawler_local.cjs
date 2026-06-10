const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let errors = [];
  page.on('pageerror', err => errors.push(`[JS ERROR] ${err.message}`));
  page.on('requestfailed', req => errors.push(`[NET FAIL] ${req.url()}`));
  page.on('response', res => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
      errors.push(`[API ERROR ${res.status()}] ${res.url()}`);
    }
  });

  const matrix = {};
  const record = (step, pass, msg) => {
    matrix[step] = pass ? "PASS" : `FAIL: ${msg}`;
    console.log(`[QA] ${step} -> ${matrix[step]}`);
  };

  try {
    // 1. Login
    await page.goto('http://localhost:5173');
    await page.fill('input[type="email"]', 'demo@windowworld.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    record("1. Login", errors.length === 0, errors.join(', '));
    errors = [];

    // 2. Dashboard - "Start Route" button
    const startRoute = await page.locator('button:has-text("Start Route")');
    if (await startRoute.count() > 0) {
      record("2. Dashboard - Start Route Button", true, "Found");
    } else {
      record("2. Dashboard - Start Route Button", false, "Button not found");
    }

    // 3. Customer List
    await page.goto('http://localhost:5173/customers');
    await page.waitForTimeout(3000);
    record("3. Customer List", errors.length === 0, errors.length > 0 ? errors.join(', ') : "OK");
    errors = [];

    // 4. Customer Detail
    // Find a customer with 'appt' text
    const customerCard = await page.locator('div', { hasText: 'appt' }).first();
    if (await customerCard.count() > 0) {
      await customerCard.click();
      await page.waitForTimeout(2000);
      record("4. Customer Detail", errors.length === 0, errors.length > 0 ? errors.join(', ') : "OK");
      errors = [];
    } else {
      record("4. Customer Detail", false, "No customers found");
    }

    // 5. Appointment Detail
    await page.goto('http://localhost:5173/appointments');
    await page.waitForTimeout(2000);
    // Find appointment card
    const appointmentCard = await page.locator('div.card', { hasText: 'openings' }).first();
    if (await appointmentCard.count() > 0) {
      await appointmentCard.click();
      await page.waitForTimeout(3000);
      
      const tabs = ["Customer", "The House", "Layout", "Windows", "Issues", "Fix", "Close"];
      let tabErrors = [];
      for (const tab of tabs) {
        const tabEl = await page.locator(`div:has-text("${tab}")`).last();
        if (await tabEl.count() > 0) {
          // Found it
        } else {
          tabErrors.push(`Tab ${tab} not found`);
        }
      }
      record("5. Appointment Detail - 7 Tabs", tabErrors.length === 0, tabErrors.join(' | '));
    } else {
      record("5. Appointment Detail", false, "No appointments found");
    }
    
    // 6. call/text/navigate buttons if present
    await page.goto('http://localhost:5173/customers');
    await page.waitForTimeout(1000);
    await page.locator('div', { hasText: 'appt' }).first().click();
    await page.waitForTimeout(1000);
    
    const callBtn = await page.locator(':has-text("Call")').first();
    if (await callBtn.count() > 0) {
      record("6. Call/Text/Navigate", true, "Found");
    } else {
      record("6. Call/Text/Navigate", false, "Buttons not found");
    }
    
  } catch (e) {
    console.log("Error:", e.message);
  } finally {
    fs.writeFileSync('qa_results_local2.json', JSON.stringify(matrix, null, 2));
    await browser.close();
  }
})();

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
    await page.goto('https://wwassistant.bridgebox.ai');
    await page.fill('input[type="email"]', 'nedpearson@gmail.com');
    await page.fill('input[type="password"]', '1Pearson2');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    record("1. Login", errors.length === 0, errors.join(', '));
    errors = [];

    // 2. Dashboard - "Start Route" button
    const startRoute = await page.locator('button:has-text("Start Route")');
    if (await startRoute.count() > 0) {
      await startRoute.first().click();
      await page.waitForTimeout(2000);
      record("2. Dashboard - Start Route Button", errors.length === 0, errors.length > 0 ? errors.join(', ') : "OK");
      errors = [];
    } else {
      record("2. Dashboard - Start Route Button", false, "Button not found");
    }

    // 3. Customer List
    await page.goto('https://wwassistant.bridgebox.ai/customers');
    await page.waitForTimeout(3000);
    record("3. Customer List", errors.length === 0, errors.length > 0 ? errors.join(', ') : "OK");
    errors = [];

    // 4. Customer Detail
    const customerRow = await page.locator('tr').nth(1);
    if (await customerRow.count() > 0) {
      await customerRow.click();
      await page.waitForTimeout(2000);
      record("4. Customer Detail", errors.length === 0, errors.length > 0 ? errors.join(', ') : "OK");
      errors = [];
    } else {
      record("4. Customer Detail", false, "No customers found");
    }

    // 5. Appointment Detail (check the 7 tab dock: Customer, The House, Layout, Windows, Issues, Fix, Close)
    await page.goto('https://wwassistant.bridgebox.ai/appointments');
    await page.waitForTimeout(2000);
    const appointmentRow = await page.locator('tr').nth(1);
    if (await appointmentRow.count() > 0) {
      await appointmentRow.click();
      await page.waitForTimeout(3000);
      
      const tabs = ["Customer", "The House", "Layout", "Windows", "Issues", "Fix", "Close"];
      let tabErrors = [];
      for (const tab of tabs) {
        const tabEl = await page.locator(`text="${tab}"`).first();
        if (await tabEl.count() > 0) {
          await tabEl.click();
          await page.waitForTimeout(1000);
          if (errors.length > 0) {
            tabErrors.push(`${tab} tab error: ${errors.join(', ')}`);
            errors = [];
          }
        } else {
          tabErrors.push(`Tab ${tab} not found`);
        }
      }
      record("5. Appointment Detail - 7 Tabs", tabErrors.length === 0, tabErrors.join(' | '));
    } else {
      record("5. Appointment Detail", false, "No appointments found");
    }
    
    // 6. call/text/navigate buttons if present
    const callBtn = await page.locator(':has-text("Call")').first();
    if (await callBtn.count() > 0) {
      await callBtn.click();
      record("6. Call/Text/Navigate", errors.length === 0, errors.length > 0 ? errors.join(', ') : "OK");
      errors = [];
    } else {
      record("6. Call/Text/Navigate", false, "Buttons not found");
    }

    // 7. sketch/measure ("Get House Outline")
    // ... we can continue adding these but let's just see what fails initially
    
  } catch (e) {
    console.log("Error:", e.message);
  } finally {
    fs.writeFileSync('qa_results.json', JSON.stringify(matrix, null, 2));
    await browser.close();
  }
})();

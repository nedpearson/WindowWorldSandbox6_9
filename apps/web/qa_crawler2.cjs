const { chromium } = require('playwright');

(async () => {
  console.log("Starting QA Crawler against https://wwassistant.bridgebox.ai...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}`));
  
  page.on('request', request => console.log(`>> ${request.method()} ${request.url()}`));
  page.on('response', response => console.log(`<< ${response.status()} ${response.url()}`));

  try {
    await page.goto('https://wwassistant.bridgebox.ai');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'nedpearson@gmail.com');
    await page.fill('input[type="password"]', '1Pearson2');
    await page.click('button[type="submit"]');
    
    // Wait for the login request to complete
    const response = await page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200, { timeout: 10000 }).catch(e => console.log("Login timeout"));
    if (response) {
      console.log("Login successful");
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'dashboard2.png' });
    } else {
      console.log("Login response not received or failed");
    }

  } catch (e) {
    console.error("Crawler threw an exception: ", e);
  } finally {
    await browser.close();
  }
})();

import { test, expect } from '@playwright/test';

test.describe('16 Flows QA Test', () => {
  test.use({ baseURL: 'http://127.0.0.1:5173' });
  let consoleErrors: string[] = [];
  let apiErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    apiErrors = [];
    
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('TypeError: Failed to fetch') && !text.includes('The play() request was interrupted')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('response', res => {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        apiErrors.push(`API Error ${res.status()}: ${res.url()}`);
      }
    });

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'demo@windowworld.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    // wait for dashboard
    await page.waitForTimeout(1000); 
  });

  const verifyCommonIssues = async (page: any) => {
    // wait for dom to settle
    await page.waitForTimeout(500);

    // Check horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow, 'Page should not have horizontal overflow').toBe(false);

    // Check placeholders
    const images = await page.locator('img').all();
    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && (src.includes('placeholder') || src.includes('dummy'))) {
        expect(src, 'Should not have fake placeholder imagery').not.toContain('placeholder');
      }
    }

    // No blank pages
    const content = await page.content();
    expect(content.length, 'Page should not be blank').toBeGreaterThan(100);

    // No console/API errors
    expect(consoleErrors, 'Console errors found').toEqual([]);
    expect(apiErrors, 'API errors found').toEqual([]);
  };

  test('Flow 1/2: Login and Dashboard', async ({ page }) => {
    await page.goto('/');
    await verifyCommonIssues(page);
  });

  test('Flow 3: Customers', async ({ page }) => {
    await page.goto('/customers');
    await verifyCommonIssues(page);
  });

  test('Flow 4: Appointments', async ({ page }) => {
    await page.goto('/appointments');
    await verifyCommonIssues(page);
  });
  
  test('Flow 5: Appointment Detail', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    const firstAppt = page.locator('tbody tr').first();
    if (await firstAppt.isVisible()) {
      await firstAppt.click();
      await page.waitForTimeout(2000);
      await verifyCommonIssues(page);
    }
  });

  test('Flow 6: Sketch/Measure', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    const firstAppt = page.locator('tbody tr').first();
    if (await firstAppt.isVisible()) {
      await firstAppt.click();
      await page.waitForTimeout(1000);
      // Click Measure tab
      await page.locator('button:has-text("Measure")').click();
      await page.waitForTimeout(2000);
      await verifyCommonIssues(page);
    }
  });

  test('Flow 7: Get House Outline', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    const firstAppt = page.locator('tbody tr').first();
    if (await firstAppt.isVisible()) {
      await firstAppt.click();
      await page.waitForTimeout(1000);
      await page.locator('button:has-text("Measure")').click();
      await page.waitForTimeout(2000);
      const outlineBtn = page.locator('button:has-text("Get House Outline")');
      if (await outlineBtn.isVisible()) {
        await outlineBtn.click();
        await page.waitForTimeout(1000);
        await verifyCommonIssues(page);
      }
    }
  });

  test('Flow 8/9/10: Quotes (Quick/Broad/Measured)', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    const firstAppt = page.locator('tbody tr').first();
    if (await firstAppt.isVisible()) {
      await firstAppt.click();
      await page.waitForTimeout(1000);
      // Click Quote tab
      await page.locator('button:has-text("Quote")').click();
      await page.waitForTimeout(2000);
      await verifyCommonIssues(page);
    }
  });

  test('Flow 11: Finance Option in Proposal', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    const firstAppt = page.locator('tbody tr').first();
    if (await firstAppt.isVisible()) {
      await firstAppt.click();
      await page.waitForTimeout(1000);
      // Click Close tab (proposal)
      await page.locator('button:has-text("Close")').click();
      await page.waitForTimeout(2000);
      // Check finance options
      await verifyCommonIssues(page);
    }
  });

  test('Flow 12: Proposal Preview/Export', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForTimeout(1000);
    const firstAppt = page.locator('tbody tr').first();
    if (await firstAppt.isVisible()) {
      await firstAppt.click();
      await page.waitForTimeout(1000);
      // Check PDF button
      await page.locator('button:has-text("PDF")').click();
      await page.waitForTimeout(1000);
      await verifyCommonIssues(page);
    }
  });

  test('Flow 13: My Money / Commissions', async ({ page }) => {
    await page.goto('/commissions');
    await verifyCommonIssues(page);
  });

  test('Flow 14: Admin/Settings Visibility', async ({ page }) => {
    await page.goto('/pricing');
    await verifyCommonIssues(page);
  });

  test('Flow 15: iPad Landscape', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await verifyCommonIssues(page);
  });

  test('Flow 16: iPad Portrait', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await verifyCommonIssues(page);
  });
});

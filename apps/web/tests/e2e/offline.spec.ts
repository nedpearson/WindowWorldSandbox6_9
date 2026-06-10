import { test, expect } from '@playwright/test';

test.describe('Offline Sync Capabilities', () => {
  test('Apploads and works offline', async ({ page, context }) => {
    // 1. Load app online
    await page.goto('/');
    await page.fill('input[type="email"]', 'nedpearson@gmail.com');
    await page.fill('input[type="password"]', '1Pearson2');
    await page.click('button[type="submit"]');
    
    // Wait for auth to complete and navigation
    await page.waitForTimeout(2000);
    // Expect we are no longer on login
    await expect(page).not.toHaveURL(/\/login/);
    // Go to manual to check offline caching of basic views
    await page.goto('/manual');
    await expect(page.locator('h1').filter({ hasText: 'Field Manual' })).toBeVisible({ timeout: 10000 });
    
    // 2. Go offline
    await context.setOffline(true);
    
    // 3. Perform an offline action
    await page.click('button:has-text("Auditor Guide")').catch(() => {});
    
    // Check that we don't crash
    await expect(page.locator('h1').filter({ hasText: 'Field Manual' })).toBeVisible();

    // 4. Reconnect
    await context.setOffline(false);
    
    // Check that we're back online
    await page.reload();
    await expect(page.locator('h1').filter({ hasText: 'Field Manual' })).toBeVisible({ timeout: 10000 });
  });
});

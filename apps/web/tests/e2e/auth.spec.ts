import { test, expect } from '@playwright/test';

test('has title and login loads', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Window World/);

  // Expect the login heading to be visible.
  await expect(page.locator('h1').filter({ hasText: 'Window World' })).toBeVisible();
});

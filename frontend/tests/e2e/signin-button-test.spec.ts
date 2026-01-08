import { test, expect } from '@playwright/test';

test('Sign In button and Follow toast', async ({ page }) => {
  await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
  await page.waitForSelector('.react-flow', { timeout: 15000 });

  // Check "Sign In" button exists (top right) instead of "Begin Journey"
  const signInBtn = page.locator('text=Sign In').first();
  await expect(signInBtn).toBeVisible({ timeout: 5000 });
  console.log('✓ "Sign In" button visible');

  // Make sure "Begin Journey" is NOT there
  const beginJourneyText = await page.locator('text=Begin Journey').count();
  expect(beginJourneyText).toBe(0);
  console.log('✓ "Begin Journey" removed');

  // Click Follow and check toast (no redirect)
  const followBtn = page.locator('button:has-text("Follow")').first();
  await followBtn.click();
  await page.waitForTimeout(500);

  // Toast should show
  const toast = page.locator('text=Sign in to follow');
  await expect(toast).toBeVisible({ timeout: 3000 });
  console.log('✓ Toast shows "Sign in to follow this quest"');

  // Wait and verify NO redirect happens
  await page.waitForTimeout(2000);
  expect(page.url()).toContain('/goals/');
  console.log('✓ No redirect - stayed on goal page');

  // Screenshot
  await page.screenshot({ path: 'tests/e2e/test-results/signin-button.png', fullPage: true });
});

import { test, expect } from '@playwright/test';

test.describe('Follow Button', () => {
  test('Shows "Follow" text instead of "Join Journey"', async ({ page }) => {
    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Check Follow button exists (not "Join Journey")
    const followBtn = page.locator('button:has-text("Follow")').first();
    await expect(followBtn).toBeVisible({ timeout: 5000 });

    // Make sure "Join Journey" is NOT there
    const joinJourneyBtn = page.locator('button:has-text("Join Journey")');
    const joinJourneyExists = await joinJourneyBtn.count();
    expect(joinJourneyExists).toBe(0);

    console.log('✓ Button shows "Follow" instead of "Join Journey"');
  });

  test('Shows login prompt when clicking Follow while not logged in', async ({ page }) => {
    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click Follow button
    const followBtn = page.locator('button:has-text("Follow")').first();
    await followBtn.click();

    // Wait for toast
    await page.waitForTimeout(500);

    // Check toast message appears
    const toast = page.locator('text=Sign in to follow');
    const toastVisible = await toast.isVisible().catch(() => false);
    console.log('Toast visible:', toastVisible);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/test-results/follow-login-prompt.png', fullPage: true });

    expect(toastVisible).toBe(true);
  });
});

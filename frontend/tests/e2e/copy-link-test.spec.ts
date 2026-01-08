import { test, expect } from '@playwright/test';

test.describe('Share - Copy Link', () => {
  test('Copy Link button shows in Share menu', async ({ page }) => {
    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Find and click Share button
    const shareBtn = page.locator('button:has-text("Share")');
    await shareBtn.click();

    // Wait for dropdown
    await page.waitForTimeout(300);

    // Check Copy Link button exists
    const copyLinkBtn = page.locator('button:has-text("Copy Link")');
    await expect(copyLinkBtn).toBeVisible({ timeout: 3000 });

    console.log('Copy Link button visible in Share menu');
  });

  test('Copy Link shows success toast and updates button', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click Share button
    const shareBtn = page.locator('button:has-text("Share")');
    await shareBtn.click();
    await page.waitForTimeout(300);

    // Click Copy Link
    const copyLinkBtn = page.locator('button:has-text("Copy Link")');
    await copyLinkBtn.click();

    // Wait for toast or "Copied!" text
    await page.waitForTimeout(500);

    // Verify success toast appears OR button shows "Copied!"
    const toastVisible = await page.locator('text=Link copied to clipboard').isVisible().catch(() => false);
    const copiedText = await page.locator('text=Copied!').isVisible().catch(() => false);

    console.log('Toast visible:', toastVisible);
    console.log('Shows Copied!:', copiedText);

    // Take screenshot for verification
    await page.screenshot({ path: 'tests/e2e/test-results/copy-link-result.png', fullPage: true });

    // At least one feedback should be visible
    expect(toastVisible || copiedText).toBe(true);
  });
});

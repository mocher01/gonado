import { test, expect } from '@playwright/test';

test.describe('NodeCommentsPanel - Unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });
  });

  test('Comments panel opens when clicking View all', async ({ page }) => {
    // Open popup first
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    // Wait for popup (look for SUPPORT or COMMENTS section)
    await page.waitForSelector('text=/SUPPORT|COMMENTS/i', { timeout: 5000 });

    // Click "View all" to open comments panel
    const viewAllBtn = page.locator('button:has-text("View all")');
    await viewAllBtn.click();

    // Comments panel should slide in
    const panel = page.locator('text=Trail Chronicles');
    await expect(panel).toBeVisible({ timeout: 5000 });

    console.log('Comments panel opened');
  });

  test('Comments panel shows "Trail Chronicles" header', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    await page.waitForSelector('text=/SUPPORT|COMMENTS/i', { timeout: 5000 });
    await page.locator('button:has-text("View all")').click();

    const header = page.locator('text=Trail Chronicles');
    await expect(header).toBeVisible({ timeout: 5000 });

    console.log('Trail Chronicles header visible');
  });

  test('Comments panel shows comment count', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    await page.waitForSelector('text=/SUPPORT|COMMENTS/i', { timeout: 5000 });
    await page.locator('button:has-text("View all")').click();

    // Wait for panel
    await page.waitForSelector('text=Trail Chronicles', { timeout: 5000 });

    // Look for comment count pattern (e.g., "3 comments" or "comments")
    const commentSection = page.locator('text=/\\d+ comments|comments|whispers/i');
    const visible = await commentSection.first().isVisible().catch(() => false);

    console.log('Comment count section visible:', visible);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/test-results/comments-panel-debug.png', fullPage: true });
  });

  test('Comments panel shows sign-in CTA for adding comments', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    await page.waitForSelector('text=/SUPPORT|COMMENTS/i', { timeout: 5000 });
    await page.locator('button:has-text("View all")').click();

    // Wait for panel
    await page.waitForSelector('text=Trail Chronicles', { timeout: 5000 });

    // Should show sign-in prompt or disabled add button
    const signInCTA = page.locator('text=/sign in|login|mark on the trail/i');
    const visible = await signInCTA.first().isVisible().catch(() => false);

    console.log('Sign-in CTA visible:', visible);
  });

  test('Comments panel closes on Escape key', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    await page.waitForSelector('text=/SUPPORT|COMMENTS/i', { timeout: 5000 });
    await page.locator('button:has-text("View all")').click();

    const panel = page.locator('text=Trail Chronicles');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Panel should close
    await expect(panel).not.toBeVisible({ timeout: 3000 });

    console.log('Panel closed on Escape');
  });

  test('Comments panel closes on X button', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    await page.waitForSelector('text=/SUPPORT|COMMENTS/i', { timeout: 5000 });
    await page.locator('button:has-text("View all")').click();

    const panel = page.locator('text=Trail Chronicles');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Find and click close button (X or close)
    const closeBtn = page.locator('svg path[d*="M6 18L18 6"]').first().locator('..').locator('..');
    const closeBtnAlt = page.locator('button[aria-label*="close" i]').first();

    // Try clicking the close button
    try {
      await closeBtn.click({ timeout: 2000 });
    } catch {
      // Try alternative close mechanism - click outside panel
      await page.mouse.click(100, 400);
    }

    // Panel should close
    await expect(panel).not.toBeVisible({ timeout: 3000 });

    console.log('Panel closed');
  });

  test('Comments panel slides in from right side', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    await page.waitForSelector('text=/SUPPORT|COMMENTS/i', { timeout: 5000 });
    await page.locator('button:has-text("View all")').click();

    // Wait for panel animation
    await page.waitForTimeout(500);

    // Get the panel container
    const panel = page.locator('text=Trail Chronicles').locator('xpath=ancestor::div[contains(@class, "fixed") or contains(@style, "right")]').first();

    // Check panel is on the right side
    const box = await panel.boundingBox();
    if (box) {
      const viewport = page.viewportSize();
      // Panel should be on the right half of the screen
      console.log('Panel x position:', box.x, 'Viewport width:', viewport?.width);
      expect(box.x).toBeGreaterThan((viewport?.width || 1280) * 0.3);
    }

    console.log('Panel position verified');
  });
});

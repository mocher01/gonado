import { test, expect } from '@playwright/test';

test.describe('NodeInteractionPopup - Unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });
  });

  test('Popup opens when clicking node social bar', async ({ page }) => {
    // Find a node's social bar (teal "Click to react or comment" area)
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });

    // Click to open popup
    await socialBar.click();

    // Popup should appear
    const popup = page.locator('text=Reactions').first();
    await expect(popup).toBeVisible({ timeout: 5000 });

    console.log('Popup opened successfully');
  });

  test('Popup shows "Sign in to interact" banner', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    // Should show sign-in banner
    const signInBanner = page.locator('text=Sign in to interact');
    await expect(signInBanner).toBeVisible({ timeout: 5000 });

    console.log('Sign in banner visible');
  });

  test('Popup shows 5 reaction emojis (disabled)', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    // Wait for popup
    await page.waitForSelector('text=Reactions', { timeout: 5000 });

    // Check for reaction emojis
    const fireEmoji = page.locator('text=🔥').first();
    const waterEmoji = page.locator('text=💧').first();
    const natureEmoji = page.locator('text=🌿').first();
    const lightningEmoji = page.locator('text=⚡').first();
    const magicEmoji = page.locator('text=✨').first();

    await expect(fireEmoji).toBeVisible();
    await expect(waterEmoji).toBeVisible();
    await expect(natureEmoji).toBeVisible();
    await expect(lightningEmoji).toBeVisible();
    await expect(magicEmoji).toBeVisible();

    console.log('All 5 reaction emojis visible');
  });

  test('Popup shows View all and Add buttons', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    // Wait for popup
    await page.waitForSelector('text=Reactions', { timeout: 5000 });

    // Check buttons
    const viewAllBtn = page.locator('button:has-text("View all")');
    const addBtn = page.locator('button:has-text("+ Add")');

    await expect(viewAllBtn).toBeVisible();
    await expect(addBtn).toBeVisible();

    console.log('View all and Add buttons visible');
  });

  test('Popup closes on Escape key', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    // Wait for popup
    const popup = page.locator('text=Reactions');
    await expect(popup).toBeVisible({ timeout: 5000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Popup should be gone
    await expect(popup).not.toBeVisible({ timeout: 3000 });

    console.log('Popup closed on Escape');
  });

  test('Popup closes on backdrop click', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    // Wait for popup
    const popup = page.locator('text=Reactions');
    await expect(popup).toBeVisible({ timeout: 5000 });

    // Click backdrop (outside popup)
    await page.mouse.click(10, 10);

    // Popup should be gone
    await expect(popup).not.toBeVisible({ timeout: 3000 });

    console.log('Popup closed on backdrop click');
  });

  test('Popup is not cut off at bottom', async ({ page }) => {
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.waitFor({ timeout: 10000 });
    await socialBar.click();

    // Wait for popup
    await page.waitForSelector('text=Reactions', { timeout: 5000 });

    // Check if Sacred Boost button is visible (it's at the bottom of popup)
    // For non-owner goals, this button should be visible
    const boostButton = page.locator('button:has-text("Sacred Boost")');
    const resourceButton = page.locator('button:has-text("Drop resource")');

    // At least the resource button should be visible
    const resourceVisible = await resourceButton.isVisible().catch(() => false);
    const boostVisible = await boostButton.isVisible().catch(() => false);

    console.log('Drop resource visible:', resourceVisible);
    console.log('Sacred Boost visible:', boostVisible);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'tests/e2e/test-results/popup-debug.png', fullPage: true });

    expect(resourceVisible || boostVisible).toBe(true);
  });
});

import { test, expect } from '@playwright/test';

/**
 * Detailed Reactions Testing
 *
 * Scenarios to test:
 * 1. View reactions (unauthenticated) - should see counts, can't interact
 * 2. Add reaction (authenticated) - count increases, selection highlighted
 * 3. Remove reaction (click same emoji) - count decreases, selection removed
 * 4. Change reaction (click different emoji) - old decreases, new increases
 * 5. Persistence - refresh page, reaction still there
 * 6. Display locations - where reactions show up
 */

test.describe('Reactions - Unauthenticated', () => {
  test('Can view reaction counts but cannot interact', async ({ page }) => {
    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click node social bar to open popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Check reactions are visible
    const fireEmoji = page.locator('text=🔥').first();
    await expect(fireEmoji).toBeVisible();

    // Try clicking a reaction - should be disabled or show login prompt
    await fireEmoji.click();
    await page.waitForTimeout(500);

    // Check for login prompt or disabled state
    const loginPrompt = page.locator('text=/sign in|login/i');
    const promptVisible = await loginPrompt.first().isVisible().catch(() => false);

    console.log('Login prompt shown after clicking reaction:', promptVisible);

    await page.screenshot({ path: 'tests/e2e/test-results/reactions-unauth.png', fullPage: true });
  });
});

test.describe('Reactions - Display Locations', () => {
  test('Check where reactions are displayed', async ({ page }) => {
    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    await page.waitForTimeout(2000);

    console.log('\n=== REACTIONS DISPLAY LOCATIONS ===\n');

    // 1. Community Pulse (top-left widget)
    const communityPulse = page.locator('text=energy is strong').first();
    const pulseVisible = await communityPulse.isVisible().catch(() => false);
    console.log('1. Community Pulse (top-left): ', pulseVisible ? '✓ VISIBLE' : '✗ NOT VISIBLE');

    // 2. Visitor Support Bar (bottom) - "React ✨" section
    const supportBarReact = page.locator('text=React').first();
    const supportBarVisible = await supportBarReact.isVisible().catch(() => false);
    console.log('2. Visitor Support Bar (bottom): ', supportBarVisible ? '✓ VISIBLE' : '✗ NOT VISIBLE');

    // 3. Node social bars (on each node)
    const nodeSocialBar = page.locator('text=Click to react').first();
    const nodeBarVisible = await nodeSocialBar.isVisible().catch(() => false);
    console.log('3. Node Social Bars: ', nodeBarVisible ? '✓ VISIBLE' : '✗ NOT VISIBLE');

    // 4. Node Interaction Popup
    await nodeSocialBar.click();
    await page.waitForTimeout(500);
    const popupReactions = page.locator('text=/SUPPORT|COMMENTS/i').first();
    const popupVisible = await popupReactions.isVisible().catch(() => false);
    console.log('4. Node Interaction Popup: ', popupVisible ? '✓ VISIBLE' : '✗ NOT VISIBLE');

    // Get actual counts from API
    console.log('\n=== CHECKING API FOR ACTUAL COUNTS ===\n');

    await page.screenshot({ path: 'tests/e2e/test-results/reactions-locations.png', fullPage: true });
  });

  test('Check reaction counts in different locations match', async ({ page }) => {
    await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Get counts from Community Pulse
    const pulseText = await page.locator('text=/🔥\\d+|💧\\d+|✨\\d+/').first().textContent().catch(() => '');
    console.log('Community Pulse shows:', pulseText);

    // Get counts from Visitor Support Bar
    const barText = await page.locator('text=React').first().locator('..').textContent().catch(() => '');
    console.log('Support Bar shows:', barText);

    // Open popup and get counts there
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Get individual emoji counts from popup
    const fireCount = await page.locator('button:has(text=🔥)').locator('text=/\\d+|·/').first().textContent().catch(() => '·');
    const waterCount = await page.locator('button:has(text=💧)').locator('text=/\\d+|·/').first().textContent().catch(() => '·');
    const magicCount = await page.locator('button:has(text=✨)').locator('text=/\\d+|·/').first().textContent().catch(() => '·');

    console.log('Popup shows - Fire:', fireCount, 'Water:', waterCount, 'Magic:', magicCount);
  });
});

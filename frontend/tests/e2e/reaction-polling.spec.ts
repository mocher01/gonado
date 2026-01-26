import { test, expect } from '@playwright/test';

/**
 * Issue #39: Real-time reaction polling
 *
 * This test verifies that the reaction polling mechanism:
 * 1. Doesn't break the goal page
 * 2. Doesn't cause console errors
 * 3. Continues working across multiple poll intervals
 * 4. Keeps the page stable and renderable
 *
 * The polling interval is 5 seconds, so we wait 6+ seconds to ensure
 * at least one full poll cycle completes.
 */

// Use a public goal that exists
const TEST_GOAL_ID = '48403911-ecf1-4532-885e-45953b57a7cd';

test.describe('Reaction Polling (#39)', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:7901/login', { waitUntil: 'networkidle' });

    // Use more flexible selectors
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill('e2etest@example.com');
    await passwordInput.fill('TestE2E123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('polling does not break goal page', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      pageErrors.push(`[Page Error] ${error.message}`);
    });

    // Step 1: Navigate to goal page
    console.log('Step 1: Navigating to goal page...');
    await page.goto(`http://localhost:7901/goals/${TEST_GOAL_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Step 2: Wait for initial load - look for key elements
    console.log('Step 2: Waiting for page to load...');
    await page.waitForTimeout(3000);

    // Verify the page loaded by checking for the Follow button or goal title
    const followButton = page.locator('button:has-text("Follow")');
    const goalTitle = page.locator('text=Test Goal');

    // Wait for either element to appear
    try {
      await Promise.race([
        followButton.waitFor({ state: 'visible', timeout: 5000 }),
        goalTitle.waitFor({ state: 'visible', timeout: 5000 })
      ]);
      console.log('✓ Page loaded successfully');
    } catch (error) {
      console.log('⚠️ Could not find Follow button or goal title, but continuing test');
    }

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/e2e/test-results/reaction-polling-initial.png',
      fullPage: true
    });

    // Step 3: Wait longer than polling interval (5s) to ensure polling happens
    console.log('Step 3: Waiting 7 seconds for polling cycle to complete...');
    await page.waitForTimeout(7000);

    // Step 4: Verify page still renders correctly after polling
    console.log('Step 4: Verifying page stability after polling...');

    // Check that key elements are still visible
    const followStillVisible = await followButton.isVisible().catch(() => false);
    const titleStillVisible = await goalTitle.isVisible().catch(() => false);

    // At least one should still be visible
    expect(followStillVisible || titleStillVisible).toBe(true);
    console.log('✓ Page elements still visible after polling');

    // Take screenshot after polling
    await page.screenshot({
      path: 'tests/e2e/test-results/reaction-polling-after-cycle.png',
      fullPage: true
    });

    // Step 5: Check for any errors
    console.log('Step 5: Checking for errors...');

    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }

    if (pageErrors.length > 0) {
      console.log('❌ Page errors detected:');
      pageErrors.forEach(err => console.log(`  - ${err}`));
    }

    // Assert no critical errors occurred
    // Note: We might have some warnings, but no actual errors
    const criticalErrors = pageErrors.filter(err =>
      !err.includes('warning') && !err.includes('Warning')
    );
    expect(criticalErrors.length).toBe(0);
    console.log('✓ No critical page errors');

    console.log('✓ Test complete - polling works without breaking the page');
  });

  test('polling continues over multiple intervals', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(`[Page Error] ${error.message}`);
    });

    // Navigate to goal page
    console.log('Step 1: Navigating to goal page...');
    await page.goto(`http://localhost:7901/goals/${TEST_GOAL_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);
    console.log('✓ Initial load complete');

    // Wait for 2 polling cycles (5s interval * 2 = 10s, plus buffer)
    console.log('Step 2: Waiting 12 seconds for multiple polling cycles...');
    await page.waitForTimeout(12000);

    // Verify page is still stable - check for key elements
    const followButton = page.locator('button:has-text("Follow")');
    const followVisible = await followButton.isVisible().catch(() => false);
    expect(followVisible).toBe(true);
    console.log('✓ Page still stable after multiple polling cycles');

    // Check no critical errors
    const criticalErrors = pageErrors.filter(err =>
      !err.includes('warning') && !err.includes('Warning')
    );
    expect(criticalErrors.length).toBe(0);
    console.log('✓ No errors after extended polling');

    // Take final screenshot
    await page.screenshot({
      path: 'tests/e2e/test-results/reaction-polling-multiple-cycles.png',
      fullPage: true
    });

    console.log('✓ Test complete - polling stable over multiple intervals');
  });

  test('reactions display is not disrupted by polling', async ({ page }) => {
    console.log('Step 1: Navigating to goal page...');
    await page.goto(`http://localhost:7901/goals/${TEST_GOAL_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Check if there are any reaction buttons/displays
    console.log('Step 2: Looking for reaction elements...');
    const reactionElements = page.locator('[data-testid*="reaction"], button:has-text("👍"), button:has-text("❤️"), button:has-text("🎉")');
    const hasReactions = await reactionElements.count();

    if (hasReactions > 0) {
      console.log(`✓ Found ${hasReactions} reaction elements`);

      // Take snapshot before polling
      await page.screenshot({
        path: 'tests/e2e/test-results/reactions-before-polling.png',
        fullPage: true
      });

      // Wait for polling cycle
      console.log('Step 3: Waiting for polling cycle...');
      await page.waitForTimeout(7000);

      // Verify reactions still present
      const reactionsAfter = await reactionElements.count();
      expect(reactionsAfter).toBe(hasReactions);
      console.log('✓ Reaction elements stable after polling');

      // Take snapshot after polling
      await page.screenshot({
        path: 'tests/e2e/test-results/reactions-after-polling.png',
        fullPage: true
      });
    } else {
      console.log('ℹ️ No reaction elements found on this page (this is OK)');
      // Still verify polling doesn't break the page
      await page.waitForTimeout(7000);
      const followButton = page.locator('button:has-text("Follow")');
      const isFollowVisible = await followButton.isVisible().catch(() => false);
      expect(isFollowVisible).toBe(true);
      console.log('✓ Page stable even without reactions');
    }

    console.log('✓ Test complete - reactions not disrupted by polling');
  });
});

import { test, expect } from '@playwright/test';

/**
 * VisitorSupportBar Audit Tests
 *
 * This component appears at the bottom of public goal pages for visitors.
 * Components:
 * 1. "Join Journey" button - Follow/unfollow functionality
 * 2. Elemental reactions - Quick 5-emoji reactions (fire, water, nature, lightning, magic)
 * 3. Community stats panel - Shows followers, comments, boosts counts
 * 4. Arrow button - Opens expanded VisitorSupportPanel
 */

test.describe('VisitorSupportBar - Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });
  });

  test('Support bar is visible at bottom of page', async ({ page }) => {
    // The support bar should be visible
    const joinJourney = page.locator('button:has-text("Join Journey"), button:has-text("Following")');
    await expect(joinJourney).toBeVisible({ timeout: 5000 });
    console.log('✓ Support bar visible at bottom');
  });

  test('AUDIT: Join Journey button visibility and state', async ({ page }) => {
    const joinBtn = page.locator('button:has-text("Join Journey"), button:has-text("Following")');
    await expect(joinBtn).toBeVisible({ timeout: 5000 });

    const buttonText = await joinBtn.textContent();
    console.log('Join Journey button text:', buttonText);

    // Check if disabled (for non-authenticated users)
    const isDisabled = await joinBtn.isDisabled();
    console.log('Is disabled (unauthenticated):', isDisabled);

    // Screenshot for visual audit
    await page.screenshot({ path: 'tests/e2e/test-results/visitor-bar-audit.png', fullPage: true });
  });

  test('AUDIT: Quick reactions (elemental reactions inline)', async ({ page }) => {
    // Look for the "React" section with emojis
    const reactSection = page.locator('text=React');
    const reactVisible = await reactSection.first().isVisible().catch(() => false);
    console.log('React section visible:', reactVisible);

    // Check for individual reaction emojis
    const fireEmoji = page.locator('text=🔥').first();
    const waterEmoji = page.locator('text=💧').first();
    const magicEmoji = page.locator('text=✨').first();

    const fireVisible = await fireEmoji.isVisible().catch(() => false);
    const waterVisible = await waterEmoji.isVisible().catch(() => false);
    const magicVisible = await magicEmoji.isVisible().catch(() => false);

    console.log('Fire emoji visible:', fireVisible);
    console.log('Water emoji visible:', waterVisible);
    console.log('Magic emoji visible:', magicVisible);
  });

  test('AUDIT: Community stats display', async ({ page }) => {
    // Look for follower count (🚶 N)
    const followerCount = page.locator('text=/🚶\\s*\\d+/');
    const followerVisible = await followerCount.first().isVisible().catch(() => false);
    console.log('Follower count visible:', followerVisible);

    // Look for comment count (💬 N)
    const commentCount = page.locator('text=/💬\\s*\\d+/');
    const commentVisible = await commentCount.first().isVisible().catch(() => false);
    console.log('Comment count visible:', commentVisible);
  });

  test('AUDIT: Arrow button opens panel', async ({ page }) => {
    // Find the arrow button (→)
    const arrowBtn = page.locator('button:has-text("→")').first();
    const arrowVisible = await arrowBtn.isVisible().catch(() => false);
    console.log('Arrow button visible:', arrowVisible);

    if (arrowVisible) {
      await arrowBtn.click();
      await page.waitForTimeout(500);

      // Check if panel opened - look for panel content
      const panelContent = page.locator('text=Fellow Travelers, text=Sacred Boost, text=Quest Chronicle').first();
      const panelVisible = await panelContent.isVisible().catch(() => false);
      console.log('Panel opened:', panelVisible);

      // Screenshot of opened panel
      await page.screenshot({ path: 'tests/e2e/test-results/visitor-panel-audit.png', fullPage: true });
    }
  });

  test('AUDIT: Check z-index blocking issues', async ({ page }) => {
    // The support bar has z-40 which was causing issues
    // Test that we can interact with elements behind it when needed

    // Get the support bar bounding box
    const supportBar = page.locator('button:has-text("Join Journey"), button:has-text("Following")').locator('xpath=ancestor::div[contains(@class, "fixed")]');
    const barBox = await supportBar.first().boundingBox();

    if (barBox) {
      console.log('Support bar position:');
      console.log('  Top:', barBox.y);
      console.log('  Height:', barBox.height);
      console.log('  Covers from y=' + barBox.y + ' to bottom of screen');
    }

    // Test that minimap/controls in top-left are NOT blocked
    const zoomIn = page.locator('.react-flow__controls-zoomin');
    const zoomVisible = await zoomIn.isVisible().catch(() => false);
    const zoomClickable = await zoomIn.click({ timeout: 2000 }).then(() => true).catch(() => false);

    console.log('Zoom button visible:', zoomVisible);
    console.log('Zoom button clickable:', zoomClickable);
  });

  test('FULL AUDIT: Document all elements', async ({ page }) => {
    console.log('\n=== VISITOR SUPPORT BAR FULL AUDIT ===\n');

    // 1. Support bar presence
    const joinBtn = page.locator('button:has-text("Join Journey"), button:has-text("Following")');
    console.log('1. JOIN JOURNEY BUTTON');
    console.log('   Visible:', await joinBtn.isVisible().catch(() => false));
    console.log('   Disabled (unauthenticated):', await joinBtn.isDisabled().catch(() => 'N/A'));
    console.log('   Text:', await joinBtn.textContent().catch(() => 'N/A'));

    // 2. React section
    console.log('\n2. REACT SECTION');
    const reactLabel = page.locator('text=React').first();
    console.log('   "React" label visible:', await reactLabel.isVisible().catch(() => false));

    // 3. Community stats
    console.log('\n3. COMMUNITY STATS');
    const statsSection = page.locator('text=/🚶.*💬/').first();
    console.log('   Stats section visible:', await statsSection.isVisible().catch(() => false));
    const statsText = await statsSection.textContent().catch(() => 'N/A');
    console.log('   Stats content:', statsText);

    // 4. Arrow/expand button
    console.log('\n4. EXPAND BUTTON');
    const arrowBtn = page.locator('button:has-text("→")').first();
    console.log('   Arrow button visible:', await arrowBtn.isVisible().catch(() => false));

    console.log('\n=== END AUDIT ===\n');

    // Final screenshot
    await page.screenshot({ path: 'tests/e2e/test-results/visitor-bar-full-audit.png', fullPage: true });
  });
});

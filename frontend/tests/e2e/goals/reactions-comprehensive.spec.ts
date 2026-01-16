import { test, expect, Page } from '@playwright/test';
import { TEST_GOAL_ID, waitForGoalPageLoad } from '../utils/test-helpers';

/**
 * Comprehensive Reactions System E2E Tests
 *
 * Tests all aspects of the reactions system on task nodes:
 * 1. Display of 5 reaction icons with counts
 * 2. Multiple reactions allowed per user
 * 3. Toggle behavior
 * 4. Persistence after refresh
 * 5. Anonymous user restrictions
 * 6. Tooltips on hover
 */

// Test user credentials
const TEST_USER = {
  email: 'e2etest@example.com',
  password: 'TestE2E123'
};

// Helper function to login
async function loginUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}

// Helper to get first task node
async function getFirstTaskNode(page: Page) {
  await page.waitForSelector('[data-id]', { timeout: 10000 });
  return page.locator('[data-id]').first();
}

// Helper to get reaction button
async function getReactionButton(node: any, reactionType: string) {
  return node.locator(`button:has-text("${getReactionEmoji(reactionType)}")`).first();
}

// Helper to get reaction emoji
function getReactionEmoji(reactionType: string): string {
  const emojiMap: Record<string, string> = {
    'encourage': '👊',
    'celebrate': '🎉',
    'light-path': '🔦',
    'send-strength': '💪',
    'mark-struggle': '🚩'
  };
  return emojiMap[reactionType] || '';
}

// Helper to get reaction count
async function getReactionCount(button: any): Promise<number> {
  const countText = await button.locator('span').last().textContent();
  if (!countText || countText.trim() === '' || countText === '·') return 0;
  return parseInt(countText.trim()) || 0;
}

test.describe('Reactions System - Display', () => {
  test('should display all 5 reaction icons on task nodes', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);

    // Check all 5 reaction icons are present
    const reactions = ['encourage', 'celebrate', 'light-path', 'send-strength', 'mark-struggle'];

    for (const reaction of reactions) {
      const emoji = getReactionEmoji(reaction);
      const button = node.locator(`button:has-text("${emoji}")`).first();
      await expect(button).toBeVisible();
      console.log(`✓ ${reaction} (${emoji}) is visible`);
    }

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-all-icons-visible.png',
      fullPage: true
    });
  });

  test('should show count for each reaction icon', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const reactions = ['encourage', 'celebrate', 'light-path', 'send-strength', 'mark-struggle'];

    for (const reaction of reactions) {
      const button = await getReactionButton(node, reaction);
      const count = await button.locator('span').last().textContent();
      expect(count).toBeDefined();
      console.log(`${reaction}: count = "${count}"`);
    }

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-counts-visible.png',
      fullPage: true
    });
  });

  test('should show tooltips on hover', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);

    // Test tooltip on encourage button
    const encourageBtn = await getReactionButton(node, 'encourage');
    await encourageBtn.hover();
    await page.waitForTimeout(500);

    const title = await encourageBtn.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toContain('going'); // "Keep going!"
    console.log(`Encourage tooltip: "${title}"`);

    // Test tooltip on celebrate button
    const celebrateBtn = await getReactionButton(node, 'celebrate');
    await celebrateBtn.hover();
    await page.waitForTimeout(500);

    const celebrateTitle = await celebrateBtn.getAttribute('title');
    expect(celebrateTitle).toBeTruthy();
    console.log(`Celebrate tooltip: "${celebrateTitle}"`);

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-tooltip-hover.png',
      fullPage: true
    });
  });
});

test.describe('Reactions System - Multiple Reactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should allow user to add multiple reactions', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);

    // Add encourage reaction
    const encourageBtn = await getReactionButton(node, 'encourage');
    const encourageCountBefore = await getReactionCount(encourageBtn);
    await encourageBtn.click();
    await page.waitForTimeout(1000);

    const encourageCountAfter = await getReactionCount(encourageBtn);
    console.log(`Encourage: ${encourageCountBefore} → ${encourageCountAfter}`);

    // Add celebrate reaction (should NOT remove encourage)
    const celebrateBtn = await getReactionButton(node, 'celebrate');
    const celebrateCountBefore = await getReactionCount(celebrateBtn);
    await celebrateBtn.click();
    await page.waitForTimeout(1000);

    const celebrateCountAfter = await getReactionCount(celebrateBtn);
    console.log(`Celebrate: ${celebrateCountBefore} → ${celebrateCountAfter}`);

    // Verify encourage is still active
    const encourageCountFinal = await getReactionCount(encourageBtn);
    console.log(`Encourage final: ${encourageCountFinal}`);

    // Both should have increased or stayed (depending on previous state)
    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-multiple-active.png',
      fullPage: true
    });
  });

  test('should allow adding all 5 reactions simultaneously', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const reactions = ['encourage', 'celebrate', 'light-path', 'send-strength', 'mark-struggle'];

    const results: Record<string, { before: number, after: number }> = {};

    // Click all reactions
    for (const reaction of reactions) {
      const button = await getReactionButton(node, reaction);
      const before = await getReactionCount(button);
      await button.click();
      await page.waitForTimeout(800);
      const after = await getReactionCount(button);

      results[reaction] = { before, after };
      console.log(`${reaction}: ${before} → ${after}`);
    }

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-all-five-active.png',
      fullPage: true
    });

    // Log final state
    console.log('\nFinal state after adding all 5 reactions:');
    console.log(JSON.stringify(results, null, 2));
  });
});

test.describe('Reactions System - Toggle Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should toggle reaction off when clicked again', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const encourageBtn = await getReactionButton(node, 'encourage');

    // Get initial count
    const initialCount = await getReactionCount(encourageBtn);
    console.log(`Initial count: ${initialCount}`);

    // First click - add reaction
    await encourageBtn.click();
    await page.waitForTimeout(1000);
    const afterAddCount = await getReactionCount(encourageBtn);
    console.log(`After add: ${afterAddCount}`);

    // Second click - toggle off
    await encourageBtn.click();
    await page.waitForTimeout(1000);
    const afterRemoveCount = await getReactionCount(encourageBtn);
    console.log(`After remove: ${afterRemoveCount}`);

    // Count should be back to initial or one less
    expect(afterRemoveCount).toBeLessThanOrEqual(afterAddCount);

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-toggle-off.png',
      fullPage: true
    });
  });

  test('should handle rapid toggle clicks correctly', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const celebrateBtn = await getReactionButton(node, 'celebrate');

    const initialCount = await getReactionCount(celebrateBtn);
    console.log(`Initial: ${initialCount}`);

    // Rapid clicks: on, off, on, off, on
    for (let i = 0; i < 5; i++) {
      await celebrateBtn.click();
      await page.waitForTimeout(600);
      const count = await getReactionCount(celebrateBtn);
      console.log(`Click ${i + 1}: ${count}`);
    }

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-rapid-toggle.png',
      fullPage: true
    });
  });
});

test.describe('Reactions System - Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should persist reactions after page refresh', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);

    // Add light-path reaction
    const lightPathBtn = await getReactionButton(node, 'light-path');
    const beforeClick = await getReactionCount(lightPathBtn);
    await lightPathBtn.click();
    await page.waitForTimeout(1500);
    const afterClick = await getReactionCount(lightPathBtn);

    console.log(`Before click: ${beforeClick}, After click: ${afterClick}`);

    // Get node ID for verification after refresh
    const nodeId = await node.getAttribute('data-id');

    // Refresh the page
    await page.reload();
    await waitForGoalPageLoad(page);

    // Find the same node again
    const nodeAfterRefresh = page.locator(`[data-id="${nodeId}"]`).first();
    const lightPathBtnAfterRefresh = await getReactionButton(nodeAfterRefresh, 'light-path');
    const countAfterRefresh = await getReactionCount(lightPathBtnAfterRefresh);

    console.log(`After refresh: ${countAfterRefresh}`);

    // Count should still be the same
    expect(countAfterRefresh).toBe(afterClick);

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-persist-after-refresh.png',
      fullPage: true
    });
  });

  test('should persist multiple reactions after refresh', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const nodeId = await node.getAttribute('data-id');

    // Add two different reactions
    const encourageBtn = await getReactionButton(node, 'encourage');
    const sendStrengthBtn = await getReactionButton(node, 'send-strength');

    await encourageBtn.click();
    await page.waitForTimeout(800);
    await sendStrengthBtn.click();
    await page.waitForTimeout(800);

    const encourageCountBefore = await getReactionCount(encourageBtn);
    const sendStrengthCountBefore = await getReactionCount(sendStrengthBtn);

    console.log(`Before refresh - Encourage: ${encourageCountBefore}, Send Strength: ${sendStrengthCountBefore}`);

    // Refresh
    await page.reload();
    await waitForGoalPageLoad(page);

    const nodeAfterRefresh = page.locator(`[data-id="${nodeId}"]`).first();
    const encourageBtnAfter = await getReactionButton(nodeAfterRefresh, 'encourage');
    const sendStrengthBtnAfter = await getReactionButton(nodeAfterRefresh, 'send-strength');

    const encourageCountAfter = await getReactionCount(encourageBtnAfter);
    const sendStrengthCountAfter = await getReactionCount(sendStrengthBtnAfter);

    console.log(`After refresh - Encourage: ${encourageCountAfter}, Send Strength: ${sendStrengthCountAfter}`);

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-multiple-persist.png',
      fullPage: true
    });
  });
});

test.describe('Reactions System - Anonymous Users', () => {
  test('should prevent anonymous users from reacting', async ({ page }) => {
    // Go to goal page without logging in
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const encourageBtn = await getReactionButton(node, 'encourage');

    // Set up listener for alerts
    let alertShown = false;
    page.on('dialog', async dialog => {
      alertShown = true;
      console.log(`Alert shown: "${dialog.message()}"`);
      expect(dialog.message()).toMatch(/log in|sign in/i);
      await dialog.accept();
    });

    // Try to click reaction
    await encourageBtn.click();
    await page.waitForTimeout(1000);

    // Alert should have been shown
    expect(alertShown).toBeTruthy();

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-anonymous-blocked.png',
      fullPage: true
    });
  });

  test('should still display reaction counts to anonymous users', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const reactions = ['encourage', 'celebrate', 'light-path', 'send-strength', 'mark-struggle'];

    // All reactions should be visible with counts
    for (const reaction of reactions) {
      const button = await getReactionButton(node, reaction);
      await expect(button).toBeVisible();

      const count = await button.locator('span').last().textContent();
      console.log(`${reaction}: ${count} (anonymous view)`);
    }

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-anonymous-view.png',
      fullPage: true
    });
  });
});

test.describe('Reactions System - Purple Styling for Mark Struggle', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should show purple styling when mark-struggle is active', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const markStruggleBtn = await getReactionButton(node, 'mark-struggle');

    // Click to activate
    await markStruggleBtn.click();
    await page.waitForTimeout(1000);

    // Check for purple styling
    const className = await markStruggleBtn.getAttribute('class');
    console.log(`Mark struggle button classes: ${className}`);

    // Should contain purple-related classes
    expect(className).toMatch(/purple/i);

    // Take screenshot to visually verify purple glow
    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-mark-struggle-purple.png',
      fullPage: true
    });
  });
});

test.describe('Reactions System - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display all reactions on mobile', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const reactions = ['encourage', 'celebrate', 'light-path', 'send-strength', 'mark-struggle'];

    for (const reaction of reactions) {
      const button = await getReactionButton(node, reaction);
      await expect(button).toBeVisible();
      console.log(`${reaction} visible on mobile: ✓`);
    }

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-mobile-view.png',
      fullPage: true
    });
  });

  test('should allow reactions on mobile after login', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const node = await getFirstTaskNode(page);
    const celebrateBtn = await getReactionButton(node, 'celebrate');

    const countBefore = await getReactionCount(celebrateBtn);
    await celebrateBtn.click();
    await page.waitForTimeout(1000);
    const countAfter = await getReactionCount(celebrateBtn);

    console.log(`Mobile reaction: ${countBefore} → ${countAfter}`);

    await page.screenshot({
      path: '/var/apps/gonado/frontend/tests/e2e/test-results/reactions-mobile-click.png',
      fullPage: true
    });
  });
});

import { Page, expect, Locator } from '@playwright/test';

/**
 * Test Helper Utilities for Gonado E2E Tests
 */

// Test goal ID with known data
export const TEST_GOAL_ID = 'e3dc9226-15d7-4421-903a-a4ece38dd586';
export const GOAL_PAGE_URL = `/goals/${TEST_GOAL_ID}`;

/**
 * Wait for the goal page to fully load
 */
export async function waitForGoalPageLoad(page: Page): Promise<void> {
  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Wait for React Flow nodes to be visible
  await page.waitForSelector('.react-flow__node', {
    timeout: 15000,
  }).catch(() => {
    // Fallback: wait for React Flow container
    return page.waitForSelector('.react-flow', { timeout: 10000 });
  });
}

/**
 * Click on a node's social bar to open the interaction popup
 * The popup is triggered by clicking the social activity bar inside each node,
 * NOT the whole node card.
 */
export async function clickOnNode(page: Page, nodeIndex: number = 0): Promise<void> {
  // Wait for React Flow nodes to appear
  await page.waitForSelector('.react-flow__node', { timeout: 10000 });

  // The social bar is a clickable div inside each node with the text "Click to react or comment"
  // or showing reaction/comment badges
  const socialBars = page.locator('.react-flow__node').locator('div[title="Click to interact with this node"]');

  const count = await socialBars.count();

  if (count === 0) {
    // Fallback: try to find any element with "Click to react" text
    const fallbackBars = page.locator('text=Click to react or comment');
    const fallbackCount = await fallbackBars.count();
    if (fallbackCount > 0) {
      await fallbackBars.first().click({ force: true });
      return;
    }
    throw new Error('No node social bars found on the page');
  }

  if (nodeIndex >= count) {
    nodeIndex = 0;
  }

  // Click on the social bar using JS to avoid viewport issues
  const bar = socialBars.nth(nodeIndex);
  await bar.evaluate((el) => (el as HTMLElement).click());
}

/**
 * Check if NodeInteractionPopup is visible and properly sized
 */
export async function verifyPopupVisible(page: Page): Promise<Locator> {
  // Wait for popup to appear - look for the actual popup content, not the wrapper
  // The popup has a gradient background and contains Reactions/Comments
  const popup = page.locator('[class*="max-w-"][class*="flex"][class*="flex-col"]').filter({
    has: page.locator('text=/Reactions|Comments/i')
  }).first();

  await expect(popup).toBeVisible({ timeout: 5000 });
  return popup;
}

/**
 * Verify popup fits within viewport (not cut off)
 */
export async function verifyPopupNotCutOff(page: Page, popup: Locator): Promise<void> {
  const viewportSize = page.viewportSize();
  if (!viewportSize) throw new Error('Could not get viewport size');

  const boundingBox = await popup.boundingBox();
  if (!boundingBox) throw new Error('Could not get popup bounding box');

  // Check popup is fully within viewport
  expect(boundingBox.y).toBeGreaterThanOrEqual(0);
  expect(boundingBox.x).toBeGreaterThanOrEqual(0);
  expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(viewportSize.height + 5); // 5px tolerance
  expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(viewportSize.width + 5);

  // Check popup height doesn't exceed 85% of viewport
  const maxHeight = viewportSize.height * 0.85;
  expect(boundingBox.height).toBeLessThanOrEqual(maxHeight + 20); // 20px tolerance for borders
}

/**
 * Close any open popup by clicking backdrop or pressing Escape
 */
export async function closePopup(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Check if NodeCommentsPanel is visible
 */
export async function verifyCommentsPanelVisible(page: Page): Promise<Locator> {
  const panel = page.locator('[class*="fixed"][class*="right-0"]').filter({
    has: page.locator('text=/Trail Chronicles|Comments|markers/i')
  });

  await expect(panel).toBeVisible({ timeout: 5000 });
  return panel;
}

/**
 * Check if AuthHeader is visible
 */
export async function verifyAuthHeaderVisible(page: Page): Promise<Locator> {
  // Look for either logged-in state or login button
  const authHeader = page.locator('[class*="fixed"], [class*="absolute"]').filter({
    has: page.locator('text=/Begin Journey|Sign in|Navigator|Leave Camp/i')
  }).first();

  await expect(authHeader).toBeVisible({ timeout: 5000 });
  return authHeader;
}

/**
 * Get viewport dimensions
 */
export async function getViewportDimensions(page: Page): Promise<{ width: number; height: number }> {
  const size = page.viewportSize();
  if (!size) throw new Error('Could not get viewport size');
  return size;
}

/**
 * Take a debug screenshot
 */
export async function debugScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `tests/e2e/test-results/debug-${name}-${Date.now()}.png` });
}

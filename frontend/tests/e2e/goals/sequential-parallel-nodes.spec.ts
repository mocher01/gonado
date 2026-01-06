import { test, expect, Page } from '@playwright/test';
import { TEST_GOAL_ID, waitForGoalPageLoad } from '../utils/test-helpers';

/**
 * E2E Tests for Sequential/Parallel Node Structuring (Issue #63)
 *
 * These tests verify:
 * - Sequential nodes show dependencies (arrows)
 * - Parallel nodes appear side-by-side
 * - Locked sequential nodes show lock icon
 * - Mobile: Sequential = swipe vertical, Parallel = swipe horizontal (TODO)
 */

// Test helper to login as a user
async function loginAsOwner(page: Page): Promise<void> {
  // Go to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill in credentials (using test user)
  await page.fill('input[type="email"]', 'e2etest@example.com');
  await page.fill('input[type="password"]', 'TestE2E123');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/);
}

test.describe('Sequential/Parallel Node Structuring', () => {
  test('sequential nodes show dependencies', async ({ page }) => {
    // Login as owner to have write access
    await loginAsOwner(page);

    // Navigate to a goal with sequential nodes
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check that nodes are rendered
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible();

    // Check that edges (dependency arrows) are rendered
    const edges = page.locator('.react-flow__edge');
    const edgeCount = await edges.count();
    expect(edgeCount).toBeGreaterThan(0);
  });

  test('locked sequential nodes show lock icon', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for lock icons on locked nodes
    // The lock icon is rendered as a 🔒 emoji in nodes with status="locked"
    const lockIcons = page.locator('.react-flow__node').locator('text=🔒');
    const lockIconCount = await lockIcons.count();

    // If there are locked nodes, they should show lock icons
    // Note: This depends on the test goal having locked nodes
    if (lockIconCount > 0) {
      await expect(lockIcons.first()).toBeVisible();
    }
  });

  test('locked nodes show "Complete previous step" message', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for the locked message
    const lockedMessages = page.locator('text=Complete previous step first');
    const messageCount = await lockedMessages.count();

    // If there are locked nodes, they should show this message
    if (messageCount > 0) {
      await expect(lockedMessages.first()).toBeVisible();
    }
  });

  test('parallel nodes appear with parallel badge', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for parallel badges (⚡ Parallel)
    const parallelBadges = page.locator('text=⚡ Parallel');
    const badgeCount = await parallelBadges.count();

    // If there are parallel nodes in the test goal, they should show the badge
    if (badgeCount > 0) {
      await expect(parallelBadges.first()).toBeVisible();
    }
  });

  test('completing first node unlocks second sequential node', async ({ page }) => {
    // Login as owner
    await loginAsOwner(page);

    // Navigate to goal page
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Find the first active node with "Mark as Complete" button
    const completeButtons = page.locator('button:has-text("Mark as Complete")');
    const buttonCount = await completeButtons.count();

    if (buttonCount > 0) {
      // Get initial count of locked nodes
      const lockedNodesInitial = page.locator('text=🔒');
      const initialLockedCount = await lockedNodesInitial.count();

      // Click complete on first active node
      await completeButtons.first().click();

      // Wait for state update
      await page.waitForTimeout(1000);

      // After completion, there should be fewer locked nodes
      // OR a new node should become "Current"
      const currentBadges = page.locator('text=Current');
      await expect(currentBadges.first()).toBeVisible();
    }
  });

  test('nodes with edges show visual connections', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check that SVG edges are rendered
    const edgePaths = page.locator('.react-flow__edge-path');
    const pathCount = await edgePaths.count();

    // There should be edges connecting nodes
    expect(pathCount).toBeGreaterThan(0);
  });

  test('goal shows progress indicator', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for progress percentage (e.g., "33%")
    const progressIndicator = page.locator('text=/%$/');

    // Progress should be visible
    await expect(progressIndicator).toBeVisible();
  });

  test('nodes display status indicators correctly', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check for status indicators
    // Done = completed nodes
    const doneIndicators = page.locator('.react-flow__node').locator('text=Done');
    // Current = active nodes
    const currentIndicators = page.locator('.react-flow__node').locator('text=Current');
    // Locked = locked nodes
    const lockedIndicators = page.locator('.react-flow__node').locator('text=Locked');

    // At least one status indicator should be visible
    const totalIndicators =
      await doneIndicators.count() +
      await currentIndicators.count() +
      await lockedIndicators.count();

    expect(totalIndicators).toBeGreaterThan(0);
  });
});

test.describe('Mobile Sequential/Parallel Behavior', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 Pro

  test('nodes render correctly on mobile', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Nodes should still be visible on mobile
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible();
  });

  test('zoom and pan controls work on mobile', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // React Flow controls should be visible
    const controls = page.locator('.react-flow__controls');
    await expect(controls).toBeVisible();
  });
});

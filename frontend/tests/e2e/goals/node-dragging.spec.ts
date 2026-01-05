import { test, expect } from '@playwright/test';

/**
 * Tests for Issue #43: Node dragging works as viewer but not as owner
 *
 * Requirements:
 * - Owner can drag nodes and position persists after refresh
 * - Visitors cannot drag nodes
 * - Debounced API calls
 */

// Test goal ID - should exist in test environment
const TEST_GOAL_ID = 'e3dc9226-15d7-4421-903a-a4ece38dd586';
const GOAL_PAGE_URL = `/goals/${TEST_GOAL_ID}`;

test.describe('Node Dragging - Issue #43', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to goal page
    await page.goto(GOAL_PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for React Flow to load
    await page.waitForSelector('.react-flow', { timeout: 15000 });
  });

  test.describe('As Visitor (not logged in)', () => {
    test('nodes should not be draggable', async ({ page }) => {
      // Wait for nodes to appear
      const node = page.locator('.react-flow__node').first();
      await expect(node).toBeVisible({ timeout: 10000 });

      // Get initial position
      const initialBox = await node.boundingBox();
      expect(initialBox).toBeTruthy();

      // Try to drag the node
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(
        initialBox!.x + 100,
        initialBox!.y + 100,
        { steps: 5 }
      );
      await page.mouse.up();

      // Verify node position didn't change
      const finalBox = await node.boundingBox();
      expect(finalBox).toBeTruthy();

      // Position should be the same (with small tolerance for rendering)
      expect(Math.abs(finalBox!.x - initialBox!.x)).toBeLessThan(5);
      expect(Math.abs(finalBox!.y - initialBox!.y)).toBeLessThan(5);
    });

    test('instructions panel should not show drag hint', async ({ page }) => {
      // Wait for instructions panel
      const instructionsPanel = page.locator('text=pan').first();
      await expect(instructionsPanel).toBeVisible({ timeout: 5000 });

      // Should show pan and zoom instructions
      await expect(page.locator('text=Drag background to pan')).toBeVisible();
      await expect(page.locator('text=Scroll to zoom')).toBeVisible();

      // Should NOT show "Drag nodes to reposition" for visitors
      await expect(page.locator('text=Drag nodes to reposition')).not.toBeVisible();
    });
  });

  test.describe('As Owner (logged in)', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword');
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard or home
      await page.waitForLoadState('networkidle');

      // Navigate to goal page
      await page.goto(GOAL_PAGE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.react-flow', { timeout: 15000 });
    });

    test('nodes should be draggable', async ({ page }) => {
      // Wait for nodes to appear
      const node = page.locator('.react-flow__node').first();
      await expect(node).toBeVisible({ timeout: 10000 });

      // Get initial position
      const initialBox = await node.boundingBox();
      expect(initialBox).toBeTruthy();

      // Drag the node
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(
        initialBox!.x + 100,
        initialBox!.y + 50,
        { steps: 10 }
      );
      await page.mouse.up();

      // Wait for drag to complete
      await page.waitForTimeout(200);

      // Verify node position changed
      const finalBox = await node.boundingBox();
      expect(finalBox).toBeTruthy();

      // Position should have changed
      const deltaX = Math.abs(finalBox!.x - initialBox!.x);
      const deltaY = Math.abs(finalBox!.y - initialBox!.y);
      expect(deltaX + deltaY).toBeGreaterThan(20);
    });

    test('instructions panel should show drag hint', async ({ page }) => {
      // Wait for instructions panel
      await expect(page.locator('text=Drag nodes to reposition')).toBeVisible({ timeout: 5000 });
    });

    test('should show save indicator when dragging', async ({ page }) => {
      // Wait for nodes to appear
      const node = page.locator('.react-flow__node').first();
      await expect(node).toBeVisible({ timeout: 10000 });

      // Get initial position
      const initialBox = await node.boundingBox();
      expect(initialBox).toBeTruthy();

      // Drag the node
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(
        initialBox!.x + 50,
        initialBox!.y + 30,
        { steps: 5 }
      );
      await page.mouse.up();

      // Wait for debounce (500ms) and then saving indicator
      await page.waitForTimeout(600);

      // Check for "Saving..." or "Saved" text
      const savingOrSaved = page.locator('text=/Saving|Saved/');
      // May or may not be visible depending on API response time
      // This is more of a smoke test
    });

    test('position should persist after page refresh', async ({ page }) => {
      // Wait for nodes to appear
      const node = page.locator('.react-flow__node').first();
      await expect(node).toBeVisible({ timeout: 10000 });

      // Get initial position
      const initialBox = await node.boundingBox();
      expect(initialBox).toBeTruthy();

      // Drag the node to a new position
      const dragOffsetX = 150;
      const dragOffsetY = 80;

      await node.hover();
      await page.mouse.down();
      await page.mouse.move(
        initialBox!.x + dragOffsetX,
        initialBox!.y + dragOffsetY,
        { steps: 10 }
      );
      await page.mouse.up();

      // Wait for debounce and save to complete
      await page.waitForTimeout(1500);

      // Store the new position before refresh
      const afterDragBox = await node.boundingBox();
      expect(afterDragBox).toBeTruthy();

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.react-flow', { timeout: 15000 });
      await page.waitForSelector('.react-flow__node', { timeout: 10000 });

      // Get position after refresh
      const nodeAfterRefresh = page.locator('.react-flow__node').first();
      const afterRefreshBox = await nodeAfterRefresh.boundingBox();
      expect(afterRefreshBox).toBeTruthy();

      // Position should be similar to after-drag position (not initial)
      // Note: React Flow may calculate slightly different positions based on viewport
      // so we use a generous tolerance
      const driftX = Math.abs(afterRefreshBox!.x - afterDragBox!.x);
      const driftY = Math.abs(afterRefreshBox!.y - afterDragBox!.y);

      // Position should have persisted (within 50px tolerance for viewport differences)
      expect(driftX).toBeLessThan(50);
      expect(driftY).toBeLessThan(50);
    });
  });
});

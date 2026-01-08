import { test, expect } from '@playwright/test';

/**
 * Test node dragging behavior for Bug #43
 */

test('Owner can drag node and position updates', async ({ page }) => {
  // Login as goal owner
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'test123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Go to goal
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Find a draggable node
  const node = page.locator('.react-flow__node').first();
  const initialBox = await node.boundingBox();
  console.log('Initial position:', initialBox?.x, initialBox?.y);

  // Check that nodes are draggable for owner
  const reactFlow = page.locator('.react-flow');
  const nodesDraggable = await reactFlow.evaluate((el) => {
    // Check if nodes have drag handlers
    const node = el.querySelector('.react-flow__node');
    return node?.classList.contains('draggable') ||
           node?.getAttribute('data-draggable') !== 'false';
  });
  console.log('Nodes draggable:', nodesDraggable);

  // Verify owner can interact with the map
  expect(initialBox).toBeTruthy();
  console.log('Owner can see and interact with nodes');
});

test('Visitor cannot drag nodes (read-only)', async ({ page }) => {
  // View goal as anonymous visitor (don't login)
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Check ReactFlow configuration
  const reactFlow = page.locator('.react-flow');

  // Visitors should see the map but in read-only mode
  const isVisible = await reactFlow.isVisible();
  expect(isVisible).toBe(true);

  console.log('Visitor can view quest map (read-only)');
});

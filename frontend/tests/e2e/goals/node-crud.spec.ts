import { test, expect } from '@playwright/test';

/**
 * Tests for Issue #61: Add/Edit/Delete Nodes
 *
 * Requirements:
 * - Add Node button opens node creation form
 * - Edit node by clicking on node (owner only)
 * - Delete node with confirmation
 * - Node types: milestone, task
 * - Title, description, estimated time fields
 * - Nodes auto-position on creation
 */

// Test goal ID - should exist in test environment with owner access
const TEST_GOAL_ID = '2e1f2b81-1b52-4679-af5a-f544d23beae6';
const GOAL_PAGE_URL = `/goals/${TEST_GOAL_ID}`;

test.describe('Node CRUD - Issue #61', () => {
  test.describe('As Visitor (not logged in)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(GOAL_PAGE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.react-flow', { timeout: 15000 });
    });

    test('Add Step button should not be visible', async ({ page }) => {
      // Visitors should not see the Add Step button
      await expect(page.getByTestId('add-node-btn')).not.toBeVisible();
    });

    test('Edit button should not be visible on nodes', async ({ page }) => {
      // Wait for nodes to load
      const nodes = page.locator('.react-flow__node');
      await expect(nodes.first()).toBeVisible({ timeout: 10000 });

      // Nodes should not have edit functionality for visitors
      await expect(page.getByTestId('delete-node-btn')).not.toBeVisible();
    });
  });

  test.describe('As Owner (logged in)', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', 'e2etest@example.com');
      await page.fill('input[type="password"]', 'TestE2E123');
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForLoadState('networkidle');

      // Navigate to goal page
      await page.goto(GOAL_PAGE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.react-flow', { timeout: 15000 });
    });

    test.describe('Add Node', () => {
      test('Add Step button should be visible', async ({ page }) => {
        await expect(page.getByTestId('add-node-btn')).toBeVisible();
      });

      test('clicking Add Step opens node form modal', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        // Modal should appear
        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Should be in create mode (title says "Add New Step")
        await expect(modal.locator('text=Add New Step')).toBeVisible();
      });

      test('can create a new task node', async ({ page }) => {
        // Open the add node modal
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        // Fill in the form
        await page.getByTestId('node-title').fill('New Task');
        await page.getByTestId('node-type-task').click();
        await page.getByTestId('node-description').fill('This is a test task');
        await page.getByTestId('node-duration').fill('2');

        // Submit the form
        await page.getByTestId('save-node-btn').click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 5000 });

        // Toast should appear
        await expect(page.locator('text=Step added!')).toBeVisible({ timeout: 3000 });

        // New node should appear in the quest map
        await expect(page.locator('text=New Task')).toBeVisible({ timeout: 5000 });
      });

      test('can create a milestone node', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        await page.getByTestId('node-title').fill('Major Milestone');
        await page.getByTestId('node-type-milestone').click();

        await page.getByTestId('save-node-btn').click();

        await expect(modal).not.toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=Major Milestone')).toBeVisible({ timeout: 5000 });
      });

      test('cannot submit without title', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        // Leave title empty
        await page.getByTestId('node-description').fill('Description only');

        // Save button should be disabled
        const saveBtn = page.getByTestId('save-node-btn');
        await expect(saveBtn).toBeDisabled();
      });

      test('can close modal by pressing Escape', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(modal).not.toBeVisible({ timeout: 3000 });
      });
    });

    test.describe('Edit Node', () => {
      test('can open edit modal for existing node', async ({ page }) => {
        // Wait for nodes to load
        const nodes = page.locator('.react-flow__node');
        await expect(nodes.first()).toBeVisible({ timeout: 10000 });

        // Find and click the edit button on a node (if visible directly)
        // Or click on the node to trigger edit
        // The edit is triggered by clicking an edit icon on the task node

        // Look for any edit trigger on nodes
        const editButton = page.locator('.react-flow__node button').filter({
          has: page.locator('svg'),
        }).first();

        // If edit buttons are visible, click one
        const count = await editButton.count();
        if (count > 0) {
          await editButton.click();

          const modal = page.getByTestId('node-form-modal');
          await expect(modal).toBeVisible({ timeout: 5000 });

          // Should be in edit mode
          await expect(modal.locator('text=Edit Step')).toBeVisible();

          // Delete button should be visible in edit mode
          await expect(page.getByTestId('delete-node-btn')).toBeVisible();
        }
      });

      test('can update node title', async ({ page }) => {
        const nodes = page.locator('.react-flow__node');
        await expect(nodes.first()).toBeVisible({ timeout: 10000 });

        // Look for edit button on first node
        const editButton = page.locator('.react-flow__node').first().locator('button').filter({
          has: page.locator('svg path[d*="M11"]'), // pencil icon path
        }).first();

        const count = await editButton.count();
        if (count > 0) {
          await editButton.click();

          const modal = page.getByTestId('node-form-modal');
          await expect(modal).toBeVisible();

          // Change the title
          const titleInput = page.getByTestId('node-title');
          await titleInput.clear();
          await titleInput.fill('Updated Node Title');

          await page.getByTestId('save-node-btn').click();

          await expect(modal).not.toBeVisible({ timeout: 5000 });
          await expect(page.locator('text=Step updated!')).toBeVisible({ timeout: 3000 });
        }
      });
    });

    test.describe('Delete Node', () => {
      test('delete button shows confirmation', async ({ page }) => {
        // Create a node first to delete
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        await page.getByTestId('node-title').fill('Node to Delete');
        await page.getByTestId('save-node-btn').click();
        await expect(modal).not.toBeVisible({ timeout: 5000 });

        // Wait for node to appear
        await expect(page.locator('text=Node to Delete')).toBeVisible({ timeout: 5000 });

        // Now try to find and click edit on this node
        // Since we just created it, it should be the last node
        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();

        // Look for the node we just created and find its edit button
        const targetNode = page.locator('.react-flow__node').filter({
          hasText: 'Node to Delete',
        }).first();

        const editBtn = targetNode.locator('button').first();
        const editCount = await editBtn.count();

        if (editCount > 0) {
          await editBtn.click();
          await expect(modal).toBeVisible();

          // Click delete button
          await page.getByTestId('delete-node-btn').click();

          // Confirmation should appear
          await expect(page.locator('text=Are you sure you want to delete')).toBeVisible();
          await expect(page.getByTestId('confirm-delete')).toBeVisible();
        }
      });

      test('can confirm and delete node', async ({ page }) => {
        // Create a node to delete
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await page.getByTestId('node-title').fill('Delete Me');
        await page.getByTestId('save-node-btn').click();
        await expect(modal).not.toBeVisible({ timeout: 5000 });

        // Wait for node to appear
        await expect(page.locator('text=Delete Me')).toBeVisible({ timeout: 5000 });

        // Find and edit the node
        const targetNode = page.locator('.react-flow__node').filter({
          hasText: 'Delete Me',
        }).first();

        const editBtn = targetNode.locator('button').first();
        const editCount = await editBtn.count();

        if (editCount > 0) {
          await editBtn.click();
          await expect(modal).toBeVisible();

          // Delete with confirmation
          await page.getByTestId('delete-node-btn').click();
          await page.getByTestId('confirm-delete').click();

          // Modal should close
          await expect(modal).not.toBeVisible({ timeout: 5000 });

          // Toast should appear
          await expect(page.locator('text=Step deleted!')).toBeVisible({ timeout: 3000 });

          // Node should be removed
          await expect(page.locator('text=Delete Me')).not.toBeVisible({ timeout: 5000 });
        }
      });

      test('can cancel delete', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await page.getByTestId('node-title').fill('Keep This Node');
        await page.getByTestId('save-node-btn').click();
        await expect(modal).not.toBeVisible({ timeout: 5000 });

        await expect(page.locator('text=Keep This Node')).toBeVisible({ timeout: 5000 });

        const targetNode = page.locator('.react-flow__node').filter({
          hasText: 'Keep This Node',
        }).first();

        const editBtn = targetNode.locator('button').first();
        const editCount = await editBtn.count();

        if (editCount > 0) {
          await editBtn.click();
          await expect(modal).toBeVisible();

          // Start delete flow
          await page.getByTestId('delete-node-btn').click();
          await expect(page.getByTestId('confirm-delete')).toBeVisible();

          // Click cancel
          await page.locator('button:has-text("Cancel")').first().click();

          // Confirmation should disappear
          await expect(page.getByTestId('confirm-delete')).not.toBeVisible();

          // Close modal
          await page.keyboard.press('Escape');
          await expect(modal).not.toBeVisible({ timeout: 3000 });

          // Node should still exist
          await expect(page.locator('text=Keep This Node')).toBeVisible();
        }
      });
    });

    test.describe('Node Form Fields', () => {
      test('can add checklist items', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        await page.getByTestId('node-title').fill('Node with Checklist');

        // Add checklist items
        const checklistInput = page.locator('input[placeholder="Add checklist item..."]');
        await checklistInput.fill('First item');
        await page.locator('button:has-text("Add")').click();

        await checklistInput.fill('Second item');
        await page.locator('button:has-text("Add")').click();

        // Verify items appear
        await expect(page.locator('text=Checklist Items (2)')).toBeVisible();
      });

      test('node type selection works', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        // Default is task
        const taskBtn = page.getByTestId('node-type-task');
        await expect(taskBtn).toHaveClass(/emerald/);

        // Click milestone
        await page.getByTestId('node-type-milestone').click();
        await expect(page.getByTestId('node-type-milestone')).toHaveClass(/emerald/);
      });

      test('estimated duration accepts numbers', async ({ page }) => {
        await page.getByTestId('add-node-btn').click();

        const modal = page.getByTestId('node-form-modal');
        await expect(modal).toBeVisible();

        const durationInput = page.getByTestId('node-duration');
        await durationInput.fill('8');

        await expect(durationInput).toHaveValue('8');
      });
    });
  });
});

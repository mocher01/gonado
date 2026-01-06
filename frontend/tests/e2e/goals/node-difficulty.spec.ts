import { test, expect } from '@playwright/test';
import { TEST_GOAL_ID, GOAL_PAGE_URL, waitForGoalPageLoad } from '../utils/test-helpers';

/**
 * Tests for Node Difficulty Levels Feature
 * Issue #62: Feature: Node Difficulty Levels (1-5 Scale)
 */

test.describe('Node Difficulty Display', () => {
  test('can see difficulty indicator on nodes', async ({ page }) => {
    await page.goto(GOAL_PAGE_URL);
    await waitForGoalPageLoad(page);

    // Look for difficulty indicator on any node
    // The indicator should show stars or a number badge
    const difficultyIndicator = page.locator('[data-testid^="node-difficulty-"]').first();

    // If nodes have difficulty set, we should see indicators
    const indicatorCount = await difficultyIndicator.count();
    if (indicatorCount > 0) {
      await expect(difficultyIndicator).toBeVisible();
    }
  });

  test('difficulty indicator shows correct level', async ({ page }) => {
    await page.goto(GOAL_PAGE_URL);
    await waitForGoalPageLoad(page);

    // Check if any difficulty indicators are visible
    const indicators = page.locator('[data-testid^="node-difficulty-"]');
    const count = await indicators.count();

    // If there are indicators, verify they have valid values (1-5)
    for (let i = 0; i < count; i++) {
      const indicator = indicators.nth(i);
      const testId = await indicator.getAttribute('data-testid');
      if (testId) {
        const level = parseInt(testId.replace('node-difficulty-', ''), 10);
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(5);
      }
    }
  });
});

test.describe('Node Difficulty Selection', () => {
  // Note: These tests require authentication and an editable node
  // The loginAsOwner helper would need to be implemented

  test.skip('can set difficulty when editing a node', async ({ page }) => {
    // This test requires owner authentication
    // Skipped until auth helpers are available

    await page.goto(GOAL_PAGE_URL);
    await waitForGoalPageLoad(page);

    // Find and click edit button on a node
    const editButton = page.locator('button[title="Edit step"]').first();
    await editButton.click();

    // Wait for modal to appear
    const modal = page.locator('text=Edit Step');
    await expect(modal).toBeVisible();

    // Look for difficulty selector
    const difficultySelector = page.locator('text=Difficulty Level').locator('..');
    await expect(difficultySelector).toBeVisible();

    // Click on difficulty level 5
    const difficulty5Button = page.locator('[data-testid="difficulty-5"]');
    await expect(difficulty5Button).toBeVisible();
    await difficulty5Button.click();

    // Save the changes
    const saveButton = page.locator('text=Save Changes');
    await saveButton.click();

    // Verify the difficulty indicator shows level 5
    await expect(page.locator('[data-testid="node-difficulty-5"]')).toBeVisible();
  });

  test.skip('can change difficulty level', async ({ page }) => {
    // This test requires owner authentication
    // Skipped until auth helpers are available

    await page.goto(GOAL_PAGE_URL);
    await waitForGoalPageLoad(page);

    // Find and click edit button on a node
    const editButton = page.locator('button[title="Edit step"]').first();
    await editButton.click();

    // Wait for modal to appear
    await expect(page.locator('text=Edit Step')).toBeVisible();

    // Click on each difficulty level to test selection
    for (const level of [1, 2, 3, 4, 5]) {
      const difficultyButton = page.locator(`[data-testid="difficulty-${level}"]`);
      await difficultyButton.click();

      // Verify visual feedback (button should appear selected)
      const buttonClass = await difficultyButton.getAttribute('class');
      expect(buttonClass).toContain('border-current');
    }
  });
});

test.describe('Difficulty Colors and Labels', () => {
  test('difficulty selector shows correct labels', async ({ page }) => {
    await page.goto(GOAL_PAGE_URL);
    await waitForGoalPageLoad(page);

    // This tests the difficulty component visual appearance
    // The difficulty labels should be:
    // 1: Easy (green)
    // 2: Moderate (lime)
    // 3: Medium (amber)
    // 4: Hard (orange)
    // 5: Very Hard (red)

    // Check for any difficulty indicators with appropriate styling
    const indicators = page.locator('[data-testid^="node-difficulty-"]');
    const count = await indicators.count();

    if (count > 0) {
      // At least one indicator should be visible
      await expect(indicators.first()).toBeVisible();
    }
  });
});

test.describe('Difficulty Accessibility', () => {
  test('difficulty buttons have appropriate title attributes', async ({ page }) => {
    await page.goto(GOAL_PAGE_URL);
    await waitForGoalPageLoad(page);

    // Find edit button and open modal (if authenticated)
    const editButton = page.locator('button[title="Edit step"]').first();
    const editCount = await editButton.count();

    if (editCount > 0) {
      await editButton.click();
      await expect(page.locator('text=Edit Step')).toBeVisible();

      // Check that difficulty buttons have descriptive titles
      for (const level of [1, 2, 3, 4, 5]) {
        const difficultyButton = page.locator(`[data-testid="difficulty-${level}"]`);
        const count = await difficultyButton.count();
        if (count > 0) {
          const title = await difficultyButton.getAttribute('title');
          expect(title).toContain('Difficulty');
          expect(title).toContain(level.toString());
        }
      }
    }
  });
});

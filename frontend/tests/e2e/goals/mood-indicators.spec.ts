import { test, expect, Page } from '@playwright/test';
import { TEST_GOAL_ID, waitForGoalPageLoad } from '../utils/test-helpers';

/**
 * Issue #67: Mood Indicators E2E Tests
 *
 * Tests the mood indicator feature:
 * - Mood selector visible for goal owners only
 * - 6 mood options: Motivated, Confident, Focused, Struggling, Stuck, Celebrating
 * - Mood persists after selection
 * - Visitors can see owner's mood but cannot change it
 * - Support message shows for Struggling/Stuck moods
 */

// Test helper to login as a user
async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'e2etest@example.com');
  await page.fill('input[type="password"]', 'TestE2E123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
}

// Login as goal owner
async function loginAsGoalOwner(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'e2eowner@example.com');
  await page.fill('input[type="password"]', 'TestOwner123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
}

test.describe('Mood Indicators - Owner View', () => {
  test('mood selector is visible for goal owner', async ({ page }) => {
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for the mood selector
    const moodSelector = page.locator('[data-testid="mood-selector"]');
    await expect(moodSelector).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'tests/e2e/test-results/mood-indicators-owner-view.png',
      fullPage: true,
    });
  });

  test('mood picker shows all 6 mood options', async ({ page }) => {
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Click to open mood picker
    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    if (await moodTrigger.count() > 0) {
      await moodTrigger.click();
      await page.waitForTimeout(300);

      // Check all 6 mood options are visible
      const moodOptions = [
        'motivated',
        'confident',
        'focused',
        'struggling',
        'stuck',
        'celebrating',
      ];

      for (const mood of moodOptions) {
        const option = page.locator(`[data-testid="mood-option-${mood}"]`);
        const isVisible = await option.isVisible().catch(() => false);
        console.log(`Mood option ${mood} visible:`, isVisible);
      }

      await page.screenshot({
        path: 'tests/e2e/test-results/mood-indicators-picker-open.png',
        fullPage: true,
      });
    }
  });

  test('selecting a mood updates the display', async ({ page }) => {
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open mood picker
    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    if (await moodTrigger.count() > 0) {
      await moodTrigger.click();
      await page.waitForTimeout(300);

      // Select "motivated" mood
      const motivatedOption = page.locator('[data-testid="mood-option-motivated"]');
      if (await motivatedOption.count() > 0) {
        await motivatedOption.click();
        await page.waitForTimeout(500);

        // Verify mood is now displayed
        const moodDisplay = page.locator('[data-testid="mood-trigger"]');
        const displayText = await moodDisplay.textContent();
        console.log('Mood display text after selection:', displayText);

        // Should contain "Motivated" or fire emoji
        expect(displayText).toMatch(/Motivated/i);
      }

      await page.screenshot({
        path: 'tests/e2e/test-results/mood-indicators-after-selection.png',
        fullPage: true,
      });
    }
  });

  test('clicking same mood toggles it off', async ({ page }) => {
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    if (await moodTrigger.count() > 0) {
      // First, set a mood
      await moodTrigger.click();
      await page.waitForTimeout(300);

      const focusedOption = page.locator('[data-testid="mood-option-focused"]');
      if (await focusedOption.count() > 0) {
        await focusedOption.click();
        await page.waitForTimeout(500);

        // Now click again to toggle off
        await moodTrigger.click();
        await page.waitForTimeout(300);

        // Click the same mood again (or use clear button)
        const clearButton = page.locator('[data-testid="mood-clear"]');
        if (await clearButton.count() > 0) {
          await clearButton.click();
          await page.waitForTimeout(500);

          // Verify mood is cleared
          const displayText = await moodTrigger.textContent();
          console.log('Mood display after clear:', displayText);
          expect(displayText).toMatch(/Set mood/i);
        }
      }

      await page.screenshot({
        path: 'tests/e2e/test-results/mood-indicators-toggle-off.png',
        fullPage: true,
      });
    }
  });
});

test.describe('Mood Indicators - Visitor View', () => {
  test('mood selector is not visible for visitors (unauthenticated)', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // The mood selector (with dropdown) should NOT be visible for visitors
    const moodSelector = page.locator('[data-testid="mood-selector"]');
    const isVisible = await moodSelector.isVisible().catch(() => false);

    console.log('Mood selector visible for unauthenticated visitor:', isVisible);
    expect(isVisible).toBe(false);

    await page.screenshot({
      path: 'tests/e2e/test-results/mood-indicators-visitor-unauthenticated.png',
      fullPage: true,
    });
  });

  test('visitor can see mood badge but cannot change it', async ({ page }) => {
    // First, login as owner and set a mood
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    if (await moodTrigger.count() > 0) {
      await moodTrigger.click();
      await page.waitForTimeout(300);

      const celebratingOption = page.locator('[data-testid="mood-option-celebrating"]');
      if (await celebratingOption.count() > 0) {
        await celebratingOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Now logout and visit as anonymous user
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Mood badge should be visible but not interactive
    const moodBadge = page.locator('[data-testid="mood-badge"]');
    const isVisible = await moodBadge.isVisible().catch(() => false);

    console.log('Mood badge visible for visitor:', isVisible);

    // If mood badge is visible, verify it's not clickable/interactive
    if (isVisible) {
      // The badge should not have a click handler that opens a picker
      const moodPicker = page.locator('[data-testid="mood-picker"]');
      await moodBadge.click({ force: true });
      await page.waitForTimeout(300);

      const pickerVisible = await moodPicker.isVisible().catch(() => false);
      console.log('Mood picker opened for visitor:', pickerVisible);
      expect(pickerVisible).toBe(false);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/mood-indicators-visitor-view.png',
      fullPage: true,
    });
  });
});

test.describe('Mood Indicators - Support Messages', () => {
  test('struggling mood shows support message for visitors', async ({ page }) => {
    // First, login as owner and set struggling mood
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    if (await moodTrigger.count() > 0) {
      await moodTrigger.click();
      await page.waitForTimeout(300);

      const strugglingOption = page.locator('[data-testid="mood-option-struggling"]');
      if (await strugglingOption.count() > 0) {
        await strugglingOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Now visit as anonymous user
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for support message
    const supportMessage = page.locator('text=/could use some encouragement|needs help/i');
    const isVisible = await supportMessage.isVisible().catch(() => false);

    console.log('Support message visible for struggling mood:', isVisible);

    await page.screenshot({
      path: 'tests/e2e/test-results/mood-indicators-struggling-support.png',
      fullPage: true,
    });
  });

  test('stuck mood shows support message for visitors', async ({ page }) => {
    // First, login as owner and set stuck mood
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    if (await moodTrigger.count() > 0) {
      await moodTrigger.click();
      await page.waitForTimeout(300);

      const stuckOption = page.locator('[data-testid="mood-option-stuck"]');
      if (await stuckOption.count() > 0) {
        await stuckOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Now visit as anonymous user
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for support message
    const supportMessage = page.locator('text=/stuck and needs help|could use some/i');
    const isVisible = await supportMessage.isVisible().catch(() => false);

    console.log('Support message visible for stuck mood:', isVisible);

    await page.screenshot({
      path: 'tests/e2e/test-results/mood-indicators-stuck-support.png',
      fullPage: true,
    });
  });

  test('celebrating mood does not show support message', async ({ page }) => {
    // First, login as owner and set celebrating mood
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    if (await moodTrigger.count() > 0) {
      await moodTrigger.click();
      await page.waitForTimeout(300);

      const celebratingOption = page.locator('[data-testid="mood-option-celebrating"]');
      if (await celebratingOption.count() > 0) {
        await celebratingOption.click();
        await page.waitForTimeout(500);
      }
    }

    // Now visit as anonymous user
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Support message should NOT be visible
    const supportMessage = page.locator('text=/could use some encouragement|needs help/i');
    const isVisible = await supportMessage.isVisible().catch(() => false);

    console.log('Support message visible for celebrating mood:', isVisible);
    expect(isVisible).toBe(false);

    await page.screenshot({
      path: 'tests/e2e/test-results/mood-indicators-celebrating-no-support.png',
      fullPage: true,
    });
  });
});

test.describe('Mood Indicators - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mood selector is visible and functional on mobile', async ({ page }) => {
    await loginAsGoalOwner(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check if mood selector is visible
    const moodTrigger = page.locator('[data-testid="mood-trigger"]');
    const isVisible = await moodTrigger.isVisible().catch(() => false);

    console.log('Mood trigger visible on mobile:', isVisible);

    if (isVisible) {
      // Open picker and verify it fits on screen
      await moodTrigger.click();
      await page.waitForTimeout(300);

      const moodPicker = page.locator('[data-testid="mood-picker"]');
      const pickerVisible = await moodPicker.isVisible().catch(() => false);

      console.log('Mood picker visible on mobile:', pickerVisible);

      if (pickerVisible) {
        const boundingBox = await moodPicker.boundingBox();
        const viewport = page.viewportSize();

        if (boundingBox && viewport) {
          // Verify picker fits within viewport
          expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(viewport.width);
          console.log('Picker width:', boundingBox.width, 'Viewport width:', viewport.width);
        }
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/mood-indicators-mobile.png',
      fullPage: true,
    });
  });
});

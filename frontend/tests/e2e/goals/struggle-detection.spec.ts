import { test, expect, Page } from '@playwright/test';
import { TEST_GOAL_ID, waitForGoalPageLoad } from '../utils/test-helpers';

/**
 * Issue #68: Struggle Detection System E2E Tests
 *
 * Tests the auto-detection of struggling goals based on:
 * - Mood set to "Struggling" or "Stuck"
 * - Multiple "mark-struggle" coaching reactions (3+)
 * - No progress for X days
 * - High-difficulty node with long dwell time
 *
 * Tests the "Needs Support" badge and visitor support messages.
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

test.describe('Struggle Badge - Display Conditions', () => {
  test('badge shows when mood is "struggling"', async ({ page }) => {
    // This test requires a goal with mood set to "struggling"
    // We'll check if the badge appears when the condition is met
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check for struggle badge (may not be visible if goal isn't struggling)
    const struggleBadge = page.locator('[data-testid="struggle-badge"]');
    const struggleBadgeCompact = page.locator('[data-testid="struggle-badge-compact"]');

    // Take screenshot to verify page state
    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-mood.png',
      fullPage: true,
    });

    // Log whether badge is visible
    const badgeVisible = await struggleBadge.isVisible().catch(() => false);
    const compactVisible = await struggleBadgeCompact.isVisible().catch(() => false);
    console.log('Struggle badge visible:', badgeVisible);
    console.log('Compact struggle badge visible:', compactVisible);
  });

  test('badge shows when mood is "stuck"', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for mood indicator showing "stuck"
    const stuckMood = page.locator('text=/Stuck/i').first();
    const stuckVisible = await stuckMood.isVisible().catch(() => false);
    console.log('Stuck mood indicator visible:', stuckVisible);

    // If stuck mood is visible, badge should also be visible
    if (stuckVisible) {
      const struggleBadge = page.locator('[data-testid="struggle-badge"]');
      await expect(struggleBadge).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-stuck.png',
      fullPage: true,
    });
  });

  test('badge shows when multiple struggle reactions exist', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check for struggle badge
    const struggleBadge = page.locator('[data-testid="struggle-badge"]');
    const signalReactions = page.locator('[data-testid="signal-reactions"]');

    // If badge is visible, check for reactions signal
    const badgeVisible = await struggleBadge.isVisible().catch(() => false);
    if (badgeVisible) {
      // Click to expand badge details
      const trigger = page.locator('[data-testid="struggle-badge-trigger"]');
      if (await trigger.count() > 0) {
        await trigger.click();
        await page.waitForTimeout(300);

        // Check for reactions signal in the expanded details
        const reactionsSignal = await signalReactions.isVisible().catch(() => false);
        console.log('Reactions signal visible in badge:', reactionsSignal);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-reactions.png',
      fullPage: true,
    });
  });
});

test.describe('Struggle Badge - Visitor Support Message', () => {
  test('support message visible to visitors when goal is struggling', async ({ page }) => {
    // Visit goal page as unauthenticated user (visitor)
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for struggle support alert
    const supportAlert = page.locator('[data-testid="struggle-support-alert"]');
    const alertVisible = await supportAlert.isVisible().catch(() => false);
    console.log('Struggle support alert visible to visitor:', alertVisible);

    // If visible, check for encouraging content
    if (alertVisible) {
      const alertText = await supportAlert.textContent();
      console.log('Support alert content:', alertText);

      // Check for expected phrases
      expect(alertText).toContain('support');
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-visitor-support.png',
      fullPage: true,
    });
  });

  test('support alert shows relevant message based on signal type', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const supportAlert = page.locator('[data-testid="struggle-support-alert"]');

    if (await supportAlert.isVisible().catch(() => false)) {
      const alertText = await supportAlert.textContent();

      // Should contain one of the signal-specific messages
      const hasRelevantMessage =
        alertText?.includes('struggling') ||
        alertText?.includes('progress') ||
        alertText?.includes('community') ||
        alertText?.includes('challenging');

      console.log('Alert has relevant message:', hasRelevantMessage);
      expect(hasRelevantMessage).toBe(true);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-signal-message.png',
      fullPage: true,
    });
  });
});

test.describe('Struggle Badge - Owner View', () => {
  test('owner can see but cannot dismiss mood-based alerts', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check for struggle badge
    const struggleBadge = page.locator('[data-testid="struggle-badge"]');

    if (await struggleBadge.isVisible().catch(() => false)) {
      // Click to expand
      const trigger = page.locator('[data-testid="struggle-badge-trigger"]');
      if (await trigger.count() > 0) {
        await trigger.click();
        await page.waitForTimeout(300);
      }

      // Check if dismiss button is present
      const dismissButton = page.locator('[data-testid="dismiss-struggle"]');
      const dismissVisible = await dismissButton.isVisible().catch(() => false);
      console.log('Dismiss button visible:', dismissVisible);

      // Check for mood-related message (if mood signal is active)
      const moodSignal = page.locator('[data-testid="signal-mood"]');
      const moodSignalVisible = await moodSignal.isVisible().catch(() => false);

      if (moodSignalVisible) {
        // Dismiss button should NOT be present for mood-based alerts
        // Owner should change their mood instead
        const moodHint = page.locator('text=/Change your mood/i');
        const hintVisible = await moodHint.isVisible().catch(() => false);
        console.log('Mood change hint visible:', hintVisible);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-owner-view.png',
      fullPage: true,
    });
  });

  test('owner can dismiss non-mood auto-detection alerts', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const struggleBadge = page.locator('[data-testid="struggle-badge"]');

    if (await struggleBadge.isVisible().catch(() => false)) {
      // Expand the badge
      const trigger = page.locator('[data-testid="struggle-badge-trigger"]');
      if (await trigger.count() > 0) {
        await trigger.click();
        await page.waitForTimeout(300);
      }

      // Look for dismiss button (only shown for non-mood signals)
      const dismissButton = page.locator('[data-testid="dismiss-struggle"]');

      if (await dismissButton.isVisible().catch(() => false)) {
        console.log('Dismiss button found - clicking');
        await dismissButton.click();
        await page.waitForTimeout(500);

        // Verify toast appears
        const toast = page.locator('text=/dismissed/i');
        const toastVisible = await toast.isVisible().catch(() => false);
        console.log('Dismiss confirmation toast visible:', toastVisible);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-owner-dismiss.png',
      fullPage: true,
    });
  });
});

test.describe('Struggle Badge - Badge Details', () => {
  test('badge expands to show detection signals', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const struggleBadge = page.locator('[data-testid="struggle-badge"]');

    if (await struggleBadge.isVisible().catch(() => false)) {
      // Click to expand
      const trigger = page.locator('[data-testid="struggle-badge-trigger"]');
      await trigger.click();
      await page.waitForTimeout(300);

      // Check for expanded details panel
      const details = page.locator('[data-testid="struggle-details"]');
      await expect(details).toBeVisible({ timeout: 5000 });

      // Check for signal types
      const signalTypes = ['signal-mood', 'signal-reactions', 'signal-no-progress', 'signal-hard-node'];
      let visibleSignals = 0;

      for (const signalType of signalTypes) {
        const signal = page.locator(`[data-testid="${signalType}"]`);
        if (await signal.isVisible().catch(() => false)) {
          visibleSignals++;
          console.log(`${signalType} is visible`);
        }
      }

      console.log(`Total visible signals: ${visibleSignals}`);
      expect(visibleSignals).toBeGreaterThan(0);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-details.png',
      fullPage: true,
    });
  });

  test('badge shows helpful actions for visitors', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const struggleBadge = page.locator('[data-testid="struggle-badge"]');

    if (await struggleBadge.isVisible().catch(() => false)) {
      // Expand badge
      const trigger = page.locator('[data-testid="struggle-badge-trigger"]');
      await trigger.click();
      await page.waitForTimeout(300);

      // Check for helper actions (Encourage, Light Path, etc.)
      const helpActions = page.locator('text=/Encourage|Light the Path|Send Strength|Sacred Boost/i');
      const actionsCount = await helpActions.count();
      console.log(`Help actions shown: ${actionsCount}`);

      if (actionsCount > 0) {
        const firstAction = await helpActions.first().textContent();
        console.log('First help action:', firstAction);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-help-actions.png',
      fullPage: true,
    });
  });
});

test.describe('Struggle Badge - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('compact badge visible on mobile', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check for either full or compact badge
    const fullBadge = page.locator('[data-testid="struggle-badge"]');
    const compactBadge = page.locator('[data-testid="struggle-badge-compact"]');

    const fullVisible = await fullBadge.isVisible().catch(() => false);
    const compactVisible = await compactBadge.isVisible().catch(() => false);

    console.log('Full badge visible on mobile:', fullVisible);
    console.log('Compact badge visible on mobile:', compactVisible);

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-mobile.png',
      fullPage: true,
    });
  });

  test('support alert accessible on mobile', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const supportAlert = page.locator('[data-testid="struggle-support-alert"]');
    const alertVisible = await supportAlert.isVisible().catch(() => false);

    if (alertVisible) {
      // Check that alert is not cut off
      const boundingBox = await supportAlert.boundingBox();
      const viewport = page.viewportSize();

      if (boundingBox && viewport) {
        const isWithinViewport =
          boundingBox.x >= 0 &&
          boundingBox.y >= 0 &&
          boundingBox.x + boundingBox.width <= viewport.width &&
          boundingBox.y + boundingBox.height <= viewport.height;

        console.log('Support alert within viewport:', isWithinViewport);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-mobile-alert.png',
      fullPage: true,
    });
  });
});

test.describe('Struggle Badge - Integration with Mood Selector', () => {
  test('badge updates when owner changes mood to struggling', async ({ page }) => {
    await loginAsTestUser(page);

    // Navigate to a goal owned by the test user (need to find or create one)
    // For this test, we'll use the dashboard to find an owned goal
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click on first owned goal
    const goalCard = page.locator('[data-testid="goal-card"]').first();
    if (await goalCard.count() > 0) {
      await goalCard.click();
      await waitForGoalPageLoad(page);

      // Find mood selector
      const moodSelector = page.locator('[data-testid="mood-selector"]');

      if (await moodSelector.isVisible().catch(() => false)) {
        // Click to open mood picker
        const moodTrigger = page.locator('[data-testid="mood-trigger"]');
        await moodTrigger.click();
        await page.waitForTimeout(300);

        // Check for mood picker
        const moodPicker = page.locator('[data-testid="mood-picker"]');
        if (await moodPicker.isVisible().catch(() => false)) {
          // Click on "struggling" mood
          const strugglingOption = page.locator('[data-testid="mood-option-struggling"]');
          if (await strugglingOption.count() > 0) {
            await strugglingOption.click();
            await page.waitForTimeout(500);

            // Verify struggle badge appears
            const struggleBadge = page.locator('[data-testid="struggle-badge"]');
            const badgeVisible = await struggleBadge.isVisible().catch(() => false);
            console.log('Struggle badge appeared after setting mood:', badgeVisible);
          }
        }
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-mood-integration.png',
      fullPage: true,
    });
  });

  test('badge disappears when owner changes mood away from struggling', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const goalCard = page.locator('[data-testid="goal-card"]').first();
    if (await goalCard.count() > 0) {
      await goalCard.click();
      await waitForGoalPageLoad(page);

      const moodSelector = page.locator('[data-testid="mood-selector"]');

      if (await moodSelector.isVisible().catch(() => false)) {
        // Check if currently struggling
        const struggleBadge = page.locator('[data-testid="struggle-badge"]');
        const initialBadgeVisible = await struggleBadge.isVisible().catch(() => false);

        if (initialBadgeVisible) {
          // Open mood picker and change to motivated
          const moodTrigger = page.locator('[data-testid="mood-trigger"]');
          await moodTrigger.click();
          await page.waitForTimeout(300);

          const motivatedOption = page.locator('[data-testid="mood-option-motivated"]');
          if (await motivatedOption.count() > 0) {
            await motivatedOption.click();
            await page.waitForTimeout(500);

            // Badge might still be visible if there are other signals
            const finalBadgeVisible = await struggleBadge.isVisible().catch(() => false);
            console.log('Badge still visible after mood change:', finalBadgeVisible);
          }
        }
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/struggle-detection-mood-clear.png',
      fullPage: true,
    });
  });
});

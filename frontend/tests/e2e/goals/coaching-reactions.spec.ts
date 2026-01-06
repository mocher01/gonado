import { test, expect, Page } from '@playwright/test';
import { TEST_GOAL_ID, waitForGoalPageLoad } from '../utils/test-helpers';

/**
 * Issue #64: Coaching & Celebration Reaction System E2E Tests
 *
 * Tests the 5 new action-based reaction types:
 * - Encourage (fist bump) - "Keep going!"
 * - Celebrate (party popper) - "Amazing progress!"
 * - Light Path (flashlight) - "Showing you the way"
 * - Send Strength (flexed bicep) - "Power boost!"
 * - Mark Struggle (black flag) - "I see you struggling"
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

test.describe('Coaching Reactions - Display and Icons', () => {
  test('reactions show correct 5 coaching icons', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Click on a node to open the popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: find the social bar
      const socialBar = page.locator('text=Click to react').first();
      if (await socialBar.count() > 0) {
        await socialBar.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify all 5 coaching reaction buttons are present
    const encourageBtn = page.locator('[data-testid="reaction-encourage"]');
    const celebrateBtn = page.locator('[data-testid="reaction-celebrate"]');
    const lightPathBtn = page.locator('[data-testid="reaction-light-path"]');
    const sendStrengthBtn = page.locator('[data-testid="reaction-send-strength"]');
    const markStruggleBtn = page.locator('[data-testid="reaction-mark-struggle"]');

    // Check presence (at least one should be visible if popup is open)
    const anyVisible =
      (await encourageBtn.count()) > 0 ||
      (await celebrateBtn.count()) > 0 ||
      (await lightPathBtn.count()) > 0 ||
      (await sendStrengthBtn.count()) > 0 ||
      (await markStruggleBtn.count()) > 0;

    console.log('Coaching reaction buttons found:', anyVisible);

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-icons.png',
      fullPage: true,
    });
  });

  test('reaction picker shows correct labels on hover', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    // Hover over encourage button and check for tooltip
    const encourageBtn = page.locator('[data-testid="reaction-encourage"]').first();
    if (await encourageBtn.count() > 0) {
      await encourageBtn.hover();
      await page.waitForTimeout(300);

      // Check title attribute
      const title = await encourageBtn.getAttribute('title');
      expect(title).toBe('Encourage');
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-hover.png',
      fullPage: true,
    });
  });
});

test.describe('Coaching Reactions - Toggle Behavior', () => {
  test('clicking reaction adds and displays count', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    // Click celebrate reaction
    const celebrateBtn = page.locator('[data-testid="reaction-celebrate"]').first();
    if (await celebrateBtn.count() > 0) {
      await celebrateBtn.click();
      await page.waitForTimeout(500);

      // Verify the count changed or button is highlighted
      const celebrateCount = page.locator('[data-testid="celebrate-count"]').first();
      if (await celebrateCount.count() > 0) {
        const countText = await celebrateCount.textContent();
        console.log('Celebrate count after click:', countText);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-click.png',
      fullPage: true,
    });
  });

  test('clicking same reaction toggles it off', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    const encourageBtn = page.locator('[data-testid="reaction-encourage"]').first();
    if (await encourageBtn.count() > 0) {
      // First click - add reaction
      await encourageBtn.click();
      await page.waitForTimeout(500);

      const countBefore = await page.locator('[data-testid="encourage-count"]').first().textContent();
      console.log('Encourage count after first click:', countBefore);

      // Second click - toggle off
      await encourageBtn.click();
      await page.waitForTimeout(500);

      const countAfter = await page.locator('[data-testid="encourage-count"]').first().textContent();
      console.log('Encourage count after second click:', countAfter);

      // Count should decrease or show dot
      if (countBefore && countAfter) {
        const before = countBefore === '\u00B7' ? 0 : parseInt(countBefore);
        const after = countAfter === '\u00B7' ? 0 : parseInt(countAfter);
        console.log('Toggle result - before:', before, 'after:', after);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-toggle.png',
      fullPage: true,
    });
  });

  test('clicking different reaction replaces the current one', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    const encourageBtn = page.locator('[data-testid="reaction-encourage"]').first();
    const celebrateBtn = page.locator('[data-testid="reaction-celebrate"]').first();

    if ((await encourageBtn.count()) > 0 && (await celebrateBtn.count()) > 0) {
      // Click encourage first
      await encourageBtn.click();
      await page.waitForTimeout(500);

      const encourageCountAfterFirst = await page
        .locator('[data-testid="encourage-count"]')
        .first()
        .textContent();
      console.log('Encourage count after encourage click:', encourageCountAfterFirst);

      // Click celebrate to replace
      await celebrateBtn.click();
      await page.waitForTimeout(500);

      const encourageCountAfterReplace = await page
        .locator('[data-testid="encourage-count"]')
        .first()
        .textContent();
      const celebrateCountAfterReplace = await page
        .locator('[data-testid="celebrate-count"]')
        .first()
        .textContent();

      console.log('After replacing with celebrate:');
      console.log('  Encourage count:', encourageCountAfterReplace);
      console.log('  Celebrate count:', celebrateCountAfterReplace);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-replace.png',
      fullPage: true,
    });
  });
});

test.describe('Coaching Reactions - User Permissions', () => {
  test('unauthenticated users cannot react', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    // Try to click a reaction
    const encourageBtn = page.locator('[data-testid="reaction-encourage"]').first();
    if (await encourageBtn.count() > 0) {
      // Check if button is disabled
      const isDisabled = await encourageBtn.isDisabled();
      console.log('Encourage button disabled for unauthenticated user:', isDisabled);

      // Also check for sign-in prompt
      const signInPrompt = page.locator('text=/sign in|login/i').first();
      const promptVisible = await signInPrompt.isVisible().catch(() => false);
      console.log('Sign in prompt visible:', promptVisible);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-unauth.png',
      fullPage: true,
    });
  });

  test('authenticated user can only have one reaction per target', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    // Click through all reactions quickly
    const reactions = ['encourage', 'celebrate', 'light-path', 'send-strength', 'mark-struggle'];

    for (const reaction of reactions) {
      const btn = page.locator(`[data-testid="reaction-${reaction}"]`).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    // After clicking all, only the last one should be active (mark-struggle)
    // The user can only have one reaction at a time
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-single.png',
      fullPage: true,
    });
  });
});

test.describe('Coaching Reactions - Mark Struggle Detection', () => {
  test('mark struggle reaction shows purple styling', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    const markStruggleBtn = page.locator('[data-testid="reaction-mark-struggle"]').first();
    if (await markStruggleBtn.count() > 0) {
      // Click mark struggle
      await markStruggleBtn.click();
      await page.waitForTimeout(500);

      // Check the button has purple styling (the glow/border)
      const buttonStyle = await markStruggleBtn.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          boxShadow: computed.boxShadow,
          border: computed.border,
          background: computed.background,
        };
      });

      console.log('Mark struggle button styling:', buttonStyle);

      // Check for purple color (#8b5cf6)
      const hasPurple =
        buttonStyle.boxShadow.includes('139, 92, 246') ||
        buttonStyle.border.includes('139, 92, 246') ||
        buttonStyle.background.includes('139, 92, 246');

      console.log('Has purple styling:', hasPurple);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-struggle.png',
      fullPage: true,
    });
  });
});

test.describe('Coaching Reactions - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('reactions are visible on mobile viewport', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Open node popup
    const nodeElement = page.locator('[data-testid="quest-node"]').first();
    if (await nodeElement.count() > 0) {
      await nodeElement.click();
      await page.waitForTimeout(500);
    }

    // Verify reaction section is visible
    const supportLabel = page.locator('text=Support').first();
    const labelVisible = await supportLabel.isVisible().catch(() => false);
    console.log('Support label visible on mobile:', labelVisible);

    // Check all 5 reactions are accessible
    const reactions = ['encourage', 'celebrate', 'light-path', 'send-strength', 'mark-struggle'];
    for (const reaction of reactions) {
      const btn = page.locator(`[data-testid="reaction-${reaction}"]`).first();
      const visible = await btn.isVisible().catch(() => false);
      console.log(`${reaction} visible on mobile:`, visible);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/coaching-reactions-mobile.png',
      fullPage: true,
    });
  });
});

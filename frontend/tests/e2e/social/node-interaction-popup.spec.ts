import { test, expect } from '@playwright/test';
import {
  waitForGoalPageLoad,
  clickOnNode,
  verifyPopupVisible,
  verifyPopupNotCutOff,
  closePopup,
  debugScreenshot,
} from '../utils/test-helpers';
import { TEST_GOALS, VIEWPORTS, UI_ELEMENTS } from '../fixtures/test-data';

/**
 * NodeInteractionPopup E2E Tests
 *
 * Tests the popup that appears when clicking on a node in the quest map.
 * Verifies visibility, sizing, scrolling behavior, and content.
 */

test.describe('NodeInteractionPopup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_GOALS.franceTripGoal.url);
    await waitForGoalPageLoad(page);
  });

  test.describe('Visibility & Layout', () => {
    test('popup appears when clicking on a node', async ({ page }) => {
      await clickOnNode(page, 0);

      const popup = await verifyPopupVisible(page);
      expect(popup).toBeTruthy();

      await debugScreenshot(page, 'popup-visible');
    });

    test('popup is fully visible and not cut off on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.reload();
      await waitForGoalPageLoad(page);

      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      await verifyPopupNotCutOff(page, popup);
      await debugScreenshot(page, 'popup-desktop-no-cutoff');
    });

    test('popup is fully visible on tablet viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.reload();
      await waitForGoalPageLoad(page);

      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      await verifyPopupNotCutOff(page, popup);
      await debugScreenshot(page, 'popup-tablet-no-cutoff');
    });

    test('popup is fully visible on mobile viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.reload();
      await waitForGoalPageLoad(page);

      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      await verifyPopupNotCutOff(page, popup);
      await debugScreenshot(page, 'popup-mobile-no-cutoff');
    });

    test('popup is fully visible on small mobile viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.smallMobile);
      await page.reload();
      await waitForGoalPageLoad(page);

      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      await verifyPopupNotCutOff(page, popup);
      await debugScreenshot(page, 'popup-small-mobile-no-cutoff');
    });

    test('popup respects max-height constraint', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      const boundingBox = await popup.boundingBox();
      const viewport = page.viewportSize();

      if (boundingBox && viewport) {
        const maxExpectedHeight = viewport.height * (UI_ELEMENTS.popup.maxHeightPercent / 100);
        expect(boundingBox.height).toBeLessThanOrEqual(maxExpectedHeight + 20);
      }
    });

    test('popup respects max-width constraint', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      const boundingBox = await popup.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(UI_ELEMENTS.popup.maxWidth + 20);
      }
    });
  });

  test.describe('Content & Elements', () => {
    test('popup shows node title', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      // Should have some text content (node title)
      const textContent = await popup.textContent();
      expect(textContent).toBeTruthy();
      expect(textContent!.length).toBeGreaterThan(10);
    });

    test('popup shows reactions section', async ({ page }) => {
      await clickOnNode(page, 0);
      await verifyPopupVisible(page);

      // Look for SUPPORT section with reaction emojis
      const reactionsSection = page.locator('text=/SUPPORT/i');
      await expect(reactionsSection).toBeVisible();
    });

    test('popup shows comments section', async ({ page }) => {
      await clickOnNode(page, 0);
      await verifyPopupVisible(page);

      // Look for COMMENTS section label
      const commentsSection = page.locator('text=/COMMENTS/i');
      await expect(commentsSection).toBeVisible();
    });

    test('popup shows "View all" button for comments', async ({ page }) => {
      await clickOnNode(page, 0);
      await verifyPopupVisible(page);

      const viewAllButton = page.locator('button:has-text("View all")');
      await expect(viewAllButton).toBeVisible();
    });

    test('popup shows sign-in prompt when not authenticated', async ({ page }) => {
      await clickOnNode(page, 0);
      await verifyPopupVisible(page);

      // Look for sign-in prompt
      const signInPrompt = page.locator('text=/Sign in/i').first();
      await expect(signInPrompt).toBeVisible();
    });

    test('popup shows status badge', async ({ page }) => {
      await clickOnNode(page, 0);
      await verifyPopupVisible(page);

      // Look for status text
      const statusBadge = page.locator('text=/completed|in progress|pending|blocked/i').first();
      await expect(statusBadge).toBeVisible();
    });

    test('popup shows all 5 reaction emojis', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      // Check for reaction emojis within the popup
      const emojis = ['🔥', '💧', '🌿', '⚡', '✨'];

      for (const emoji of emojis) {
        const emojiLocator = popup.locator(`text=${emoji}`).first();
        await expect(emojiLocator).toBeVisible();
      }
    });
  });

  test.describe('Interactions', () => {
    test('popup closes when pressing Escape', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      await page.keyboard.press('Escape');
      await expect(popup).not.toBeVisible({ timeout: 2000 });
    });

    test('popup closes when clicking backdrop', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      // Click outside the popup (on backdrop)
      await page.click('body', { position: { x: 10, y: 10 } });
      await expect(popup).not.toBeVisible({ timeout: 2000 });
    });

    test('popup closes when clicking close button', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      // Find and click close button (X icon)
      const closeButton = popup.locator('button').filter({ has: page.locator('svg') }).first();
      await closeButton.click();

      await expect(popup).not.toBeVisible({ timeout: 2000 });
    });

    test('"View all" button opens comments panel', async ({ page }) => {
      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      // Find and click "View all" button within the popup
      const viewAllButton = popup.locator('button:has-text("View all")');
      await expect(viewAllButton).toBeVisible();
      await viewAllButton.click();

      // Comments panel should appear - look for the panel with "Trail Chronicles" header
      const commentsPanel = page.locator('[class*="fixed"][class*="right-0"]').filter({
        has: page.locator('text=/Trail Chronicles|Comments|markers/i')
      });
      await expect(commentsPanel).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Scrolling Behavior', () => {
    test('popup content is scrollable if needed', async ({ page }) => {
      // Use small viewport to potentially trigger scrolling
      await page.setViewportSize(VIEWPORTS.smallMobile);
      await page.reload();
      await waitForGoalPageLoad(page);

      await clickOnNode(page, 0);
      const popup = await verifyPopupVisible(page);

      // Check if scrollable content area exists
      const scrollableArea = popup.locator('[class*="overflow-y-auto"], [class*="overflow-auto"]');
      const count = await scrollableArea.count();

      // Either popup fits without scroll, or has scrollable area
      if (count > 0) {
        await expect(scrollableArea.first()).toBeVisible();
      }

      // Most importantly: popup should not be cut off
      await verifyPopupNotCutOff(page, popup);
    });

    test('popup does not cause page scroll', async ({ page }) => {
      const initialScrollY = await page.evaluate(() => window.scrollY);

      await clickOnNode(page, 0);
      await verifyPopupVisible(page);

      const afterScrollY = await page.evaluate(() => window.scrollY);
      expect(afterScrollY).toBe(initialScrollY);
    });
  });
});

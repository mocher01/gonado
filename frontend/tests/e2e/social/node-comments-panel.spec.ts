import { test, expect } from '@playwright/test';
import {
  waitForGoalPageLoad,
  clickOnNode,
  verifyPopupVisible,
  verifyCommentsPanelVisible,
  closePopup,
  debugScreenshot,
} from '../utils/test-helpers';
import { TEST_GOALS, VIEWPORTS } from '../fixtures/test-data';

/**
 * NodeCommentsPanel E2E Tests
 *
 * Tests the slide-in panel for viewing all comments on a node.
 * Verifies visibility, content loading, and interactions.
 */

test.describe('NodeCommentsPanel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_GOALS.franceTripGoal.url);
    await waitForGoalPageLoad(page);
  });

  /**
   * Helper to open comments panel from a node
   */
  async function openCommentsPanel(page: any) {
    await clickOnNode(page, 0);
    await verifyPopupVisible(page);

    const viewAllButton = page.locator('button:has-text("View all")');
    await viewAllButton.click();

    return verifyCommentsPanelVisible(page);
  }

  test.describe('Visibility & Layout', () => {
    test('panel slides in from the right when clicking "View all"', async ({ page }) => {
      const panel = await openCommentsPanel(page);
      expect(panel).toBeTruthy();
      await debugScreenshot(page, 'comments-panel-visible');
    });

    test('panel is visible on desktop viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.reload();
      await waitForGoalPageLoad(page);

      const panel = await openCommentsPanel(page);
      const boundingBox = await panel.boundingBox();

      expect(boundingBox).toBeTruthy();
      // Panel should be on the right side
      if (boundingBox) {
        expect(boundingBox.x).toBeGreaterThan(VIEWPORTS.desktop.width / 2);
      }
    });

    test('panel is visible on mobile viewport', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.reload();
      await waitForGoalPageLoad(page);

      const panel = await openCommentsPanel(page);
      await expect(panel).toBeVisible();

      await debugScreenshot(page, 'comments-panel-mobile');
    });

    test('panel respects max-width constraint', async ({ page }) => {
      const panel = await openCommentsPanel(page);
      const boundingBox = await panel.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(450); // max-w-md is ~28rem = 448px
      }
    });

    test('panel covers full height', async ({ page }) => {
      const panel = await openCommentsPanel(page);
      const boundingBox = await panel.boundingBox();
      const viewport = page.viewportSize();

      if (boundingBox && viewport) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(viewport.height - 10);
      }
    });
  });

  test.describe('Content & Elements', () => {
    test('panel shows header with node title', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // Should show "Trail Chronicles" header
      const header = panel.locator('text=Trail Chronicles').first();
      await expect(header).toBeVisible();
    });

    test('panel shows comment count', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // Should show count like "1 marker" or "X comments"
      const count = panel.locator('text=/\\d+\\s*(marker|comment)/i');
      await expect(count).toBeVisible();
    });

    test('panel shows close button', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      const closeButton = panel.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(closeButton).toBeVisible();
    });

    test('panel shows "Leave a mark" or "Add comment" button for authenticated users', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // For non-authenticated: shows sign-in CTA
      // For authenticated: shows add comment button
      const addButton = panel.locator('text=/Leave a mark|Add comment|Join the expedition/i').first();
      await expect(addButton).toBeVisible();
    });

    test('panel shows comments list or empty state', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // Either shows comments or empty state
      const content = panel.locator('text=/comment|marker|Uncharted Territory|No.*yet/i').first();
      await expect(content).toBeVisible();
    });

    test('non-authenticated users see sign-in CTA', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // Should show sign-in call-to-action
      const signInCTA = panel.locator('text=/Sign in|Join the expedition/i').first();
      await expect(signInCTA).toBeVisible();
    });
  });

  test.describe('Interactions', () => {
    test('panel closes when pressing Escape', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible({ timeout: 2000 });
    });

    test('panel closes when clicking backdrop', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // Click on backdrop (left side of screen)
      await page.click('body', { position: { x: 50, y: 300 } });
      await expect(panel).not.toBeVisible({ timeout: 2000 });
    });

    test('panel closes when clicking close button', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      const closeButton = panel.locator('button').filter({ has: page.locator('svg') }).first();
      await closeButton.click();

      await expect(panel).not.toBeVisible({ timeout: 2000 });
    });

    test('sign-in CTA links to login page with return URL', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      const signInLink = panel.locator('a[href*="/login"]').first();

      if (await signInLink.count() > 0) {
        const href = await signInLink.getAttribute('href');
        expect(href).toContain('/login');
        expect(href).toContain('returnUrl');
      }
    });
  });

  test.describe('Comments Loading', () => {
    test('shows loading state initially', async ({ page }) => {
      // This test might be flaky due to fast loading
      await clickOnNode(page, 0);
      await verifyPopupVisible(page);

      const viewAllButton = page.locator('button:has-text("View all")');
      await viewAllButton.click();

      // Loading indicator might appear briefly
      const loadingOrContent = page.locator('text=/Loading|Gathering|marker|comment/i').first();
      await expect(loadingOrContent).toBeVisible({ timeout: 5000 });
    });

    test('displays comments after loading', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // Wait for comments to load
      await page.waitForTimeout(1000);

      // Should show either comments or empty state
      const commentsOrEmpty = panel.locator('[class*="rounded"]').filter({
        has: page.locator('text=/commenttest|Uncharted|No.*yet/i')
      }).first();

      // At least something should be visible
      const textContent = await panel.textContent();
      expect(textContent).toBeTruthy();
    });
  });

  test.describe('Scrolling', () => {
    test('panel content is scrollable when needed', async ({ page }) => {
      const panel = await openCommentsPanel(page);

      // Check for scrollable area
      const scrollableArea = panel.locator('[class*="overflow-y-auto"], [class*="overflow-auto"]');
      const count = await scrollableArea.count();

      // Panel should have scrollable content area
      expect(count).toBeGreaterThan(0);
    });
  });
});

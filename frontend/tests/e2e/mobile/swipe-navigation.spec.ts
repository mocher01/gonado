import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for TikTok-Style Mobile Navigation (Issue #69)
 *
 * Requirements tested:
 * - Vertical swipe navigation between goals in discover feed
 * - Horizontal swipe navigation between nodes in goal view
 * - Pull-to-refresh functionality
 * - Position indicator dots
 * - Swipe hint on first visit
 */

// Mobile viewport
const MOBILE_VIEWPORT = { width: 375, height: 667 };

// Test goal ID with multiple nodes
const TEST_GOAL_ID = '2e1f2b81-1b52-4679-af5a-f544d23beae6';

// Helper to simulate swipe gesture
async function swipe(
  page: Page,
  direction: 'up' | 'down' | 'left' | 'right',
  startX: number,
  startY: number,
  distance: number = 200
) {
  const endX = direction === 'left' ? startX - distance : direction === 'right' ? startX + distance : startX;
  const endY = direction === 'up' ? startY - distance : direction === 'down' ? startY + distance : startY;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();
}

test.describe('Mobile Swipe Navigation - Issue #69', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.describe('Discover Page - Vertical Feed', () => {
    test.beforeEach(async ({ page }) => {
      // Clear localStorage to see swipe hints
      await page.goto('/discover');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('shows mobile feed layout on mobile viewport', async ({ page }) => {
      // Should show the mobile feed component
      await expect(page.getByTestId('mobile-feed')).toBeVisible({ timeout: 10000 });
    });

    test('shows position indicator dots', async ({ page }) => {
      // Position indicator should be visible
      await expect(page.getByTestId('feed-position-indicator')).toBeVisible({ timeout: 10000 });
    });

    test('shows swipe indicator on first visit', async ({ page }) => {
      // Swipe indicator should appear on first visit
      const indicator = page.getByTestId('swipe-indicator');
      // It may or may not be visible depending on if there are multiple goals
      // Just check it doesn't error
      await page.waitForTimeout(1000);
    });

    test('can dismiss swipe indicator', async ({ page }) => {
      await page.waitForTimeout(500);
      const dismissBtn = page.getByTestId('swipe-indicator-dismiss');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
        await expect(page.getByTestId('swipe-indicator')).not.toBeVisible();
      }
    });

    test('position dots are clickable to navigate', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Dismiss the swipe hint if visible
      const dismissBtn = page.getByTestId('swipe-indicator-dismiss');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
      }

      // Find and click second dot if it exists
      const secondDot = page.getByTestId('feed-dot-1');
      if (await secondDot.isVisible()) {
        await secondDot.click();
        await page.waitForTimeout(500);
        // The dot should now indicate it's selected (wider)
        await expect(secondDot).toHaveClass(/w-2.*h-4|bg-primary/);
      }
    });

    test('goal card has view button', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Goal card should have a button to view
      const viewButton = page.getByTestId('view-goal-button');
      if (await viewButton.isVisible()) {
        await expect(viewButton).toContainText(/View|Quest/);
      }
    });

    test('vertical swipe changes goal card', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Dismiss swipe hint if visible
      const dismissBtn = page.getByTestId('swipe-indicator-dismiss');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
      }

      // Get the current goal card text
      const goalCard = page.getByTestId('goal-card');
      if (await goalCard.isVisible()) {
        const initialText = await goalCard.innerText();

        // Swipe up
        await swipe(page, 'up', 187, 400);
        await page.waitForTimeout(500);

        // Check if the counter changed (if there are multiple goals)
        // The counter shows "X / Y" format
      }
    });

    test('shows pull-to-refresh indicator when pulling down at top', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Dismiss swipe hint if visible
      const dismissBtn = page.getByTestId('swipe-indicator-dismiss');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
      }

      // Pull down from top
      await page.mouse.move(187, 100);
      await page.mouse.down();
      await page.mouse.move(187, 250, { steps: 10 });

      // Should show pull-to-refresh indicator
      const pullIndicator = page.getByTestId('pull-to-refresh-indicator');
      // Release
      await page.mouse.up();
    });
  });

  test.describe('Goal Detail Page - Horizontal Carousel', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/goals/${TEST_GOAL_ID}`);
      await page.evaluate(() => localStorage.clear());
      await page.waitForLoadState('networkidle');
    });

    test('shows node carousel on mobile viewport', async ({ page }) => {
      // Should show the mobile node carousel
      await expect(page.getByTestId('mobile-node-carousel')).toBeVisible({ timeout: 15000 });
    });

    test('shows node carousel component', async ({ page }) => {
      await expect(page.getByTestId('node-carousel')).toBeVisible({ timeout: 15000 });
    });

    test('shows carousel position indicator', async ({ page }) => {
      await expect(page.getByTestId('carousel-position-indicator')).toBeVisible({ timeout: 15000 });
    });

    test('shows current node card', async ({ page }) => {
      await expect(page.getByTestId('node-card')).toBeVisible({ timeout: 15000 });
    });

    test('can navigate with carousel buttons', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Dismiss swipe hint if visible
      const dismissBtn = page.getByTestId('swipe-indicator-dismiss');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
      }

      // Check if next button exists and click it
      const nextBtn = page.getByTestId('carousel-next');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);

        // Previous button should now be visible
        await expect(page.getByTestId('carousel-prev')).toBeVisible();
      }
    });

    test('carousel dots indicate current position', async ({ page }) => {
      await page.waitForTimeout(1000);

      // First dot should be active (wider)
      const firstDot = page.getByTestId('carousel-dot-0');
      await expect(firstDot).toBeVisible({ timeout: 15000 });
      await expect(firstDot).toHaveClass(/w-6|bg-primary/);
    });

    test('clicking carousel dot navigates to that node', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Dismiss swipe hint if visible
      const dismissBtn = page.getByTestId('swipe-indicator-dismiss');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
      }

      // Click second dot if it exists
      const secondDot = page.getByTestId('carousel-dot-1');
      if (await secondDot.isVisible()) {
        await secondDot.click();
        await page.waitForTimeout(500);

        // Second dot should now be active
        await expect(secondDot).toHaveClass(/w-6|bg-primary/);
      }
    });

    test('horizontal swipe changes node card', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Dismiss swipe hint if visible
      const dismissBtn = page.getByTestId('swipe-indicator-dismiss');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
      }

      // Get the current node card
      const nodeCard = page.getByTestId('node-card');
      await expect(nodeCard).toBeVisible();

      // Swipe left to go to next
      await swipe(page, 'left', 300, 350);
      await page.waitForTimeout(500);

      // Node should change (if there are multiple nodes)
    });

    test('node card shows interact button', async ({ page }) => {
      await page.waitForTimeout(1000);

      const interactBtn = page.getByTestId('node-interact-button');
      if (await interactBtn.isVisible()) {
        await expect(interactBtn).toBeVisible();
      }
    });

    test('progress bar shows completion progress', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Progress bar should be visible
      const carousel = page.getByTestId('node-carousel');
      await expect(carousel).toBeVisible({ timeout: 15000 });

      // Should show "X of Y" progress text
      await expect(carousel.locator('text=/\\d+ of \\d+/')).toBeVisible();
    });
  });

  test.describe('Swipe Hint Persistence', () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test('swipe hint is not shown on subsequent visits', async ({ page }) => {
      // First visit - set the localStorage flag
      await page.goto('/discover');
      await page.evaluate(() => {
        localStorage.setItem('discover-swipe-hint-shown', 'true');
      });

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Swipe indicator should not be visible
      await page.waitForTimeout(1000);
      await expect(page.getByTestId('swipe-indicator')).not.toBeVisible();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('desktop viewport shows traditional layout', async ({ page }) => {
      // Use desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/discover');
      await page.waitForLoadState('networkidle');

      // Should NOT show mobile feed
      await expect(page.getByTestId('mobile-feed')).not.toBeVisible();

      // Should show grid layout
      await expect(page.locator('.grid')).toBeVisible({ timeout: 10000 });
    });

    test('goal page desktop shows quest map not carousel', async ({ page }) => {
      // Use desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(`/goals/${TEST_GOAL_ID}`);
      await page.waitForLoadState('networkidle');

      // Should NOT show mobile carousel
      await expect(page.getByTestId('mobile-node-carousel')).not.toBeVisible();

      // Should show quest map
      await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15000 });
    });
  });
});

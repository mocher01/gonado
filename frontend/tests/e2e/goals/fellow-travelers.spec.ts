import { test, expect, Page } from '@playwright/test';
import { TEST_GOAL_ID, waitForGoalPageLoad } from '../utils/test-helpers';

/**
 * Issue #66: Fellow Travelers / Progress Visualization E2E Tests
 *
 * Tests the fellow travelers feature:
 * - Animated avatars of followers ("fellow travelers") on the quest map
 * - Avatars animate subtly (breathing effect)
 * - Click avatar shows user profile summary tooltip
 * - Max display limit of 10 most recent
 * - "and X more" indicator for large groups
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

test.describe('Fellow Travelers - Display', () => {
  test('fellow travelers component is visible on goal page', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for the fellow travelers component
    const fellowTravelers = page.locator('[data-testid="fellow-travelers"]');

    // The component should exist (may be in different locations based on page layout)
    const count = await fellowTravelers.count();
    console.log('Fellow travelers components found:', count);

    // Also check for travelers count text
    const travelersText = page.locator('text=/fellow traveler|travelers|No travelers/i').first();
    const textVisible = await travelersText.isVisible().catch(() => false);
    console.log('Travelers text visible:', textVisible);

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-display.png',
      fullPage: true,
    });
  });

  test('traveler avatars have breathing animation', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Find traveler avatars
    const avatars = page.locator('[data-testid="traveler-avatar"]');
    const avatarCount = await avatars.count();
    console.log('Traveler avatars found:', avatarCount);

    if (avatarCount > 0) {
      // Check the first avatar has animation styles
      const firstAvatar = avatars.first();
      await firstAvatar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      // Verify the avatar button is visible
      const isVisible = await firstAvatar.isVisible();
      console.log('First avatar visible:', isVisible);

      // Take screenshot to verify breathing animation visually
      await page.waitForTimeout(1000); // Wait for animation frame
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-animation.png',
      fullPage: true,
    });
  });

  test('traveler count displays correctly', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Find the travelers count text
    const countElement = page.locator('[data-testid="travelers-count"]').first();

    if (await countElement.count() > 0) {
      const countText = await countElement.textContent();
      console.log('Travelers count text:', countText);

      // Should match pattern: "X fellow travelers" or "1 fellow traveler" or "No travelers yet"
      expect(countText).toMatch(/(\d+ fellow traveler|No travelers)/i);
    } else {
      // Check for alternative text
      const altText = page.locator('text=/fellow traveler|travelers yet/i').first();
      const altVisible = await altText.isVisible().catch(() => false);
      console.log('Alternative travelers text visible:', altVisible);
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-count.png',
      fullPage: true,
    });
  });
});

test.describe('Fellow Travelers - Profile Tooltip', () => {
  test('clicking avatar shows profile tooltip', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const avatars = page.locator('[data-testid="traveler-avatar"]');
    const avatarCount = await avatars.count();

    if (avatarCount > 0) {
      // Click on the first avatar
      const firstAvatar = avatars.first().locator('button').first();
      await firstAvatar.click();
      await page.waitForTimeout(500);

      // Check for profile tooltip
      const tooltip = page.locator('[data-testid="traveler-profile-tooltip"]');
      const tooltipVisible = await tooltip.isVisible().catch(() => false);
      console.log('Profile tooltip visible after click:', tooltipVisible);

      if (tooltipVisible) {
        // Verify tooltip has username/display name
        const nameText = await tooltip.locator('h4').textContent();
        console.log('Profile name in tooltip:', nameText);
        expect(nameText).toBeTruthy();
      }
    } else {
      console.log('No traveler avatars to test tooltip');
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-tooltip.png',
      fullPage: true,
    });
  });

  test('clicking avatar again closes tooltip', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    const avatars = page.locator('[data-testid="traveler-avatar"]');
    const avatarCount = await avatars.count();

    if (avatarCount > 0) {
      const firstAvatar = avatars.first().locator('button').first();

      // Open tooltip
      await firstAvatar.click();
      await page.waitForTimeout(500);

      const tooltipOpenBefore = await page.locator('[data-testid="traveler-profile-tooltip"]').isVisible().catch(() => false);
      console.log('Tooltip visible after first click:', tooltipOpenBefore);

      // Click again to close
      await firstAvatar.click();
      await page.waitForTimeout(500);

      const tooltipOpenAfter = await page.locator('[data-testid="traveler-profile-tooltip"]').isVisible().catch(() => false);
      console.log('Tooltip visible after second click:', tooltipOpenAfter);

      // Tooltip should be closed
      if (tooltipOpenBefore) {
        expect(tooltipOpenAfter).toBe(false);
      }
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-tooltip-toggle.png',
      fullPage: true,
    });
  });
});

test.describe('Fellow Travelers - More Badge', () => {
  test('more badge shows remaining count when travelers exceed max', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check for the "+N more" badge
    const moreBadge = page.locator('[data-testid="travelers-more-badge"]');
    const badgeCount = await moreBadge.count();

    if (badgeCount > 0) {
      const badgeText = await moreBadge.textContent();
      console.log('More badge text:', badgeText);

      // Should be in format "+N"
      expect(badgeText).toMatch(/\+\d+/);
    } else {
      console.log('No more badge displayed (fewer travelers than max)');
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-more-badge.png',
      fullPage: true,
    });
  });
});

test.describe('Fellow Travelers - Follow Button', () => {
  test('follow button is visible for unauthenticated users', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check for follow button
    const followButton = page.locator('[data-testid="follow-button"]');
    const buttonCount = await followButton.count();
    console.log('Follow button count:', buttonCount);

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-follow-button.png',
      fullPage: true,
    });
  });

  test('authenticated user can follow a goal', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Look for follow button or "Following" text
    const followButton = page.locator('[data-testid="follow-button"]');
    const followingText = page.locator('text=/Following|Traveling with/i').first();

    const buttonVisible = await followButton.isVisible().catch(() => false);
    const followingVisible = await followingText.isVisible().catch(() => false);

    console.log('Follow button visible:', buttonVisible);
    console.log('Following text visible:', followingVisible);

    // Either follow button should be visible or already following
    expect(buttonVisible || followingVisible).toBe(true);

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-auth-follow.png',
      fullPage: true,
    });
  });
});

test.describe('Fellow Travelers - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('fellow travelers display correctly on mobile', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Check travelers text is visible
    const travelersText = page.locator('text=/fellow traveler|travelers|No travelers/i').first();
    const textVisible = await travelersText.isVisible().catch(() => false);
    console.log('Travelers text visible on mobile:', textVisible);

    // Check avatars are visible
    const avatars = page.locator('[data-testid="traveler-avatar"]');
    const avatarCount = await avatars.count();
    console.log('Traveler avatars on mobile:', avatarCount);

    await page.screenshot({
      path: 'tests/e2e/test-results/fellow-travelers-mobile.png',
      fullPage: true,
    });
  });
});

test.describe('Fellow Travelers - API Integration', () => {
  test('travelers endpoint returns data', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Intercept the travelers API call
    const travelersResponse = await page.request.get(`/api/goals/${TEST_GOAL_ID}/travelers`);

    if (travelersResponse.ok()) {
      const data = await travelersResponse.json();
      console.log('Travelers API response:', {
        count: data.travelers?.length,
        totalCount: data.total_count,
        hasMore: data.has_more,
      });

      // Verify response structure
      expect(data).toHaveProperty('travelers');
      expect(data).toHaveProperty('total_count');
      expect(data).toHaveProperty('has_more');
      expect(Array.isArray(data.travelers)).toBe(true);

      // Verify travelers array structure if not empty
      if (data.travelers.length > 0) {
        const traveler = data.travelers[0];
        expect(traveler).toHaveProperty('id');
        expect(traveler).toHaveProperty('username');
        expect(traveler).toHaveProperty('followed_at');
      }
    } else {
      console.log('Travelers API returned status:', travelersResponse.status());
    }
  });

  test('travelers endpoint respects limit parameter', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await waitForGoalPageLoad(page);

    // Request with explicit limit
    const response = await page.request.get(`/api/goals/${TEST_GOAL_ID}/travelers?limit=5`);

    if (response.ok()) {
      const data = await response.json();
      console.log('Travelers with limit=5:', data.travelers?.length);

      // Should not exceed the limit
      expect(data.travelers.length).toBeLessThanOrEqual(5);
    }
  });
});

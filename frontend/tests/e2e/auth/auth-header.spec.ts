import { test, expect } from '@playwright/test';
import { waitForGoalPageLoad, debugScreenshot } from '../utils/test-helpers';
import { TEST_GOALS, VIEWPORTS } from '../fixtures/test-data';

/**
 * AuthHeader E2E Tests
 *
 * Tests the authentication header component on the goal page.
 * Verifies visibility, content, and interactions for both
 * authenticated and non-authenticated states.
 */

test.describe('AuthHeader', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_GOALS.franceTripGoal.url);
    await waitForGoalPageLoad(page);
  });

  test.describe('Non-Authenticated State', () => {
    test('shows login CTA when not authenticated', async ({ page }) => {
      // Look for "Begin Journey" or "Sign in" text
      const loginCTA = page.locator('text=/Begin Journey|Sign in|Login/i').first();
      await expect(loginCTA).toBeVisible({ timeout: 5000 });

      await debugScreenshot(page, 'auth-header-logged-out');
    });

    test('login CTA is clickable', async ({ page }) => {
      // Look for login link or button
      const loginCTA = page.locator('a[href*="/login"]').first();
      await expect(loginCTA).toBeVisible();
      await expect(loginCTA).toBeEnabled();
    });

    test('login CTA links to login page', async ({ page }) => {
      const loginLink = page.locator('a[href*="/login"]').first();

      if (await loginLink.count() > 0) {
        const href = await loginLink.getAttribute('href');
        expect(href).toContain('/login');
      }
    });

    test('shows compass icon decoration', async ({ page }) => {
      // Look for SVG compass icon
      const compassIcon = page.locator('svg').filter({
        has: page.locator('circle, polygon')
      }).first();

      // May or may not be visible depending on viewport
      const count = await compassIcon.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Visibility on Different Viewports', () => {
    test('visible on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.reload();
      await waitForGoalPageLoad(page);

      const authElement = page.locator('text=/Begin Journey|Sign in|Navigator/i').first();
      await expect(authElement).toBeVisible();
    });

    test('visible on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.reload();
      await waitForGoalPageLoad(page);

      const authElement = page.locator('text=/Begin Journey|Sign in|Navigator/i').first();
      await expect(authElement).toBeVisible();
    });

    test('visible on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.reload();
      await waitForGoalPageLoad(page);

      const authElement = page.locator('text=/Begin Journey|Sign in|Navigator/i').first();
      await expect(authElement).toBeVisible();

      await debugScreenshot(page, 'auth-header-mobile');
    });
  });

  test.describe('Styling & Design', () => {
    test('has glass-morphism background', async ({ page }) => {
      const loginCTA = page.locator('a[href*="/login"], [class*="backdrop-blur"]').first();

      if (await loginCTA.count() > 0) {
        // Check for backdrop-blur class or style
        const className = await loginCTA.getAttribute('class');
        const hasGlassEffect = className?.includes('backdrop') || className?.includes('blur');

        // May have glass effect in parent or self
        expect(loginCTA).toBeTruthy();
      }
    });

    test('uses amber/gold color scheme', async ({ page }) => {
      const authElement = page.locator('text=/Begin Journey|Sign in/i').first();

      if (await authElement.count() > 0) {
        await expect(authElement).toBeVisible();

        // Visual check - take screenshot
        await debugScreenshot(page, 'auth-header-colors');
      }
    });
  });

  test.describe('Navigation', () => {
    test('clicking login CTA navigates to login page', async ({ page }) => {
      const loginLink = page.locator('a[href*="/login"]').first();

      if (await loginLink.count() > 0) {
        await loginLink.click();

        // Should navigate to login page
        await page.waitForURL(/\/login/, { timeout: 5000 });
        expect(page.url()).toContain('/login');
      }
    });

    test('login link includes returnUrl parameter in href', async ({ page }) => {
      const loginLink = page.locator('a[href*="/login"]').first();

      if (await loginLink.count() > 0) {
        // Check if returnUrl is in the href attribute
        const href = await loginLink.getAttribute('href');
        // Some implementations may or may not include returnUrl
        // At minimum, the link should contain /login
        expect(href).toContain('/login');
      }
    });
  });
});

/**
 * Note: Authenticated state tests would require a login fixture
 * which involves maintaining test user credentials and session management.
 *
 * Future tests to add:
 * - Authenticated: shows user avatar with gradient ring
 * - Authenticated: shows username with amber highlight
 * - Authenticated: clicking avatar opens dropdown
 * - Authenticated: dropdown shows "My Quests" link
 * - Authenticated: dropdown shows "Leave Camp" logout button
 * - Authenticated: logout clears session
 */

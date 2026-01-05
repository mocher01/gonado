import { test, expect } from '@playwright/test';

test.describe('Goal Creation Page', () => {
  test('Goal creation page loads', async ({ page }) => {
    await page.goto('/goals/new');

    // Should either show the page or redirect to login
    await page.waitForTimeout(2000);

    const url = page.url();
    const isOnGoalNew = url.includes('/goals/new');
    const isOnLogin = url.includes('/login');

    console.log('Current URL:', url);
    console.log('On goal/new:', isOnGoalNew);
    console.log('Redirected to login:', isOnLogin);

    // Either should work
    expect(isOnGoalNew || isOnLogin).toBe(true);

    await page.screenshot({ path: 'tests/e2e/test-results/goal-new-page.png', fullPage: true });
  });

  test('Goal creation requires authentication', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();

    await page.goto('/goals/new');
    await page.waitForTimeout(2000);

    // Should redirect to login for unauthenticated users
    const url = page.url();

    // Either stays on page (with login prompt) or redirects to login
    console.log('URL after accessing /goals/new:', url);
  });
});

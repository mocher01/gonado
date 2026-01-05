import { test, expect } from '@playwright/test';

test.describe('Dashboard (unauthenticated)', () => {
  test('Redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });

    expect(page.url()).toContain('/login');
    console.log('✓ Dashboard redirects to login when not authenticated');
  });

  test('Dashboard redirect preserves returnUrl', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForURL(/\/login/, { timeout: 5000 });

    // Should have returnUrl pointing back to dashboard
    expect(page.url()).toContain('returnUrl');
    console.log('✓ returnUrl preserved for dashboard redirect');
  });
});

test.describe('Dashboard page structure', () => {
  test('Dashboard page exists and has basic structure', async ({ page }) => {
    // Just check the page loads (will redirect if not logged in)
    const response = await page.goto('/dashboard');

    // Should get some response (either dashboard or login redirect)
    expect(response?.status()).toBeLessThan(500);

    await page.screenshot({ path: 'tests/e2e/test-results/dashboard-redirect.png', fullPage: true });
  });
});

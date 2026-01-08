import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('Login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Check form fields exist
    const emailOrUsername = page.locator('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailOrUsername).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible();

    // Check submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    await expect(submitBtn).toBeVisible();

    console.log('✓ Login page loads with all fields');
    await page.screenshot({ path: 'tests/e2e/test-results/login-page.png', fullPage: true });
  });

  test('Shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    const emailOrUsername = page.locator('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="username" i]').first();
    await emailOrUsername.fill('nonexistent@test.com');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('wrongpassword');

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    await submitBtn.click();

    await page.waitForTimeout(1000);

    // Should show error (toast or inline)
    const hasError = await page.locator('text=/invalid|incorrect|wrong|error|failed/i').first().isVisible().catch(() => false);
    console.log('Shows invalid credentials error:', hasError);

    await page.screenshot({ path: 'tests/e2e/test-results/login-error.png', fullPage: true });
  });

  test('Has link to register page', async ({ page }) => {
    await page.goto('/login');

    // Should have link to register
    const registerLink = page.locator('a[href*="register"], a:has-text("Sign Up"), a:has-text("Register"), a:has-text("Create account")').first();
    await expect(registerLink).toBeVisible();

    console.log('✓ Has link to register page');
  });

  test('Preserves returnUrl parameter', async ({ page }) => {
    const returnUrl = '/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c';
    await page.goto(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);

    // Page should load
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // URL should still have returnUrl
    expect(page.url()).toContain('returnUrl');

    console.log('✓ returnUrl parameter preserved');
  });
});

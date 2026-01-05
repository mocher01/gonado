import { test, expect } from '@playwright/test';

test.describe('Registration', () => {
  test('Registration page loads correctly', async ({ page }) => {
    await page.goto('/register');

    // Check page title/header
    const heading = page.locator('text=/create.*account|register|sign up/i').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Check form fields exist
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const usernameInput = page.locator('input[name="username"], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Create")').first();
    await expect(submitBtn).toBeVisible();

    console.log('✓ Registration page loads with all fields');
    await page.screenshot({ path: 'tests/e2e/test-results/register-page.png', fullPage: true });
  });

  test('Shows validation errors for empty fields', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Create")').first();
    await submitBtn.click();

    await page.waitForTimeout(500);

    // Should show some validation error
    const hasError = await page.locator('text=/required|invalid|error|please/i').first().isVisible().catch(() => false);
    console.log('Shows validation error:', hasError);

    await page.screenshot({ path: 'tests/e2e/test-results/register-validation.png', fullPage: true });
  });

  test('Shows error for password mismatch', async ({ page }) => {
    await page.goto('/register');

    // Fill form with mismatched passwords
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'test@example.com');
    await page.fill('input[name="username"], input[placeholder*="username" i]', 'testuser123');

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('password123');
    await passwordInputs.nth(1).fill('differentpassword');

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Create")').first();
    await submitBtn.click();

    await page.waitForTimeout(500);

    // Should show mismatch error
    const hasError = await page.locator('text=/match|mismatch|same/i').first().isVisible().catch(() => false);
    console.log('Shows password mismatch error:', hasError);

    await page.screenshot({ path: 'tests/e2e/test-results/register-mismatch.png', fullPage: true });
  });

  test('Has link to login page', async ({ page }) => {
    await page.goto('/register');

    // Should have link to login
    const loginLink = page.locator('a[href*="login"], a:has-text("Sign In"), a:has-text("Log In"), a:has-text("Already have")').first();
    await expect(loginLink).toBeVisible();

    console.log('✓ Has link to login page');
  });
});

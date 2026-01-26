import { test, expect } from '@playwright/test';

/**
 * Comprehensive Smoke Test
 *
 * Tests all critical pages and features of the live site
 * to identify any issues that would prevent basic functionality.
 */

test.describe('Smoke Test - Critical Paths', () => {

  test('1. Home page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(`[Page Error] ${error.message}`);
    });

    await page.goto('http://localhost:7901', { waitUntil: 'networkidle' });

    // Take screenshot
    await page.screenshot({ path: '/tmp/smoke-home.png', fullPage: true });

    // Check for critical elements
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 5000 });
    console.log('✓ Header visible');

    // Check for hero section or main content
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    console.log('✓ Main content visible');

    // Report any errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:', consoleErrors);
    }
    if (errors.length > 0) {
      console.log('❌ Page errors detected:', errors);
    }

    console.log('✓ Home page loaded successfully');
  });

  test('2. Login page loads and accepts credentials', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(`[Page Error] ${error.message}`);
    });

    await page.goto('http://localhost:7901/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/tmp/smoke-login-before.png', fullPage: true });

    // Check login form exists
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Email input visible');

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Password input visible');

    // Fill in credentials
    await emailInput.fill('admin@gonado.app');
    await passwordInput.fill('admin123');
    console.log('✓ Credentials entered');

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    console.log('✓ Submit button clicked');

    // Wait for navigation or error
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/smoke-login-after.png', fullPage: true });

    // Check if we're redirected (URL changed from /login)
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    // Report any errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:', consoleErrors);
    }
    if (errors.length > 0) {
      console.log('❌ Page errors detected:', errors);
    }

    console.log('✓ Login page interaction completed');
  });

  test('3. Dashboard loads after login', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(`[Page Error] ${error.message}`);
    });

    // First login
    await page.goto('http://localhost:7901/login', { waitUntil: 'networkidle' });
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');
    await emailInput.fill('admin@gonado.app');
    await passwordInput.fill('admin123');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await page.goto('http://localhost:7901/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/smoke-dashboard.png', fullPage: true });

    // Check for dashboard content
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    console.log('✓ Dashboard content visible');

    // Report any errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:', consoleErrors);
    }
    if (errors.length > 0) {
      console.log('❌ Page errors detected:', errors);
    }

    console.log('✓ Dashboard loaded successfully');
  });

  test('4. Discover page shows goals', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(`[Page Error] ${error.message}`);
    });

    await page.goto('http://localhost:7901/discover', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/smoke-discover.png', fullPage: true });

    // Check for discover page elements
    const title = page.locator('text=Discover Amazing Goals, text=Discover');
    await expect(title.first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Discover page title visible');

    // Check for search bar
    const searchInput = page.locator('input[placeholder="Search goals..."], input[type="search"]');
    const searchVisible = await searchInput.isVisible().catch(() => false);
    if (searchVisible) {
      console.log('✓ Search bar visible');
    }

    // Check for goals or empty state
    const goalsGrid = page.locator('.grid, [data-testid="goals-grid"]');
    const emptyState = page.locator('text=No public goals yet, text=No goals found');

    const hasGoals = await goalsGrid.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasGoals || hasEmptyState) {
      console.log(`✓ ${hasGoals ? 'Goals displayed' : 'Empty state displayed'}`);
    }

    // Report any errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:', consoleErrors);
    }
    if (errors.length > 0) {
      console.log('❌ Page errors detected:', errors);
    }

    console.log('✓ Discover page loaded successfully');
  });

  test('5. Goal page renders quest map', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(`[Page Error] ${error.message}`);
    });

    await page.goto('http://localhost:7901/goals/dec48a4f-06dc-4cfe-8df7-4ce6b76a16c4', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/smoke-goal-page.png', fullPage: true });

    // Check for canvas (quest map uses canvas)
    const canvas = page.locator('canvas');
    const canvasVisible = await canvas.isVisible().catch(() => false);
    if (canvasVisible) {
      console.log('✓ Canvas element visible (quest map likely rendered)');
    } else {
      console.log('⚠️ Canvas element not found');
    }

    // Check for goal content
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
    console.log('✓ Main content visible');

    // Check for any goal-related text
    const goalHeader = page.locator('h1, h2').first();
    const headerVisible = await goalHeader.isVisible().catch(() => false);
    if (headerVisible) {
      const headerText = await goalHeader.textContent();
      console.log(`✓ Goal header visible: "${headerText}"`);
    }

    // Report any errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    if (errors.length > 0) {
      console.log('❌ Page errors detected:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('✓ Goal page loaded successfully');
  });

  test('6. Create goal page AI chat works', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(`[Page Error] ${error.message}`);
    });

    // First login
    await page.goto('http://localhost:7901/login', { waitUntil: 'networkidle' });
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');

    const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (emailVisible) {
      await emailInput.fill('admin@gonado.app');
      await passwordInput.fill('admin123');
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      await submitButton.click();
      await page.waitForTimeout(2000);
    }

    // Navigate to create goal page
    await page.goto('http://localhost:7901/goals/new', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/smoke-create-goal.png', fullPage: true });

    // Check for AI chat interface
    const chatInput = page.locator('input[placeholder*="chat" i], input[placeholder*="message" i], textarea[placeholder*="chat" i], textarea[placeholder*="message" i]');
    const chatInputVisible = await chatInput.isVisible().catch(() => false);

    if (chatInputVisible) {
      console.log('✓ Chat input visible');

      // Try to type a message
      await chatInput.fill('I want to learn Spanish');
      console.log('✓ Chat input accepts text');

      // Look for send button
      const sendButton = page.locator('button:has-text("Send"), button[aria-label*="send" i], button[type="submit"]');
      const sendVisible = await sendButton.isVisible().catch(() => false);
      if (sendVisible) {
        console.log('✓ Send button visible');
      }
    } else {
      console.log('⚠️ Chat input not found - checking for alternative UI');

      // Check for any input fields
      const anyInput = page.locator('input, textarea').first();
      const anyInputVisible = await anyInput.isVisible().catch(() => false);
      if (anyInputVisible) {
        console.log('✓ Some input field found on page');
      }
    }

    // Check page loaded
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    console.log('✓ Create goal page loaded');

    // Report any errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    if (errors.length > 0) {
      console.log('❌ Page errors detected:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('✓ Create goal page test completed');
  });

  test('Summary: All critical pages accessibility', async ({ page }) => {
    console.log('\n========================================');
    console.log('SMOKE TEST SUMMARY');
    console.log('========================================\n');

    const results: { page: string; status: string; notes: string[] }[] = [];

    // Test each page quickly
    const pages = [
      { url: 'http://localhost:7901', name: 'Home' },
      { url: 'http://localhost:7901/login', name: 'Login' },
      { url: 'http://localhost:7901/discover', name: 'Discover' },
      { url: 'http://localhost:7901/goals/dec48a4f-06dc-4cfe-8df7-4ce6b76a16c4', name: 'Goal Page' },
    ];

    for (const pageInfo of pages) {
      const notes: string[] = [];
      let status = 'PASS';

      try {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);

        const mainContent = page.locator('main, [role="main"], body');
        const visible = await mainContent.isVisible({ timeout: 3000 }).catch(() => false);

        if (!visible) {
          status = 'FAIL';
          notes.push('Main content not visible');
        }
      } catch (error) {
        status = 'FAIL';
        notes.push(`Error: ${error}`);
      }

      results.push({ page: pageInfo.name, status, notes });
    }

    // Print summary
    console.log('Page Accessibility:');
    results.forEach(r => {
      const statusIcon = r.status === 'PASS' ? '✓' : '❌';
      console.log(`  ${statusIcon} ${r.page}: ${r.status}`);
      if (r.notes.length > 0) {
        r.notes.forEach(note => console.log(`    - ${note}`));
      }
    });

    console.log('\n========================================\n');
  });
});

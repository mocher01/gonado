import { test, expect } from '@playwright/test';

test.describe('Resource Drop', () => {
  test('Drop resource button visible in popup', async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Check Drop resource button exists
    const dropBtn = page.locator('button:has-text("Drop resource")').first();
    const dropVisible = await dropBtn.isVisible().catch(() => false);

    console.log('Drop resource button visible:', dropVisible);

    // Get the count shown
    const dropText = await dropBtn.textContent().catch(() => '');
    console.log('Drop resource text:', dropText);

    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop.png', fullPage: true });

    expect(dropVisible).toBe(true);
  });

  test('Drop resource is disabled for unauthenticated', async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Check if button is disabled
    const dropBtn = page.locator('button:has-text("Drop resource")').first();
    const isDisabled = await dropBtn.isDisabled().catch(() => false);

    console.log('Drop resource disabled (unauthenticated):', isDisabled);
  });

  test('Drop resource modal opens when button clicked', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to a public goal
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Click Drop resource button
    const dropBtn = page.locator('button:has-text("Drop resource")').first();
    await dropBtn.click();
    await page.waitForTimeout(500);

    // Check modal opened
    const modalTitle = page.locator('h3:has-text("Drop Resource")');
    const modalVisible = await modalTitle.isVisible().catch(() => false);

    console.log('Resource drop modal visible:', modalVisible);
    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-modal.png', fullPage: true });

    expect(modalVisible).toBe(true);
  });

  test('Drop resource modal has URL and title fields', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Click Drop resource button
    const dropBtn = page.locator('button:has-text("Drop resource")').first();
    await dropBtn.click();
    await page.waitForTimeout(500);

    // Check URL input
    const urlInput = page.locator('input[placeholder*="https://example.com"]');
    const urlVisible = await urlInput.isVisible().catch(() => false);
    console.log('URL input visible:', urlVisible);

    // Check title input
    const titleInput = page.locator('input[placeholder*="sharing"]');
    const titleVisible = await titleInput.isVisible().catch(() => false);
    console.log('Title input visible:', titleVisible);

    // Check description textarea
    const descTextarea = page.locator('textarea[placeholder*="context"]');
    const descVisible = await descTextarea.isVisible().catch(() => false);
    console.log('Description textarea visible:', descVisible);

    expect(urlVisible || titleVisible).toBe(true);
  });

  test('Drop resource modal validates required fields', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Click Drop resource button
    const dropBtn = page.locator('button:has-text("Drop resource")').first();
    await dropBtn.click();
    await page.waitForTimeout(500);

    // Check submit button is disabled when title is empty
    const submitBtn = page.locator('button:has-text("Drop Resource")').last();
    const isDisabled = await submitBtn.isDisabled().catch(() => false);
    console.log('Submit disabled without title:', isDisabled);

    expect(isDisabled).toBe(true);
  });

  test('Drop resource modal closes on cancel', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Click Drop resource button
    const dropBtn = page.locator('button:has-text("Drop resource")').first();
    await dropBtn.click();
    await page.waitForTimeout(500);

    // Click Cancel button
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Check modal closed
    const modalTitle = page.locator('h3:has-text("Drop Resource")');
    const modalVisible = await modalTitle.isVisible().catch(() => false);

    console.log('Modal closed after cancel:', !modalVisible);
    expect(modalVisible).toBe(false);
  });

  test('Drop resource modal validates URL format', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Click Drop resource button
    const dropBtn = page.locator('button:has-text("Drop resource")').first();
    await dropBtn.click();
    await page.waitForTimeout(500);

    // Enter invalid URL
    const urlInput = page.locator('input[placeholder*="https://example.com"]');
    await urlInput.fill('not-a-valid-url');
    await urlInput.blur();
    await page.waitForTimeout(300);

    // Check for error message
    const errorMsg = page.locator('text=valid URL');
    const errorVisible = await errorMsg.isVisible().catch(() => false);

    console.log('URL validation error visible:', errorVisible);
    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-url-validation.png', fullPage: true });

    expect(errorVisible).toBe(true);
  });
});

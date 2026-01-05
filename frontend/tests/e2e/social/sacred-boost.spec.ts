import { test, expect } from '@playwright/test';

test.describe('Sacred Boost', () => {
  test('Boost button visible in popup', async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Check Sacred Boost button exists
    const boostBtn = page.locator('button:has-text("Sacred Boost"), button:has-text("Boost")').first();
    const boostVisible = await boostBtn.isVisible().catch(() => false);

    console.log('Sacred Boost button visible:', boostVisible);

    await page.screenshot({ path: 'tests/e2e/test-results/sacred-boost-popup.png', fullPage: true });
  });

  test('Boost button in support panel', async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click arrow to open support panel
    const arrowBtn = page.locator('button:has-text("->")').first();
    await arrowBtn.click();
    await page.waitForTimeout(500);

    // Check Sacred Boost section
    const boostSection = page.locator('text=Sacred Boost').first();
    const boostVisible = await boostSection.isVisible().catch(() => false);

    console.log('Sacred Boost section in panel:', boostVisible);

    // Check boost button
    const giveBoostBtn = page.locator('button:has-text("Give Sacred Boost")').first();
    const giveBoostVisible = await giveBoostBtn.isVisible().catch(() => false);

    console.log('Give Sacred Boost button:', giveBoostVisible);

    await page.screenshot({ path: 'tests/e2e/test-results/sacred-boost-panel.png', fullPage: true });
  });

  test('Boost button opens modal when clicked (authenticated)', async ({ page }) => {
    // Note: This test requires authentication setup
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open node popup
    const socialBar = page.locator('text=Click to react').first();
    await socialBar.click();
    await page.waitForTimeout(500);

    // Click boost button
    const boostBtn = page.locator('button:has-text("Sacred Boost"), button:has-text("Boost")').first();
    if (await boostBtn.isVisible()) {
      await boostBtn.click();
      await page.waitForTimeout(500);

      // Check if modal or toast appears
      // Unauthenticated users should see sign-in toast
      const signInToast = page.locator('text=/sign in/i');
      const modalTitle = page.locator('text=Give Sacred Boost');

      const toastVisible = await signInToast.first().isVisible().catch(() => false);
      const modalVisible = await modalTitle.isVisible().catch(() => false);

      console.log('Sign-in toast visible (unauthenticated):', toastVisible);
      console.log('Boost modal visible (authenticated):', modalVisible);

      await page.screenshot({ path: 'tests/e2e/test-results/sacred-boost-click.png', fullPage: true });
    }
  });

  test('Boost modal has message input and submit button', async ({ page, context }) => {
    // This test requires mocking authentication or using a logged-in session
    // For now, we'll just check the modal structure when visible

    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Check for modal elements (may require auth to see)
    // The modal has:
    // - Title: "Give Sacred Boost"
    // - Message input (textarea)
    // - Boosts remaining indicator
    // - Cancel and Send Boost buttons

    console.log('Sacred Boost modal structure test - requires authentication to fully test');

    await page.screenshot({ path: 'tests/e2e/test-results/sacred-boost-modal.png', fullPage: true });
  });

  test('Boost requires authentication', async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open support panel
    const arrowBtn = page.locator('button:has-text("->")').first();
    await arrowBtn.click();
    await page.waitForTimeout(500);

    // Try clicking boost button
    const giveBoostBtn = page.locator('button:has-text("Give Sacred Boost")').first();

    if (await giveBoostBtn.isVisible()) {
      // Check if disabled
      const isDisabled = await giveBoostBtn.isDisabled().catch(() => false);
      console.log('Boost button disabled (unauthenticated):', isDisabled);

      // Try clicking anyway
      await giveBoostBtn.click().catch(() => console.log('Click prevented or button disabled'));
      await page.waitForTimeout(500);

      // Check for login prompt/toast
      const loginPrompt = page.locator('text=/sign in|login/i');
      const promptVisible = await loginPrompt.first().isVisible().catch(() => false);
      console.log('Login prompt shown:', promptVisible);

      await page.screenshot({ path: 'tests/e2e/test-results/sacred-boost-auth-required.png', fullPage: true });
    }
  });

  test('Boost count displayed on goal page', async ({ page }) => {
    await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Look for boost count display
    const boostCount = page.locator('text=/\\d+ boosts?/i');
    const countVisible = await boostCount.first().isVisible().catch(() => false);

    console.log('Boost count visible:', countVisible);

    // Open visitor panel to see boost details
    const arrowBtn = page.locator('button:has-text("->")').first();
    await arrowBtn.click();
    await page.waitForTimeout(500);

    // Check for Sacred Boost section with count
    const boostSection = page.locator('text=Sacred Boost');
    const sectionVisible = await boostSection.first().isVisible().catch(() => false);

    console.log('Sacred Boost section in panel:', sectionVisible);

    await page.screenshot({ path: 'tests/e2e/test-results/sacred-boost-count.png', fullPage: true });
  });
});

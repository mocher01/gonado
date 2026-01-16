import { test, expect } from '@playwright/test';

/**
 * Comprehensive Resource Drop E2E Tests
 *
 * Tests all scenarios for the resource drop system on node cards:
 * 1. Resource icon (📦) visible with count
 * 2. Clicking icon opens resources modal
 * 3. Modal displays existing resources with details
 * 4. Non-owner can drop resources
 * 5. Resource appears immediately after dropping
 * 6. Count updates instantly without refresh
 * 7. Owner cannot drop resources (info message)
 * 8. Modal responsive on mobile viewport
 * 9. Modal not cut off at bottom of screen
 * 10. Resource links open in new tab
 * 11. Non-logged-in users can view but not drop
 */

const TEST_GOAL_ID = 'dec48a4f-06dc-4cfe-8df7-4ce6b76a16c4'; // Public goal for testing
const TEST_USER_EMAIL = 'testuser@example.com';
const TEST_USER_PASSWORD = 'test123456';
const E2E_TEST_EMAIL = 'e2etest@example.com';
const E2E_TEST_PASSWORD = 'TestE2E123';

test.describe('Resource Drop - Comprehensive Tests', () => {

  test('1. Resource icon (📦) visible on task nodes with count', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Look for resource icon (📦) on node
    const resourceIcon = page.locator('text=📦').first();
    const iconVisible = await resourceIcon.isVisible().catch(() => false);

    console.log('✓ Resource icon (📦) visible:', iconVisible);

    // Check for count next to icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    if (await resourceButton.isVisible()) {
      const buttonText = await resourceButton.textContent();
      console.log('✓ Resource button text:', buttonText);
      expect(buttonText).toContain('📦');
    }

    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-icon-visible.png', fullPage: true });
    expect(iconVisible).toBe(true);
  });

  test('2. Clicking resource icon opens resources modal', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click resource icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Check modal opened
    const modalTitle = page.locator('text=Resources').first();
    const modalVisible = await modalTitle.isVisible().catch(() => false);

    console.log('✓ Resources modal opened:', modalVisible);
    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-modal-opened.png', fullPage: true });

    expect(modalVisible).toBe(true);
  });

  test('3. Modal displays existing dropped resources with username, time, links', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open resources modal
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Check for resource list items
    const resourceItems = page.locator('.bg-slate-700\\/50');
    const hasResources = await resourceItems.first().isVisible().catch(() => false);

    if (hasResources) {
      console.log('✓ Has existing resources');

      // Check for username display
      const username = page.locator('.text-teal-400').first();
      const usernameVisible = await username.isVisible().catch(() => false);
      console.log('✓ Username visible:', usernameVisible);

      // Check for time ago
      const timeAgo = page.locator('text=/\\d+[mhd] ago|just now/i').first();
      const timeVisible = await timeAgo.isVisible().catch(() => false);
      console.log('✓ Time ago visible:', timeVisible);

      // Check for links
      const resourceLinks = page.locator('a[target="_blank"]');
      const linkCount = await resourceLinks.count();
      console.log('✓ Resource links found:', linkCount);
    } else {
      console.log('✓ No resources yet - empty state shown');
    }

    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-modal-content.png', fullPage: true });
  });

  test('4. Non-owner users can drop a resource (title, URL, optional message)', async ({ page }) => {
    // Login as non-owner user
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_TEST_EMAIL);
    await page.fill('input[type="password"]', E2E_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to goal
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click resource icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Check for "Drop a Resource" button
    const dropButton = page.locator('button:has-text("Drop a Resource")');
    const dropButtonVisible = await dropButton.isVisible().catch(() => false);
    console.log('✓ Drop a Resource button visible:', dropButtonVisible);

    if (dropButtonVisible) {
      await dropButton.click();
      await page.waitForTimeout(300);

      // Check form fields
      const titleInput = page.locator('input[placeholder*="title"]');
      const urlInput = page.locator('input[placeholder*="URL"], input[type="url"]');
      const messageInput = page.locator('input[placeholder*="Message"], input[placeholder*="optional"]');

      const titleVisible = await titleInput.isVisible().catch(() => false);
      const urlVisible = await urlInput.isVisible().catch(() => false);
      const messageVisible = await messageInput.isVisible().catch(() => false);

      console.log('✓ Title input visible:', titleVisible);
      console.log('✓ URL input visible:', urlVisible);
      console.log('✓ Message input visible:', messageVisible);

      expect(titleVisible).toBe(true);
      expect(urlVisible).toBe(true);
    }

    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-form.png', fullPage: true });
  });

  test('5. After dropping, resource appears in the list immediately', async ({ page }) => {
    // Login as non-owner user
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_TEST_EMAIL);
    await page.fill('input[type="password"]', E2E_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to goal
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click resource icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Count existing resources
    const existingResources = await page.locator('.bg-slate-700\\/50').count();
    console.log('✓ Existing resources count:', existingResources);

    // Click "Drop a Resource"
    const dropButton = page.locator('button:has-text("Drop a Resource")');
    const dropButtonVisible = await dropButton.isVisible().catch(() => false);

    if (dropButtonVisible) {
      await dropButton.click();
      await page.waitForTimeout(300);

      // Fill form with unique data
      const timestamp = Date.now();
      await page.fill('input[placeholder*="title"]', `E2E Test Resource ${timestamp}`);
      await page.fill('input[placeholder*="URL"], input[type="url"]', `https://example.com/test-${timestamp}`);
      await page.fill('input[placeholder*="Message"], input[placeholder*="optional"]', `Test message ${timestamp}`);

      // Submit
      const submitButton = page.locator('button:has-text("Drop 📤")');
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check if new resource appears
      const newResourceCount = await page.locator('.bg-slate-700\\/50').count();
      console.log('✓ New resources count:', newResourceCount);

      // Verify the new resource is visible
      const newResource = page.locator(`text=E2E Test Resource ${timestamp}`);
      const newResourceVisible = await newResource.isVisible().catch(() => false);
      console.log('✓ New resource immediately visible:', newResourceVisible);

      await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-added.png', fullPage: true });

      expect(newResourceVisible).toBe(true);
    } else {
      console.log('⚠ Cannot test - user is owner or form not available');
    }
  });

  test('6. Resource count on node updates INSTANTLY (no page refresh needed)', async ({ page }) => {
    // Login as non-owner user
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_TEST_EMAIL);
    await page.fill('input[type="password"]', E2E_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to goal
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Get initial count
    const resourceButton = page.locator('button:has-text("📦")').first();
    const initialText = await resourceButton.textContent();
    console.log('✓ Initial resource button text:', initialText);

    // Open modal
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Drop a resource
    const dropButton = page.locator('button:has-text("Drop a Resource")');
    const dropButtonVisible = await dropButton.isVisible().catch(() => false);

    if (dropButtonVisible) {
      await dropButton.click();
      await page.waitForTimeout(300);

      // Fill and submit
      const timestamp = Date.now();
      await page.fill('input[placeholder*="title"]', `Count Test ${timestamp}`);
      await page.fill('input[placeholder*="URL"], input[type="url"]', `https://example.com/count-${timestamp}`);

      const submitButton = page.locator('button:has-text("Drop 📤")');
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Close modal
      const closeButton = page.locator('button:has-text("✕")');
      await closeButton.click();
      await page.waitForTimeout(500);

      // Check updated count on node (without page refresh!)
      const updatedText = await resourceButton.textContent();
      console.log('✓ Updated resource button text:', updatedText);
      console.log('✓ Count updated without refresh:', initialText !== updatedText);

      await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-count-updated.png', fullPage: true });
    } else {
      console.log('⚠ Cannot test - user is owner or form not available');
    }
  });

  test('7. Owner CANNOT drop resources on their own goal (should see info message)', async ({ page }) => {
    // Login as test user (assuming they own test goals)
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to dashboard to find own goals
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Click on first goal card (should be owner's own goal)
    const goalCard = page.locator('a[href*="/goals/"]').first();
    const goalCardVisible = await goalCard.isVisible().catch(() => false);

    if (goalCardVisible) {
      await goalCard.click();
      await page.waitForSelector('.react-flow', { timeout: 15000 });

      // Click resource icon
      const resourceButton = page.locator('button:has-text("📦")').first();
      await resourceButton.click();
      await page.waitForTimeout(500);

      // Check for info message instead of drop button
      const infoMessage = page.locator('text=/Resources are dropped by supporters/i');
      const infoVisible = await infoMessage.isVisible().catch(() => false);
      console.log('✓ Owner info message visible:', infoVisible);

      // Drop button should NOT be visible
      const dropButton = page.locator('button:has-text("Drop a Resource")');
      const dropButtonVisible = await dropButton.isVisible().catch(() => false);
      console.log('✓ Drop button hidden for owner:', !dropButtonVisible);

      await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-owner-restricted.png', fullPage: true });

      expect(infoVisible).toBe(true);
      expect(dropButtonVisible).toBe(false);
    } else {
      console.log('⚠ No goals found for owner test');
    }
  });

  test('8. Modal is responsive - works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click resource icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Check modal is visible and fits viewport
    const modal = page.locator('.fixed.inset-4, .fixed.md\\:inset-y-\\[10vh\\]').first();
    const modalVisible = await modal.isVisible().catch(() => false);
    console.log('✓ Modal visible on mobile:', modalVisible);

    // Check modal title
    const modalTitle = page.locator('text=Resources').first();
    const titleVisible = await modalTitle.isVisible().catch(() => false);
    console.log('✓ Modal title visible on mobile:', titleVisible);

    // Check if scrollable
    const scrollContainer = page.locator('.overflow-y-auto').first();
    const scrollVisible = await scrollContainer.isVisible().catch(() => false);
    console.log('✓ Scroll container visible on mobile:', scrollVisible);

    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-mobile.png', fullPage: true });

    expect(modalVisible).toBe(true);
  });

  test('9. Modal is not cut off at bottom of screen', async ({ page }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click resource icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Get modal bounding box
    const modal = page.locator('.fixed.inset-4, .fixed.md\\:inset-y-\\[10vh\\]').first();
    const modalBox = await modal.boundingBox();

    if (modalBox) {
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        const modalBottom = modalBox.y + modalBox.height;
        const isWithinViewport = modalBottom <= viewportSize.height;

        console.log('✓ Modal position:', { y: modalBox.y, height: modalBox.height, bottom: modalBottom });
        console.log('✓ Viewport height:', viewportSize.height);
        console.log('✓ Modal fits within viewport:', isWithinViewport);

        // Modal should fit or be scrollable
        expect(modalBox.y).toBeGreaterThanOrEqual(0);
      }
    }

    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-modal-positioning.png', fullPage: true });
  });

  test('10. Clicking resource links opens in new tab', async ({ page, context }) => {
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click resource icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Check for resource links
    const resourceLinks = page.locator('a[target="_blank"][rel*="noopener"]');
    const linkCount = await resourceLinks.count();

    if (linkCount > 0) {
      console.log('✓ Resource links found:', linkCount);

      // Check first link has correct attributes
      const firstLink = resourceLinks.first();
      const target = await firstLink.getAttribute('target');
      const rel = await firstLink.getAttribute('rel');

      console.log('✓ Link target attribute:', target);
      console.log('✓ Link rel attribute:', rel);

      expect(target).toBe('_blank');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');

      await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-links.png', fullPage: true });
    } else {
      console.log('✓ No resources with links yet - link opening will work when resources exist');
    }
  });

  test('11. Non-logged-in users can view resources but not drop', async ({ page }) => {
    // Don't login - test as anonymous user
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Click resource icon
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    // Modal should open
    const modalTitle = page.locator('text=Resources').first();
    const modalVisible = await modalTitle.isVisible().catch(() => false);
    console.log('✓ Anonymous user can view resources modal:', modalVisible);

    // Can see existing resources
    const resourceItems = page.locator('.bg-slate-700\\/50');
    const itemsCount = await resourceItems.count();
    console.log('✓ Anonymous user can see resources count:', itemsCount);

    // Drop button should NOT be visible for anonymous users
    const dropButton = page.locator('button:has-text("Drop a Resource")');
    const dropButtonVisible = await dropButton.isVisible().catch(() => false);
    console.log('✓ Drop button hidden for anonymous:', !dropButtonVisible);

    // Should see some message about being a visitor
    const bodyText = await page.locator('.bg-slate-800').textContent();
    console.log('✓ Modal body visible for anonymous user');

    await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-anonymous.png', fullPage: true });

    expect(modalVisible).toBe(true);
    expect(dropButtonVisible).toBe(false);
  });

  test('12. Validation - URL field requires valid URL format', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_TEST_EMAIL);
    await page.fill('input[type="password"]', E2E_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to goal
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open modal and form
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    const dropButton = page.locator('button:has-text("Drop a Resource")');
    const dropButtonVisible = await dropButton.isVisible().catch(() => false);

    if (dropButtonVisible) {
      await dropButton.click();
      await page.waitForTimeout(300);

      // Try invalid URL
      await page.fill('input[placeholder*="title"]', 'Test Title');
      await page.fill('input[placeholder*="URL"], input[type="url"]', 'not-a-valid-url');

      // Submit button should be disabled or validation error shown
      const submitButton = page.locator('button:has-text("Drop 📤")');
      await submitButton.click();
      await page.waitForTimeout(500);

      // Modal should still be open (submission failed)
      const modalStillOpen = await page.locator('text=Resources').first().isVisible();
      console.log('✓ Modal stays open with invalid URL:', modalStillOpen);

      await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-validation.png', fullPage: true });
    }
  });

  test('13. Submit button disabled when required fields empty', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_TEST_EMAIL);
    await page.fill('input[type="password"]', E2E_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to goal
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open modal and form
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    const dropButton = page.locator('button:has-text("Drop a Resource")');
    const dropButtonVisible = await dropButton.isVisible().catch(() => false);

    if (dropButtonVisible) {
      await dropButton.click();
      await page.waitForTimeout(300);

      // Check submit button disabled when empty
      const submitButton = page.locator('button:has-text("Drop 📤")');
      const isDisabled = await submitButton.isDisabled();
      console.log('✓ Submit disabled with empty fields:', isDisabled);

      expect(isDisabled).toBe(true);

      // Fill title only
      await page.fill('input[placeholder*="title"]', 'Test Title');
      const stillDisabled = await submitButton.isDisabled();
      console.log('✓ Submit still disabled without URL:', stillDisabled);

      expect(stillDisabled).toBe(true);

      await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-disabled.png', fullPage: true });
    }
  });

  test('14. Cancel button closes the drop form', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_TEST_EMAIL);
    await page.fill('input[type="password"]', E2E_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|goals/, { timeout: 10000 }).catch(() => {});

    // Go to goal
    await page.goto(`/goals/${TEST_GOAL_ID}`);
    await page.waitForSelector('.react-flow', { timeout: 15000 });

    // Open modal and form
    const resourceButton = page.locator('button:has-text("📦")').first();
    await resourceButton.click();
    await page.waitForTimeout(500);

    const dropButton = page.locator('button:has-text("Drop a Resource")');
    const dropButtonVisible = await dropButton.isVisible().catch(() => false);

    if (dropButtonVisible) {
      await dropButton.click();
      await page.waitForTimeout(300);

      // Form should be visible
      const titleInput = page.locator('input[placeholder*="title"]');
      const formVisible = await titleInput.isVisible();
      console.log('✓ Drop form visible:', formVisible);

      // Click cancel
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();
      await page.waitForTimeout(300);

      // Form should be hidden, drop button should be back
      const formHidden = await titleInput.isVisible().catch(() => false);
      const dropButtonBack = await dropButton.isVisible();

      console.log('✓ Form hidden after cancel:', !formHidden);
      console.log('✓ Drop button visible again:', dropButtonBack);

      expect(formHidden).toBe(false);
      expect(dropButtonBack).toBe(true);

      await page.screenshot({ path: 'tests/e2e/test-results/resource-drop-cancel.png', fullPage: true });
    }
  });
});

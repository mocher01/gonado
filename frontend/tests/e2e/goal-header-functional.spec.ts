import { test, expect } from '@playwright/test';

/**
 * Functional tests for GoalPageHeader
 * Tests that features WORK, not just that they're visible
 */

test('Visibility toggle changes goal visibility', async ({ page }) => {
  // Login as goal owner
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'test123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Go to goal
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const header = page.locator('header').first();

  // Find visibility button and get initial state
  const visibilityBtn = header.locator('button').filter({ hasText: /Public|Private/ });
  const initialText = await visibilityBtn.textContent();
  console.log('Initial visibility:', initialText);

  // Click to toggle
  await visibilityBtn.click();
  await page.waitForTimeout(1000);

  // Verify it changed
  const newText = await visibilityBtn.textContent();
  console.log('After toggle:', newText);

  expect(newText).not.toBe(initialText);

  // Toggle back to original state
  await visibilityBtn.click();
  await page.waitForTimeout(1000);

  const restoredText = await visibilityBtn.textContent();
  expect(restoredText).toBe(initialText);

  console.log('Visibility toggle works correctly');
});

test('Mood selector opens and allows mood selection', async ({ page }) => {
  // Login as goal owner
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'test123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Go to goal
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const header = page.locator('header').first();

  // Find mood button (could be "Set mood" or an existing mood)
  const moodBtn = header.locator('button').filter({ hasText: /mood|Motivated|Focused|Celebrating|Confident|Stuck|Pushing/ });
  await expect(moodBtn).toBeVisible();
  const initialMood = await moodBtn.textContent();
  console.log('Initial mood button text:', initialMood);

  // Click to open dropdown
  await moodBtn.click();
  await page.waitForTimeout(500);

  // Check dropdown appeared with mood options
  const dropdown = page.locator('[class*="absolute"]').filter({ hasText: 'Focused' });
  const hasDropdown = await dropdown.isVisible().catch(() => false);
  console.log('Mood dropdown visible:', hasDropdown);
  expect(hasDropdown).toBe(true);

  // Select "Focused" mood (different from Motivated to avoid toggle-off)
  const focusedOption = page.locator('button').filter({ hasText: 'Focused' }).last();
  await focusedOption.click();
  await page.waitForTimeout(1000);

  // Verify mood changed (button should now show Focused)
  const updatedMoodBtn = header.locator('button').filter({ hasText: 'Focused' });
  const moodChanged = await updatedMoodBtn.isVisible().catch(() => false);
  console.log('Mood changed to Focused:', moodChanged);
  expect(moodChanged).toBe(true);

  console.log('Mood selector works correctly');
});

test('Add Step button opens node form modal', async ({ page }) => {
  // Login as goal owner
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'test123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Go to goal
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const header = page.locator('header').first();

  // Find and click Add button
  const addBtn = header.locator('button').filter({ hasText: 'Add' });
  await expect(addBtn).toBeVisible();
  await addBtn.click();
  await page.waitForTimeout(500);

  // Verify modal opened - look for form elements
  const modal = page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]');
  const hasModal = await modal.isVisible().catch(() => false);

  // Alternative: look for the node form title input
  const titleInput = page.locator('input[placeholder*="title" i], input[name="title"]');
  const hasForm = await titleInput.isVisible().catch(() => false);

  console.log('Modal visible:', hasModal);
  console.log('Form visible:', hasForm);

  expect(hasModal || hasForm).toBe(true);

  // Close modal by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  console.log('Add Step button works correctly');
});

test('Edit Goal button opens edit modal', async ({ page }) => {
  // Login as goal owner
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'test123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Go to goal
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const header = page.locator('header').first();

  // Find Edit button (gear icon) - it's a small icon button with title
  const editBtn = header.locator('button[title*="Edit" i], button[title*="goal" i]').first();
  const hasEditBtn = await editBtn.isVisible().catch(() => false);
  console.log('Edit button visible:', hasEditBtn);
  expect(hasEditBtn).toBe(true);

  await editBtn.click();
  await page.waitForTimeout(1000);

  // Look for any modal/dialog overlay that appeared
  const modalOverlay = page.locator('[class*="fixed"][class*="inset"], [class*="backdrop"], [class*="overlay"]').first();
  const hasOverlay = await modalOverlay.isVisible().catch(() => false);

  // Also check for form inputs that would be in the edit modal
  const titleInput = page.locator('input[placeholder*="title" i], input[name="title"], input[id*="title"]');
  const hasForm = await titleInput.isVisible().catch(() => false);

  // Check for any AnimatePresence modal content
  const animatedModal = page.locator('[class*="bg-slate"][class*="rounded"]').filter({ hasText: /title|description|theme/i });
  const hasAnimatedModal = await animatedModal.isVisible().catch(() => false);

  console.log('Overlay visible:', hasOverlay);
  console.log('Form visible:', hasForm);
  console.log('Animated modal:', hasAnimatedModal);

  // At least one should be true if modal opened
  const modalOpened = hasOverlay || hasForm || hasAnimatedModal;
  expect(modalOpened).toBe(true);

  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  console.log('Edit Goal button works correctly');
});

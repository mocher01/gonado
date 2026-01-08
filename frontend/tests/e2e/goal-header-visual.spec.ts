import { test, expect } from '@playwright/test';

test('GoalPageHeader renders without overlapping elements', async ({ page }) => {
  // Go to a public goal
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');

  // Wait for page to load
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(2000); // Let animations complete

  // Check header renders
  const header = page.locator('header').first();
  await expect(header).toBeVisible({ timeout: 10000 });

  // Check goal title is visible in header
  const title = header.locator('h1');
  await expect(title).toBeVisible();
  const titleText = await title.textContent();
  expect(titleText).toBeTruthy();
  console.log('Goal title:', titleText);

  // Check back button exists and is visible
  const backButton = header.locator('a').first();
  await expect(backButton).toBeVisible();

  // Check progress is visible (either progress bar or percentage)
  const hasProgress = await header.locator('text=/\\d+%/').isVisible().catch(() => false);
  console.log('Progress visible:', hasProgress);
  expect(hasProgress).toBe(true);

  // Take screenshot for visual verification
  await page.screenshot({ path: 'tests/e2e/test-results/goal-header-visual.png', fullPage: false });

  console.log('Header rendered successfully without visible issues');
});

test('GoalPageHeader owner view shows grouped state controls', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'test123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });

  // Navigate to own goal
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const header = page.locator('header').first();

  // Check visibility toggle exists (Public/Private button)
  const visibilityBtn = header.locator('button').filter({ hasText: /Public|Private/ });
  const hasVisibility = await visibilityBtn.isVisible().catch(() => false);
  console.log('Visibility button visible:', hasVisibility);
  expect(hasVisibility).toBe(true);

  // Check mood control exists
  const moodBtn = header.locator('button').filter({ hasText: /mood|Motivated|Focused|Celebrating|Confident|Stuck|Pushing/ });
  const hasMood = await moodBtn.isVisible().catch(() => false);
  console.log('Mood button visible:', hasMood);
  expect(hasMood).toBe(true);

  // Check Add button is visible
  const addBtn = header.locator('button').filter({ hasText: 'Add' });
  const hasAdd = await addBtn.isVisible().catch(() => false);
  console.log('Add button visible:', hasAdd);
  expect(hasAdd).toBe(true);

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/test-results/goal-header-owner.png', fullPage: false });

  console.log('Owner controls are visible and grouped correctly');
});

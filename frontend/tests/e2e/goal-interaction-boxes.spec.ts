import { test, expect } from '@playwright/test';

/**
 * Test the "Click to react or comment" boxes behavior
 *
 * Expected behavior based on issue #58:
 * - Owner viewing own goal: Should NEVER see interaction prompts (they're for visitors)
 * - Visitor viewing public goal: SHOULD see interaction prompts
 * - Private goal: Only owner can see, so no visitors ever
 */

test('Owner viewing PUBLIC goal should NOT see "Click to react or comment"', async ({ page }) => {
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
  await page.waitForTimeout(2000);

  // Make sure it's PUBLIC
  const header = page.locator('header').first();
  const visBtn = header.locator('button').filter({ hasText: /Public|Private/ });
  const visText = await visBtn.textContent();

  if (visText?.includes('Private')) {
    await visBtn.click();
    await page.waitForTimeout(1500);
    console.log('Toggled to public');
  }

  // Verify it's now public
  const newVisText = await visBtn.textContent();
  console.log('Current visibility:', newVisText);
  expect(newVisText).toContain('Public');

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/test-results/owner-public-goal.png', fullPage: true });

  // As OWNER, I should NOT see "Click to react or comment" - those are for visitors
  const reactBoxes = page.locator('text="Click to react or comment"');
  const count = await reactBoxes.count();
  console.log('Owner sees "Click to react or comment" boxes:', count);

  // This should be 0 - owner shouldn't see visitor prompts
  expect(count).toBe(0);
});

test('Visitor viewing PUBLIC goal SHOULD see "Click to react or comment"', async ({ page }) => {
  // Don't login - view as anonymous visitor
  await page.goto('/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/test-results/visitor-public-goal.png', fullPage: true });

  // As VISITOR, I SHOULD see "Click to react or comment" prompts
  const reactBoxes = page.locator('text="Click to react or comment"');
  const count = await reactBoxes.count();
  console.log('Visitor sees "Click to react or comment" boxes:', count);

  // This should be > 0 - visitors should see interaction prompts on public goals
  expect(count).toBeGreaterThan(0);
});

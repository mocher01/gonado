import { test, expect } from '@playwright/test';

/**
 * Test that private goals don't show social interaction UI to owner
 */

test('Private goal should not show "Click to react or comment" boxes to owner', async ({ page }) => {
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

  // Make it private if not already
  const header = page.locator('header').first();
  const visBtn = header.locator('button').filter({ hasText: /Public|Private/ });
  const visText = await visBtn.textContent();
  console.log('Current visibility:', visText);

  if (visText?.includes('Public')) {
    await visBtn.click();
    await page.waitForTimeout(1500);
    console.log('Toggled to private');
  }

  // Screenshot after making private
  await page.screenshot({ path: 'tests/e2e/test-results/owner-private-goal.png', fullPage: true });

  // Count "Click to react or comment" boxes
  const reactBoxes = page.locator('text="Click to react or comment"');
  const count = await reactBoxes.count();
  console.log('Number of "Click to react or comment" boxes visible:', count);

  // On a PRIVATE goal, these should NOT be visible to the owner
  // because no one else can see the goal to interact with it
  expect(count).toBe(0);
});

test('Mood selector actually persists to backend', async ({ page, request }) => {
  // Login
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

  // Open mood selector
  const moodBtn = header.locator('button').filter({ hasText: /mood|Motivated|Focused|Celebrating|Confident|Stuck|Pushing/ });
  await moodBtn.click();
  await page.waitForTimeout(500);

  // Select "Celebrating"
  const celebratingOption = page.locator('button').filter({ hasText: 'Celebrating' }).last();
  await celebratingOption.click();
  await page.waitForTimeout(2000);

  // Check backend API to verify mood was saved
  const response = await request.get('http://162.55.213.90:7902/api/goals/fe093fe2-270b-4880-8785-8ec658e24576');
  const goal = await response.json();
  console.log('Backend mood value:', goal.current_mood);

  expect(goal.current_mood).toBe('celebrating');
});

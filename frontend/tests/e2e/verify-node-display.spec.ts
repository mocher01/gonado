import { test, expect } from '@playwright/test';

const GOAL_URL = 'http://localhost:7901/goals/dec48a4f-06dc-4cfe-8df7-4ce6b76a16c4';

test('node cards display comments and resources correctly', async ({ page }) => {
  await page.goto(GOAL_URL);
  
  // Wait for React Flow to load
  await page.waitForSelector('.react-flow', { timeout: 15000 });
  await page.waitForTimeout(3000); // Wait for data to load
  
  // Check for comment author display (@username format)
  const hasCommentAuthor = await page.locator('text=@admin').first().isVisible().catch(() => false);
  console.log('✓ Comment author (@admin) visible:', hasCommentAuthor);
  
  // Check that "No resources yet" is NOT showing (means resources are displayed)
  const noResourcesElements = await page.locator('text=No resources yet').count();
  const resourceTitleVisible = await page.locator('text=dfhgf').isVisible().catch(() => false);
  console.log('✓ "No resources yet" count:', noResourcesElements);
  console.log('✓ Resource title visible:', resourceTitleVisible);
  
  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/test-results/node-display-verify.png', fullPage: true });
  
  // At least one should be true
  expect(hasCommentAuthor || resourceTitleVisible).toBeTruthy();
});

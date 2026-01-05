import { test, expect } from '@playwright/test';

test('React Flow Controls and MiniMap', async ({ page }) => {
  await page.goto('/goals/e3dc9226-15d7-4421-903a-a4ece38dd586');
  await page.waitForSelector('.react-flow', { timeout: 15000 });

  // Check Controls exist
  const controls = page.locator('.react-flow__controls');
  const controlsVisible = await controls.isVisible().catch(() => false);
  console.log('Controls visible:', controlsVisible);

  // Check MiniMap exists
  const minimap = page.locator('.react-flow__minimap');
  const minimapVisible = await minimap.isVisible().catch(() => false);
  console.log('MiniMap visible:', minimapVisible);

  // Check zoom buttons
  const zoomIn = page.locator('.react-flow__controls-zoomin');
  const zoomInVisible = await zoomIn.isVisible().catch(() => false);
  console.log('Zoom In button visible:', zoomInVisible);

  // Screenshot for debug
  await page.screenshot({ path: 'tests/e2e/test-results/controls-debug.png', fullPage: true });

  // Assertions
  expect(controlsVisible).toBe(true);
  expect(minimapVisible).toBe(true);

  if (zoomInVisible) {
    // Try clicking zoom
    const viewport = page.locator('.react-flow__viewport');
    const before = await viewport.getAttribute('style') || '';
    await zoomIn.click();
    await page.waitForTimeout(300);
    const after = await viewport.getAttribute('style') || '';
    console.log('Before zoom:', before.substring(0, 50));
    console.log('After zoom:', after.substring(0, 50));
  }
});

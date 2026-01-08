import { test, expect } from '@playwright/test';

test('MiniMap and Controls layout check', async ({ page }) => {
  await page.goto('/goals/2edc91f9-62b8-4683-9bf5-8e9b6fb1c03c');
  await page.waitForSelector('.react-flow', { timeout: 15000 });

  // Wait for everything to load
  await page.waitForTimeout(2000);

  // Check MiniMap
  const minimap = page.locator('.react-flow__minimap');
  const minimapVisible = await minimap.isVisible().catch(() => false);
  console.log('MiniMap visible:', minimapVisible);

  // Check Controls
  const controls = page.locator('.react-flow__controls');
  const controlsVisible = await controls.isVisible().catch(() => false);
  console.log('Controls visible:', controlsVisible);

  // Check zoom buttons work
  const zoomIn = page.locator('.react-flow__controls-zoomin');
  const zoomInVisible = await zoomIn.isVisible().catch(() => false);
  console.log('Zoom In visible:', zoomInVisible);

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/test-results/minimap-layout.png', fullPage: true });

  // Get MiniMap position
  const minimapBox = await minimap.boundingBox();
  if (minimapBox) {
    console.log('MiniMap position:');
    console.log('  x:', minimapBox.x);
    console.log('  y:', minimapBox.y);
    console.log('  width:', minimapBox.width);
    console.log('  height:', minimapBox.height);
  }

  // Verify it's in bottom-left (y should be > 400 for bottom position)
  if (minimapBox) {
    expect(minimapBox.x).toBeLessThan(200); // Left side
    expect(minimapBox.y).toBeGreaterThan(400); // Bottom area
  }
});

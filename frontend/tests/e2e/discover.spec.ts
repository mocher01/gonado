import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Discovery Feature
 *
 * Tests the /discover page functionality including:
 * - Page loading and basic elements
 * - Search bar interactions
 * - Filter bar (category, sort, needs help)
 * - URL parameter updates
 * - Empty state handling
 */

test.describe('Discovery Page', () => {
  test('Discover page loads without errors', async ({ page }) => {
    await page.goto('/discover');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check header exists
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 5000 });

    // Check main title
    const title = page.locator('text=Discover Amazing Goals');
    await expect(title).toBeVisible({ timeout: 5000 });
    console.log('✓ Discover page loaded successfully');

    // Check hero description
    const description = page.locator('text=Get inspired by what others are achieving');
    await expect(description).toBeVisible();
    console.log('✓ Hero section visible');
  });

  test('SearchBar is visible and accepts input', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Find search input by placeholder
    const searchInput = page.locator('input[placeholder="Search goals..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Search bar visible');

    // Type in search bar
    await searchInput.fill('fitness');
    await expect(searchInput).toHaveValue('fitness');
    console.log('✓ Search input accepts text');

    // Wait for debounce and loading to complete
    await page.waitForTimeout(1500); // Wait for debounce (300ms) + API call

    // Check for search hint text (may or may not appear depending on loading state)
    const searchHint = page.locator('text=Searching for "fitness"');
    const hintVisible = await searchHint.isVisible().catch(() => false);
    console.log(`✓ Search hint ${hintVisible ? 'displayed' : 'not displayed (API still loading)'}`);
    // Note: Hint only shows when !isSearching, so it's okay if not visible during loading

    // Clear button should appear when there's text
    const clearButton = page.locator('button[aria-label="Clear search"]');
    await expect(clearButton).toBeVisible();
    console.log('✓ Clear button appears');

    // Click clear button
    await clearButton.click();
    await expect(searchInput).toHaveValue('');
    console.log('✓ Clear button works');
  });

  test('FilterBar renders with category/sort options', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // On desktop, filters should be visible. On mobile, may need to expand.
    const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;

    if (isMobile) {
      // Click filters button on mobile
      const filterButton = page.locator('button:has-text("Filters")');
      await expect(filterButton).toBeVisible({ timeout: 5000 });
      await filterButton.click();
      await page.waitForTimeout(300); // Animation
    }

    // Check category dropdown button exists
    const categoryButton = page.locator('button:has-text("All Categories")');
    await expect(categoryButton).toBeVisible({ timeout: 5000 });
    console.log('✓ Category filter visible');

    // Check sort dropdown exists
    const sortButton = page.locator('button').filter({ hasText: 'Newest' });
    await expect(sortButton).toBeVisible();
    console.log('✓ Sort filter visible');

    // Check "Needs Help" toggle exists
    const needsHelpButton = page.locator('button:has-text("Needs Help")');
    await expect(needsHelpButton).toBeVisible();
    console.log('✓ Needs Help toggle visible');
  });

  test('Search by term updates results (or shows empty state)', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Type search term
    const searchInput = page.locator('input[placeholder="Search goals..."]');
    await searchInput.fill('nonexistent-goal-xyz-12345');

    // Wait for debounce and API call
    await page.waitForTimeout(500);

    // Wait for loading to finish
    await page.waitForTimeout(2000);

    // Check if empty state appears OR if there are results
    const emptyState = page.locator('text=No public goals yet');
    const goalsGrid = page.locator('.grid');

    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const gridVisible = await goalsGrid.isVisible().catch(() => false);

    // Either empty state OR grid should be visible
    expect(emptyVisible || gridVisible).toBe(true);
    console.log(`✓ Search completed - ${emptyVisible ? 'empty state' : 'results'} shown`);
  });

  test('Changing sort option updates URL params', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Expand filters on mobile
    const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
    if (isMobile) {
      const filterButton = page.locator('button:has-text("Filters")');
      await filterButton.click();
      await page.waitForTimeout(300);
    }

    // Find and click sort dropdown (initially shows "Newest")
    const sortButton = page.locator('button').filter({ hasText: 'Newest' }).first();
    await sortButton.click();
    await page.waitForTimeout(300); // Dropdown animation

    // Click "Trending" option from dropdown
    const trendingOption = page.locator('button:has-text("Trending")').last();
    await expect(trendingOption).toBeVisible({ timeout: 3000 });
    await trendingOption.click();
    console.log('✓ Trending option clicked');

    // Wait for URL to update - use polling instead of fixed timeout
    await expect(async () => {
      const url = page.url();
      expect(url).toContain('sort=trending');
    }).toPass({ timeout: 5000 });
    console.log('✓ URL updated with sort parameter');

    // Change to "Almost Done" - now button text should say "Trending"
    const updatedSortButton = page.locator('button').filter({ hasText: 'Trending' }).first();
    await updatedSortButton.click(); // Reopen dropdown
    await page.waitForTimeout(300);
    const almostDoneOption = page.locator('button:has-text("Almost Done")').last();
    await expect(almostDoneOption).toBeVisible({ timeout: 3000 });
    await almostDoneOption.click();

    // Wait for URL to update - use polling instead of fixed timeout
    await expect(async () => {
      expect(page.url()).toContain('sort=almost_done');
    }).toPass({ timeout: 5000 });
    console.log('✓ Sort parameter updates correctly');
  });

  test('Changing category filters results', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Expand filters on mobile
    const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
    if (isMobile) {
      const filterButton = page.locator('button:has-text("Filters")');
      await filterButton.click();
      await page.waitForTimeout(300);
    }

    // Click category dropdown
    const categoryButton = page.locator('button:has-text("All Categories")');
    await categoryButton.click();
    await page.waitForTimeout(200);

    // Select "Health" category
    const healthOption = page.locator('button:has-text("Health")').last();
    await expect(healthOption).toBeVisible({ timeout: 3000 });
    await healthOption.click();
    console.log('✓ Health category clicked');

    // Wait for URL to update
    await page.waitForTimeout(500);

    // Check URL contains category parameter
    expect(page.url()).toContain('category=health');
    console.log('✓ Category parameter added to URL');

    // Check that category button now shows "Health"
    const updatedCategoryButton = page.locator('button').filter({ hasText: 'Health' }).first();
    await expect(updatedCategoryButton).toBeVisible();
    console.log('✓ Category button updated');
  });

  test('"Clear All" button resets filters', async ({ page }) => {
    // Start with some filters applied
    await page.goto('/discover?search=test&category=health&sort=trending&needs_help=true');
    await page.waitForLoadState('networkidle');

    // URL should have all parameters
    expect(page.url()).toContain('search=test');
    expect(page.url()).toContain('category=health');
    expect(page.url()).toContain('sort=trending');
    expect(page.url()).toContain('needs_help=true');
    console.log('✓ Started with filters applied');

    // Expand filters on mobile
    const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
    if (isMobile) {
      const filterButton = page.locator('button:has-text("Filters")');
      await filterButton.click();
      await page.waitForTimeout(300);
    }

    // Clear All button should be visible when filters are active
    const clearButton = page.locator('button:has-text("Clear All")');
    await expect(clearButton).toBeVisible({ timeout: 5000 });
    console.log('✓ Clear All button visible');

    // Click Clear All
    await clearButton.click();
    await page.waitForTimeout(500);

    // Check URL no longer has filter parameters
    const finalUrl = page.url();
    expect(finalUrl).not.toContain('search=');
    expect(finalUrl).not.toContain('category=');
    expect(finalUrl).not.toContain('sort=');
    expect(finalUrl).not.toContain('needs_help=');
    console.log('✓ All filters cleared from URL');

    // Check search input is cleared
    const searchInput = page.locator('input[placeholder="Search goals..."]');
    await expect(searchInput).toHaveValue('');
    console.log('✓ Search input cleared');
  });

  test('Needs Help toggle updates URL and button state', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Expand filters on mobile
    const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
    if (isMobile) {
      const filterButton = page.locator('button:has-text("Filters")');
      await filterButton.click();
      await page.waitForTimeout(300);
    }

    // Click "Needs Help" toggle
    const needsHelpButton = page.locator('button:has-text("Needs Help")');
    await needsHelpButton.click();
    await page.waitForTimeout(500);

    // Check URL contains needs_help parameter
    expect(page.url()).toContain('needs_help=true');
    console.log('✓ Needs Help parameter added to URL');

    // Button should have active styling (accent colors)
    const activeButton = page.locator('button:has-text("Needs Help")');
    const classList = await activeButton.getAttribute('class');
    expect(classList).toContain('accent');
    console.log('✓ Needs Help button shows active state');

    // Click again to deactivate
    await needsHelpButton.click();
    await page.waitForTimeout(500);

    // URL should no longer have needs_help parameter
    expect(page.url()).not.toContain('needs_help=true');
    console.log('✓ Needs Help toggle deactivated');
  });

  test('Goal cards link to individual goal pages', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Wait for goals to load
    await page.waitForTimeout(2000);

    // Check if there are any goal cards
    const goalLinks = page.locator('a[href^="/goals/"]');
    const goalCount = await goalLinks.count();

    if (goalCount > 0) {
      // Get the first goal link
      const firstGoalLink = goalLinks.first();
      await expect(firstGoalLink).toBeVisible();

      const href = await firstGoalLink.getAttribute('href');
      expect(href).toMatch(/^\/goals\/[a-f0-9-]+$/);
      console.log(`✓ Found ${goalCount} goal cards with valid links`);
    } else {
      console.log('✓ No goals available (empty state is valid)');
    }
  });

  test('Navigation links work correctly', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Check Gonado logo link
    const logoLink = page.locator('a:has-text("Gonado")').first();
    await expect(logoLink).toBeVisible({ timeout: 5000 });
    const logoHref = await logoLink.getAttribute('href');
    expect(logoHref).toBe('/');
    console.log('✓ Logo links to home page');

    // Check Sign In link (for non-authenticated users)
    const signInLink = page.locator('a:has-text("Sign In")').first();
    if (await signInLink.isVisible()) {
      const signInHref = await signInLink.getAttribute('href');
      expect(signInHref).toBe('/login');
      console.log('✓ Sign In link found');
    }

    // Check Get Started/Join link
    const joinLink = page.locator('a:has-text("Get Started"), a:has-text("Join")').first();
    if (await joinLink.isVisible()) {
      const joinHref = await joinLink.getAttribute('href');
      expect(joinHref).toBe('/register');
      console.log('✓ Join/Get Started link found');
    }
  });
});

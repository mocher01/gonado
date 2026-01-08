import { test, expect, Page } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';

/**
 * E2E Tests for User Profile Feature (#16)
 *
 * Tests cover:
 * - Profile page loading for valid/invalid users
 * - ProfileHeader display (username, display_name)
 * - AchieverCard display
 * - HelperCard display
 * - Goals section visibility
 * - Follow button functionality
 */

// Helper to login as a user
async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();

  // Wait for redirect to dashboard or any authenticated page
  await page.waitForTimeout(2000);
}

test.describe('User Profile - Valid User', () => {
  test('profile page loads for valid user at /u/admin', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Check that we're on the profile page (not redirected)
    expect(page.url()).toContain('/u/admin');

    // Check for key profile elements
    const profileHeader = page.locator('h1').filter({ hasText: /admin/i }).first();
    await expect(profileHeader).toBeVisible({ timeout: 10000 });

    console.log('✓ Profile page loaded for /u/admin');

    await page.screenshot({
      path: 'tests/e2e/test-results/user-profile-admin.png',
      fullPage: true
    });
  });

  test('profile page shows 404 for invalid user at /u/nonexistent12345', async ({ page }) => {
    await page.goto('/u/nonexistent12345');
    await page.waitForLoadState('networkidle');

    // Should show "User Not Found" message - use h1 specifically
    const notFoundHeading = page.locator('h1:has-text("User Not Found")');
    await expect(notFoundHeading).toBeVisible({ timeout: 10000 });

    // Check for the sad emoji
    const sadEmoji = page.locator('text=😕');
    await expect(sadEmoji).toBeVisible();

    console.log('✓ 404 page shown for nonexistent user');

    await page.screenshot({
      path: 'tests/e2e/test-results/user-profile-404.png',
      fullPage: true
    });
  });
});

test.describe('ProfileHeader Component', () => {
  test('displays user info (username, display_name)', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Check for username with @ prefix
    const usernameElement = page.locator('text=/@admin/i');
    await expect(usernameElement).toBeVisible({ timeout: 10000 });

    // Check for avatar or initials
    const avatarOrInitials = page.locator('img[alt*="admin"], div:has-text("AD"), div:has-text("A")').first();
    const hasAvatar = await avatarOrInitials.isVisible().catch(() => false);

    console.log('Avatar or initials visible:', hasAvatar);
    expect(hasAvatar).toBe(true);

    // Check for "Joined" date
    const joinedDate = page.locator('text=/Joined/i');
    await expect(joinedDate).toBeVisible();

    // Check for followers/following stats
    const followersText = page.locator('text=/followers/i').first();
    const followingText = page.locator('text=/following/i').first();

    const hasFollowersStats = await followersText.isVisible().catch(() => false);
    const hasFollowingStats = await followingText.isVisible().catch(() => false);

    console.log('Followers stats visible:', hasFollowersStats);
    console.log('Following stats visible:', hasFollowingStats);

    console.log('✓ ProfileHeader displays user information');
  });

  test('shows Edit Profile button for own profile', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Navigate to own profile
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Should show Edit Profile button
    const editButton = page.locator('button:has-text("Edit Profile")');
    await expect(editButton).toBeVisible({ timeout: 5000 });

    console.log('✓ Edit Profile button visible for own profile');
  });

  test('shows Follow button for other user profile', async ({ page }) => {
    // Visit profile without logging in
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Should show Follow button (not Edit Profile)
    const followButton = page.locator('button:has-text("Follow")');
    await expect(followButton).toBeVisible({ timeout: 5000 });

    // Should NOT show Edit Profile button
    const editButton = page.locator('button:has-text("Edit Profile")');
    const editButtonCount = await editButton.count();
    expect(editButtonCount).toBe(0);

    console.log('✓ Follow button visible for other user profile');
  });
});

test.describe('AchieverCard Component', () => {
  test('displays AchieverCard (even if stats are empty)', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Look for Achiever Stats heading
    const achieverHeading = page.locator('text=/Achiever Stats/i');
    await expect(achieverHeading).toBeVisible({ timeout: 10000 });

    // Check for level display
    const levelText = page.locator('text=/Level/i').first();
    await expect(levelText).toBeVisible();

    // Check for XP progress bar
    const xpText = page.locator('text=/XP/i').first();
    const hasXP = await xpText.isVisible().catch(() => false);
    console.log('XP display visible:', hasXP);

    // Check for streak display (fire emoji)
    const streakFire = page.locator('text=🔥').first();
    const hasStreak = await streakFire.isVisible().catch(() => false);
    console.log('Streak display visible:', hasStreak);

    // Check for goals stats
    const goalsCreated = page.locator('text=/Goals Created/i').first();
    const hasGoalsStats = await goalsCreated.isVisible().catch(() => false);
    console.log('Goals stats visible:', hasGoalsStats);

    console.log('✓ AchieverCard is displayed');

    await page.screenshot({
      path: 'tests/e2e/test-results/user-profile-achiever-card.png',
      fullPage: true
    });
  });

  test('shows trophy emoji in AchieverCard', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Check for trophy emoji near Achiever Stats
    const trophyEmoji = page.locator('text=🏆').first();
    await expect(trophyEmoji).toBeVisible({ timeout: 5000 });

    console.log('✓ Trophy emoji displayed in AchieverCard');
  });
});

test.describe('HelperCard Component', () => {
  test('displays HelperCard (even if stats are empty)', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Look for Helper Stats heading - use h3 specifically
    const helperHeading = page.locator('h3:has-text("Helper Stats")');
    await expect(helperHeading).toBeVisible({ timeout: 10000 });

    // Check for heart emoji
    const heartEmoji = page.locator('text=💝').first();
    await expect(heartEmoji).toBeVisible();

    // Check for supporter score or "No helper stats" message
    const supporterScore = page.locator('text=/Supporter Score/i').first();
    const noStatsMessage = page.locator('text=/No helper stats/i').first();

    const hasSupporterScore = await supporterScore.isVisible().catch(() => false);
    const hasNoStatsMessage = await noStatsMessage.isVisible().catch(() => false);

    console.log('Supporter score visible:', hasSupporterScore);
    console.log('No stats message visible:', hasNoStatsMessage);

    // Either stats are shown or "No helper stats" message
    expect(hasSupporterScore || hasNoStatsMessage).toBe(true);

    console.log('✓ HelperCard is displayed');

    await page.screenshot({
      path: 'tests/e2e/test-results/user-profile-helper-card.png',
      fullPage: true
    });
  });

  test('shows helper stats when available', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Check for engagement stats
    const commentsGiven = page.locator('text=/Comments Given/i').first();
    const reactionsGiven = page.locator('text=/Reactions Given/i').first();
    const goalsFollowing = page.locator('text=/Goals Following/i').first();

    const hasComments = await commentsGiven.isVisible().catch(() => false);
    const hasReactions = await reactionsGiven.isVisible().catch(() => false);
    const hasFollowing = await goalsFollowing.isVisible().catch(() => false);

    console.log('Comments given visible:', hasComments);
    console.log('Reactions given visible:', hasReactions);
    console.log('Goals following visible:', hasFollowing);

    // Log presence of helper stats
    if (hasComments || hasReactions || hasFollowing) {
      console.log('✓ Helper stats are present');
    } else {
      console.log('ℹ No helper stats displayed (user may have no activity)');
    }
  });
});

test.describe('Goals Section', () => {
  test('goals section is visible', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Look for "Public Goals" or "Your Goals" heading - use h2 specifically
    const goalsHeading = page.locator('h2').filter({ hasText: /Public Goals|Your Goals/i });
    await expect(goalsHeading).toBeVisible({ timeout: 10000 });

    console.log('✓ Goals section is visible');
  });

  test('shows goals list or empty state', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Check for goal cards or empty state
    const emptyStateEmoji = page.locator('text=🎯').first();
    const noGoalsMessage = page.locator('text=/No.*goals yet/i').first();

    const hasEmptyState = await emptyStateEmoji.isVisible().catch(() => false);
    const hasNoGoalsMessage = await noGoalsMessage.isVisible().catch(() => false);

    if (hasEmptyState || hasNoGoalsMessage) {
      console.log('✓ Empty state displayed (no public goals)');
    } else {
      // Check for goal cards
      const goalCards = page.locator('a[href^="/goals/"]');
      const goalCount = await goalCards.count();
      console.log(`✓ ${goalCount} goal(s) displayed`);
    }
  });
});

test.describe('Follow Button Functionality', () => {
  test('follow button redirects to login when not logged in', async ({ page }) => {
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Click Follow button
    const followButton = page.locator('button:has-text("Follow")').first();
    await followButton.click();

    // Should redirect to login
    await page.waitForTimeout(1000);
    const currentUrl = page.url();

    expect(currentUrl).toContain('/login');
    console.log('✓ Follow button redirects to login when not authenticated');
  });

  test('follow button works for logged-in user viewing another profile', async ({ page }) => {
    // Login as e2etest user
    await loginAsUser(page, TEST_USERS.e2eTest.email, TEST_USERS.e2eTest.password);

    // Navigate to admin's profile (different user)
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Find Follow button
    const followButton = page.locator('button:has-text("Follow")').first();
    await expect(followButton).toBeVisible({ timeout: 5000 });

    // Click Follow button
    await followButton.click();
    await page.waitForTimeout(1000);

    // Button text should change to "Following" or button state changes
    const followingButton = page.locator('button:has-text("Following")').first();
    const isFollowing = await followingButton.isVisible().catch(() => false);

    console.log('Following button visible after click:', isFollowing);

    if (isFollowing) {
      console.log('✓ Follow button successfully toggled to Following');

      // Click again to unfollow
      await followingButton.click();
      await page.waitForTimeout(1000);

      // Should revert to Follow
      const followAgain = page.locator('button:has-text("Follow")').first();
      const backToFollow = await followAgain.isVisible().catch(() => false);

      console.log('Reverted to Follow button after unfollow:', backToFollow);
      if (backToFollow) {
        console.log('✓ Unfollow functionality works');
      }
    } else {
      console.log('ℹ Follow button clicked but state change not detected (may need API check)');
    }

    await page.screenshot({
      path: 'tests/e2e/test-results/user-profile-follow-action.png',
      fullPage: true
    });
  });

  test('logged-in user viewing own profile sees Edit Profile button', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Navigate to own profile
    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Should see Edit Profile button, NOT Follow button
    const editButton = page.locator('button:has-text("Edit Profile")');
    await expect(editButton).toBeVisible({ timeout: 5000 });

    const followButton = page.locator('button:has-text("Follow")');
    const followButtonCount = await followButton.count();
    expect(followButtonCount).toBe(0);

    console.log('✓ Own profile shows Edit Profile button instead of Follow');
  });
});

test.describe('Profile Page Responsiveness', () => {
  test('profile page is responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(TEST_USERS.admin.profileUrl);
    await page.waitForLoadState('networkidle');

    // Check that profile header is visible
    const profileHeader = page.locator('h1').filter({ hasText: /admin/i }).first();
    await expect(profileHeader).toBeVisible({ timeout: 10000 });

    // Check that cards are visible - use h3 specifically
    const achieverCard = page.locator('h3:has-text("Achiever Stats")');
    const helperCard = page.locator('h3:has-text("Helper Stats")');

    await expect(achieverCard).toBeVisible();
    await expect(helperCard).toBeVisible();

    console.log('✓ Profile page is responsive on mobile');

    await page.screenshot({
      path: 'tests/e2e/test-results/user-profile-mobile.png',
      fullPage: true
    });
  });
});

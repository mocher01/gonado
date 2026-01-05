import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Gonado E2E Tests
 *
 * Test Structure:
 * - tests/e2e/social/    - Social interaction components (popup, comments, reactions)
 * - tests/e2e/auth/      - Authentication components (header, login, register)
 * - tests/e2e/goals/     - Goal page functionality
 * - tests/e2e/fixtures/  - Test data and fixtures
 * - tests/e2e/utils/     - Shared test utilities
 */

export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports' }],
    ['list']
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for the frontend */
    baseURL: process.env.TEST_BASE_URL || 'http://162.55.213.90:7901',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        // Use chromium for mobile (no webkit install needed)
      },
    },
  ],

  /* Output folder for test artifacts */
  outputDir: 'tests/e2e/test-results',

  /* Global timeout */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});

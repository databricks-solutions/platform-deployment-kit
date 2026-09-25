// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const serverPort = process.env.PLAYWRIGHT_PORT || '8000';
const serverCommand = process.env.PLAYWRIGHT_SKIP_BUILD === '1'
  ? `python3 -m http.server ${serverPort} -d dist`
  : `npm run build && python3 -m http.server ${serverPort} -d dist`;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'html' : 'list',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: `http://localhost:${serverPort}`,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
    /* Collect code coverage */
    ...(process.env.COVERAGE ? {
      coverage: {
        enabled: true,
        include: ['deploy/js/**/*.js'],
        exclude: ['**/node_modules/**', '**/test-results/**', '**/playwright-report/**'],
      }
    } : {}),
  },

  /* Configure projects for major browsers */
  /* By default, only Chromium is enabled. Uncomment other projects to test on multiple browsers. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment below to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    //
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    //
    // /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: serverCommand,
    url: `http://localhost:${serverPort}`,
    reuseExistingServer: !process.env.CI,
    cwd: '.',
    timeout: 120 * 1000,
  },
});

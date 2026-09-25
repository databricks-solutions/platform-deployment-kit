// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const serverPort = process.env.PLAYWRIGHT_PORT || '8000';
const serverCommand = process.env.PLAYWRIGHT_SKIP_BUILD === '1'
  ? `python3 -m http.server ${serverPort} -d dist`
  : `npm run build && python3 -m http.server ${serverPort} -d dist`;

/**
 * Playwright configuration for code coverage runs.
 *
 * This config:
 *   - Runs ALL e2e spec files (not just coverage.spec.js)
 *   - Sets COVERAGE=true so that coverage.js helpers collect V8 data
 *   - Cleans .coverage/ before tests (globalSetup)
 *   - Generates the Istanbul report after tests (globalTeardown)
 *
 * Usage:
 *   COVERAGE=true npx playwright test --config=playwright.coverage.config.js
 *   npm run test:coverage
 */

// Ensure the env var is set even when the config is loaded without it in the
// shell (e.g. direct npx invocation without the COVERAGE= prefix).
process.env.COVERAGE = 'true';

module.exports = defineConfig({
  testDir: './tests/e2e',

  // Run tests serially so coverage files don't collide; parallel is fine too
  // but serial is safer for file writes.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: 0,

  reporter: [
    ['list'],
    ['json', { outputFile: 'coverage/playwright/test-results.json' }],
  ],

  globalSetup: './tests/helpers/coverage-global-setup.js',
  globalTeardown: './tests/helpers/coverage-global-teardown.js',

  use: {
    baseURL: `http://localhost:${serverPort}`,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium-coverage',
      use: {
        ...devices['Desktop Chrome'],
        // --js-flags=--expose-gc is sometimes needed for V8 coverage
        launchOptions: {
          args: ['--js-flags=--expose-gc'],
        },
      },
    },
  ],

  webServer: {
    command: serverCommand,
    url: `http://localhost:${serverPort}`,
    reuseExistingServer: !process.env.CI,
    cwd: '.',
    timeout: 120 * 1000,
  },
});

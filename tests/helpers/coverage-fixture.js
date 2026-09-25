/**
 * Playwright fixture that wraps every test with V8 coverage collection.
 * Import `test` from this module instead of `@playwright/test` in spec files
 * that need per-test coverage wrapping.
 *
 * When COVERAGE !== 'true' the fixture is a transparent pass-through so the
 * same spec files work in both normal and coverage modes.
 */

const { test: base } = require('@playwright/test');
const { startCoverage, stopCoverage, isCoverageEnabled } = require('./coverage');

/**
 * Console messages we deliberately tolerate (substring match). Keep this list
 * tight and documented — every entry must be a known-benign browser log, not a
 * silenced real bug. Empty by design: add an entry only with a reason.
 */
const CONSOLE_ERROR_ALLOWLIST = [
  // e.g. 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED', // <why>
];

// The console guard is on by default. Set PW_ALLOW_CONSOLE_ERRORS=1 to bypass
// (e.g. while triaging a spec) without deleting the check.
const enforceConsole = process.env.PW_ALLOW_CONSOLE_ERRORS !== '1';

const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    // Capture browser-side errors: console.error() calls, failed resource
    // loads (logged as console errors), and uncaught exceptions (pageerror).
    const consoleErrors = [];
    if (enforceConsole) {
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (CONSOLE_ERROR_ALLOWLIST.some((allowed) => text.includes(allowed))) return;
        consoleErrors.push(`console.error: ${text}`);
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(`pageerror: ${err.message}`);
      });
    }

    if (isCoverageEnabled()) {
      await startCoverage(page);
    }

    await use(page);

    if (isCoverageEnabled()) {
      await stopCoverage(page, testInfo.title);
    }

    // Fail the test if the browser console reported any error during it.
    if (enforceConsole && consoleErrors.length > 0) {
      throw new Error(
        `Browser console reported ${consoleErrors.length} error(s) during "${testInfo.title}":\n` +
        consoleErrors.map((e) => `  - ${e}`).join('\n')
      );
    }
  },
});

module.exports = { test, expect: base.expect };

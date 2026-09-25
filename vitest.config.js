import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Measure the shipped browser modules that unit tests are responsible for.
      include: ['deploy/js/**/*.js'],
      exclude: [
        // app.js is the DOM/SPA controller — its coverage comes from the
        // Playwright e2e suite (browser V8), not unit tests.
        'deploy/js/app.js',
        // help-content.js is static help copy with no branching logic worth gating.
        'deploy/js/help-content.js',
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/unit',
      // Per-file floors: every complex pure-logic module must stay tested.
      // Set just under the levels the current suite achieves, so the gate
      // catches regressions without being red on day one.
      thresholds: {
        perFile: true,
        lines: 84,
        statements: 84,
        functions: 80,
        branches: 72,
      },
    },
  },
});

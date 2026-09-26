# Testing and quality pipeline

The whole test and quality pipeline runs locally from one script, without
GitHub Actions. When Actions is re-enabled, the workflow calls the same script,
so there is nothing to re-implement.

## One command

```bash
./scripts/test-all.sh
```

Stages, in order, fail-fast:

| Stage   | What it runs | Notes |
|---------|--------------|-------|
| `build` | `npm run build` | Produces `dist/`, fetches vendored Terraform. |
| `deps`  | `npm audit` | Reports all advisories; checks production deps at `--audit-level` (default `high`). Non-blocking unless `--strict-audit`. |
| `unit`  | `npx vitest run --coverage` | Vitest unit tests with V8 coverage and enforced thresholds (see `vitest.config.js`). |
| `e2e`   | `npm test` (Playwright) | Browser end-to-end tests. Add `--e2e-coverage` for the app.js coverage report. |

Useful flags:

```bash
./scripts/test-all.sh --only unit        # a single stage: build|deps|unit|e2e
./scripts/test-all.sh --skip e2e         # everything except a stage (repeatable)
./scripts/test-all.sh --e2e-coverage     # run e2e under coverage config (slower)
./scripts/test-all.sh --strict-audit     # make a production vulnerability fail the run
./scripts/test-all.sh --ci               # CI mode: sets CI=1 (retries, 1 worker, html report)
```

## Coverage model

Coverage is measured in two complementary layers:

- **Unit (Vitest, V8)** covers the pure logic modules. Thresholds are enforced
  per file in `vitest.config.js` and fail the run on regression. `app.js` and
  `help-content.js` are excluded here (see below). Report: `coverage/unit/`.
- **End-to-end (Playwright, V8 in the browser)** covers `app.js`, the DOM/SPA
  controller, which unit tests cannot reach. Run with `--e2e-coverage`.
  Report: `coverage/playwright/index.html`.

`app.js` is deliberately not unit-tested: it is a browser controller that builds
HTML and wires DOM events, so the e2e suite is the right place to exercise it.
`help-content.js` is static help copy with no branching logic worth gating.

The security-sensitive `template-loader.js` (external Terraform integrity
verification, SHA-256 checks, path-traversal guards) is covered by
`tests/unit/template-loader.test.js`.

## Node version

CI and the recommended local version are pinned in `.nvmrc` (Node 20 LTS). The
project also runs on newer Node: browser download for Playwright needs
Playwright >= 1.63 on Node 22+, which this project uses.

## Console errors are a test failure

Every e2e test runs through a fixture in `tests/helpers/coverage-fixture.js` that
fails the test if the browser logs a `console.error` or throws an uncaught
exception. Known-benign messages, if any ever appear, go in the documented
allowlist in that file, not silenced globally.

## Running in CI (when Actions is re-enabled)

`.github/workflows/ci.yml` is a thin wrapper:

```yaml
- run: ./scripts/test-all.sh --ci --e2e-coverage
```

Keep test logic in `scripts/test-all.sh`, not in the workflow, so local and CI
stay identical.

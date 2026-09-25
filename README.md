# One Click Databricks Deployer

A browser-based tool that generates ready-to-deploy Terraform projects for Databricks on AWS, Azure, and Google Cloud.

## What it does

1. Select a cloud provider.
2. Enter the workspace, networking, and security settings.
3. Review the configuration and download a ZIP containing the Terraform files, generated `terraform.tfvars`, and deployment instructions.

The application runs client-side. Provider Terraform files are prepared during the build, while configuration values are generated from the user’s selections.

## Supported deployments

- AWS: new or existing VPC, configurable NAT topology, and optional Back-end PrivateLink.
- Azure: new or existing VNet for the standard topology, or a dedicated VNet with optional Back-end Private Link and NAT.
- GCP: new VPC, regional subnet, Cloud Router, and Cloud NAT.

## Local development

Requirements: Node.js 20 (pinned in `.nvmrc`) and npm. Node 18+ runs the unit tests; the
Playwright browser install needs Playwright >= 1.63 on Node 22+, which this project uses.

```bash
npm install
npm run dev
```

Open `http://localhost:8000`. The development server rebuilds and refreshes the page when files under `deploy/` change.

For a production-like local run:

```bash
npm run build
npm start
```

## Tests

The full pipeline (build, dependency audit, unit + coverage, e2e + coverage)
runs from one script, locally, without GitHub Actions:

```bash
./scripts/test-all.sh
```

Or run stages directly:

```bash
npm run test:unit      # Vitest unit tests
npm run test:unit -- --coverage   # with coverage + enforced thresholds
npm test               # Playwright end-to-end tests
npm run test:coverage  # e2e with the app.js coverage report
```

Playwright also supports `npm run test:ui`, `npm run test:debug`, and `npm run test:headed`.

See [`docs/testing.md`](docs/testing.md) for the coverage model, flags, Node
version, and how CI reuses the same script.

## Project structure

- `deploy/`: application source, UI, templates, and the one-release legacy cache cleanup worker.
- `scripts/`: build, local development, and Terraform preparation scripts.
- `tests/`: unit and Playwright end-to-end tests.
- `dist/`: generated deployable artifact; create it with `npm run build`.

## Deployment

`npm run deploy` publishes the app to the `gh-pages` branch, gated by the full test pipeline:

```bash
npm run deploy   # runs scripts/deploy.sh
```

`scripts/deploy.sh` first runs `./scripts/test-all.sh --ci --strict-audit` (build,
dependency audit, unit + coverage, e2e). If any check fails, including a production
dependency vulnerability, the deploy aborts. On success it copies `dist/` (already built
by the pipeline) into a temporary repo and force-pushes it to `gh-pages`.

`scripts/deploy.sh` is the single source of deploy logic: when GitHub Actions is enabled,
the workflow's `deploy` job (tagged builds) runs the exact same script, so local and CI
publish identically.

`gh-pages` serves end users, so nothing un-gated reaches it: every publish goes through the
gated pipeline above. When Actions is enabled, also add GitHub branch protection to `gh-pages`
so only the deploy pipeline can push to it. See `CLAUDE.md` for the exact command.

## Security

Terraform ZIP generation happens entirely in the browser. Always review `terraform plan` and the generated README before applying infrastructure changes.

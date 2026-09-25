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

Requirements: Node.js 18 or newer and npm.

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

```bash
npm run test:unit
npm test
```

Playwright also supports `npm run test:ui`, `npm run test:debug`, and `npm run test:headed`.

## Project structure

- `deploy/`: application source, UI, templates, and the one-release legacy cache cleanup worker.
- `scripts/`: build, local development, and Terraform preparation scripts.
- `tests/`: unit and Playwright end-to-end tests.
- `dist/`: generated deployable artifact; create it with `npm run build`.

## Deployment

Run `npm run build`, then publish `dist/`. Tagged builds are deployed to GitHub Pages by the CI workflow.

## Security

Terraform ZIP generation happens entirely in the browser. Always review `terraform plan` and the generated README before applying infrastructure changes.

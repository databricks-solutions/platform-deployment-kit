# One Click Databricks Deployer documentation

The application guides users through cloud selection, provider-specific configuration, review, and Terraform ZIP generation.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:8000`. Use `npm run build && npm start` for a production-like run.

## Generated project

Each ZIP contains the Terraform source files for the selected provider and topology, a generated `terraform.tfvars`, licensing files, and a provider-specific README with authentication and deployment steps.

## Development notes

- Application source is under `deploy/`.
- `npm run build` prepares the deployable `dist/` directory and required Terraform sources.
- `npm run dev` watches `deploy/`, synchronizes changes into `dist/`, and refreshes connected browsers.
- Run `npm run test:unit` for unit tests and `npm test` for Playwright tests.

The small `deploy/sw.js` file only retires caches and registrations left by older installable releases. It does not provide offline behavior or intercept requests.

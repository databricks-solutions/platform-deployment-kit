const fs = require('fs');
const JSZip = require('jszip');
const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');

async function downloadProject(page) {
  await FormHelpers.confirmAndGenerate(page);
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.locator('#download-project-btn').click();
  const download = await downloadPromise;
  const archive = await JSZip.loadAsync(await fs.promises.readFile(await download.path()));
  return { download, archive };
}

test.describe('GCP critical journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await FormHelpers.selectProvider(page, 'gcp');
  });

  test('shows the fixed standalone BYOVPC topology', async ({ page }) => {
    for (const name of [
      'project_prefix', 'project_id', 'google_service_account_email',
      'databricks_account_id', 'databricks_admin_user', 'subnet_cidr'
    ]) {
      await expect(page.locator(`[name="${name}"]`)).toBeVisible();
    }
    await expect(page.locator('#gcp-standard-network-info')).toBeVisible();
    await expect(page.locator('[name="pricing_tier"]')).toHaveCount(0);
    await expect(page.locator('#create_new_vpc')).toHaveCount(0);
    await expect(page.locator('#enable_private_link')).toBeVisible();
    await expect(page.locator('#nat-gateway-section')).toBeHidden();
  });

  test('summarizes and downloads the generated Terraform project', async ({ page }) => {
    await FormHelpers.fillGcpConfig(page, {
      project_prefix: 'gcp-download',
      region: 'us-east1',
      project_id: 'gcp-download-project',
      google_service_account_email: 'creator@gcp-download-project.iam.gserviceaccount.com',
      databricks_account_id: '33333333-3333-4333-8333-333333333333',
      databricks_admin_user: 'admin+gcp@example.com',
      subnet_cidr: '10.30.0.0/20'
    });
    await FormHelpers.submitConfigForm(page);

    await expect(page).toHaveURL(/.*#\/summary/);
    await expect(page.getByText('gcp-download-project', { exact: true })).toBeVisible();
    await expect(page.getByText('10.30.0.0/20', { exact: true })).toBeVisible();

    const { download, archive } = await downloadProject(page);
    expect(download.suggestedFilename()).toBe('gcp-download-gcp-terraform.zip');
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'databricks.tf', 'network.tf', 'providers.tf', 'variables.tf',
      'terraform.tfvars', 'README.md'
    ]));
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('google_project_name          = "gcp-download-project"');
    expect(tfvars).toContain('databricks_workspace_name = "gcp-download"');
    expect(tfvars).toContain('subnet_cidr = "10.30.0.0/20"');
    expect(tfvars).not.toContain('private_service_connect');
    expect(await archive.file('network.tf').async('string')).toContain('google_compute_router_nat');
  });

  test('downloads the Back-end PSC project without Cloud NAT', async ({ page }) => {
    await FormHelpers.fillGcpConfig(page, {
      project_prefix: 'gcp-private',
      region: 'us-east1',
      project_id: 'gcp-private-project',
      google_service_account_email: 'creator@gcp-private-project.iam.gserviceaccount.com',
      databricks_account_id: '44444444-4444-4444-8444-444444444444',
      databricks_admin_user: 'admin+private@example.com',
      subnet_cidr: '10.40.0.0/22'
    });
    await FormHelpers.fillNetworkConfig(page, { enable_private_link: true });
    await page.locator('#psc_subnet_cidr').fill('10.40.4.0/28');
    await page.locator('#nat_gateway_mode').selectOption('none');

    await expect(page.locator('#gcp-private-link-network-fields')).toBeVisible();
    await expect(page.locator('#nat-gateway-private-link-message')).toBeVisible();
    await FormHelpers.submitConfigForm(page);

    await expect(page).toHaveURL(/.*#\/summary/);
    await expect(page.getByText('Back-end PSC:', { exact: true })).toBeVisible();
    await expect(page.getByText('Not created', { exact: true })).toBeVisible();

    const { archive } = await downloadProject(page);
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'databricks.tf', 'dns.tf', 'network.tf', 'psc.tf', 'providers.tf',
      'variables.tf', 'terraform.tfvars', 'README.md'
    ]));
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('psc_subnet_cidr = "10.40.4.0/28"');
    expect(tfvars).toContain('create_nat_gateway = false');
    expect(tfvars).toContain('projects/general-prod-useast1-01/regions/us-east1/serviceAttachments/plproxy-psc-endpoint-all-ports');
    expect(tfvars).toContain('projects/prod-gcp-us-east1/regions/us-east1/serviceAttachments/ngrok-psc-endpoint');
    expect(tfvars).toContain('metastore_id = ""');
    expect(await archive.file('psc.tf').async('string')).toContain('google_compute_forwarding_rule');
  });
});

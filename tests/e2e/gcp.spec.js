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
    await expect(page.getByText('This deployment creates a new VPC', { exact: false })).toBeVisible();
    await expect(page.locator('[name="pricing_tier"]')).toHaveCount(0);
    await expect(page.locator('#create_new_vpc')).toHaveCount(0);
    await expect(page.locator('#enable_private_link')).toHaveCount(0);
    await expect(page.locator('#nat_gateway_mode')).toHaveCount(0);
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
});

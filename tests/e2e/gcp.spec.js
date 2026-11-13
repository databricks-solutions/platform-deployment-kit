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

  test('shows the standalone BYOVPC topology with VPC and metastore choices', async ({ page }) => {
    for (const name of [
      'project_prefix', 'project_id', 'google_service_account_email',
      'databricks_account_id', 'databricks_admin_user', 'subnet_cidr'
    ]) {
      await expect(page.locator(`[name="${name}"]`)).toBeVisible();
    }
    await expect(page.locator('#gcp-standard-network-info')).toBeVisible();
    await expect(page.locator('[name="pricing_tier"]')).toHaveCount(0);
    await expect(page.locator('#create_new_vpc')).toBeVisible();
    await expect(page.locator('#create_new_vpc')).toBeChecked();
    await expect(page.locator('#enable_private_link')).toBeVisible();
    await expect(page.locator('#nat-gateway-section')).toBeHidden();
    await expect(page.locator('#unity-catalog-configuration')).toBeVisible();
    await expect(page.locator('#gcp-existing-vpc-section')).toBeHidden();
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
    await expect(page.getByText('Cloud NAT:', { exact: true })).toBeVisible();

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
    expect(tfvars).toContain('metastore_id   = ""');
    expect(tfvars).toContain('metastore_name = "gcp-download-metastore"');
    expect(tfvars).not.toContain('private_service_connect');
    expect(await archive.file('network.tf').async('string')).toContain('google_compute_router_nat');
  });

  test('downloads an existing-VPC project attached to a metastore', async ({ page }) => {
    await FormHelpers.fillGcpConfig(page, {
      project_prefix: 'gcp-existing',
      region: 'us-east1',
      project_id: 'gcp-service-project',
      google_service_account_email: 'creator@gcp-service-project.iam.gserviceaccount.com',
      databricks_account_id: '66666666-6666-4666-8666-666666666666',
      databricks_admin_user: 'admin+existing@example.com'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: false,
      existing_vpc_id: 'shared-databricks-vpc',
      existing_subnet_name: 'databricks-subnet',
      vpc_network_project_id: 'gcp-host-project'
    });
    await page.locator('#metastore_mode_existing').check();
    await expect(page.locator('#existing-metastore-section')).toBeVisible();
    await page.locator('#metastore_id').fill('metastore-gcp-1234');
    await expect(page.locator('#gcp-existing-vpc-section')).toBeVisible();
    await expect(page.locator('#gcp-new-vpc-fields')).toBeHidden();
    await FormHelpers.submitConfigForm(page);

    await expect(page).toHaveURL(/.*#\/summary/);
    await expect(page.getByText('Use Existing', { exact: true })).toBeVisible();
    await expect(page.getByText('shared-databricks-vpc')).toBeVisible();
    await expect(page.getByText('metastore-gcp-1234')).toBeVisible();

    const { archive } = await downloadProject(page);
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'databricks.tf', 'network.tf', 'providers.tf', 'variables.tf',
      'terraform.tfvars', 'README.md'
    ]));
    expect(Object.keys(archive.files)).not.toEqual(expect.arrayContaining(['psc.tf']));
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('vpc_name               = "shared-databricks-vpc"');
    expect(tfvars).toContain('subnet_name            = "databricks-subnet"');
    expect(tfvars).toContain('vpc_network_project_id = "gcp-host-project"');
    expect(tfvars).toContain('metastore_id   = "metastore-gcp-1234"');
    expect(tfvars).not.toContain('subnet_cidr');
    expect(await archive.file('network.tf').async('string')).toContain('google_compute_network');
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
    expect(tfvars).toContain('metastore_id   = ""');
    expect(tfvars).toContain('metastore_name = "gcp-private-metastore"');
    expect(await archive.file('psc.tf').async('string')).toContain('google_compute_forwarding_rule');
  });

  test('downloads the Back-end PSC project with a Cloud NAT', async ({ page }) => {
    // Covers PSC (Private Link) combined with Cloud NAT mode "single".
    await FormHelpers.fillGcpConfig(page, {
      project_prefix: 'gcp-psc-nat',
      region: 'us-east1',
      project_id: 'gcp-psc-nat-project',
      google_service_account_email: 'creator@gcp-psc-nat-project.iam.gserviceaccount.com',
      databricks_account_id: '55555555-5555-4555-8555-555555555555',
      databricks_admin_user: 'admin+pscnat@example.com',
      subnet_cidr: '10.50.0.0/22'
    });
    await FormHelpers.fillNetworkConfig(page, { enable_private_link: true });
    await page.locator('#psc_subnet_cidr').fill('10.50.4.0/28');
    await page.locator('#nat_gateway_mode').selectOption('single');

    await expect(page.locator('#gcp-private-link-network-fields')).toBeVisible();
    await FormHelpers.submitConfigForm(page);
    const { archive } = await downloadProject(page);
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'databricks.tf', 'dns.tf', 'network.tf', 'psc.tf', 'terraform.tfvars'
    ]));
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('psc_subnet_cidr = "10.50.4.0/28"');
    expect(tfvars).toContain('create_nat_gateway = true');
  });

  test('downloads Back-end PSC on an existing VPC', async ({ page }) => {
    await FormHelpers.fillGcpConfig(page, {
      project_prefix: 'gcp-existing-psc',
      region: 'us-east1',
      project_id: 'gcp-service-project',
      google_service_account_email: 'creator@gcp-service-project.iam.gserviceaccount.com',
      databricks_account_id: '77777777-7777-4777-8777-777777777777',
      databricks_admin_user: 'admin+existing-psc@example.com'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: false,
      existing_vpc_id: 'shared-databricks-vpc',
      existing_subnet_name: 'databricks-subnet',
      vpc_network_project_id: 'gcp-host-project',
      enable_private_link: true
    });
    await page.locator('#psc_subnet_cidr').fill('10.60.4.0/28');
    await page.locator('#nat_gateway_mode').selectOption('single');

    await expect(page.locator('#create_new_vpc')).toBeEnabled();
    await expect(page.locator('#create_new_vpc')).not.toBeChecked();
    await expect(page.locator('#gcp-existing-vpc-section')).toBeVisible();
    await expect(page.locator('#gcp-existing-psc-network-info')).toBeVisible();
    await expect(page.locator('#gcp-private-link-network-fields')).toBeVisible();
    await expect(page.locator('#gcp-new-vpc-fields')).toBeHidden();
    await FormHelpers.submitConfigForm(page);

    await expect(page).toHaveURL(/.*#\/summary/);
    await expect(page.getByText('Use Existing', { exact: true })).toBeVisible();
    await expect(page.getByText('Back-end PSC:', { exact: true })).toBeVisible();
    await expect(page.getByText('10.60.4.0/28', { exact: true })).toBeVisible();

    const { archive } = await downloadProject(page);
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'databricks.tf', 'dns.tf', 'network.tf', 'psc.tf', 'providers.tf',
      'variables.tf', 'terraform.tfvars', 'README.md'
    ]));
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('vpc_name               = "shared-databricks-vpc"');
    expect(tfvars).toContain('subnet_name            = "databricks-subnet"');
    expect(tfvars).toContain('vpc_network_project_id = "gcp-host-project"');
    expect(tfvars).toContain('psc_subnet_cidr = "10.60.4.0/28"');
    expect(tfvars).toContain('create_nat_gateway = true');
    expect(tfvars.split('\n').some(line => line.trim().startsWith('subnet_cidr ='))).toBe(false);
    expect(await archive.file('network.tf').async('string')).toMatch(/use_existing_vpc|var\.vpc_name/);
    const readme = await archive.file('README.md').async('string');
    expect(readme).toContain('reuses the existing VPC');
    expect(readme).toContain('gcloud services enable compute.googleapis.com dns.googleapis.com --project gcp-host-project');
    expect(readme).toContain('No existing Cloud NAT gateway in `us-east1` on `shared-databricks-vpc`');
    expect(readme).not.toMatch(/\{\{|\}\}/);
  });
});

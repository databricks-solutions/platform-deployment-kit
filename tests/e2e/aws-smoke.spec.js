const fs = require('fs');
const JSZip = require('jszip');
const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');
const NavigationHelpers = require('../helpers/navigation-helpers');

async function downloadProject(page) {
  await FormHelpers.confirmAndGenerate(page);
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.locator('#download-project-btn').click();
  const download = await downloadPromise;
  const archive = await JSZip.loadAsync(await fs.promises.readFile(await download.path()));
  return { download, archive };
}

test.describe('AWS critical journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await FormHelpers.selectProvider(page, 'aws');
  });

  test('generates a standard new-VPC Terraform project', async ({ page }) => {
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-standard',
      region: 'us-west-2',
      pricing_tier: 'PREMIUM'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: true,
      vpc_cidr: '10.16.0.0/22',
      availability_zones: ['us-west-2a', 'us-west-2b']
    });
    await page.locator('#nat_gateway_mode').selectOption('per_az');
    await expect(page.locator('.subnet-size-radio')).toHaveCount(2);
    await expect(page.locator('#subnet-size-25')).toBeChecked();
    await page.locator('label[for="subnet-size-26"]').click();
    await expect(page.locator('#subnet-size-26')).toBeChecked();

    await FormHelpers.submitConfigForm(page);
    await expect(page).toHaveURL(/.*#\/summary/);
    await expect(page.getByText('aws-standard', { exact: true }).first()).toBeVisible();
    const { download, archive } = await downloadProject(page);

    expect(download.suggestedFilename()).toBe('aws-standard-aws-terraform.zip');
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'network.tf', 'workspace.tf', 'variables.tf', 'outputs.tf',
      'terraform.tfvars', 'README.md'
    ]));
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('region          = "us-west-2"');
    expect(tfvars).toContain('nat_gateway_mode        = "per_az"');
    expect(tfvars).toContain('pricing_tier            = "PREMIUM"');
    expect(tfvars).toContain('10.16.0.0/26');
  });

  test('requires Enterprise PrivateLink when NAT is disabled', async ({ page }) => {
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-private',
      region: 'us-east-1',
      pricing_tier: 'PREMIUM'
    });
    await expect(page.locator('#enable_private_link')).toBeDisabled();

    await FormHelpers.fillBasicConfig(page, { pricing_tier: 'ENTERPRISE' });
    await FormHelpers.fillNetworkConfig(page, {
      vpc_cidr: '10.32.0.0/20',
      availability_zones: ['us-east-1a', 'us-east-1b'],
      enable_private_link: true
    });
    await page.locator('#nat_gateway_mode').selectOption('none');
    await expect(page.locator('#nat-gateway-private-link-message')).toBeVisible();
    await expect(page.locator('#subnet-size-range')).toBeVisible();
    await expect(page.locator('#subnet-size-select')).toHaveCount(0);

    await FormHelpers.submitConfigForm(page);
    const { archive } = await downloadProject(page);
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('network_configuration     = "fully_private"');
    expect(tfvars).toContain('endpoint_subnet_cidr');
    expect(tfvars).not.toContain('pricing_tier');
  });

  test('supports an existing VPC', async ({ page }) => {
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-existing',
      region: 'eu-west-1',
      pricing_tier: 'PREMIUM'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: false,
      existing_vpc_id: 'vpc-0123456789abcdef0'
    });
    const subnetInputs = page.locator('.existing-subnet-input');
    await subnetInputs.nth(0).fill('subnet-0123456789abcdef0');
    await subnetInputs.nth(1).fill('subnet-1234567890abcdef0');
    await page.locator('#existing_security_group_id').fill('sg-0123456789abcdef0');

    await FormHelpers.submitConfigForm(page);
    await expect(page).toHaveURL(/.*#\/summary/);
    await expect(page.getByText('vpc-0123456789abcdef0', { exact: true })).toBeVisible();

    // Full journey through to download for the existing-VPC path.
    const { download, archive } = await downloadProject(page);
    expect(download.suggestedFilename()).toBe('aws-existing-aws-terraform.zip');
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('vpc-0123456789abcdef0');
    expect(tfvars).toContain('subnet-0123456789abcdef0');
  });

  test('preserves configuration when returning from the summary', async ({ page }) => {
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-persist',
      region: 'us-east-1',
      pricing_tier: 'PREMIUM'
    });
    await FormHelpers.fillNetworkConfig(page, {
      vpc_cidr: '10.48.0.0/20',
      availability_zones: ['us-east-1a', 'us-east-1b']
    });
    await FormHelpers.submitConfigForm(page);
    await NavigationHelpers.navigateBack(page);

    await expect(page).toHaveURL(/.*#\/configure/);
    await expect(page.locator('[name="project_prefix"]')).toHaveValue('aws-persist');
    await expect(page.locator('[name="region"]')).toHaveValue('us-east-1');
  });

  test('regenerates the project on download after a page reload', async ({ page }) => {
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-reload',
      region: 'us-east-1',
      pricing_tier: 'PREMIUM'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: true,
      vpc_cidr: '10.64.0.0/20',
      availability_zones: ['us-east-1a', 'us-east-1b']
    });
    await FormHelpers.submitConfigForm(page);
    await FormHelpers.confirmAndGenerate(page);
    await expect(page).toHaveURL(/.*#\/download/);

    // Reload drops the in-memory ZIP blob but keeps the config in localStorage,
    // so the download button must go through the regenerate path in app.js.
    await page.reload();
    await expect(page.locator('#download-project-btn')).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.locator('#download-project-btn').click();
    const download = await downloadPromise;
    const archive = await JSZip.loadAsync(await fs.promises.readFile(await download.path()));

    expect(download.suggestedFilename()).toBe('aws-reload-aws-terraform.zip');
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'terraform.tfvars', 'README.md'
    ]));
  });

  test('generates a new-VPC project with a single NAT gateway on the Enterprise tier', async ({ page }) => {
    // Covers the NAT mode "single" branch and the Enterprise-tier-without-PrivateLink variant.
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-single',
      region: 'us-east-1',
      pricing_tier: 'ENTERPRISE'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: true,
      vpc_cidr: '10.80.0.0/20',
      availability_zones: ['us-east-1a', 'us-east-1b']
    });
    await page.locator('#nat_gateway_mode').selectOption('single');

    await FormHelpers.submitConfigForm(page);
    const { download, archive } = await downloadProject(page);
    expect(download.suggestedFilename()).toBe('aws-single-aws-terraform.zip');
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('nat_gateway_mode');
    expect(tfvars).toContain('"single"');
    expect(tfvars).toContain('"ENTERPRISE"');
  });

  test('generates an existing-VPC PrivateLink project with VPC endpoints', async ({ page }) => {
    // Existing VPC + Back-end PrivateLink (Enterprise) exposes the VPC endpoint fields.
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-existing-pl',
      region: 'us-east-1',
      pricing_tier: 'ENTERPRISE'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: false,
      existing_vpc_id: 'vpc-0123456789abcdef0',
      enable_private_link: true
    });
    const subnetInputs = page.locator('.existing-subnet-input');
    await subnetInputs.nth(0).fill('subnet-0123456789abcdef0');
    await subnetInputs.nth(1).fill('subnet-1234567890abcdef0');
    await page.locator('#existing_security_group_id').fill('sg-0123456789abcdef0');

    await expect(page.locator('#existing-privatelink-endpoints-section')).toBeVisible();
    await page.locator('#backend_rest_aws_vpce_id').fill('vpce-0123456789abcdef0');
    await page.locator('#backend_relay_aws_vpce_id').fill('vpce-abcdef0123456789a');

    await FormHelpers.submitConfigForm(page);
    const { archive } = await downloadProject(page);
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('vpce-0123456789abcdef0');
    expect(tfvars).toContain('vpce-abcdef0123456789a');
  });

  test('generates a project attached to an existing metastore', async ({ page }) => {
    // Covers the Unity Catalog metastore_mode = "existing" branch.
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-metastore',
      region: 'us-east-1',
      pricing_tier: 'PREMIUM'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: true,
      vpc_cidr: '10.96.0.0/20',
      availability_zones: ['us-east-1a', 'us-east-1b']
    });
    await page.locator('#nat_gateway_mode').selectOption('per_az');
    await page.locator('#metastore_mode_existing').check();
    await expect(page.locator('#existing-metastore-section')).toBeVisible();
    await page.locator('#metastore_id').fill('metastore-1234abcd');

    await FormHelpers.submitConfigForm(page);
    const { archive } = await downloadProject(page);
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('metastore-1234abcd');
  });

  test('excludes README.md from the ZIP when documentation is disabled', async ({ page }) => {
    // The "Include documentation" checkbox on the summary page must affect the ZIP.
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'aws-no-docs',
      region: 'us-east-1',
      pricing_tier: 'PREMIUM'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: true,
      vpc_cidr: '10.112.0.0/20',
      availability_zones: ['us-east-1a', 'us-east-1b']
    });
    await page.locator('#nat_gateway_mode').selectOption('per_az');
    await FormHelpers.submitConfigForm(page);

    await page.locator('#include_docs').uncheck();
    const { archive } = await downloadProject(page);
    expect(Object.keys(archive.files)).not.toContain('README.md');
    expect(Object.keys(archive.files)).toContain('terraform.tfvars');
  });
});

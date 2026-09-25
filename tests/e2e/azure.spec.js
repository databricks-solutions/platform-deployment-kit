const fs = require('fs');
const JSZip = require('jszip');
const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');

const EXISTING_VNET_ID = '/subscriptions/11111111-1111-4111-8111-111111111111/resourceGroups/rg-existing-network/providers/Microsoft.Network/virtualNetworks/existing-vnet';

async function enablePrivateLink(page, resourceGroupMode = 'new') {
  await FormHelpers.fillNetworkConfig(page, { enable_private_link: true });
  await page.locator('#azure_resource_group_mode').selectOption(resourceGroupMode);
  if (resourceGroupMode === 'existing') {
    await page.locator('[name="azure_existing_resource_group_name"]').fill('rg-existing-data-plane');
  }
}

async function downloadProject(page) {
  await FormHelpers.confirmAndGenerate(page);
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.locator('#download-project-btn').click();
  const download = await downloadPromise;
  const archive = await JSZip.loadAsync(await fs.promises.readFile(await download.path()));
  return { download, archive };
}

test.describe('Azure critical journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await FormHelpers.selectProvider(page, 'azure');
  });

  test('generates the standard new-VNet Terraform project', async ({ page }) => {
    await FormHelpers.fillAzureConfig(page, {
      project_prefix: 'azure-standard',
      resource_group_name: 'rg-standard-workspace',
      azure_vnet_resource_group_name: 'rg-standard-network'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: true,
      vpc_cidr: '10.16.0.0/20',
      azure_nat_gateway_zone: '2'
    });
    await expect(page.locator('[name="pricing_tier"]')).toHaveCount(0);

    await FormHelpers.submitConfigForm(page);
    const { download, archive } = await downloadProject(page);
    expect(download.suggestedFilename()).toBe('azure-standard-azure-terraform.zip');
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'azure.tf', 'network.tf', 'unity_catalog.tf', 'terraform.tfvars', 'README.md'
    ]));
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('resource_group_name   = "rg-standard-workspace"');
    expect(tfvars).toContain('create_new_vnet          = true');
    expect(tfvars).toContain('nat_gateway_zones        = ["2"]');
  });

  test('supports an existing VNet', async ({ page }) => {
    await FormHelpers.fillAzureConfig(page, {
      project_prefix: 'azure-existing',
      resource_group_name: 'rg-existing-workspace'
    });
    await FormHelpers.fillNetworkConfig(page, {
      create_new_vpc: false,
      existing_vpc_id: EXISTING_VNET_ID,
      vpc_cidr: '10.32.0.0/20'
    });

    await expect(page.locator('#existing-vpc-section')).toBeVisible();
    await FormHelpers.submitConfigForm(page);
    await expect(page).toHaveURL(/.*#\/summary/);
    await expect(page.getByText(EXISTING_VNET_ID, { exact: true })).toBeVisible();
  });

  test('generates Private Link with a NAT gateway', async ({ page }) => {
    await FormHelpers.fillAzureConfig(page, { project_prefix: 'azure-pl-nat' });
    await enablePrivateLink(page, 'existing');
    await page.locator('#nat_gateway_mode').selectOption('single');
    await page.locator('#azure_private_link_nat_gateway_zone').selectOption('3');
    await FormHelpers.fillNetworkConfig(page, { vpc_cidr: '10.48.0.0/20' });

    await FormHelpers.submitConfigForm(page);
    const { archive } = await downloadProject(page);
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      'dns_zones.tf', 'ncc.tf', 'pe_backend.tf', 'pe_dbfs.tf', 'terraform.tfvars'
    ]));
    expect(archive.file('unity_catalog.tf')).toBeNull();
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('create_data_plane_resource_group        = false');
    expect(tfvars).toContain('create_nat_gateway = true');
    expect(tfvars).toContain('nat_gateway_zones = ["3"]');
  });

  test('generates Private Link without a NAT gateway', async ({ page }) => {
    await FormHelpers.fillAzureConfig(page, { project_prefix: 'azure-pl-no-nat' });
    await enablePrivateLink(page);
    await page.locator('#nat_gateway_mode').selectOption('none');
    await FormHelpers.fillNetworkConfig(page, { vpc_cidr: '10.64.0.0/20' });
    await expect(page.locator('#nat-gateway-private-link-message')).toBeVisible();

    await FormHelpers.submitConfigForm(page);
    const { archive } = await downloadProject(page);
    const tfvars = await archive.file('terraform.tfvars').async('string');
    expect(tfvars).toContain('create_nat_gateway = false');
    expect(tfvars).toContain('nat_gateway_zones = []');
  });
});

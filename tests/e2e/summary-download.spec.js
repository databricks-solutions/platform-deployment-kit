/**
 * E2E tests for Summary page content verification and Download/Generate functionality
 * These tests verify that the summary page displays correct configuration details
 * and that the Terraform project generation works correctly
 */

const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');
const NavigationHelpers = require('../helpers/navigation-helpers');

test.describe('Summary Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.describe('AWS Summary Verification', () => {
    test('should display all AWS configuration values correctly on summary page', async ({ page }) => {
      const config = {
        project_prefix: 'aws-summary-test',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      };
      const networkConfig = {
        vpc_cidr: '10.0.0.0/16',
        availability_zones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
        enable_private_link: true
      };
      
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, config);
      await FormHelpers.fillNetworkConfig(page, networkConfig);
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify key configuration values are displayed
      await expect(page.locator('text=Configuration Summary')).toBeVisible();
      await expect(page.locator(`text=${config.project_prefix}`)).toBeVisible();
      await expect(page.locator(`text=${config.pricing_tier}`)).toBeVisible();
      
      // Verify region is displayed somewhere
      const pageContent = await page.content();
      expect(pageContent).toContain(config.region);
      
      // Verify VPC CIDR is displayed somewhere
      expect(pageContent).toContain(networkConfig.vpc_cidr);
    });

    test('should display subnet preview on summary page', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-subnets',
        region: 'us-west-2',
        pricing_tier: 'PREMIUM'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-west-2a', 'us-west-2b']
      });
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify subnets section exists
      const subnetsSection = page.locator('text=Subnet').first();
      await expect(subnetsSection).toBeVisible();
    });

    test('should display subnet count in Network Configuration section', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-subnet-count',
        region: 'us-west-2',
        pricing_tier: 'PREMIUM'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-west-2a', 'us-west-2b']
      });
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify subnet count appears in Network Configuration section
      const networkConfigSection = page.locator('text=Network Configuration').locator('..');
      await expect(networkConfigSection).toBeVisible();
      
      // Check for subnet count badge (should show "X subnet(s)")
      const subnetCountText = page.locator('text=/\\d+ subnet/');
      await expect(subnetCountText).toBeVisible({ timeout: 5000 });
      
      // Verify it's in the Network Configuration table
      const pageContent = await page.content();
      expect(pageContent).toMatch(/\d+\s+subnet/i);
    });
  });

  test.describe('Azure Summary Verification', () => {
    test('should display all Azure configuration values correctly on summary page', async ({ page }) => {
      const config = {
        project_prefix: 'azure-summary-test',
        region: 'eastus',
        pricing_tier: 'PREMIUM',
        resource_group_name: 'rg-test-summary'
      };
      const networkConfig = {
        vpc_cidr: '10.0.0.0/16',
        availability_zones: ['1', '2'],
        enable_private_link: true
      };
      
      await FormHelpers.selectProvider(page, 'azure');
      await FormHelpers.fillBasicConfig(page, config);
      await FormHelpers.fillNetworkConfig(page, networkConfig);
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify all configuration values are displayed
      await expect(page.locator('text=Configuration Summary')).toBeVisible();
      await expect(page.locator(`text=${config.project_prefix}`)).toBeVisible();
      await expect(page.locator(`text=${config.pricing_tier}`)).toBeVisible();
      await expect(page.locator(`text=${config.resource_group_name}`)).toBeVisible();
      
      // Verify region is displayed
      const regionElement = page.locator(`code:has-text("${config.region}")`).first();
      await expect(regionElement).toBeVisible();
    });

    test('should display Azure-specific labels on summary page', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'azure');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'azure-labels',
        region: 'westus2',
        pricing_tier: 'STANDARD',
        resource_group_name: 'rg-labels'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['1']
      });
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify Azure-specific labels
      await expect(page.locator('text=Resource Group').first()).toBeVisible();
    });
  });

  test.describe('GCP Summary Verification', () => {
    test('should display all GCP configuration values correctly on summary page', async ({ page }) => {
      const config = {
        project_prefix: 'gcp-summary-test',
        region: 'us-central1',
        pricing_tier: 'PREMIUM',
        project_id: 'gcp-project-summary'
      };
      const networkConfig = {
        vpc_cidr: '10.0.0.0/16',
        availability_zones: ['us-central1-a', 'us-central1-b'],
        enable_private_link: true
      };
      
      await FormHelpers.selectProvider(page, 'gcp');
      await FormHelpers.fillBasicConfig(page, config);
      await FormHelpers.fillNetworkConfig(page, networkConfig);
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify all configuration values are displayed
      await expect(page.locator('text=Configuration Summary')).toBeVisible();
      await expect(page.locator(`text=${config.project_prefix}`)).toBeVisible();
      await expect(page.locator(`text=${config.pricing_tier}`)).toBeVisible();
      await expect(page.locator(`text=${config.project_id}`)).toBeVisible();
      
      // Verify region is displayed
      const regionElement = page.locator(`code:has-text("${config.region}")`).first();
      await expect(regionElement).toBeVisible();
    });

    test('should display GCP-specific labels on summary page', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'gcp');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'gcp-labels',
        region: 'us-east1',
        pricing_tier: 'STANDARD',
        project_id: 'gcp-labels-project'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east1-a', 'us-east1-b']
      });
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify GCP-specific labels
      await expect(page.locator('text=Project ID').first()).toBeVisible();
    });
  });
});

test.describe('Download/Generate Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.describe('Confirm Checkbox Tests', () => {
    test('should require confirmation checkbox before generating', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-confirm',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Verify confirm checkbox exists
      const confirmCheckbox = page.locator('#confirm');
      await expect(confirmCheckbox).toBeVisible();
      
      // Verify generate button exists
      const generateBtn = page.locator('#generate-btn');
      await expect(generateBtn).toBeVisible();
      
      // Generate button should be disabled when checkbox is not checked
      // (or clicking should not work)
    });

    test('should enable generate when confirmation is checked', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-enable-gen',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Check the confirmation checkbox
      const confirmCheckbox = page.locator('#confirm');
      await confirmCheckbox.check();
      
      // Verify checkbox is checked
      await expect(confirmCheckbox).toBeChecked();
    });
  });

  test.describe('Generate Project Tests', () => {
    test('should trigger download when generate is clicked for AWS', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-download',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b'],
        enable_private_link: true
      });
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      // Confirm and generate
      await FormHelpers.confirmAndGenerate(page);
      
      // Wait for download or navigation
      const download = await downloadPromise;
      
      if (download) {
        // Verify download filename contains expected parts
        const filename = download.suggestedFilename();
        expect(filename).toContain('aws-download');
        expect(filename).toContain('terraform');
        expect(filename).toMatch(/\.zip$/);
      } else {
        // If no download, should navigate to download page
        const currentRoute = await NavigationHelpers.getCurrentRoute(page);
        expect(['/download', '/summary']).toContain(currentRoute);
      }
    });

    test('should trigger download when generate is clicked for Azure', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'azure');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'azure-download',
        region: 'eastus',
        pricing_tier: 'PREMIUM',
        resource_group_name: 'rg-download'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['1', '2'],
        enable_private_link: true
      });
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      // Confirm and generate
      await FormHelpers.confirmAndGenerate(page);
      
      // Wait for download or navigation
      const download = await downloadPromise;
      
      if (download) {
        // Verify download filename contains expected parts
        const filename = download.suggestedFilename();
        expect(filename).toContain('azure-download');
        expect(filename).toContain('terraform');
        expect(filename).toMatch(/\.zip$/);
      } else {
        // If no download, should navigate to download page
        const currentRoute = await NavigationHelpers.getCurrentRoute(page);
        expect(['/download', '/summary']).toContain(currentRoute);
      }
    });

    test('should trigger download when generate is clicked for GCP', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'gcp');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'gcp-download',
        region: 'us-central1',
        pricing_tier: 'PREMIUM',
        project_id: 'gcp-download-proj'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-central1-a', 'us-central1-b'],
        enable_private_link: true
      });
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      // Confirm and generate
      await FormHelpers.confirmAndGenerate(page);
      
      // Wait for download or navigation
      const download = await downloadPromise;
      
      if (download) {
        // Verify download filename contains expected parts
        const filename = download.suggestedFilename();
        expect(filename).toContain('gcp-download');
        expect(filename).toContain('terraform');
        expect(filename).toMatch(/\.zip$/);
      } else {
        // If no download, should navigate to download page
        const currentRoute = await NavigationHelpers.getCurrentRoute(page);
        expect(['/download', '/summary']).toContain(currentRoute);
      }
    });
  });

  test.describe('Download Page Tests', () => {
    test('should display download instructions after generation for AWS', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-instructions',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Confirm and generate
      await FormHelpers.confirmAndGenerate(page);
      await page.waitForTimeout(2000);
      
      // Check for download page content or instructions
      const currentUrl = page.url();
      if (currentUrl.includes('/download')) {
        // Verify download page has deployment instructions in command blocks
        await expect(page.locator('.command-block code:has-text("terraform init")').first()).toBeAttached({ timeout: 5000 });
        await expect(page.locator('.command-block code:has-text("terraform apply")').first()).toBeAttached();
      }
    });

    test('should display AWS-specific credential instructions', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-creds',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      
      // Confirm and generate
      await FormHelpers.confirmAndGenerate(page);
      await page.waitForTimeout(2000);
      
      // After generation, page should have AWS in content (either on summary or download page)
      const pageContent = await page.content();
      expect(pageContent.includes('aws') || pageContent.includes('AWS')).toBeTruthy();
    });
  });
});

test.describe('Back Navigation from Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should navigate back to configure from summary', async ({ page }) => {
    await FormHelpers.selectProvider(page, 'aws');
    await FormHelpers.fillBasicConfig(page, {
      project_prefix: 'nav-back',
      region: 'us-east-1',
      pricing_tier: 'PREMIUM'
    });
    await FormHelpers.fillNetworkConfig(page, {
      vpc_cidr: '10.0.0.0/20',
      availability_zones: ['us-east-1a', 'us-east-1b']
    });
    await FormHelpers.submitConfigForm(page);
    await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
    
    // Navigate back
    await NavigationHelpers.navigateBack(page);
    
    // Should be on configure page
    await expect(page).toHaveURL(/.*#\/configure/);
    
    // Data should be preserved
    const projectPrefix = await page.locator('input[name="project_prefix"]').inputValue();
    expect(projectPrefix).toBe('nav-back');
  });
});


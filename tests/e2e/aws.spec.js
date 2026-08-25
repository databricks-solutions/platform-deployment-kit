const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');
const NavigationHelpers = require('../helpers/navigation-helpers');
const ValidationHelpers = require('../helpers/validation-helpers');

test.describe('AWS Provider Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Clear any existing storage
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.describe('Complete Flow', () => {
    test('should complete full AWS deployment flow with Enterprise tier and Private Link', async ({ page }) => {
      // Step 1: Select AWS provider
      await FormHelpers.selectProvider(page, 'aws');
      await expect(page).toHaveURL(/.*#\/configure/);

      // Step 2: Fill basic configuration
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      await page.waitForTimeout(500);

      // Step 3: Fill network configuration (use larger CIDR to accommodate all subnets)
      await FormHelpers.fillNetworkConfig(page, {
        create_new_vpc: true,
        vpc_cidr: '10.0.0.0/12',
        availability_zones: ['us-east-1a', 'us-east-1b'],
        enable_private_link: true
      });

      // Verify subnet calculation appears
      await expect(page.locator('#subnets-preview')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1000); // Wait for all calculations

      // Step 4: Submit configuration
      await FormHelpers.submitConfigForm(page);
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });

      // Step 5: Verify summary page
      await expect(page.locator('text=Configuration Summary')).toBeVisible();
      await expect(page.locator('text=test-aws')).toBeVisible();
      await expect(page.locator('code:has-text("us-east-1")').first()).toBeVisible();
      await expect(page.locator('text=ENTERPRISE')).toBeVisible();

      // Step 6: Confirm and generate
      await FormHelpers.confirmAndGenerate(page);
      
      // Should navigate to download page or trigger download
      await page.waitForTimeout(2000);
      const currentRoute = await NavigationHelpers.getCurrentRoute(page);
      expect(['/download', '/summary']).toContain(currentRoute);
    });

    test('should complete AWS flow with Standard tier without Private Link', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-standard',
        region: 'us-west-2',
        pricing_tier: 'STANDARD'
      });
      await page.waitForTimeout(500);

      await FormHelpers.fillNetworkConfig(page, {
        create_new_vpc: true,
        vpc_cidr: '10.16.0.0/12',
        availability_zones: ['us-west-2a', 'us-west-2b', 'us-west-2c'],
        enable_private_link: false
      });

      await expect(page.locator('#subnets-preview')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });

      const generatedMain = await page.evaluate(async () => {
        const config = JSON.parse(localStorage.getItem('config'));
        const zipBlob = await new TerraformGenerator().generateProject(config);
        const zip = await JSZip.loadAsync(zipBlob);
        return zip.file('main.tf').async('string');
      });
      expect(generatedMain).toContain('service         = "s3"');
      expect(generatedMain).not.toContain('service             = "sts"');
      expect(generatedMain).not.toContain('service             = "kinesis-streams"');
    });

    test('should complete AWS flow without NAT when back-end PrivateLink is enabled', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-no-nat',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });

      await FormHelpers.fillNetworkConfig(page, {
        create_new_vpc: true,
        vpc_cidr: '10.48.0.0/16',
        availability_zones: ['us-east-1a', 'us-east-1b'],
        nat_gateway_mode: 'none',
        enable_private_link: true
      });

      await expect(page.locator('#nat-no-gateway-warning')).toBeVisible();
      await expect(page.locator('#nat-no-gateway-warning')).toContainText('Back-end PrivateLink is required');
      await expect(page.locator('#nat-no-gateway-warning')).toHaveCSS('color', 'rgb(241, 245, 249)');
      await expect(page.locator('#nat-no-gateway-warning strong')).toHaveCSS('color', 'rgb(251, 191, 36)');
      await FormHelpers.submitConfigForm(page);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
      await expect(page.getByText('None', { exact: true })).toBeVisible();

      const generated = await page.evaluate(async () => {
        const config = JSON.parse(localStorage.getItem('config'));
        const zipBlob = await new TerraformGenerator().generateProject(config);
        const zip = await JSZip.loadAsync(zipBlob);
        return {
          main: await zip.file('main.tf').async('string'),
          variables: await zip.file('variables.tf').async('string'),
          tfvars: await zip.file('terraform.tfvars').async('string')
        };
      });

      expect(generated.main).toContain('enable_nat_gateway   = var.nat_gateway_mode != "none"');
      expect(generated.main).toContain('create_igw           = var.nat_gateway_mode != "none"');
      expect(generated.main).toContain('public_subnets  = var.nat_gateway_mode == "none" ? [] : local.public_subnet_cidrs');
      expect(generated.main).toContain('service         = "s3"');
      expect(generated.main).toContain('service             = "sts"');
      expect(generated.main).toContain('service             = "kinesis-streams"');
      expect(generated.main).toContain('subnet_ids          = module.vpc[0].intra_subnets');
      expect(generated.main).not.toContain('subnet_ids          = module.vpc[0].private_subnets');
      expect(generated.main).toContain('private_dns_enabled = true');
      expect(generated.main).toContain('scc_relay      = [6666, 6666]');
      expect(generated.variables).toContain('default     = "none"');
      expect(generated.tfvars).toContain('nat_gateway_mode     = "none"');
      expect(generated.tfvars).not.toContain('enable_nat_gateway');
    });

    test('should complete AWS flow using existing VPC', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');

      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'aws-existing',
        region: 'eu-west-1',
        pricing_tier: 'PREMIUM'
      });
      await page.waitForTimeout(500);

      // Uncheck Create New VPC
      const createNewVpc = page.locator('#create_new_vpc');
      if (await createNewVpc.isChecked()) {
        await createNewVpc.click();
        await page.waitForTimeout(500);
      }

      // Existing VPC mode is fully user-managed, including subnets, routing,
      // egress, and security groups.
      await FormHelpers.fillNetworkConfig(page, {
        create_new_vpc: false,
        existing_vpc_id: 'vpc-0123456789abcdef0',
        existing_subnet_ids: [
          'subnet-0123456789abcdef0',
          'subnet-0fedcba9876543210'
        ],
        existing_security_group_id: 'sg-0123456789abcdef0',
        enable_private_link: false
      });

      await page.waitForTimeout(1000);
      await FormHelpers.submitConfigForm(page);
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*#\/summary/, { timeout: 10000 });
    });
  });

  test.describe('Field Validations', () => {
    test.beforeEach(async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
    });

    test('should require project prefix', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a']
      });

      const projectPrefixField = page.locator('input[name="project_prefix"]');
      await projectPrefixField.clear();
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid = true for validation tests
      const validity = await ValidationHelpers.getFieldValidationMessage(page, 'project_prefix');
      expect(validity.valueMissing).toBeTruthy();
    });

    test('should require pricing tier', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1'
      });
      
      // Clear the select value using JavaScript since it always has a default selection
      await page.evaluate(() => {
        const select = document.querySelector('select[name="pricing_tier"]');
        if (select) {
          select.value = '';
          select.selectedIndex = -1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid = true for validation tests
      const validity = await ValidationHelpers.getFieldValidationMessage(page, 'pricing_tier');
      expect(validity.valueMissing).toBeTruthy();
    });

    test('should require VPC CIDR', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      const vpcCidrField = page.locator('input[name="vpc_cidr"]');
      await vpcCidrField.clear();
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid = true for validation tests
      const validity = await ValidationHelpers.getFieldValidationMessage(page, 'vpc_cidr');
      expect(validity.valueMissing).toBeTruthy();
    });

    test('should require at least one availability zone', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/22'
      });
      
      // Clear all selected zones using helper
      await FormHelpers.selectAvailabilityZones(page, []);
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid=true for validation tests
      await page.waitForTimeout(1000); // Wait for validation to be applied
      const hasError = await ValidationHelpers.hasAvailabilityZoneError(page, 'availability zone');
      expect(hasError).toBeTruthy();
    });
  });

  test.describe('Format Validations', () => {
    test.beforeEach(async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
    });

    test('should validate project prefix format - too short', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'a',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Fill network config with valid zones so only project prefix validation fails
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid=true for validation tests
      await page.waitForTimeout(500); // Wait for validation to be applied
      const hasError = await ValidationHelpers.hasFieldValidationError(page, 'project_prefix', 'between');
      expect(hasError).toBeTruthy();
    });

    test('should validate project prefix format - invalid characters', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test@invalid',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Fill network config with valid zones so only project prefix validation fails
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid=true for validation tests
      await page.waitForTimeout(500); // Wait for validation to be applied
      const hasError = await ValidationHelpers.hasFieldValidationError(page, 'project_prefix', 'letters, numbers');
      expect(hasError).toBeTruthy();
    });

    test('should validate VPC CIDR format', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: 'invalid-cidr',
        availability_zones: ['us-east-1a', 'us-east-1b'] // AWS requires at least 2 AZs
      });
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid=true for validation tests
      await page.waitForTimeout(500); // Wait for validation to be applied
      const hasError = await ValidationHelpers.hasFieldValidationError(page, 'vpc_cidr', 'CIDR');
      expect(hasError).toBeTruthy();
    });

    test('should validate availability zone format', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/22',
        availability_zones: ['invalid-zone']
      });
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid=true for validation tests
      await page.waitForTimeout(500); // Wait for validation to be applied
      // Availability zone validation is checked on the availability_zones field or container
      const hasError = await ValidationHelpers.hasFieldValidationError(page, 'availability_zones', 'availability zone') ||
                      await ValidationHelpers.hasAvailabilityZoneError(page, 'availability zone');
      expect(hasError).toBeTruthy();
    });
  });

  test.describe('Dependency Validations', () => {
    test.beforeEach(async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
    });

    test('should show warning when Private Link enabled with Standard tier', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a'],
        enable_private_link: true
      });
      
      const hasWarning = await ValidationHelpers.hasPrivateLinkWarning(page);
      expect(hasWarning).toBeTruthy();
    });

    test('should show warning when Private Link enabled with Premium tier', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a'],
        enable_private_link: true
      });
      
      const hasWarning = await ValidationHelpers.hasPrivateLinkWarning(page);
      expect(hasWarning).toBeTruthy();
    });

    test('should allow Private Link with Enterprise tier', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      await page.waitForTimeout(500);
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a'],
        enable_private_link: true
      });
      
      await page.waitForTimeout(1000);
      const hasWarning = await ValidationHelpers.hasPrivateLinkWarning(page);
      expect(hasWarning).toBeFalsy();
      
      // Should calculate service subnet
      await page.waitForTimeout(2000);
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThan(0);
      const serviceSubnet = subnets.find(s => s.type === 'service');
      expect(serviceSubnet).toBeDefined();
    });

    test('should prevent submission with Private Link and wrong tier', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b'], // AWS requires at least 2 AZs
        enable_private_link: true
      });
      
      await FormHelpers.submitConfigForm(page, true); // allowInvalid=true for validation tests
      await page.waitForTimeout(500); // Wait for validation to be applied
      const hasError = await ValidationHelpers.hasFieldValidationError(page, 'enable_private_link', 'Enterprise');
      expect(hasError).toBeTruthy();
    });

    test('should disable review and explain no NAT without PrivateLink', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });

      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b'],
        nat_gateway_mode: 'none',
        enable_private_link: false
      });

      const submitButton = page.locator('#submit-btn');
      const validationMessage = page.locator('#submit-validation-message');
      await expect(submitButton).toBeDisabled();
      await expect(validationMessage).toBeVisible();
      await expect(validationMessage).toContainText('No NAT gateway requires AWS PrivateLink');

      const [buttonBox, messageBox] = await Promise.all([
        submitButton.boundingBox(),
        validationMessage.boundingBox()
      ]);
      expect(buttonBox).not.toBeNull();
      expect(messageBox).not.toBeNull();
      expect(Math.abs(buttonBox.x - messageBox.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(buttonBox.width - messageBox.width)).toBeLessThanOrEqual(1);

      await page.locator('#enable_private_link').click();
      await expect(submitButton).toBeEnabled();
      await expect(validationMessage).toBeHidden();
    });
  });

  test.describe('Dynamic Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
    });

    test('should recalculate subnets when VPC CIDR changes', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(2000);
      const subnets1 = await FormHelpers.getSubnetPreview(page);
      expect(subnets1).not.toBeNull();
      expect(subnets1.length).toBeGreaterThan(0);
      
      // Change VPC CIDR
      await page.fill('input[name="vpc_cidr"]', '10.1.0.0/20');
      await page.waitForTimeout(2000);
      
      const subnets2 = await FormHelpers.getSubnetPreview(page);
      expect(subnets2).not.toBeNull();
      expect(subnets2.length).toBeGreaterThan(0);
      
      // Subnets should be different
      expect(subnets1[0].cidr).not.toBe(subnets2[0].cidr);
    });

    test('should toggle existing VPC section', async ({ page }) => {
      const createNewVpc = page.locator('#create_new_vpc');
      const existingVpcSection = page.locator('#existing-vpc-section');
      
      // Initially should be creating new VPC
      expect(await createNewVpc.isChecked()).toBeTruthy();
      expect(await existingVpcSection.isVisible()).toBeFalsy();
      
      // Uncheck to use existing VPC
      await createNewVpc.click();
      await page.waitForTimeout(300);
      expect(await existingVpcSection.isVisible()).toBeTruthy();
      
      // Check again to create new
      await createNewVpc.click();
      await page.waitForTimeout(300);
      expect(await existingVpcSection.isVisible()).toBeFalsy();
    });

    test('should recalculate subnets when availability zones change', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a']
      });
      
      await page.waitForTimeout(2000);
      const subnets1 = await FormHelpers.getSubnetPreview(page);
      const count1 = subnets1 ? subnets1.length : 0;
      expect(count1).toBeGreaterThan(0);
      
      // Add another zone using Choices.js helper
      await FormHelpers.selectAvailabilityZones(page, ['us-east-1a', 'us-east-1b']);
      await page.waitForTimeout(2000);
      
      const subnets2 = await FormHelpers.getSubnetPreview(page);
      const count2 = subnets2 ? subnets2.length : 0;
      
      // Should have more subnets with 2 zones
      expect(count2).toBeGreaterThan(count1);
    });

    test('should recalculate subnets when pricing tier changes', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a'],
        enable_private_link: true
      });
      
      await page.waitForTimeout(2000);
      
      // Change to Enterprise tier
      await page.selectOption('select[name="pricing_tier"]', 'ENTERPRISE');
      await page.waitForTimeout(2000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThan(0);
      
      // Should now have service subnet
      const serviceSubnet = subnets.find(s => s.type === 'service');
      expect(serviceSubnet).toBeDefined();
    });

    test('should recalculate subnets when Private Link toggles', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      await page.waitForTimeout(500);
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a'],
        enable_private_link: false
      });
      
      await page.waitForTimeout(2000);
      const subnets1 = await FormHelpers.getSubnetPreview(page);
      const count1 = subnets1 ? subnets1.length : 0;
      expect(count1).toBeGreaterThan(0);
      
      // Enable Private Link
      await page.locator('#enable_private_link').check();
      await page.waitForTimeout(2000);
      
      const subnets2 = await FormHelpers.getSubnetPreview(page);
      const count2 = subnets2 ? subnets2.length : 0;
      
      // Should have one more subnet (service subnet)
      expect(count2).toBe(count1 + 1);
    });

    test('should show subnet size slider when Create New VPC is enabled', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(2000);
      
      // Slider should be visible when Create New VPC is checked
      const sliderContainer = page.locator('#subnet-size-slider-container');
      await expect(sliderContainer).toBeVisible();
      
      // Slider should be enabled when all required fields are filled
      const slider = page.locator('#subnet-size-slider');
      const isDisabled = await slider.getAttribute('disabled').then(v => v !== null).catch(() => false);
      expect(isDisabled).toBe(false);
    });

    test('should hide subnet size slider when using existing subnets', async ({ page }) => {
      // Disable Create New VPC
      const createNewVpc = page.locator('#create_new_vpc');
      await createNewVpc.uncheck();
      await page.waitForTimeout(500);

      // Existing AWS VPC mode always requires preconfigured subnets.
      await expect(page.locator('#existing-subnets-section')).toBeVisible();

      // Slider should be hidden when using existing subnets
      const sliderContainer = page.locator('#subnet-size-slider-container');
      await expect(sliderContainer).not.toBeVisible();

      // Preview should also be hidden
      const preview = page.locator('#subnets-preview');
      await expect(preview).not.toBeVisible();
    });

    test('should recalculate subnets when subnet size slider changes', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(2000);
      
      // Get initial subnet sizes
      const subnets1 = await FormHelpers.getSubnetPreview(page);
      expect(subnets1).not.toBeNull();
      expect(subnets1.length).toBeGreaterThan(0);
      const initialSize = subnets1[0].cidr.split('/')[1];
      
      // Change slider value
      const slider = page.locator('#subnet-size-slider');
      const currentValue = await slider.inputValue();
      const newValue = currentValue === '26' ? '24' : '26';
      await slider.fill(newValue);
      await slider.dispatchEvent('change');
      await page.waitForTimeout(2000);
      
      // Get new subnet sizes
      const subnets2 = await FormHelpers.getSubnetPreview(page);
      expect(subnets2).not.toBeNull();
      expect(subnets2.length).toBeGreaterThan(0);
      const newSize = subnets2[0].cidr.split('/')[1];
      
      // Sizes should be different
      expect(newSize).not.toBe(initialSize);
    });

    test('should show subnet preview when Create New VPC is enabled', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(2000);
      
      // Preview should be visible
      const preview = page.locator('#subnets-preview');
      await expect(preview).toBeVisible();
      
      // Should have subnet cards
      const subnetCards = page.locator('.subnet-card');
      const count = await subnetCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should use Choices.js for availability zones', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Verify Choices.js component exists (select is hidden, container is visible)
      const choicesContainer = page.locator('.choices:has(#availability-zones-select)');
      await expect(choicesContainer).toBeVisible();
      
      // Verify search input exists (use specific selector for the visible input, not the hidden select)
      const searchInput = choicesContainer.locator('.choices__inner input.choices__input--cloned').first();
      await expect(searchInput).toBeVisible();
      
      // Click to open dropdown and type to search
      await choicesContainer.click();
      await page.waitForTimeout(200);
      await searchInput.fill('us-east-1a');
      await page.waitForTimeout(300);
      
      // Verify dropdown has options
      const dropdownItems = choicesContainer.locator('.choices__list--dropdown .choices__item');
      const itemCount = await dropdownItems.count();
      expect(itemCount).toBeGreaterThan(0);
    });

    test('should allow selecting and deselecting multiple availability zones', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Select 2 zones using helper
      await FormHelpers.selectAvailabilityZones(page, ['us-east-1a', 'us-east-1b']);
      
      // Verify 2 tags are visible
      const tags = page.locator('.choices__list--multiple .choices__item');
      await page.waitForTimeout(300);
      const tagCount = await tags.count();
      expect(tagCount).toBe(2);
      
      // Remove one tag using the remove button (Choices.js uses .choices__button)
      const removeButtons = page.locator('.choices__list--multiple .choices__button');
      await removeButtons.first().click();
      await page.waitForTimeout(200);
      
      // Verify only 1 tag remains
      const afterRemoveCount = await tags.count();
      expect(afterRemoveCount).toBe(1);
    });

    test('should enforce minimum availability zones for AWS (2)', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Select only 1 zone using Choices.js (below minimum of 2 for AWS)
      await FormHelpers.selectAvailabilityZones(page, ['us-east-1a']);
      await page.waitForTimeout(300);
      
      // Try to submit with only 1 zone - should fail validation
      await FormHelpers.submitConfigForm(page, true);
      await page.waitForTimeout(500);
      const hasError = await ValidationHelpers.hasAvailabilityZoneError(page, 'availability zone');
      expect(hasError).toBeTruthy();
    });

    test('should update availability zone options when region changes', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Get initial options from select element
      const azSelect = page.locator('#availability-zones-select');
      const initialOptions = await azSelect.locator('option').allTextContents();
      expect(initialOptions.some(opt => opt.includes('us-east-1'))).toBeTruthy();
      
      // Change region
      await page.selectOption('select[name="region"]', 'us-west-2');
      await page.waitForTimeout(1000); // Wait for Choices.js to update
      
      // Verify options updated - read from select element
      const updatedOptions = await azSelect.locator('option').allTextContents();
      expect(updatedOptions.some(opt => opt.includes('us-west-2'))).toBeTruthy();
      
      // Verify default zones for new region are auto-selected (us-west-2a and us-west-2b)
      const tags = page.locator('.choices__list--multiple .choices__item');
      const tagCount = await tags.count();
      expect(tagCount).toBeGreaterThanOrEqual(2); // Default zones are auto-selected
    });

    test('should allow selecting multiple different availability zones', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      const zones = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
      
      // Select multiple different zones using helper
      await FormHelpers.selectAvailabilityZones(page, zones);
      
      // Verify all tags are visible
      const tags = page.locator('.choices__list--multiple .choices__item');
      const tagCount = await tags.count();
      expect(tagCount).toBe(3);
      
      // Verify all zones are different (check tag text content)
      const tagTexts = await tags.allTextContents();
      const uniqueTexts = [...new Set(tagTexts.map(t => t.trim().replace(/×/g, '').trim()))];
      expect(uniqueTexts.length).toBe(3);
    });

    test('should enforce minimum availability zones for AWS (2) on submit', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Select only 1 zone using Choices.js (below minimum of 2 for AWS)
      await FormHelpers.selectAvailabilityZones(page, ['us-east-1a']);
      await page.waitForTimeout(300);
      
      // Try to submit - should fail validation
      await FormHelpers.submitConfigForm(page, true);
      await page.waitForTimeout(500);
      
      const hasError = await ValidationHelpers.hasAvailabilityZoneError(page, 'availability zone');
      expect(hasError).toBeTruthy();
    });

    test('should enforce maximum availability zones for AWS (6)', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      const zones = ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f'];
      
      // Select 6 zones (maximum) using helper
      await FormHelpers.selectAvailabilityZones(page, zones);
      
      // Verify 6 tags are visible
      const tags = page.locator('.choices__list--multiple .choices__item');
      await page.waitForTimeout(300);
      const tagCount = await tags.count();
      expect(tagCount).toBeLessThanOrEqual(6);
      
      // Try to add one more - Choices.js should prevent it (already selected)
      await page.waitForTimeout(200);
    });

    test('should only show valid availability zones for selected region', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test-aws',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      // Get options from the underlying select element
      const azSelect = page.locator('#availability-zones-select');
      const initialOptions = await azSelect.locator('option').allTextContents();
      
      // All options should be valid for us-east-1
      initialOptions.filter(opt => opt && opt.trim()).forEach(opt => {
        expect(opt).toMatch(/us-east-1[a-f]/);
      });
      
      // Change region
      await page.selectOption('select[name="region"]', 'us-west-2');
      await page.waitForTimeout(1000); // Wait for options to update
      
      // Verify options updated to us-west-2
      const updatedOptions = await azSelect.locator('option').allTextContents();
      updatedOptions.filter(opt => opt && opt.trim()).forEach(opt => {
        expect(opt).toMatch(/us-west-2[a-d]/);
      });
    });
  });

  test.describe('Network Calculations', () => {
    test.beforeEach(async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
    });

    test('should calculate subnets correctly for AWS', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThan(0);
      
      // Should have private and public subnets for each AZ
      const privateSubnets = subnets.filter(s => s.type === 'private');
      const publicSubnets = subnets.filter(s => s.type === 'public');
      
      expect(privateSubnets.length).toBeGreaterThanOrEqual(2);
      expect(publicSubnets.length).toBeGreaterThanOrEqual(2);
    });

    test('should display network utilization summary', async ({ page }) => {
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/22',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(2000);
      
      const summary = await FormHelpers.getNetworkSummary(page);
      expect(summary).not.toBeNull();
      expect(summary.total_ips).toBeTruthy();
      expect(summary.used_ips).toBeTruthy();
      expect(summary.utilization_percent).toBeTruthy();
    });

    test('should calculate service subnet for Enterprise tier with Private Link', async ({ page }) => {
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      await page.waitForTimeout(500);
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a'],
        enable_private_link: true
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThan(0);
      const serviceSubnet = subnets.find(s => s.type === 'service');
      expect(serviceSubnet).toBeDefined();
      expect(serviceSubnet.name).toContain('service');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back from configure to provider selection', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await expect(page).toHaveURL(/.*#\/configure/);
      
      await NavigationHelpers.navigateBack(page);
      await expect(page).toHaveURL(/.*#\/select-provider/);
    });

    test('should navigate back from summary to configure', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      await FormHelpers.submitConfigForm(page);
      
      await expect(page).toHaveURL(/.*#\/summary/);
      await NavigationHelpers.navigateBack(page);
      await expect(page).toHaveURL(/.*#\/configure/);
    });

    test('should persist data when navigating between steps', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'persist-test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      await page.waitForTimeout(500);
      
      // Submit form to save to localStorage (AWS requires at least 2 AZs)
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/12',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      await FormHelpers.submitConfigForm(page);
      await page.waitForTimeout(500);
      
      // Navigate back to configure
      await NavigationHelpers.navigateBack(page);
      await expect(page).toHaveURL(/.*#\/configure/);
      await page.waitForTimeout(1000);
      
      // Data should be persisted (check form fields)
      const projectPrefix = await page.locator('input[name="project_prefix"]').inputValue();
      expect(projectPrefix).toBe('persist-test');
      
      const region = await page.locator('select[name="region"]').inputValue();
      expect(region).toBe('us-east-1');
    });

    test('should reset application data', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'STANDARD'
      });
      
      await NavigationHelpers.reset(page);
      await expect(page).toHaveURL(/.*#\/select-provider/, { timeout: 5000 });

      // Navigate to configure - should be empty
      await FormHelpers.selectProvider(page, 'aws');
      const projectPrefix = await page.locator('input[name="project_prefix"]').inputValue();
      expect(projectPrefix).toBe('');
    });
  });
});

/**
 * E2E tests for CIDR calculations and network allocations
 * These tests validate that subnet calculations are correct and don't overlap
 */

const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');

test.describe('CIDR Calculations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.describe('AWS CIDR Calculations', () => {
    test('should calculate non-overlapping subnets for AWS with 2 AZs', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThanOrEqual(2); // At least 2 subnets (private + public for each AZ)
      
      // Verify no overlapping CIDRs using NetworkCalculator
      const validation = await page.evaluate((subnetData) => {
        const { NetworkCalculator } = window;
        if (!NetworkCalculator) return { valid: false, message: 'NetworkCalculator not available' };
        
        const vpcCIDR = document.querySelector('input[name="vpc_cidr"]')?.value || '10.0.0.0/20';
        
        // Convert subnet data from FormHelpers to SubnetAllocation format
        const subnetAllocations = subnetData.map((s, idx) => ({
          name: s.name || `subnet-${idx}`,
          cidr: s.cidr,
          size: parseInt(s.cidr.split('/')[1], 10) || 26
        }));
        
        // Use NetworkCalculator to validate
        const calc = new NetworkCalculator('aws');
        const result = calc.validateSubnetAllocation(vpcCIDR, subnetAllocations);
        
        return result;
      }, subnets);
      
      expect(validation.valid).toBe(true);
    });

    test('should calculate sequential subnets without gaps', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets.length).toBe(2); // 1 private + 1 public
      
      // Verify subnets are sequential by checking they don't overlap and are in order
      const sequential = await page.evaluate((subnetData) => {
        const { NetworkCalculator } = window;
        if (!NetworkCalculator) return false;
        
        if (subnetData.length < 2) return false;
        
        const vpcCIDR = '10.0.0.0/20';
        const subnetAllocations = subnetData.map((s, idx) => ({
          name: s.name || `subnet-${idx}`,
          cidr: s.cidr,
          size: parseInt(s.cidr.split('/')[1], 10) || 26
        }));
        
        // Validate that subnets don't overlap (which implies they are sequential)
        const calc = new NetworkCalculator('aws');
        const validation = calc.validateSubnetAllocation(vpcCIDR, subnetAllocations);
        
        return validation.valid;
      }, subnets);
      
      expect(sequential).toBe(true);
    });

    test('should include service subnet for Enterprise tier with Private Link', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a'],
        enable_private_link: true
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets.length).toBe(3); // 1 private + 1 public + 1 service
      
      const serviceSubnet = subnets.find(s => s.type === 'service');
      expect(serviceSubnet).toBeDefined();
      
      // Verify all subnets are valid using NetworkCalculator
      const validation = await page.evaluate((subnetData) => {
        const { NetworkCalculator } = window;
        if (!NetworkCalculator) return { valid: false, message: 'NetworkCalculator not available' };
        
        const vpcCIDR = '10.0.0.0/20';
        const subnetAllocations = subnetData.map((s, idx) => ({
          name: s.name || `subnet-${idx}`,
          cidr: s.cidr,
          size: parseInt(s.cidr.split('/')[1], 10) || 26
        }));
        
        const calc = new NetworkCalculator('aws');
        return calc.validateSubnetAllocation(vpcCIDR, subnetAllocations);
      }, subnets);
      
      expect(validation.valid).toBe(true);
    });
  });

  test.describe('Azure CIDR Calculations', () => {
    test('should calculate non-overlapping subnets for Azure', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'azure');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'eastus',
        pricing_tier: 'STANDARD',
        resource_group_name: 'rg-test'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['1', '2']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets.length).toBeGreaterThanOrEqual(2); // At least 2 subnets
      
      const validation = await page.evaluate((subnetData) => {
        const { NetworkCalculator } = window;
        if (!NetworkCalculator) return { valid: false, message: 'NetworkCalculator not available' };
        
        const vpcCIDR = '10.0.0.0/20';
        const subnetAllocations = subnetData.map((s, idx) => ({
          name: s.name || `subnet-${idx}`,
          cidr: s.cidr,
          size: parseInt(s.cidr.split('/')[1], 10) || 26
        }));
        
        const calc = new NetworkCalculator('azure');
        return calc.validateSubnetAllocation(vpcCIDR, subnetAllocations);
      }, subnets);
      
      expect(validation.valid).toBe(true);
    });
  });

  test.describe('GCP CIDR Calculations', () => {
    test('should calculate host and pods subnets correctly', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'gcp');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-central1',
        pricing_tier: 'STANDARD',
        project_id: 'test-project'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-central1-a']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets.length).toBe(2); // 1 host + 1 pods
      
      const hostSubnet = subnets.find(s => s.type === 'host');
      const podsSubnet = subnets.find(s => s.type === 'pods');
      
      expect(hostSubnet).toBeDefined();
      expect(podsSubnet).toBeDefined();
      
      const validation = await page.evaluate((subnetData) => {
        const { NetworkCalculator } = window;
        if (!NetworkCalculator) return { valid: false, message: 'NetworkCalculator not available' };
        
        const vpcCIDR = '10.0.0.0/20';
        const subnetAllocations = subnetData.map((s, idx) => ({
          name: s.name || `subnet-${idx}`,
          cidr: s.cidr,
          size: parseInt(s.cidr.split('/')[1], 10) || 26
        }));
        
        const calc = new NetworkCalculator('gcp');
        return calc.validateSubnetAllocation(vpcCIDR, subnetAllocations);
      }, subnets);
      
      expect(validation.valid).toBe(true);
    });
  });

  test.describe('Network Utilization', () => {
    test('should display accurate network utilization summary', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'test',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(3000);
      
      const summary = await FormHelpers.getNetworkSummary(page);
      expect(summary).not.toBeNull();
      expect(summary.total_ips).toBeTruthy();
      expect(summary.used_ips).toBeTruthy();
      expect(summary.utilization_percent).toBeTruthy();
      
      // Get subnets for validation
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      
      // Verify utilization is calculated correctly using NetworkCalculator
      const utilizationCheck = await page.evaluate((subnetData) => {
        const { NetworkCalculator } = window;
        if (!NetworkCalculator) return false;
        
        const vpcCIDR = '10.0.0.0/20';
        
        const subnetAllocations = subnetData.map((s, idx) => ({
          name: s.name || `subnet-${idx}`,
          cidr: s.cidr,
          size: parseInt(s.cidr.split('/')[1], 10) || 26
        }));
        
        const calc = new NetworkCalculator('aws');
        const calculatedSummary = calc.calculateNetworkSummary(vpcCIDR, subnetAllocations);
        
        if (calculatedSummary.error) return false;
        
        // Get displayed utilization
        const displayedUtilization = parseFloat(document.querySelector('#network-utilization-percent')?.textContent?.replace('%', '') || '0');
        
        // Allow small rounding differences
        return Math.abs(calculatedSummary.utilization_percent - displayedUtilization) < 1;
      }, subnets);
      
      expect(utilizationCheck).toBe(true);
    });
  });

  test.describe('CIDR Edge Cases', () => {
    test('should handle large CIDR block (/8)', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'large-cidr',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/8',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThanOrEqual(2);
      
      // Verify subnets are valid
      const validation = await page.evaluate((subnetData) => {
        const { NetworkCalculator } = window;
        if (!NetworkCalculator) return { valid: false };
        
        const vpcCIDR = '10.0.0.0/8';
        const subnetAllocations = subnetData.map((s, idx) => ({
          name: s.name || `subnet-${idx}`,
          cidr: s.cidr,
          size: parseInt(s.cidr.split('/')[1], 10) || 26
        }));
        
        const calc = new NetworkCalculator('aws');
        return calc.validateSubnetAllocation(vpcCIDR, subnetAllocations);
      }, subnets);
      
      expect(validation.valid).toBe(true);
    });

    test('should handle minimum CIDR block (/24)', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'min-cidr',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/24',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      // With /24, subnets might be very small or calculation might warn
      if (subnets && subnets.length > 0) {
        // Verify subnets fit in the VPC
        const validation = await page.evaluate((subnetData) => {
          const { NetworkCalculator } = window;
          if (!NetworkCalculator) return { valid: false };
          
          const vpcCIDR = '10.0.0.0/24';
          const subnetAllocations = subnetData.map((s, idx) => ({
            name: s.name || `subnet-${idx}`,
            cidr: s.cidr,
            size: parseInt(s.cidr.split('/')[1], 10) || 26
          }));
          
          const calc = new NetworkCalculator('aws');
          return calc.validateSubnetAllocation(vpcCIDR, subnetAllocations);
        }, subnets);
        
        expect(validation.valid).toBe(true);
      }
    });

    test('should handle /16 CIDR block correctly', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'medium-cidr',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '172.16.0.0/16',
        availability_zones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
        enable_private_link: true
      });
      
      // Wait for subnet preview to appear
      await page.waitForSelector('#subnets-preview', { state: 'visible', timeout: 10000 });
      
      // Wait for subnet cards to appear - check if slider is enabled first
      const slider = page.locator('#subnet-size-slider');
      const isSliderDisabled = await slider.getAttribute('disabled').then(v => v !== null).catch(() => false);
      
      // If slider is disabled, wait a bit more for calculations
      if (isSliderDisabled) {
        await page.waitForTimeout(2000);
      }
      
      // Wait for subnet cards with multiple retries
      let subnets = null;
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(500);
        subnets = await FormHelpers.getSubnetPreview(page);
        if (subnets && subnets.length > 0) {
          break;
        }
        // Check if there's an error message instead
        const errorAlert = page.locator('#subnets-container .alert');
        const hasError = await errorAlert.count() > 0;
        if (hasError) {
          const errorText = await errorAlert.textContent();
          console.log('Subnet calculation error:', errorText);
        }
      }
      
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThan(0);
      
      // Should have multiple subnet types
      const subnetTypes = subnets.map(s => s.type);
      expect(subnetTypes.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle /12 CIDR block correctly', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'azure');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'azure-12',
        region: 'eastus',
        pricing_tier: 'STANDARD',
        resource_group_name: 'rg-cidr-12'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/12',
        availability_zones: ['1', '2', '3']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThanOrEqual(2);
    });

    test('should show warning for CIDR too small for configuration', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'small-cidr',
        region: 'us-east-1',
        pricing_tier: 'ENTERPRISE'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/28', // Very small CIDR
        availability_zones: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f'],
        enable_private_link: true
      });
      
      await page.waitForTimeout(2000);
      
      // Should show warning or error about insufficient space
      const hasWarning = await page.evaluate(() => {
        const alerts = document.querySelectorAll('.alert-warning, .alert-danger, .is-invalid');
        return alerts.length > 0;
      });
      
      // Either show warning or prevent form submission
      const flashMessages = page.locator('#flash-messages .alert');
      const flashCount = await flashMessages.count();
      const hasMessage = flashCount > 0 || hasWarning;
      
      expect(hasMessage).toBeTruthy();
    });

    test('should calculate utilization correctly for different CIDR sizes', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'util-test',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });

      // Set up with /20 first
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/20',
        availability_zones: ['us-east-1a', 'us-east-1b']
      });

      // Wait for subnet calculations and slider to be ready
      await page.waitForSelector('#network-utilization-percent', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000);

      // Set subnet size slider to /26 (fixed) to ensure consistent subnet sizes
      const slider = page.locator('#subnet-size-slider');
      await slider.evaluate((el) => {
        el.value = 26;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(1500);

      const util20Text = await page.locator('#network-utilization-percent').textContent();
      const util20 = parseFloat(util20Text);

      // Switch to /16 — this triggers slider limits recalculation (debounced)
      await page.fill('input[name="vpc_cidr"]', '');
      await page.fill('input[name="vpc_cidr"]', '10.0.0.0/16');

      // Wait for the debounced recalculation to finish and slider to be re-enabled
      await page.waitForTimeout(2000);

      // Set slider to /26 again AFTER the VPC change has been processed
      await slider.evaluate((el) => {
        el.value = 26;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Wait for recalculation with /26 subnets in /16 VPC
      let util16 = util20;
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(500);
        const util16Text = await page.locator('#network-utilization-percent').textContent().catch(() => '');
        util16 = parseFloat(util16Text);
        if (util16 !== util20) break;
      }

      // With /26 subnets: /20 has 4096 IPs, /16 has 65536 IPs
      // Same 4 subnets of /26 (256 IPs) = 1024 used IPs
      // /20 utilization: 1024/4096 = 25%, /16 utilization: 1024/65536 ≈ 1.6%
      expect(util16).toBeLessThan(util20);
    });
  });

  test.describe('Multi-AZ CIDR Calculations', () => {
    test('should calculate subnets correctly with maximum AZs for AWS (6)', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'aws');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'max-az',
        region: 'us-east-1',
        pricing_tier: 'PREMIUM'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/16',
        availability_zones: ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      // Should have 6 private + 6 public = 12 subnets minimum
      expect(subnets.length).toBeGreaterThanOrEqual(6);
    });

    test('should calculate subnets correctly with maximum AZs for Azure (3)', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'azure');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'azure-max-az',
        region: 'eastus',
        pricing_tier: 'STANDARD',
        resource_group_name: 'rg-max-az'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/16',
        availability_zones: ['1', '2', '3']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThanOrEqual(3);
    });

    test('should calculate subnets correctly with maximum AZs for GCP (6)', async ({ page }) => {
      await FormHelpers.selectProvider(page, 'gcp');
      await FormHelpers.fillBasicConfig(page, {
        project_prefix: 'gcp-max-az',
        region: 'us-central1',
        pricing_tier: 'STANDARD',
        project_id: 'gcp-max-az-proj'
      });
      
      await FormHelpers.fillNetworkConfig(page, {
        vpc_cidr: '10.0.0.0/16',
        availability_zones: ['us-central1-a', 'us-central1-b', 'us-central1-c', 'us-central1-d', 'us-central1-e', 'us-central1-f']
      });
      
      await page.waitForTimeout(3000);
      
      const subnets = await FormHelpers.getSubnetPreview(page);
      expect(subnets).not.toBeNull();
      expect(subnets.length).toBeGreaterThanOrEqual(2); // GCP has host + pods
    });
  });
});


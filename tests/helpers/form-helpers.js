/**
 * Form helper functions for E2E tests
 */

class FormHelpers {
  /**
   * Select a cloud provider
   */
  static async selectProvider(page, provider) {
    await page.goto('/#/select-provider');
    await page.waitForLoadState('domcontentloaded');
    
    const providerCard = page.locator(`.provider-option[data-provider="${provider}"]`);
    await providerCard.click();
    await page.waitForTimeout(300);
    
    const continueBtn = page.locator('#continue-btn');
    await continueBtn.click();
    await page.waitForLoadState('domcontentloaded');
  }

  /**
   * Fill basic configuration fields
   */
  static async fillBasicConfig(page, config) {
    // Wait for form to be ready
    await page.waitForSelector('#config-form', { timeout: 5000 });
    
    if (config.project_prefix) {
      const field = page.locator('input[name="project_prefix"]');
      await field.waitFor({ state: 'visible', timeout: 5000 });
      await field.fill(config.project_prefix);
      await field.blur(); // Trigger validation
    }
    
    if (config.region) {
      const field = page.locator('select[name="region"]');
      await field.waitFor({ state: 'visible', timeout: 5000 });
      await field.selectOption(config.region);
      await page.waitForTimeout(300); // Wait for any dependent fields to update
    }
    
    if (config.pricing_tier) {
      const field = page.locator('select[name="pricing_tier"]');
      if (await field.count()) {
        await field.waitFor({ state: 'visible', timeout: 5000 });
        await field.selectOption(config.pricing_tier);
        await page.waitForTimeout(300); // Wait for any dependent fields to update
      }
    }
    
    if (config.resource_group_name) {
      const field = page.locator('input[name="resource_group_name"]');
      await field.waitFor({ state: 'visible', timeout: 5000 });
      await field.fill(config.resource_group_name);
      await field.blur();
    }
    
    if (config.project_id) {
      const field = page.locator('input[name="project_id"]');
      await field.waitFor({ state: 'visible', timeout: 5000 });
      await field.fill(config.project_id);
      await field.blur();
    }
    
    await page.waitForTimeout(300); // Small delay for any async updates
  }

  /**
   * Fill the fields required by the Azure deployment.
   * Individual tests can override any default while keeping the fixtures valid.
   */
  static async fillAzureConfig(page, config = {}) {
    const values = {
      project_prefix: 'test-azure',
      region: 'eastus',
      azure_subscription_id: '11111111-1111-4111-8111-111111111111',
      azure_tenant_id: '22222222-2222-4222-8222-222222222222',
      resource_group_name: 'rg-databricks-workspace',
      azure_admin_user: 'admin@example.com',
      azure_root_storage_name: 'dbfsoneclicktest',
      azure_uc_storage_account_name: 'uconeclicktest',
      azure_catalog_name: 'oneclick_catalog',
      azure_storage_credential_name: 'oneclick-storage-credential',
      azure_external_location_name: 'oneclick-external-location',
      azure_vnet_resource_group_name: 'rg-databricks-network',
      ...config
    };

    await this.fillBasicConfig(page, values);

    for (const fieldName of [
      'azure_subscription_id',
      'azure_tenant_id',
      'azure_admin_user',
      'azure_root_storage_name',
      'azure_uc_storage_account_name',
      'azure_catalog_name',
      'azure_storage_credential_name',
      'azure_external_location_name',
      'azure_vnet_resource_group_name'
    ]) {
      const field = page.locator(`[name="${fieldName}"]`);
      if (await field.isVisible().catch(() => false)) {
        await field.fill(values[fieldName] || '');
        await field.blur();
      }
    }

    await page.waitForTimeout(300);
  }

  /** Fill the common inputs required by the GCP BYOVPC sources. */
  static async fillGcpConfig(page, config = {}) {
    const values = {
      project_prefix: 'test-gcp',
      region: 'us-central1',
      project_id: 'test-gcp-project',
      google_service_account_email: 'workspace-creator@test-gcp-project.iam.gserviceaccount.com',
      databricks_account_id: '11111111-1111-4111-8111-111111111111',
      databricks_admin_user: 'admin@example.com',
      subnet_cidr: '10.10.0.0/20',
      ...config
    };

    await this.fillBasicConfig(page, values);

    for (const fieldName of [
      'project_id',
      'google_service_account_email',
      'databricks_account_id',
      'databricks_admin_user',
      'subnet_cidr'
    ]) {
      const field = page.locator(`[name="${fieldName}"]`);
      await field.fill(values[fieldName] || '');
      await field.blur();
    }

    if (values.psc_subnet_cidr) {
      const field = page.locator('[name="psc_subnet_cidr"]');
      if (await field.isVisible().catch(() => false)) {
        await field.fill(values.psc_subnet_cidr);
        await field.blur();
      }
    }

    await page.waitForTimeout(300);
  }

  /**
   * Fill network configuration
   */
  static async fillNetworkConfig(page, config) {
    // Toggle create new VPC
    const createNewVpc = page.locator('#create_new_vpc');
    if (await createNewVpc.count()) {
      const isChecked = await createNewVpc.isChecked();
      if (config.create_new_vpc !== undefined && config.create_new_vpc !== isChecked) {
        await createNewVpc.click();
        await page.waitForTimeout(300);
      }
    }
    
    // Fill existing VPC ID if not creating new
    if (config.existing_vpc_id !== undefined && !config.create_new_vpc) {
      const existingVpcField = page.locator('#existing_vpc_id');
      if (await existingVpcField.isVisible()) {
        await existingVpcField.fill(config.existing_vpc_id);
      }
    }
    
    // Fill VPC CIDR
    if (config.vpc_cidr) {
      await page.fill('input[name="vpc_cidr"]', config.vpc_cidr);
      await page.waitForTimeout(800); // Wait for subnet calculation
    }

    if (config.azure_nat_gateway_zone !== undefined) {
      const natGatewayZone = page.locator('#azure_nat_gateway_zone');
      if (await natGatewayZone.isVisible().catch(() => false)) {
        await natGatewayZone.selectOption(config.azure_nat_gateway_zone);
      }
    }
    
    // Set availability zones (Choices.js component)
    if (config.availability_zones && Array.isArray(config.availability_zones)) {
      // Azure uses a fixed subnet topology and no longer renders a zone picker.
      if (await page.locator('#availability-zones-select').count()) {
        await this.selectAvailabilityZones(page, config.availability_zones);
      }
    }
    
    // Toggle private link
    if (config.enable_private_link !== undefined) {
      const privateLinkCheckbox = page.locator('#enable_private_link');
      if (await privateLinkCheckbox.count()) {
        const isChecked = await privateLinkCheckbox.isChecked();
        if (config.enable_private_link !== isChecked) {
          await privateLinkCheckbox.click();
          await page.waitForTimeout(500); // Wait for recalculation
        }
      }
    }
  }

  /**
   * Submit configuration form
   * @param {Page} page - Playwright page object
   * @param {boolean} allowInvalid - If true, don't throw error on validation failure (for validation tests)
   */
  static async submitConfigForm(page, allowInvalid = false) {
    // Ensure form is ready
    await page.waitForSelector('#config-form', { timeout: 5000 });
    
    // Check form validity before submitting
    const formValid = await page.evaluate(() => {
      const form = document.getElementById('config-form');
      return form && form.checkValidity();
    });
    
    if (!formValid && !allowInvalid) {
      // Get validation errors
      const invalidFields = await page.evaluate(() => {
        const form = document.getElementById('config-form');
        const invalid = [];
        const inputs = form.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
          if (!input.validity.valid) {
            invalid.push({
              name: input.name,
              message: input.validationMessage
            });
          }
        });
        return invalid;
      });
      
      if (invalidFields.length > 0) {
        throw new Error(`Form validation failed: ${invalidFields.map(f => `${f.name}: ${f.message}`).join(', ')}`);
      }
    }
    
    // If allowInvalid is true and form is invalid, trigger validation first
    if (allowInvalid && !formValid) {
      // Trigger HTML5 validation on all fields first
      await page.evaluate(() => {
        const form = document.getElementById('config-form');
        if (form) {
          // Report validity on all fields to trigger HTML5 validation messages
          const fields = form.querySelectorAll('input[required], select[required]');
          fields.forEach(field => {
            if (!field.validity.valid) {
              field.reportValidity();
            }
          });
        }
      });
      await page.waitForTimeout(300);
    }
    
    // Normal form submission (even if allowInvalid is true, we still try to submit)
    const submitBtn = page.locator('#submit-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    
    // Wait for either navigation or error message
    try {
      // Wait for navigation first
      try {
        await page.waitForURL(/.*#\/summary/, { timeout: 5000 });
        await page.waitForLoadState('domcontentloaded');
        return;
      } catch (navError) {
        // Navigation didn't happen, check for error messages
        const currentUrl = page.url();
        
        if (currentUrl.includes('#/configure')) {
          // Wait for flash messages to potentially appear
          await page.waitForSelector('#flash-messages .alert', { timeout: 2000, state: 'attached' }).catch(() => {
            // No alerts yet, that's okay
          });
          
          await page.waitForTimeout(500);
          
          const flashMessages = page.locator('#flash-messages .alert');
          const errorMessages = await flashMessages.allTextContents();
          
          if (errorMessages.length > 0) {
            // If allowInvalid is true, don't throw - let test check validation
            if (!allowInvalid) {
              throw new Error(`Form submission failed: ${errorMessages.join(', ')}`);
            }
            // Wait a bit more for validation to be fully applied
            await page.waitForTimeout(500);
            return;
          }
          
          // If no errors but still on configure, might be a timing issue
          await page.waitForTimeout(1000);
          const finalUrl = page.url();
          if (finalUrl.includes('#/configure')) {
            // If allowInvalid is true, don't throw - validation prevented navigation
            if (!allowInvalid) {
              throw new Error('Form submission did not navigate to summary page');
            }
            // Wait a bit more for validation to be fully applied
            await page.waitForTimeout(500);
            return;
          }
        } else {
          // Navigated somewhere else, assume success
          await page.waitForLoadState('domcontentloaded');
          return;
        }
      }
    } catch (error) {
      // If allowInvalid is true, don't throw - let test check validation
      if (allowInvalid) {
        await page.waitForTimeout(500);
        return;
      }
      // Log the error for debugging
      const currentUrl = page.url();
      const flashMessages = page.locator('#flash-messages .alert');
      const flashText = await flashMessages.allTextContents().catch(() => []);
      console.log(`Form submission failed. URL: ${currentUrl}, Errors: ${flashText.join(', ')}`);
      throw error;
    }
  }

  /**
   * Confirm and generate project in summary page
   */
  static async confirmAndGenerate(page) {
    const generateBtn = page.locator('#generate-btn');
    await generateBtn.click();
    await page.waitForURL(/.*#\/download/, { timeout: 15000 });
  }

  /**
   * Get validation error messages
   */
  static async getValidationErrors(page) {
    const flashMessages = page.locator('#flash-messages .alert');
    const errors = [];
    
    const count = await flashMessages.count();
    for (let i = 0; i < count; i++) {
      const message = await flashMessages.nth(i).textContent();
      errors.push(message);
    }
    
    return errors;
  }

  /**
   * Check if field has validation error
   */
  static async hasFieldError(page, fieldName) {
    const field = page.locator(`input[name="${fieldName}"], select[name="${fieldName}"]`);
    const isInvalid = await field.evaluate((el) => {
      return el.classList.contains('is-invalid') || 
             el.getAttribute('aria-invalid') === 'true';
    });
    return isInvalid;
  }

  /**
   * Get subnet preview data
   */
  static async getSubnetPreview(page) {
    const preview = page.locator('#subnets-preview');
    const isVisible = await preview.isVisible();
    
    if (!isVisible) {
      return null;
    }
    
    const subnets = [];
    const subnetCards = page.locator('.subnet-card');
    const count = await subnetCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = subnetCards.nth(i);
      const name = await card.locator('.card-title').textContent();
      // Use a more specific selector to avoid strict mode violations
      // The CIDR is inside .text-muted.small > div with "CIDR:" text
      const cidrText = await card.locator('.text-muted.small div:has-text("CIDR:")').first().textContent();
      const typeBadge = card.locator('.subnet-type');
      const type = await typeBadge.textContent();
      
      // Extract CIDR from text like "CIDR: 10.0.0.0/24"
      const cidrMatch = cidrText?.match(/CIDR:\s*([^\s]+)/);
      const cidr = cidrMatch ? cidrMatch[1] : '';
      
      subnets.push({
        name: name?.trim() || '',
        cidr: cidr.trim(),
        type: type?.trim() || ''
      });
    }
    
    return subnets;
  }

  /**
   * Get network summary data
   */
  static async getNetworkSummary(page) {
    const summary = page.locator('#network-summary');
    const isVisible = await summary.isVisible();
    
    if (!isVisible) {
      return null;
    }
    
    // Try to get values from the summary card
    const totalIPsElement = summary.locator('.text-primary').first();
    const usedIPsElement = summary.locator('.text-success').first();
    const utilizationElement = summary.locator('.text-info').first();
    
    const totalIPs = await totalIPsElement.textContent().catch(() => null);
    const usedIPs = await usedIPsElement.textContent().catch(() => null);
    const utilization = await utilizationElement.textContent().catch(() => null);
    
    return {
      total_ips: totalIPs?.trim() || '',
      used_ips: usedIPs?.trim() || '',
      utilization_percent: utilization?.trim() || ''
    };
  }

  /**
   * Select availability zones using Choices.js API
   * @param {Page} page - Playwright page object
   * @param {string[]} zones - Array of zone values to select
   */
  static async selectAvailabilityZones(page, zones) {
    // Wait for Choices.js container to be ready (the select itself is hidden)
    await page.waitForSelector('.choices:has(#availability-zones-select)', { timeout: 10000, state: 'visible' });
    // Wait a bit for Choices.js to fully initialize
    await page.waitForTimeout(500);
    
    // Use JavaScript to interact with Choices.js instance
    await page.evaluate((zoneValues) => {
      const select = document.getElementById('availability-zones-select');
      if (!select) {
        throw new Error('Availability zones select not found');
      }
      
      // Get Choices.js instance - it's stored on the select element as choicesInstance
      const choicesInstance = select.choicesInstance;
      
      if (choicesInstance && typeof choicesInstance.setValue === 'function') {
        // Use Choices.js API - clear first then set new values
        // removeActiveItems removes all selected items
        if (typeof choicesInstance.removeActiveItems === 'function') {
          choicesInstance.removeActiveItems();
        } else {
          // Fallback: set empty value first
          choicesInstance.setValue([]);
        }
        
        // Now set the new values
        if (zoneValues && zoneValues.length > 0) {
          choicesInstance.setValue(zoneValues);
        }
        
        // Trigger change event to update the form
        select.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Fallback: directly set values on select element and trigger events
        // Clear existing selections
        Array.from(select.options).forEach(option => {
          option.selected = false;
        });
        
        // Set new selections
        zoneValues.forEach(zoneValue => {
          const option = select.querySelector(`option[value="${zoneValue}"]`);
          if (option) {
            option.selected = true;
          }
        });
        
        // Trigger change event (bubbles for form validation)
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        select.dispatchEvent(changeEvent);
        
        // Also trigger input event for Choices.js
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        select.dispatchEvent(inputEvent);
      }
    }, zones);
    
    await page.waitForTimeout(500); // Wait for UI to update and subnet calculation
  }
}

module.exports = FormHelpers;

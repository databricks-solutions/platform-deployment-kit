/**
 * Validators for form fields and configuration
 * Uses centralized CIDRUtils for network calculations
 */

class Validators {
  /**
   * Validate CIDR notation format
   * Uses centralized CIDRUtils for validation
   */
  static validateCIDR(cidr, minPrefix = null, maxPrefix = null) {
    if (!cidr) return { valid: true, message: '' };

    try {
      const [ip, prefix] = cidr.split('/');
      if (!ip || !prefix) {
        return { valid: false, message: 'Invalid CIDR format (e.g., 10.0.0.0/16)' };
      }
      
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
        return { valid: false, message: 'Invalid IP address format' };
      }
      
      const prefixLen = parseInt(prefix, 10);
      if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) {
        return { valid: false, message: 'Prefix length must be between 0 and 32' };
      }
      
      if (minPrefix !== null && maxPrefix !== null && (prefixLen < minPrefix || prefixLen > maxPrefix)) {
        return { valid: false, message: `Network prefix must be between /${minPrefix} and /${maxPrefix}` };
      }
      
      if (minPrefix !== null && prefixLen < minPrefix) {
        return { valid: false, message: `Network prefix must be at least /${minPrefix}` };
      }
      
      if (maxPrefix !== null && prefixLen > maxPrefix) {
        return { valid: false, message: `Network prefix cannot exceed /${maxPrefix}` };
      }
      
      // Validate network address using centralized utility
      if (!CIDRUtils.validateCIDR(cidr)) {
        return { valid: false, message: 'Invalid network address (must be network address, not host address)' };
      }
      
      return { valid: true, message: '' };
    } catch {
      return { valid: false, message: 'Invalid CIDR notation format' };
    }
  }

  /**
   * Convert IP to integer (delegates to CIDRUtils)
   */
  static ipToInt(ip) {
    return CIDRUtils.ipToInt(ip);
  }

  /**
   * Validate project name
   */
  static validateProjectName(name, minLength = 2, maxLength = 20) {
    if (!name) {
      return { valid: false, message: 'Project name is required' };
    }
    
    const trimmed = name.trim();
    
    if (trimmed.length < minLength || trimmed.length > maxLength) {
      return { 
        valid: false, 
        message: `Name must be between ${minLength} and ${maxLength} characters` 
      };
    }
    
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(trimmed)) {
      return { 
        valid: false, 
        message: 'Name must contain only letters, numbers, hyphens, and underscores' 
      };
    }
    
    return { valid: true, message: '' };
  }

  static validateAwsProjectPrefix(name, minLength = 2, maxLength = 20) {
    if (!name) return { valid: false, message: 'Project name is required' };
    const trimmed = name.trim();
    if (trimmed.length < minLength || trimmed.length > maxLength) {
      return { valid: false, message: `Name must be between ${minLength} and ${maxLength} characters` };
    }
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(trimmed)) {
      return { valid: false, message: 'AWS project prefix must use lowercase letters, numbers, hyphens, or periods' };
    }
    return { valid: true, message: '' };
  }

  static validateAzureProjectPrefix(name, minLength = 2, maxLength = 20) {
    if (!name) return { valid: false, message: 'Project name is required' };
    const trimmed = name.trim();
    if (trimmed.length < minLength || trimmed.length > maxLength) {
      return { valid: false, message: `Name must be between ${minLength} and ${maxLength} characters` };
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/.test(trimmed)) {
      return { valid: false, message: 'Azure project prefix must use lowercase letters, numbers, or hyphens' };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validate region format based on provider
   */
  static validateRegion(region, provider) {
    if (!region) {
      return { valid: false, message: 'Region is required' };
    }
    
    const patterns = {
      aws: /^[a-z]{2}-[a-z]+-\d+$/,  // e.g., us-east-1
      azure: /^[a-z]+[a-z0-9]*$/,    // e.g., eastus
      gcp: /^[a-z]+-[a-z]+\d+$/      // e.g., us-central1
    };
    
    const pattern = patterns[provider?.toLowerCase()];
    if (pattern && !pattern.test(region)) {
      return { valid: false, message: `Invalid ${provider.toUpperCase()} region format` };
    }

    if (provider?.toLowerCase() === 'azure') {
      const supported = new Set([
        'australiacentral', 'australiacentral2', 'australiaeast', 'australiasoutheast',
        'brazilsouth', 'canadacentral', 'canadaeast', 'centralindia', 'centralus',
        'chinaeast2', 'chinaeast3', 'chinanorth2', 'chinanorth3', 'eastasia', 'eastus',
        'eastus2', 'francecentral', 'germanywestcentral', 'japaneast', 'japanwest',
        'koreacentral', 'mexicocentral', 'northcentralus', 'northeurope', 'norwayeast',
        'qatarcentral', 'southafricanorth', 'southcentralus', 'southeastasia', 'southindia',
        'swedencentral', 'switzerlandnorth', 'switzerlandwest', 'uaenorth', 'uksouth',
        'ukwest', 'westcentralus', 'westeurope', 'westindia', 'westus', 'westus2', 'westus3'
      ]);
      if (!supported.has(region)) return { valid: false, message: 'Region is not supported by the Azure Terraform source' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate pricing tier for provider
   */
  static validatePricingTier(tier, provider) {
    if (!tier) {
      return { valid: false, message: 'Pricing tier is required' };
    }
    
    const validTiers = {
      aws: ['PREMIUM', 'ENTERPRISE'],
      // Keep STANDARD valid for persisted legacy configurations. The Azure UI
      // now emits only PREMIUM because both selected upstream sources hardcode it.
      azure: ['STANDARD', 'PREMIUM'],
      gcp: ['STANDARD', 'PREMIUM']
    };
    
    const tiers = validTiers[provider?.toLowerCase()];
    if (tiers && !tiers.includes(tier)) {
      return { 
        valid: false, 
        message: `Invalid pricing tier. Valid options: ${tiers.join(', ')}` 
      };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate pricing tier features
   */
  static validatePricingTierFeatures(config) {
    const errors = {};
    const { provider, pricing_tier, enable_private_link } = config;
    const requestedNatGatewayMode = String(
      provider === 'azure' && enable_private_link
        ? (config.azure_private_link_nat_gateway_mode || config.nat_gateway_mode || '')
        : (config.nat_gateway_mode || '')
    ).trim();
    const natGatewayMode = requestedNatGatewayMode ||
      ((config.enable_nat_gateway === false || config.enable_nat_gateway === 'false') ? 'none' : 'single');
    
    if (enable_private_link) {
      if (provider === 'aws' && pricing_tier !== 'ENTERPRISE') {
        errors.enable_private_link = 'Back-end PrivateLink requires Enterprise pricing tier. Please upgrade to Enterprise tier.';
      } else if ((provider === 'azure' || provider === 'gcp') && pricing_tier !== 'PREMIUM') {
        const serviceName = provider === 'azure' ? 'Back-end Private Link' : 'Private Service Connect';
        errors.enable_private_link = `${serviceName} requires Premium pricing tier`;
      }
    }

    if (provider === 'aws' && config.create_new_vpc && !['single', 'per_az', 'none'].includes(natGatewayMode)) {
      errors.nat_gateway_mode = 'Choose a supported NAT gateway option.';
    }

    if (provider === 'azure' && enable_private_link && !['single', 'none'].includes(natGatewayMode)) {
      errors.azure_private_link_nat_gateway_mode = 'Choose whether to deploy a NAT gateway.';
    }

    if (provider === 'gcp' && enable_private_link && !['single', 'none'].includes(natGatewayMode)) {
      errors.nat_gateway_mode = 'Choose whether to deploy Cloud NAT.';
    }

    if (provider === 'aws' && config.create_new_vpc && natGatewayMode === 'none' && !enable_private_link) {
      errors.enable_private_link = 'Back-end PrivateLink is required to communicate with the control plane when no NAT gateway is selected.';
    }
    
    return errors;
  }

  /**
   * Get availability zone limits for a provider
   */
  static getAvailabilityZoneLimits(provider) {
    const limits = {
      aws: { min: 2, max: 6 },
      azure: { min: 1, max: 3 },
      gcp: { min: 2, max: 6 }
    };
    return limits[provider?.toLowerCase()] || { min: 1, max: 3 };
  }

  /**
   * Validate availability zones
   */
  static validateAvailabilityZones(zones, provider, region) {
    if (!zones || zones.length === 0) {
      const limits = this.getAvailabilityZoneLimits(provider);
      return { valid: false, message: `At least ${limits.min} availability zone(s) required for ${provider?.toUpperCase() || 'provider'}` };
    }
    
    const limits = this.getAvailabilityZoneLimits(provider);
    
    if (zones.length < limits.min) {
      return { valid: false, message: `At least ${limits.min} availability zone(s) required for ${provider?.toUpperCase() || 'provider'}` };
    }
    
    if (zones.length > limits.max) {
      return { valid: false, message: `Maximum ${limits.max} availability zone(s) allowed for ${provider?.toUpperCase() || 'provider'}` };
    }
    
    // Check for duplicates
    const uniqueZones = [...new Set(zones)];
    if (uniqueZones.length !== zones.length) {
      return { valid: false, message: 'Duplicate availability zones are not allowed' };
    }
    
    // Basic format validation
    for (const zone of zones) {
      if (provider === 'aws' && region && !zone.startsWith(region)) {
        return { valid: false, message: `AWS availability zone must start with region '${region}'` };
      } else if (provider === 'gcp' && region && !zone.startsWith(region)) {
        return { valid: false, message: `GCP availability zone must start with region '${region}'` };
      } else if (provider === 'azure' && !/^[1-3]$/.test(zone)) {
        return { valid: false, message: 'Azure availability zones must be numeric (1, 2, or 3)' };
      }
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate JSON tags
   */
  static validateTags(tagsJson) {
    if (!tagsJson || tagsJson.trim() === '') {
      return { valid: true, message: '', parsed: {} };
    }
    
    try {
      const parsed = JSON.parse(tagsJson);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { valid: false, message: 'Tags must be a JSON object', parsed: null };
      }
      return { valid: true, message: '', parsed };
    } catch (e) {
      return { valid: false, message: 'Invalid JSON format for tags', parsed: null };
    }
  }

  /**
   * Validate AWS Subnet ID format
   */
  static validateAwsSubnetId(subnetId) {
    if (!subnetId || typeof subnetId !== 'string') {
      return { valid: false, message: 'Subnet ID is required' };
    }
    
    const trimmed = subnetId.trim();
    
    // AWS subnet IDs start with "subnet-" followed by 8 or 17 hex characters
    if (!/^subnet-[a-f0-9]{8,17}$/i.test(trimmed)) {
      return { valid: false, message: 'Invalid AWS Subnet ID format (e.g., subnet-0123456789abcdef0)' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate AWS Security Group ID format
   */
  static validateAwsSecurityGroupId(sgId) {
    if (!sgId || typeof sgId !== 'string') {
      return { valid: false, message: 'Security Group ID is required' };
    }
    
    const trimmed = sgId.trim();
    
    // AWS security group IDs start with "sg-" followed by 8 or 17 hex characters
    if (!/^sg-[a-f0-9]{8,17}$/i.test(trimmed)) {
      return { valid: false, message: 'Invalid AWS Security Group ID format (e.g., sg-0123456789abcdef0)' };
    }
    
    return { valid: true, message: '' };
  }

  /**
   * Validate AWS VPC ID format
   */
  static validateAwsVpcId(vpcId) {
    if (!vpcId || typeof vpcId !== 'string') {
      return { valid: false, message: 'VPC ID is required' };
    }
    
    const trimmed = vpcId.trim();
    
    // AWS VPC IDs start with "vpc-" followed by 8 or 17 hex characters
    if (!/^vpc-[a-f0-9]{8,17}$/i.test(trimmed)) {
      return { valid: false, message: 'Invalid AWS VPC ID format (e.g., vpc-0123456789abcdef0)' };
    }
    
    return { valid: true, message: '' };
  }

  static validateAwsVpcEndpointId(endpointId) {
    if (!endpointId || typeof endpointId !== 'string') {
      return { valid: false, message: 'VPC endpoint ID is required' };
    }
    if (!/^vpce-[a-f0-9]{8,17}$/i.test(endpointId.trim())) {
      return { valid: false, message: 'Invalid AWS VPC endpoint ID format (e.g., vpce-0123456789abcdef0)' };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validate Azure VNet Resource ID format
   */
  static validateAzureVnetId(vnetId) {
    if (!vnetId || typeof vnetId !== 'string') {
      return { valid: false, message: 'VNet Resource ID is required' };
    }
    const trimmed = vnetId.trim();
    const pattern = /^\/subscriptions\/[a-f0-9-]+\/resourceGroups\/[^/]+\/providers\/Microsoft\.Network\/virtualNetworks\/[^/]+$/i;
    if (!pattern.test(trimmed)) {
      return { valid: false, message: 'Invalid Azure VNet Resource ID format (e.g., /subscriptions/.../resourceGroups/.../providers/Microsoft.Network/virtualNetworks/my-vnet)' };
    }
    return { valid: true, message: '' };
  }

  static validateUuid(value, label) {
    if (!value || typeof value !== 'string') return { valid: false, message: `${label} is required` };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())) {
      return { valid: false, message: `${label} must be a valid UUID` };
    }
    return { valid: true, message: '' };
  }

  static validateAzureStorageAccountName(value, label) {
    if (!value || typeof value !== 'string') return { valid: false, message: `${label} is required` };
    if (!/^[a-z0-9]{3,24}$/.test(value.trim())) {
      return { valid: false, message: `${label} must contain 3-24 lowercase letters and numbers` };
    }
    return { valid: true, message: '' };
  }

  static validateAzureResourceGroupName(value, label = 'Resource group name') {
    if (!value || typeof value !== 'string') return { valid: false, message: `${label} is required` };
    const trimmed = value.trim();
    if (trimmed.length > 90 || !/^[\w().-]+$/.test(trimmed) || trimmed.endsWith('.')) {
      return { valid: false, message: `${label} contains unsupported Azure characters` };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validate Azure subnet name
   */
  static validateAzureSubnetName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, message: 'Subnet name is required' };
    }
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      return { valid: false, message: 'Subnet name must be 1-80 characters' };
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(trimmed)) {
      return { valid: false, message: 'Subnet name must start with alphanumeric and contain only letters, numbers, hyphens, underscores, or periods' };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validate GCP resource name (VPC, subnet, IP range)
   */
  static validateGcpResourceName(name, label = 'Resource name') {
    if (!name || typeof name !== 'string') {
      return { valid: false, message: `${label} is required` };
    }
    const trimmed = name.trim();
    if (!/^[a-z][a-z0-9-]{0,62}$/.test(trimmed)) {
      return { valid: false, message: `${label} must start with lowercase letter, contain only lowercase letters, numbers, hyphens (max 63 chars)` };
    }
    return { valid: true, message: '' };
  }

  /**
   * Validate entire configuration
   */
  static validateConfiguration(config) {
    const errors = {};
    
    // Basic fields
    const projectNameCheck = config.provider === 'aws'
      ? this.validateAwsProjectPrefix(config.project_prefix)
      : config.provider === 'azure'
        ? this.validateAzureProjectPrefix(config.project_prefix)
        : this.validateProjectName(config.project_prefix);
    if (!projectNameCheck.valid) {
      errors.project_prefix = projectNameCheck.message;
    }
    
    const regionCheck = this.validateRegion(config.region, config.provider);
    if (!regionCheck.valid) {
      errors.region = regionCheck.message;
    }
    
    if (config.provider !== 'gcp') {
      const tierCheck = this.validatePricingTier(config.pricing_tier, config.provider);
      if (!tierCheck.valid) {
        errors.pricing_tier = tierCheck.message;
      }
    }
    
    // Determine if we need subnet configuration (VPC CIDR, AZs, etc.)
    const needsSubnetConfig = config.provider !== 'gcp' &&
      (config.provider === 'azure' || config.create_new_vpc);
    
    // Network - only validate VPC CIDR if we need subnet config
    if (needsSubnetConfig) {
      const cidrCheck = this.validateCIDR(config.vpc_cidr, config.provider === 'azure' ? 16 : 8, 24);
      if (!cidrCheck.valid) {
        errors.vpc_cidr = cidrCheck.message;
      }
      
      // Availability zones
      if (config.availability_zones) {
        const azCheck = this.validateAvailabilityZones(
          config.availability_zones, 
          config.provider, 
          config.region
        );
        if (!azCheck.valid) {
          errors.availability_zones = azCheck.message;
        }
      }
    }
    
    // AWS-specific: Existing VPC validation
    if (config.provider === 'aws' && !config.create_new_vpc) {
      // Validate existing VPC ID
      const vpcIdCheck = this.validateAwsVpcId(config.existing_vpc_id);
      if (!vpcIdCheck.valid) {
        errors.existing_vpc_id = vpcIdCheck.message;
      }
      
      // The upstream modules cannot create subnets in an existing VPC.
      if (!config.existing_subnet_ids || config.existing_subnet_ids.length < 2) {
        errors.existing_subnet_ids = 'At least 2 subnet IDs are required for Databricks (in different AZs)';
      } else {
        for (let i = 0; i < config.existing_subnet_ids.length; i++) {
          const subnetCheck = this.validateAwsSubnetId(config.existing_subnet_ids[i]);
          if (!subnetCheck.valid) {
            errors.existing_subnet_ids = `Invalid format for Subnet ID ${i + 1}: ${subnetCheck.message}`;
            break;
          }
        }
      }

      const sgCheck = this.validateAwsSecurityGroupId(config.existing_security_group_id);
      if (!sgCheck.valid) errors.existing_security_group_id = sgCheck.message;

      if (config.enable_private_link) {
        const restCheck = this.validateAwsVpcEndpointId(config.backend_rest_aws_vpce_id);
        if (!restCheck.valid) errors.backend_rest_aws_vpce_id = restCheck.message;
        const relayCheck = this.validateAwsVpcEndpointId(config.backend_relay_aws_vpce_id);
        if (!relayCheck.valid) errors.backend_relay_aws_vpce_id = relayCheck.message;
      }
    }

    if (config.provider === 'aws') {
      if (config.metastore_mode === 'existing') {
        if (!config.metastore_id || !config.metastore_id.trim()) {
          errors.metastore_id = 'Existing metastore ID is required';
        }
      }
    }
    
    // Azure-specific: Existing VNet validation
    if (config.provider === 'azure' && !config.enable_private_link && !config.create_new_vpc) {
      const vnetIdCheck = this.validateAzureVnetId(config.existing_vpc_id);
      if (!vnetIdCheck.valid) {
        errors.existing_vpc_id = vnetIdCheck.message;
      }
    }

    // Provider-specific
    if (config.provider === 'azure') {
      const subscriptionCheck = this.validateUuid(config.azure_subscription_id, 'Azure subscription ID');
      if (!subscriptionCheck.valid) errors.azure_subscription_id = subscriptionCheck.message;

      if (config.enable_private_link) {
        if (!config.create_new_vpc) errors.create_new_vpc = 'Back-end Private Link requires a new dedicated VNet';
        if (!['new', 'existing'].includes(config.azure_resource_group_mode)) {
          errors.azure_resource_group_mode = 'Choose whether to create or reuse the data plane resource group';
        }
        if (config.azure_resource_group_mode === 'existing') {
          const rgCheck = this.validateAzureResourceGroupName(
            config.azure_existing_resource_group_name,
            'Existing resource group name'
          );
          if (!rgCheck.valid) errors.azure_existing_resource_group_name = rgCheck.message;
        }
      } else {
        const tenantCheck = this.validateUuid(config.azure_tenant_id, 'Azure tenant ID');
        if (!tenantCheck.valid) errors.azure_tenant_id = tenantCheck.message;
        const rgCheck = this.validateAzureResourceGroupName(config.resource_group_name, 'Workspace resource group');
        if (!rgCheck.valid) errors.resource_group_name = rgCheck.message;
        if (!config.azure_admin_user || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.azure_admin_user.trim())) {
          errors.azure_admin_user = 'Workspace admin user must be a valid email address';
        }
        const rootStorageCheck = this.validateAzureStorageAccountName(
          config.azure_root_storage_name,
          'Workspace root storage account'
        );
        if (!rootStorageCheck.valid) errors.azure_root_storage_name = rootStorageCheck.message;
        const ucStorageCheck = this.validateAzureStorageAccountName(
          config.azure_uc_storage_account_name,
          'UC storage account'
        );
        if (!ucStorageCheck.valid) errors.azure_uc_storage_account_name = ucStorageCheck.message;
        for (const [field, label] of [
          ['azure_catalog_name', 'Catalog name'],
          ['azure_storage_credential_name', 'Storage credential name'],
          ['azure_external_location_name', 'External location name']
        ]) {
          if (!config[field] || !config[field].trim()) errors[field] = `${label} is required`;
        }
        if (config.metastore_mode === 'existing' && (!config.metastore_id || !config.metastore_id.trim())) {
          errors.metastore_id = 'Existing metastore ID is required';
        }
        if (config.create_new_vpc) {
          const vnetRgCheck = this.validateAzureResourceGroupName(
            config.azure_vnet_resource_group_name,
            'VNet resource group name'
          );
          if (!vnetRgCheck.valid) errors.azure_vnet_resource_group_name = vnetRgCheck.message;
          if (config.azure_vnet_resource_group_name?.trim().toLowerCase() === config.resource_group_name?.trim().toLowerCase()) {
            errors.azure_vnet_resource_group_name = 'VNet and workspace resource groups must have different names';
          }
        } else {
          const match = String(config.existing_vpc_id || '').match(/\/resourceGroups\/([^/]+)\//i);
          if (match?.[1]?.toLowerCase() === config.resource_group_name?.trim().toLowerCase()) {
            errors.existing_vpc_id = 'Existing VNet and workspace resource groups must have different names';
          }
        }
      }
    }

    if (config.provider === 'gcp') {
      if (!config.project_id || !config.project_id.trim()) {
        errors.project_id = 'GCP Project ID is required';
      }
      if (!config.google_service_account_email ||
          !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(config.google_service_account_email.trim())) {
        errors.google_service_account_email = 'Enter a valid Google service account email';
      }
      if (!config.databricks_account_id || !config.databricks_account_id.trim()) {
        errors.databricks_account_id = 'Databricks Account ID is required';
      }
      if (!config.databricks_admin_user ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.databricks_admin_user.trim())) {
        errors.databricks_admin_user = 'Workspace admin user must be a valid email address';
      }
      if (!config.subnet_cidr || !config.subnet_cidr.trim()) {
        errors.subnet_cidr = 'Databricks subnet CIDR is required';
      } else {
        const subnetCheck = this.validateCIDR(config.subnet_cidr, 8, 29);
        if (!subnetCheck.valid) errors.subnet_cidr = subnetCheck.message;
      }

      if (config.enable_private_link) {
        if (!config.psc_subnet_cidr || !config.psc_subnet_cidr.trim()) {
          errors.psc_subnet_cidr = 'PSC endpoint subnet CIDR is required';
        } else {
          const pscSubnetCheck = this.validateCIDR(config.psc_subnet_cidr, 8, 29);
          if (!pscSubnetCheck.valid) {
            errors.psc_subnet_cidr = pscSubnetCheck.message;
          } else if (config.subnet_cidr && CIDRUtils.overlaps(config.subnet_cidr, config.psc_subnet_cidr)) {
            errors.psc_subnet_cidr = 'PSC endpoint subnet must not overlap the Databricks subnet';
          }
        }
        if (!config.workspace_service_attachment || !config.relay_service_attachment) {
          errors.region = 'Back-end Private Service Connect is not configured for this GCP region';
        }
      }
    }
    
    // Pricing tier features
    const featureErrors = this.validatePricingTierFeatures(config);
    Object.assign(errors, featureErrors);
    
    // Tags
    if (config.tags) {
      const tagsCheck = this.validateTags(config.tags);
      if (!tagsCheck.valid) {
        errors.tags = tagsCheck.message;
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validators;
}

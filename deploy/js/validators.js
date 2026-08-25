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
    
    if (enable_private_link) {
      if (provider === 'aws' && pricing_tier !== 'ENTERPRISE') {
        errors.enable_private_link = 'AWS PrivateLink requires Enterprise pricing tier. Please upgrade to Enterprise tier.';
      } else if ((provider === 'azure' || provider === 'gcp') && pricing_tier !== 'PREMIUM') {
        const serviceName = provider === 'azure' ? 'Private Link' : 'Private Service Connect';
        errors.enable_private_link = `${serviceName} requires Premium pricing tier`;
      }
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
    const projectNameCheck = this.validateProjectName(config.project_prefix);
    if (!projectNameCheck.valid) {
      errors.project_prefix = projectNameCheck.message;
    }
    
    const regionCheck = this.validateRegion(config.region, config.provider);
    if (!regionCheck.valid) {
      errors.region = regionCheck.message;
    }
    
    const tierCheck = this.validatePricingTier(config.pricing_tier, config.provider);
    if (!tierCheck.valid) {
      errors.pricing_tier = tierCheck.message;
    }
    
    // Determine if we need subnet configuration (VPC CIDR, AZs, etc.)
    const needsSubnetConfig = config.create_new_vpc;
    
    // Network - only validate VPC CIDR if we need subnet config
    if (needsSubnetConfig) {
      const cidrCheck = this.validateCIDR(config.vpc_cidr, 8, 24);
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

    if (config.provider === 'aws' && config.create_new_vpc) {
      const natGatewayMode = config.nat_gateway_mode || 'per_az';
      if (!['none', 'single', 'per_az'].includes(natGatewayMode)) {
        errors.nat_gateway_mode = 'NAT gateway topology must be none, single, or one per availability zone';
      } else if (natGatewayMode === 'none' && !config.enable_private_link) {
        errors.nat_gateway_mode = 'No NAT gateway requires back-end AWS PrivateLink for control-plane connectivity';
      }
    }
    
    // AWS-specific: Existing VPC validation
    if (config.provider === 'aws' && !config.create_new_vpc) {
      // Validate existing VPC ID
      const vpcIdCheck = this.validateAwsVpcId(config.existing_vpc_id);
      if (!vpcIdCheck.valid) {
        errors.existing_vpc_id = vpcIdCheck.message;
      }
      
      // Existing AWS networking is fully user-managed.
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

      if (!config.existing_security_group_id) {
        errors.existing_security_group_id = 'Security Group ID is required when using an existing VPC';
      } else {
        const sgCheck = this.validateAwsSecurityGroupId(config.existing_security_group_id);
        if (!sgCheck.valid) {
          errors.existing_security_group_id = sgCheck.message;
        }
      }
    }
    
    // Azure-specific: Existing VNet validation
    if (config.provider === 'azure' && !config.create_new_vpc) {
      const vnetIdCheck = this.validateAzureVnetId(config.existing_vpc_id);
      if (!vnetIdCheck.valid) {
        errors.existing_vpc_id = vnetIdCheck.message;
      }
      const pubSubnetCheck = this.validateAzureSubnetName(config.existing_public_subnet_name);
      if (!pubSubnetCheck.valid) {
        errors.existing_public_subnet_name = pubSubnetCheck.message;
      }
      const privSubnetCheck = this.validateAzureSubnetName(config.existing_private_subnet_name);
      if (!privSubnetCheck.valid) {
        errors.existing_private_subnet_name = privSubnetCheck.message;
      }
    }

    // GCP-specific: Existing VPC validation
    if (config.provider === 'gcp' && !config.create_new_vpc) {
      const vpcNameCheck = this.validateGcpResourceName(config.existing_vpc_id, 'VPC name');
      if (!vpcNameCheck.valid) {
        errors.existing_vpc_id = vpcNameCheck.message;
      }
      const subnetCheck = this.validateGcpResourceName(config.existing_subnet_name, 'Subnet name');
      if (!subnetCheck.valid) {
        errors.existing_subnet_name = subnetCheck.message;
      }
      const podRangeCheck = this.validateGcpResourceName(config.existing_pod_range_name, 'Pod IP range name');
      if (!podRangeCheck.valid) {
        errors.existing_pod_range_name = podRangeCheck.message;
      }
      const svcRangeCheck = this.validateGcpResourceName(config.existing_service_range_name, 'Service IP range name');
      if (!svcRangeCheck.valid) {
        errors.existing_service_range_name = svcRangeCheck.message;
      }
    }

    // Provider-specific
    if (config.provider === 'azure' && !config.resource_group_name) {
      errors.resource_group_name = 'Resource group name is required for Azure';
    }
    
    if (config.provider === 'gcp' && !config.project_id) {
      errors.project_id = 'GCP Project ID is required';
    }
    
    // Pricing tier features
    const featureErrors = this.validatePricingTierFeatures(config);
    Object.assign(errors, featureErrors);
    
    // AWS-specific: PrivateLink subnet validation
    if (config.provider === 'aws' && config.enable_private_link) {
      // When using existing subnets (not creating new ones), user must provide PrivateLink subnet
      const usingExistingSubnets = !config.create_new_vpc;
      
      if (usingExistingSubnets && config.privatelink_subnet_mode === 'terraform_managed') {
        errors.privatelink_subnet_mode = 'When using existing subnets, you must select "Use Existing Subnet" for PrivateLink and provide a subnet ID';
      }
      
      if (config.privatelink_subnet_mode === 'user_managed') {
        if (!config.existing_privatelink_subnet_id) {
          errors.existing_privatelink_subnet_id = 'Subnet ID is required when using user-managed PrivateLink subnet';
        } else {
          const subnetCheck = this.validateAwsSubnetId(config.existing_privatelink_subnet_id);
          if (!subnetCheck.valid) {
            errors.existing_privatelink_subnet_id = subnetCheck.message;
          }
        }
      }
    }
    
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

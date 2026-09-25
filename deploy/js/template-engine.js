/**
 * TemplateEngine - Renders templates using Handlebars.js
 * Handlebars is a robust, battle-tested template engine used by millions of projects
 * Documentation: https://handlebarsjs.com/
 */
class TemplateEngine {
  constructor() {
    // Check if Handlebars is available
    if (typeof Handlebars === 'undefined') {
      throw new Error('Handlebars library is not loaded. Please ensure handlebars.min.js is loaded before using TemplateEngine.');
    }

    // Register custom helpers for our specific use cases
    this._registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   * @private
   */
  _registerHelpers() {
    // Helper to check if a value equals another (for conditionals)
    Handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    // Helper to check if a value contains a substring
    Handlebars.registerHelper('contains', function(str, substr) {
      if (!str || !substr) return false;
      return String(str).indexOf(String(substr)) !== -1;
    });

    // Override the built-in #each helper to add @last support
    // Handlebars doesn't have @last by default, so we add it
    const originalEach = Handlebars.helpers.each;
    Handlebars.registerHelper('each', function(context, options) {
      if (!options) {
        options = context;
        context = this;
      }
      
      let ret = '';
      const data = Handlebars.createFrame(options.data || {});
      
      if (context && typeof context === 'object') {
        if (Array.isArray(context)) {
          for (let i = 0; i < context.length; i++) {
            data.index = i;
            data.first = (i === 0);
            data.last = (i === context.length - 1);
            ret += options.fn(context[i], { data: data });
          }
        } else {
          const keys = Object.keys(context);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            data.key = key;
            data.index = i;
            data.first = (i === 0);
            data.last = (i === keys.length - 1);
            ret += options.fn(context[key], { data: data });
          }
        }
      }
      
      if (ret === '' && options.inverse) {
        ret = options.inverse(this);
      }
      
      return ret;
    });
  }

  /**
   * Render template with variables
   * @param {string} template - Template content
   * @param {Object} variables - Variables object
   * @param {string} templateName - Optional template name for error reporting
   * @returns {string} Rendered template
   */
  render(template, variables, templateName = 'unknown') {
    if (!template || typeof template !== 'string') {
      return '';
    }

    try {
      // Compile template with strict mode disabled for more lenient parsing
      // Note: Use {{{ (triple braces) in templates for raw output without HTML escaping
      // This is needed for Terraform code generation (not HTML)
      const compiledTemplate = Handlebars.compile(template, {
        strict: false,
        assumeObjects: false
      });
      
      // Render with variables
      const result = compiledTemplate(variables);
      
      return result;
    } catch (error) {
      console.error(`TemplateEngine render error in ${templateName}:`, error);
      console.error('Template preview (first 500 chars):', template.substring(0, 500));
      throw new Error(`Template rendering failed in ${templateName}: ${error.message}`);
    }
  }

  /**
   * Prepare variables for template rendering
   * Adds computed properties and formats data
   * @param {Object} config - Configuration object
   * @returns {Object} Prepared variables
   */
  prepareVariables(config) {
    const vars = { ...config };
    
    // Add computed properties for subnets
    if (config.calculated_subnets && Array.isArray(config.calculated_subnets)) {
      vars.calculated_subnets = config.calculated_subnets.map((subnet, index) => ({
        ...subnet,
        name_replace: subnet.name ? subnet.name.replace(/-/g, '_') : '',
        is_public: subnet.subnet_type === 'public',
        is_private: subnet.subnet_type === 'private',
        index: index // For @index in Handlebars
      }));
    } else {
      vars.calculated_subnets = [];
    }

    // Compute shortcut variables for the first public/private/host subnet names
    // Azure main.tf needs the first public and private subnet variable names
    // GCP main.tf needs the first host subnet variable name
    const firstPublic = vars.calculated_subnets.find(s => s.is_public);
    const firstPrivate = vars.calculated_subnets.find(s => s.is_private);
    const firstHost = vars.calculated_subnets.find(s => s.subnet_type === 'host');
    vars.first_public_subnet_var = firstPublic ? firstPublic.name_replace : 'public_a';
    vars.first_private_subnet_var = firstPrivate ? firstPrivate.name_replace : 'private_a';
    vars.first_host_subnet_var = firstHost ? firstHost.name_replace : 'host';

    // Format boolean values
    vars.create_new_vpc = config.create_new_vpc === true || config.create_new_vpc === 'true';
    vars.enable_private_link = config.enable_private_link === true || config.enable_private_link === 'true';
    const requestedNatGatewayMode = String(
      config.provider === 'azure' && vars.enable_private_link
        ? (config.azure_private_link_nat_gateway_mode || config.nat_gateway_mode || '')
        : (config.nat_gateway_mode || '')
    ).trim();
    const legacyNatGatewayEnabled = config.enable_nat_gateway !== false && config.enable_nat_gateway !== 'false';
    vars.nat_gateway_mode = ['single', 'per_az', 'none'].includes(requestedNatGatewayMode)
      ? requestedNatGatewayMode
      : legacyNatGatewayEnabled ? 'single' : 'none';
    vars.enable_nat_gateway = vars.nat_gateway_mode !== 'none';
    
    // Format create_new_subnets - defaults to true if not specified
    vars.create_new_subnets = config.create_new_subnets !== false && config.create_new_subnets !== 'false';
    
    // Format existing VPC ID
    vars.existing_vpc_id = config.existing_vpc_id || '';
    
    // Format existing subnet IDs - ensure it's an array for Terraform
    if (config.existing_subnet_ids && Array.isArray(config.existing_subnet_ids) && config.existing_subnet_ids.length > 0) {
      vars.existing_subnet_ids = JSON.stringify(config.existing_subnet_ids);
    } else {
      vars.existing_subnet_ids = '[]';
    }
    
    // Format existing security group IDs - convert single ID to array format
    if (config.existing_security_group_id) {
      vars.existing_security_group_ids = JSON.stringify([config.existing_security_group_id]);
    } else if (config.existing_security_group_ids && Array.isArray(config.existing_security_group_ids)) {
      vars.existing_security_group_ids = JSON.stringify(config.existing_security_group_ids);
    } else {
      vars.existing_security_group_ids = '[]';
    }
    
    // Format arrays - ensure they're always strings for template
    if (config.availability_zones && Array.isArray(config.availability_zones)) {
      vars.availability_zones = JSON.stringify(config.availability_zones);
    } else {
      vars.availability_zones = '[]';
    }
    
    // Format tags - ensure it's always a valid JSON object
    if (config.tags && typeof config.tags === 'object') {
      vars.common_tags = JSON.stringify(config.tags);
    } else {
      vars.common_tags = '{}';
    }
    
    // Add computed values for readme
    vars.private_link_status = vars.enable_private_link ? 'Enabled' : 'Disabled';
    vars.generated_date = new Date().toLocaleString();
    vars.provider_upper = (config.provider || '').toUpperCase();

    // AWS upstream Terraform input mappings. The upstream .tf files
    // remain byte-for-byte unchanged; only these tfvars values are generated.
    if (config.provider === 'aws') {
      const formatStringList = values => `[${values.map(value => JSON.stringify(String(value))).join(', ')}]`;
      const privateSubnets = vars.calculated_subnets.filter(subnet => subnet.subnet_type === 'private');
      const publicSubnets = vars.calculated_subnets.filter(subnet => subnet.subnet_type === 'public');
      const intraSubnets = vars.calculated_subnets.filter(subnet =>
        subnet.subnet_type === 'intra' || subnet.subnet_type === 'service'
      );
      const endpointSubnet = vars.calculated_subnets.find(subnet => subnet.subnet_type === 'endpoint');
      const managedNetwork = vars.create_new_vpc;
      const fullyPrivateNetwork = managedNetwork && vars.enable_private_link && !vars.enable_nat_gateway;
      const useExistingMetastore = config.metastore_mode === 'existing';
      const tags = config.tags && typeof config.tags === 'object' ? config.tags : {
        Project: config.project_prefix || 'databricks',
        Environment: 'dev',
        ManagedBy: 'terraform',
        Provider: 'aws',
        CreatedBy: 'oneclick-databricks-deployer'
      };
      const tagEntries = Object.entries(tags).sort(([left], [right]) => left.localeCompare(right));
      const tagKeyWidth = tagEntries.length
        ? Math.max(...tagEntries.map(([key]) => JSON.stringify(key).length))
        : 0;
      vars.common_tags = tagEntries.length
        ? `{\n${tagEntries.map(([key, value]) => `  ${JSON.stringify(key).padEnd(tagKeyWidth)} = ${JSON.stringify(String(value))}`).join('\n')}\n}`
        : '{}';

      vars.byovpc_private_subnets_cidr = formatStringList(managedNetwork ? privateSubnets.map(subnet => subnet.cidr) : []);
      vars.byovpc_public_subnets_cidr = formatStringList(managedNetwork ? publicSubnets.map(subnet => subnet.cidr) : []);
      vars.byovpc_intra_subnet_cidr = formatStringList(managedNetwork ? intraSubnets.map(subnet => subnet.cidr) : []);
      vars.aws_availability_zones = formatStringList(managedNetwork && Array.isArray(config.availability_zones) ? config.availability_zones : []);
      vars.aws_vpc_id = managedNetwork ? '' : (config.existing_vpc_id || '');
      vars.aws_subnet_ids = formatStringList(managedNetwork ? [] : (config.existing_subnet_ids || []));
      vars.aws_security_group_ids = formatStringList(managedNetwork ? [] : [config.existing_security_group_id].filter(Boolean));
      vars.aws_network_configuration = managedNetwork
        ? (fullyPrivateNetwork ? 'fully_private' : 'standard')
        : 'custom';
      // Upstream accepts only single/per_az. In fully_private mode the value is
      // ignored, so emit its safe default instead of the UI-only "none" value.
      vars.aws_nat_gateway_mode = vars.nat_gateway_mode === 'per_az' ? 'per_az' : 'single';
      vars.nat_gateway_summary = vars.nat_gateway_mode === 'per_az'
        ? 'One per availability zone'
        : vars.nat_gateway_mode === 'none' ? 'Disabled' : 'Single';
      vars.is_fully_private = fullyPrivateNetwork;
      vars.endpoint_subnet_cidr = fullyPrivateNetwork && endpointSubnet ? endpointSubnet.cidr : '';
      vars.backend_rest_aws_vpce_id = managedNetwork ? '' : (config.backend_rest_aws_vpce_id || '');
      vars.backend_relay_aws_vpce_id = managedNetwork ? '' : (config.backend_relay_aws_vpce_id || '');
      vars.metastore_id = useExistingMetastore ? (config.metastore_id || '') : '';
      vars.metastore_name = useExistingMetastore ? '' : (config.metastore_name || `${config.project_prefix || 'databricks'}-metastore`);
      vars.terraform_source_commit = config.terraform_source_commit || '';
      vars.terraform_source_ref = config.terraform_source_ref || 'main';
      vars.terraform_source_url = config.terraform_source_url || '';
    }

    // Azure upstream Terraform input mappings. As with AWS, the
    // upstream .tf files stay unchanged and this app only renders tfvars.
    if (config.provider === 'azure') {
      const formatStringList = values => `[${values.map(value => JSON.stringify(String(value))).join(', ')}]`;
      const privateSubnet = vars.calculated_subnets.find(subnet => subnet.subnet_type === 'private');
      const publicSubnet = vars.calculated_subnets.find(subnet => subnet.subnet_type === 'public');
      const privateEndpointSubnet = vars.calculated_subnets.find(subnet => subnet.subnet_type === 'service');
      const existingVnetMatch = String(config.existing_vpc_id || '').match(
        /\/resourceGroups\/([^/]+)\/providers\/Microsoft\.Network\/virtualNetworks\/([^/]+)$/i
      );
      const prefix = config.project_prefix || 'databricks';
      const storageBase = prefix.toLowerCase().replace(/[^a-z0-9]/g, '') || 'databricks';
      const tags = config.tags && typeof config.tags === 'object' ? config.tags : {
        Project: prefix,
        Environment: 'dev',
        ManagedBy: 'terraform',
        Provider: 'azure',
        CreatedBy: 'oneclick-databricks-deployer'
      };
      const tagEntries = Object.entries(tags).sort(([left], [right]) => left.localeCompare(right));

      vars.common_tags = tagEntries.length
        ? `{\n${tagEntries.map(([key, value]) => `  ${JSON.stringify(key)} = ${JSON.stringify(String(value))}`).join('\n')}\n}`
        : '{}';
      vars.azure_tenant_id = config.azure_tenant_id || '';
      vars.azure_subscription_id = config.azure_subscription_id || '';
      vars.azure_admin_user = config.azure_admin_user || '';
      vars.azure_root_storage_name = config.azure_root_storage_name || `dbfs${storageBase}`.slice(0, 24);
      vars.azure_uc_storage_account_name = config.azure_uc_storage_account_name || `uc${storageBase}`.slice(0, 24);
      vars.azure_catalog_name = config.azure_catalog_name || `${prefix.replace(/-/g, '_')}_catalog`;
      vars.azure_storage_credential_name = config.azure_storage_credential_name || `${prefix}-storage-credential`;
      vars.azure_external_location_name = config.azure_external_location_name || `${prefix}-external-location`;
      const configuredAzureNatGatewayZone = Object.prototype.hasOwnProperty.call(config, 'azure_nat_gateway_zone')
        ? String(config.azure_nat_gateway_zone)
        : '1';
      const azureNatGatewayZone = ['1', '2', '3'].includes(configuredAzureNatGatewayZone)
        ? configuredAzureNatGatewayZone
        : '';
      vars.azure_nat_gateway_zones = formatStringList(azureNatGatewayZone ? [azureNatGatewayZone] : []);
      vars.azure_nat_gateway_summary = azureNatGatewayZone
        ? `Availability Zone ${azureNatGatewayZone}`
        : 'Regional / non-zonal';
      const configuredAzurePrivateLinkNatGatewayZone = Object.prototype.hasOwnProperty.call(
        config,
        'azure_private_link_nat_gateway_zone'
      ) ? String(config.azure_private_link_nat_gateway_zone) : '';
      const azurePrivateLinkNatGatewayZone = ['1', '2', '3'].includes(configuredAzurePrivateLinkNatGatewayZone)
        ? configuredAzurePrivateLinkNatGatewayZone
        : '';
      vars.azure_private_link_nat_gateway_zones = formatStringList(
        azurePrivateLinkNatGatewayZone ? [azurePrivateLinkNatGatewayZone] : []
      );
      vars.azure_private_link_nat_gateway_summary = vars.enable_nat_gateway
        ? `Single — ${azurePrivateLinkNatGatewayZone
          ? `Availability Zone ${azurePrivateLinkNatGatewayZone}`
          : 'Regional / non-zonal'}`
        : 'Disabled';
      vars.azure_vnet_name = vars.create_new_vpc ? '' : (existingVnetMatch?.[2] || '');
      vars.azure_vnet_resource_group_name = vars.create_new_vpc
        ? (config.azure_vnet_resource_group_name || `${prefix}-network-rg`)
        : (existingVnetMatch?.[1] || '');
      vars.azure_public_subnet_cidr = publicSubnet?.cidr || '';
      vars.azure_private_subnet_cidr = privateSubnet?.cidr || '';
      vars.azure_private_endpoint_subnet_cidr = privateEndpointSubnet?.cidr || '';
      vars.azure_workspace_subnet_cidrs = formatStringList([
        vars.azure_public_subnet_cidr,
        vars.azure_private_subnet_cidr
      ]);
      vars.azure_create_data_plane_resource_group = config.azure_resource_group_mode !== 'existing';
      vars.azure_existing_data_plane_resource_group_name = vars.azure_create_data_plane_resource_group
        ? ''
        : (config.azure_existing_resource_group_name || '');
      vars.metastore_id = config.metastore_mode === 'existing' ? (config.metastore_id || '') : '';
      vars.metastore_name = config.metastore_mode === 'existing'
        ? ''
        : (config.metastore_name || `${prefix}-metastore`);
      vars.terraform_source_commit = config.terraform_source_commit || '';
      vars.terraform_source_ref = config.terraform_source_ref || 'main';
      vars.terraform_source_url = config.terraform_source_url || '';
    }

    // GCP upstream Terraform input mappings. The selected source creates
    // either the standalone BYOVPC topology or the Back-end PSC topology.
    if (config.provider === 'gcp') {
      const hclString = value => JSON.stringify(String(value || ''));
      vars.google_service_account_email = config.google_service_account_email || '';
      vars.databricks_account_id = config.databricks_account_id || '';
      vars.databricks_admin_user = config.databricks_admin_user || '';
      vars.subnet_cidr = config.subnet_cidr || '';
      vars.google_service_account_email_hcl = hclString(vars.google_service_account_email);
      vars.google_project_name_hcl = hclString(config.project_id);
      vars.google_region_hcl = hclString(config.region);
      vars.databricks_account_id_hcl = hclString(vars.databricks_account_id);
      vars.databricks_workspace_name_hcl = hclString(config.project_prefix);
      vars.databricks_admin_user_hcl = hclString(vars.databricks_admin_user);
      vars.subnet_cidr_hcl = hclString(vars.subnet_cidr);
      vars.psc_subnet_cidr_hcl = hclString(config.psc_subnet_cidr);
      vars.workspace_service_attachment_hcl = hclString(config.workspace_service_attachment);
      vars.relay_service_attachment_hcl = hclString(config.relay_service_attachment);
      vars.gcp_nat_summary = vars.enable_nat_gateway ? 'Cloud NAT created' : 'No Cloud NAT';
      vars.terraform_source_commit = config.terraform_source_commit || '';
      vars.terraform_source_ref = config.terraform_source_ref || 'main';
      vars.terraform_source_url = config.terraform_source_url || '';
    }
    
    // Handle PrivateLink subnet mode (AWS only)
    if (vars.enable_private_link && config.provider === 'aws') {
      vars.privatelink_subnet_mode = config.privatelink_subnet_mode || 'terraform_managed';
      vars.existing_privatelink_subnet_id = config.existing_privatelink_subnet_id || '';
    } else {
      vars.privatelink_subnet_mode = 'terraform_managed';
      vars.existing_privatelink_subnet_id = '';
    }
    
    // Handle optional values with defaults
    vars.resource_group_name = config.resource_group_name || '';
    vars.project_id = config.project_id || '';
    vars.existing_vpc_name = config.existing_vpc_id || config.existing_vpc_name || '';
    vars.cross_account_role_arn = config.cross_account_role_arn || '';

    // Azure-specific existing VNet variables
    vars.existing_vnet_id = config.existing_vpc_id || '';
    vars.existing_public_subnet_name = config.existing_public_subnet_name || '';
    vars.existing_private_subnet_name = config.existing_private_subnet_name || '';

    // GCP-specific existing VPC variables
    vars.existing_subnet_name = config.existing_subnet_name || '';
    vars.existing_pod_range_name = config.existing_pod_range_name || '';
    vars.existing_service_range_name = config.existing_service_range_name || '';

    // Azure needs lowercase pricing tier
    vars.pricing_tier_lower = (config.pricing_tier || 'premium').toLowerCase();
    
    return vars;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateEngine;
}

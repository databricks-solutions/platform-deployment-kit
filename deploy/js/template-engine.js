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
    vars.nat_gateway_mode = config.nat_gateway_mode || 'per_az';
    
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

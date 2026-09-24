/**
 * Terraform Generator - Generates Terraform projects for Databricks deployments
 * Uses external template files loaded via TemplateLoader
 */

class TerraformGenerator {
  constructor() {
    this.loader = new TemplateLoader();
    this.engine = new TemplateEngine();
  }

  /**
   * Generate complete Terraform project as ZIP
   */
  async generateProject(config) {
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is not loaded. Please ensure the JSZip script is loaded before generating the project.');
    }
    
    // Check if TemplateLoader and TemplateEngine are available
    if (typeof TemplateLoader === 'undefined' || typeof TemplateEngine === 'undefined') {
      throw new Error('TemplateLoader and TemplateEngine are not loaded. Please ensure template-loader.js and template-engine.js are loaded.');
    }
    
    const zip = new JSZip();
    const provider = config.provider.toLowerCase();

    if (provider === 'aws' || provider === 'azure' || provider === 'gcp') {
      const enablePrivateLink = Boolean(config.enable_private_link);
      const externalFiles = await this.loader.loadExternalTerraformFiles(provider, enablePrivateLink);
      const metadata = this.loader.getExternalTerraformMetadata?.(provider, enablePrivateLink) || {};
      const variables = this.engine.prepareVariables({
        ...config,
        provider,
        terraform_source_commit: metadata.commit || '',
        terraform_source_ref: metadata.ref || 'main',
        terraform_source_url: metadata.sourceUrl || ''
      });

      for (const file of externalFiles) {
        if (!file?.name || file.name.includes('/') || file.name.includes('\\') ||
            file.name === 'terraform.tfvars' || file.name === 'README.md') {
          throw new Error(`Unsafe or conflicting vendored Terraform filename: ${file?.name || '(missing)'}`);
        }
        zip.file(file.name, file.content);
      }
      zip.file('terraform.tfvars', await this.renderTemplate(provider, 'tfvars', variables));
      zip.file('README.md', await this.renderTemplate(provider, 'readme', variables));
      return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    }
    
    // Prepare variables for template rendering
    const variables = this.engine.prepareVariables({ ...config, provider });
    
    // Generate main files
    zip.file('provider.tf', await this.renderTemplate(provider, 'provider', variables));
    zip.file('variables.tf', await this.renderTemplate(provider, 'variables', variables));
    zip.file('terraform.tfvars', await this.renderTemplate(provider, 'tfvars', variables));
    zip.file('main.tf', await this.renderTemplate(provider, 'main', variables));
    zip.file('outputs.tf', await this.renderTemplate(provider, 'outputs', variables));
    zip.file('versions.tf', await this.renderTemplate(provider, 'versions', variables));
    zip.file('README.md', await this.renderTemplate(provider, 'readme', variables));
    
    // Generate modules directory structure
    const modulesDir = zip.folder('modules');
    const networkDir = modulesDir.folder('network');
    const databricksDir = modulesDir.folder('databricks');
    
    // Generate module files
    networkDir.file('main.tf', await this.renderModuleTemplate('network', 'main', variables));
    networkDir.file('variables.tf', await this.renderModuleTemplate('network', 'variables', variables));
    networkDir.file('outputs.tf', await this.renderModuleTemplate('network', 'outputs', variables));
    
    databricksDir.file('main.tf', await this.renderModuleTemplate('databricks', 'main', variables));
    databricksDir.file('variables.tf', await this.renderModuleTemplate('databricks', 'variables', variables));
    databricksDir.file('outputs.tf', await this.renderModuleTemplate('databricks', 'outputs', variables));
    
    // Generate ZIP blob
    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  /**
   * Render template with variables
   * @param {string} provider - Provider name
   * @param {string} templateName - Template name
   * @param {Object} variables - Variables object
   * @returns {Promise<string>} Rendered template
   */
  async renderTemplate(provider, templateName, variables) {
    try {
      const template = await this.loader.loadTemplate(provider, templateName);
      const templatePath = `${provider}/${templateName}`;
      return this.engine.render(template, variables, templatePath);
    } catch (error) {
      throw new Error(`Failed to render template ${provider}/${templateName}: ${error.message}`);
    }
  }

  /**
   * Render module template
   * @param {string} moduleName - Module name
   * @param {string} templateName - Template name
   * @param {Object} variables - Variables object
   * @returns {Promise<string>} Rendered template
   */
  async renderModuleTemplate(moduleName, templateName, variables) {
    try {
      const template = await this.loader.loadModuleTemplate(moduleName, templateName);
      const templatePath = `modules/${moduleName}/${templateName}`;
      return this.engine.render(template, variables, templatePath);
    } catch (error) {
      throw new Error(`Failed to render module template ${moduleName}/${templateName}: ${error.message}`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerraformGenerator;
}

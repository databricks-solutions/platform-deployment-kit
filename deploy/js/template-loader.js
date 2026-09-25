/**
 * TemplateLoader - Loads Terraform templates from external files
 * Caches loaded templates in memory for the current session
 */
class TemplateLoader {
  constructor() {
    this.cache = new Map();
    this.basePath = './templates/';
    this.externalBasePath = './terraform-sources';
    this.loadingPromises = new Map();
    this.externalManifest = null;
  }

  /**
   * Load a build-vendored Terraform variant and verify every file hash.
   * @param {string} provider - Cloud provider (aws, azure, or gcp)
   * @param {boolean} enablePrivateLink - Select the provider's Private Link variant
   * @returns {Promise<Array<{name: string, content: string}>>}
   */
  async loadExternalTerraformFiles(provider, enablePrivateLink = false) {
    const manifest = await this._loadExternalManifest();
    const variantId = this._externalVariantId(provider, enablePrivateLink);
    const variant = manifest.variants?.[variantId];
    if (!variant) throw new Error(`Terraform source manifest does not contain ${variantId}`);

    const entries = [...(variant.files || []), ...(manifest.commonFiles || [])];
    return Promise.all(entries.map(async file => {
      this._validateExternalFile(file, manifest.commit);
      return {
        name: file.name,
        content: await this._fetchVerifiedText(file.artifactPath, file.sha256)
      };
    }));
  }

  getExternalTerraformMetadata(provider, enablePrivateLink = false) {
    if (!this.externalManifest) return null;
    const variantId = this._externalVariantId(provider, enablePrivateLink);
    const variant = this.externalManifest.variants?.[variantId];
    if (!variant) return null;
    return {
      commit: this.externalManifest.commit,
      ref: this.externalManifest.ref,
      sourceUrl: variant.sourceUrl || this.externalManifest.sourceUrl
    };
  }

  _externalVariantId(provider, enablePrivateLink) {
    const normalizedProvider = String(provider || '').toLowerCase();
    if (!['aws', 'azure', 'gcp'].includes(normalizedProvider)) {
      throw new Error(`External Terraform is not configured for provider ${provider || '(missing)'}`);
    }
    return `${normalizedProvider}-${enablePrivateLink ? 'privatelink' : 'standard'}`;
  }

  async _loadExternalManifest() {
    if (this.externalManifest) return this.externalManifest;
    const response = await fetch(`${this.externalBasePath}/manifest.json`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load Terraform source manifest: ${response.status} ${response.statusText}`);
    }
    const manifest = await response.json();
    if (!manifest || manifest.schemaVersion !== 1 || !/^[0-9a-f]{40}$/.test(manifest.commit || '')) {
      throw new Error('Terraform source manifest is invalid');
    }
    this.externalManifest = manifest;
    return manifest;
  }

  _validateExternalFile(file, commit) {
    if (!file || typeof file.name !== 'string' || file.name.includes('/') || file.name.includes('\\') ||
        file.name === '.' || file.name === '..') {
      throw new Error('Terraform source manifest contains an unsafe output filename');
    }
    const expectedPrefix = `${commit}/`;
    if (typeof file.artifactPath !== 'string' || !file.artifactPath.startsWith(expectedPrefix) ||
        file.artifactPath.split('/').includes('..')) {
      throw new Error(`Terraform source manifest contains an unsafe artifact path for ${file.name}`);
    }
    if (!/^[0-9a-f]{64}$/.test(file.sha256 || '')) {
      throw new Error(`Terraform source manifest contains an invalid hash for ${file.name}`);
    }
  }

  async _fetchVerifiedText(artifactPath, expectedHash) {
    const response = await fetch(`${this.externalBasePath}/${artifactPath}`);
    if (!response.ok) throw new Error(`Failed to load vendored Terraform file ${artifactPath}`);
    const bytes = await response.arrayBuffer();
    const actualHash = await this._sha256(bytes);
    if (actualHash !== expectedHash) {
      throw new Error(`Integrity check failed for vendored Terraform file ${artifactPath}`);
    }
    return new TextDecoder().decode(bytes);
  }

  async _sha256(bytes) {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    }
    if (typeof require !== 'undefined') {
      return require('crypto').createHash('sha256').update(Buffer.from(bytes)).digest('hex');
    }
    throw new Error('SHA-256 support is unavailable; Terraform files cannot be verified');
  }

  /**
   * Load a template file
   * @param {string} provider - Provider name (aws, azure, gcp)
   * @param {string} templateName - Template name (provider, variables, etc.)
   * @returns {Promise<string>} Template content
   */
  async loadTemplate(provider, templateName) {
    const cacheKey = `${provider}/${templateName}`;
    
    // Return cached template if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Start loading
    const loadPromise = this._fetchTemplate(provider, templateName)
      .then(content => {
        this.cache.set(cacheKey, content);
        this.loadingPromises.delete(cacheKey);
        return content;
      })
      .catch(error => {
        this.loadingPromises.delete(cacheKey);
        throw error;
      });

    this.loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
  }

  /**
   * Load module template
   * @param {string} moduleName - Module name (network, databricks)
   * @param {string} templateName - Template name (main, variables, outputs)
   * @returns {Promise<string>} Template content
   */
  async loadModuleTemplate(moduleName, templateName) {
    const cacheKey = `modules/${moduleName}/${templateName}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const loadPromise = this._fetchModuleTemplate(moduleName, templateName)
      .then(content => {
        this.cache.set(cacheKey, content);
        this.loadingPromises.delete(cacheKey);
        return content;
      })
      .catch(error => {
        this.loadingPromises.delete(cacheKey);
        throw error;
      });

    this.loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
  }

  /**
   * Load provider config
   * @param {string} provider - Provider name
   * @returns {Promise<Object>} Config object
   */
  async loadConfig(provider) {
    const cacheKey = `${provider}/config`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const configPath = `${this.basePath}${provider}/config.json`;
    const response = await fetch(configPath);
    
    if (!response.ok) {
      throw new Error(`Failed to load config for ${provider}: ${response.statusText}`);
    }

    const config = await response.json();
    this.cache.set(cacheKey, config);
    return config;
  }

  /**
   * Fetch template file
   * @private
   */
  async _fetchTemplate(provider, templateName) {
    // Map template names to file names
    const fileMap = {
      'provider': 'provider.tf.template',
      'variables': 'variables.tf.template',
      'tfvars': 'tfvars.tf.template',
      'main': 'main.tf.template',
      'outputs': 'outputs.tf.template',
      'versions': 'versions.tf.template',
      'readme': 'readme.md.template'
    };

    const fileName = fileMap[templateName];
    if (!fileName) {
      throw new Error(`Unknown template name: ${templateName}`);
    }

    const templatePath = `${this.basePath}${provider}/${fileName}`;
    const response = await fetch(templatePath);
    
    if (!response.ok) {
      throw new Error(`Failed to load template ${provider}/${templateName}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Fetch module template file
   * @private
   */
  async _fetchModuleTemplate(moduleName, templateName) {
    const fileMap = {
      'main': 'main.tf.template',
      'variables': 'variables.tf.template',
      'outputs': 'outputs.tf.template'
    };

    const fileName = fileMap[templateName];
    if (!fileName) {
      throw new Error(`Unknown module template name: ${templateName}`);
    }

    const templatePath = `${this.basePath}modules/${moduleName}/${fileName}`;
    const response = await fetch(templatePath);
    
    if (!response.ok) {
      throw new Error(`Failed to load module template ${moduleName}/${templateName}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Preload all templates for a provider
   * @param {string} provider - Provider name
   * @returns {Promise<void>}
   */
  async preloadProvider(provider) {
    try {
      if (provider === 'aws' || provider === 'azure' || provider === 'gcp') {
        await Promise.all([
          this.loadTemplate(provider, 'tfvars'),
          this.loadTemplate(provider, 'readme'),
          this._loadExternalManifest()
        ]);
        return;
      }
      const config = await this.loadConfig(provider);
      const loadPromises = config.template_files.map(file => {
        const templateName = file.replace('.tf.template', '').replace('.md.template', '');
        return this.loadTemplate(provider, templateName).catch(err => {
          console.warn(`Failed to preload ${provider}/${templateName}:`, err);
        });
      });
      await Promise.all(loadPromises);
    } catch (error) {
      console.warn(`Failed to preload provider ${provider}:`, error);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
    this.externalManifest = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateLoader;
}

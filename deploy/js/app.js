/**
 * Main Application - SPA Router and Application Logic
 */

class App {
  constructor() {
    this.currentConfig = Utils.getStorage('config') || {};
    this.currentProvider = Utils.getStorage('provider') || null;
    this.currentStep = Utils.getStorage('step') || 0;
    this.downloadBlob = null;
    this.downloadFilename = null;
    
    this.routes = {
      '/': this.renderHome.bind(this),
      '/select-provider': this.renderProviderSelection.bind(this),
      '/configure': this.renderConfiguration.bind(this),
      '/summary': this.renderSummary.bind(this),
      '/download': this.renderDownload.bind(this),
      '/reset': this.handleReset.bind(this)
    };
    
    this.init();
  }

  /**
   * Get official regions list for a cloud provider organized by geographic groups
   * Returns array of group objects with name and regions array
   * Only includes regions officially supported by Databricks
   */
  getRegions(provider) {
    const regions = {
      aws: [
        {
          group: 'United States',
          regions: [
            { code: 'us-east-1', name: 'US East (N. Virginia)' },
            { code: 'us-east-2', name: 'US East (Ohio)' },
            { code: 'us-west-1', name: 'US West (N. California)' },
            { code: 'us-west-2', name: 'US West (Oregon)' }
          ]
        },
        {
          group: 'Canada',
          regions: [
            { code: 'ca-central-1', name: 'Canada (Central)' }
          ]
        },
        {
          group: 'Europe',
          regions: [
            { code: 'eu-central-1', name: 'Europe (Frankfurt)' },
            { code: 'eu-west-1', name: 'Europe (Ireland)' },
            { code: 'eu-west-2', name: 'Europe (London)' },
            { code: 'eu-west-3', name: 'Europe (Paris)' }
          ]
        },
        {
          group: 'Asia Pacific',
          regions: [
            { code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
            { code: 'ap-northeast-2', name: 'Asia Pacific (Seoul)' },
            { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)' },
            { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
            { code: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
            { code: 'ap-southeast-3', name: 'Asia Pacific (Jakarta)' }
          ]
        },
        {
          group: 'South America',
          regions: [
            { code: 'sa-east-1', name: 'South America (São Paulo)' }
          ]
        }
      ],
      azure: [
        {
          group: 'United States',
          regions: [
            { code: 'centralus', name: 'Central US' },
            { code: 'eastus', name: 'East US' },
            { code: 'eastus2', name: 'East US 2' },
            { code: 'northcentralus', name: 'North Central US' },
            { code: 'southcentralus', name: 'South Central US' },
            { code: 'westus', name: 'West US' },
            { code: 'westus2', name: 'West US 2' },
            { code: 'westus3', name: 'West US 3' }
          ]
        },
        {
          group: 'Canada',
          regions: [
            { code: 'canadacentral', name: 'Canada Central' },
            { code: 'canadaeast', name: 'Canada East' }
          ]
        },
        {
          group: 'Europe',
          regions: [
            { code: 'francecentral', name: 'France Central' },
            { code: 'germanywestcentral', name: 'Germany West Central' },
            { code: 'northeurope', name: 'North Europe' },
            { code: 'norwayeast', name: 'Norway East' },
            { code: 'norwaywest', name: 'Norway West' },
            { code: 'switzerlandnorth', name: 'Switzerland North' },
            { code: 'switzerlandwest', name: 'Switzerland West' },
            { code: 'uksouth', name: 'UK South' },
            { code: 'ukwest', name: 'UK West' },
            { code: 'westeurope', name: 'West Europe' }
          ]
        },
        {
          group: 'Asia Pacific',
          regions: [
            { code: 'australiaeast', name: 'Australia East' },
            { code: 'australiasoutheast', name: 'Australia Southeast' },
            { code: 'centralindia', name: 'India Central' },
            { code: 'eastasia', name: 'East Asia' },
            { code: 'japaneast', name: 'Japan East' },
            { code: 'japanwest', name: 'Japan West' },
            { code: 'koreacentral', name: 'Korea Central' },
            { code: 'koreasouth', name: 'Korea South' },
            { code: 'southindia', name: 'India South' },
            { code: 'southeastasia', name: 'Southeast Asia' }
          ]
        },
        {
          group: 'Middle East & Africa',
          regions: [
            { code: 'southafricanorth', name: 'South Africa North' },
            { code: 'southafricawest', name: 'South Africa West' },
            { code: 'uaenorth', name: 'UAE North' }
          ]
        },
        {
          group: 'South America',
          regions: [
            { code: 'brazilsouth', name: 'Brazil South' }
          ]
        }
      ],
      gcp: [
        {
          group: 'United States',
          regions: [
            { code: 'us-central1', name: 'US Central (Iowa)' },
            { code: 'us-east1', name: 'US East (South Carolina)' },
            { code: 'us-east4', name: 'US East (Northern Virginia)' },
            { code: 'us-west1', name: 'US West (Oregon)' },
            { code: 'us-west4', name: 'US West (Las Vegas)' }
          ]
        },
        {
          group: 'Canada',
          regions: [
            { code: 'northamerica-northeast1', name: 'North America Northeast (Montréal)' }
          ]
        },
        {
          group: 'Europe',
          regions: [
            { code: 'europe-west1', name: 'Europe West (Belgium)' },
            { code: 'europe-west2', name: 'Europe West (London)' },
            { code: 'europe-west3', name: 'Europe West (Frankfurt)' }
          ]
        },
        {
          group: 'Asia Pacific',
          regions: [
            { code: 'asia-northeast1', name: 'Asia Northeast (Tokyo)' },
            { code: 'asia-south1', name: 'Asia South (Mumbai)' },
            { code: 'asia-southeast1', name: 'Asia Southeast (Singapore)' }
          ]
        },
        {
          group: 'Australia',
          regions: [
            { code: 'australia-southeast1', name: 'Australia Southeast (Sydney)' }
          ]
        },
        {
          group: 'South America',
          regions: [
            { code: 'southamerica-east1', name: 'South America East (São Paulo)' }
          ]
        }
      ]
    };

    if (provider?.toLowerCase() === 'azure') {
      const supported = [
        'australiacentral', 'australiacentral2', 'australiaeast', 'australiasoutheast',
        'brazilsouth', 'canadacentral', 'canadaeast', 'centralindia', 'centralus',
        'chinaeast2', 'chinaeast3', 'chinanorth2', 'chinanorth3', 'eastasia', 'eastus',
        'eastus2', 'francecentral', 'germanywestcentral', 'japaneast', 'japanwest',
        'koreacentral', 'mexicocentral', 'northcentralus', 'northeurope', 'norwayeast',
        'qatarcentral', 'southafricanorth', 'southcentralus', 'southeastasia', 'southindia',
        'swedencentral', 'switzerlandnorth', 'switzerlandwest', 'uaenorth', 'uksouth',
        'ukwest', 'westcentralus', 'westeurope', 'westindia', 'westus', 'westus2', 'westus3'
      ];
      const supportedSet = new Set(supported);
      const groups = regions.azure.map(group => ({
        ...group,
        regions: group.regions.filter(region => supportedSet.has(region.code))
      })).filter(group => group.regions.length > 0);
      const known = new Set(groups.flatMap(group => group.regions.map(region => region.code)));
      const additional = supported.filter(code => !known.has(code)).map(code => ({ code, name: code }));
      if (additional.length) groups.push({ group: 'Additional Supported Regions', regions: additional });
      return groups;
    }

    return regions[provider?.toLowerCase()] || [];
  }

  /**
   * Render region select options with optgroups
   * First region is selected by default if no selectedRegion is provided
   */
  renderRegionOptions(provider, selectedRegion) {
    const groups = this.getRegions(provider);
    let html = '';
    let isFirst = true;
    
    groups.forEach(group => {
      html += `<optgroup label="${group.group}">`;
      group.regions.forEach(region => {
        // Select first region by default if no selectedRegion provided
        const isSelected = selectedRegion ? selectedRegion === region.code : isFirst;
        const selected = isSelected ? 'selected' : '';
        html += `<option value="${region.code}" ${selected}>${region.name} (${region.code})</option>`;
        isFirst = false;
      });
      html += '</optgroup>';
    });
    
    return html;
  }

  /**
   * Render pricing tier options for a provider
   * @param {string} provider - Cloud provider (aws, azure, gcp)
   * @param {string} selectedTier - Currently selected tier
   * @returns {string} HTML options for the pricing tier select
   */
  renderPricingTierOptions(provider, selectedTier) {
    const tiers = provider === 'aws' 
      ? [
          { value: 'PREMIUM', label: 'Premium' },
          { value: 'ENTERPRISE', label: 'Enterprise' }
        ]
      : provider === 'azure'
        ? [{ value: 'PREMIUM', label: 'Premium' }]
      : [
          { value: 'STANDARD', label: 'Standard' },
          { value: 'PREMIUM', label: 'Premium' }
        ];
    
    // Default to the last tier if no selectedTier is provided
    const defaultTier = tiers[tiers.length - 1].value;
    const effectiveSelection = selectedTier || defaultTier;
    
    return tiers.map(tier => {
      const selected = tier.value === effectiveSelection ? 'selected' : '';
      return `<option value="${tier.value}" ${selected}>${tier.label}</option>`;
    }).join('');
  }

  /**
   * Render a compact, accessible trigger for provider-specific guidance.
   */
  renderHelpButton(topicId, label) {
    return `
      <button type="button" class="context-help-trigger" data-help-topic="${topicId}"
              aria-label="Learn more about ${label}" aria-controls="contextHelpDrawer"
              title="Learn more about ${label}">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
      </button>
    `;
  }

  /**
   * Handle help triggers rendered by SPA routes and populate the shared drawer.
   */
  setupContextualHelp() {
    const drawer = document.getElementById('contextHelpDrawer');
    if (!drawer || typeof HelpContent === 'undefined') return;

    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-help-topic]');
      if (!trigger) return;

      event.preventDefault();
      event.stopPropagation();
      this.openContextualHelp(trigger.dataset.helpTopic, trigger);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || (!drawer.classList.contains('show') && !drawer.classList.contains('showing'))) return;
      const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(drawer);
      if (drawer.classList.contains('showing') && !drawer.classList.contains('show')) {
        drawer.addEventListener('shown.bs.offcanvas', () => offcanvas.hide(), { once: true });
      } else {
        offcanvas.hide();
      }
    }, true);

    drawer.addEventListener('hidden.bs.offcanvas', () => {
      if (this.contextHelpTrigger?.isConnected) {
        this.contextHelpTrigger.focus();
      }
    });
  }

  openContextualHelp(topicId, trigger) {
    const topic = HelpContent.getTopic(topicId, this.currentProvider);
    const drawer = document.getElementById('contextHelpDrawer');
    const title = document.getElementById('contextHelpTitle');
    const provider = document.getElementById('contextHelpProvider');
    const body = document.getElementById('contextHelpBody');
    if (!topic || !drawer || !title || !provider || !body) return;

    const providerNames = { aws: 'AWS guidance', azure: 'Azure guidance', gcp: 'GCP guidance' };
    title.textContent = topic.title;
    provider.textContent = providerNames[this.currentProvider] || 'Configuration guidance';
    body.replaceChildren();

    const overview = document.createElement('p');
    overview.className = 'context-help-overview';
    overview.textContent = topic.overview;
    body.appendChild(overview);

    const appendListSection = (heading, items) => {
      if (!items?.length) return;
      const section = document.createElement('section');
      section.className = 'context-help-section';
      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = heading;
      const list = document.createElement('ul');
      items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        list.appendChild(listItem);
      });
      section.append(sectionTitle, list);
      body.appendChild(section);
    };

    appendListSection('When to use each option', topic.whenToUse);
    appendListSection('Requirements and considerations', topic.considerations);

    if (topic.links?.length) {
      const section = document.createElement('section');
      section.className = 'context-help-section context-help-links';
      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = 'Official documentation';
      section.appendChild(sectionTitle);
      topic.links.forEach(link => {
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'context-help-link';
        const label = document.createElement('span');
        label.textContent = link.label;
        const icon = document.createElement('i');
        icon.className = 'bi bi-box-arrow-up-right';
        icon.setAttribute('aria-hidden', 'true');
        anchor.append(label, icon);
        section.appendChild(anchor);
      });
      body.appendChild(section);
    }

    this.contextHelpTrigger = trigger;
    bootstrap.Offcanvas.getOrCreateInstance(drawer).show(trigger);
  }

  /**
   * Get availability zone limits for a provider
   */
  getAvailabilityZoneLimits(provider) {
    const limits = {
      aws: { min: 2, max: 6 },
      azure: { min: 1, max: 3 },
      gcp: { min: 2, max: 6 }
    };
    return limits[provider?.toLowerCase()] || { min: 1, max: 3 };
  }

  /**
   * Generate availability zone options based on provider and region
   */
  getAvailabilityZoneOptions(provider, region) {
    if (!provider || !region) {
      return [];
    }

    const zones = [];
    
    if (provider === 'aws') {
      // AWS zones: typically a, b, c, d, e, f
      const zoneLetters = ['a', 'b', 'c', 'd', 'e', 'f'];
      zoneLetters.forEach(letter => {
        zones.push({
          value: `${region}${letter}`,
          label: `${region}${letter}`
        });
      });
    } else if (provider === 'azure') {
      // Azure zones: numeric 1, 2, 3
      [1, 2, 3].forEach(num => {
        zones.push({
          value: String(num),
          label: `Zone ${num}`
        });
      });
    } else if (provider === 'gcp') {
      // GCP zones: typically a, b, c, d, e, f
      const zoneLetters = ['a', 'b', 'c', 'd', 'e', 'f'];
      zoneLetters.forEach(letter => {
        zones.push({
          value: `${region}-${letter}`,
          label: `${region}-${letter}`
        });
      });
    }
    
    return zones;
  }

  /**
   * Get currently selected availability zones
   */
  getSelectedAvailabilityZones() {
    if (this.currentProvider === 'azure') return ['1'];
    const azSelect = document.getElementById('availability-zones-select');
    if (!azSelect) return [];
    
    // Check if Choices.js is initialized
    if (azSelect.choicesInstance) {
      return azSelect.choicesInstance.getValue(true) || [];
    }
    
    // Fallback: get from select options
    return Array.from(azSelect.selectedOptions)
      .map(option => option.value)
      .filter(value => value);
  }

  /**
   * Render availability zone select options, excluding already selected zones
   */
  renderAvailabilityZoneOptions(provider, region, selectedZone, excludeSelected = true) {
    const zones = this.getAvailabilityZoneOptions(provider, region);
    let html = '<option value="">Select availability zone</option>';
    
    // Get currently selected zones to exclude (if excludeSelected is true)
    let selectedZones = [];
    if (excludeSelected) {
      selectedZones = this.getSelectedAvailabilityZones();
    }
    
    zones.forEach(zone => {
      // Skip if zone is already selected (unless it's the current select's value)
      if (excludeSelected && selectedZones.includes(zone.value) && zone.value !== selectedZone) {
        return;
      }
      
      const selected = selectedZone === zone.value ? 'selected' : '';
      html += `<option value="${zone.value}" ${selected}>${zone.label}</option>`;
    });
    
    return html;
  }

  init() {
    // Setup navigation
    this.setupNavigation();
    this.setupContextualHelp();
    
    // Handle hash routing
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
    
    // Update progress
    if (this.currentStep > 0) {
      Utils.updateProgress(this.currentStep);
    }
    
  }


  setupNavigation() {
    // Handle all navigation links
    document.querySelectorAll('[data-navigate]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          window.location.hash = href.replace('#', '');
        }
      });
    });
  }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const route = hash.split('?')[0];
    const handler = this.routes[route] || this.routes['/'];
    
    if (handler) {
      await handler();
    }
  }

  // Route Handlers
  renderHome() {
    const content = `
      <section class="hero-section">
        <div class="container">
          <div class="row align-items-center min-vh-50">
            <div class="col-lg-6">
              <h1 class="hero-title">Deploy Databricks Infrastructure in Minutes</h1>
              <p class="hero-subtitle">
                Generate a ready-to-deploy Terraform project for AWS, Azure, or GCP
                through a simple, guided configuration flow.
              </p>
              <div class="hero-cta">
                <a href="#/select-provider" class="btn btn-primary btn-lg" data-navigate>
                  <i class="bi bi-rocket-takeoff me-2" aria-hidden="true"></i>
                  Get Started
                </a>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="hero-illustration animate-fade-up" style="animation-delay: 0.3s;">
                <div class="hero-terminal">
                  <div class="hero-terminal-header" aria-hidden="true">
                    <span class="hero-terminal-dot red"></span>
                    <span class="hero-terminal-dot yellow"></span>
                    <span class="hero-terminal-dot green"></span>
                  </div>
                  <div class="hero-terminal-body">
                    <div class="hero-code-line"><span class="prompt">$</span> <span class="command">terraform init</span></div>
                    <div class="hero-code-line"><span class="output">Initializing provider plugins...</span></div>
                    <div class="hero-code-line"><span class="success">✓ Provider configured successfully</span></div>
                    <div class="hero-code-line mt-2"><span class="prompt">$</span> <span class="command">terraform apply</span></div>
                    <div class="hero-code-line"><span class="output">Creating Databricks workspace...</span></div>
                    <div class="hero-code-line"><span class="success">✓ Apply complete! Resources created</span></div>
                  </div>
                </div>
                <div class="hero-float-element aws d-none d-lg-flex align-items-center gap-2">
                  <i class="bi bi-cloud text-warning" aria-hidden="true"></i>
                  <span class="text-sm">AWS</span>
                </div>
                <div class="hero-float-element azure d-none d-lg-flex align-items-center gap-2">
                  <i class="bi bi-cloud text-info" aria-hidden="true"></i>
                  <span class="text-sm">Azure</span>
                </div>
                <div class="hero-float-element gcp d-none d-lg-flex align-items-center gap-2">
                  <i class="bi bi-cloud text-primary-accent" aria-hidden="true"></i>
                  <span class="text-sm">GCP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    this.render(content);
    Utils.updateProgress(0);
  }

  renderProviderSelection() {
    const content = `
      <div class="container my-5 animate-fade-up">
        <div class="row">
          <div class="col-lg-10 mx-auto">
            <div class="text-center mb-5">
              <h1 class="text-gradient mb-3">Choose Your Cloud Provider</h1>
            </div>

            <div class="row g-4 mb-5 stagger-children">
              <div class="col-lg-4">
                <div class="provider-option" data-provider="aws">
                  <div class="provider-card aws h-100">
                    <div class="selection-indicator">
                      <i class="bi bi-check-lg"></i>
                    </div>
                    <div class="provider-logo">
                      <i class="bi bi-cloud-fill"></i>
                    </div>
                    <h4>Amazon Web Services</h4>
                    <p>Complete VPC management with subnets, security groups, and Back-end PrivateLink support.</p>
                    <ul class="list-unstyled text-start mb-4 text-sm">
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>VPC & Networking with security groups</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>Back-end PrivateLink (Enterprise tier)</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>Cross-Account IAM roles</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div class="col-lg-4">
                <div class="provider-option" data-provider="azure">
                  <div class="provider-card azure h-100">
                    <div class="selection-indicator">
                      <i class="bi bi-check-lg"></i>
                    </div>
                    <div class="provider-logo">
                      <i class="bi bi-microsoft"></i>
                    </div>
                    <h4>Microsoft Azure</h4>
                    <p>Virtual networks, resource groups, and Back-end Private Link with Azure AD integration.</p>
                    <ul class="list-unstyled text-start mb-4 text-sm">
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>VNet & Resource Groups</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>Back-end Private Link (Premium tier)</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>Managed Identity & Azure AD</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div class="col-lg-4">
                <div class="provider-option" data-provider="gcp">
                  <div class="provider-card gcp h-100">
                    <div class="selection-indicator">
                      <i class="bi bi-check-lg"></i>
                    </div>
                    <div class="provider-logo">
                      <i class="bi bi-google"></i>
                    </div>
                    <h4>Google Cloud Platform</h4>
                    <p>VPC with host/pods subnets for GKE and Private Service Connect support.</p>
                    <ul class="list-unstyled text-start mb-4 text-sm">
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>VPC & GKE Subnet management</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>Private Service Connect (Premium)</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>Service Accounts & IAM</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-4">
              <a href="#/" class="btn btn-outline-secondary" data-navigate>
                <i class="bi bi-arrow-left me-2"></i>
                Back to Home
              </a>
              <button type="button" class="btn btn-primary btn-lg px-4" id="continue-btn" disabled>
                Continue with Selected Provider
                <i class="bi bi-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.render(content);
    Utils.updateProgress(1);
    
    // Setup provider selection
    let selectedProvider = null;
    document.querySelectorAll('.provider-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.provider-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        option.classList.add('selected');
        selectedProvider = option.dataset.provider;
        document.getElementById('continue-btn').disabled = false;
      });
    });
    
    document.getElementById('continue-btn').addEventListener('click', () => {
      if (selectedProvider) {
        this.currentProvider = selectedProvider;
        Utils.setStorage('provider', selectedProvider);
        Utils.setStorage('step', 1);
        window.location.hash = '/configure';
      } else {
        alert('Please select a cloud provider before continuing.');
      }
    });
  }

  /**
   * Clear validation state from a field
   */
  clearFieldValidation(fieldName) {
    const field = document.querySelector(`input[name="${fieldName}"], select[name="${fieldName}"]`);
    if (field) {
      field.removeAttribute('data-invalid');
      field.removeAttribute('data-error');
      field.classList.remove('is-invalid');
      field.setCustomValidity('');
    }
  }

  /**
   * Mark a field as invalid with error message
   */
  markFieldAsInvalid(fieldName, errorMessage) {
    // Try to find input, select, or checkbox
    let field = document.querySelector(`input[name="${fieldName}"], select[name="${fieldName}"]`);
    
    // If not found and it's availability_zones, mark the select
    if (!field && fieldName === 'availability_zones') {
      const azSelect = document.getElementById('availability-zones-select');
      if (azSelect) {
        azSelect.setAttribute('data-invalid', 'true');
        azSelect.setAttribute('data-error', errorMessage);
        // Also mark the Choices.js container
        const choicesContainer = azSelect.closest('.choices');
        if (choicesContainer) {
          choicesContainer.classList.add('is-invalid');
        }
      }
      return;
    }
    
    if (field) {
      field.setAttribute('data-invalid', 'true');
      field.setAttribute('data-error', errorMessage);
      
      // For checkboxes, mark the parent label/container instead
      if (field.type === 'checkbox') {
        const label = field.closest('.form-check') || field.parentElement;
        if (label) {
          label.classList.add('is-invalid');
        }
      } else {
        field.classList.add('is-invalid');
        if (field.setCustomValidity) {
          field.setCustomValidity(errorMessage);
        }
      }
    }
  }

  /**
   * Clear all field validations
   */
  clearAllFieldValidations() {
    const form = document.getElementById('config-form');
    if (!form) return;
    
    const fields = form.querySelectorAll('input, select');
    fields.forEach(field => {
      field.removeAttribute('data-invalid');
      field.removeAttribute('data-error');
      field.classList.remove('is-invalid');
      field.setCustomValidity('');
    });
  }

  renderConfiguration() {
    if (!this.currentProvider) {
      window.location.hash = '/select-provider';
      return;
    }
    
    const providerIcon = this.currentProvider === 'aws' ? 
      '<i class="bi bi-amazon text-warning me-2" style="font-size: 2rem;"></i>' :
      this.currentProvider === 'azure' ?
      '<i class="bi bi-microsoft text-info me-2" style="font-size: 2rem;"></i>' :
      '<i class="bi bi-google text-success me-2" style="font-size: 2rem;"></i>';
    
    const providerShortName = this.currentProvider === 'aws'
      ? 'AWS'
      : this.currentProvider === 'azure'
        ? 'Azure'
        : 'GCP';
    const configurationDescription = this.currentProvider === 'aws'
      ? 'Configure workspace, VPC, NAT, and Back-end PrivateLink options for your AWS Terraform project.'
      : this.currentProvider === 'azure'
        ? 'Configure workspace, VNet, NAT, and Back-end Private Link options for your Azure Terraform project.'
        : 'Configure workspace, project, service account, and network inputs for your GCP Terraform project.';
    const vpcLabel = this.currentProvider === 'azure' ? 'VNet CIDR Block' : 'VPC CIDR Block';
    const vpcDesc = this.currentProvider === 'azure' ? 
      'CIDR block for the VNet or subnet allocation (between /16 and /24)' :
      'CIDR block for the VPC (between /8 and /24)';
    const configuredNatGatewayMode = this.currentProvider === 'azure'
      ? this.currentConfig.azure_private_link_nat_gateway_mode
      : this.currentConfig.nat_gateway_mode;
    const supportedNatGatewayModes = this.currentProvider === 'azure'
      ? ['single', 'none']
      : ['single', 'per_az', 'none'];
    const savedNatGatewayMode = supportedNatGatewayModes.includes(configuredNatGatewayMode)
      ? configuredNatGatewayMode
      : (this.currentConfig.enable_nat_gateway === false || this.currentConfig.enable_nat_gateway === 'false')
        ? 'none'
        : 'single';
    const configuredAzureNatGatewayZone = Object.prototype.hasOwnProperty.call(
      this.currentConfig,
      'azure_nat_gateway_zone'
    ) ? String(this.currentConfig.azure_nat_gateway_zone) : '1';
    const savedAzureNatGatewayZone = ['', '1', '2', '3'].includes(configuredAzureNatGatewayZone)
      ? configuredAzureNatGatewayZone
      : '1';
    const configuredAzurePrivateLinkNatGatewayZone = Object.prototype.hasOwnProperty.call(
      this.currentConfig,
      'azure_private_link_nat_gateway_zone'
    ) ? String(this.currentConfig.azure_private_link_nat_gateway_zone) : '';
    const savedAzurePrivateLinkNatGatewayZone = ['', '1', '2', '3'].includes(configuredAzurePrivateLinkNatGatewayZone)
      ? configuredAzurePrivateLinkNatGatewayZone
      : '';
    
    // Load configuration form based on provider
    const content = `
      <div class="container my-5 configuration-page">
        <div class="row">
          <div class="col-xl-8 mx-auto">
            <div class="text-center mb-5">
              <div class="provider-badge mb-3">
                ${providerIcon}
                <span class="h2 fw-bold">${providerShortName} Configuration</span>
              </div>
              <p class="lead text-muted">${configurationDescription}</p>
            </div>
            
            <form id="config-form" novalidate>
              <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-gear-fill me-2"></i>
                    Basic Configuration
                  </h5>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">
                        ${this.currentProvider === 'gcp' ? 'Workspace Name' : 'Project Prefix'}
                        <span class="text-danger">*</span>
                      </label>
                      <input type="text" class="form-control" name="project_prefix"
                             value="${this.currentConfig.project_prefix || ''}" 
                             placeholder="e.g., my-databricks-project" required>
                      <div class="form-text">${this.currentProvider === 'gcp'
                        ? 'Name for the new Databricks workspace (2-20 characters)'
                        : this.currentProvider === 'aws'
                        ? 'Prefix for all resource names (2-20 lowercase letters, numbers, hyphens, or periods). Do not use underscores; use hyphens instead.'
                        : 'Prefix for all resource names (2-20 characters, alphanumeric and hyphens only). Do not use underscores; use hyphens instead.'}</div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">
                        Region
                        <span class="text-danger">*</span>
                      </label>
                      <select class="form-select" name="region" required>
                        ${this.renderRegionOptions(this.currentProvider, this.currentConfig.region)}
                      </select>
                      <div class="form-text">Cloud provider region for resource deployment</div>
                    </div>
                    ${this.currentProvider === 'aws' ? `
                    <div class="col-md-6">
                      <div class="field-label-with-help">
                        <label class="form-label fw-semibold">
                          Databricks Pricing Tier
                          <span class="text-danger">*</span>
                        </label>
                        ${this.renderHelpButton('pricing-tier', 'Databricks pricing tier')}
                      </div>
                      <select class="form-select" name="pricing_tier" required>
                        ${this.renderPricingTierOptions(this.currentProvider, this.currentConfig.pricing_tier)}
                      </select>
                    </div>
                    ` : ''}
                    ${this.currentProvider === 'azure' ? `
                      <div class="col-md-6">
                        <label class="form-label fw-semibold">Azure Subscription ID <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="azure_subscription_id"
                               value="${this.currentConfig.azure_subscription_id || ''}"
                               placeholder="00000000-0000-0000-0000-000000000000" required>
                      </div>
                    ` : ''}
                    ${this.currentProvider === 'azure' ? `
                      <div id="azure-standard-fields" class="col-12">
                        <div class="row g-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Azure Tenant ID <span class="text-danger">*</span></label>
                            <input type="text" class="form-control azure-standard-required" name="azure_tenant_id"
                                   value="${this.currentConfig.azure_tenant_id || ''}"
                                   placeholder="00000000-0000-0000-0000-000000000000">
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Workspace Resource Group <span class="text-danger">*</span></label>
                            <input type="text" class="form-control azure-standard-required" name="resource_group_name"
                                   value="${this.currentConfig.resource_group_name || ''}"
                                   placeholder="e.g., rg-databricks-workspace">
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Workspace Admin User <span class="text-danger">*</span></label>
                            <input type="email" class="form-control azure-standard-required" name="azure_admin_user"
                                   value="${this.currentConfig.azure_admin_user || ''}"
                                   placeholder="admin@example.com">
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Workspace Root Storage Account <span class="text-danger">*</span></label>
                            <input type="text" class="form-control azure-standard-required" name="azure_root_storage_name"
                                   value="${this.currentConfig.azure_root_storage_name || ''}"
                                   placeholder="dbfsuniquename">
                            <div class="form-text">Globally unique, 3-24 lowercase letters and numbers.</div>
                          </div>
                        </div>
                      </div>
                      <div id="azure-private-link-fields" class="col-12" style="display: none;">
                        <div class="row g-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Data Plane Resource Group</label>
                            <select class="form-select" name="azure_resource_group_mode" id="azure_resource_group_mode">
                              <option value="new" ${this.currentConfig.azure_resource_group_mode !== 'existing' ? 'selected' : ''}>Create a new resource group</option>
                              <option value="existing" ${this.currentConfig.azure_resource_group_mode === 'existing' ? 'selected' : ''}>Use an existing resource group</option>
                            </select>
                            <div class="form-text">New resource group name: <code>rg-${this.currentConfig.project_prefix || '&lt;project-prefix&gt;'}-dp</code></div>
                          </div>
                          <div class="col-md-6" id="azure-existing-resource-group-field" style="display: none;">
                            <label class="form-label fw-semibold">Existing Resource Group Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="azure_existing_resource_group_name"
                                   value="${this.currentConfig.azure_existing_resource_group_name || ''}"
                                   placeholder="e.g., rg-databricks-data-plane">
                          </div>
                        </div>
                      </div>
                    ` : ''}
                    ${this.currentProvider === 'gcp' ? `
                      <div class="col-md-6">
                        <label class="form-label fw-semibold">
                          GCP Project ID
                          <span class="text-danger">*</span>
                        </label>
                        <input type="text" class="form-control" name="project_id" 
                               value="${this.currentConfig.project_id || ''}" 
                               placeholder="e.g., my-gcp-project-123" required>
                        <div class="form-text">Google Cloud Project ID for resource deployment</div>
                      </div>
                      <div class="col-md-6">
                        <div class="field-label-with-help">
                          <label class="form-label fw-semibold">Google Service Account Email <span class="text-danger">*</span></label>
                          ${this.renderHelpButton('gcp-service-account', 'Google service account')}
                        </div>
                        <input type="email" class="form-control" name="google_service_account_email"
                               value="${this.currentConfig.google_service_account_email || ''}"
                               placeholder="workspace-creator@my-project.iam.gserviceaccount.com" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label fw-semibold">Databricks Account ID <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="databricks_account_id"
                               value="${this.currentConfig.databricks_account_id || ''}"
                               placeholder="e.g., 00000000-0000-0000-0000-000000000000" required>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label fw-semibold">Workspace Admin User <span class="text-danger">*</span></label>
                        <input type="email" class="form-control" name="databricks_admin_user"
                               value="${this.currentConfig.databricks_admin_user || ''}"
                               placeholder="admin@example.com" required>
                        <div class="form-text">This user must already exist in the Databricks account.</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              <div class="card mb-4">
                <div class="card-header bg-success text-white">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-diagram-3-fill me-2"></i>
                    Network Configuration
                  </h5>
                </div>
                <div class="card-body">
                  ${this.currentProvider === 'gcp' ? `
                  <div class="alert alert-info mb-4">
                    <i class="bi bi-info-circle me-2"></i>
                    This deployment creates a new VPC, one regional subnet with Private Google Access,
                    a Cloud Router, and Cloud NAT for outbound connectivity.
                  </div>
                  <div class="mb-0">
                    <div class="field-label-with-help">
                      <label class="form-label fw-semibold" for="subnet_cidr">
                        Databricks Subnet CIDR <span class="text-danger">*</span>
                      </label>
                      ${this.renderHelpButton('subnet-sizing', 'Databricks subnet CIDR')}
                    </div>
                    <input type="text" class="form-control" id="subnet_cidr" name="subnet_cidr"
                           value="${this.currentConfig.subnet_cidr || '10.10.0.0/20'}"
                           placeholder="e.g., 10.10.0.0/20" required>
                  </div>
                  ` : `
                  <div class="mb-3">
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="create_new_vpc" name="create_new_vpc" checked>
                      <label class="form-check-label fw-semibold" for="create_new_vpc">
                        ${this.currentProvider === 'azure' ? 'Create New VNet' : 'Create New VPC'}
                      </label>
                      ${this.renderHelpButton('network-mode', this.currentProvider === 'azure' ? 'new or existing VNet' : 'new or existing VPC')}
                    </div>
                  </div>
                  ${this.currentProvider === 'azure' ? `
                  <div class="mb-3" id="azure-vnet-resource-group-field">
                    <label class="form-label fw-semibold">VNet Resource Group Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="azure_vnet_resource_group_name"
                           value="${this.currentConfig.azure_vnet_resource_group_name || ''}"
                           placeholder="e.g., rg-databricks-network">
                    <div class="form-text">Must differ from the workspace resource group.</div>
                  </div>
                  <div class="mb-3" id="azure-nat-gateway-zone-section"
                       ${this.currentConfig.enable_private_link ? 'style="display: none;"' : ''}>
                    <div class="field-label-with-help">
                      <label class="form-label fw-semibold" for="azure_nat_gateway_zone">NAT Gateway Placement</label>
                      ${this.renderHelpButton('nat-placement', 'NAT gateway placement')}
                    </div>
                    <select class="form-select" id="azure_nat_gateway_zone" name="azure_nat_gateway_zone">
                      <option value="1" ${savedAzureNatGatewayZone === '1' ? 'selected' : ''}>Availability Zone 1 (default)</option>
                      <option value="2" ${savedAzureNatGatewayZone === '2' ? 'selected' : ''}>Availability Zone 2</option>
                      <option value="3" ${savedAzureNatGatewayZone === '3' ? 'selected' : ''}>Availability Zone 3</option>
                      <option value="" ${savedAzureNatGatewayZone === '' ? 'selected' : ''}>Regional / non-zonal</option>
                    </select>
                  </div>
                  ` : ''}
                  ${this.currentProvider === 'aws' || this.currentProvider === 'azure' ? `
                  <div class="mb-3" id="nat-gateway-section"
                       ${this.currentProvider === 'azure' && !this.currentConfig.enable_private_link ? 'style="display: none;"' : ''}>
                    <div class="field-label-with-help">
                      <label class="form-label fw-semibold" for="nat_gateway_mode">NAT Gateway</label>
                      ${this.renderHelpButton('nat-gateway', 'NAT gateway options')}
                    </div>
                    <select class="form-select" id="nat_gateway_mode"
                            name="${this.currentProvider === 'azure' ? 'azure_private_link_nat_gateway_mode' : 'nat_gateway_mode'}">
                      <option value="single" ${savedNatGatewayMode === 'single' ? 'selected' : ''}>Single NAT gateway</option>
                      ${this.currentProvider === 'aws' ? `
                      <option value="per_az" ${savedNatGatewayMode === 'per_az' ? 'selected' : ''}>One NAT gateway per availability zone</option>
                      ` : ''}
                      <option value="none" ${savedNatGatewayMode === 'none' ? 'selected' : ''}>No NAT gateway</option>
                    </select>
                    ${this.currentProvider === 'azure' ? `
                    <div class="mt-3" id="azure-private-link-nat-gateway-zone-section"
                         ${savedNatGatewayMode === 'none' ? 'style="display: none;"' : ''}>
                      <div class="field-label-with-help">
                        <label class="form-label fw-semibold" for="azure_private_link_nat_gateway_zone">NAT Gateway Placement</label>
                        ${this.renderHelpButton('nat-placement', 'NAT gateway placement')}
                      </div>
                      <select class="form-select" id="azure_private_link_nat_gateway_zone" name="azure_private_link_nat_gateway_zone">
                        <option value="" ${savedAzurePrivateLinkNatGatewayZone === '' ? 'selected' : ''}>Regional / non-zonal (recommended)</option>
                        <option value="1" ${savedAzurePrivateLinkNatGatewayZone === '1' ? 'selected' : ''}>Availability Zone 1</option>
                        <option value="2" ${savedAzurePrivateLinkNatGatewayZone === '2' ? 'selected' : ''}>Availability Zone 2</option>
                        <option value="3" ${savedAzurePrivateLinkNatGatewayZone === '3' ? 'selected' : ''}>Availability Zone 3</option>
                      </select>
                    </div>
                    ` : ''}
                    <div id="nat-gateway-private-link-message" class="alert alert-warning mt-2 mb-0" style="display: none;">
                      <i class="bi bi-exclamation-triangle me-2"></i>
                      ${this.currentProvider === 'azure'
                        ? 'Without a NAT gateway, cluster nodes have no general internet egress. Ensure required traffic is covered by the configured service endpoints or routed through a firewall/NVA.'
                        : 'Back-end PrivateLink is required to communicate with the control plane when no NAT gateway is selected.'}
                    </div>
                  </div>
                  ` : ''}
                  <div class="collapse mb-3" id="existing-vpc-section" style="display: none;">
                    <div class="card border-secondary mb-3">
                      <div class="card-body">
                        <div class="row mb-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">
                              ${this.currentProvider === 'azure' ? 'Existing VNet Resource ID' : this.currentProvider === 'gcp' ? 'Existing VPC Name' : 'Existing VPC ID'}
                              <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control" name="existing_vpc_id" id="existing_vpc_id"
                                   value="${this.currentConfig.existing_vpc_id || ''}"
                                   placeholder="${this.currentProvider === 'azure' ? 'e.g., /subscriptions/.../resourceGroups/.../providers/Microsoft.Network/virtualNetworks/my-vnet' : this.currentProvider === 'gcp' ? 'e.g., my-databricks-vpc' : 'e.g., vpc-0123456789abcdef0'}">
                            <div class="form-text">${this.currentProvider === 'azure' ?
                              'Resource ID of the existing VNet' :
                              this.currentProvider === 'gcp' ? 'Name of the existing VPC network in your GCP project' :
                              'ID of the existing VPC'}</div>
                          </div>
                        </div>
                        
                        ${this.currentProvider === 'aws' ? `
                        <div id="existing-subnets-section" class="mt-3">
                          <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Requirements:</strong> Provide at least 2 existing private subnets in different Availability Zones and an existing security group.
                          </div>
                          <div id="existing-subnets-container">
                            <div class="row mb-2 existing-subnet-row">
                              <div class="col-md-10">
                                <label class="form-label">Subnet ID 1 <span class="text-danger">*</span></label>
                                <input type="text" class="form-control existing-subnet-input" name="existing_subnet_ids[]"
                                       value="${this.currentConfig.existing_subnet_ids?.[0] || ''}"
                                       placeholder="e.g., subnet-0a1b2c3d4e5f67890">
                              </div>
                            </div>
                            <div class="row mb-2 existing-subnet-row">
                              <div class="col-md-10">
                                <label class="form-label">Subnet ID 2 <span class="text-danger">*</span></label>
                                <input type="text" class="form-control existing-subnet-input" name="existing_subnet_ids[]"
                                       value="${this.currentConfig.existing_subnet_ids?.[1] || ''}"
                                       placeholder="e.g., subnet-1a2b3c4d5e6f78901">
                              </div>
                              <div class="col-md-2 d-flex align-items-end">
                                <button type="button" class="btn btn-outline-success btn-sm w-100" id="add-subnet-btn">
                                  <i class="bi bi-plus-lg"></i> Add
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div class="row mt-3">
                            <div class="col-md-6">
                              <label class="form-label fw-semibold">
                                Security Group ID
                                <span class="text-danger">*</span>
                              </label>
                              <input type="text" class="form-control" name="existing_security_group_id" id="existing_security_group_id"
                                     value="${this.currentConfig.existing_security_group_id || ''}"
                                     placeholder="e.g., sg-0123456789abcdef0">
                              <div class="form-text">Security group for Databricks workspace nodes</div>
                            </div>
                          </div>
                          <div id="existing-privatelink-endpoints-section" class="row mt-3" style="display: none;">
                            <div class="col-md-6">
                              <label class="form-label fw-semibold" for="backend_rest_aws_vpce_id">
                                REST API VPC Endpoint ID <span class="text-danger">*</span>
                              </label>
                              <input type="text" class="form-control" id="backend_rest_aws_vpce_id" name="backend_rest_aws_vpce_id"
                                     value="${this.currentConfig.backend_rest_aws_vpce_id || ''}"
                                     placeholder="e.g., vpce-0123456789abcdef0">
                            </div>
                            <div class="col-md-6">
                              <label class="form-label fw-semibold" for="backend_relay_aws_vpce_id">
                                SCC Relay VPC Endpoint ID <span class="text-danger">*</span>
                              </label>
                              <input type="text" class="form-control" id="backend_relay_aws_vpce_id" name="backend_relay_aws_vpce_id"
                                     value="${this.currentConfig.backend_relay_aws_vpce_id || ''}"
                                     placeholder="e.g., vpce-1234567890abcdef0">
                            </div>
                            <div class="form-text">Required only when Back-end PrivateLink uses an existing VPC.</div>
                          </div>
                        </div>
                        ` : ''}

                        ${this.currentProvider === 'azure' ? `
                        <div class="mb-3">
                          <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Deployment behavior:</strong> Terraform creates two delegated Databricks subnets,
                            their NSG, and a NAT gateway inside this existing VNet. Ensure the calculated CIDRs are unused.
                          </div>
                        </div>
                        ` : ''}

                        ${this.currentProvider === 'gcp' ? `
                        <div class="mb-3">
                          <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Requirements:</strong> The existing VPC must have a subnet with
                            secondary IP ranges for GKE pods and services.
                          </div>
                        </div>
                        <div class="row mb-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">
                              Existing Subnet Name <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control" name="existing_subnet_name" id="existing_subnet_name"
                                   placeholder="e.g., databricks-primary-subnet"
                                   value="${this.currentConfig.existing_subnet_name || ''}">
                            <div class="form-text">Name of the existing subnet in the VPC</div>
                          </div>
                        </div>
                        <div class="row mb-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">
                              Pod IP Range Name <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control" name="existing_pod_range_name" id="existing_pod_range_name"
                                   placeholder="e.g., pods"
                                   value="${this.currentConfig.existing_pod_range_name || ''}">
                            <div class="form-text">Name of the secondary IP range for GKE pods</div>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">
                              Service IP Range Name <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control" name="existing_service_range_name" id="existing_service_range_name"
                                   placeholder="e.g., services"
                                   value="${this.currentConfig.existing_service_range_name || ''}">
                            <div class="form-text">Name of the secondary IP range for GKE services</div>
                          </div>
                        </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">
                      ${vpcLabel}
                      <span class="text-danger">*</span>
                    </label>
                    <input type="text" class="form-control" name="vpc_cidr" 
                           value="${this.currentConfig.vpc_cidr || (this.currentProvider === 'azure' ? '10.0.0.0/20' : '10.0.0.0/22')}"
                           placeholder="e.g., ${this.currentProvider === 'azure' ? '10.0.0.0/20' : '10.0.0.0/22'}" required>
                    <div class="form-text">${vpcDesc}</div>
                  </div>
                  ${this.currentProvider !== 'azure' ? `
                  <div class="mb-3">
                    <div class="field-label-with-help">
                      <label class="form-label fw-semibold" for="availability-zones-select">
                        Availability Zones
                        <span class="text-danger">*</span>
                      </label>
                      ${this.renderHelpButton('availability-zones', 'Availability Zones')}
                    </div>
                    <select id="availability-zones-select" class="form-select" name="availability_zones" multiple required>
                      <option value="" disabled>Select availability zones</option>
                    </select>
                  </div>
                  ` : ''}
                  <div id="subnet-size-selector-container" class="mb-4" style="display: none;">
                    <div class="field-label-with-help">
                      <div class="form-label fw-semibold">
                        <i class="bi bi-sliders me-2"></i>
                        Subnet Size
                        <span class="text-muted small ms-2" id="subnet-size-info"></span>
                      </div>
                      ${this.renderHelpButton('subnet-sizing', 'subnet sizing')}
                    </div>
                    <div id="subnet-size-options" class="subnet-size-options" role="radiogroup" aria-label="Subnet size">
                      <div class="subnet-size-empty">Complete the network settings to see available subnet sizes.</div>
                    </div>
                  </div>
                  <div id="subnets-preview" class="mt-4" style="display: none;">
                    <h6 class="fw-bold text-primary mb-3">
                      <i class="bi bi-calculator me-2"></i>
                      Calculated Subnet Allocation
                    </h6>
                    <div id="subnets-container"></div>
                    <div id="network-summary" class="mt-3"></div>
                  </div>
                  `}
                </div>
              </div>
              
              ${this.currentProvider !== 'gcp' ? `
              <div class="card mb-4">
                <div class="card-header bg-warning text-dark">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-shield-check me-2"></i>
                    Security Configuration
                  </h5>
                </div>
                <div class="card-body">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="enable_private_link" name="enable_private_link"
                           ${this.currentProvider === 'aws' && (this.currentConfig.pricing_tier || 'ENTERPRISE') !== 'ENTERPRISE' ? 'disabled aria-disabled="true"' : ''}>
                    <label class="form-check-label fw-semibold" for="enable_private_link">
                      ${this.currentProvider === 'azure' ? 'Enable Back-end Private Link' :
                        this.currentProvider === 'gcp' ? 'Enable Private Service Connect' : 
                        'Enable Back-end PrivateLink'}
                    </label>
                    ${this.renderHelpButton('backend-private-link', this.currentProvider === 'azure' ? 'Back-end Private Link' : 'Back-end PrivateLink')}
                  </div>
                  <div id="private-link-warning" class="alert alert-info mt-2" style="display: none;">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>Note:</strong> Private connectivity requires 
                    ${this.currentProvider === 'aws' ? 'Enterprise' : 'Premium'} 
                    pricing tier.
                  </div>
                  
                </div>
              </div>
              ` : ''}

              ${this.currentProvider === 'aws' || this.currentProvider === 'azure' ? `
              <div class="card mb-4" id="unity-catalog-configuration"
                   ${this.currentProvider === 'azure' && this.currentConfig.enable_private_link ? 'style="display: none;"' : ''}>
                <div class="card-header bg-primary text-white">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-database-fill-gear me-2"></i>
                    Unity Catalog Configuration
                  </h5>
                </div>
                <div class="card-body">
                  <div class="row g-3 align-items-start">
                    <div class="col-md-6">
                      <div class="field-label-with-help">
                        <label class="form-label fw-semibold">Unity Catalog Metastore <span class="text-danger">*</span></label>
                        ${this.renderHelpButton('metastore', 'Unity Catalog metastore')}
                      </div>
                      <div class="form-check">
                        <input class="form-check-input" type="radio" name="metastore_mode" id="metastore_mode_create"
                               value="create" ${this.currentConfig.metastore_mode !== 'existing' ? 'checked' : ''}>
                        <label class="form-check-label" for="metastore_mode_create">Create a new metastore</label>
                      </div>
                      <div class="form-check mt-2">
                        <input class="form-check-input" type="radio" name="metastore_mode" id="metastore_mode_existing"
                               value="existing" ${this.currentConfig.metastore_mode === 'existing' ? 'checked' : ''}>
                        <label class="form-check-label" for="metastore_mode_existing">Attach an existing metastore</label>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div id="new-metastore-section">
                        <label class="form-label" for="metastore_name">Metastore Name</label>
                        <input type="text" class="form-control" id="metastore_name" name="metastore_name"
                               value="${this.currentConfig.metastore_name || ''}"
                               placeholder="Defaults to &lt;project-prefix&gt;-metastore">
                      </div>
                      <div id="existing-metastore-section" style="display: none;">
                        <label class="form-label" for="metastore_id">Existing Metastore ID <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="metastore_id" name="metastore_id"
                               value="${this.currentConfig.metastore_id || ''}"
                               placeholder="e.g., 12345678-1234-1234-1234-123456789abc">
                      </div>
                    </div>
                    ${this.currentProvider === 'azure' ? `
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">UC Storage Account <span class="text-danger">*</span></label>
                      <input type="text" class="form-control azure-standard-required" name="azure_uc_storage_account_name"
                             value="${this.currentConfig.azure_uc_storage_account_name || ''}"
                             placeholder="ucuniquename">
                      <div class="form-text">Globally unique, 3-24 lowercase letters and numbers.</div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Catalog Name <span class="text-danger">*</span></label>
                      <input type="text" class="form-control azure-standard-required" name="azure_catalog_name"
                             value="${this.currentConfig.azure_catalog_name || ''}"
                             placeholder="my_catalog">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Storage Credential Name <span class="text-danger">*</span></label>
                      <input type="text" class="form-control azure-standard-required" name="azure_storage_credential_name"
                             value="${this.currentConfig.azure_storage_credential_name || ''}"
                             placeholder="my-storage-credential">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">External Location Name <span class="text-danger">*</span></label>
                      <input type="text" class="form-control azure-standard-required" name="azure_external_location_name"
                             value="${this.currentConfig.azure_external_location_name || ''}"
                             placeholder="my-external-location">
                    </div>
                    ` : ''}
                  </div>
                </div>
              </div>
              ` : ''}
              
              <div class="d-flex justify-content-between">
                <a href="#/select-provider" class="btn btn-outline-secondary btn-lg" data-navigate>
                  <i class="bi bi-arrow-left me-2"></i>
                  Back to Provider Selection
                </a>
                <button type="submit" class="btn btn-primary btn-lg px-4" id="submit-btn">
                  Review Configuration
                  <i class="bi bi-arrow-right ms-2"></i>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    this.render(content);
    Utils.updateProgress(2);
    
    // Real-time subnet calculation function (defined early so it can be used in availability zone handlers)
    const vpcCidrInput = document.querySelector('input[name="vpc_cidr"]');
    const pricingTierSelect = document.querySelector('select[name="pricing_tier"]');
    const privateLinkCheckbox = document.getElementById('enable_private_link');
    const privateLinkWarning = document.getElementById('private-link-warning');
    const natGatewaySelect = document.getElementById('nat_gateway_mode');
    const natGatewaySection = document.getElementById('nat-gateway-section');
    const natGatewayPrivateLinkMessage = document.getElementById('nat-gateway-private-link-message');
    const azureNatGatewayZoneSection = document.getElementById('azure-nat-gateway-zone-section');
    const azurePrivateLinkNatGatewayZoneSection = document.getElementById('azure-private-link-nat-gateway-zone-section');
    
    // Subnet size selector elements
    const subnetSizeSelectorContainer = document.getElementById('subnet-size-selector-container');
    const subnetSizeOptions = document.getElementById('subnet-size-options');

    // Store the current available range and user choice.
    let currentSubnetLimits = null;
    const configuredSubnetSize = parseInt(this.currentConfig.custom_subnet_size, 10);
    let selectedSubnetSize = Number.isNaN(configuredSubnetSize) ? null : configuredSubnetSize;
    let userHasAdjustedSubnetSize = selectedSubnetSize !== null;

    const readSelectedSubnetSize = () => {
      const selectedControl = subnetSizeOptions?.querySelector(
        'input[name="custom_subnet_size"]:checked, input.subnet-size-range'
      );
      if (!selectedControl) return selectedSubnetSize;
      const value = parseInt(selectedControl.value, 10);
      return Number.isNaN(value) ? selectedSubnetSize : value;
    };

    const renderSubnetSizeOptions = (limits, selectedPrefix) => {
      if (!subnetSizeOptions) return;

      if (!limits?.valid) {
        subnetSizeOptions.className = 'subnet-size-options';
        subnetSizeOptions.setAttribute('role', 'radiogroup');
        subnetSizeOptions.innerHTML = '<div class="subnet-size-empty">No compatible subnet sizes are available for this configuration.</div>';
        return;
      }

      const prefixes = [];
      for (let prefix = limits.min; prefix <= limits.max; prefix += 1) {
        prefixes.push(prefix);
      }

      // Cards make a short list easy to scan. A slider keeps larger ranges compact.
      if (prefixes.length <= 4) {
        subnetSizeOptions.className = 'subnet-size-options';
        subnetSizeOptions.setAttribute('role', 'radiogroup');
        subnetSizeOptions.innerHTML = prefixes.map(prefix => {
          const ips = limits.getIPsForSize(prefix);
          const maxNodes = limits.getMaxNodes(prefix);
          return `
            <div class="subnet-size-choice">
              <input class="subnet-size-radio" type="radio" name="custom_subnet_size"
                     id="subnet-size-${prefix}" value="${prefix}"
                     ${prefix === selectedPrefix ? 'checked' : ''}>
              <label class="subnet-size-option" for="subnet-size-${prefix}">
                <span class="subnet-size-prefix">/${prefix}</span>
                <span class="subnet-size-capacity">${Utils.formatNumber(ips)} IPs</span>
                <span class="subnet-size-nodes">~${Utils.formatNumber(maxNodes)} max nodes</span>
              </label>
            </div>
          `;
        }).join('');
        return;
      }

      const selectedIps = limits.getIPsForSize(selectedPrefix);
      const selectedMaxNodes = limits.getMaxNodes(selectedPrefix);
      const minIps = limits.getIPsForSize(limits.min);
      const maxIps = limits.getIPsForSize(limits.max);
      subnetSizeOptions.className = 'subnet-size-range-wrapper';
      subnetSizeOptions.removeAttribute('role');
      subnetSizeOptions.innerHTML = `
        <label class="visually-hidden" for="subnet-size-range">Subnet size</label>
        <input class="subnet-size-range" type="range" id="subnet-size-range"
               name="custom_subnet_size" min="${limits.min}" max="${limits.max}"
               step="1" value="${selectedPrefix}">
        <div class="subnet-size-range-labels" aria-hidden="true">
          <span>/${limits.min} (${Utils.formatNumber(minIps)} IPs)</span>
          <span>/${limits.max} (${Utils.formatNumber(maxIps)} IPs)</span>
        </div>
        <div class="subnet-size-range-summary" aria-live="polite">
          <strong data-subnet-prefix>/${selectedPrefix}</strong>
          <span data-subnet-ips>${Utils.formatNumber(selectedIps)} IPs</span>
          <span data-subnet-nodes>~${Utils.formatNumber(selectedMaxNodes)} max nodes</span>
        </div>
      `;
    };
    
    // Function to check if "Create New VPC" is active
    const isCreateNewVpcActive = () => {
      const createNewVpcCheckbox = document.getElementById('create_new_vpc');
      return createNewVpcCheckbox?.checked !== false;
    };
    
    // Function to check if we should show subnet configuration (VPC CIDR, AZs, selector)
    const shouldShowSubnetConfig = () => {
      const createNewVpc = isCreateNewVpcActive();
      if (createNewVpc) return true;
      
      // The AWS configurations cannot create subnets inside an existing VPC.
      if (this.currentProvider === 'aws') {
        return false;
      }

      // The Azure standard source creates new workspace subnets even when it
      // reuses an existing VNet.
      if (this.currentProvider === 'azure') return true;
      
      // GCP with an existing VPC uses pre-configured subnets.
      return false;
    };
    
    // Function to update available subnet sizes based on current configuration
    const updateSubnetSizeOptions = () => {
      const vpcCidr = vpcCidrInput?.value;
      const enablePrivateLink = privateLinkCheckbox?.checked || false;
      const natGatewayChoiceApplies = this.currentProvider === 'aws' ||
        (this.currentProvider === 'azure' && enablePrivateLink);
      const enableNatGateway = !natGatewayChoiceApplies || natGatewaySelect?.value !== 'none';
      const zones = this.getSelectedAvailabilityZones();
      const showSubnetConfig = shouldShowSubnetConfig();
      
      // Azure and GCP retain their existing private-connectivity service subnet.
      const createServiceSubnet = this.currentProvider !== 'aws' && enablePrivateLink;
      
      if (!showSubnetConfig) {
        if (subnetSizeSelectorContainer) {
          subnetSizeSelectorContainer.style.display = 'none';
        }
        currentSubnetLimits = null;
        selectedSubnetSize = null;
        return;
      }

      if (subnetSizeSelectorContainer) {
        subnetSizeSelectorContainer.style.display = 'block';
      }

      if (!vpcCidr || zones.length === 0) {
        if (subnetSizeOptions) {
          subnetSizeOptions.className = 'subnet-size-options';
          subnetSizeOptions.setAttribute('role', 'radiogroup');
          subnetSizeOptions.innerHTML = '<div class="subnet-size-empty">Complete the VPC CIDR and Availability Zones to see available sizes.</div>';
        }
        currentSubnetLimits = null;
        selectedSubnetSize = null;
        return;
      }
      
      try {
        const networkCalc = new NetworkCalculator(this.currentProvider);
        const limits = networkCalc.calculateSubnetSizeLimits(
          vpcCidr,
          zones.length,
          enablePrivateLink,
          createServiceSubnet,
          enableNatGateway
        );
        
        if (limits.error || !limits.valid) {
          currentSubnetLimits = null;
          selectedSubnetSize = null;
          renderSubnetSizeOptions(null, null);
          return;
        }

        const previousValue = readSelectedSubnetSize();
        const hadCurrentLimits = currentSubnetLimits !== null;
        // Check if limits have changed
        const limitsChanged = !currentSubnetLimits ||
                              currentSubnetLimits.min !== limits.min ||
                              currentSubnetLimits.max !== limits.max;
        
        // If limits changed, reset the user adjustment flag
        if (limitsChanged && hadCurrentLimits) {
          userHasAdjustedSubnetSize = false;
        }
        
        currentSubnetLimits = limits;
        selectedSubnetSize = userHasAdjustedSubnetSize && (!limitsChanged || !hadCurrentLimits) && previousValue !== null
          ? Math.max(limits.min, Math.min(limits.max, previousValue))
          : limits.default;
        renderSubnetSizeOptions(limits, selectedSubnetSize);
      } catch (err) {
        console.error('Error calculating subnet limits:', err);
        currentSubnetLimits = null;
        selectedSubnetSize = null;
        renderSubnetSizeOptions(null, null);
      }
    };

    if (subnetSizeOptions) {
      subnetSizeOptions.addEventListener('input', (event) => {
        if (!event.target?.classList.contains('subnet-size-range') || !currentSubnetLimits?.valid) return;
        const prefix = parseInt(event.target.value, 10);
        selectedSubnetSize = prefix;
        subnetSizeOptions.querySelector('[data-subnet-prefix]').textContent = `/${prefix}`;
        subnetSizeOptions.querySelector('[data-subnet-ips]').textContent = `${Utils.formatNumber(currentSubnetLimits.getIPsForSize(prefix))} IPs`;
        subnetSizeOptions.querySelector('[data-subnet-nodes]').textContent = `~${Utils.formatNumber(currentSubnetLimits.getMaxNodes(prefix))} max nodes`;
      });

      subnetSizeOptions.addEventListener('change', (event) => {
        if (event.target?.name !== 'custom_subnet_size') return;
        selectedSubnetSize = parseInt(event.target.value, 10);
        userHasAdjustedSubnetSize = true;
        if (typeof calculateSubnets === 'function') {
          calculateSubnets();
        }
      });
    }
    
    const calculateSubnets = Utils.debounce(() => {
      const vpcCidr = vpcCidrInput?.value;
      const pricingTier = this.currentProvider === 'azure' ? 'PREMIUM' : pricingTierSelect?.value;
      const enablePrivateLink = privateLinkCheckbox?.checked || false;
      const enableNatGateway = this.currentProvider !== 'aws' || natGatewaySelect?.value !== 'none';
      const zones = this.getSelectedAvailabilityZones();
      const showSubnetConfig = shouldShowSubnetConfig();
      
      // Azure and GCP retain their existing private-connectivity service subnet.
      const createServiceSubnet = this.currentProvider !== 'aws' && enablePrivateLink;
      
      // Update available subnet sizes first
      updateSubnetSizeOptions();
      
      const preview = document.getElementById('subnets-preview');
      const container = document.getElementById('subnets-container');
      const summaryContainer = document.getElementById('network-summary');
      
      // Hide if subnet configuration is not needed (e.g., using existing subnets)
      if (!showSubnetConfig) {
        if (preview) preview.style.display = 'none';
        return;
      }
      
      // Always show preview when subnet configuration is needed
      if (preview) preview.style.display = 'block';
      
      // If missing required data, show placeholder message
      if (!vpcCidr || zones.length === 0 || !pricingTier) {
        const missingFields = [];
        if (!vpcCidr) missingFields.push('VPC CIDR');
        if (zones.length === 0) missingFields.push('Availability Zones');
        if (!pricingTier) missingFields.push('Pricing Tier');
        
        if (container) {
          container.innerHTML = `
            <div class="alert alert-secondary">
              <i class="bi bi-info-circle me-2"></i>
              Complete the following fields to see subnet allocation: <strong>${missingFields.join(', ')}</strong>
            </div>
          `;
        }
        if (summaryContainer) {
          summaryContainer.innerHTML = '';
        }
        return;
      }
      
      try {
        const networkCalc = new NetworkCalculator(this.currentProvider);
        
        const customSubnetSize = currentSubnetLimits?.valid ? selectedSubnetSize : null;
        
        const subnets = networkCalc.allocateSubnets(
          vpcCidr,
          zones,
          pricingTier,
          enablePrivateLink,
          customSubnetSize,
          createServiceSubnet,
          enableNatGateway
        );
        const summary = networkCalc.calculateNetworkSummary(vpcCidr, subnets);
        
        // Validate allocation fits in VPC
        const validation = networkCalc.validateSubnetAllocation(vpcCidr, subnets);
        
        // Display subnets
        if (container && preview) {
          
          // Show validation warning if subnets don't fit
          let validationWarning = '';
          if (!validation.valid) {
            validationWarning = `
              <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Warning:</strong> ${validation.message}. Consider using smaller subnets or a larger VPC CIDR.
              </div>
            `;
          }
          
          container.innerHTML = validationWarning + '<div class="row g-3">' + subnets.map(subnet => `
            <div class="col-md-6">
              <div class="card subnet-card h-100">
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">${subnet.name}</h6>
                    <span class="badge bg-${subnet.subnet_type === 'private' ? 'primary' : subnet.subnet_type === 'public' ? 'success' : 'warning'} subnet-type">${subnet.subnet_type}</span>
                  </div>
                  <div class="text-muted small">
                    <div><strong>CIDR:</strong> ${subnet.cidr}</div>
                    <div><strong>Size:</strong> /${subnet.size}</div>
                    ${this.currentProvider === 'azure' ? '' : `<div><strong>Zone:</strong> ${subnet.availability_zone}</div>`}
                  </div>
                </div>
              </div>
            </div>
          `).join('') + '</div>';
          
          // Display summary
          const summaryContainer = document.getElementById('network-summary');
          if (summaryContainer && summary && !summary.error) {
            summaryContainer.innerHTML = `
              <div class="card">
                <div class="card-body">
                  <h6 class="card-title mb-3">Network Utilization Summary</h6>
                  <div class="row text-center">
                    <div class="col-3">
                      <div class="h6 text-primary mb-1">${Utils.formatNumber(summary.total_ips)}</div>
                      <div class="small text-muted">Total IPs</div>
                    </div>
                    <div class="col-3">
                      <div class="h6 text-success mb-1">${Utils.formatNumber(summary.used_ips)}</div>
                      <div class="small text-muted">Used IPs</div>
                    </div>
                    <div class="col-3">
                      <div class="h6 text-warning mb-1">${Utils.formatNumber(summary.available_ips)}</div>
                      <div class="small text-muted">Available IPs</div>
                    </div>
                    <div class="col-3">
                      <div class="h6 text-info mb-1" id="network-utilization-percent">${summary.utilization_percent}%</div>
                      <div class="small text-muted">Utilization</div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
        }
      } catch (err) {
        console.error('Error calculating subnets:', err);
      }
    }, 500);
    
    // Store calculateSubnets for use in handlers
    this.calculateSubnets = calculateSubnets;
    
    // Initialize availability zones - using Choices.js
    const azSelect = document.getElementById('availability-zones-select');
    const regionSelect = document.querySelector('select[name="region"]');
    // Get current region from config, or from select if not in config (since select now defaults to first item)
    let currentRegion = this.currentConfig.region || (regionSelect ? regionSelect.value : '');
    let choicesInstance = null;
    let pendingInitTimeout = null; // Track pending initialization timeout
    
    // Function to update availability zone options
    // forceRecreate = true when region changes to ensure dropdown is fully refreshed
    const updateAvailabilityZoneOptions = (forceRecreate = false) => {
      if (!azSelect) return;
      
      // ALWAYS destroy existing Choices.js instance first - this is critical for region changes
      // Destroy all possible references to Choices.js
      const destroyChoicesCompletely = () => {
        // Destroy the local instance
        if (choicesInstance) {
          try {
            choicesInstance.clearStore();
            choicesInstance.setValue([]);
            choicesInstance.destroy();
          } catch (e) {
            console.warn('Error destroying local choicesInstance:', e);
          }
          choicesInstance = null;
        }
        
        // Destroy the instance stored on the select element
        if (azSelect.choicesInstance) {
          try {
            azSelect.choicesInstance.clearStore();
            azSelect.choicesInstance.setValue([]);
            azSelect.choicesInstance.destroy();
          } catch (e) {
            console.warn('Error destroying azSelect.choicesInstance:', e);
          }
          azSelect.choicesInstance = null;
        }
        
        // Remove Choices.js wrapper from DOM if it exists
        const wrapper = azSelect.closest('.choices');
        if (wrapper && wrapper !== azSelect) {
          const parent = wrapper.parentElement;
          if (parent) {
            // Move select out of wrapper before removing
            parent.insertBefore(azSelect, wrapper);
            wrapper.remove();
          }
        }
        
        // Also check for any orphaned Choices wrappers
        const allWrappers = document.querySelectorAll('.choices:has(#availability-zones-select)');
        allWrappers.forEach(w => {
          if (w !== azSelect && w.contains(azSelect)) {
            const p = w.parentElement;
            if (p) {
              p.insertBefore(azSelect, w);
              w.remove();
            }
          }
        });
      };
      
      // Always destroy first when forceRecreate is true (region change)
      if (forceRecreate) {
        destroyChoicesCompletely();
      }
      
      const zones = this.getAvailabilityZoneOptions(this.currentProvider, currentRegion);
      
      // Safety check: ensure zones is an array
      if (!zones || !Array.isArray(zones) || zones.length === 0) {
        console.warn(`No availability zones found for provider ${this.currentProvider} and region ${currentRegion}`);
        destroyChoicesCompletely();
        azSelect.innerHTML = '<option value="" disabled>No availability zones available</option>';
        return;
      }
      
      // Always destroy existing Choices.js before recreating
      destroyChoicesCompletely();
      
      // NOW: Clear existing options and add new ones
      azSelect.innerHTML = '<option value="" disabled>Select availability zones</option>';
      
      // Add zone options
      zones.forEach(zone => {
        const option = document.createElement('option');
        option.value = zone.value;
        option.textContent = zone.label;
        azSelect.appendChild(option);
      });
      
      // Verify all options were added
      const optionCount = azSelect.options.length - 1; // -1 for placeholder
      if (optionCount !== zones.length) {
        console.error(`Failed to add all options: expected ${zones.length}, found ${optionCount}. Re-adding...`);
        zones.forEach(zone => {
          if (!Array.from(azSelect.options).some(opt => opt.value === zone.value)) {
            const option = document.createElement('option');
            option.value = zone.value;
            option.textContent = zone.label;
            azSelect.appendChild(option);
          }
        });
      }
      
      // Cancel any pending initialization timeout
      if (pendingInitTimeout) {
        clearTimeout(pendingInitTimeout);
        pendingInitTimeout = null;
      }
      
      // Store the region for this initialization to detect stale callbacks
      const initRegion = currentRegion;
      const initZones = [...zones]; // Copy zones array to avoid closure issues
      
      // Wait for DOM to be updated before initializing Choices.js
      // Use a small timeout to ensure DOM is fully updated
      pendingInitTimeout = setTimeout(() => {
        pendingInitTimeout = null;
        
        // CRITICAL: Check if region has changed since we started
        // If so, abort this initialization - a newer one will be triggered
        if (currentRegion !== initRegion) {
          console.log(`Region changed from ${initRegion} to ${currentRegion}, aborting stale initialization`);
          return;
        }
        
        // Initialize Choices.js (wait for it to be available)
        const initChoices = () => {
          // Re-check region hasn't changed
          if (currentRegion !== initRegion) {
            console.log(`Region changed during init, aborting`);
            return;
          }
          
          if (typeof Choices === 'undefined') {
            // Wait a bit and try again
            setTimeout(initChoices, 100);
            return;
          }
          
          // CRITICAL: Verify select element still exists and is in the DOM
          if (!azSelect || !azSelect.parentElement) {
            console.error('Select element not found or removed from DOM');
            return;
          }
          
          // Double-check that all options are still in the select before initializing Choices.js
          const currentOptions = Array.from(azSelect.options).filter(opt => opt.value && opt.value !== '');
          const currentOptionValues = currentOptions.map(opt => opt.value);
          const expectedZoneValues = initZones.map(z => z.value);
          
          // Check if all expected options are present
          const missingOptions = expectedZoneValues.filter(val => !currentOptionValues.includes(val));
          
          if (currentOptions.length !== initZones.length || missingOptions.length > 0) {
            
            // Clear and re-add all options
            azSelect.innerHTML = '<option value="" disabled>Select availability zones</option>';
            initZones.forEach(zone => {
              const option = document.createElement('option');
              option.value = zone.value;
              option.textContent = zone.label;
              azSelect.appendChild(option);
            });
            
            // Verify again after re-adding
            const verifyOptions = Array.from(azSelect.options).filter(opt => opt.value && opt.value !== '');
            if (verifyOptions.length !== initZones.length) {
              console.error(`Failed to add all options after retry. Expected ${initZones.length}, got ${verifyOptions.length}`);
              return;
            }
            
            // Try again after re-adding with a small delay
            setTimeout(() => {
              initChoices();
            }, 50);
            return;
          }
        
        // Now Choices.js is available
        const limits = this.getAvailabilityZoneLimits(this.currentProvider);
        const defaultZones = this.currentConfig.availability_zones || [];
        
        // Set default zones if available
        // IMPORTANT: Only use defaultZones if they actually belong to the current region
        let initialValues = [];
        
        // First, filter defaultZones to only include zones that exist in current region's options
        const validDefaultZones = defaultZones.filter(z => initZones.some(az => az.value === z));
        
        // Only use stored zones if they're valid for current region AND region hasn't changed
        // If region changed, defaultZones will be empty (cleared in region change handler)
        if (validDefaultZones.length > 0 && currentRegion === (this.currentConfig.region || '')) {
          initialValues = validDefaultZones;
        } else if (currentRegion) {
          // Set default zones based on provider and region (respecting minimum)
          let defaultZoneValues = [];
          if (this.currentProvider === 'aws') {
            defaultZoneValues = [`${currentRegion}a`, `${currentRegion}b`];
          } else if (this.currentProvider === 'azure') {
            defaultZoneValues = ['1', '2'];
          } else if (this.currentProvider === 'gcp') {
            defaultZoneValues = [`${currentRegion}-a`, `${currentRegion}-b`];
          }
          
          // Ensure we have at least the minimum
          while (defaultZoneValues.length < limits.min) {
            if (this.currentProvider === 'aws' && currentRegion) {
              defaultZoneValues.push(`${currentRegion}${String.fromCharCode(97 + defaultZoneValues.length)}`);
            } else if (this.currentProvider === 'azure') {
              defaultZoneValues.push(String(defaultZoneValues.length + 1));
            } else if (this.currentProvider === 'gcp' && currentRegion) {
              defaultZoneValues.push(`${currentRegion}-${String.fromCharCode(97 + defaultZoneValues.length)}`);
            } else {
              break;
            }
          }
          
          // Filter to only include zones that exist in available options
          initialValues = defaultZoneValues.filter(z => initZones.some(az => az.value === z));
        }
        
        // CRITICAL: Final verification before initializing Choices.js
        // Ensure select element exists and is in DOM
        if (!azSelect || !azSelect.parentElement) {
          console.error('Cannot initialize Choices.js: select element not in DOM');
          return;
        }
        
        // Verify all options are present before initializing
        const finalOptions = Array.from(azSelect.options).filter(opt => opt.value && opt.value !== '');
        const finalOptionValues = finalOptions.map(opt => opt.value);
        const expectedValues = initZones.map(z => z.value);
        
        // Check if we have the correct number of options
        if (finalOptions.length !== initZones.length) {
          console.error(`Cannot initialize Choices.js: Expected ${initZones.length} options, but found ${finalOptions.length} in select`);
          
          // Try one more time to fix it
          azSelect.innerHTML = '<option value="" disabled>Select availability zones</option>';
          initZones.forEach(zone => {
            const option = document.createElement('option');
            option.value = zone.value;
            option.textContent = zone.label;
            azSelect.appendChild(option);
          });
          
          // Wait a bit and retry
          setTimeout(() => {
            if (currentRegion !== initRegion) return; // Abort if region changed
            const retryOptions = Array.from(azSelect.options).filter(opt => opt.value && opt.value !== '');
            if (retryOptions.length === initZones.length) {
              initChoices();
            }
          }, 100);
          return;
        }
        
        // Double-check: ensure no old zone values are present
        const validZoneValues = initZones.map(z => z.value);
        const invalidOptions = finalOptionValues.filter(val => !validZoneValues.includes(val));
        if (invalidOptions.length > 0) {
          console.warn(`Found invalid options in select: ${invalidOptions.join(', ')}. Removing...`);
          invalidOptions.forEach(invalidVal => {
            const invalidOption = azSelect.querySelector(`option[value="${invalidVal}"]`);
            if (invalidOption) {
              invalidOption.remove();
            }
          });
          // Re-check after removal
          const updatedOptions = Array.from(azSelect.options).filter(opt => opt.value && opt.value !== '');
          const missingValues = expectedValues.filter(val => !updatedOptions.some(opt => opt.value === val));
          if (missingValues.length > 0) {
            missingValues.forEach(val => {
              const zone = initZones.find(z => z.value === val);
              if (zone) {
                const option = document.createElement('option');
                option.value = zone.value;
                option.textContent = zone.label;
                azSelect.appendChild(option);
              }
            });
          }
        }
        
        // Final check before initializing
        const preInitOptions = Array.from(azSelect.options).filter(opt => opt.value && opt.value !== '');
        if (preInitOptions.length !== initZones.length) {
          // Re-add options immediately
          azSelect.innerHTML = '<option value="" disabled>Select availability zones</option>';
          initZones.forEach(zone => {
            const option = document.createElement('option');
            option.value = zone.value;
            option.textContent = zone.label;
            azSelect.appendChild(option);
          });
          // Wait a bit and retry
          setTimeout(() => {
            if (currentRegion !== initRegion) return;
            initChoices();
          }, 100);
          return;
        }
        
        try {
          
          // Store options data before Choices.js potentially modifies the select
          // All options start as unselected - we'll use setValue() after initialization
          const optionsData = Array.from(azSelect.options)
            .filter(opt => opt.value && opt.value !== '')
            .map(opt => ({
              value: opt.value,
              label: opt.textContent,
              selected: false,
              disabled: false
            }));
          
          // Create Choices.js with proper configuration
          try {
            choicesInstance = new Choices(azSelect, {
              removeItemButton: true,
              searchEnabled: true,
              searchChoices: true,
              searchFields: ['label', 'value'],
              placeholder: true,
              placeholderValue: 'Type to search availability zones...',
              searchPlaceholderValue: 'Type to search...',
              maxItemText: (maxItemCount) => {
                return `Maximum ${limits.max} availability zone(s) allowed`;
              },
              addItemText: (value) => {
                return `Press Enter to add <b>"${value}"</b>`;
              },
              maxItemCount: limits.max,
              duplicateItemsAllowed: false,
              shouldSort: false,
              allowHTML: true,
              // CRITICAL: This ensures selected items are NOT shown in dropdown
              renderSelectedChoices: 'auto',
              classNames: {
                containerOuter: 'choices form-select',
                containerInner: 'choices__inner',
                input: 'choices__input',
                inputCloned: 'choices__input--cloned',
                list: 'choices__list',
                listItems: 'choices__list--multiple',
                listSingle: 'choices__list--single',
                listDropdown: 'choices__list--dropdown',
                item: 'choices__item',
                itemSelectable: 'choices__item--selectable',
                itemDisabled: 'choices__item--disabled',
                itemChoice: 'choices__item--choice',
                placeholder: 'choices__placeholder',
                group: 'choices__group',
                groupHeading: 'choices__heading',
                button: 'choices__button',
                activeState: 'is-active',
                focusState: 'is-focused',
                openState: 'is-open',
                disabledState: 'is-disabled',
                highlightedState: 'is-highlighted',
                selectedState: 'is-selected',
                flippedState: 'is-flipped',
                loadingState: 'is-loading',
                noResults: 'has-no-results',
                noChoices: 'has-no-choices'
              }
            });
            
            // Always use setChoices to ensure options are set correctly
            if (optionsData.length > 0) {
              try {
                // Use setChoices to set options with correct selected state
                // The 4th param (true) replaces existing choices
                choicesInstance.setChoices(optionsData, 'value', 'label', true);
                
                // Wait a bit and verify choices were loaded
                setTimeout(() => {
                  const checkChoices2 = choicesInstance._store ? choicesInstance._store.choices : [];
                  
                  // Count unique choices (selected items might be duplicated)
                  const uniqueChoices = new Set(checkChoices2.map(c => c.value || c.id));
                  const finalChoicesCount = uniqueChoices.size;
                  
                  if (finalChoicesCount === initZones.length) {
                    setupChoicesComplete();
                  } else {
                    // Last resort: Try to manually add choices to the store
                    if (choicesInstance._store) {
                      try {
                        choicesInstance._store.choices = optionsData.map(opt => ({
                          id: opt.value,
                          value: opt.value,
                          label: opt.label,
                          customProperties: {},
                          active: false,
                          disabled: opt.disabled || false,
                          highlighted: false,
                          placeholder: false,
                          selected: opt.selected || false // Preserve selected state
                        }));
                        
                        // Trigger a render
                        if (typeof choicesInstance._render === 'function') {
                          choicesInstance._render();
                        }
                        
                        setTimeout(() => {
                          setupChoicesComplete();
                        }, 100);
                      } catch (manualError) {
                        setupChoicesComplete(); // Continue anyway
                      }
                    } else {
                      setupChoicesComplete(); // Continue anyway
                    }
                  }
                }, 200);
              } catch (setChoicesError) {
                setupChoicesComplete(); // Try to continue anyway
              }
            } else {
              setupChoicesComplete(); // Try to continue anyway
            }
          } catch (initError) {
            choicesInstance = null;
          }
          
          // Function to complete setup after Choices.js is initialized
          const setupChoicesComplete = () => {
            if (!choicesInstance) return;
            
            // Check if region changed during initialization - abort if so
            if (currentRegion !== initRegion) {
              console.log('Region changed during setup, aborting setupChoicesComplete');
              return;
            }
            
            // Set initial values - filter to only include valid zones for current region
            const finalOptionValues = initZones.map(z => z.value);
            const validInitialValues = initialValues.filter(val => finalOptionValues.includes(val));
            
            // Always set the initial values using setValue with proper format
            if (validInitialValues.length > 0) {
              // Convert to Choices.js item format
              const itemsToSet = validInitialValues.map(val => {
                const zone = initZones.find(z => z.value === val);
                return {
                  value: val,
                  label: zone ? zone.label : val
                };
              });
              choicesInstance.setValue(itemsToSet);
            }
            
            // Store choices instance for later use
            azSelect.choicesInstance = choicesInstance;
            
            // Add event listeners for validation and subnet recalculation
            const appInstance = this;
            
            // Listen to Choices.js events (only add once)
            if (!azSelect.hasChoicesListeners) {
              azSelect.addEventListener('change', function() {
                if (!choicesInstance) return;
                const selectedValues = choicesInstance.getValue(true) || [];
                const limits = appInstance.getAvailabilityZoneLimits(appInstance.currentProvider);
                
                // Validate minimum
                if (selectedValues.length < limits.min) {
                  Utils.showFlashMessage(
                    `At least ${limits.min} availability zone(s) required for ${appInstance.currentProvider.toUpperCase()}.`, 
                    'warning'
                  );
                }
                
                // Trigger subnet recalculation
                if (appInstance.calculateSubnets) {
                  appInstance.calculateSubnets();
                } else if (typeof calculateSubnets === 'function') {
                  calculateSubnets();
                }
              });
              
              // Use Choices.js event system
              const container = azSelect.closest('.choices') || document.querySelector('.choices');
              if (container) {
                // Helper function to sync dropdown visibility with selected items
                const syncDropdownVisibility = () => {
                  if (!choicesInstance) return;
                  const selectedValues = choicesInstance.getValue(true) || [];
                  const dropdown = container.querySelector('.choices__list--dropdown');
                  if (dropdown) {
                    // Hide selected items from dropdown
                    const dropdownItems = dropdown.querySelectorAll('.choices__item--choice');
                    dropdownItems.forEach(item => {
                      const itemValue = item.getAttribute('data-value');
                      if (selectedValues.includes(itemValue)) {
                        item.style.display = 'none';
                      } else {
                        item.style.display = '';
                      }
                    });
                  }
                };
                
                container.addEventListener('addItem', function() {
                  // Trigger subnet recalculation when AZ is added
                  if (appInstance.calculateSubnets) {
                    appInstance.calculateSubnets();
                  } else if (typeof calculateSubnets === 'function') {
                    calculateSubnets();
                  }
                  // Sync visibility after item added
                  setTimeout(syncDropdownVisibility, 10);
                });
                
                container.addEventListener('removeItem', function() {
                  // Trigger subnet recalculation when AZ is removed
                  if (appInstance.calculateSubnets) {
                    appInstance.calculateSubnets();
                  } else if (typeof calculateSubnets === 'function') {
                    calculateSubnets();
                  }
                  // Sync visibility after item removed
                  setTimeout(syncDropdownVisibility, 10);
                });
                
                // Also sync when dropdown is shown
                container.addEventListener('showDropdown', syncDropdownVisibility);
                
                // Ensure dropdown appears above all sections when opened
                // Use MutationObserver to detect when dropdown opens
                const observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                      const target = mutation.target;
                      if (target.classList.contains('is-open')) {
                        // Dropdown is now open - ensure it can overflow all sections
                        const dropdown = container.querySelector('.choices__list--dropdown');
                        if (dropdown) {
                          // Force high z-index and ensure visibility
                          dropdown.style.zIndex = '99999';
                          dropdown.style.position = 'absolute';
                          
                          // Ensure all parent containers allow overflow
                          let parent = dropdown.parentElement;
                          while (parent && parent !== document.body) {
                            const computedStyle = window.getComputedStyle(parent);
                            if (computedStyle.overflow === 'hidden' || computedStyle.overflow === 'auto' || computedStyle.overflow === 'scroll') {
                              parent.style.setProperty('overflow', 'visible', 'important');
                            }
                            parent = parent.parentElement;
                          }
                          
                          // Also check all ancestors up to body
                          let ancestor = container.parentElement;
                          while (ancestor && ancestor !== document.body) {
                            const ancestorStyle = window.getComputedStyle(ancestor);
                            if (ancestorStyle.overflow === 'hidden' || ancestorStyle.overflow === 'auto' || ancestorStyle.overflow === 'scroll') {
                              ancestor.style.setProperty('overflow', 'visible', 'important');
                            }
                            ancestor = ancestor.parentElement;
                          }
                        }
                      }
                    }
                  });
                });
                
                // Observe the container for class changes
                observer.observe(container, {
                  attributes: true,
                  attributeFilter: ['class']
                });
              }
              
              azSelect.hasChoicesListeners = true;
            }
            
          };
        } catch (initError) {
          choicesInstance = null;
          return;
        }
        };
        
        initChoices();
      });
    };
    
    // Initialize availability zone select
    if (azSelect) {
      updateAvailabilityZoneOptions();
      
      // Update when region changes
      if (regionSelect) {
        const appInstance = this;
        regionSelect.addEventListener('change', function() {
          const newRegion = this.value;
          if (newRegion) {
            currentRegion = newRegion;
            
            // Clear selections when region changes (zones are region-specific)
            // First, clear the stored config to prevent old zones from being reapplied
            if (appInstance.currentConfig) {
              appInstance.currentConfig.availability_zones = [];
              appInstance.currentConfig.region = newRegion; // Update region in config
              Utils.setStorage('config', appInstance.currentConfig); // Persist the change
            }
            
            // Update availability zone options with forceRecreate = true
            // This ensures the dropdown is completely refreshed with new region's AZs
            updateAvailabilityZoneOptions(true);
            
            // Trigger subnet recalculation if available
            setTimeout(() => {
              if (typeof appInstance.calculateSubnets === 'function') {
                appInstance.calculateSubnets();
              }
            }, 150);
          }
        });
      }
    }
    
    // Setup create_new_vpc toggle
    const createNewVpcCheckbox = document.getElementById('create_new_vpc');
    const existingVpcSection = document.getElementById('existing-vpc-section');
    const existingSubnetsSection = document.getElementById('existing-subnets-section');
    const existingPrivatelinkEndpointsSection = document.getElementById('existing-privatelink-endpoints-section');
    const vpcCidrContainer = document.querySelector('input[name="vpc_cidr"]')?.closest('.mb-3');
    const azContainer = document.querySelector('#availability-zones-select')?.closest('.mb-3');
    const azureVnetResourceGroupField = document.getElementById('azure-vnet-resource-group-field');
    const azureVnetResourceGroupInput = document.querySelector('input[name="azure_vnet_resource_group_name"]');
    
    // Helper function to update UI based on VPC mode
    const updateNetworkConfigUI = () => {
      const isCreateNewVpc = createNewVpcCheckbox?.checked !== false;
      const azurePrivateLink = this.currentProvider === 'azure' && privateLinkCheckbox?.checked === true;
      
      if (isCreateNewVpc) {
        // Creating new VPC - show VPC CIDR, AZs, and subnet-size options
        if (existingVpcSection) existingVpcSection.style.display = 'none';
        if (vpcCidrContainer) vpcCidrContainer.style.display = 'block';
        if (azContainer) azContainer.style.display = 'block';
        if (natGatewaySection) {
          natGatewaySection.style.display = this.currentProvider === 'aws' || azurePrivateLink ? 'block' : 'none';
        }
      } else {
        // Using existing VPC
        if (existingVpcSection) existingVpcSection.style.display = 'block';
        
        if (this.currentProvider === 'aws') {
          if (vpcCidrContainer) vpcCidrContainer.style.display = 'none';
          if (azContainer) azContainer.style.display = 'none';
          if (existingSubnetsSection) existingSubnetsSection.style.display = 'block';
          if (natGatewaySection) natGatewaySection.style.display = 'none';
        } else if (this.currentProvider === 'azure') {
          // The Azure standard source creates the workspace subnets in the existing VNet.
          if (vpcCidrContainer) vpcCidrContainer.style.display = 'block';
          if (azContainer) azContainer.style.display = 'none';
          if (natGatewaySection) natGatewaySection.style.display = 'none';
        } else {
          if (vpcCidrContainer) vpcCidrContainer.style.display = 'none';
          if (azContainer) azContainer.style.display = 'none';
        }
      }

      if (azureVnetResourceGroupField) {
        azureVnetResourceGroupField.style.display = !azurePrivateLink && isCreateNewVpc ? 'block' : 'none';
      }

      if (natGatewayPrivateLinkMessage) {
        const noAwsNat = this.currentProvider === 'aws' && isCreateNewVpc && natGatewaySelect?.value === 'none';
        const noAzurePrivateLinkNat = azurePrivateLink && natGatewaySelect?.value === 'none';
        natGatewayPrivateLinkMessage.style.display = noAwsNat || noAzurePrivateLinkNat ? 'block' : 'none';
      }

      if (azurePrivateLinkNatGatewayZoneSection) {
        const showPlacement = azurePrivateLink && natGatewaySelect?.value !== 'none';
        azurePrivateLinkNatGatewayZoneSection.style.display = showPlacement ? 'block' : 'none';
      }
      
      // Toggle required attributes based on what's visible
      const vpcCidrInput = document.querySelector('input[name="vpc_cidr"]');
      const existingVpcIdInput = document.getElementById('existing_vpc_id');
      const azSelect = document.getElementById('availability-zones-select');
      const awsExistingInputs = document.querySelectorAll('#existing-subnets-section input');
      const restEndpointInput = document.getElementById('backend_rest_aws_vpce_id');
      const relayEndpointInput = document.getElementById('backend_relay_aws_vpce_id');

      if (isCreateNewVpc) {
        // Creating new VPC — VPC CIDR required, existing fields not required
        if (vpcCidrInput) vpcCidrInput.setAttribute('required', '');
        if (azSelect) azSelect.setAttribute('required', '');
        if (existingVpcIdInput) existingVpcIdInput.removeAttribute('required');
        document.querySelectorAll('#existing-vpc-section input').forEach(el => el.removeAttribute('required'));
        if (existingPrivatelinkEndpointsSection) existingPrivatelinkEndpointsSection.style.display = 'none';
      } else {
        // Using existing VPC/VNet — existing ID required, VPC CIDR depends on provider
        if (existingVpcIdInput) existingVpcIdInput.setAttribute('required', '');

        if (this.currentProvider === 'aws') {
          if (vpcCidrInput) vpcCidrInput.removeAttribute('required');
          if (azSelect) azSelect.removeAttribute('required');
          awsExistingInputs.forEach(input => input.setAttribute('required', ''));
          const needsEndpoints = privateLinkCheckbox?.checked === true;
          if (existingPrivatelinkEndpointsSection) {
            existingPrivatelinkEndpointsSection.style.display = needsEndpoints ? 'flex' : 'none';
          }
          for (const input of [restEndpointInput, relayEndpointInput]) {
            if (!input) continue;
            if (needsEndpoints) input.setAttribute('required', '');
            else input.removeAttribute('required');
          }
        } else if (this.currentProvider === 'azure') {
          if (vpcCidrInput) vpcCidrInput.setAttribute('required', '');
          if (azSelect) azSelect.removeAttribute('required');
        } else {
          if (vpcCidrInput) vpcCidrInput.removeAttribute('required');
          if (azSelect) azSelect.removeAttribute('required');
        }
      }

      if (azureVnetResourceGroupInput) {
        if (this.currentProvider === 'azure' && !azurePrivateLink && isCreateNewVpc) {
          azureVnetResourceGroupInput.setAttribute('required', '');
        } else {
          azureVnetResourceGroupInput.removeAttribute('required');
        }
      }

      // Update subnet-size options and preview visibility
      calculateSubnets();
    };

    if (createNewVpcCheckbox) {
      createNewVpcCheckbox.addEventListener('change', updateNetworkConfigUI);
    }
    
    // Setup add subnet button
    const addSubnetBtn = document.getElementById('add-subnet-btn');
    if (addSubnetBtn) {
      addSubnetBtn.addEventListener('click', () => {
        const container = document.getElementById('existing-subnets-container');
        if (!container) return;
        
        const existingRows = container.querySelectorAll('.existing-subnet-row');
        const newIndex = existingRows.length + 1;
        
        const newRow = document.createElement('div');
        newRow.className = 'row mb-2 existing-subnet-row';
        newRow.innerHTML = `
          <div class="col-md-10">
            <label class="form-label">Subnet ID ${newIndex}</label>
            <input type="text" class="form-control existing-subnet-input" name="existing_subnet_ids[]" 
                   placeholder="e.g., subnet-0a1b2c3d4e5f67890">
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button type="button" class="btn btn-outline-danger btn-sm w-100 remove-subnet-btn">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `;
        container.appendChild(newRow);
        
        // Add remove handler
        newRow.querySelector('.remove-subnet-btn')?.addEventListener('click', () => {
          newRow.remove();
          // Re-number remaining subnet labels
          const remainingRows = container.querySelectorAll('.existing-subnet-row');
          remainingRows.forEach((row, idx) => {
            const label = row.querySelector('label');
            if (label && idx >= 2) {
              label.textContent = `Subnet ID ${idx + 1}`;
            }
          });
        });
      });
    }
    
    const azureResourceGroupMode = document.getElementById('azure_resource_group_mode');
    const azureExistingResourceGroupField = document.getElementById('azure-existing-resource-group-field');
    const azureExistingResourceGroupInput = document.querySelector('input[name="azure_existing_resource_group_name"]');
    const updateAzureResourceGroupUI = () => {
      if (this.currentProvider !== 'azure') return;
      const useExisting = privateLinkCheckbox?.checked === true && azureResourceGroupMode?.value === 'existing';
      if (azureExistingResourceGroupField) {
        azureExistingResourceGroupField.style.display = useExisting ? 'block' : 'none';
      }
      if (azureExistingResourceGroupInput) {
        if (useExisting) azureExistingResourceGroupInput.setAttribute('required', '');
        else azureExistingResourceGroupInput.removeAttribute('required');
      }
    };

    // Setup private link validation
    const checkPrivateLinkRequirements = () => {
      const tier = this.currentProvider === 'azure' ? 'PREMIUM' : pricingTierSelect?.value;
      const requiredTier = this.currentProvider === 'aws' ? 'ENTERPRISE' : 'PREMIUM';

      if (this.currentProvider === 'aws' && privateLinkCheckbox) {
        const enterpriseSelected = tier === 'ENTERPRISE';
        if (!enterpriseSelected) privateLinkCheckbox.checked = false;
        privateLinkCheckbox.disabled = !enterpriseSelected;
        privateLinkCheckbox.setAttribute('aria-disabled', String(!enterpriseSelected));
      }

      if (this.currentProvider === 'azure' && privateLinkCheckbox) {
        const privateLinkEnabled = privateLinkCheckbox.checked;
        const standardFields = document.getElementById('azure-standard-fields');
        const privateLinkFields = document.getElementById('azure-private-link-fields');
        const unityCatalogConfiguration = document.getElementById('unity-catalog-configuration');
        if (standardFields) standardFields.style.display = privateLinkEnabled ? 'none' : 'block';
        if (privateLinkFields) privateLinkFields.style.display = privateLinkEnabled ? 'block' : 'none';
        if (unityCatalogConfiguration) unityCatalogConfiguration.style.display = privateLinkEnabled ? 'none' : 'block';
        if (azureNatGatewayZoneSection) azureNatGatewayZoneSection.style.display = privateLinkEnabled ? 'none' : 'block';
        if (natGatewaySection) natGatewaySection.style.display = privateLinkEnabled ? 'block' : 'none';
        document.querySelectorAll('.azure-standard-required').forEach(input => {
          if (privateLinkEnabled) input.removeAttribute('required');
          else input.setAttribute('required', '');
        });
        if (createNewVpcCheckbox) {
          if (privateLinkEnabled) createNewVpcCheckbox.checked = true;
          createNewVpcCheckbox.disabled = privateLinkEnabled;
          createNewVpcCheckbox.setAttribute('aria-disabled', String(privateLinkEnabled));
        }
        updateAzureResourceGroupUI();
      }

      const privateLinkEnabled = privateLinkCheckbox?.checked || false;
      
      if (privateLinkEnabled && tier !== requiredTier && privateLinkWarning) {
        privateLinkWarning.style.display = 'block';
      } else if (privateLinkWarning) {
        privateLinkWarning.style.display = 'none';
      }
    };
    
    // The AWS deployments require exactly one metastore path.
    const metastoreModeCreate = document.getElementById('metastore_mode_create');
    const metastoreModeExisting = document.getElementById('metastore_mode_existing');
    const newMetastoreSection = document.getElementById('new-metastore-section');
    const existingMetastoreSection = document.getElementById('existing-metastore-section');
    const metastoreIdInput = document.getElementById('metastore_id');
    const updateMetastoreUI = () => {
      const useExisting = metastoreModeExisting?.checked === true;
      if (newMetastoreSection) newMetastoreSection.style.display = useExisting ? 'none' : 'block';
      if (existingMetastoreSection) existingMetastoreSection.style.display = useExisting ? 'block' : 'none';
      if (metastoreIdInput) {
        const metastoreVisible = this.currentProvider !== 'azure' || privateLinkCheckbox?.checked !== true;
        if (useExisting && metastoreVisible) metastoreIdInput.setAttribute('required', '');
        else metastoreIdInput.removeAttribute('required');
      }
    };
    metastoreModeCreate?.addEventListener('change', updateMetastoreUI);
    metastoreModeExisting?.addEventListener('change', updateMetastoreUI);
    azureResourceGroupMode?.addEventListener('change', updateAzureResourceGroupUI);
    
    privateLinkCheckbox?.addEventListener('change', checkPrivateLinkRequirements);
    pricingTierSelect?.addEventListener('change', checkPrivateLinkRequirements);
    natGatewaySelect?.addEventListener('change', () => {
      updateNetworkConfigUI();
      calculateSubnets();
    });
    
    // Real-time subnet calculation event listeners
    // Note: calculateSubnets is already defined earlier in the function
    vpcCidrInput?.addEventListener('input', calculateSubnets);
    pricingTierSelect?.addEventListener('change', () => {
      checkPrivateLinkRequirements();
      updateNetworkConfigUI();
      calculateSubnets();
    });
    privateLinkCheckbox?.addEventListener('change', () => {
      checkPrivateLinkRequirements();
      updateMetastoreUI();
      updateNetworkConfigUI();
      calculateSubnets();
    });
    
    // Note: Change listeners for availability zone selects are added above in the initialization section
    // Note: Remove button handlers are added above in the addAvailabilityZoneRow function
    
    if (createNewVpcCheckbox && this.currentConfig.create_new_vpc === false) {
      createNewVpcCheckbox.checked = false;
    }
    if (privateLinkCheckbox && this.currentConfig.enable_private_link === true &&
        (this.currentProvider !== 'aws' || pricingTierSelect?.value === 'ENTERPRISE')) {
      privateLinkCheckbox.checked = true;
    }
    checkPrivateLinkRequirements();
    updateMetastoreUI();
    updateAzureResourceGroupUI();
    updateNetworkConfigUI();

    // Trigger initial calculations to show the size selector and preview when needed.
    setTimeout(calculateSubnets, 500);
    
    // Setup form submission
    document.getElementById('config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const config = Object.fromEntries(formData);
      config.provider = this.currentProvider;
      config.create_new_vpc = document.getElementById('create_new_vpc')?.checked !== false;
      config.enable_private_link = document.getElementById('enable_private_link')?.checked || false;
      if (this.currentProvider === 'gcp') {
        config.create_new_vpc = true;
        config.enable_private_link = false;
        config.enable_nat_gateway = true;
        config.nat_gateway_mode = 'single';
        config.pricing_tier = '';
        config.subnet_cidr = document.getElementById('subnet_cidr')?.value?.trim() || '';
      }
      if (this.currentProvider === 'azure') {
        config.pricing_tier = 'PREMIUM';
        const azureNatGatewayZone = document.getElementById('azure_nat_gateway_zone')?.value ?? '1';
        config.azure_nat_gateway_zone = ['', '1', '2', '3'].includes(azureNatGatewayZone)
          ? azureNatGatewayZone
          : '1';
        const azurePrivateLinkNatGatewayZone = document.getElementById('azure_private_link_nat_gateway_zone')?.value ?? '';
        config.azure_private_link_nat_gateway_zone = ['', '1', '2', '3'].includes(azurePrivateLinkNatGatewayZone)
          ? azurePrivateLinkNatGatewayZone
          : '';
      }
      if (this.currentProvider === 'aws') {
        config.nat_gateway_mode = document.getElementById('nat_gateway_mode')?.value || 'single';
        config.enable_nat_gateway = !config.create_new_vpc || config.nat_gateway_mode !== 'none';
      } else if (this.currentProvider === 'azure' && config.enable_private_link) {
        config.azure_private_link_nat_gateway_mode = document.getElementById('nat_gateway_mode')?.value || 'single';
        config.nat_gateway_mode = config.azure_private_link_nat_gateway_mode;
        config.enable_nat_gateway = config.nat_gateway_mode !== 'none';
      } else {
        config.nat_gateway_mode = 'single';
        config.enable_nat_gateway = true;
      }

      if (this.currentProvider === 'aws') {
        config.metastore_mode = document.querySelector('input[name="metastore_mode"]:checked')?.value || 'create';
        config.metastore_id = config.metastore_mode === 'existing'
          ? (document.getElementById('metastore_id')?.value?.trim() || '')
          : '';
        config.metastore_name = config.metastore_mode === 'existing'
          ? ''
          : (document.getElementById('metastore_name')?.value?.trim() || `${config.project_prefix}-metastore`);
      }

      if (this.currentProvider === 'azure') {
        config.azure_resource_group_mode = document.getElementById('azure_resource_group_mode')?.value || 'new';
        if (config.enable_private_link) {
          config.create_new_vpc = true;
          config.metastore_mode = 'none';
          config.metastore_id = '';
          config.metastore_name = '';
        } else {
          config.metastore_mode = document.querySelector('input[name="metastore_mode"]:checked')?.value || 'create';
          config.metastore_id = config.metastore_mode === 'existing'
            ? (document.getElementById('metastore_id')?.value?.trim() || '')
            : '';
          config.metastore_name = config.metastore_mode === 'existing'
            ? ''
            : (document.getElementById('metastore_name')?.value?.trim() || `${config.project_prefix}-metastore`);
        }
      }
      
      // AWS existing-VPC mode uses only pre-existing network resources.
      if (this.currentProvider === 'aws' && !config.create_new_vpc) {
        config.subnet_mode = 'existing';
        config.create_new_subnets = false;
        const subnetInputs = document.querySelectorAll('.existing-subnet-input');
        config.existing_subnet_ids = Array.from(subnetInputs)
          .map(input => input.value.trim())
          .filter(val => val !== '');
        config.existing_security_group_id = document.getElementById('existing_security_group_id')?.value?.trim() || '';
        config.existing_vpc_id = document.getElementById('existing_vpc_id')?.value?.trim() || '';
        config.backend_rest_aws_vpce_id = config.enable_private_link
          ? (document.getElementById('backend_rest_aws_vpce_id')?.value?.trim() || '')
          : '';
        config.backend_relay_aws_vpce_id = config.enable_private_link
          ? (document.getElementById('backend_relay_aws_vpce_id')?.value?.trim() || '')
          : '';
      } else if (this.currentProvider === 'aws') {
        config.create_new_subnets = true;
        config.existing_subnet_ids = [];
        config.existing_security_group_id = '';
        config.existing_vpc_id = '';
      }

      // Azure-specific: Handle existing VNet
      if (this.currentProvider === 'azure' && !config.create_new_vpc) {
        config.existing_vpc_id = document.getElementById('existing_vpc_id')?.value?.trim() || '';
      } else if (this.currentProvider === 'azure') {
        config.existing_vpc_id = '';
      }

      // GCP-specific: Handle existing VPC
      if (this.currentProvider === 'gcp' && !config.create_new_vpc) {
        config.existing_vpc_id = document.getElementById('existing_vpc_id')?.value?.trim() || '';
        config.existing_subnet_name = document.getElementById('existing_subnet_name')?.value?.trim() || '';
        config.existing_pod_range_name = document.getElementById('existing_pod_range_name')?.value?.trim() || '';
        config.existing_service_range_name = document.getElementById('existing_service_range_name')?.value?.trim() || '';
      }

      // Clear all previous field validations
      this.clearAllFieldValidations();
      
      // Determine if we need subnet configuration (VPC CIDR, AZs, etc.)
      const needsSubnetConfig = this.currentProvider !== 'gcp' &&
        (this.currentProvider === 'azure' || config.create_new_vpc);
      
      // Get availability zones from multiple select
      const zones = this.getSelectedAvailabilityZones();
      
      // Only validate availability zones if we need subnet configuration
      if (needsSubnetConfig) {
        // Validate availability zones
        const limits = this.getAvailabilityZoneLimits(this.currentProvider);
        
        if (zones.length === 0) {
          const azSelect = document.getElementById('availability-zones-select');
          if (azSelect) {
            azSelect.setAttribute('data-invalid', 'true');
            azSelect.setAttribute('data-error', `At least ${limits.min} availability zone(s) required for ${this.currentProvider.toUpperCase()}.`);
            const choicesContainer = azSelect.closest('.choices');
            if (choicesContainer) {
              choicesContainer.classList.add('is-invalid');
            }
          }
          Utils.showFlashMessage(`At least ${limits.min} availability zone(s) required for ${this.currentProvider.toUpperCase()}.`, 'error');
          return;
        }
        
        // Check minimum
        if (zones.length < limits.min) {
          const azSelect = document.getElementById('availability-zones-select');
          if (azSelect) {
            azSelect.setAttribute('data-invalid', 'true');
            azSelect.setAttribute('data-error', `At least ${limits.min} availability zone(s) required for ${this.currentProvider.toUpperCase()}.`);
            const choicesContainer = azSelect.closest('.choices');
            if (choicesContainer) {
              choicesContainer.classList.add('is-invalid');
            }
          }
          Utils.showFlashMessage(`At least ${limits.min} availability zone(s) required for ${this.currentProvider.toUpperCase()}.`, 'error');
          return;
        }
        
        // Check maximum
        if (zones.length > limits.max) {
          const azSelect = document.getElementById('availability-zones-select');
          if (azSelect) {
            azSelect.setAttribute('data-invalid', 'true');
            azSelect.setAttribute('data-error', `Maximum ${limits.max} availability zone(s) allowed for ${this.currentProvider.toUpperCase()}.`);
            const choicesContainer = azSelect.closest('.choices');
            if (choicesContainer) {
              choicesContainer.classList.add('is-invalid');
            }
          }
          Utils.showFlashMessage(`Maximum ${limits.max} availability zone(s) allowed for ${this.currentProvider.toUpperCase()}.`, 'error');
          return;
        }
      }
      
      // Only perform zone validation and subnet calculation if we need subnet config
      if (needsSubnetConfig) {
        // Check for duplicates (shouldn't happen with multiple select, but check anyway)
        const uniqueZones = [...new Set(zones)];
        if (uniqueZones.length !== zones.length) {
          const azSelect = document.getElementById('availability-zones-select');
          if (azSelect) {
            azSelect.setAttribute('data-invalid', 'true');
            azSelect.setAttribute('data-error', 'Duplicate availability zones are not allowed.');
          }
          Utils.showFlashMessage('Duplicate availability zones are not allowed.', 'error');
          return;
        }
        
        // Validate zone values are valid for provider and region
        const validZones = this.getAvailabilityZoneOptions(this.currentProvider, config.region).map(z => z.value);
        const invalidZones = zones.filter(z => !validZones.includes(z));
        if (invalidZones.length > 0) {
          const azSelect = document.getElementById('availability-zones-select');
          if (azSelect) {
            azSelect.setAttribute('data-invalid', 'true');
            azSelect.setAttribute('data-error', `Invalid availability zones: ${invalidZones.join(', ')}`);
            const choicesContainer = azSelect.closest('.choices');
            if (choicesContainer) {
              choicesContainer.classList.add('is-invalid');
            }
          }
          Utils.showFlashMessage(`Invalid availability zones: ${invalidZones.join(', ')}`, 'error');
          return;
        }
        
        config.availability_zones = zones;
        
        // Calculate subnets
        const networkCalc = new NetworkCalculator(this.currentProvider);
        try {
          if (config.vpc_cidr && zones.length > 0) {
            const createServiceSubnet = this.currentProvider !== 'aws' && config.enable_private_link;
            const subnetSizeLimits = networkCalc.calculateSubnetSizeLimits(
              config.vpc_cidr,
              zones.length,
              config.enable_private_link,
              createServiceSubnet,
              config.enable_nat_gateway
            );
            const requestedSubnetSize = parseInt(config.custom_subnet_size, 10);
            const customSubnetSize = subnetSizeLimits.valid &&
              !Number.isNaN(requestedSubnetSize) &&
              requestedSubnetSize >= subnetSizeLimits.min &&
              requestedSubnetSize <= subnetSizeLimits.max
              ? requestedSubnetSize
              : subnetSizeLimits.default;
            config.custom_subnet_size = customSubnetSize;

            const subnets = networkCalc.allocateSubnets(
              config.vpc_cidr,
              zones,
              config.pricing_tier,
              config.enable_private_link,
              customSubnetSize,
              createServiceSubnet,
              config.enable_nat_gateway
            );
            
            // Validate subnet allocation
            const validation = networkCalc.validateSubnetAllocation(config.vpc_cidr, subnets);
            if (!validation.valid) {
              // Mark VPC CIDR field as invalid
              this.markFieldAsInvalid('vpc_cidr', 'Network configuration error: ' + validation.message);
              Utils.showFlashMessage('Network configuration error: ' + validation.message, 'error');
              return;
            }
            
            config.calculated_subnets = subnets;
          }
        } catch (err) {
          // Mark VPC CIDR field as invalid
          this.markFieldAsInvalid('vpc_cidr', 'Error calculating subnets: ' + err.message);
          Utils.showFlashMessage('Error calculating subnets: ' + err.message, 'error');
          return;
        }
      } else {
        // Using existing subnets - set empty zones array since we don't need it
        config.availability_zones = [];
      }
      
      // Check HTML5 validation first for required fields
      const form = e.target;
      if (!form.checkValidity()) {
        // Get invalid HTML5 fields
        const invalidFields = form.querySelectorAll(':invalid');
        invalidFields.forEach(field => {
          if (field.validity.valueMissing) {
            this.markFieldAsInvalid(field.name, field.validationMessage || 'This field is required');
          }
        });
        
        // Don't proceed if HTML5 validation fails
        if (invalidFields.length > 0) {
          return;
        }
      }
      
      // Validate
      const validation = Validators.validateConfiguration(config);
      if (!validation.valid) {
        // Mark each invalid field
        Object.keys(validation.errors).forEach(fieldName => {
          if (fieldName === 'availability_zones') {
            // Mark availability zones select
            const azSelect = document.getElementById('availability-zones-select');
            if (azSelect) {
              azSelect.setAttribute('data-invalid', 'true');
              azSelect.setAttribute('data-error', validation.errors[fieldName]);
              const choicesContainer = azSelect.closest('.choices');
              if (choicesContainer) {
                choicesContainer.classList.add('is-invalid');
              }
            }
          } else {
            this.markFieldAsInvalid(fieldName, validation.errors[fieldName]);
          }
        });
        
        // Also show flash message for user feedback
        const errors = Object.values(validation.errors).join(', ');
        Utils.showFlashMessage('Validation errors: ' + errors, 'error');
        return;
      }
      
      this.currentConfig = config;
      Utils.setStorage('config', config);
      Utils.setStorage('step', 2);
      window.location.hash = '/summary';
    });
    
    // Setup real-time validation on blur
    const form = document.getElementById('config-form');
    if (form) {
      const fields = form.querySelectorAll('input[name], select[name]');
      fields.forEach(field => {
        field.addEventListener('blur', () => {
          // Clear previous validation
          this.clearFieldValidation(field.name);
          
          // Get current form values
          const formData = new FormData(form);
          const config = Object.fromEntries(formData);
          config.provider = this.currentProvider;
          config.create_new_vpc = document.getElementById('create_new_vpc')?.checked !== false;
          config.enable_private_link = document.getElementById('enable_private_link')?.checked || false;
          if (this.currentProvider === 'aws') {
            config.nat_gateway_mode = document.getElementById('nat_gateway_mode')?.value || 'single';
            config.enable_nat_gateway = !config.create_new_vpc || config.nat_gateway_mode !== 'none';
          } else if (this.currentProvider === 'azure' && config.enable_private_link) {
            config.azure_private_link_nat_gateway_mode = document.getElementById('nat_gateway_mode')?.value || 'single';
            config.nat_gateway_mode = config.azure_private_link_nat_gateway_mode;
            config.enable_nat_gateway = config.nat_gateway_mode !== 'none';
          } else {
            config.nat_gateway_mode = 'single';
            config.enable_nat_gateway = true;
          }
          
          // Get availability zones from multiple select
          config.availability_zones = this.getSelectedAvailabilityZones();
          
          // Validate only this field
          const validation = Validators.validateConfiguration(config);
          if (!validation.valid && validation.errors[field.name]) {
            this.markFieldAsInvalid(field.name, validation.errors[field.name]);
          }
        });
        
        // Clear validation on input
        field.addEventListener('input', () => {
          if (field.hasAttribute('data-invalid')) {
            this.clearFieldValidation(field.name);
          }
        });
      });
    }
  }

  renderSummary() {
    if (!this.currentConfig || !this.currentProvider) {
      window.location.hash = '/select-provider';
      return;
    }
    
    const config = this.currentConfig;
    const configuredSummaryNatGatewayMode = config.provider === 'azure' && config.enable_private_link
      ? (config.azure_private_link_nat_gateway_mode || config.nat_gateway_mode)
      : config.nat_gateway_mode;
    const natGatewayMode = ['single', 'per_az', 'none'].includes(configuredSummaryNatGatewayMode)
      ? configuredSummaryNatGatewayMode
      : config.enable_nat_gateway === false ? 'none' : 'single';
    const natGatewayLabel = natGatewayMode === 'per_az'
      ? 'One per availability zone'
      : natGatewayMode === 'none' ? 'None' : 'Single';
    const configuredAzureNatGatewayZone = Object.prototype.hasOwnProperty.call(config, 'azure_nat_gateway_zone')
      ? String(config.azure_nat_gateway_zone)
      : '1';
    const azureNatGatewayZone = ['1', '2', '3'].includes(configuredAzureNatGatewayZone)
      ? configuredAzureNatGatewayZone
      : '';
    const azureNatGatewayLabel = azureNatGatewayZone
      ? `Availability Zone ${azureNatGatewayZone}`
      : 'Regional / non-zonal';
    const configuredAzurePrivateLinkNatGatewayZone = Object.prototype.hasOwnProperty.call(
      config,
      'azure_private_link_nat_gateway_zone'
    ) ? String(config.azure_private_link_nat_gateway_zone) : '';
    const azurePrivateLinkNatGatewayZone = ['1', '2', '3'].includes(configuredAzurePrivateLinkNatGatewayZone)
      ? configuredAzurePrivateLinkNatGatewayZone
      : '';
    const azurePrivateLinkNatGatewayLabel = natGatewayMode === 'none'
      ? 'None'
      : `Single — ${azurePrivateLinkNatGatewayZone
        ? `Availability Zone ${azurePrivateLinkNatGatewayZone}`
        : 'Regional / non-zonal'}`;
    const providerIcon = config.provider === 'aws' ? 
      '<i class="bi bi-amazon text-warning me-2" style="font-size: 2rem;"></i>' :
      config.provider === 'azure' ?
      '<i class="bi bi-microsoft text-info me-2" style="font-size: 2rem;"></i>' :
      '<i class="bi bi-google text-success me-2" style="font-size: 2rem;"></i>';
    
    const providerName = config.provider === 'aws' ? 
      '<i class="bi bi-amazon text-warning me-1"></i> Amazon Web Services' :
      config.provider === 'azure' ?
      '<i class="bi bi-microsoft text-info me-1"></i> Microsoft Azure' :
      '<i class="bi bi-google text-success me-1"></i> Google Cloud Platform';
    
    const pricingBadgeClass = config.pricing_tier === 'ENTERPRISE' ? 'warning' :
      config.pricing_tier === 'PREMIUM' ? 'success' : 'secondary';
    
    const networkSummary = config.calculated_subnets ? 
      (() => {
        try {
          const networkCalc = new NetworkCalculator(config.provider);
          return networkCalc.calculateNetworkSummary(config.vpc_cidr, config.calculated_subnets);
        } catch {
          return null;
        }
      })() : null;
    
    const content = `
      <div class="container my-5 configuration-summary-page">
        <div class="row">
          <div class="col-xl-10 mx-auto">
            <div class="text-center mb-5">
              <div class="provider-badge mb-3">
                ${providerIcon}
                <span class="h2 fw-bold">Configuration Summary</span>
              </div>
              <p class="lead text-muted">
                Review your configuration before generating the Terraform project. 
                All settings can be modified after download if needed.
              </p>
            </div>
            
            <div class="row g-4 mb-5">
              <div class="col-lg-6">
                <div class="card h-100">
                  <div class="card-header bg-primary">
                    <h5 class="card-title mb-0">
                      <i class="bi bi-gear-fill me-2"></i>
                      Basic Configuration
                    </h5>
                  </div>
                  <div class="card-body">
                    <table class="table table-borderless mb-0">
                      <tr>
                        <td class="fw-semibold">Cloud Provider:</td>
                        <td>${providerName}</td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">${config.provider === 'gcp' ? 'Workspace Name:' : 'Project Prefix:'}</td>
                        <td><code>${config.project_prefix}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Region:</td>
                        <td><code>${config.region}</code></td>
                      </tr>
                      ${config.provider !== 'gcp' ? `
                      <tr>
                        <td class="fw-semibold">Pricing Tier:</td>
                        <td>
                          <span class="badge bg-${pricingBadgeClass}">${config.pricing_tier}</span>
                        </td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'aws' || (config.provider === 'azure' && !config.enable_private_link) ? `
                      <tr>
                        <td class="fw-semibold">Metastore:</td>
                        <td>${config.metastore_mode === 'existing'
                          ? `Attach <code>${config.metastore_id}</code>`
                          : `Create <code>${config.metastore_name}</code>`}</td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'azure' && !config.enable_private_link && config.resource_group_name ? `
                        <tr>
                          <td class="fw-semibold">Workspace Resource Group:</td>
                          <td><code>${config.resource_group_name}</code></td>
                        </tr>
                        <tr>
                          <td class="fw-semibold">Catalog:</td>
                          <td><code>${config.azure_catalog_name}</code></td>
                        </tr>
                      ` : ''}
                      ${config.provider === 'azure' && config.enable_private_link ? `
                        <tr>
                          <td class="fw-semibold">Data Plane Resource Group:</td>
                          <td>${config.azure_resource_group_mode === 'existing'
                            ? `Use <code>${config.azure_existing_resource_group_name}</code>`
                            : `Create <code>rg-${config.project_prefix}-dp</code>`}</td>
                        </tr>
                      ` : ''}
                      ${config.provider === 'gcp' && config.project_id ? `
                        <tr>
                          <td class="fw-semibold">GCP Project ID:</td>
                          <td><code>${config.project_id}</code></td>
                        </tr>
                        <tr>
                          <td class="fw-semibold">Google Service Account:</td>
                          <td><code class="text-break">${config.google_service_account_email}</code></td>
                        </tr>
                        <tr>
                          <td class="fw-semibold">Databricks Account ID:</td>
                          <td><code class="text-break">${config.databricks_account_id}</code></td>
                        </tr>
                        <tr>
                          <td class="fw-semibold">Workspace Admin:</td>
                          <td><code class="text-break">${config.databricks_admin_user}</code></td>
                        </tr>
                      ` : ''}
                    </table>
                  </div>
                </div>
              </div>
              
              <div class="col-lg-6">
                <div class="card h-100">
                  <div class="card-header bg-success">
                    <h5 class="card-title mb-0">
                      <i class="bi bi-diagram-3-fill me-2"></i>
                      Network Configuration
                    </h5>
                  </div>
                  <div class="card-body">
                    <table class="table table-borderless mb-0">
                      <tr>
                        <td class="fw-semibold">${config.provider === 'azure' ? 'VNet Mode:' : 'VPC Mode:'}</td>
                        <td>
                          <span class="badge bg-${config.create_new_vpc ? 'primary' : 'secondary'}">
                            ${config.create_new_vpc ? 'Create New' : 'Use Existing'}
                          </span>
                        </td>
                      </tr>
                      ${!config.create_new_vpc && config.existing_vpc_id ? `
                      <tr>
                        <td class="fw-semibold">${config.provider === 'azure' ? 'VNet Resource ID:' : config.provider === 'gcp' ? 'VPC Name:' : 'VPC ID:'}</td>
                        <td><code class="text-break">${config.existing_vpc_id}</code></td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'aws' && config.create_new_vpc ? `
                      <tr>
                        <td class="fw-semibold">NAT Gateway:</td>
                        <td><span class="badge bg-${natGatewayMode === 'none' ? 'secondary' : 'success'}">${natGatewayLabel}</span></td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'azure' && !config.enable_private_link ? `
                      <tr>
                        <td class="fw-semibold">NAT Gateway:</td>
                        <td><span class="badge bg-success">${azureNatGatewayLabel}</span></td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'azure' && config.enable_private_link ? `
                      <tr>
                        <td class="fw-semibold">NAT Gateway:</td>
                        <td><span class="badge bg-${natGatewayMode === 'none' ? 'secondary' : 'success'}">${azurePrivateLinkNatGatewayLabel}</span></td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'gcp' ? `
                      <tr>
                        <td class="fw-semibold">Cloud NAT:</td>
                        <td><span class="badge bg-success">Created</span></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Subnet CIDR:</td>
                        <td><code>${config.subnet_cidr}</code></td>
                      </tr>
                      ` : ''}
                      ${config.provider !== 'gcp' && config.vpc_cidr && (config.provider === 'azure' || config.create_new_vpc || config.create_new_subnets) ? `
                      <tr>
                        <td class="fw-semibold">${config.provider === 'azure' ? 'VNet CIDR:' : 'VPC CIDR:'}</td>
                        <td><code>${config.vpc_cidr}</code></td>
                      </tr>
                      ` : ''}
                      ${config.provider !== 'azure' && config.provider !== 'gcp' && (config.availability_zones && config.availability_zones.length > 0) ? `
                      <tr>
                        <td class="fw-semibold">Availability Zones:</td>
                        <td>
                          ${config.availability_zones.map(az => 
                            `<span class="badge bg-light me-1">${az}</span>`
                          ).join('')}
                        </td>
                      </tr>
                      ` : ''}
                      ${config.existing_subnet_ids && config.existing_subnet_ids.length > 0 ? `
                      <tr>
                        <td class="fw-semibold">Existing Subnet IDs:</td>
                        <td>
                          ${config.existing_subnet_ids.map(id => 
                            `<code class="d-block text-break mb-1">${id}</code>`
                          ).join('')}
                        </td>
                      </tr>
                      ` : ''}
                      ${config.existing_security_group_id ? `
                      <tr>
                        <td class="fw-semibold">Security Group ID:</td>
                        <td><code class="text-break">${config.existing_security_group_id}</code></td>
                      </tr>
                      ` : ''}
                      ${config.backend_rest_aws_vpce_id ? `
                      <tr>
                        <td class="fw-semibold">REST API VPC Endpoint:</td>
                        <td><code class="text-break">${config.backend_rest_aws_vpce_id}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">SCC Relay VPC Endpoint:</td>
                        <td><code class="text-break">${config.backend_relay_aws_vpce_id}</code></td>
                      </tr>
                      ` : ''}
                      ${(config.create_new_vpc || config.create_new_subnets) && config.calculated_subnets && config.calculated_subnets.length > 0 ? `
                      <tr>
                        <td class="fw-semibold">Subnets:</td>
                        <td>
                          <span class="badge bg-info">${config.calculated_subnets.length} subnet${config.calculated_subnets.length !== 1 ? 's' : ''}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                </div>
              </div>
              
              ${networkSummary && !networkSummary.error ? `
                <div class="col-lg-6">
                  <div class="card h-100">
                    <div class="card-header bg-info">
                      <h5 class="card-title mb-0">
                        <i class="bi bi-calculator me-2"></i>
                        Network Utilization
                      </h5>
                    </div>
                    <div class="card-body">
                      <div class="row text-center mb-3">
                        <div class="col-6">
                          <div class="h4 text-primary mb-1">${Utils.formatNumber(networkSummary.total_ips)}</div>
                          <div class="small text-muted">Total IP Addresses</div>
                        </div>
                        <div class="col-6">
                          <div class="h4 text-success mb-1">${Utils.formatNumber(networkSummary.used_ips)}</div>
                          <div class="small text-muted">Allocated IPs</div>
                        </div>
                      </div>
                      <div class="progress mb-2" style="height: 8px;">
                        <div class="progress-bar bg-success" role="progressbar" 
                             style="width: ${networkSummary.utilization_percent}%"
                             aria-valuenow="${networkSummary.utilization_percent}" 
                             aria-valuemin="0" aria-valuemax="100">
                        </div>
                      </div>
                      <div class="text-center small text-muted">
                        ${networkSummary.utilization_percent}% Network Utilization
                      </div>
                      <div class="text-center small text-success mt-2">
                        ${networkSummary.subnet_count} Subnets Configured
                      </div>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
            
            ${config.calculated_subnets && config.calculated_subnets.length > 0 ? `
              <div class="card mb-5">
                <div class="card-header bg-light">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-diagram-2 me-2"></i>
                    Subnet Allocation Details
                  </h5>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    ${config.calculated_subnets.map(subnet => {
                      const typeColor = subnet.subnet_type === 'private' ? 'primary' :
                        subnet.subnet_type === 'public' ? 'success' :
                        (subnet.subnet_type === 'service' || subnet.subnet_type === 'intra') ? 'warning' :
                        subnet.subnet_type === 'host' ? 'info' : 'secondary';
                      return `
                        <div class="col-md-6 col-lg-4">
                          <div class="card subnet-allocation-card border-start border-4 border-${typeColor}">
                            <div class="card-body p-3">
                              <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-0 text-capitalize">${subnet.name}</h6>
                                <span class="badge bg-${typeColor} small">${subnet.subnet_type}</span>
                              </div>
                              <div class="text-muted small">
                                <div><strong>CIDR:</strong> <code>${subnet.cidr}</code></div>
                                <div><strong>Size:</strong> /${subnet.size}</div>
                                <div><strong>Zone:</strong> ${subnet.availability_zone}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            ` : ''}
            
            <form id="summary-form">
              <div class="card mb-4">
                <div class="card-body">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="include_docs" checked>
                    <label class="form-check-label" for="include_docs">
                      Include deployment documentation
                    </label>
                    <div class="form-text">Include README.md with deployment instructions</div>
                  </div>
                </div>
              </div>
              
              <div class="d-flex justify-content-between">
                <a href="#/configure" class="btn btn-outline-secondary btn-lg" data-navigate>
                  <i class="bi bi-arrow-left me-2"></i>
                  Back to Configuration
                </a>
                <button type="submit" class="btn btn-primary btn-lg px-5" id="generate-btn">
                  <i class="bi bi-gear me-2"></i>
                  Generate Project
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    this.render(content);
    Utils.updateProgress(3);
    
    document.getElementById('summary-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Update loading message
      const loadingMessage = document.getElementById('loading-message');
      if (loadingMessage) {
        loadingMessage.textContent = 'Generating your Terraform project...';
      }
      
      Utils.showLoading('Generating your Terraform project...');
      
      try {
        // Wait for JSZip to be available
        await Utils.waitForJSZip();
        
        const generator = new TerraformGenerator();
        const zipBlob = await generator.generateProject(this.currentConfig);
        const filename = `${this.currentConfig.project_prefix}-${this.currentProvider}-terraform.zip`;
        
        // Store blob and filename for manual download
        this.downloadBlob = zipBlob;
        this.downloadFilename = filename;
        
        Utils.setStorage('step', 3);
        Utils.hideLoading();
        window.location.hash = '/download';
      } catch (err) {
        Utils.hideLoading();
        Utils.showFlashMessage('Error generating project: ' + err.message, 'error');
      }
    });
  }

  async renderDownload() {
    const config = this.currentConfig;
    const providerIcon = config.provider === 'aws' ? 
      '<i class="bi bi-amazon text-warning me-1"></i> AWS' :
      config.provider === 'azure' ?
      '<i class="bi bi-microsoft text-info me-1"></i> Azure' :
      '<i class="bi bi-google text-success me-1"></i> Google Cloud';
    
    const exportCmdDisplay = config.provider === 'gcp'
      ? `gcloud config set project ${config.project_id}
gcloud config set auth/impersonate_service_account ${config.google_service_account_email}
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"`
      : config.provider === 'azure'
        ? 'export TF_VAR_databricks_account_id="&lt;account-id&gt;"'
        : `export TF_VAR_databricks_account_id="&lt;account-id&gt;"
export DATABRICKS_CLIENT_ID="&lt;client-id&gt;"
export DATABRICKS_CLIENT_SECRET="&lt;client-secret&gt;"`;

    const cloudAuthCommand = config.provider === 'aws'
      ? 'aws configure'
      : config.provider === 'azure'
        ? `az login\naz account set --subscription "${config.azure_subscription_id}"`
        : `gcloud auth login\ngcloud config set project ${config.project_id}`;
    const cloudAuthHelp = config.provider === 'aws'
      ? `<ul class="mb-2 ps-3">
          <li>Configure an AWS identity that can create the selected VPC/EC2, endpoint, NAT gateway, IAM, and S3 resources.</li>
          <li><a href="https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html" target="_blank" rel="noopener noreferrer">AWS CLI configuration guide</a></li>
        </ul>`
      : config.provider === 'azure'
        ? `<ul class="mb-2 ps-3">
            <li>Sign in and select the subscription shown below.</li>
            <li>The identity needs Contributor plus permission to create role assignments, such as Owner or Role Based Access Control Administrator.</li>
            <li><a href="https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-interactively" target="_blank" rel="noopener noreferrer">Azure CLI authentication guide</a></li>
          </ul>`
        : `<ul class="mb-2 ps-3">
            <li>Sign in with an identity that can impersonate the configured service account.</li>
            <li>The caller needs <code>roles/iam.serviceAccountTokenCreator</code>; the service account needs project network creation permissions.</li>
            <li><a href="https://cloud.google.com/docs/authentication/use-service-account-impersonation" target="_blank" rel="noopener noreferrer">Google Cloud service-account impersonation guide</a></li>
          </ul>`;
    const databricksAuthHelp = config.provider === 'aws'
      ? `<ul class="mb-2 ps-3">
          <li>Create a Databricks service principal and assign it the Account Admin role. <a href="https://docs.databricks.com/aws/en/admin/users-groups/manage-service-principals" target="_blank" rel="noopener noreferrer">Service principal guide</a></li>
          <li>Create an OAuth secret by following the <a href="https://docs.databricks.com/aws/en/dev-tools/auth/oauth-m2m" target="_blank" rel="noopener noreferrer">OAuth machine-to-machine guide</a>.</li>
          <li>The client ID and secret below belong to the Databricks service principal, not to AWS.</li>
        </ul>`
      : config.provider === 'azure'
        ? `<ul class="mb-2 ps-3">
            <li>The signed-in Azure identity must also have Databricks Account Admin access for account-level resources.</li>
            <li>Export your Databricks account ID as shown below.</li>
          </ul>`
        : `<ul class="mb-2 ps-3">
            <li>Add the configured Google service account to the Databricks account and assign it the Account Admin role.</li>
            <li>Impersonate it and export the short-lived access token shown below.</li>
          </ul>`;
    
    const content = `
      <div class="container my-5 download-page">
        <div class="row">
          <div class="col-xl-8 mx-auto">
            <div class="text-center mb-5">
              <div class="success-icon mb-3">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
              </div>
              <h1 class="display-5 fw-bold text-success mb-3">
                Project Generated Successfully!
              </h1>
              <p class="lead text-muted">
                Your Terraform project is ready for download and deployment. 
                The generated code follows best practices and is production-ready.
              </p>
            </div>

            <div class="card mb-4">
              <div class="card-header bg-success text-white">
                <h5 class="card-title mb-0">
                  <i class="bi bi-info-circle me-2"></i>
                  Project Information
                </h5>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6">
                    <table class="table table-borderless mb-0">
                      <tr>
                        <td class="fw-semibold">Cloud Provider:</td>
                        <td>${providerIcon}</td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">${config.provider === 'gcp' ? 'Workspace Name:' : 'Project Prefix:'}</td>
                        <td><code>${config.project_prefix || 'databricks'}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Region:</td>
                        <td><code>${config.region || 'N/A'}</code></td>
                      </tr>
                    </table>
                  </div>
                  <div class="col-md-6">
                    <table class="table table-borderless mb-0">
                      <tr>
                        <td class="fw-semibold">Generated:</td>
                        <td>${Utils.formatDate()}</td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">File Format:</td>
                        <td><span class="badge bg-primary">ZIP Archive</span></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Status:</td>
                        <td><span class="badge bg-success">Ready for Download</span></td>
                      </tr>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-header bg-primary text-white">
                <h5 class="card-title mb-0">
                  <i class="bi bi-download me-2"></i>
                  Download Your Project
                </h5>
              </div>
              <div class="card-body text-center">
                <button type="button" class="btn btn-download btn-lg" id="download-project-btn">
                  <i class="bi bi-download me-2"></i>
                  <span class="download-filename">${config.project_prefix || 'databricks'}-${config.provider}-terraform.zip</span>
                </button>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-header bg-info text-white">
                <h5 class="card-title mb-0">
                  <i class="bi bi-list-check me-2"></i>
                  What's Included in Your Project
                </h5>
              </div>
              <div class="card-body">
                <div class="row">
                  ${config.provider === 'gcp' ? `
                  <div class="col-md-6">
                    <h6 class="fw-bold text-primary mb-3">Terraform Files</h6>
                    <ul class="list-unstyled">
                      <li class="mb-2"><i class="bi bi-diagram-3 text-success me-2"></i><strong>network.tf</strong> - VPC, subnet, router, and NAT</li>
                      <li class="mb-2"><i class="bi bi-server text-warning me-2"></i><strong>databricks.tf</strong> - Workspace and admin setup</li>
                      <li class="mb-2"><i class="bi bi-file-earmark-text text-info me-2"></i><strong>variables.tf</strong> - Input variable definitions</li>
                      <li class="mb-2"><i class="bi bi-file-earmark-code text-primary me-2"></i><strong>providers.tf</strong> - Provider configuration</li>
                      <li class="mb-2"><i class="bi bi-file-earmark-code text-secondary me-2"></i><strong>outputs.tf</strong> and <strong>versions.tf</strong></li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <h6 class="fw-bold text-primary mb-3">Generated & Documentation</h6>
                    <ul class="list-unstyled">
                      <li class="mb-2"><i class="bi bi-file-earmark-text text-warning me-2"></i><strong>terraform.tfvars</strong> - Your configuration values</li>
                      <li class="mb-2"><i class="bi bi-file-earmark-text text-primary me-2"></i><strong>README.md</strong> - Authentication and deployment guide</li>
                      <li class="mb-2"><i class="bi bi-shield-check text-success me-2"></i><strong>License files</strong> - License and notice information</li>
                    </ul>
                  </div>
                  ` : `
                  <div class="col-md-6">
                    <h6 class="fw-bold text-primary mb-3">Core Files</h6>
                    <ul class="list-unstyled">
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-code text-success me-2"></i>
                        <strong>main.tf</strong> - Main resource definitions
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-text text-info me-2"></i>
                        <strong>variables.tf</strong> - Input variable definitions
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-text text-warning me-2"></i>
                        <strong>terraform.tfvars</strong> - Your configuration values
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-code text-secondary me-2"></i>
                        <strong>outputs.tf</strong> - Output value definitions
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-code text-primary me-2"></i>
                        <strong>provider.tf</strong> - Provider configuration
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-code text-success me-2"></i>
                        <strong>versions.tf</strong> - Version constraints
                      </li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <h6 class="fw-bold text-primary mb-3">Documentation & Modules</h6>
                    <ul class="list-unstyled">
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-text text-primary me-2"></i>
                        <strong>README.md</strong> - Complete deployment guide
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-folder text-info me-2"></i>
                        <strong>modules/</strong> - Reusable Terraform modules
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-diagram-3 text-success me-2"></i>
                        <strong>Network module</strong> - VPC/VNet configuration
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-server text-warning me-2"></i>
                        <strong>Databricks module</strong> - Workspace setup
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-shield-check text-danger me-2"></i>
                        <strong>Security module</strong> - Private connectivity
                      </li>
                      <li class="mb-2">
                        <i class="bi bi-file-earmark-text text-secondary me-2"></i>
                        <strong>Examples & docs</strong> - Usage examples
                      </li>
                    </ul>
                  </div>
                  `}
                </div>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-header bg-warning text-dark">
                <h5 class="card-title mb-0">
                  <i class="bi bi-play-circle me-2"></i>
                  Next Steps - Deploy Your Infrastructure
                </h5>
              </div>
              <div class="card-body">
                <div class="step-container">
                  <div class="step-item d-flex mb-4">
                    <div class="step-number bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                      1
                    </div>
                    <div class="step-content">
                      <h6 class="fw-bold mb-2">Extract and Review</h6>
                      <p class="mb-2">Extract the ZIP file and review the generated configuration files. Check the <code>README.md</code> for detailed instructions.</p>
                      <div class="command-block" data-command="unzip ${config.project_prefix || 'databricks'}-${config.provider}-terraform.zip -d ${config.project_prefix || 'databricks'}-${config.provider}-terraform">
                        <code>unzip ${config.project_prefix || 'databricks'}-${config.provider}-terraform.zip -d ${config.project_prefix || 'databricks'}-${config.provider}-terraform</code>
                        <button class="command-copy-btn" type="button" aria-label="Copy command" title="Copy to clipboard">
                          <i class="bi bi-clipboard"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="step-item d-flex mb-4">
                    <div class="step-number bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                      2
                    </div>
                    <div class="step-content">
                      <h6 class="fw-bold mb-2">Navigate to Directory</h6>
                      <p class="mb-2">Change to the extracted Terraform project directory.</p>
                      <div class="command-block" data-command="cd ${config.project_prefix || 'databricks'}-${config.provider}-terraform">
                        <code>cd ${config.project_prefix || 'databricks'}-${config.provider}-terraform</code>
                        <button class="command-copy-btn" type="button" aria-label="Copy command" title="Copy to clipboard">
                          <i class="bi bi-clipboard"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="step-item d-flex mb-4">
                    <div class="step-number bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                      3
                    </div>
                    <div class="step-content">
                      <h6 class="fw-bold mb-2">Configure Credentials</h6>
                      ${cloudAuthHelp}
                      <div class="command-block" data-command="${cloudAuthCommand.replace(/"/g, '&quot;')}">
                        <code>${cloudAuthCommand}</code>
                        <button class="command-copy-btn" type="button" aria-label="Copy command" title="Copy to clipboard">
                          <i class="bi bi-clipboard"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="step-item d-flex mb-4">
                    <div class="step-number bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                      4
                    </div>
                    <div class="step-content">
                      <h6 class="fw-bold mb-2">Initialize Terraform</h6>
                      <p class="mb-2">Initialize Terraform to download required providers and modules.</p>
                      <div class="command-block" data-command="terraform init">
                        <code>terraform init</code>
                        <button class="command-copy-btn" type="button" aria-label="Copy command" title="Copy to clipboard">
                          <i class="bi bi-clipboard"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="step-item d-flex mb-4">
                    <div class="step-number bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                      5
                    </div>
                    <div class="step-content">
                      <h6 class="fw-bold mb-2">Prepare Deployment</h6>
                      ${databricksAuthHelp}
                      <p class="mb-2">${config.provider === 'gcp'
                        ? 'Impersonate the configured Google service account and export a short-lived access token. The non-secret identifiers are already in <code>terraform.tfvars</code>.'
                        : 'Export sensitive variables as environment variables to avoid storing them in <code>terraform.tfvars</code>. See the README for provider-specific instructions.'}</p>
                      <div class="command-block">
                        <code>${exportCmdDisplay}</code>
                        <button class="command-copy-btn" type="button" aria-label="Copy command" title="Copy to clipboard">
                          <i class="bi bi-clipboard"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="step-item d-flex mb-4">
                    <div class="step-number bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                      6
                    </div>
                    <div class="step-content">
                      <h6 class="fw-bold mb-2">Deploy Infrastructure</h6>
                      <p class="mb-2">Apply the Terraform configuration to create your Databricks infrastructure in the cloud.</p>
                      <div class="command-block" data-command="terraform apply">
                        <code>terraform apply</code>
                        <button class="command-copy-btn" type="button" aria-label="Copy command" title="Copy to clipboard">
                          <i class="bi bi-clipboard"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="alert alert-info mt-4">
                  <i class="bi bi-lightbulb me-2"></i>
                  <strong>Tip:</strong> The generated project includes comprehensive documentation, 
                  troubleshooting guides, and examples. Check the README.md file for detailed information 
                  about customization and advanced configuration options.
                </div>
              </div>
            </div>

            <div class="text-center">
              <div class="d-flex gap-3 justify-content-center flex-wrap">
                <a href="#/select-provider" class="btn btn-primary btn-lg" data-navigate>
                  <i class="bi bi-plus-circle me-2"></i>
                  Create Another Project
                </a>
                <button type="button" class="btn btn-outline-secondary btn-lg" onclick="window.history.back()">
                  <i class="bi bi-arrow-left me-2"></i>
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.render(content);
    Utils.updateProgress(3);
    
    // Helper function to handle download
    const handleDownload = async (e) => {
      e.preventDefault();
      
      // If blob is available, use it; otherwise regenerate the project
      if (this.downloadBlob && this.downloadFilename) {
        Utils.downloadFile(this.downloadBlob, this.downloadFilename);
        Utils.showFlashMessage('Download started!', 'success');
      } else {
        // Regenerate the project if blob is not available (e.g., after page reload)
        Utils.showLoading('Regenerating your Terraform project...');
        try {
          await Utils.waitForJSZip();
          const generator = new TerraformGenerator();
          const zipBlob = await generator.generateProject(this.currentConfig);
          const filename = `${this.currentConfig.project_prefix}-${this.currentProvider}-terraform.zip`;
          
          // Store blob and filename for future clicks
          this.downloadBlob = zipBlob;
          this.downloadFilename = filename;
          
          Utils.downloadFile(zipBlob, filename);
          Utils.hideLoading();
          Utils.showFlashMessage('Download started!', 'success');
        } catch (err) {
          Utils.hideLoading();
          Utils.showFlashMessage('Error regenerating project: ' + err.message, 'error');
        }
      }
    };
    
    // Setup download button click handler
    const downloadBtn = document.getElementById('download-project-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', handleDownload);
    }
    
    // Setup copy functionality for command blocks
    document.querySelectorAll('.command-copy-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const commandBlock = this.closest('.command-block');
        let command = commandBlock.getAttribute('data-command') || commandBlock.querySelector('code').textContent.trim();
        command = command.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
        
        try {
          await navigator.clipboard.writeText(command);
          
          // Visual feedback
          const originalIcon = this.querySelector('i').className;
          this.classList.add('copied');
          this.querySelector('i').className = 'bi bi-check';
          
          // Reset after 2 seconds
          setTimeout(() => {
            this.classList.remove('copied');
            this.querySelector('i').className = originalIcon;
          }, 2000);
          
          // Show toast notification
          Utils.showFlashMessage('Command copied to clipboard\!', 'success');
        } catch (err) {
          console.error('Failed to copy:', err);
          Utils.showFlashMessage('Failed to copy command', 'error');
        }
      });
    });
  }

  handleReset() {
    Utils.clearStorage();
    this.currentConfig = {};
    this.currentProvider = null;
    this.currentStep = 0;
    Utils.updateProgress(0);
    Utils.showFlashMessage('Session reset. Starting fresh configuration.', 'info');
    window.location.hash = '/select-provider';
  }

  render(content) {
    const container = document.getElementById('app-content');
    if (container) {
      container.innerHTML = content;
      // Re-setup navigation for new content
      this.setupNavigation();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});

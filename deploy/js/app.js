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
          { value: 'STANDARD', label: 'Standard' },
          { value: 'PREMIUM', label: 'Premium' },
          { value: 'ENTERPRISE', label: 'Enterprise' }
        ]
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
    
    // Handle hash routing
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
    
    // Update progress
    if (this.currentStep > 0) {
      Utils.updateProgress(this.currentStep);
    }
    
    // Update navbar based on provider selection
    this.updateNavbar();
    
    // Check and show install prompt on navigation
    this.checkInstallPrompt();
    
    // Setup credential modal event listeners
    this.setupCredentialModal();
    
    // Setup master password modal event listeners
    this.setupMasterPasswordModals();
  }

  updateNavbar() {
    // Configure Provider menu is always visible
    // Update credential status indicators
    this.updateCredentialStatusIndicators();
  }

  /**
   * Setup credential modal event listeners
   */
  setupCredentialModal() {
    const modal = document.getElementById('configureProviderModal');
    if (modal) {
      // When trying to open the credentials modal, check vault state first
      modal.addEventListener('show.bs.modal', (e) => {
        // Check if vault exists and needs to be unlocked
        if (Utils.hasCredentialsVault() && !Utils.isVaultUnlocked()) {
          e.preventDefault();
          this.showUnlockVaultModal();
          return;
        }
        
        // If no vault exists, show setup modal first
        if (!Utils.hasCredentialsVault()) {
          e.preventDefault();
          this.showSetupVaultModal();
          return;
        }
        
        // Vault is unlocked, update UI
        this.updateCredentialStatusIndicators();
        this.updateVaultStatusBanner();
        
        // Populate fields with masked values for all providers
        this.populateCredentialFields();
      });
    }
  }

  /**
   * Populate credential fields with masked values if credentials exist
   * Fields are locked when credentials are present
   */
  async populateCredentialFields() {
    for (const provider of ['aws', 'azure', 'gcp']) {
      await this.updateProviderCredentialFields(provider);
    }
  }

  /**
   * Update credential fields for a specific provider
   * @param {string} provider - Cloud provider (aws, azure, gcp)
   */
  async updateProviderCredentialFields(provider) {
    const accountIdInput = document.getElementById(`${provider}-account-id`);
    const clientIdInput = document.getElementById(`${provider}-client-id`);
    const clientSecretInput = document.getElementById(`${provider}-client-secret`);
    const saveBtn = document.getElementById(`${provider}-save-btn`);
    const clearBtn = document.getElementById(`${provider}-clear-btn`);

    // Get stored credentials
    let credentials = null;
    if (Utils.isVaultUnlocked()) {
      credentials = await Utils.getProviderCredentials(provider);
    }

    const hasCredentials = credentials && 
      (credentials.accountId || credentials.clientId || credentials.clientSecret);

    if (hasCredentials) {
      // Show masked values and lock fields
      if (accountIdInput) {
        accountIdInput.value = credentials.accountId ? Utils.maskSensitiveValue(credentials.accountId) : '';
        accountIdInput.readOnly = true;
        accountIdInput.classList.add('credential-locked');
      }
      if (clientIdInput) {
        clientIdInput.value = credentials.clientId ? Utils.maskSensitiveValue(credentials.clientId) : '';
        clientIdInput.readOnly = true;
        clientIdInput.classList.add('credential-locked');
      }
      if (clientSecretInput) {
        clientSecretInput.value = credentials.clientSecret ? Utils.maskSensitiveValue(credentials.clientSecret) : '';
        clientSecretInput.readOnly = true;
        clientSecretInput.classList.add('credential-locked');
      }

      // Disable save button, enable clear button
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-lock-fill me-1"></i>Credentials Saved';
      }
      if (clearBtn) {
        clearBtn.classList.remove('btn-outline-danger');
        clearBtn.classList.add('btn-danger');
      }
    } else {
      // Clear fields and unlock
      this.unlockProviderCredentialFields(provider);
    }
  }

  /**
   * Unlock credential fields for a specific provider (make them editable)
   * @param {string} provider - Cloud provider (aws, azure, gcp)
   */
  unlockProviderCredentialFields(provider) {
    const accountIdInput = document.getElementById(`${provider}-account-id`);
    const clientIdInput = document.getElementById(`${provider}-client-id`);
    const clientSecretInput = document.getElementById(`${provider}-client-secret`);
    const saveBtn = document.getElementById(`${provider}-save-btn`);
    const clearBtn = document.getElementById(`${provider}-clear-btn`);

    // Clear and unlock all fields
    if (accountIdInput) {
      accountIdInput.value = '';
      accountIdInput.readOnly = false;
      accountIdInput.classList.remove('credential-locked');
      accountIdInput.placeholder = 'Enter your Databricks Account ID';
    }
    if (clientIdInput) {
      clientIdInput.value = '';
      clientIdInput.readOnly = false;
      clientIdInput.classList.remove('credential-locked');
      clientIdInput.placeholder = 'Enter Client ID';
    }
    if (clientSecretInput) {
      clientSecretInput.value = '';
      clientSecretInput.readOnly = false;
      clientSecretInput.classList.remove('credential-locked');
      clientSecretInput.placeholder = 'Enter Client Secret';
    }

    // Enable save button, reset clear button style
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-save me-1"></i>Save Credentials';
    }
    if (clearBtn) {
      clearBtn.classList.remove('btn-danger');
      clearBtn.classList.add('btn-outline-danger');
    }
  }

  /**
   * Setup master password modal event listeners
   */
  setupMasterPasswordModals() {
    // Setup modal
    this.setupMasterPasswordSetupModal();
    
    // Unlock modal
    this.setupMasterPasswordUnlockModal();
    
    // Change password modal
    this.setupChangePasswordModal();
    
    // Vault control buttons in credentials modal
    this.setupVaultControlButtons();
  }

  /**
   * Setup the master password setup modal handlers
   */
  setupMasterPasswordSetupModal() {
    const newPasswordInput = document.getElementById('master-password-new');
    const confirmPasswordInput = document.getElementById('master-password-confirm');
    const setupButton = document.getElementById('btn-setup-master-password');
    const toggleNewBtn = document.getElementById('toggle-master-password-new');
    const toggleConfirmBtn = document.getElementById('toggle-master-password-confirm');

    // Password visibility toggles
    if (toggleNewBtn && newPasswordInput) {
      toggleNewBtn.addEventListener('click', () => this.togglePasswordVisibility(newPasswordInput, toggleNewBtn));
    }
    if (toggleConfirmBtn && confirmPasswordInput) {
      toggleConfirmBtn.addEventListener('click', () => this.togglePasswordVisibility(confirmPasswordInput, toggleConfirmBtn));
    }

    // Password validation
    const validateSetupForm = () => {
      const newPass = newPasswordInput?.value || '';
      const confirmPass = confirmPasswordInput?.value || '';
      
      this.updatePasswordStrength(newPass);
      
      const isValid = newPass.length >= 8 && newPass === confirmPass;
      if (setupButton) setupButton.disabled = !isValid;
      
      // Show mismatch warning
      if (confirmPass && newPass !== confirmPass) {
        confirmPasswordInput.classList.add('is-invalid');
      } else {
        confirmPasswordInput.classList.remove('is-invalid');
      }
    };

    if (newPasswordInput) newPasswordInput.addEventListener('input', validateSetupForm);
    if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', validateSetupForm);

    // Setup button click
    if (setupButton) {
      setupButton.addEventListener('click', async () => {
        const password = newPasswordInput?.value;
        
        if (!password || password.length < 8) {
          Utils.showFlashMessage('Password must be at least 8 characters.', 'error');
          return;
        }

        setupButton.disabled = true;
        setupButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Creating...';

        try {
          await Utils.setupCredentialsVault(password);
          await Utils.refreshCredentialsCache();
          
          // Remove focus and clear form before closing modal (fixes aria-hidden warning)
          if (newPasswordInput) {
            newPasswordInput.blur();
            newPasswordInput.value = '';
          }
          if (confirmPasswordInput) {
            confirmPasswordInput.blur();
            confirmPasswordInput.value = '';
          }
          
          // Close setup modal
          const setupModal = bootstrap.Modal.getInstance(document.getElementById('masterPasswordSetupModal'));
          if (setupModal) setupModal.hide();
          
          Utils.showFlashMessage('Credentials vault created successfully\!', 'success');
          
          // Now open the credentials modal
          setTimeout(() => {
            const credentialsModal = new bootstrap.Modal(document.getElementById('configureProviderModal'));
            credentialsModal.show();
          }, 300);
        } catch (error) {
          Utils.showFlashMessage(`Failed to create vault: ${error.message}`, 'error');
        } finally {
          setupButton.disabled = false;
          setupButton.innerHTML = '<i class="bi bi-shield-check me-1"></i>Create Vault';
        }
      });
    }
  }

  /**
   * Setup the master password unlock modal handlers
   */
  setupMasterPasswordUnlockModal() {
    const passwordInput = document.getElementById('master-password-unlock');
    const unlockButton = document.getElementById('btn-unlock-vault');
    const deleteButton = document.getElementById('btn-delete-vault');
    const toggleBtn = document.getElementById('toggle-master-password-unlock');
    const errorMessage = document.getElementById('unlock-error-message');

    // Password visibility toggle
    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', () => this.togglePasswordVisibility(passwordInput, toggleBtn));
    }

    // Unlock button click
    if (unlockButton) {
      unlockButton.addEventListener('click', async () => {
        const password = passwordInput?.value;
        
        if (!password) {
          Utils.showFlashMessage('Please enter your master password.', 'warning');
          return;
        }

        unlockButton.disabled = true;
        unlockButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Unlocking...';
        passwordInput.classList.remove('is-invalid');

        try {
          await Utils.unlockVault(password);
          await Utils.refreshCredentialsCache();
          
          // Remove focus from input before closing modal (fixes aria-hidden warning)
          if (passwordInput) {
            passwordInput.blur();
            passwordInput.value = '';
          }
          
          // Close unlock modal
          const unlockModal = bootstrap.Modal.getInstance(document.getElementById('masterPasswordUnlockModal'));
          if (unlockModal) unlockModal.hide();
          
          Utils.showFlashMessage('Vault unlocked successfully\!', 'success');
          
          // Update indicators
          this.updateCredentialStatusIndicators();
          
          // Only open credentials modal if NOT unlocking from download page
          if (!this._unlockFromDownloadPage) {
            setTimeout(() => {
              const credentialsModal = new bootstrap.Modal(document.getElementById('configureProviderModal'));
              credentialsModal.show();
            }, 300);
          }
          
          // Reset the flag
          this._unlockFromDownloadPage = false;
        } catch (error) {
          passwordInput.classList.add('is-invalid');
          if (errorMessage) errorMessage.textContent = error.message;
        } finally {
          unlockButton.disabled = false;
          unlockButton.innerHTML = '<i class="bi bi-unlock me-1"></i>Unlock';
        }
      });
    }

    // Allow Enter key to submit
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          unlockButton?.click();
        }
      });
    }

    // Delete vault button
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete the credentials vault? This will permanently delete all stored credentials and cannot be undone.')) {
          Utils.deleteCredentialsVault();
          
          // Remove focus before closing modal (fixes aria-hidden warning)
          if (passwordInput) {
            passwordInput.blur();
            passwordInput.value = '';
          }
          
          // Close unlock modal
          const unlockModal = bootstrap.Modal.getInstance(document.getElementById('masterPasswordUnlockModal'));
          if (unlockModal) unlockModal.hide();
          
          Utils.showFlashMessage('Credentials vault deleted.', 'info');
          this.updateCredentialStatusIndicators();
        }
      });
    }
  }

  /**
   * Setup change password modal handlers
   */
  setupChangePasswordModal() {
    const currentPasswordInput = document.getElementById('current-master-password');
    const newPasswordInput = document.getElementById('new-master-password');
    const confirmPasswordInput = document.getElementById('confirm-new-master-password');
    const changeButton = document.getElementById('btn-change-master-password');

    if (changeButton) {
      changeButton.addEventListener('click', async () => {
        const currentPass = currentPasswordInput?.value;
        const newPass = newPasswordInput?.value;
        const confirmPass = confirmPasswordInput?.value;

        if (!currentPass || !newPass || !confirmPass) {
          Utils.showFlashMessage('Please fill in all fields.', 'warning');
          return;
        }

        if (newPass.length < 8) {
          Utils.showFlashMessage('New password must be at least 8 characters.', 'error');
          return;
        }

        if (newPass !== confirmPass) {
          Utils.showFlashMessage('New passwords do not match.', 'error');
          return;
        }

        changeButton.disabled = true;
        changeButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Changing...';

        try {
          await Utils.changeMasterPassword(currentPass, newPass);
          
          // Remove focus and clear form before closing modal (fixes aria-hidden warning)
          if (currentPasswordInput) {
            currentPasswordInput.blur();
            currentPasswordInput.value = '';
          }
          if (newPasswordInput) {
            newPasswordInput.blur();
            newPasswordInput.value = '';
          }
          if (confirmPasswordInput) {
            confirmPasswordInput.blur();
            confirmPasswordInput.value = '';
          }
          
          // Close modal
          const changeModal = bootstrap.Modal.getInstance(document.getElementById('changeMasterPasswordModal'));
          if (changeModal) changeModal.hide();
          
          Utils.showFlashMessage('Master password changed successfully\!', 'success');
        } catch (error) {
          Utils.showFlashMessage(`Failed to change password: ${error.message}`, 'error');
        } finally {
          changeButton.disabled = false;
          changeButton.innerHTML = '<i class="bi bi-check-lg me-1"></i>Change Password';
        }
      });
    }
  }

  /**
   * Setup vault control buttons in credentials modal
   */
  setupVaultControlButtons() {
    const lockButton = document.getElementById('btn-lock-vault');
    const changePasswordLink = document.getElementById('btn-change-password-link');

    if (lockButton) {
      lockButton.addEventListener('click', () => {
        Utils.lockVault();
        
        // Close credentials modal
        const credentialsModal = bootstrap.Modal.getInstance(document.getElementById('configureProviderModal'));
        if (credentialsModal) credentialsModal.hide();
        
        Utils.showFlashMessage('Vault locked.', 'info');
        this.updateCredentialStatusIndicators();
      });
    }

    if (changePasswordLink) {
      changePasswordLink.addEventListener('click', () => {
        // Close credentials modal and open change password modal
        const credentialsModal = bootstrap.Modal.getInstance(document.getElementById('configureProviderModal'));
        if (credentialsModal) credentialsModal.hide();
        
        setTimeout(() => {
          const changeModal = new bootstrap.Modal(document.getElementById('changeMasterPasswordModal'));
          changeModal.show();
        }, 300);
      });
    }
  }

  /**
   * Toggle password input visibility
   */
  togglePasswordVisibility(input, button) {
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
      input.type = 'password';
      button.innerHTML = '<i class="bi bi-eye"></i>';
    }
  }

  /**
   * Update password strength indicator
   */
  updatePasswordStrength(password) {
    const strengthBar = document.querySelector('#password-strength .progress-bar');
    const strengthText = document.getElementById('strength-text');
    
    if (!strengthBar || !strengthText) return;

    let strength = 0;
    let text = 'Weak';
    let colorClass = 'bg-danger';

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;

    if (strength >= 80) {
      text = 'Strong';
      colorClass = 'bg-success';
    } else if (strength >= 50) {
      text = 'Medium';
      colorClass = 'bg-warning';
    } else if (strength >= 25) {
      text = 'Weak';
      colorClass = 'bg-danger';
    } else {
      text = 'Very weak';
      colorClass = 'bg-danger';
    }

    strengthBar.style.width = `${strength}%`;
    strengthBar.className = `progress-bar ${colorClass}`;
    strengthText.textContent = text;
  }

  /**
   * Show the setup vault modal
   */
  showSetupVaultModal() {
    const modal = new bootstrap.Modal(document.getElementById('masterPasswordSetupModal'));
    modal.show();
  }

  /**
   * Show the unlock vault modal
   */
  showUnlockVaultModal() {
    const modal = new bootstrap.Modal(document.getElementById('masterPasswordUnlockModal'));
    modal.show();
  }

  /**
   * Update the vault status banner in credentials modal
   */
  updateVaultStatusBanner() {
    const banner = document.getElementById('vault-status-banner');
    const statusIcon = document.getElementById('vault-status-icon');
    const statusText = document.getElementById('vault-status-text');
    
    if (!banner) return;

    if (Utils.isVaultUnlocked()) {
      banner.style.display = 'block';
      if (statusIcon) {
        statusIcon.className = 'bi bi-shield-fill-check text-success me-2';
      }
      if (statusText) {
        statusText.textContent = 'Vault unlocked - credentials are encrypted';
      }
    } else {
      banner.style.display = 'none';
    }
  }

  /**
   * Update credential status indicators in the modal tabs
   */
  async updateCredentialStatusIndicators() {
    for (const provider of ['aws', 'azure', 'gcp']) {
      const indicator = document.getElementById(`${provider}-creds-status`);
      if (indicator) {
        let hasCredentials = false;
        
        if (Utils.isVaultUnlocked()) {
          hasCredentials = await Utils.hasProviderCredentials(provider);
        }
        
        if (hasCredentials) {
          indicator.innerHTML = '<i class="bi bi-check-circle-fill text-success ms-1"></i>';
          indicator.title = 'Credentials configured';
        } else {
          indicator.innerHTML = '';
          indicator.title = '';
        }
      }
    }
  }

  /**
   * Save provider credentials from the modal form
   * @param {string} provider - Cloud provider (aws, azure, gcp)
   */
  async saveProviderCredentials(provider) {
    // Check if vault is unlocked
    if (!Utils.isVaultUnlocked()) {
      Utils.showFlashMessage('Please unlock the credentials vault first.', 'warning');
      return;
    }

    const accountIdInput = document.getElementById(`${provider}-account-id`);
    const clientIdInput = document.getElementById(`${provider}-client-id`);
    const clientSecretInput = document.getElementById(`${provider}-client-secret`);

    // Check if fields are locked (already have credentials)
    if (accountIdInput?.readOnly || clientIdInput?.readOnly || clientSecretInput?.readOnly) {
      Utils.showFlashMessage('Credentials are locked. Click Clear to edit.', 'warning');
      return;
    }

    const credentials = {
      accountId: accountIdInput ? accountIdInput.value.trim() : '',
      clientId: clientIdInput ? clientIdInput.value.trim() : '',
      clientSecret: clientSecretInput ? clientSecretInput.value.trim() : ''
    };

    // Check if at least one credential is provided
    if (!credentials.accountId && !credentials.clientId && !credentials.clientSecret) {
      Utils.showFlashMessage('Please enter at least one credential value.', 'warning');
      return;
    }

    try {
      // Save to encrypted storage
      const success = await Utils.setProviderCredentials(provider, credentials);

      if (success) {
        // Update fields to show masked values and lock them
        await this.updateProviderCredentialFields(provider);

        // Update status indicators
        await this.updateCredentialStatusIndicators();

        Utils.showFlashMessage(`${provider.toUpperCase()} credentials saved securely.`, 'success');
      } else {
        Utils.showFlashMessage('Failed to save credentials. Please try again.', 'error');
      }
    } catch (error) {
      Utils.showFlashMessage(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Clear provider credentials
   * @param {string} provider - Cloud provider (aws, azure, gcp)
   */
  async clearProviderCredentials(provider) {
    if (!Utils.isVaultUnlocked()) {
      Utils.showFlashMessage('Please unlock the credentials vault first.', 'warning');
      return;
    }

    try {
      await Utils.clearProviderCredentials(provider);
      
      // Unlock fields and clear values
      this.unlockProviderCredentialFields(provider);

      // Update status indicators
      await this.updateCredentialStatusIndicators();

      Utils.showFlashMessage(`${provider.toUpperCase()} credentials cleared. You can now enter new credentials.`, 'info');
    } catch (error) {
      Utils.showFlashMessage(`Error: ${error.message}`, 'error');
    }
  }

  checkInstallPrompt() {
    // Show install banner after user interacts with the app
    // This provides better UX than showing immediately
    setTimeout(() => {
      if (window.deferredPrompt && !localStorage.getItem('pwa-install-dismissed')) {
        const banner = document.getElementById('install-banner');
        if (banner && banner.style.display === 'none') {
          banner.style.display = 'block';
        }
      }
    }, 3000); // Show after 3 seconds of interaction
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
    
    // Check install prompt after route change
    this.checkInstallPrompt();
  }

  // Route Handlers
  renderHome() {
    const content = `
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <div class="row align-items-center min-vh-50">
            <div class="col-lg-6">
              <h1 class="hero-title">
                Deploy Databricks Infrastructure in Minutes
              </h1>
              <p class="hero-subtitle">
                One-Click Deployer simplifies Databricks infrastructure deployment across AWS, Azure, and GCP. 
                Transform complex Terraform configurations into a simple, guided experience with intelligent automation.
              </p>
              <div class="hero-cta">
                <a href="#/select-provider" class="btn btn-primary btn-lg" data-navigate>
                  <i class="bi bi-rocket-takeoff me-2" aria-hidden="true"></i>
                  Get Started
                </a>
                <button class="btn btn-outline-primary btn-lg" id="hero-install-btn" style="display: none;">
                  <i class="bi bi-download me-2" aria-hidden="true"></i>
                  Install App
                </button>
              </div>
              
              <!-- Quick Stats -->
              <div class="row mt-5 g-3 stagger-children">
                <div class="col-4">
                  <div class="glass p-3 rounded-3 text-center">
                    <div class="h2 fw-bold mb-1 text-gradient">3</div>
                    <div class="text-sm text-muted">Cloud Providers</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="glass p-3 rounded-3 text-center">
                    <div class="h2 fw-bold mb-1 text-gradient">90%</div>
                    <div class="text-sm text-muted">Time Saved</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="glass p-3 rounded-3 text-center">
                    <div class="h2 fw-bold mb-1 text-gradient">100%</div>
                    <div class="text-sm text-muted">Best Practices</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="hero-illustration animate-fade-up" style="animation-delay: 0.3s;">
                <div class="hero-terminal">
                  <div class="hero-terminal-header">
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
                    <div class="hero-code-line"><span class="success">✓ Apply complete\! Resources: 12 added</span></div>
                  </div>
                </div>
                <!-- Floating provider badges -->
                <div class="hero-float-element aws d-none d-lg-flex align-items-center gap-2">
                  <i class="bi bi-cloud text-warning"></i>
                  <span class="text-sm">AWS</span>
                </div>
                <div class="hero-float-element azure d-none d-lg-flex align-items-center gap-2">
                  <i class="bi bi-cloud text-info"></i>
                  <span class="text-sm">Azure</span>
                </div>
                <div class="hero-float-element gcp d-none d-lg-flex align-items-center gap-2">
                  <i class="bi bi-cloud text-primary-accent"></i>
                  <span class="text-sm">GCP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- What We Do Section -->
      <section class="what-we-do-section">
        <div class="container">
          <div class="row">
            <div class="col-lg-10 mx-auto text-center mb-5">
              <h2 class="h1 fw-bold mb-3">What We Do</h2>
              <p class="lead text-muted mb-5">
                One-Click Deployer is a Progressive Web App (PWA) that generates production-ready Terraform configurations 
                for Databricks workspaces across multiple cloud providers. We eliminate the complexity of infrastructure 
                as code by providing an intuitive, visual interface that handles all the technical details for you.
              </p>
            </div>
          </div>
          
          <div class="row g-4">
            <div class="col-md-6 col-lg-4">
              <div class="what-we-do-card">
                <div class="icon-wrapper">
                  <i class="bi bi-code-slash" aria-hidden="true"></i>
                </div>
                <h4 class="fw-bold mb-3">Generate Terraform Code</h4>
                <p class="text-muted mb-0">
                  Automatically generate complete Terraform projects with all necessary files, modules, and configurations. 
                  No manual coding required—just fill out a simple form.
                </p>
              </div>
            </div>
            
            <div class="col-md-6 col-lg-4">
              <div class="what-we-do-card">
                <div class="icon-wrapper">
                  <i class="bi bi-calculator" aria-hidden="true"></i>
                </div>
                <h4 class="fw-bold mb-3">Smart Network Calculations</h4>
                <p class="text-muted mb-0">
                  Our intelligent calculator automatically determines optimal subnet allocations, CIDR blocks, and network 
                  configurations based on your requirements and cloud provider best practices.
                </p>
              </div>
            </div>
            
            <div class="col-md-6 col-lg-4">
              <div class="what-we-do-card">
                <div class="icon-wrapper">
                  <i class="bi bi-shield-check" aria-hidden="true"></i>
                </div>
                <h4 class="fw-bold mb-3">Enterprise Security</h4>
                <p class="text-muted mb-0">
                  Built-in security configurations including private connectivity options (PrivateLink, Private Service Connect), 
                  IAM roles, and network isolation following cloud provider security best practices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Why Install Locally Section - HIGHLIGHTED -->
      <section class="py-5">
        <div class="container">
          <div class="install-section">
            <div class="install-icon">
              <i class="bi bi-phone" aria-hidden="true"></i>
            </div>
            <div class="text-center mb-5">
              <h2 class="h1 fw-bold mb-3">Why Install One-Click Deployer Locally?</h2>
              <p class="lead text-muted mb-4">
                Install this Progressive Web App on your device for the best experience. Get instant access, 
                work offline, and enjoy native app performance—all while keeping your data private and secure.
              </p>
            </div>
            
            <div class="row g-4 mb-5">
              <div class="col-md-6 col-lg-4">
                <div class="install-benefit-card">
                  <div class="benefit-icon">
                    <i class="bi bi-wifi-off" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Complete Offline Access</h5>
                  <p>
                    Use the app even without an internet connection. All functionality works offline, so you can generate 
                    Terraform configurations anywhere, anytime.
                  </p>
                </div>
              </div>
              
              <div class="col-md-6 col-lg-4">
                <div class="install-benefit-card">
                  <div class="benefit-icon">
                    <i class="bi bi-lightning-charge" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Faster Performance</h5>
                  <p>
                    Installed apps load instantly and run smoother than web versions. Experience native app performance 
                    with faster response times and seamless interactions.
                  </p>
                </div>
              </div>
              
              <div class="col-md-6 col-lg-4">
                <div class="install-benefit-card">
                  <div class="benefit-icon">
                    <i class="bi bi-app" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Native App Experience</h5>
                  <p>
                    Access the app directly from your home screen with a dedicated icon. Enjoy a full-screen experience 
                    without browser chrome, just like a native application.
                  </p>
                </div>
              </div>
              
              <div class="col-md-6 col-lg-4">
                <div class="install-benefit-card">
                  <div class="benefit-icon">
                    <i class="bi bi-shield-lock" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Enhanced Privacy & Security</h5>
                  <p>
                    All processing happens locally on your device. Your configurations and data never leave your machine, 
                    ensuring complete privacy and security.
                  </p>
                </div>
              </div>
              
              <div class="col-md-6 col-lg-4">
                <div class="install-benefit-card">
                  <div class="benefit-icon">
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Automatic Updates</h5>
                  <p>
                    The app automatically updates in the background, ensuring you always have the latest features and 
                    improvements without manual intervention.
                  </p>
                </div>
              </div>
              
              <div class="col-md-6 col-lg-4">
                <div class="install-benefit-card">
                  <div class="benefit-icon">
                    <i class="bi bi-speedometer2" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Quick Access</h5>
                  <p>
                    Launch the app instantly from your home screen or app drawer. No need to remember URLs or bookmark 
                    pages—just tap and go.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="install-cta">
              <button class="btn btn-primary btn-install-large" id="install-btn-hero">
                <i class="bi bi-download me-2" aria-hidden="true"></i>
                Install One-Click Deployer Now
              </button>
              <p class="text-muted small mt-3 mb-0">
                <i class="bi bi-info-circle me-1" aria-hidden="true"></i>
                Installation is free and takes less than a minute. Works on desktop and mobile devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="py-5">
        <div class="container">
          <div class="row">
            <div class="col-lg-8 mx-auto text-center mb-5">
              <h2 class="h1 fw-bold mb-3">Why Choose One-Click Deployer?</h2>
              <p class="lead text-muted">
                Eliminate the complexity barrier in Databricks infrastructure deployment 
                with our intuitive, production-ready solution.
              </p>
            </div>
          </div>
          
          <div class="row g-4 stagger-children">
            <div class="col-md-6 col-lg-4">
              <div class="card h-100">
                <div class="card-body p-4 text-center">
                  <div class="feature-icon icon-cyan">
                    <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Zero Terraform Knowledge Required</h5>
                  <p class="mb-0">
                    Visual forms replace complex code writing. Anyone can deploy 
                    enterprise-grade infrastructure without deep technical expertise.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 col-lg-4">
              <div class="card h-100">
                <div class="card-body p-4 text-center">
                  <div class="feature-icon icon-green">
                    <i class="bi bi-shield-check" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Production-Ready Output</h5>
                  <p class="mb-0">
                    Generated code follows enterprise best practices with built-in 
                    security, networking, and compliance configurations.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 col-lg-4">
              <div class="card h-100">
                <div class="card-body p-4 text-center">
                  <div class="feature-icon icon-blue">
                    <i class="bi bi-clouds-fill" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Multi-Cloud Native</h5>
                  <p class="mb-0">
                    Single interface for AWS, Azure, and GCP. Deploy consistently 
                    across all major cloud providers with provider-specific optimizations.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 col-lg-4">
              <div class="card h-100">
                <div class="card-body p-4 text-center">
                  <div class="feature-icon icon-amber">
                    <i class="bi bi-clock-fill" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Minutes, Not Hours</h5>
                  <p class="mb-0">
                    Reduce deployment preparation time from hours to minutes. 
                    Focus on your data projects, not infrastructure complexity.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 col-lg-4">
              <div class="card h-100">
                <div class="card-body p-4 text-center">
                  <div class="feature-icon icon-rose">
                    <i class="bi bi-gear-fill" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Intelligent Automation</h5>
                  <p class="mb-0">
                    Smart defaults, automatic network calculations, and real-time 
                    validation prevent configuration errors before they happen.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="col-md-6 col-lg-4">
              <div class="card h-100">
                <div class="card-body p-4 text-center">
                  <div class="feature-icon icon-purple">
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                  </div>
                  <h5 class="fw-bold">Keep Evolving</h5>
                  <p class="mb-0">
                    Start with our generated code and continue evolving your 
                    infrastructure by adding custom Terraform modules and resources.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="py-5 bg-surface">
        <div class="container">
          <div class="row">
            <div class="col-lg-8 mx-auto text-center mb-5">
              <h2 class="h1 fw-bold mb-3">How It Works</h2>
              <p class="lead text-muted">
                Three simple steps to production-ready Databricks infrastructure.
              </p>
            </div>
          </div>
          
          <div class="row g-4 stagger-children">
            <div class="col-md-4">
              <div class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-3 mb-3">
                  <div class="step-number">1</div>
                  <h5 class="fw-bold mb-0">Choose Your Cloud</h5>
                </div>
                <p>
                  Select your preferred cloud provider from AWS, Azure, or Google Cloud Platform.
                </p>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-3 mb-3">
                  <div class="step-number">2</div>
                  <h5 class="fw-bold mb-0">Configure Settings</h5>
                </div>
                <p>
                  Fill out the guided form with your preferences. Network settings are calculated automatically.
                </p>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-3 mb-3">
                  <div class="step-number">3</div>
                  <h5 class="fw-bold mb-0">Deploy & Go</h5>
                </div>
                <p>
                  Download your complete Terraform project and deploy with standard Terraform commands.
                </p>
              </div>
            </div>
          </div>
          
          <div class="text-center mt-5">
            <a href="#/select-provider" class="btn btn-primary btn-lg" data-navigate>
              Start Building Now
              <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </section>

      <!-- Supported Providers Preview -->
      <section class="py-5">
        <div class="container">
          <div class="row">
            <div class="col-lg-8 mx-auto text-center mb-5">
              <h2 class="h1 fw-bold mb-3">Supported Cloud Providers</h2>
              <p class="lead text-muted">
                Deploy Databricks workspaces on any major cloud platform with provider-specific optimizations.
              </p>
            </div>
          </div>
          
          <div class="row g-4">
            <div class="col-md-4">
              <div class="card border-0 shadow-sm provider-card h-100">
                <div class="card-body p-4 text-center">
                  <div class="provider-logo mb-3">
                    <i class="bi bi-amazon text-warning" style="font-size: 3rem;"></i>
                  </div>
                  <h5 class="fw-bold">Amazon Web Services</h5>
                  <ul class="list-unstyled text-muted small">
                    <li><i class="bi bi-check text-success me-1"></i> VPC & Subnet Management</li>
                    <li><i class="bi bi-check text-success me-1"></i> PrivateLink Integration</li>
                    <li><i class="bi bi-check text-success me-1"></i> Cross-Account IAM Roles</li>
                    <li><i class="bi bi-check text-success me-1"></i> Enterprise Security</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="card border-0 shadow-sm provider-card h-100">
                <div class="card-body p-4 text-center">
                  <div class="provider-logo mb-3">
                    <i class="bi bi-microsoft text-info" style="font-size: 3rem;"></i>
                  </div>
                  <h5 class="fw-bold">Microsoft Azure</h5>
                  <ul class="list-unstyled text-muted small">
                    <li><i class="bi bi-check text-success me-1"></i> VNet & Resource Groups</li>
                    <li><i class="bi bi-check text-success me-1"></i> Private Link Support</li>
                    <li><i class="bi bi-check text-success me-1"></i> Managed Identity</li>
                    <li><i class="bi bi-check text-success me-1"></i> Premium Features</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="card border-0 shadow-sm provider-card h-100">
                <div class="card-body p-4 text-center">
                  <div class="provider-logo mb-3">
                    <i class="bi bi-google text-success" style="font-size: 3rem;"></i>
                  </div>
                  <h5 class="fw-bold">Google Cloud Platform</h5>
                  <ul class="list-unstyled text-muted small">
                    <li><i class="bi bi-check text-success me-1"></i> VPC & Subnet Networks</li>
                    <li><i class="bi bi-check text-success me-1"></i> Private Service Connect</li>
                    <li><i class="bi bi-check text-success me-1"></i> Service Account Integration</li>
                    <li><i class="bi bi-check text-success me-1"></i> Private Google Access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="py-5 bg-primary text-white">
        <div class="container">
          <div class="row">
            <div class="col-lg-8 mx-auto text-center">
              <h2 class="h1 fw-bold mb-3">Ready to Simplify Your Databricks Deployment?</h2>
              <p class="lead mb-4">
                Join developers and data engineers who have streamlined their infrastructure deployment process. 
                Generate production-ready Terraform code in minutes, not hours.
              </p>
              <div class="d-flex gap-3 justify-content-center flex-wrap">
                <a href="#/select-provider" class="btn btn-light btn-lg px-5" data-navigate>
                  <i class="bi bi-play-circle me-2" aria-hidden="true"></i>
                  Start Your Deployment
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    
    this.render(content);
    Utils.updateProgress(0);
    
    // Setup install button in hero section
    const heroInstallBtn = document.getElementById('hero-install-btn');
    const installBtnHero = document.getElementById('install-btn-hero');
    
    const installPWAHandler = async () => {
      if (typeof window.installPWA === 'function') {
        await window.installPWA();
      } else {
        // Fallback if function not yet available
        console.warn('Install PWA function not available yet');
      }
    };
    
    if (heroInstallBtn) {
      heroInstallBtn.addEventListener('click', installPWAHandler);
      
      // Show button if install is available (check after a delay to ensure deferredPrompt is set)
      setTimeout(() => {
        if (window.deferredPrompt) {
          heroInstallBtn.style.display = 'inline-block';
        }
      }, 1000);
    }
    
    if (installBtnHero) {
      installBtnHero.addEventListener('click', installPWAHandler);
    }
  }

  renderProviderSelection() {
    const content = `
      <div class="container my-5 animate-fade-up">
        <div class="row">
          <div class="col-lg-10 mx-auto">
            <div class="text-center mb-5">
              <h1 class="text-gradient mb-3">Choose Your Cloud Provider</h1>
              <p class="lead">
                Select the cloud provider where you want to deploy your Databricks workspace.
                Each provider has unique features and capabilities optimized for different use cases.
              </p>
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
                    <p>Complete VPC management with subnets, security groups, and PrivateLink support.</p>
                    <ul class="list-unstyled text-start mb-4 text-sm">
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>VPC & Networking with security groups</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>PrivateLink (Enterprise tier)</span>
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
                    <p>Virtual networks, resource groups, and Private Link with Azure AD integration.</p>
                    <ul class="list-unstyled text-start mb-4 text-sm">
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>VNet & Resource Groups</span>
                      </li>
                      <li class="mb-2 d-flex align-items-start">
                        <i class="bi bi-check2 text-success me-2 mt-1"></i>
                        <span>Private Link (Premium tier)</span>
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
        this.updateNavbar();
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
    
    const providerName = Utils.getProviderName(this.currentProvider);
    const vpcLabel = this.currentProvider === 'azure' ? 'VNet CIDR Block' : 'VPC CIDR Block';
    const vpcDesc = this.currentProvider === 'azure' ? 
      'CIDR block for the VNet (between /8 and /24)' :
      'CIDR block for the VPC (between /8 and /24)';
    
    // Load configuration form based on provider
    const content = `
      <div class="container my-5">
        <div class="row">
          <div class="col-xl-8 mx-auto">
            <div class="text-center mb-5">
              <div class="provider-badge mb-3">
                ${providerIcon}
                <span class="h2 fw-bold text-capitalize">${this.currentProvider} Configuration</span>
              </div>
              <p class="lead text-muted">
                Configure your Databricks deployment settings for ${this.currentProvider.toUpperCase()}. 
                All network calculations are handled automatically based on your selections.
              </p>
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
                        Project Prefix
                        <span class="text-danger">*</span>
                      </label>
                      <input type="text" class="form-control" name="project_prefix" 
                             value="${this.currentConfig.project_prefix || ''}" 
                             placeholder="e.g., my-databricks-project" required>
                      <div class="form-text">Prefix for all resource names (2-20 characters, alphanumeric and hyphens only)</div>
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
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">
                        Databricks Pricing Tier
                        <span class="text-danger">*</span>
                      </label>
                      <select class="form-select" name="pricing_tier" required>
                        ${this.renderPricingTierOptions(this.currentProvider, this.currentConfig.pricing_tier)}
                      </select>
                      <div class="form-text">Databricks workspace pricing tier (affects available features)</div>
                    </div>
                    ${this.currentProvider === 'azure' ? `
                      <div class="col-md-6">
                        <label class="form-label fw-semibold">
                          Resource Group Name
                          <span class="text-danger">*</span>
                        </label>
                        <input type="text" class="form-control" name="resource_group_name" 
                               value="${this.currentConfig.resource_group_name || ''}" 
                               placeholder="e.g., rg-databricks-prod" required>
                        <div class="form-text">Azure Resource Group name for all resources</div>
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
                  <div class="mb-3">
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" id="create_new_vpc" name="create_new_vpc" checked>
                      <label class="form-check-label fw-semibold" for="create_new_vpc">
                        ${this.currentProvider === 'azure' ? 'Create New VNet' : 'Create New VPC'}
                      </label>
                    </div>
                    <div class="form-text">${this.currentProvider === 'azure' ? 
                      'Create a new Virtual Network or use an existing one' : 
                      'Create a new VPC or use an existing one'}</div>
                  </div>
                  ${this.currentProvider === 'aws' ? `
                  <div class="mb-3" id="nat-gateway-options">
                    <label class="form-label fw-semibold" for="nat_gateway_mode">
                      NAT Gateway Topology
                      <i class="bi bi-info-circle ms-1 text-muted"
                         title="No NAT gateway requires back-end PrivateLink for communication with the Databricks control plane."></i>
                    </label>
                    <select class="form-select" id="nat_gateway_mode" name="nat_gateway_mode">
                      <option value="per_az" ${!this.currentConfig.nat_gateway_mode || this.currentConfig.nat_gateway_mode === 'per_az' ? 'selected' : ''}>One NAT gateway per availability zone</option>
                      <option value="single" ${this.currentConfig.nat_gateway_mode === 'single' ? 'selected' : ''}>Single shared NAT gateway</option>
                      <option value="none" ${this.currentConfig.nat_gateway_mode === 'none' ? 'selected' : ''}>No NAT gateway</option>
                    </select>
                    <div class="form-text">Per-AZ provides production resilience; single reduces cost but creates a shared egress dependency.</div>
                    <div class="alert alert-warning mt-2 mb-0" id="nat-no-gateway-warning" style="display: none;">
                      <i class="bi bi-exclamation-triangle me-2"></i>
                      <strong>No NAT:</strong> Back-end PrivateLink is required to communicate with the Databricks control plane. Clusters will not have NAT-based internet egress.
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
                            <strong>Requirements:</strong> Provide at least two private subnets in different Availability Zones. Their route tables, NAT or private egress, and security groups must already satisfy Databricks requirements.
                          </div>
                          <div id="existing-subnets-container">
                            <div class="row mb-2 existing-subnet-row">
                              <div class="col-md-10">
                                <label class="form-label">Subnet ID 1 <span class="text-danger">*</span></label>
                                <input type="text" class="form-control existing-subnet-input" name="existing_subnet_ids[]" 
                                       placeholder="e.g., subnet-0a1b2c3d4e5f67890">
                              </div>
                            </div>
                            <div class="row mb-2 existing-subnet-row">
                              <div class="col-md-10">
                                <label class="form-label">Subnet ID 2 <span class="text-danger">*</span></label>
                                <input type="text" class="form-control existing-subnet-input" name="existing_subnet_ids[]" 
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
                                     placeholder="e.g., sg-0123456789abcdef0">
                              <div class="form-text">Security group for Databricks workspace nodes</div>
                            </div>
                          </div>
                        </div>
                        ` : ''}

                        ${this.currentProvider === 'azure' ? `
                        <div class="mb-3">
                          <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Requirements:</strong> The existing VNet must have two subnets with
                            <code>Microsoft.Databricks/workspaces</code> delegation and an associated NSG.
                          </div>
                        </div>
                        <div class="row mb-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">
                              Public (Host) Subnet Name <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control" name="existing_public_subnet_name" id="existing_public_subnet_name"
                                   placeholder="e.g., databricks-public-subnet"
                                   value="${this.currentConfig.existing_public_subnet_name || ''}">
                            <div class="form-text">Name of the subnet delegated for Databricks host nodes</div>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">
                              Private (Container) Subnet Name <span class="text-danger">*</span>
                            </label>
                            <input type="text" class="form-control" name="existing_private_subnet_name" id="existing_private_subnet_name"
                                   placeholder="e.g., databricks-private-subnet"
                                   value="${this.currentConfig.existing_private_subnet_name || ''}">
                            <div class="form-text">Name of the subnet delegated for Databricks container nodes</div>
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
                           value="${this.currentConfig.vpc_cidr || '10.0.0.0/22'}" 
                           placeholder="e.g., 10.0.0.0/22" required>
                    <div class="form-text">${vpcDesc}</div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold" for="availability-zones-select">
                      Availability Zones
                      <span class="text-danger">*</span>
                    </label>
                    <select id="availability-zones-select" class="form-select" name="availability_zones" multiple required>
                      <option value="" disabled>Select availability zones</option>
                    </select>
                    <div class="form-text">Type to search and select availability zones. Selected zones will appear as tags.</div>
                  </div>
                  <div id="subnet-size-slider-container" class="mb-4" style="display: none;">
                    <label class="form-label fw-semibold">
                      <i class="bi bi-sliders me-2"></i>
                      Subnet Size
                      <span class="text-muted small ms-2" id="subnet-size-info"></span>
                    </label>
                    <div class="subnet-slider-wrapper">
                      <input type="range" class="form-range subnet-size-slider" id="subnet-size-slider" 
                             min="17" max="28" step="1" value="26" name="custom_subnet_size">
                      <div class="slider-labels d-flex justify-content-between mt-1">
                        <span class="small text-muted" id="slider-label-min">Larger subnets</span>
                        <span class="small text-muted" id="slider-label-max">Smaller subnets</span>
                      </div>
                    </div>
                    <div class="subnet-size-details mt-3">
                      <div class="row g-2 text-center">
                        <div class="col-4">
                          <div class="subnet-metric">
                            <div class="h5 mb-0 text-primary" id="subnet-size-display">/<span>26</span></div>
                            <div class="small text-muted">Subnet Prefix</div>
                          </div>
                        </div>
                        <div class="col-4">
                          <div class="subnet-metric">
                            <div class="h5 mb-0 text-success" id="subnet-ips-display">64</div>
                            <div class="small text-muted">IPs per Subnet</div>
                          </div>
                        </div>
                        <div class="col-4">
                          <div class="subnet-metric">
                            <div class="h5 mb-0 text-info" id="subnet-nodes-display">~30</div>
                            <div class="small text-muted">Max Nodes</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="form-text mt-2" id="subnet-size-description">
                      Adjust the subnet size based on your expected cluster size. Larger subnets support more concurrent nodes.
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
                </div>
              </div>
              
              <div class="card mb-4">
                <div class="card-header bg-warning text-dark">
                  <h5 class="card-title mb-0">
                    <i class="bi bi-shield-check me-2"></i>
                    Security Configuration
                  </h5>
                </div>
                <div class="card-body">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="enable_private_link" name="enable_private_link">
                    <label class="form-check-label fw-semibold" for="enable_private_link">
                      ${this.currentProvider === 'azure' ? 'Enable Private Link' : 
                        this.currentProvider === 'gcp' ? 'Enable Private Service Connect' : 
                        'Enable AWS PrivateLink'}
                    </label>
                  </div>
                  <div class="form-text">${this.currentProvider === 'aws' ? 
                    'Enable AWS PrivateLink (requires Enterprise tier)' :
                    this.currentProvider === 'azure' ?
                    'Enable Azure Private Link (requires Premium tier)' :
                    'Enable Private Service Connect (requires Premium tier)'}</div>
                  <div id="private-link-warning" class="alert alert-info mt-2" style="display: none;">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>Note:</strong> Private connectivity requires 
                    ${this.currentProvider === 'aws' ? 'Enterprise' : 'Premium'} 
                    pricing tier.
                  </div>
                  
                  ${this.currentProvider === 'aws' ? `
                  <!-- PrivateLink Subnet Mode Options (AWS only) -->
                  <div id="privatelink-subnet-options" class="mt-3" style="display: none;">
                    <label class="form-label fw-semibold">PrivateLink Subnet Configuration</label>
                    <div class="form-text mb-2">Choose how to configure the subnet for PrivateLink VPC Endpoints.</div>
                    
                    <div class="form-check">
                      <input class="form-check-input" type="radio" name="privatelink_subnet_mode" 
                             id="privatelink_subnet_terraform" value="terraform_managed" checked>
                      <label class="form-check-label" for="privatelink_subnet_terraform">
                        <strong>New Subnet</strong>
                        <span class="text-muted d-block small">Terraform will create and manage a new subnet for PrivateLink endpoints</span>
                      </label>
                    </div>
                    <div class="form-check mt-2">
                      <input class="form-check-input" type="radio" name="privatelink_subnet_mode" 
                             id="privatelink_subnet_user" value="user_managed">
                      <label class="form-check-label" for="privatelink_subnet_user">
                        <strong>Existing Subnet</strong>
                        <span class="text-muted d-block small">Provide an existing subnet ID for PrivateLink endpoints</span>
                      </label>
                    </div>
                    
                    <div id="existing-privatelink-subnet-section" class="mt-3" style="display: none;">
                      <label class="form-label" for="existing_privatelink_subnet_id">
                        Existing Subnet ID <span class="text-danger">*</span>
                      </label>
                      <input type="text" class="form-control" id="existing_privatelink_subnet_id" 
                             name="existing_privatelink_subnet_id" 
                             placeholder="e.g., subnet-0abc123def456789a">
                      <div class="form-text">
                        The subnet must be in the same VPC and have connectivity to AWS PrivateLink services.
                      </div>
                    </div>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <div class="configuration-actions d-flex justify-content-between align-items-start gap-3">
                <a href="#/select-provider" class="btn btn-outline-secondary btn-lg" data-navigate>
                  <i class="bi bi-arrow-left me-2"></i>
                  Back to Provider Selection
                </a>
                <div class="configuration-review d-flex flex-column align-items-stretch gap-2">
                  <button type="submit" class="btn btn-primary btn-lg px-4" id="submit-btn"
                          aria-describedby="submit-validation-message">
                    Review Configuration
                    <i class="bi bi-arrow-right ms-2"></i>
                  </button>
                  <div class="alert alert-warning py-2 px-3 mb-0 small text-start"
                       id="submit-validation-message" role="status" aria-live="polite" hidden>
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <span><strong>Review unavailable:</strong> No NAT gateway requires AWS PrivateLink. Enable PrivateLink or select a NAT gateway topology.</span>
                  </div>
                </div>
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
    
    // Subnet size slider elements
    const subnetSizeSliderContainer = document.getElementById('subnet-size-slider-container');
    const subnetSizeSlider = document.getElementById('subnet-size-slider');
    const subnetSizeDisplay = document.querySelector('#subnet-size-display span');
    const subnetIpsDisplay = document.getElementById('subnet-ips-display');
    const subnetNodesDisplay = document.getElementById('subnet-nodes-display');
    const sliderLabelMin = document.getElementById('slider-label-min');
    const sliderLabelMax = document.getElementById('slider-label-max');
    
    // Store current slider limits
    let currentSliderLimits = null;
    let userHasAdjustedSubnetSize = false;
    
    // Function to update slider display values
    const updateSliderDisplay = (prefixSize) => {
      if (!subnetSizeDisplay || !subnetIpsDisplay || !subnetNodesDisplay) return;
      
      const ips = Math.pow(2, 32 - prefixSize);
      // Each Databricks node requires 2 IPs, minus 5 reserved
      const usableIPs = Math.max(0, ips - 5);
      const maxNodes = Math.floor(usableIPs / 2);
      
      subnetSizeDisplay.textContent = prefixSize;
      subnetIpsDisplay.textContent = Utils.formatNumber(ips);
      subnetNodesDisplay.textContent = `~${Utils.formatNumber(maxNodes)}`;
    };
    
    // Function to check if "Create New VPC" is active
    const isCreateNewVpcActive = () => {
      const createNewVpcCheckbox = document.getElementById('create_new_vpc');
      return createNewVpcCheckbox?.checked !== false;
    };
    
    // Function to check if we should show subnet configuration (VPC CIDR, AZs, slider)
    const shouldShowSubnetConfig = () => {
      return isCreateNewVpcActive();
    };
    
    // Function to update slider limits based on current configuration
    const updateSliderLimits = () => {
      const vpcCidr = vpcCidrInput?.value;
      const enablePrivateLink = privateLinkCheckbox?.checked || false;
      const zones = this.getSelectedAvailabilityZones();
      const showSubnetConfig = shouldShowSubnetConfig();
      
      // Determine if we should create service subnet
      // Only create if PrivateLink is enabled AND user chose "New Subnet" (terraform_managed)
      const privatelinkTerraformManaged = document.getElementById('privatelink_subnet_terraform')?.checked ?? true;
      const createServiceSubnet = enablePrivateLink && privatelinkTerraformManaged;
      
      // Always show slider container when subnet configuration is needed
      if (!showSubnetConfig) {
        if (subnetSizeSliderContainer) {
          subnetSizeSliderContainer.style.display = 'none';
        }
        currentSliderLimits = null;
        return;
      }
      
      // Show slider container when subnet configuration is needed
      if (subnetSizeSliderContainer) {
        subnetSizeSliderContainer.style.display = 'block';
      }
      
      // If missing data, show disabled state
      if (!vpcCidr || zones.length === 0) {
        if (subnetSizeSlider) {
          subnetSizeSlider.disabled = true;
          subnetSizeSlider.classList.add('disabled');
        }
        if (sliderLabelMin) {
          sliderLabelMin.textContent = 'Larger subnets';
        }
        if (sliderLabelMax) {
          sliderLabelMax.textContent = 'Smaller subnets';
        }
        // Show placeholder values
        if (subnetSizeDisplay) subnetSizeDisplay.textContent = '--';
        if (subnetIpsDisplay) subnetIpsDisplay.textContent = '--';
        if (subnetNodesDisplay) subnetNodesDisplay.textContent = '--';
        currentSliderLimits = null;
        return;
      }
      
      try {
        const networkCalc = new NetworkCalculator(this.currentProvider);
        const limits = networkCalc.calculateSubnetSizeLimits(vpcCidr, zones.length, enablePrivateLink, createServiceSubnet);
        
        if (limits.error || !limits.valid) {
          if (subnetSizeSlider) {
            subnetSizeSlider.disabled = true;
            subnetSizeSlider.classList.add('disabled');
          }
          currentSliderLimits = null;
          return;
        }
        
        // Check if limits have changed
        const limitsChanged = !currentSliderLimits || 
                              currentSliderLimits.min !== limits.min || 
                              currentSliderLimits.max !== limits.max;
        
        // If limits changed, reset the user adjustment flag
        if (limitsChanged) {
          userHasAdjustedSubnetSize = false;
        }
        
        currentSliderLimits = limits;
        
        // Enable slider
        if (subnetSizeSlider) {
          subnetSizeSlider.disabled = false;
          subnetSizeSlider.classList.remove('disabled');
          
          const previousValue = parseInt(subnetSizeSlider.value, 10);
          subnetSizeSlider.min = limits.min;
          subnetSizeSlider.max = limits.max;
          
          // Determine new value based on user interaction
          let newValue;
          if (userHasAdjustedSubnetSize && !limitsChanged) {
            // Preserve user choice, clamping to new limits if necessary
            newValue = Math.max(limits.min, Math.min(limits.max, previousValue));
          } else {
            // Use default: largest subnet possible (limits.min = smallest prefix = most IPs)
            newValue = limits.min;
          }
          subnetSizeSlider.value = newValue;
          
          // Update labels
          if (sliderLabelMin) {
            const minIps = Math.pow(2, 32 - limits.min);
            sliderLabelMin.textContent = `/${limits.min} (${Utils.formatNumber(minIps)} IPs)`;
          }
          if (sliderLabelMax) {
            const maxIps = Math.pow(2, 32 - limits.max);
            sliderLabelMax.textContent = `/${limits.max} (${Utils.formatNumber(maxIps)} IPs)`;
          }
          
          // Update display
          updateSliderDisplay(parseInt(subnetSizeSlider.value, 10));
        }
      } catch (err) {
        console.error('Error calculating subnet limits:', err);
        if (subnetSizeSlider) {
          subnetSizeSlider.disabled = true;
          subnetSizeSlider.classList.add('disabled');
        }
        currentSliderLimits = null;
      }
    };
    
    // Add slider event listener
    if (subnetSizeSlider) {
      subnetSizeSlider.addEventListener('input', () => {
        const value = parseInt(subnetSizeSlider.value, 10);
        updateSliderDisplay(value);
      });
      
      subnetSizeSlider.addEventListener('change', () => {
        userHasAdjustedSubnetSize = true;
        if (typeof calculateSubnets === 'function') {
          calculateSubnets();
        }
      });
    }
    
    const calculateSubnets = Utils.debounce(() => {
      const vpcCidr = vpcCidrInput?.value;
      const pricingTier = pricingTierSelect?.value;
      const enablePrivateLink = privateLinkCheckbox?.checked || false;
      const zones = this.getSelectedAvailabilityZones();
      const showSubnetConfig = shouldShowSubnetConfig();
      
      // Determine if we should create service subnet
      // Only create if PrivateLink is enabled AND user chose "New Subnet" (terraform_managed)
      const privatelinkTerraformManaged = document.getElementById('privatelink_subnet_terraform')?.checked ?? true;
      const createServiceSubnet = enablePrivateLink && privatelinkTerraformManaged;
      
      // Update slider limits first
      updateSliderLimits();
      
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
        
        // Get custom subnet size from slider if available
        let customSubnetSize = null;
        if (subnetSizeSlider && currentSliderLimits && currentSliderLimits.valid) {
          customSubnetSize = parseInt(subnetSizeSlider.value, 10);
        }
        
        const subnets = networkCalc.allocateSubnets(vpcCidr, zones, pricingTier, enablePrivateLink, customSubnetSize, createServiceSubnet);
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
                    <div><strong>Zone:</strong> ${subnet.availability_zone}</div>
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
    const natGatewayOptions = document.getElementById('nat-gateway-options');
    const natGatewayMode = document.getElementById('nat_gateway_mode');
    const natNoGatewayWarning = document.getElementById('nat-no-gateway-warning');
    const submitButton = document.getElementById('submit-btn');
    const submitValidationMessage = document.getElementById('submit-validation-message');
    const vpcCidrContainer = document.querySelector('input[name="vpc_cidr"]')?.closest('.mb-3');
    const azContainer = document.querySelector('#availability-zones-select')?.closest('.mb-3');

    const updateSubmissionAvailability = () => {
      const noNatWithoutPrivateLink = this.currentProvider === 'aws' &&
        createNewVpcCheckbox?.checked !== false &&
        natGatewayMode?.value === 'none' &&
        !privateLinkCheckbox?.checked;

      if (submitButton) {
        submitButton.disabled = noNatWithoutPrivateLink;
        submitButton.setAttribute('aria-disabled', String(noNatWithoutPrivateLink));
        if (noNatWithoutPrivateLink) {
          submitButton.title = 'Enable AWS PrivateLink or select a NAT gateway topology before reviewing.';
        } else {
          submitButton.removeAttribute('title');
        }
      }

      if (submitValidationMessage) {
        submitValidationMessage.hidden = !noNatWithoutPrivateLink;
      }
    };
    
    // Helper function to update UI based on VPC and subnet mode
    const updateNetworkConfigUI = () => {
      const isCreateNewVpc = createNewVpcCheckbox?.checked !== false;
      
      if (isCreateNewVpc) {
        // Creating new VPC - show VPC CIDR, AZs, subnet slider
        if (existingVpcSection) existingVpcSection.style.display = 'none';
        if (natGatewayOptions) natGatewayOptions.style.display = 'block';
        if (vpcCidrContainer) vpcCidrContainer.style.display = 'block';
        if (azContainer) azContainer.style.display = 'block';
      } else {
        // Using existing VPC
        if (existingVpcSection) existingVpcSection.style.display = 'block';
        if (natGatewayOptions) natGatewayOptions.style.display = 'none';
        
        if (this.currentProvider === 'aws') {
          // Existing AWS networking is fully user-managed.
          if (vpcCidrContainer) vpcCidrContainer.style.display = 'none';
          if (azContainer) azContainer.style.display = 'none';
          if (existingSubnetsSection) existingSubnetsSection.style.display = 'block';
        } else {
          // Azure/GCP - hide VPC CIDR, AZs, subnet slider (existing VNet uses pre-configured subnets)
          if (vpcCidrContainer) vpcCidrContainer.style.display = 'none';
          if (azContainer) azContainer.style.display = 'none';
        }
      }
      
      // Toggle required attributes based on what's visible
      const vpcCidrInput = document.querySelector('input[name="vpc_cidr"]');
      const existingVpcIdInput = document.getElementById('existing_vpc_id');

      if (isCreateNewVpc) {
        // Creating new VPC — VPC CIDR required, existing fields not required
        if (vpcCidrInput) vpcCidrInput.setAttribute('required', '');
        if (existingVpcIdInput) existingVpcIdInput.removeAttribute('required');
        document.querySelectorAll('#existing-vpc-section input').forEach(el => el.removeAttribute('required'));
      } else {
        // Using existing VPC/VNet — existing ID required, VPC CIDR depends on provider
        if (existingVpcIdInput) existingVpcIdInput.setAttribute('required', '');

        if (this.currentProvider === 'aws') {
          if (vpcCidrInput) vpcCidrInput.removeAttribute('required');
        } else {
          // Azure/GCP with existing VNet — no VPC CIDR needed
          if (vpcCidrInput) vpcCidrInput.removeAttribute('required');
        }
      }

      // Update subnet slider and preview visibility
      calculateSubnets();
      updateSubmissionAvailability();
    };

    const updateNatGatewayGuidance = () => {
      if (natNoGatewayWarning) {
        natNoGatewayWarning.style.display = natGatewayMode?.value === 'none' ? 'block' : 'none';
      }
      updateSubmissionAvailability();
    };

    if (createNewVpcCheckbox) {
      createNewVpcCheckbox.addEventListener('change', updateNetworkConfigUI);
    }
    natGatewayMode?.addEventListener('change', updateNatGatewayGuidance);
    updateNatGatewayGuidance();
    
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
    
    // Setup private link validation
    const checkPrivateLinkRequirements = () => {
      const tier = pricingTierSelect?.value;
      const privateLinkEnabled = privateLinkCheckbox?.checked || false;
      const requiredTier = this.currentProvider === 'aws' ? 'ENTERPRISE' : 'PREMIUM';
      
      if (privateLinkEnabled && tier !== requiredTier && privateLinkWarning) {
        privateLinkWarning.style.display = 'block';
      } else if (privateLinkWarning) {
        privateLinkWarning.style.display = 'none';
      }
    };
    
    // Setup PrivateLink subnet mode options (AWS only)
    const privatelinkSubnetOptions = document.getElementById('privatelink-subnet-options');
    const privatelinkSubnetTerraform = document.getElementById('privatelink_subnet_terraform');
    const privatelinkSubnetUser = document.getElementById('privatelink_subnet_user');
    const existingPrivatelinkSubnetSection = document.getElementById('existing-privatelink-subnet-section');
    
    const updatePrivatelinkSubnetUI = () => {
      const privateLinkEnabled = privateLinkCheckbox?.checked || false;
      
      // Show/hide the subnet mode options based on PrivateLink checkbox
      if (privatelinkSubnetOptions) {
        privatelinkSubnetOptions.style.display = privateLinkEnabled ? 'block' : 'none';
      }
      
      // Show/hide the existing subnet ID input based on radio selection
      if (existingPrivatelinkSubnetSection) {
        const userManaged = privatelinkSubnetUser?.checked || false;
        existingPrivatelinkSubnetSection.style.display = userManaged ? 'block' : 'none';
      }
    };
    
    // Add event listeners for PrivateLink subnet mode
    privatelinkSubnetTerraform?.addEventListener('change', () => {
      updatePrivatelinkSubnetUI();
      calculateSubnets(); // Recalculate subnets when subnet mode changes
    });
    privatelinkSubnetUser?.addEventListener('change', () => {
      updatePrivatelinkSubnetUI();
      calculateSubnets(); // Recalculate subnets when subnet mode changes
    });
    
    privateLinkCheckbox?.addEventListener('change', checkPrivateLinkRequirements);
    pricingTierSelect?.addEventListener('change', checkPrivateLinkRequirements);
    
    // Real-time subnet calculation event listeners
    // Note: calculateSubnets is already defined earlier in the function
    vpcCidrInput?.addEventListener('input', calculateSubnets);
    pricingTierSelect?.addEventListener('change', () => {
      checkPrivateLinkRequirements();
      calculateSubnets();
    });
    privateLinkCheckbox?.addEventListener('change', () => {
      checkPrivateLinkRequirements();
      updatePrivatelinkSubnetUI();
      updateSubmissionAvailability();
      calculateSubnets();
    });
    
    // Note: Change listeners for availability zone selects are added above in the initialization section
    // Note: Remove button handlers are added above in the addAvailabilityZoneRow function
    
    // Trigger initial calculations - always call to show slider/preview when Create New VPC is active
    setTimeout(calculateSubnets, 500);
    
    // Setup form submission
    document.getElementById('config-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const config = Object.fromEntries(formData);
      config.provider = this.currentProvider;
      config.create_new_vpc = document.getElementById('create_new_vpc')?.checked !== false;
      config.enable_private_link = document.getElementById('enable_private_link')?.checked || false;
      if (this.currentProvider === 'aws') {
        config.nat_gateway_mode = document.getElementById('nat_gateway_mode')?.value || 'per_az';
      }
      
      // AWS-specific: Handle PrivateLink subnet mode
      if (this.currentProvider === 'aws' && config.enable_private_link) {
        config.privatelink_subnet_mode = document.querySelector('input[name="privatelink_subnet_mode"]:checked')?.value || 'terraform_managed';
        if (config.privatelink_subnet_mode === 'user_managed') {
          config.existing_privatelink_subnet_id = document.getElementById('existing_privatelink_subnet_id')?.value?.trim() || '';
        } else {
          config.existing_privatelink_subnet_id = '';
        }
      }
      
      // AWS-specific: Existing VPC networking is fully user-managed.
      if (this.currentProvider === 'aws' && !config.create_new_vpc) {
        const subnetInputs = document.querySelectorAll('.existing-subnet-input');
        config.existing_subnet_ids = Array.from(subnetInputs)
          .map(input => input.value.trim())
          .filter(val => val !== '');
        config.existing_security_group_id = document.getElementById('existing_security_group_id')?.value?.trim() || '';
        
        // Get existing VPC ID
        config.existing_vpc_id = document.getElementById('existing_vpc_id')?.value?.trim() || '';
      }

      // Azure-specific: Handle existing VNet
      if (this.currentProvider === 'azure' && !config.create_new_vpc) {
        config.existing_vpc_id = document.getElementById('existing_vpc_id')?.value?.trim() || '';
        config.existing_public_subnet_name = document.getElementById('existing_public_subnet_name')?.value?.trim() || '';
        config.existing_private_subnet_name = document.getElementById('existing_private_subnet_name')?.value?.trim() || '';
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
      // Azure/GCP with existing VNet use pre-configured subnets — no CIDR/AZ needed
      const needsSubnetConfig = config.create_new_vpc;
      
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
            // Determine if we should create service subnet
            // Only create if PrivateLink is enabled AND user chose "New Subnet" (terraform_managed)
            const createServiceSubnet = config.enable_private_link && 
              (config.privatelink_subnet_mode === 'terraform_managed' || !config.privatelink_subnet_mode);
            
            const subnets = networkCalc.allocateSubnets(
              config.vpc_cidr,
              zones,
              config.pricing_tier,
              config.enable_private_link,
              null, // customSubnetSize
              createServiceSubnet
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
      this.updateNavbar();
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
      <div class="container my-5">
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
                        <td class="fw-semibold">Project Prefix:</td>
                        <td><code>${config.project_prefix}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Region:</td>
                        <td><code>${config.region}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Pricing Tier:</td>
                        <td>
                          <span class="badge bg-${pricingBadgeClass}">${config.pricing_tier}</span>
                        </td>
                      </tr>
                      ${config.provider === 'azure' && config.resource_group_name ? `
                        <tr>
                          <td class="fw-semibold">Resource Group:</td>
                          <td><code>${config.resource_group_name}</code></td>
                        </tr>
                      ` : ''}
                      ${config.provider === 'gcp' && config.project_id ? `
                        <tr>
                          <td class="fw-semibold">GCP Project ID:</td>
                          <td><code>${config.project_id}</code></td>
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
                      ${config.provider === 'azure' && !config.create_new_vpc ? `
                      <tr>
                        <td class="fw-semibold">Public Subnet:</td>
                        <td><code>${config.existing_public_subnet_name || 'N/A'}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Private Subnet:</td>
                        <td><code>${config.existing_private_subnet_name || 'N/A'}</code></td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'gcp' && !config.create_new_vpc ? `
                      <tr>
                        <td class="fw-semibold">Subnet Name:</td>
                        <td><code>${config.existing_subnet_name || 'N/A'}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Pod IP Range:</td>
                        <td><code>${config.existing_pod_range_name || 'N/A'}</code></td>
                      </tr>
                      <tr>
                        <td class="fw-semibold">Service IP Range:</td>
                        <td><code>${config.existing_service_range_name || 'N/A'}</code></td>
                      </tr>
                      ` : ''}
                      ${config.vpc_cidr && config.create_new_vpc ? `
                      <tr>
                        <td class="fw-semibold">${config.provider === 'azure' ? 'VNet CIDR:' : 'VPC CIDR:'}</td>
                        <td><code>${config.vpc_cidr}</code></td>
                      </tr>
                      ` : ''}
                      ${config.provider === 'aws' && config.create_new_vpc ? `
                      <tr>
                        <td class="fw-semibold">NAT Gateway:</td>
                        <td><span class="badge bg-${config.nat_gateway_mode === 'none' ? 'warning' : 'primary'}">${config.nat_gateway_mode === 'none' ? 'None' : config.nat_gateway_mode === 'single' ? 'Single shared' : 'One per AZ'}</span></td>
                      </tr>
                      ` : ''}
                      ${(config.availability_zones && config.availability_zones.length > 0) ? `
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
                      ${config.create_new_vpc && config.calculated_subnets && config.calculated_subnets.length > 0 ? `
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
                        subnet.subnet_type === 'service' ? 'warning' :
                        subnet.subnet_type === 'host' ? 'info' : 'secondary';
                      return `
                        <div class="col-md-6 col-lg-4">
                          <div class="card border-start border-4 border-${typeColor}">
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
                  <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" id="confirm" required>
                    <label class="form-check-label fw-semibold" for="confirm">
                      I confirm the configuration is correct
                    </label>
                  </div>
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
                <button type="submit" class="btn btn-primary btn-lg px-5" id="generate-btn" disabled>
                  <i class="bi bi-download me-2"></i>
                  Generate & Download Project
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    this.render(content);
    Utils.updateProgress(3);
    
    document.getElementById('confirm').addEventListener('change', (e) => {
      document.getElementById('generate-btn').disabled = !e.target.checked;
    });
    
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
        
        Utils.downloadFile(zipBlob, filename);
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
    
    // Check vault status
    const vaultExists = Utils.hasCredentialsVault();
    const vaultUnlocked = Utils.isVaultUnlocked();
    const vaultLockedWithCredentials = vaultExists && !vaultUnlocked;
    
    // Get stored credentials for the current provider (async)
    let credentials = {};
    if (vaultUnlocked) {
      credentials = await Utils.getProviderCredentials(config.provider) || {};
    }
    
    // Check if credentials are available
    const hasCredentials = credentials.accountId || credentials.clientId || credentials.clientSecret;
    
    // Build export command with actual or placeholder values
    // For clipboard (original values)
    const accountIdValue = credentials.accountId || '<account-id>';
    const clientIdValue = credentials.clientId || '<client-id>';
    const clientSecretValue = credentials.clientSecret || '<client-secret>';
    
    // For display (masked values)
    const accountIdDisplay = credentials.accountId ? Utils.maskSensitiveValue(credentials.accountId) : '&lt;account-id&gt;';
    const clientIdDisplay = credentials.clientId ? Utils.maskSensitiveValue(credentials.clientId) : '&lt;client-id&gt;';
    const clientSecretDisplay = credentials.clientSecret ? Utils.maskSensitiveValue(credentials.clientSecret) : '&lt;client-secret&gt;';
    
    // Build the actual export command for clipboard
    const exportCmd = config.provider === 'azure'
      ? `export DATABRICKS_CLIENT_ID="${clientIdValue}"
export DATABRICKS_CLIENT_SECRET="${clientSecretValue}"`
      : `export TF_VAR_databricks_account_id="${accountIdValue}"
export DATABRICKS_CLIENT_ID="${clientIdValue}"
export DATABRICKS_CLIENT_SECRET="${clientSecretValue}"`;
    
    // Build the masked display version
    const exportCmdDisplay = config.provider === 'azure'
      ? `export DATABRICKS_CLIENT_ID="${clientIdDisplay}"
export DATABRICKS_CLIENT_SECRET="${clientSecretDisplay}"`
      : `export TF_VAR_databricks_account_id="${accountIdDisplay}"
export DATABRICKS_CLIENT_ID="${clientIdDisplay}"
export DATABRICKS_CLIENT_SECRET="${clientSecretDisplay}"`;
    
    // Obfuscate the real command for data attribute (security measure)
    const exportCmdObfuscated = Utils.obfuscateHtmlContent(exportCmd);
    
    // Vault unlock banner (shown when vault is locked but exists)
    const vaultUnlockBanner = vaultLockedWithCredentials ? `
      <div class="alert alert-warning mb-4" id="vault-unlock-banner">
        <div class="d-flex align-items-center justify-content-between">
          <div>
            <i class="bi bi-lock-fill me-2"></i>
            <strong>Credentials Vault Locked</strong>
            <span class="ms-2 text-muted">Unlock to use your saved credentials in the commands below.</span>
          </div>
          <button type="button" class="btn btn-warning btn-sm" id="btn-unlock-vault-download">
            <i class="bi bi-unlock me-1"></i>Unlock Vault
          </button>
        </div>
      </div>
    ` : '';
    
    // Credentials status indicator
    const credentialsStatus = hasCredentials 
      ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Using saved credentials</span>'
      : vaultLockedWithCredentials
        ? '<span class="badge bg-warning text-dark"><i class="bi bi-lock me-1"></i>Vault locked - unlock to use credentials</span>'
        : '<span class="badge bg-secondary"><i class="bi bi-info-circle me-1"></i>Replace placeholders with your credentials</span>';
    
    const content = `
      <div class="container my-5">
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
                        <td class="fw-semibold">Project Prefix:</td>
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
                <button type="button" class="btn btn-download btn-lg mb-3" id="download-project-btn">
                  <i class="bi bi-download me-2"></i>
                  <span class="download-filename">${config.project_prefix || 'databricks'}-${config.provider}-terraform.zip</span>
                </button>
                <p class="text-muted mb-4">
                  Complete Terraform project with all configuration files, 
                  modules, documentation, and deployment instructions.
                </p>
                <div class="text-muted small">
                  <i class="bi bi-info-circle me-1"></i>
                  The download should have started automatically. If not, click above to download.
                </div>
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
                      <p class="mb-2">Set up your cloud provider credentials according to the provider-specific instructions in the README.</p>
                      <div class="command-block" data-command="${config.provider === 'aws' ? 'aws configure' : config.provider === 'azure' ? 'az login' : 'gcloud auth login'}">
                        <code>${config.provider === 'aws' ? 'aws configure' : config.provider === 'azure' ? 'az login' : 'gcloud auth login'}</code>
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
                      <h6 class="fw-bold mb-2">Prepare Deployment ${credentialsStatus}</h6>
                      ${vaultUnlockBanner}
                      <p class="mb-2">Export sensitive variables as environment variables to avoid storing them in <code>terraform.tfvars</code>. See the README for instructions on creating a Service Principal.</p>
                      <div class="command-block sensitive-command ${hasCredentials ? 'has-credentials' : ''}" data-sensitive-cmd="${exportCmdObfuscated}">
                        <code class="sensitive-display">${exportCmdDisplay}</code>
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
    
    // Setup unlock vault button on download page
    const unlockVaultDownloadBtn = document.getElementById('btn-unlock-vault-download');
    if (unlockVaultDownloadBtn) {
      unlockVaultDownloadBtn.addEventListener('click', async () => {
        // Set flag to prevent opening credentials modal after unlock
        this._unlockFromDownloadPage = true;
        
        // Show unlock modal
        const unlockModal = new bootstrap.Modal(document.getElementById('masterPasswordUnlockModal'));
        
        // Handle unlock success - refresh download page
        const modalEl = document.getElementById('masterPasswordUnlockModal');
        const onModalHidden = async () => {
          if (Utils.isVaultUnlocked()) {
            // Re-render the download page with credentials
            await this.renderDownload();
          }
          modalEl.removeEventListener('hidden.bs.modal', onModalHidden);
        };
        modalEl.addEventListener('hidden.bs.modal', onModalHidden);
        
        unlockModal.show();
      });
    }
    
    // Setup copy functionality for command blocks
    document.querySelectorAll('.command-copy-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const commandBlock = this.closest('.command-block');
        let command;
        
        // Check if this is a sensitive command (with obfuscated data)
        if (commandBlock.classList.contains('sensitive-command')) {
          const obfuscatedCmd = commandBlock.getAttribute('data-sensitive-cmd');
          if (obfuscatedCmd) {
            // Deobfuscate to get the real command
            command = Utils.deobfuscateValue(obfuscatedCmd);
          }
        }
        
        // Fallback to standard command retrieval
        if (!command) {
          command = commandBlock.getAttribute('data-command') || commandBlock.querySelector('code').textContent.trim();
          // Decode HTML entities for clipboard (for escaped < and > in placeholders)
          command = command.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
        }
        
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
    this.updateNavbar();
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
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new App();
  // Make app globally available for modal buttons
  window.app = app;
});

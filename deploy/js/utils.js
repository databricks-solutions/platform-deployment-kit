/**
 * Shared application utility functions
 */

class Utils {
  /**
   * Show flash message
   */
  static showFlashMessage(message, type = 'info') {
    const container = document.getElementById('flash-messages');
    if (!container) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    
    const icons = {
      error: 'exclamation-triangle-fill',
      warning: 'exclamation-triangle',
      success: 'check-circle-fill',
      info: 'info-circle-fill'
    };
    
    alertDiv.innerHTML = `
      <i class="bi bi-${icons[type] || icons.info} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    container.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }

  /**
   * Show loading overlay
   */
  static showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = document.getElementById('loading-message');
    if (overlay) {
      if (messageEl) messageEl.textContent = message;
      overlay.classList.remove('d-none');
    }
  }

  /**
   * Hide loading overlay
   */
  static hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('d-none');
    }
  }

  /**
   * Update progress indicator
   */
  static updateProgress(step) {
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-indicator');
    
    if (!progressBar || !progressContainer) return;
    
    const progress = (step / 3) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    
    if (step > 0) {
      progressContainer.style.display = 'block';
    }
    
    // Update step indicators
    for (let i = 1; i <= 3; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      if (stepEl) {
        const icon = stepEl.querySelector('i');
        if (i <= step) {
          stepEl.classList.add('text-primary', 'fw-semibold');
          if (icon) {
            icon.className = `bi bi-${i}-circle-fill`;
          }
        } else {
          stepEl.classList.remove('text-primary', 'fw-semibold');
          if (icon) {
            icon.className = `bi bi-${i}-circle`;
          }
        }
      }
    }
  }

  /**
   * Debounce function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Format date
   */
  static formatDate(date = new Date()) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  /**
   * Get provider display name
   */
  static getProviderName(provider) {
    const names = {
      aws: 'Amazon Web Services',
      azure: 'Microsoft Azure',
      gcp: 'Google Cloud Platform'
    };
    return names[provider] || provider;
  }

  /**
   * Get provider icon class
   */
  static getProviderIcon(provider) {
    const icons = {
      aws: 'bi-amazon text-warning',
      azure: 'bi-microsoft text-info',
      gcp: 'bi-google text-success'
    };
    return icons[provider] || 'bi-cloud';
  }

  /**
   * Download file
   */
  static downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get from localStorage
   */
  static getStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set to localStorage
   */
  static setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save the config. Sensitive values (SENSITIVE_CONFIG_KEYS) go to
   * sessionStorage, which is per tab and cleared when it closes, instead of
   * localStorage, which persists and is shared across the GitHub Pages origin.
   */
  static saveConfig(config) {
    const safe = {};
    const sensitive = {};
    Object.entries(config || {}).forEach(([key, value]) => {
      (Utils.SENSITIVE_CONFIG_KEYS.includes(key) ? sensitive : safe)[key] = value;
    });
    try {
      sessionStorage.setItem('config-sensitive', JSON.stringify(sensitive));
    } catch {
      // sessionStorage unavailable: sensitive values stay in memory only
    }
    return Utils.setStorage('config', safe);
  }

  /**
   * Load the config, merging this tab's sensitive values back in. Re-saving
   * scrubs sensitive values written to localStorage by earlier versions.
   */
  static loadConfig() {
    let sensitive = {};
    try {
      sensitive = JSON.parse(sessionStorage.getItem('config-sensitive')) || {};
    } catch {
      sensitive = {};
    }
    const stored = Utils.getStorage('config');
    const config = { ...(stored || {}), ...sensitive };
    if (stored) {
      Utils.saveConfig(config);
    }
    return config;
  }

  /**
   * Clear this app's storage. Removes only the app's own keys, because
   * localStorage is shared with every other site on the same origin.
   */
  static clearStorage() {
    try {
      ['config', 'provider', 'step'].forEach(key => localStorage.removeItem(key));
      sessionStorage.removeItem('config-sensitive');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escape HTML
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format number with commas
   */
  static formatNumber(num) {
    return num.toLocaleString('en-US');
  }

  /**
   * Wait for JSZip library to be available
   * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
   * @returns {Promise<void>}
   */
  static async waitForJSZip(timeout = 5000) {
    if (typeof JSZip !== 'undefined') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100; // Check every 100ms

      const checkJSZip = setInterval(() => {
        if (typeof JSZip !== 'undefined') {
          clearInterval(checkJSZip);
          resolve();
        } else if (Date.now() - startTime >= timeout) {
          clearInterval(checkJSZip);
          reject(new Error('JSZip library failed to load. Please check your internet connection and try again.'));
        }
      }, checkInterval);
    });
  }

}

// Config fields kept out of localStorage: cloud/Databricks identifiers,
// network resource IDs, and people's emails (all clouds).
Utils.SENSITIVE_CONFIG_KEYS = [
  'databricks_account_id',
  'aws_account_id',
  'azure_subscription_id',
  'project_id',
  'vpc_network_project_id',
  'metastore_id',
  'workspace_admin_email',
  'databricks_admin_user',
  'azure_admin_user',
  'google_service_account_email',
  'existing_vpc_id',
  'existing_subnet_ids',
  'existing_security_group_id',
  'backend_rest_aws_vpce_id',
  'backend_relay_aws_vpce_id'
];

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}

// Options page functionality for Tab'd extension

class TabdOptions {
  constructor() {
    this.defaultKnownSites = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'stackoverflow.com',
      'stackexchange.com',
      'developer.mozilla.org',
      'docs.python.org',
      'docs.microsoft.com',
      'docs.google.com',
      'nodejs.org',
      'reactjs.org',
      'vuejs.org',
      'angular.io',
      'laravel.com',
      'django-project.com',
      'flask.palletsprojects.com',
      'fastapi.tiangolo.com',
      'spring.io',
      'kubernetes.io',
      'docker.com',
      'aws.amazon.com',
      'cloud.google.com',
      'azure.microsoft.com',
      'digitalocean.com',
      'heroku.com',
      'netlify.com',
      'vercel.com',
      'codepen.io',
      'jsfiddle.net',
      'codesandbox.io',
      'replit.com',
      'glitch.com',
      'medium.com',
      'dev.to',
      'hashnode.com',
      'freecodecamp.org',
      'w3schools.com',
      'tutorialspoint.com',
      'geeksforgeeks.org',
      'leetcode.com',
      'hackerrank.com',
      'codewars.com',
      'topcoder.com',
      'codeforces.com',
      'atcoder.jp',
      'reddit.com/r/programming',
      'reddit.com/r/webdev',
      'reddit.com/r/javascript',
      'reddit.com/r/python',
      'hackernews.ycombinator.com'
    ];

    this.initializeOptions();
    this.setupEventListeners();
  }

  async initializeOptions() {
    try {
      const options = await this.loadOptions();
      this.populateOptionsFromStorage(options);
    } catch (error) {
      console.error('Error loading options:', error);
      // Use defaults if loading fails
      this.setDefaultOptions();
    }
  }

  async loadOptions() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        clipboardTracking: 'known',
        customDomains: '',
        githubIntegration: true
      }, resolve);
    });
  }

  async saveOptions() {
    const options = this.getOptionsFromForm();
    
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(options, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  populateOptionsFromStorage(options) {
    // Set clipboard tracking option
    const trackingRadio = document.querySelector(`input[name="clipboard-tracking"][value="${options.clipboardTracking}"]`);
    if (trackingRadio) {
      trackingRadio.checked = true;
    }

    // Set custom domains
    const customDomainsTextarea = document.getElementById('custom-domains');
    if (customDomainsTextarea) {
      customDomainsTextarea.value = options.customDomains || '';
    }

    // Set GitHub integration
    const githubCheckbox = document.getElementById('github-integration');
    if (githubCheckbox) {
      githubCheckbox.checked = options.githubIntegration;
    }

    // Show/hide custom domains container
    this.toggleCustomDomainsContainer();
  }

  getOptionsFromForm() {
    const clipboardTracking = document.querySelector('input[name="clipboard-tracking"]:checked')?.value || 'known';
    const customDomains = document.getElementById('custom-domains')?.value || '';
    const githubIntegration = document.getElementById('github-integration')?.checked || false;

    return {
      clipboardTracking,
      customDomains,
      githubIntegration
    };
  }

  setDefaultOptions() {
    // Set default clipboard tracking to "known"
    const knownRadio = document.getElementById('tracking-known');
    if (knownRadio) {
      knownRadio.checked = true;
    }

    // Set GitHub integration to enabled
    const githubCheckbox = document.getElementById('github-integration');
    if (githubCheckbox) {
      githubCheckbox.checked = true;
    }

    // Clear custom domains
    const customDomainsTextarea = document.getElementById('custom-domains');
    if (customDomainsTextarea) {
      customDomainsTextarea.value = '';
    }
  }

  setupEventListeners() {
    // Save button
    const saveButton = document.getElementById('save-options');
    if (saveButton) {
      saveButton.addEventListener('click', this.handleSave.bind(this));
    }

    // Radio button changes to show/hide custom domains
    const radioButtons = document.querySelectorAll('input[name="clipboard-tracking"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', this.toggleCustomDomainsContainer.bind(this));
    });

    // Form validation for custom domains
    const customDomainsTextarea = document.getElementById('custom-domains');
    if (customDomainsTextarea) {
      customDomainsTextarea.addEventListener('input', this.validateCustomDomains.bind(this));
    }

    // Test connection button
    const testButton = document.getElementById('test-connection');
    if (testButton) {
      testButton.addEventListener('click', this.handleTestConnection.bind(this));
    }
  }

  toggleCustomDomainsContainer() {
    const customRadio = document.getElementById('tracking-custom');
    const container = document.getElementById('custom-domains-container');
    
    if (customRadio && container) {
      if (customRadio.checked) {
        container.classList.add('show');
      } else {
        container.classList.remove('show');
      }
    }
  }

  validateCustomDomains() {
    const textarea = document.getElementById('custom-domains');
    if (!textarea) return;

    const value = textarea.value;
    const lines = value.split('\n').filter(line => line.trim() !== '');
    
    // Basic validation - check for invalid characters or patterns
    const invalidLines = lines.filter(line => {
      const domain = line.trim();
      // Basic domain validation regex
      const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
      return !domainRegex.test(domain);
    });

    // Visual feedback (you could enhance this)
    if (invalidLines.length > 0) {
      textarea.style.borderColor = '#dc2626';
    } else {
      textarea.style.borderColor = '#d1d5db';
    }
  }

  async handleSave() {
    const saveButton = document.getElementById('save-options');
    const statusMessage = document.getElementById('status-message');
    
    // Disable save button during save
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';
    }

    try {
      // Validate custom domains if custom tracking is selected
      const customRadio = document.getElementById('tracking-custom');
      if (customRadio && customRadio.checked) {
        const customDomainsTextarea = document.getElementById('custom-domains');
        const domains = customDomainsTextarea.value.split('\n')
          .map(line => line.trim())
          .filter(line => line !== '');
        
        if (domains.length === 0) {
          throw new Error('Please enter at least one domain for custom tracking.');
        }

        // Validate each domain
        const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        const invalidDomains = domains.filter(domain => !domainRegex.test(domain));
        
        if (invalidDomains.length > 0) {
          throw new Error(`Invalid domain(s): ${invalidDomains.join(', ')}`);
        }
      }

      // Save options
      await this.saveOptions();

      // Show success message
      if (statusMessage) {
        statusMessage.textContent = 'Options saved successfully!';
        statusMessage.className = 'status-message success';
        statusMessage.style.display = 'block';
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          statusMessage.style.display = 'none';
        }, 3000);
      }

    } catch (error) {
      console.error('Error saving options:', error);
      
      // Show error message
      if (statusMessage) {
        statusMessage.textContent = error.message || 'Error saving options. Please try again.';
        statusMessage.className = 'status-message error';
        statusMessage.style.display = 'block';
      }
    } finally {
      // Re-enable save button
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Options';
      }
    }
  }

  async handleTestConnection() {
    const testButton = document.getElementById('test-connection');
    const statusMessage = document.getElementById('status-message');
    const originalText = testButton.textContent;
    
    // Disable test button during test
    testButton.disabled = true;
    testButton.textContent = 'Testing...';

    try {
      // Send a test message to background script
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_CONNECTION'
      });

      if (response && response.success) {
        // Show success message
        if (statusMessage) {
          statusMessage.textContent = '✓ VS Code connection successful!';
          statusMessage.className = 'status-message success';
          statusMessage.style.display = 'block';
          
          // Hide message after 3 seconds
          setTimeout(() => {
            statusMessage.style.display = 'none';
          }, 3000);
        }
      } else {
        // Show error message
        if (statusMessage) {
          statusMessage.textContent = '✗ VS Code not connected. Make sure the native host is installed and VS Code is running.';
          statusMessage.className = 'status-message error';
          statusMessage.style.display = 'block';
        }
      }

    } catch (error) {
      console.error('Connection test failed:', error);
      
      // Show error message
      if (statusMessage) {
        statusMessage.textContent = '✗ Connection test failed. Please try again.';
        statusMessage.className = 'status-message error';
        statusMessage.style.display = 'block';
      }
    } finally {
      // Re-enable test button
      testButton.disabled = false;
      testButton.textContent = originalText;
    }
  }

  // Utility method to get the effective domains for clipboard tracking
  static async getEffectiveTrackingDomains() {
    const options = await new Promise((resolve) => {
      chrome.storage.sync.get({
        clipboardTracking: 'known',
        customDomains: '',
        githubIntegration: true
      }, resolve);
    });

    const tabdOptions = new TabdOptions();

    switch (options.clipboardTracking) {
      case 'all':
        return ['<all_urls>'];
      
      case 'known':
        return tabdOptions.defaultKnownSites;
      
      case 'custom':
        return options.customDomains
          .split('\n')
          .map(line => line.trim())
          .filter(line => line !== '');
      
      case 'none':
      default:
        return [];
    }
  }

  // Utility method to check if GitHub integration is enabled
  static async isGithubIntegrationEnabled() {
    const options = await new Promise((resolve) => {
      chrome.storage.sync.get({
        githubIntegration: true
      }, resolve);
    });

    return options.githubIntegration;
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TabdOptions();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TabdOptions;
}

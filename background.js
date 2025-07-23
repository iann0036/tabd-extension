// Background service worker for Tab'd extension
// Handles communication with native messaging host

class TabdBackground {
  constructor() {
    this.vscodePort = null;
    this.isConnecting = false;
    
    this.initializeNativeMessaging();
    this.setupMessageListeners();
  }

  initializeNativeMessaging() {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      console.log('Connecting to native messaging host...');
      this.vscodePort = chrome.runtime.connectNative('com.tabd.vscode');
      
      this.vscodePort.onMessage.addListener((message) => {
        console.log('Received message from native host:', message);
      });

      this.vscodePort.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        console.log('Disconnected from native host:', error ? error.message : 'Unknown reason');
        
        this.vscodePort = null;
        this.isConnecting = false;
        
        // Simple retry after 5 seconds
        setTimeout(() => this.initializeNativeMessaging(), 5000);
      });

      console.log('Connected to native messaging host');
      this.isConnecting = false;

    } catch (error) {
      console.log('Native messaging host not available:', error.message);
      this.vscodePort = null;
      this.isConnecting = false;
      
      // Retry after 5 seconds
      setTimeout(() => this.initializeNativeMessaging(), 5000);
    }
  }

  setupMessageListeners() {
    // Handle extension icon click
    chrome.action.onClicked.addListener((tab) => {
      chrome.runtime.openOptionsPage();
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'CLIPBOARD_COPY') {
        this.handleClipboardCopy(message.data, sender.tab);
      } else if (message.type === 'CHECK_TRACKING_ENABLED') {
        this.checkTrackingEnabled(sender.tab.url, sendResponse);
        return true; // Will respond asynchronously
      } else if (message.type === 'TEST_CONNECTION') {
        this.testConnection(sendResponse);
        return true; // Will respond asynchronously
      }
      return true;
    });
  }

  async checkTrackingEnabled(url, sendResponse) {
    try {
      const options = await this.getOptions();
      const isEnabled = await this.isTrackingEnabledForUrl(url, options);
      sendResponse({ enabled: isEnabled });
    } catch (error) {
      console.error('Error checking tracking status:', error);
      sendResponse({ enabled: false });
    }
  }

  async getOptions() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        clipboardTracking: 'known',
        customDomains: '',
        githubIntegration: false
      }, resolve);
    });
  }

  async isTrackingEnabledForUrl(url, options) {
    if (options.clipboardTracking === 'none') {
      return false;
    }

    if (options.clipboardTracking === 'all') {
      return true;
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (options.clipboardTracking === 'known') {
      const knownSites = [
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
      
      return knownSites.some(site => {
        if (site.includes('/')) {
          // Handle domains with path prefixes
          const [siteDomain, sitePath] = site.split('/', 2);
          const urlPath = urlObj.pathname;
          const domainMatches = hostname === siteDomain || hostname.endsWith('.' + siteDomain);
          const pathMatches = urlPath.startsWith('/' + sitePath);
          return domainMatches && pathMatches;
        } else {
          // Handle regular domains
          return hostname === site || hostname.endsWith('.' + site);
        }
      });
    }

    if (options.clipboardTracking === 'custom') {
      const customDomains = options.customDomains
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');

      return customDomains.some(domain => {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2);
          return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
        } else {
          return hostname === domain || hostname.endsWith('.' + domain);
        }
      });
    }

    return false;
  }

  testConnection(sendResponse) {
    try {
      // Test if we have an active connection to the native host
      if (this.vscodePort) {
        sendResponse({ success: true, message: 'Connected to VS Code' });
      } else {
        sendResponse({ success: false, message: 'Not connected to VS Code' });
      }
    } catch (error) {
      sendResponse({ success: false, message: 'Connection test failed: ' + error.message });
    }
  }

  async handleClipboardCopy(clipboardData, tab) {
    const payload = {
      type: 'clipboard_copy',
      text: clipboardData.text,
      timestamp: clipboardData.timestamp,
      url: clipboardData.url,
      title: clipboardData.title
    };

    // Simple retry logic - try 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (this.vscodePort) {
        try {
          this.vscodePort.postMessage(payload);
          console.log('Sent clipboard data to native host');
          return; // Success
        } catch (error) {
          console.error(`Send attempt ${attempt} failed:`, error);
          
          // Reset port on error
          this.vscodePort = null;
          
          // Don't retry on last attempt
          if (attempt < 3) {
            // Try to reconnect
            this.initializeNativeMessaging();
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        console.log(`Attempt ${attempt}: Native messaging not connected`);
        
        // Try to connect
        this.initializeNativeMessaging();
        
        // Wait a bit before retry
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.error('Failed to send clipboard data after 3 attempts');
  }
}

// Initialize the background service
const tabdBackground = new TabdBackground();

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
});

chrome.runtime.onInstalled.addListener(() => {
});

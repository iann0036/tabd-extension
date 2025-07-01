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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'CLIPBOARD_COPY') {
        this.handleClipboardCopy(message.data, sender.tab);
      }
      return true;
    });
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
  console.log('Tab\'d extension started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab\'d extension installed');
});

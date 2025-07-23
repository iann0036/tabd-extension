// Content script for Tab'd extension
// Detects clipboard copy operations on web pages

class TabdContentScript {
  constructor() {
    this.setupClipboardMonitoring();
    this.injectPageScript();
  }

  setupClipboardMonitoring() {
    // Monitor copy events - this catches ALL copy operations:
    // - Keyboard shortcuts (Ctrl+C / Cmd+C)
    // - Right-click context menu
    // - Edit menu commands
    // - Browser UI copy buttons
    document.addEventListener('copy', this.handleCopyEvent.bind(this), true);
    
    // Listen for messages from injected script (for programmatic clipboard API calls)
    window.addEventListener('message', this.handlePageMessage.bind(this));
  }

  injectPageScript() {
    // Inject a script into the page context to monitor clipboard API calls
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('tabd-injected.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  async handleCopyEvent(event) {
    try {
      // The copy event provides access to the clipboard data being copied
      const selection = window.getSelection();
      const selectedText = selection.toString();
      
      if (selectedText.length > 0) {
        await this.sendClipboardData({
          text: selectedText
        });
      }
    } catch (error) {
      console.debug('Tab\'d: Error handling copy event:', error);
    }
  }

  handlePageMessage(event) {
    // Handle messages from injected script
    if (event.source !== window || !event.data.type) return;
    
    if (event.data.type === 'CLIPBOARD_API_CALL') {
      this.sendClipboardData({
        text: event.data.text
      });
    }
  }

  async sendClipboardData(data) {
    try {
      // Send only essential data: timestamp, text, title, and URL
      const essentialData = {
        text: data.text,
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title
      };

      // Send to background script
      chrome.runtime.sendMessage({
        type: 'CLIPBOARD_COPY',
        data: essentialData
      });

    } catch (error) {
      console.error('Tab\'d: Error sending clipboard data:', error);
    }
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TabdContentScript();
  });
} else {
  new TabdContentScript();
}

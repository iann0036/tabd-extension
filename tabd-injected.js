// Injected script for Tab'd extension
// Runs in page context to monitor Clipboard API calls

(function() {
  'use strict';

  // Store original clipboard methods
  const originalWriteText = navigator.clipboard?.writeText;
  const originalWrite = navigator.clipboard?.write;
  const originalExecCommand = document.execCommand;

  // Override navigator.clipboard.writeText
  if (navigator.clipboard && originalWriteText) {
    navigator.clipboard.writeText = function(text) {
      // Notify content script
      window.postMessage({
        type: 'CLIPBOARD_API_CALL',
        method: 'writeText',
        text: text,
        timestamp: Date.now()
      }, '*');
      
      // Call original method
      return originalWriteText.call(this, text);
    };
  }

  // Override navigator.clipboard.write
  if (navigator.clipboard && originalWrite) {
    navigator.clipboard.write = function(data) {
      try {
        // Extract text from ClipboardItem if possible
        if (data && data.length > 0) {
          const item = data[0];
          if (item instanceof ClipboardItem) {
            // Try to get text representation
            for (const type of item.types) {
              if (type === 'text/plain') {
                item.getType(type).then(blob => {
                  blob.text().then(text => {
                    window.postMessage({
                      type: 'CLIPBOARD_API_CALL',
                      method: 'write',
                      text: text,
                      timestamp: Date.now()
                    }, '*');
                  });
                });
                break;
              }
            }
          }
        }
      } catch (error) {
        console.debug('Tab\'d: Error extracting clipboard data:', error);
      }
      
      // Call original method
      return originalWrite.call(this, data);
    };
  }

  // Override document.execCommand for copy operations
  document.execCommand = function(command, showUI, value) {
    if (command === 'copy') {
      try {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        if (selectedText.length > 0) {
          window.postMessage({
            type: 'CLIPBOARD_API_CALL',
            method: 'execCommand',
            text: selectedText,
            timestamp: Date.now()
          }, '*');
        }
      } catch (error) {
        console.debug('Tab\'d: Error handling execCommand copy:', error);
      }
    }
    
    // Call original method
    return originalExecCommand.call(this, command, showUI, value);
  };

  // Monitor for any programmatic text selection that might lead to copying
  let lastSelection = '';
  let selectionTimeout = null;

  function checkSelection() {
    const currentSelection = window.getSelection().toString();
    if (currentSelection !== lastSelection && currentSelection.length > 0) {
      lastSelection = currentSelection;
      
      // Clear existing timeout
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      
      // Set a short timeout to see if a copy operation follows
      selectionTimeout = setTimeout(() => {
        // This selection didn't result in a copy, reset
        lastSelection = '';
      }, 1000);
    }
  }

  // Monitor selection changes
  document.addEventListener('selectionchange', checkSelection);
})();

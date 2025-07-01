# Tab'd Browser Extension

A Manifest v3 browser extension that detects clipboard copy operations on web pages and securely communicates with a VS Code extension via native messaging.

## Features

- **Clipboard Detection**: Monitors all clipboard copy operations including:
  - Manual text selection + copy (Ctrl/Cmd+C)
  - Right-click context menu copy
  - Programmatic clipboard API calls (`navigator.clipboard.writeText`, `document.execCommand`)
- **Zero UI**: No popup actions or unnecessary interface elements
- **Secure Communication**: Uses Chrome's native messaging API to communicate with VS Code
- **Comprehensive Context**: Captures webpage details along with clipboard content
- **Cross-Platform**: Works on macOS, Linux, and Windows

## Architecture

### Extension Components

1. **`manifest.json`** - Manifest v3 configuration
2. **`background.js`** - Service worker handling communication
3. **`content.js`** - Content script for clipboard monitoring
4. **`injected.js`** - Page-context script for Clipboard API interception
5. **`tabd-native-host/`** - Go-based native messaging host program

### Communication Flow

```
Web Page → Content Script → Background Script → Native Host → File System (~/.tabd/)
```

## Installation

### 1. Install the Browser Extension

#### Development Mode
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

#### Production (when published)
Install from the Chrome Web Store (when available)

### 2. Install Native Messaging Host

The extension includes a complete Go-based native messaging host:

```bash
# Build and install the native host
./install-native-host.sh
```

This will:
- Build the Go binary (`tabd-native-host`)
- Install it to `/usr/local/bin/`
- Create native messaging manifests for Chrome, Chromium, and Edge
- Set up the `~/.tabd/` directory for data storage

### 3. Configure Extension ID

After installing the extension, get its ID and update the manifest:

```bash
# Replace with your actual extension ID from chrome://extensions/
EXTENSION_ID="your_extension_id_here"
sed -i "s/EXTENSION_ID_PLACEHOLDER/$EXTENSION_ID/g" \
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.tabd.vscode.json"
```

## Data Structure

When clipboard content is detected, the extension sends the following data structure to VS Code:

```json
{
  "type": "clipboard_copy",
  "clipboard": {
    "text": "copied text content",
    "source": "copy_event|keyboard_shortcut|clipboard_api",
    "timestamp": 1672531200000,
    "selection": {
      "text": "selected text",
      "startOffset": 0,
      "endOffset": 12,
      "containerTag": "P",
      "containerClass": "content",
      "containerId": "main-text"
    }
  },
  "page": {
    "url": "https://example.com/page",
    "title": "Page Title",
    "domain": "example.com",
    "path": "/page",
    "timestamp": 1672531200000,
    "tabId": 123
  }
}
```

## VS Code Integration

This extension is designed to work with a companion VS Code extension. The VS Code extension should:

1. Implement a native messaging host binary at `/usr/local/bin/tabd-native-host`
2. Handle incoming clipboard data messages
3. Process and store clipboard content with webpage context

## Development

### File Structure

```
tabd-extension/
├── manifest.json                 # Extension manifest
├── background.js                 # Service worker
├── content.js                   # Content script
├── injected.js                  # Page-context script  
├── native-messaging-host.json   # Native host config
├── install-native-host.sh       # Installation script
├── package.json                 # Project metadata
└── README.md                    # Documentation
```

### Scripts

```bash
# Package extension for distribution
npm run package

# Install native messaging host
npm run install-host

# Development (load unpacked in Chrome)
npm run dev
```

### Testing

1. Load the extension in Chrome Developer mode
2. Visit any webpage and copy some text
3. Check the console logs in the extension's background script
4. Verify data is being captured correctly

## Permissions

The extension requires the following permissions:

- **`activeTab`**: Access to the current active tab information
- **`clipboardRead`**: Read clipboard content (for verification)
- **`nativeMessaging`**: Communicate with native applications
- **`host_permissions`**: Access to all websites to monitor clipboard events

## Security Considerations

- Uses Chrome's native messaging API for secure communication
- No data is stored locally in the browser
- All communication is encrypted through Chrome's native messaging protocol
- Extension only activates on actual clipboard operations

## Browser Compatibility

- Chrome 88+ (Manifest v3 support)
- Chromium-based browsers with Manifest v3 support
- Edge (Chromium-based) with minor modifications

## License

MIT License - see package.json for details
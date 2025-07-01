# Tab'd Native Host

A Go-based native messaging host for the Tab'd browser extension. This program receives clipboard data from the browser extension and saves it to files in the user's home directory.

## Features

- **Native Messaging**: Secure communication with browser extension via Chrome's native messaging protocol
- **File Storage**: Saves clipboard data as JSON files in `~/.tabd/`
- **Logging**: Comprehensive logging to `~/.tabd/native-host.log`
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Latest File**: Always maintains `~/.tabd/latest_clipboard.json` with the most recent clipboard data

## Installation

### Quick Install (Recommended)

```bash
# Build and install in one step
./install.sh
```

### Manual Install

```bash
# Build the binary
./build.sh

# Install manually
sudo cp tabd-native-host /usr/local/bin/
chmod +x /usr/local/bin/tabd-native-host

# Install manifest files (see install.sh for details)
```

### Cross-Platform Build

```bash
# Build for all platforms
./build.sh all
```

## Configuration

After installation, you must update the manifest files with your actual browser extension ID:

1. Load the Tab'd extension in Chrome
2. Note the extension ID from `chrome://extensions/`
3. Update the manifest files:

```bash
# Replace EXTENSION_ID_PLACEHOLDER with your actual extension ID
EXTENSION_ID="your_actual_extension_id"
sed -i "s/EXTENSION_ID_PLACEHOLDER/$EXTENSION_ID/g" \
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.tabd.vscode.json"
```

## File Structure

The native host creates the following files in `~/.tabd/`:

```
~/.tabd/
├── native-host.log              # Application logs
├── latest_clipboard.json        # Most recent clipboard data
└── clipboard_YYYYMMDD_HHMMSS.json  # Individual clipboard events
```

## Data Format

Clipboard data is saved in JSON format:

```json
{
  "type": "clipboard_copy",
  "clipboard": {
    "text": "copied text content",
    "source": "copy_event",
    "trigger": "user_action",
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

## Development

### Building

```bash
# Development build
go build -o tabd-native-host main.go

# With build script
./build.sh
```

### Testing

You can test the native host manually by sending JSON data via stdin:

```bash
# Test with sample data
echo '{"type":"clipboard_copy","clipboard":{"text":"test","source":"manual","timestamp":1672531200000},"page":{"url":"test","title":"test","domain":"test","path":"test","timestamp":1672531200000,"tabId":1}}' | \
  ./tabd-native-host
```

### Debugging

- Check logs in `~/.tabd/native-host.log`
- Verify manifest installation in browser's native messaging directories
- Test communication with browser extension developer tools

## Dependencies

- Go 1.21 or later
- No external dependencies (uses only Go standard library)

## Security

- Uses Chrome's native messaging protocol for secure communication
- Only accepts messages from whitelisted browser extension IDs
- Validates message format and size limits
- Logs all operations for audit trail

## Troubleshooting

### Common Issues

1. **"Host not found" error**:
   - Verify binary is in `/usr/local/bin/` and executable
   - Check manifest files exist in correct directories
   - Ensure extension ID matches in manifest

2. **Permission denied**:
   - Run installation with sudo: `sudo ./install.sh`
   - Check binary permissions: `chmod +x /usr/local/bin/tabd-native-host`

3. **No data being saved**:
   - Check logs in `~/.tabd/native-host.log`
   - Verify `~/.tabd/` directory exists and is writable
   - Test browser extension is sending data

### Log Analysis

```bash
# View recent logs
tail -f ~/.tabd/native-host.log

# Search for errors
grep -i error ~/.tabd/native-host.log
```

## License

MIT License - See main project for details.

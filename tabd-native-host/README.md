# Tab'd Native Host

A Go-based native messaging host for the Tab'd browser extension. This program receives clipboard data from the browser extension and saves it to files in the user's home directory to be picked up by the VS Code extension.

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

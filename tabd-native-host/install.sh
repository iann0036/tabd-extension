#!/bin/bash

# Installation script for Tab'd Native Host

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_NAME="com.tabd.vscode"
BINARY_NAME="tabd-native-host"

echo "Installing Tab'd Native Host..."

# Build the binary first
if [ ! -f "$SCRIPT_DIR/$BINARY_NAME" ]; then
    echo "Binary not found, building..."
    "$SCRIPT_DIR/build.sh"
fi

# Determine the correct directories for native messaging hosts
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_NM_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROMIUM_NM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
    EDGE_NM_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
    VIVALDI_NM_DIR="$HOME/Library/Application Support/Vivaldi/NativeMessagingHosts"
    INSTALL_DIR="/usr/local/bin"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CHROME_NM_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_NM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
    EDGE_NM_DIR="$HOME/.config/microsoft-edge/NativeMessagingHosts"
    VIVALDI_NM_DIR="$HOME/.config/vivaldi/NativeMessagingHosts"
    INSTALL_DIR="/usr/local/bin"
else
    echo "Unsupported operating system: $OSTYPE"
    exit 1
fi

# Copy binary to installation directory
echo "Installing binary to $INSTALL_DIR..."
if [ -w "$INSTALL_DIR" ]; then
    cp "$SCRIPT_DIR/$BINARY_NAME" "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
else
    echo "Installing binary requires sudo permissions..."
    sudo cp "$SCRIPT_DIR/$BINARY_NAME" "$INSTALL_DIR/"
    sudo chmod +x "$INSTALL_DIR/$BINARY_NAME"
fi

# Create native messaging host manifest
MANIFEST_CONTENT="{
  \"name\": \"$HOST_NAME\",
  \"description\": \"Native messaging host for Tab'd browser extension\",
  \"path\": \"$INSTALL_DIR/$BINARY_NAME\",
  \"type\": \"stdio\",
  \"allowed_origins\": [
    \"chrome-extension://cnlfbljdfomffoofkilepnahcakenkcc/\"
  ]
}"

# Install manifest for different browsers
install_manifest() {
    local dir="$1"
    local browser="$2"
    
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
    fi
    
    echo "$MANIFEST_CONTENT" > "$dir/$HOST_NAME.json"
    echo "Installed manifest for $browser: $dir"
}

install_manifest "$CHROME_NM_DIR" "Chrome"
install_manifest "$CHROMIUM_NM_DIR" "Chromium"
install_manifest "$EDGE_NM_DIR" "Edge"
install_manifest "$VIVALDI_NM_DIR" "Vivaldi"

echo ""
echo "✅ Tab'd Native Host installed successfully!"
echo ""
echo "📁 Binary location: $INSTALL_DIR/$BINARY_NAME"
echo "📁 Chrome manifest: $CHROME_NM_DIR/$HOST_NAME.json"
echo "📁 Chromium manifest: $CHROMIUM_NM_DIR/$HOST_NAME.json" 
echo "📁 Edge manifest: $EDGE_NM_DIR/$HOST_NAME.json"
echo "📁 Vivaldi manifest: $VIVALDI_NM_DIR/$HOST_NAME.json"
echo ""
echo "🗂️  Clipboard data will be saved to: ~/.tabd/"

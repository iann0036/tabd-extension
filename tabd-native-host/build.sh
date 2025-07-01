#!/bin/bash

# Build script for Tab'd Native Host

set -e

echo "Building Tab'd Native Host..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Build for current platform
echo "Building for $(go env GOOS)/$(go env GOARCH)..."
go build -o tabd-native-host main.go

# Make executable
chmod +x tabd-native-host

echo "Build complete: tabd-native-host"

# Optionally build for other platforms
if [ "$1" = "all" ]; then
    echo "Building for all platforms..."
    
    # macOS (Intel)
    GOOS=darwin GOARCH=amd64 go build -o tabd-native-host-darwin-amd64 main.go
    
    # macOS (Apple Silicon)
    GOOS=darwin GOARCH=arm64 go build -o tabd-native-host-darwin-arm64 main.go
    
    # Linux (64-bit)
    GOOS=linux GOARCH=amd64 go build -o tabd-native-host-linux-amd64 main.go
    
    # Windows (64-bit)
    GOOS=windows GOARCH=amd64 go build -o tabd-native-host-windows-amd64.exe main.go
    
    echo "Cross-platform builds complete"
fi

echo "Done!"

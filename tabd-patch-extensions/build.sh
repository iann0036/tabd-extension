#!/bin/bash

# Build script for VS Code Extension Patcher

set -e

echo "Building VS Code Extension Patcher..."

# Clean previous builds
if [ -f "tabd-patch-extensions" ]; then
    rm tabd-patch-extensions
fi

# Build for current platform
go build -o tabd-patch-extensions main.go

echo "Build complete! Executable: tabd-patch-extensions"
echo ""
echo "Usage:"
echo "  ./tabd-patch-extensions"

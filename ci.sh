#!/bin/bash

# Fail on any error.
set -e

# Install Zig
echo "Installing Zig"
export PATH="$HOME/zig-downloads/active:$PATH"
python ./ci/zig-download.py activate --version master

# Build project
echo "Building project"
bun run build

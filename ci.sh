#!/bin/bash

# Fail on any error.
set -e

# Set tool version for Zig
echo "zig latest" > .tool-versions

# Install Zig
asdf plugin-add zig https://github.com/asdf-community/asdf-zig.git
asdf install

# Build project
bun run build

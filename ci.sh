#!/bin/bash

# Fail on any error.
set -e

echo "Installing zvm"
curl https://raw.githubusercontent.com/tristanisham/zvm/master/install.sh | bash

# Install Zig
echo "Installing Zig"
zvm install --force master
zvm use master

# Build project
echo "Building project"
bun run build

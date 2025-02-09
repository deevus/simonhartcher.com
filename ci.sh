#!/bin/bash

# Fail on any error.
set -e

# Install Zig
asdf plugin-add zig https://github.com/asdf-community/asdf-zig.git
asdf set zig latest
asdf install

# Build project
bun run build

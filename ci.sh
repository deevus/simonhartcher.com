#!/bin/bash

# Fail on any error.
set -e

# Install Zig
export ZVM_PATH="$XDG_DATA_HOME/zvm"
echo "ZVM_PATH=$ZVM_PATH"

export PATH="$GOBIN:$PATH"
echo "PATH=$PATH"

go install -ldflags "-s -w" github.com/tristanisham/zvm@latest
zvm install --force master
zvm use master

# Build project
bun run build

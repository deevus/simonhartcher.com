#!/bin/bash

# Fail on any error.
set -e

# If GOPATH is not set, set it to the default value
if [ -z "$GOPATH" ]; then
  export GOPATH="$HOME/go"
  echo "GOPATH was not set. Updated to $GOPATH"
fi

# If GOBIN is not set, set it to the default value
if [ -z "$GOBIN" ]; then
  export GOBIN="$GOPATH/bin"
  echo "GOBIN was not set. Updated to $GOBIN"
fi

export ZVM_PATH="$XDG_DATA_HOME/zvm"
echo "ZVM_PATH=$ZVM_PATH"

export PATH="$GOBIN:$PATH"
echo "PATH=$PATH"

echo "Installing zvm"
go install -ldflags "-s -w" github.com/tristanisham/zvm@latest

# Install Zig
echo "Installing Zig"
zvm install --force master
zvm use master

# Build project
echo "Building project"
bun run build

#!/bin/bash

# Fail on any error.
set -e

# Install Zig
echo "GOPATH=$GOPATH"

# If GOBIN is not set, set it to the default value
if [ -z "$GOBIN" ]; then
  export GOBIN="$GOPATH/bin"
  echo "GOBIN was not set. Updated to $GOBIN"
fi

export ZVM_PATH="$XDG_DATA_HOME/zvm"
echo "ZVM_PATH=$ZVM_PATH"

export PATH="$GOBIN:$PATH"
echo "PATH=$PATH"

go install -ldflags "-s -w" github.com/tristanisham/zvm@latest
zvm install --force master
zvm use master

# Build project
bun run build

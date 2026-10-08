#!/bin/bash

# Launch Google Chrome with remote debugging enabled on port 9222
# Uses a temporary profile to avoid interfering with the main user profile.

PORT=9222
USER_DATA_DIR="/tmp/chrome-debug-profile"

# Check if Chrome is already running on the debugging port
if lsof -i :$PORT > /dev/null; then
  echo "Chrome is already running with remote debugging on port $PORT."
  exit 0
fi

# Determine OS and Chrome path
OS="$(uname)"
if [ "$OS" == "Darwin" ]; then
  CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif [ "$OS" == "Linux" ]; then
  CHROME_PATH="google-chrome" # Assumes it's in PATH
else
  echo "Unsupported OS: $OS"
  exit 1
fi

if [ ! -x "$CHROME_PATH" ] && [ "$OS" == "Darwin" ]; then
  echo "Chrome not found at standard path: $CHROME_PATH"
  exit 1
fi

echo "Launching Chrome on port $PORT..."
# Launch with flags for automation stability
"$CHROME_PATH" \
  --remote-debugging-port=$PORT \
  --user-data-dir="$USER_DATA_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --enable-automation \
  --restore-last-session \
  &

# Give it a moment to start
sleep 3

if lsof -i :$PORT > /dev/null; then
  echo "Chrome launched successfully on port $PORT."
else
  echo "Failed to launch Chrome."
  exit 1
fi

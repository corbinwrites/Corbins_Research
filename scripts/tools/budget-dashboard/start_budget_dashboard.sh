#!/bin/zsh

set -euo pipefail

PROJECT_DIR="/Users/corbin/Hal9000/projects/budget-dashboard"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
NPM_BIN="/opt/homebrew/bin/npm"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Project directory not found: $PROJECT_DIR"
  exit 1
fi

if [[ ! -x "$NPM_BIN" ]]; then
  echo "npm not found at $NPM_BIN"
  exit 1
fi

cd "$PROJECT_DIR"

if [[ ! -f ".env" && -f ".env.example" ]]; then
  cp ".env.example" ".env"
  cat <<'EOF'
Created .env from .env.example.
Add GEMINI_API_KEY to enable Gemini features.
EOF
fi

if [[ ! -d "node_modules" ]]; then
  echo "Installing dependencies..."
  "$NPM_BIN" install
fi

echo "Starting Budget Dashboard..."
echo "Project: $PROJECT_DIR"
echo "App URL will usually be: http://localhost:5173"
echo

"$NPM_BIN" run dev

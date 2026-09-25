#!/usr/bin/env bash
set -euo pipefail

# Start a local server for the app
# Usage: bash scripts/run.sh [port]

PORT="${1:-8000}"
DEPLOY_DIR="dist"

npm run build

if [ ! -d "$DEPLOY_DIR" ]; then
  echo "Error: build did not create $DEPLOY_DIR"
  exit 1
fi

echo "Serving app at http://localhost:$PORT"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT" -d "$DEPLOY_DIR"

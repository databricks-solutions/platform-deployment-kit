#!/usr/bin/env bash
set -euo pipefail

# Deploy the built ./dist directory to the gh-pages branch
# Usage: bash scripts/deploy.sh

DEPLOY_DIR="dist"
BRANCH="gh-pages"
REMOTE="origin"

# Run tests before deploying
echo "Running tests before deploy..."
bash scripts/test.sh
echo "All tests passed."
echo ""

# Resolve the current upstream main branch and create the deployable artifact.
npm run build

# Get current commit info for the deploy message
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
REMOTE_URL=$(git remote get-url "$REMOTE")

echo "Deploying $DEPLOY_DIR to $BRANCH branch..."
echo "  Source commit: $COMMIT_SHA - $COMMIT_MSG"

# Copy deploy/ to a temp git repo and push as gh-pages
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

cp -r "$DEPLOY_DIR"/. "$TEMP_DIR"/

# Disable Jekyll processing (ensures all files are served as-is)
touch "$TEMP_DIR/.nojekyll"

cd "$TEMP_DIR"
git init -q
git checkout -q -b "$BRANCH"
git add -A
git commit -q -m "Deploy $COMMIT_SHA: $COMMIT_MSG"
git push -f "$REMOTE_URL" "$BRANCH"

echo "Deployed successfully to $BRANCH branch."

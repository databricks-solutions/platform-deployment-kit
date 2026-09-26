#!/usr/bin/env bash
set -euo pipefail

# Deploy the built ./dist directory to the gh-pages branch
# Usage: bash scripts/deploy.sh

DEPLOY_DIR="dist"
BRANCH="gh-pages"
REMOTE="origin"

# Run the full test/quality pipeline before deploying — the same gate as CI
# (build + dependency audit + unit + coverage + e2e). This also builds dist/,
# so no separate build step is needed afterwards.
echo "Running full test pipeline before deploy..."
./scripts/test-all.sh --ci --strict-audit
echo "All checks passed."
echo ""

# Get current commit info for the deploy message
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)

# Resolve the push target. In CI (GitHub Actions), authenticate with the Actions
# token; locally, use the existing origin remote and the developer's credentials.
if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  REMOTE_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
else
  REMOTE_URL=$(git remote get-url "$REMOTE")
fi

echo "Deploying $DEPLOY_DIR to $BRANCH branch..."
echo "  Source commit: $COMMIT_SHA - $COMMIT_MSG"

# Copy the built site into a temp git repo and publish it as gh-pages.
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

cp -r "$DEPLOY_DIR"/. "$TEMP_DIR"/
touch "$TEMP_DIR/.nojekyll"   # serve files as-is (no Jekyll processing)

cd "$TEMP_DIR"
git init -q
# A fresh temp repo has no identity; set one so the commit works in CI too.
git config user.name "${GIT_COMMITTER_NAME:-oneclick-deployer}"
git config user.email "${GIT_COMMITTER_EMAIL:-oneclick-deployer@users.noreply.github.com}"
git checkout -q -b "$BRANCH"
git add -A
git commit -q -m "Deploy $COMMIT_SHA: $COMMIT_MSG"
git push -f "$REMOTE_URL" "$BRANCH"

echo "Deployed successfully to $BRANCH branch."

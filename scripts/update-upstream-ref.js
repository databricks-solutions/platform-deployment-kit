// Pin config/upstreams.json "ref" to the current commit SHA of the tracked
// upstream branch. The build only ever fetches that exact SHA, so upstream
// changes reach the app only through a reviewed commit that runs this script.
//
// Usage:
//   npm run upstream:update                       # re-pin the configured "branch"
//   npm run upstream:update -- --branch <name>    # track a different branch
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const configPath = path.join(__dirname, '..', 'config', 'upstreams.json');

function resolveBranch(repository, branch) {
  const output = execFileSync('git', ['ls-remote', repository, `refs/heads/${branch}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
  const sha = output.split(/\s+/)[0];
  if (!/^[0-9a-f]{40}$/.test(sha || '')) {
    throw new Error(`Branch ${branch} not found in ${repository}.`);
  }
  return sha;
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const branchIndex = process.argv.indexOf('--branch');
const branch = branchIndex >= 0 ? process.argv[branchIndex + 1] : (config.branch || 'main');
if (!branch) throw new Error('--branch requires a branch name.');

const sha = resolveBranch(config.repository, branch);
const previous = config.ref;
config.ref = sha;
config.branch = branch;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

if (previous === sha) {
  process.stdout.write(`Upstream already pinned to ${branch} @ ${sha}.\n`);
} else {
  const base = config.repository.replace(/\.git$/, '');
  process.stdout.write(`Pinned upstream ${branch}: ${previous} -> ${sha}\n`);
  process.stdout.write(`Review the upstream changes: ${base}/compare/${previous}...${sha}\n`);
}

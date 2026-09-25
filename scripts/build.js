const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { vendorTerraform } = require('./vendor-terraform');

const repoRoot = path.resolve(__dirname, '..');
const deployDir = path.join(repoRoot, 'deploy');
const distDir = path.join(repoRoot, 'dist');

function appRevision() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function build() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.cpSync(deployDir, distDir, { recursive: true });
  const manifest = vendorTerraform({ outputRoot: path.join(distDir, 'terraform-sources') });
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
  const builtAt = new Date().toISOString();
  const revision = appRevision();
  fs.writeFileSync(path.join(distDir, 'version.json'), `${JSON.stringify({
    date: builtAt,
    commit: revision.slice(0, 12),
    appCommit: revision,
    terraformCommit: manifest.commit,
    terraformRef: manifest.ref,
    builtAt
  }, null, 2)}\n`);
  process.stdout.write(`Built dist/ with AWS, Azure, and GCP Terraform from ${manifest.commit}.\n`);
}

if (require.main === module) build();

module.exports = { build };

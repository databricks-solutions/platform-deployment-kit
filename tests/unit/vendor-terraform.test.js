const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { assertPinnedRef, safeRelativePath, sha256, vendorTerraform } = require('../../scripts/vendor-terraform');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

describe('Terraform source vendoring', () => {
  it('rejects unsafe paths and hashes content deterministically', () => {
    expect(() => safeRelativePath('../secret')).toThrow(/Unsafe/);
    expect(() => safeRelativePath('/absolute')).toThrow(/Unsafe/);
    expect(() => safeRelativePath('safe//file.tf')).toThrow(/Unsafe/);
    expect(safeRelativePath('workspace/tf/main.tf')).toBe('workspace/tf/main.tf');
    expect(sha256(Buffer.from('terraform'))).toBe('94dc3ea57721d541aae09b7bf2368c1e20d4c89996ff6df4349d86048877c0e7');
  });

  it('requires the upstream ref to be a full commit SHA', () => {
    const sha = '69230dd8835c04f994a744b2c67df870390424c5';
    expect(assertPinnedRef(sha)).toBe(sha);
    for (const ref of ['main', 'v1.0.0', sha.slice(0, 12), sha.toUpperCase(), '', undefined]) {
      expect(() => assertPinnedRef(ref)).toThrow(/full 40-character commit SHA/);
    }
  });

  it('refuses to vendor from a branch ref', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'oneclick-vendor-config-'));
    const configPath = path.join(fixture, 'upstreams.json');
    try {
      fs.writeFileSync(configPath, JSON.stringify({ schemaVersion: 1, repository: 'x', ref: 'main', variants: {} }));
      expect(() => vendorTerraform({ configPath, outputRoot: path.join(fixture, 'out') }))
        .toThrow(/upstream:update/);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('vendors only root Terraform files with hashes and resolved source metadata', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'oneclick-vendor-test-'));
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'oneclick-vendor-output-'));
    const configPath = path.join(fixture, 'upstreams.json');
    const previousSourceDir = process.env.TERRAFORM_SOURCE_DIR;

    try {
      git(['init', '-q'], fixture);
      git(['config', 'user.email', 'test@example.com'], fixture);
      git(['config', 'user.name', 'Test'], fixture);
      fs.mkdirSync(path.join(fixture, 'example', 'tf', 'nested'), { recursive: true });
      fs.writeFileSync(path.join(fixture, 'LICENSE.md'), 'license\n');
      fs.writeFileSync(path.join(fixture, 'example', 'tf', 'variables.tf'), 'variable "name" {}\n');
      fs.writeFileSync(path.join(fixture, 'example', 'tf', 'main.tf'), 'resource "test" "this" {}\n');
      fs.writeFileSync(path.join(fixture, 'example', 'tf', '.terraform.lock.hcl'), '# lock\n');
      fs.writeFileSync(path.join(fixture, 'example', 'tf', 'terraform.tfvars.example'), 'ignored = true\n');
      fs.writeFileSync(path.join(fixture, 'example', 'tf', 'nested', 'ignored.tf'), 'ignored\n');
      git(['add', '.'], fixture);
      git(['commit', '-qm', 'fixture'], fixture);
      git(['branch', '-M', 'main'], fixture);
      const commit = git(['rev-parse', 'HEAD'], fixture);

      fs.writeFileSync(configPath, JSON.stringify({
        schemaVersion: 1,
        repository: 'https://example.invalid/repository.git',
        ref: commit,
        licenseFiles: ['LICENSE.md'],
        variants: {
          'aws-standard': { label: 'fixture', privateLink: false, path: 'example' }
        }
      }));
      process.env.TERRAFORM_SOURCE_DIR = fixture;

      const manifest = vendorTerraform({ configPath, outputRoot: output });
      expect(manifest.commit).toBe(commit);
      expect(manifest.ref).toBe(commit);
      expect(manifest.variants['aws-standard'].files.map(file => file.name)).toEqual([
        '.terraform.lock.hcl',
        'main.tf',
        'variables.tf'
      ]);
      for (const file of [...manifest.commonFiles, ...manifest.variants['aws-standard'].files]) {
        expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(fs.existsSync(path.join(output, file.artifactPath))).toBe(true);
      }
      expect(fs.existsSync(path.join(output, 'manifest.json'))).toBe(true);
    } finally {
      if (previousSourceDir === undefined) delete process.env.TERRAFORM_SOURCE_DIR;
      else process.env.TERRAFORM_SOURCE_DIR = previousSourceDir;
      fs.rmSync(fixture, { recursive: true, force: true });
      fs.rmSync(output, { recursive: true, force: true });
    }
  });
});

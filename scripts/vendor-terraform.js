const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(repoRoot, 'config', 'upstreams.json');

function runGit(args, cwd, encoding = 'utf8') {
  return execFileSync('git', args, {
    cwd,
    encoding,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function runUpstreamGit(args, cwd) {
  // The upstream source is public. Ignore developer-specific global Git URL
  // rewrites (for example, HTTPS -> EMU SSH) so builds use the configured URL
  // consistently for personal and EMU accounts alike.
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function safeRelativePath(value) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) {
    throw new Error(`Unsafe upstream path: ${value}`);
  }

  const normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('/') || normalized.split('/').some(part => part === '..' || part === '')) {
    throw new Error(`Unsafe upstream path: ${value}`);
  }
  return normalized;
}

const FULL_SHA = /^[0-9a-f]{40}$/;

// The upstream ref must be an immutable full commit SHA, never a branch or tag
// (which can be moved to different code). Bump it deliberately with
// `npm run upstream:update`, which resolves `branch` to its current SHA.
function assertPinnedRef(ref) {
  if (typeof ref !== 'string' || !FULL_SHA.test(ref)) {
    throw new Error(
      `config/upstreams.json "ref" must be a full 40-character commit SHA, got ${JSON.stringify(ref)}. ` +
      'Run `npm run upstream:update` to pin the tracked branch to its current commit.'
    );
  }
  return ref;
}

function prepareRepository(config) {
  const sourceOverride = process.env.TERRAFORM_SOURCE_DIR;
  if (sourceOverride) {
    const sourceDir = path.resolve(sourceOverride);
    const sourceRef = process.env.TERRAFORM_SOURCE_REF || 'HEAD';
    const commit = runGit(['rev-parse', sourceRef], sourceDir).trim();
    return { sourceDir, commit, cleanup: false };
  }

  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneclick-terraform-upstream-'));
  runGit(['init', '--quiet'], sourceDir);
  runUpstreamGit(['remote', 'add', 'origin', config.repository], sourceDir);
  runUpstreamGit(['fetch', '--quiet', '--depth=1', '--filter=blob:none', 'origin', config.ref], sourceDir);
  const commit = runGit(['rev-parse', 'FETCH_HEAD'], sourceDir).trim();
  if (commit !== config.ref) {
    fs.rmSync(sourceDir, { recursive: true, force: true });
    throw new Error(`Fetched upstream commit ${commit} does not match pinned ref ${config.ref}.`);
  }
  return { sourceDir, commit, cleanup: true };
}

function listTrackedFiles(sourceDir, commit, sourcePath) {
  const output = runGit(['ls-tree', '-r', '--name-only', commit, '--', sourcePath], sourceDir);
  return output.split('\n').map(line => line.trim()).filter(Boolean);
}

function readTrackedFile(sourceDir, commit, filePath) {
  return runGit(['show', `${commit}:${filePath}`], sourceDir, null);
}

function writeFile(outputRoot, relativePath, content) {
  const safePath = safeRelativePath(relativePath);
  const destination = path.resolve(outputRoot, safePath);
  const resolvedRoot = `${path.resolve(outputRoot)}${path.sep}`;
  if (!destination.startsWith(resolvedRoot)) {
    throw new Error(`Unsafe output path: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  return sha256(content);
}

function vendorTerraform(options = {}) {
  const configPath = options.configPath || defaultConfigPath;
  const outputRoot = options.outputRoot || path.join(repoRoot, 'dist', 'terraform-sources');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  assertPinnedRef(config.ref);
  const { sourceDir, commit, cleanup } = prepareRepository(config);
  if (!FULL_SHA.test(commit)) {
    throw new Error(`Unable to resolve ${config.ref} to a full commit SHA.`);
  }

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  try {
    const commonFiles = [];
    for (const licenseFile of config.licenseFiles || []) {
      const upstreamPath = safeRelativePath(licenseFile);
      const content = readTrackedFile(sourceDir, commit, upstreamPath);
      const outputName = path.posix.basename(upstreamPath);
      const artifactPath = `${commit}/common/${outputName}`;
      commonFiles.push({
        name: outputName,
        upstreamPath,
        artifactPath,
        sha256: writeFile(outputRoot, artifactPath, content)
      });
    }

    const variants = {};
    for (const [id, variant] of Object.entries(config.variants || {})) {
      const variantPath = safeRelativePath(variant.path).replace(/\/$/, '');
      const terraformSubdirectory = safeRelativePath(variant.terraformSubdirectory || 'tf');
      const tfPath = terraformSubdirectory === '.'
        ? variantPath
        : `${variantPath}/${terraformSubdirectory}`;
      const trackedFiles = listTrackedFiles(sourceDir, commit, tfPath);
      const selectedFiles = trackedFiles.filter(file => {
        const relative = file.slice(tfPath.length + 1);
        return !relative.includes('/') && (relative.endsWith('.tf') || relative === '.terraform.lock.hcl');
      });

      if (!selectedFiles.some(file => file.endsWith('/variables.tf'))) {
        throw new Error(`Variant ${id} is missing variables.tf.`);
      }

      const names = new Set();
      const files = selectedFiles.sort().map(upstreamPath => {
        const name = safeRelativePath(upstreamPath.slice(tfPath.length + 1));
        if (names.has(name)) throw new Error(`Variant ${id} contains duplicate output path ${name}.`);
        names.add(name);
        const content = readTrackedFile(sourceDir, commit, upstreamPath);
        const artifactPath = `${commit}/${id}/${name}`;
        return {
          name,
          upstreamPath,
          artifactPath,
          sha256: writeFile(outputRoot, artifactPath, content)
        };
      });

      variants[id] = {
        label: variant.label,
        provider: variant.provider,
        privateLink: Boolean(variant.privateLink),
        upstreamPath: variantPath,
        sourceUrl: `${config.repository.replace(/\.git$/, '')}/tree/${commit}/${variantPath}`,
        files
      };
    }

    const manifest = {
      schemaVersion: config.schemaVersion,
      repository: config.repository.replace(/\.git$/, ''),
      ref: config.ref,
      commit,
      resolvedAt: new Date().toISOString(),
      sourceUrl: `${config.repository.replace(/\.git$/, '')}/tree/${commit}`,
      commonFiles,
      variants
    };
    fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  } finally {
    if (cleanup) fs.rmSync(sourceDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const outputIndex = process.argv.indexOf('--output');
  const outputRoot = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : undefined;
  const manifest = vendorTerraform({ outputRoot });
  process.stdout.write(`Vendored ${Object.keys(manifest.variants).length} Terraform variants from ${manifest.commit}.\n`);
}

module.exports = { assertPinnedRef, listTrackedFiles, safeRelativePath, sha256, vendorTerraform };

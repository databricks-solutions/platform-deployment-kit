/**
 * Unit tests for TemplateLoader.
 *
 * Focus: the security-critical paths that the refactor left almost untested
 * (7% coverage) — external Terraform manifest validation, path-traversal
 * rejection, and SHA-256 integrity verification — plus the caching/dedupe
 * behaviour of the plain template loaders.
 *
 * Strategy: stub global.fetch. `_sha256` runs natively on Node's
 * crypto.subtle, so expected hashes are precomputed with node's crypto and
 * must match byte-for-byte.
 */

const crypto = require('crypto');
const TemplateLoader = require('../../deploy/js/template-loader.js');

// Real SHA-256 hex of a UTF-8 string, matching what _sha256() produces.
const sha256Hex = (str) => crypto.createHash('sha256').update(Buffer.from(str)).digest('hex');

// Response factories mirroring the parts of the fetch Response API the loader uses.
const jsonResponse = (obj, ok = true) => ({
  ok, status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Server Error',
  json: async () => obj,
});
const textResponse = (text, ok = true) => ({
  ok, status: ok ? 200 : 404, statusText: ok ? 'OK' : 'Not Found',
  text: async () => text,
});
const bytesResponse = (str, ok = true) => ({
  ok, status: ok ? 200 : 404, statusText: ok ? 'OK' : 'Not Found',
  arrayBuffer: async () => new TextEncoder().encode(str).buffer,
});

const COMMIT = 'a'.repeat(40); // valid 40-hex commit

/**
 * Build a fetch stub from a routing table of {substringOfUrl: response}.
 * Falls back to a 404 so unexpected fetches fail loudly.
 */
function routedFetch(routes) {
  const fn = async (url) => {
    for (const [needle, resp] of routes) {
      if (String(url).includes(needle)) return typeof resp === 'function' ? resp(url) : resp;
    }
    return { ok: false, status: 404, statusText: 'Not Found' };
  };
  fn.calls = [];
  return (url, opts) => { fn.calls.push([url, opts]); return fn(url, opts); };
}

let originalFetch;
beforeEach(() => { originalFetch = global.fetch; });
afterEach(() => { global.fetch = originalFetch; });

// ---------------------------------------------------------------------------
// _externalVariantId — provider allowlist
// ---------------------------------------------------------------------------
describe('TemplateLoader._externalVariantId', () => {
  const loader = new TemplateLoader();

  test('maps supported providers to standard / privatelink variants', () => {
    expect(loader._externalVariantId('aws', false)).toBe('aws-standard');
    expect(loader._externalVariantId('aws', true)).toBe('aws-privatelink');
    expect(loader._externalVariantId('AZURE', false)).toBe('azure-standard');
    expect(loader._externalVariantId('gcp', true)).toBe('gcp-privatelink');
  });

  test('rejects unsupported or missing providers', () => {
    expect(() => loader._externalVariantId('oracle', false)).toThrow(/not configured for provider oracle/);
    expect(() => loader._externalVariantId('', false)).toThrow(/\(missing\)/);
    expect(() => loader._externalVariantId(null, false)).toThrow(/\(missing\)/);
  });
});

// ---------------------------------------------------------------------------
// _loadExternalManifest — schema/commit validation and caching
// ---------------------------------------------------------------------------
describe('TemplateLoader._loadExternalManifest', () => {
  test('accepts a valid manifest and caches it (single fetch)', async () => {
    const loader = new TemplateLoader();
    const manifest = { schemaVersion: 1, commit: COMMIT, variants: {} };
    global.fetch = routedFetch([['manifest.json', jsonResponse(manifest)]]);

    const first = await loader._loadExternalManifest();
    const second = await loader._loadExternalManifest();
    expect(first).toBe(manifest);
    expect(second).toBe(manifest);
    expect(global.fetch.length !== undefined); // fetch is our wrapper
  });

  test('rejects a non-ok manifest response', async () => {
    const loader = new TemplateLoader();
    global.fetch = routedFetch([['manifest.json', jsonResponse({}, false)]]);
    await expect(loader._loadExternalManifest()).rejects.toThrow(/Failed to load Terraform source manifest/);
  });

  test('rejects a wrong schemaVersion', async () => {
    const loader = new TemplateLoader();
    global.fetch = routedFetch([['manifest.json', jsonResponse({ schemaVersion: 2, commit: COMMIT })]]);
    await expect(loader._loadExternalManifest()).rejects.toThrow(/manifest is invalid/);
  });

  test('rejects a commit that is not 40 hex chars', async () => {
    const loader = new TemplateLoader();
    global.fetch = routedFetch([['manifest.json', jsonResponse({ schemaVersion: 1, commit: 'nothex' })]]);
    await expect(loader._loadExternalManifest()).rejects.toThrow(/manifest is invalid/);
  });
});

// ---------------------------------------------------------------------------
// _validateExternalFile — path-traversal & hash-shape guards (SECURITY)
// ---------------------------------------------------------------------------
describe('TemplateLoader._validateExternalFile', () => {
  const loader = new TemplateLoader();
  const goodHash = 'b'.repeat(64);
  const okFile = { name: 'network.tf', artifactPath: `${COMMIT}/aws/network.tf`, sha256: goodHash };

  test('accepts a well-formed entry', () => {
    expect(() => loader._validateExternalFile(okFile, COMMIT)).not.toThrow();
  });

  test('rejects output filenames containing path separators or dot segments', () => {
    for (const name of ['a/b.tf', 'a\\b.tf', '.', '..', '../evil.tf']) {
      expect(() => loader._validateExternalFile({ ...okFile, name }, COMMIT))
        .toThrow(/unsafe output filename/);
    }
  });

  test('rejects a missing or non-string filename', () => {
    expect(() => loader._validateExternalFile({ artifactPath: `${COMMIT}/x`, sha256: goodHash }, COMMIT))
      .toThrow(/unsafe output filename/);
    expect(() => loader._validateExternalFile(null, COMMIT)).toThrow(/unsafe output filename/);
  });

  test('rejects an artifactPath not scoped to the manifest commit', () => {
    expect(() => loader._validateExternalFile({ ...okFile, artifactPath: 'other/aws/network.tf' }, COMMIT))
      .toThrow(/unsafe artifact path/);
  });

  test('rejects an artifactPath with a .. traversal segment', () => {
    expect(() => loader._validateExternalFile({ ...okFile, artifactPath: `${COMMIT}/../secret` }, COMMIT))
      .toThrow(/unsafe artifact path/);
  });

  test('rejects an invalid sha256 shape', () => {
    for (const sha256 of ['', 'zz', 'a'.repeat(63), 'A'.repeat(64) /* uppercase */]) {
      expect(() => loader._validateExternalFile({ ...okFile, sha256 }, COMMIT))
        .toThrow(/invalid hash/);
    }
  });
});

// ---------------------------------------------------------------------------
// _sha256 — hashing matches node crypto
// ---------------------------------------------------------------------------
describe('TemplateLoader._sha256', () => {
  test('produces the standard lowercase hex digest', async () => {
    const loader = new TemplateLoader();
    const content = 'resource "null_resource" "x" {}\n';
    const bytes = new TextEncoder().encode(content).buffer;
    expect(await loader._sha256(bytes)).toBe(sha256Hex(content));
  });
});

// ---------------------------------------------------------------------------
// loadExternalTerraformFiles — end-to-end verified load (SECURITY)
// ---------------------------------------------------------------------------
describe('TemplateLoader.loadExternalTerraformFiles', () => {
  const netContent = 'module "vpc" {}\n';
  const commonContent = 'terraform { required_version = ">= 1.5" }\n';

  const buildManifest = () => ({
    schemaVersion: 1,
    commit: COMMIT,
    ref: 'v1.2.3',
    sourceUrl: 'https://example.test/tf',
    variants: {
      'aws-standard': {
        sourceUrl: 'https://example.test/tf/aws',
        files: [{ name: 'network.tf', artifactPath: `${COMMIT}/aws/network.tf`, sha256: sha256Hex(netContent) }],
      },
    },
    commonFiles: [{ name: 'versions.tf', artifactPath: `${COMMIT}/common/versions.tf`, sha256: sha256Hex(commonContent) }],
  });

  test('returns variant files + common files with verified content', async () => {
    const loader = new TemplateLoader();
    global.fetch = routedFetch([
      ['manifest.json', jsonResponse(buildManifest())],
      ['aws/network.tf', bytesResponse(netContent)],
      ['common/versions.tf', bytesResponse(commonContent)],
    ]);

    const files = await loader.loadExternalTerraformFiles('aws', false);
    expect(files).toEqual([
      { name: 'network.tf', content: netContent },
      { name: 'versions.tf', content: commonContent },
    ]);
  });

  test('throws when the requested variant is absent from the manifest', async () => {
    const loader = new TemplateLoader();
    global.fetch = routedFetch([['manifest.json', jsonResponse(buildManifest())]]);
    await expect(loader.loadExternalTerraformFiles('aws', true)) // privatelink not present
      .rejects.toThrow(/does not contain aws-privatelink/);
  });

  test('throws an integrity error when fetched bytes do not match the manifest hash', async () => {
    const loader = new TemplateLoader();
    global.fetch = routedFetch([
      ['manifest.json', jsonResponse(buildManifest())],
      ['aws/network.tf', bytesResponse('TAMPERED CONTENT')], // hash won't match
      ['common/versions.tf', bytesResponse(commonContent)],
    ]);
    await expect(loader.loadExternalTerraformFiles('aws', false))
      .rejects.toThrow(/Integrity check failed/);
  });

  test('throws when a vendored file fetch is not ok', async () => {
    const loader = new TemplateLoader();
    global.fetch = routedFetch([
      ['manifest.json', jsonResponse(buildManifest())],
      ['aws/network.tf', bytesResponse('', false)],
      ['common/versions.tf', bytesResponse(commonContent)],
    ]);
    await expect(loader.loadExternalTerraformFiles('aws', false))
      .rejects.toThrow(/Failed to load vendored Terraform file/);
  });
});

// ---------------------------------------------------------------------------
// getExternalTerraformMetadata
// ---------------------------------------------------------------------------
describe('TemplateLoader.getExternalTerraformMetadata', () => {
  test('returns null before the manifest is loaded', () => {
    const loader = new TemplateLoader();
    expect(loader.getExternalTerraformMetadata('aws', false)).toBeNull();
  });

  test('returns commit/ref and variant sourceUrl once loaded', async () => {
    const loader = new TemplateLoader();
    const manifest = {
      schemaVersion: 1, commit: COMMIT, ref: 'v9', sourceUrl: 'https://top/level',
      variants: { 'gcp-standard': { sourceUrl: 'https://variant/gcp' } },
    };
    global.fetch = routedFetch([['manifest.json', jsonResponse(manifest)]]);
    await loader._loadExternalManifest();

    expect(loader.getExternalTerraformMetadata('gcp', false)).toEqual({
      commit: COMMIT, ref: 'v9', sourceUrl: 'https://variant/gcp',
    });
  });

  test('falls back to the manifest sourceUrl when the variant omits one', async () => {
    const loader = new TemplateLoader();
    const manifest = {
      schemaVersion: 1, commit: COMMIT, ref: 'v9', sourceUrl: 'https://top/level',
      variants: { 'gcp-standard': {} },
    };
    global.fetch = routedFetch([['manifest.json', jsonResponse(manifest)]]);
    await loader._loadExternalManifest();
    expect(loader.getExternalTerraformMetadata('gcp', false).sourceUrl).toBe('https://top/level');
  });

  test('returns null for a variant that is not in the manifest', async () => {
    const loader = new TemplateLoader();
    const manifest = { schemaVersion: 1, commit: COMMIT, variants: {} };
    global.fetch = routedFetch([['manifest.json', jsonResponse(manifest)]]);
    await loader._loadExternalManifest();
    expect(loader.getExternalTerraformMetadata('aws', false)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadTemplate — file mapping, caching, in-flight dedupe
// ---------------------------------------------------------------------------
describe('TemplateLoader.loadTemplate', () => {
  test('maps a known template name and caches the result', async () => {
    const loader = new TemplateLoader();
    let fetchCount = 0;
    global.fetch = (url) => { fetchCount++; return Promise.resolve(textResponse(`content for ${url}`)); };

    const a = await loader.loadTemplate('aws', 'tfvars');
    const b = await loader.loadTemplate('aws', 'tfvars');
    expect(a).toContain('aws/tfvars.tf.template');
    expect(b).toBe(a);
    expect(fetchCount).toBe(1); // second call served from cache
  });

  test('dedupes concurrent loads of the same key into one fetch', async () => {
    const loader = new TemplateLoader();
    let fetchCount = 0;
    global.fetch = (url) => { fetchCount++; return Promise.resolve(textResponse('x')); };

    const [r1, r2] = await Promise.all([
      loader.loadTemplate('aws', 'readme'),
      loader.loadTemplate('aws', 'readme'),
    ]);
    expect(r1).toBe('x');
    expect(r2).toBe('x');
    expect(fetchCount).toBe(1);
  });

  test('rejects an unknown template name', async () => {
    const loader = new TemplateLoader();
    global.fetch = () => Promise.resolve(textResponse('x'));
    await expect(loader.loadTemplate('aws', 'nope')).rejects.toThrow(/Unknown template name: nope/);
  });

  test('propagates a fetch failure and clears the in-flight promise', async () => {
    const loader = new TemplateLoader();
    global.fetch = () => Promise.resolve(textResponse('', false));
    await expect(loader.loadTemplate('aws', 'main')).rejects.toThrow(/Failed to load template aws\/main/);
    // A subsequent successful call should work (in-flight promise was cleared).
    global.fetch = () => Promise.resolve(textResponse('ok'));
    expect(await loader.loadTemplate('aws', 'main')).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// loadModuleTemplate
// ---------------------------------------------------------------------------
describe('TemplateLoader.loadModuleTemplate', () => {
  test('loads a known module template', async () => {
    const loader = new TemplateLoader();
    global.fetch = (url) => Promise.resolve(textResponse(`m:${url}`));
    const r = await loader.loadModuleTemplate('network', 'main');
    expect(r).toContain('modules/network/main.tf.template');
  });

  test('rejects an unknown module template name', async () => {
    const loader = new TemplateLoader();
    global.fetch = () => Promise.resolve(textResponse('x'));
    await expect(loader.loadModuleTemplate('network', 'bogus'))
      .rejects.toThrow(/Unknown module template name: bogus/);
  });
});

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------
describe('TemplateLoader.loadConfig', () => {
  test('loads and caches provider config JSON', async () => {
    const loader = new TemplateLoader();
    let fetchCount = 0;
    global.fetch = () => { fetchCount++; return Promise.resolve(jsonResponse({ template_files: ['main.tf.template'] })); };
    const cfg = await loader.loadConfig('custom');
    expect(cfg).toEqual({ template_files: ['main.tf.template'] });
    await loader.loadConfig('custom');
    expect(fetchCount).toBe(1);
  });

  test('throws on a non-ok config response', async () => {
    const loader = new TemplateLoader();
    global.fetch = () => Promise.resolve(jsonResponse({}, false));
    await expect(loader.loadConfig('custom')).rejects.toThrow(/Failed to load config for custom/);
  });
});

// ---------------------------------------------------------------------------
// preloadProvider & clearCache
// ---------------------------------------------------------------------------
describe('TemplateLoader.preloadProvider / clearCache', () => {
  test('preloads tfvars, readme and the manifest for a cloud provider', async () => {
    const loader = new TemplateLoader();
    const manifest = { schemaVersion: 1, commit: COMMIT, variants: {} };
    global.fetch = routedFetch([
      ['manifest.json', jsonResponse(manifest)],
      ['.template', textResponse('tpl')],
    ]);
    await loader.preloadProvider('aws');
    expect(loader.cache.get('aws/tfvars')).toBe('tpl');
    expect(loader.cache.get('aws/readme')).toBe('tpl');
    expect(loader.externalManifest).toBe(manifest);
  });

  test('swallows errors during preload (best-effort)', async () => {
    const loader = new TemplateLoader();
    global.fetch = () => Promise.reject(new Error('network down'));
    await expect(loader.preloadProvider('aws')).resolves.toBeUndefined();
  });

  test('clearCache resets templates, in-flight promises and the manifest', async () => {
    const loader = new TemplateLoader();
    loader.cache.set('k', 'v');
    loader.loadingPromises.set('k', Promise.resolve());
    loader.externalManifest = { schemaVersion: 1 };
    loader.clearCache();
    expect(loader.cache.size).toBe(0);
    expect(loader.loadingPromises.size).toBe(0);
    expect(loader.externalManifest).toBeNull();
  });
});

globalThis.Handlebars = require('handlebars');
globalThis.JSZip = require('jszip');
globalThis.TemplateLoader = require('../../deploy/js/template-loader.js');
globalThis.TemplateEngine = require('../../deploy/js/template-engine.js');

const TerraformGenerator = require('../../deploy/js/terraform-generator.js');

describe('TerraformGenerator AWS external source', () => {
  it('packages the complete Terraform project with generated tfvars and README', async () => {
    const generator = new TerraformGenerator();
    generator.loader.loadExternalTerraformFiles = async () => [
      { name: 'network.tf', content: 'module "vpc" {}\n' },
      { name: 'workspace.tf', content: 'resource "databricks_mws_workspaces" "this" {}\n' }
    ];
    generator.loader.loadTemplate = async (_provider, templateName) => {
      if (templateName === 'tfvars') {
        return 'region = "{{region}}"\nprivate_subnets_cidr = {{{byovpc_private_subnets_cidr}}}\n';
      }
      if (templateName === 'readme') {
        return '# {{project_prefix}}\n';
      }
      throw new Error(`Unexpected template: ${templateName}`);
    };

    const blob = await generator.generateProject({
      provider: 'aws',
      project_prefix: 'test-aws',
      region: 'us-east-1',
      create_new_vpc: true,
      calculated_subnets: [
        { name: 'private-a', cidr: '10.0.0.0/24', subnet_type: 'private' }
      ]
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual([
      'network.tf',
      'workspace.tf',
      'terraform.tfvars',
      'README.md'
    ]);
    expect(await zip.file('network.tf').async('string')).toBe('module "vpc" {}\n');
    expect(await zip.file('terraform.tfvars').async('string')).toContain('region = "us-east-1"');
    expect(await zip.file('terraform.tfvars').async('string')).toContain('["10.0.0.0/24"]');
    expect(await zip.file('README.md').async('string')).toBe('# test-aws\n');
  });

  it('rejects a vendored file whose name would collide with generated outputs', async () => {
    const generator = new TerraformGenerator();
    generator.loader.loadExternalTerraformFiles = async () => [
      { name: 'terraform.tfvars', content: 'malicious = true\n' }, // collides with generated tfvars
    ];
    generator.loader.loadTemplate = async () => 'x';
    await expect(generator.generateProject({ provider: 'aws', project_prefix: 'p' }))
      .rejects.toThrow(/conflicting vendored Terraform filename/);
  });

  it('rejects a vendored file whose name contains a path separator', async () => {
    const generator = new TerraformGenerator();
    generator.loader.loadExternalTerraformFiles = async () => [
      { name: '../escape.tf', content: 'x\n' },
    ];
    generator.loader.loadTemplate = async () => 'x';
    await expect(generator.generateProject({ provider: 'aws', project_prefix: 'p' }))
      .rejects.toThrow(/Unsafe or conflicting vendored Terraform filename/);
  });
});

describe('TerraformGenerator generic (non-cloud) fallback path', () => {
  // Exercises the module-based generation path (lines 54-80) that fires for any
  // provider that is not aws/azure/gcp — it emits the full standard file set
  // plus modules/network and modules/databricks.
  it('packages standard files and module folders', async () => {
    const generator = new TerraformGenerator();
    generator.loader.loadTemplate = async (_provider, name) => `# ${name}\n`;
    generator.loader.loadModuleTemplate = async (mod, name) => `# ${mod}/${name}\n`;

    const blob = await generator.generateProject({ provider: 'custom', project_prefix: 'gen' });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const names = Object.keys(zip.files).sort();

    expect(names).toEqual([
      'README.md',
      'main.tf',
      'modules/',
      'modules/databricks/',
      'modules/databricks/main.tf',
      'modules/databricks/outputs.tf',
      'modules/databricks/variables.tf',
      'modules/network/',
      'modules/network/main.tf',
      'modules/network/outputs.tf',
      'modules/network/variables.tf',
      'outputs.tf',
      'provider.tf',
      'terraform.tfvars',
      'variables.tf',
      'versions.tf',
    ]);
    expect(await zip.file('modules/network/main.tf').async('string')).toBe('# network/main\n');
  });
});

describe('TerraformGenerator error handling', () => {
  it('throws when JSZip is unavailable', async () => {
    const generator = new TerraformGenerator();
    const savedZip = globalThis.JSZip;
    globalThis.JSZip = undefined;
    try {
      await expect(generator.generateProject({ provider: 'aws' })).rejects.toThrow(/JSZip library is not loaded/);
    } finally {
      globalThis.JSZip = savedZip;
    }
  });

  it('wraps template render failures with the template path', async () => {
    const generator = new TerraformGenerator();
    generator.loader.loadTemplate = async () => { throw new Error('boom'); };
    await expect(generator.renderTemplate('aws', 'tfvars', {}))
      .rejects.toThrow(/Failed to render template aws\/tfvars: boom/);
  });

  it('wraps module template render failures with the module path', async () => {
    const generator = new TerraformGenerator();
    generator.loader.loadModuleTemplate = async () => { throw new Error('kaboom'); };
    await expect(generator.renderModuleTemplate('network', 'main', {}))
      .rejects.toThrow(/Failed to render module template network\/main: kaboom/);
  });
});

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
});

/**
 * Unit tests for Validators class
 * CIDRUtils must be globally available before requiring validators.js
 */

const { CIDRUtils } = require('../../deploy/js/network-calculator.js');
globalThis.CIDRUtils = CIDRUtils;
const Validators = require('../../deploy/js/validators.js');

// ---------------------------------------------------------------------------
// validateCIDR
// ---------------------------------------------------------------------------
describe('Validators.validateCIDR', () => {
  test('empty/falsy input returns valid', () => {
    expect(Validators.validateCIDR('')).toEqual({ valid: true, message: '' });
    expect(Validators.validateCIDR(null)).toEqual({ valid: true, message: '' });
    expect(Validators.validateCIDR(undefined)).toEqual({ valid: true, message: '' });
  });

  test('valid network CIDR returns valid', () => {
    expect(Validators.validateCIDR('10.0.0.0/16')).toEqual({ valid: true, message: '' });
    expect(Validators.validateCIDR('192.168.0.0/24')).toEqual({ valid: true, message: '' });
    expect(Validators.validateCIDR('172.16.0.0/12')).toEqual({ valid: true, message: '' });
  });

  test('missing prefix returns invalid format message', () => {
    const result = Validators.validateCIDR('10.0.0.0');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid cidr format/i);
  });

  test('missing IP returns invalid format message', () => {
    const result = Validators.validateCIDR('/16');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid cidr format/i);
  });

  test('octet out of range returns invalid IP format', () => {
    const result = Validators.validateCIDR('10.0.256.0/16');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid ip address format/i);
  });

  test('negative octet returns invalid IP format', () => {
    const result = Validators.validateCIDR('10.-1.0.0/16');
    expect(result.valid).toBe(false);
    // negative octet causes NaN after Number(), which is not < 0 or > 255 but parts.length check differs
    // Actually Number('-1') === -1 which IS < 0, so should get IP format error
    expect(result.message).toMatch(/invalid ip address format/i);
  });

  test('prefix > 32 returns prefix length error', () => {
    const result = Validators.validateCIDR('10.0.0.0/33');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/prefix length must be between 0 and 32/i);
  });

  test('non-numeric prefix returns prefix length error', () => {
    const result = Validators.validateCIDR('10.0.0.0/abc');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/prefix length must be between 0 and 32/i);
  });

  test('minPrefix and maxPrefix both set — prefix out of range returns range message', () => {
    const result = Validators.validateCIDR('10.0.0.0/8', 16, 24);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/between \/16 and \/24/i);
  });

  test('only minPrefix set — prefix below min returns at-least message', () => {
    const result = Validators.validateCIDR('10.0.0.0/8', 16, null);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least \/16/i);
  });

  test('only maxPrefix set — prefix above max returns cannot-exceed message', () => {
    const result = Validators.validateCIDR('10.0.0.0/28', null, 24);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/cannot exceed \/24/i);
  });

  test('host address (not network address) returns invalid network address', () => {
    // 10.0.0.1/16 — host bit set, not a valid network address
    const result = Validators.validateCIDR('10.0.0.1/16');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid network address/i);
  });

  test('valid CIDR within prefix bounds returns valid', () => {
    const result = Validators.validateCIDR('10.0.0.0/16', 8, 24);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateProjectName
// ---------------------------------------------------------------------------
describe('Validators.validateProjectName', () => {
  test('falsy name returns required error', () => {
    expect(Validators.validateProjectName('')).toMatchObject({ valid: false });
    expect(Validators.validateProjectName(null)).toMatchObject({ valid: false });
  });

  test('valid name returns valid', () => {
    expect(Validators.validateProjectName('myproject')).toEqual({ valid: true, message: '' });
    expect(Validators.validateProjectName('my-project-01')).toEqual({ valid: true, message: '' });
    expect(Validators.validateProjectName('My_Project')).toEqual({ valid: true, message: '' });
  });

  test('name too short returns length error', () => {
    const result = Validators.validateProjectName('a');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/between 2 and 20/i);
  });

  test('name too long returns length error', () => {
    const result = Validators.validateProjectName('a'.repeat(21));
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/between 2 and 20/i);
  });

  test('name with invalid characters returns character error', () => {
    const result = Validators.validateProjectName('my project!');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/letters, numbers, hyphens, and underscores/i);
  });

  test('name starting with hyphen returns character error (regex)', () => {
    // regex requires starting with [a-zA-Z0-9]
    const result = Validators.validateProjectName('-myproject');
    expect(result.valid).toBe(false);
  });

  test('name ending with hyphen returns character error (regex)', () => {
    const result = Validators.validateProjectName('myproject-');
    expect(result.valid).toBe(false);
  });

  test('custom min/max lengths are respected', () => {
    expect(Validators.validateProjectName('ab', 2, 5)).toEqual({ valid: true, message: '' });
    const tooLong = Validators.validateProjectName('abcdef', 2, 5);
    expect(tooLong.valid).toBe(false);
  });

  test('name with leading/trailing whitespace is trimmed before validation', () => {
    // '  myproject  ' trimmed = 'myproject' which is valid
    expect(Validators.validateProjectName('  myproject  ')).toEqual({ valid: true, message: '' });
  });
});

// ---------------------------------------------------------------------------
// validateRegion
// ---------------------------------------------------------------------------
describe('Validators.validateRegion', () => {
  test('empty region returns required error', () => {
    expect(Validators.validateRegion('', 'aws')).toMatchObject({ valid: false });
    expect(Validators.validateRegion(null, 'aws')).toMatchObject({ valid: false });
  });

  test('valid AWS region returns valid', () => {
    expect(Validators.validateRegion('us-east-1', 'aws')).toEqual({ valid: true, message: '' });
    expect(Validators.validateRegion('eu-west-2', 'aws')).toEqual({ valid: true, message: '' });
    expect(Validators.validateRegion('ap-southeast-1', 'aws')).toEqual({ valid: true, message: '' });
  });

  test('invalid AWS region returns error', () => {
    const result = Validators.validateRegion('US-EAST-1', 'aws');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid aws region format/i);
  });

  test('valid Azure region returns valid', () => {
    expect(Validators.validateRegion('eastus', 'azure')).toEqual({ valid: true, message: '' });
    expect(Validators.validateRegion('westeurope', 'azure')).toEqual({ valid: true, message: '' });
    expect(Validators.validateRegion('eastus2', 'azure')).toEqual({ valid: true, message: '' });
  });

  test('invalid Azure region returns error', () => {
    const result = Validators.validateRegion('East-US', 'azure');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid azure region format/i);
  });

  test('valid GCP region returns valid', () => {
    expect(Validators.validateRegion('us-central1', 'gcp')).toEqual({ valid: true, message: '' });
    expect(Validators.validateRegion('europe-west1', 'gcp')).toEqual({ valid: true, message: '' });
  });

  test('invalid GCP region returns error', () => {
    const result = Validators.validateRegion('us-central', 'gcp');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid gcp region format/i);
  });

  test('unknown provider skips pattern check and returns valid', () => {
    // No pattern registered for 'unknown' provider
    expect(Validators.validateRegion('anything-goes', 'unknown')).toEqual({ valid: true, message: '' });
  });
});

// ---------------------------------------------------------------------------
// validatePricingTier
// ---------------------------------------------------------------------------
describe('Validators.validatePricingTier', () => {
  test('falsy tier returns required error', () => {
    expect(Validators.validatePricingTier('', 'aws')).toMatchObject({ valid: false });
  });

  test('valid AWS tiers', () => {
    expect(Validators.validatePricingTier('PREMIUM', 'aws')).toEqual({ valid: true, message: '' });
    expect(Validators.validatePricingTier('ENTERPRISE', 'aws')).toEqual({ valid: true, message: '' });
  });

  test('invalid AWS tier returns error with valid options', () => {
    const result = Validators.validatePricingTier('BASIC', 'aws');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/PREMIUM, ENTERPRISE/);
  });

  test('valid Azure tiers', () => {
    expect(Validators.validatePricingTier('STANDARD', 'azure')).toEqual({ valid: true, message: '' });
    expect(Validators.validatePricingTier('PREMIUM', 'azure')).toEqual({ valid: true, message: '' });
  });

  test('ENTERPRISE is invalid for Azure', () => {
    const result = Validators.validatePricingTier('ENTERPRISE', 'azure');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/STANDARD, PREMIUM/);
  });

  test('valid GCP tiers', () => {
    expect(Validators.validatePricingTier('STANDARD', 'gcp')).toEqual({ valid: true, message: '' });
    expect(Validators.validatePricingTier('PREMIUM', 'gcp')).toEqual({ valid: true, message: '' });
  });

  test('ENTERPRISE is invalid for GCP', () => {
    const result = Validators.validatePricingTier('ENTERPRISE', 'gcp');
    expect(result.valid).toBe(false);
  });

  test('unknown provider skips tier check and returns valid', () => {
    expect(Validators.validatePricingTier('ANYTHING', 'unknown')).toEqual({ valid: true, message: '' });
  });
});

// ---------------------------------------------------------------------------
// validatePricingTierFeatures
// ---------------------------------------------------------------------------
describe('Validators.validatePricingTierFeatures', () => {
  test('no private link — no errors', () => {
    expect(Validators.validatePricingTierFeatures({ provider: 'aws', pricing_tier: 'STANDARD', enable_private_link: false })).toEqual({});
    expect(Validators.validatePricingTierFeatures({ provider: 'aws', pricing_tier: 'STANDARD' })).toEqual({});
  });

  test('AWS PrivateLink without ENTERPRISE returns error', () => {
    const errors = Validators.validatePricingTierFeatures({ provider: 'aws', pricing_tier: 'STANDARD', enable_private_link: true });
    expect(errors.enable_private_link).toMatch(/enterprise/i);
  });

  test('AWS PrivateLink with ENTERPRISE returns no error', () => {
    const errors = Validators.validatePricingTierFeatures({ provider: 'aws', pricing_tier: 'ENTERPRISE', enable_private_link: true });
    expect(errors).toEqual({});
  });

  test('Azure Private Link without PREMIUM returns error', () => {
    const errors = Validators.validatePricingTierFeatures({ provider: 'azure', pricing_tier: 'STANDARD', enable_private_link: true });
    expect(errors.enable_private_link).toMatch(/premium/i);
    expect(errors.enable_private_link).toMatch(/private link/i);
  });

  test('Azure Private Link with PREMIUM returns no error', () => {
    const errors = Validators.validatePricingTierFeatures({ provider: 'azure', pricing_tier: 'PREMIUM', enable_private_link: true });
    expect(errors).toEqual({});
  });

  test('GCP Private Service Connect without PREMIUM returns error', () => {
    const errors = Validators.validatePricingTierFeatures({ provider: 'gcp', pricing_tier: 'STANDARD', enable_private_link: true });
    expect(errors.enable_private_link).toMatch(/premium/i);
    expect(errors.enable_private_link).toMatch(/private service connect/i);
  });

  test('GCP Private Service Connect with PREMIUM returns no error', () => {
    const errors = Validators.validatePricingTierFeatures({ provider: 'gcp', pricing_tier: 'PREMIUM', enable_private_link: true });
    expect(errors).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// validateAvailabilityZones
// ---------------------------------------------------------------------------
describe('Validators.validateAvailabilityZones', () => {
  // AWS
  test('AWS: empty zones returns error', () => {
    const result = Validators.validateAvailabilityZones([], 'aws', 'us-east-1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 2/i);
  });

  test('AWS: single zone returns error (min 2)', () => {
    const result = Validators.validateAvailabilityZones(['us-east-1a'], 'aws', 'us-east-1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 2/i);
  });

  test('AWS: 2 valid zones returns valid', () => {
    const result = Validators.validateAvailabilityZones(['us-east-1a', 'us-east-1b'], 'aws', 'us-east-1');
    expect(result.valid).toBe(true);
  });

  test('AWS: 7 zones exceeds max (6)', () => {
    const zones = ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f', 'us-east-1g'];
    const result = Validators.validateAvailabilityZones(zones, 'aws', 'us-east-1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/maximum 6/i);
  });

  test('AWS: zone not starting with region returns error', () => {
    const result = Validators.validateAvailabilityZones(['us-east-1a', 'eu-west-1b'], 'aws', 'us-east-1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/us-east-1/);
  });

  test('AWS: duplicate zones returns error', () => {
    const result = Validators.validateAvailabilityZones(['us-east-1a', 'us-east-1a'], 'aws', 'us-east-1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/duplicate/i);
  });

  // Azure
  test('Azure: empty zones returns error', () => {
    const result = Validators.validateAvailabilityZones([], 'azure', 'eastus');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 1/i);
  });

  test('Azure: valid numeric zones 1, 2 returns valid', () => {
    const result = Validators.validateAvailabilityZones(['1', '2'], 'azure', 'eastus');
    expect(result.valid).toBe(true);
  });

  test('Azure: 4 zones exceeds max (3)', () => {
    const result = Validators.validateAvailabilityZones(['1', '2', '3', '1'], 'azure', 'eastus');
    expect(result.valid).toBe(false);
    // Could fail on max or duplicates
  });

  test('Azure: non-numeric zone returns error', () => {
    const result = Validators.validateAvailabilityZones(['eastus-1'], 'azure', 'eastus');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/numeric/i);
  });

  test('Azure: zone "4" is invalid (must be 1-3)', () => {
    const result = Validators.validateAvailabilityZones(['1', '4'], 'azure', 'eastus');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/numeric/i);
  });

  // GCP
  test('GCP: single zone returns error (min 2)', () => {
    const result = Validators.validateAvailabilityZones(['us-central1-a'], 'gcp', 'us-central1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/at least 2/i);
  });

  test('GCP: 2 valid zones returns valid', () => {
    const result = Validators.validateAvailabilityZones(['us-central1-a', 'us-central1-b'], 'gcp', 'us-central1');
    expect(result.valid).toBe(true);
  });

  test('GCP: zone not starting with region returns error', () => {
    const result = Validators.validateAvailabilityZones(['us-central1-a', 'europe-west1-b'], 'gcp', 'us-central1');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/us-central1/);
  });
});

// ---------------------------------------------------------------------------
// validateTags
// ---------------------------------------------------------------------------
describe('Validators.validateTags', () => {
  test('empty/falsy input returns valid with empty parsed object', () => {
    expect(Validators.validateTags('')).toEqual({ valid: true, message: '', parsed: {} });
    expect(Validators.validateTags(null)).toEqual({ valid: true, message: '', parsed: {} });
    expect(Validators.validateTags('   ')).toEqual({ valid: true, message: '', parsed: {} });
  });

  test('valid JSON object returns valid with parsed object', () => {
    const result = Validators.validateTags('{"env":"prod","team":"platform"}');
    expect(result.valid).toBe(true);
    expect(result.parsed).toEqual({ env: 'prod', team: 'platform' });
  });

  test('JSON array returns invalid', () => {
    const result = Validators.validateTags('[1,2,3]');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/json object/i);
    expect(result.parsed).toBeNull();
  });

  test('invalid JSON returns invalid', () => {
    const result = Validators.validateTags('{bad json}');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid json/i);
    expect(result.parsed).toBeNull();
  });

  test('JSON primitive string returns invalid', () => {
    const result = Validators.validateTags('"just a string"');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/json object/i);
  });
});

// ---------------------------------------------------------------------------
// validateAwsSubnetId
// ---------------------------------------------------------------------------
describe('Validators.validateAwsSubnetId', () => {
  test('falsy input returns required error', () => {
    expect(Validators.validateAwsSubnetId('')).toMatchObject({ valid: false });
    expect(Validators.validateAwsSubnetId(null)).toMatchObject({ valid: false });
  });

  test('valid 8-char hex subnet ID returns valid', () => {
    expect(Validators.validateAwsSubnetId('subnet-12345678')).toEqual({ valid: true, message: '' });
  });

  test('valid 17-char hex subnet ID returns valid', () => {
    expect(Validators.validateAwsSubnetId('subnet-0123456789abcdef0')).toEqual({ valid: true, message: '' });
  });

  test('invalid prefix returns error', () => {
    expect(Validators.validateAwsSubnetId('sub-12345678')).toMatchObject({ valid: false });
  });

  test('too-short hex part returns error', () => {
    expect(Validators.validateAwsSubnetId('subnet-1234567')).toMatchObject({ valid: false });
  });

  test('too-long hex part returns error', () => {
    expect(Validators.validateAwsSubnetId('subnet-0123456789abcdef01')).toMatchObject({ valid: false });
  });

  test('non-hex characters returns error', () => {
    expect(Validators.validateAwsSubnetId('subnet-0123456z')).toMatchObject({ valid: false });
  });

  test('non-string input returns required error', () => {
    expect(Validators.validateAwsSubnetId(12345678)).toMatchObject({ valid: false });
  });
});

// ---------------------------------------------------------------------------
// validateAwsSecurityGroupId
// ---------------------------------------------------------------------------
describe('Validators.validateAwsSecurityGroupId', () => {
  test('falsy input returns required error', () => {
    expect(Validators.validateAwsSecurityGroupId('')).toMatchObject({ valid: false });
    expect(Validators.validateAwsSecurityGroupId(null)).toMatchObject({ valid: false });
  });

  test('valid 8-char hex SG ID returns valid', () => {
    expect(Validators.validateAwsSecurityGroupId('sg-12345678')).toEqual({ valid: true, message: '' });
  });

  test('valid 17-char hex SG ID returns valid', () => {
    expect(Validators.validateAwsSecurityGroupId('sg-0123456789abcdef0')).toEqual({ valid: true, message: '' });
  });

  test('invalid prefix returns error', () => {
    expect(Validators.validateAwsSecurityGroupId('sg123456789')).toMatchObject({ valid: false });
  });

  test('too-short hex part returns error', () => {
    expect(Validators.validateAwsSecurityGroupId('sg-1234567')).toMatchObject({ valid: false });
  });
});

// ---------------------------------------------------------------------------
// validateAwsVpcId
// ---------------------------------------------------------------------------
describe('Validators.validateAwsVpcId', () => {
  test('falsy input returns required error', () => {
    expect(Validators.validateAwsVpcId('')).toMatchObject({ valid: false });
    expect(Validators.validateAwsVpcId(null)).toMatchObject({ valid: false });
  });

  test('valid 8-char hex VPC ID returns valid', () => {
    expect(Validators.validateAwsVpcId('vpc-12345678')).toEqual({ valid: true, message: '' });
  });

  test('valid 17-char hex VPC ID returns valid', () => {
    expect(Validators.validateAwsVpcId('vpc-0123456789abcdef0')).toEqual({ valid: true, message: '' });
  });

  test('invalid prefix returns error', () => {
    expect(Validators.validateAwsVpcId('vnet-12345678')).toMatchObject({ valid: false });
  });
});

// ---------------------------------------------------------------------------
// validateAzureVnetId
// ---------------------------------------------------------------------------
describe('Validators.validateAzureVnetId', () => {
  const validVnetId = '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Network/virtualNetworks/my-vnet';

  test('falsy input returns required error', () => {
    expect(Validators.validateAzureVnetId('')).toMatchObject({ valid: false });
    expect(Validators.validateAzureVnetId(null)).toMatchObject({ valid: false });
  });

  test('valid Azure VNet ID returns valid', () => {
    expect(Validators.validateAzureVnetId(validVnetId)).toEqual({ valid: true, message: '' });
  });

  test('missing leading slash returns error', () => {
    expect(Validators.validateAzureVnetId(validVnetId.slice(1))).toMatchObject({ valid: false });
  });

  test('wrong provider segment returns error', () => {
    const bad = validVnetId.replace('Microsoft.Network', 'Microsoft.Compute');
    expect(Validators.validateAzureVnetId(bad)).toMatchObject({ valid: false });
  });

  test('extra trailing path segment returns error', () => {
    expect(Validators.validateAzureVnetId(validVnetId + '/subnets/my-subnet')).toMatchObject({ valid: false });
  });

  test('non-string input returns required error', () => {
    expect(Validators.validateAzureVnetId(42)).toMatchObject({ valid: false });
  });
});

// ---------------------------------------------------------------------------
// validateAzureSubnetName
// ---------------------------------------------------------------------------
describe('Validators.validateAzureSubnetName', () => {
  test('falsy input returns required error', () => {
    expect(Validators.validateAzureSubnetName('')).toMatchObject({ valid: false });
    expect(Validators.validateAzureSubnetName(null)).toMatchObject({ valid: false });
  });

  test('valid subnet name returns valid', () => {
    expect(Validators.validateAzureSubnetName('my-subnet')).toEqual({ valid: true, message: '' });
    expect(Validators.validateAzureSubnetName('subnet1')).toEqual({ valid: true, message: '' });
    expect(Validators.validateAzureSubnetName('Subnet.01')).toEqual({ valid: true, message: '' });
  });

  test('name starting with hyphen returns error', () => {
    expect(Validators.validateAzureSubnetName('-bad')).toMatchObject({ valid: false });
  });

  test('name with spaces returns error', () => {
    expect(Validators.validateAzureSubnetName('my subnet')).toMatchObject({ valid: false });
  });

  test('name over 80 chars returns length error', () => {
    const result = Validators.validateAzureSubnetName('a'.repeat(81));
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/1-80/);
  });

  test('single character name returns valid (min 1)', () => {
    expect(Validators.validateAzureSubnetName('a')).toEqual({ valid: true, message: '' });
  });
});

// ---------------------------------------------------------------------------
// validateGcpResourceName
// ---------------------------------------------------------------------------
describe('Validators.validateGcpResourceName', () => {
  test('falsy input returns required error with default label', () => {
    const result = Validators.validateGcpResourceName('');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/resource name is required/i);
  });

  test('falsy input returns required error with custom label', () => {
    const result = Validators.validateGcpResourceName('', 'VPC name');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/VPC name is required/);
  });

  test('valid GCP resource name returns valid', () => {
    expect(Validators.validateGcpResourceName('my-vpc')).toEqual({ valid: true, message: '' });
    expect(Validators.validateGcpResourceName('vpc1')).toEqual({ valid: true, message: '' });
    expect(Validators.validateGcpResourceName('a')).toEqual({ valid: true, message: '' });
  });

  test('name starting with number returns error', () => {
    const result = Validators.validateGcpResourceName('1bad');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/lowercase letter/i);
  });

  test('name with uppercase returns error', () => {
    expect(Validators.validateGcpResourceName('MyVpc')).toMatchObject({ valid: false });
  });

  test('name with underscore returns error', () => {
    expect(Validators.validateGcpResourceName('my_vpc')).toMatchObject({ valid: false });
  });

  test('name over 63 chars returns error', () => {
    const result = Validators.validateGcpResourceName('a' + 'b'.repeat(63));
    expect(result.valid).toBe(false);
  });

  test('name exactly 63 chars returns valid', () => {
    // regex: [a-z][a-z0-9-]{0,62} — total max 63 chars
    const result = Validators.validateGcpResourceName('a' + 'b'.repeat(62));
    expect(result.valid).toBe(true);
  });

  test('custom label appears in error message', () => {
    const result = Validators.validateGcpResourceName('BadName', 'Subnet name');
    expect(result.message).toMatch(/Subnet name/);
  });
});

// ---------------------------------------------------------------------------
// validateConfiguration (master validator)
// ---------------------------------------------------------------------------
describe('Validators.validateConfiguration', () => {
  // Minimal valid AWS config base
  const validAwsConfig = {
    provider: 'aws',
    project_prefix: 'myproject',
    region: 'us-east-1',
    pricing_tier: 'PREMIUM',
    create_new_vpc: true,
    vpc_cidr: '10.0.0.0/16',
    availability_zones: ['us-east-1a', 'us-east-1b'],
  };

  test('valid AWS config returns valid with no errors', () => {
    const result = Validators.validateConfiguration(validAwsConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('missing project name returns project_prefix error', () => {
    const config = { ...validAwsConfig, project_prefix: '' };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.project_prefix).toBeDefined();
  });

  test('invalid region returns region error', () => {
    const config = { ...validAwsConfig, region: 'BADREGION' };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.region).toBeDefined();
  });

  test('invalid pricing tier returns pricing_tier error', () => {
    const config = { ...validAwsConfig, pricing_tier: 'BASIC' };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.pricing_tier).toBeDefined();
  });

  test('Azure requires resource_group_name', () => {
    const config = {
      provider: 'azure',
      project_prefix: 'myproject',
      region: 'eastus',
      pricing_tier: 'STANDARD',
      create_new_vpc: true,
      vpc_cidr: '10.0.0.0/16',
      availability_zones: ['1', '2'],
      // resource_group_name intentionally omitted
    };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.resource_group_name).toBeDefined();
  });

  test('GCP requires project_id', () => {
    const config = {
      provider: 'gcp',
      project_prefix: 'myproject',
      region: 'us-central1',
      pricing_tier: 'STANDARD',
      create_new_vpc: true,
      vpc_cidr: '10.0.0.0/16',
      availability_zones: ['us-central1-a', 'us-central1-b'],
      // project_id intentionally omitted
    };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.project_id).toBeDefined();
  });

  test('AWS existing VPC requires valid vpc_id', () => {
    const config = {
      ...validAwsConfig,
      create_new_vpc: false,
      existing_vpc_id: '', // missing
    };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.existing_vpc_id).toBeDefined();
  });

  test('AWS existing subnets require subnet IDs and SG', () => {
    const config = {
      ...validAwsConfig,
      create_new_vpc: false,
      existing_vpc_id: 'vpc-12345678',
      create_new_subnets: false,
      // existing_subnet_ids and existing_security_group_id omitted
    };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.existing_subnet_ids).toBeDefined();
    expect(result.errors.existing_security_group_id).toBeDefined();
  });

  test('AWS existing subnets with valid IDs and SG returns no subnet errors', () => {
    const config = {
      ...validAwsConfig,
      create_new_vpc: false,
      create_new_subnets: false,
      existing_vpc_id: 'vpc-12345678',
      existing_subnet_ids: ['subnet-12345678', 'subnet-abcdef12'],
      existing_security_group_id: 'sg-12345678',
    };
    const result = Validators.validateConfiguration(config);
    expect(result.errors.existing_subnet_ids).toBeUndefined();
    expect(result.errors.existing_security_group_id).toBeUndefined();
  });

  test('AWS existing subnets with only one subnet ID returns error', () => {
    const config = {
      ...validAwsConfig,
      create_new_vpc: false,
      create_new_subnets: false,
      existing_vpc_id: 'vpc-12345678',
      existing_subnet_ids: ['subnet-12345678'], // only 1, need at least 2
      existing_security_group_id: 'sg-12345678',
    };
    const result = Validators.validateConfiguration(config);
    expect(result.errors.existing_subnet_ids).toMatch(/at least 2/i);
  });

  test('Azure existing VNet fields are validated', () => {
    const config = {
      provider: 'azure',
      project_prefix: 'myproject',
      region: 'eastus',
      pricing_tier: 'STANDARD',
      resource_group_name: 'my-rg',
      create_new_vpc: false,
      existing_vpc_id: 'bad-vnet-id', // invalid format
      existing_public_subnet_name: 'public-subnet',
      existing_private_subnet_name: 'private-subnet',
    };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.existing_vpc_id).toBeDefined();
  });

  test('GCP ignores legacy existing VPC fields for the new-VPC-only topology', () => {
    const config = {
      provider: 'gcp',
      project_prefix: 'myproject',
      region: 'us-central1',
      pricing_tier: 'STANDARD',
      project_id: 'my-gcp-project',
      create_new_vpc: false,
      existing_vpc_id: 'BadVPCName', // uppercase invalid for GCP
      existing_subnet_name: 'my-subnet',
      existing_pod_range_name: 'pod-range',
      existing_service_range_name: 'svc-range',
    };
    const result = Validators.validateConfiguration(config);
    expect(result.errors.existing_vpc_id).toBeUndefined();
  });

  test('AWS PrivateLink without ENTERPRISE returns feature error', () => {
    const config = {
      ...validAwsConfig,
      pricing_tier: 'STANDARD',
      enable_private_link: true,
    };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.enable_private_link).toMatch(/enterprise/i);
  });

  test('invalid tags JSON returns tags error', () => {
    const config = {
      ...validAwsConfig,
      tags: '{invalid json}',
    };
    const result = Validators.validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.errors.tags).toBeDefined();
  });

  test('valid tags JSON does not return tags error', () => {
    const config = {
      ...validAwsConfig,
      tags: '{"env":"prod"}',
    };
    const result = Validators.validateConfiguration(config);
    expect(result.errors.tags).toBeUndefined();
  });
});

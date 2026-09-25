const { NetworkCalculator, CIDRUtils } = require('../../deploy/js/network-calculator.js');

describe('NetworkCalculator', () => {
  describe('constructor', () => {
    it('lowercases provider', () => {
      const calc = new NetworkCalculator('AWS');
      expect(calc.provider).toBe('aws');
    });
  });

  describe('validateVPCSize', () => {
    it('accepts /16', () => {
      const calc = new NetworkCalculator('aws');
      expect(calc.validateVPCSize('10.0.0.0/16')).toEqual({ valid: true, message: '' });
    });

    it('rejects /7 (too large)', () => {
      const calc = new NetworkCalculator('aws');
      const result = calc.validateVPCSize('10.0.0.0/7');
      expect(result.valid).toBe(false);
    });

    it('rejects /25 (too small)', () => {
      const calc = new NetworkCalculator('aws');
      const result = calc.validateVPCSize('10.0.0.0/25');
      expect(result.valid).toBe(false);
    });

    it('accepts boundary /8', () => {
      const calc = new NetworkCalculator('aws');
      expect(calc.validateVPCSize('10.0.0.0/8').valid).toBe(true);
    });

    it('accepts boundary /24', () => {
      const calc = new NetworkCalculator('aws');
      expect(calc.validateVPCSize('10.0.0.0/24').valid).toBe(true);
    });
  });

  describe('calculateSubnetSize', () => {
    it('returns MIN_SUBNET_SIZE when vpcSize + offset is smaller', () => {
      const calc = new NetworkCalculator('aws');
      expect(calc.calculateSubnetSize(16, 1)).toBe(26);
    });

    it('returns calculated size when larger than MIN_SUBNET_SIZE', () => {
      const calc = new NetworkCalculator('aws');
      expect(calc.calculateSubnetSize(26, 1)).toBe(27);
    });
  });

  describe('calculateSubnetSizeLimits', () => {
    it('returns error for invalid CIDR', () => {
      const calc = new NetworkCalculator('aws');
      const result = calc.calculateSubnetSizeLimits('invalid', 2);
      expect(result.error).toBeDefined();
    });

    it('returns valid limits for /16 with 2 AZs (AWS)', () => {
      const calc = new NetworkCalculator('aws');
      const result = calc.calculateSubnetSizeLimits('10.0.0.0/16', 2, false);
      expect(result.valid).toBe(true);
      expect(result.totalSubnets).toBe(5);
    });

    it('uses workspace subnets for PrivateLink endpoints', () => {
      const calc = new NetworkCalculator('aws');
      const result = calc.calculateSubnetSizeLimits('10.0.0.0/16', 2, true);
      expect(result.totalSubnets).toBe(4);
    });

    it('GCP uses 2 or 3 subnets regardless of AZ count', () => {
      const calc = new NetworkCalculator('gcp');
      const result = calc.calculateSubnetSizeLimits('10.0.0.0/16', 4, false);
      expect(result.totalSubnets).toBe(2);
    });

    it('GCP adds service subnet when privateLink enabled', () => {
      const calc = new NetworkCalculator('gcp');
      const result = calc.calculateSubnetSizeLimits('10.0.0.0/16', 2, true);
      expect(result.totalSubnets).toBe(3);
    });

    it('returns error when VPC is too small for configuration', () => {
      const calc = new NetworkCalculator('aws');
      const result = calc.calculateSubnetSizeLimits('10.0.0.0/24', 6, true);
      expect(result.valid).toBe(false);
    });
  });

  describe('getDefaultSubnetSizes', () => {
    it('AWS returns private and public sizes', () => {
      const calc = new NetworkCalculator('aws');
      const sizes = calc.getDefaultSubnetSizes(16);
      expect(sizes.private).toBeDefined();
      expect(sizes.public).toBeDefined();
      expect(sizes.intra).toBe(27);
    });

    it('AWS ENTERPRISE still uses the standard intra subnet', () => {
      const calc = new NetworkCalculator('aws');
      const sizes = calc.getDefaultSubnetSizes(16, 'ENTERPRISE');
      expect(sizes.intra).toBe(27);
    });

    it('Azure PREMIUM adds service subnet', () => {
      const calc = new NetworkCalculator('azure');
      const sizes = calc.getDefaultSubnetSizes(16, 'PREMIUM');
      expect(sizes.service).toBe(28);
    });

    it('GCP returns host and pods sizes', () => {
      const calc = new NetworkCalculator('gcp');
      const sizes = calc.getDefaultSubnetSizes(16);
      expect(sizes.host).toBeDefined();
      expect(sizes.pods).toBeDefined();
    });

    it('throws for unsupported provider', () => {
      const calc = new NetworkCalculator('oracle');
      expect(() => calc.getDefaultSubnetSizes(16)).toThrow('Unsupported provider');
    });
  });

  describe('allocateSubnets', () => {
    it('throws for invalid CIDR', () => {
      const calc = new NetworkCalculator('aws');
      expect(() => calc.allocateSubnets('invalid', ['us-east-1a', 'us-east-1b'])).toThrow();
    });

    it('allocates AWS private/public subnets plus a standard intra subnet', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = calc.allocateSubnets('10.0.0.0/16', ['us-east-1a', 'us-east-1b']);
      expect(subnets).toHaveLength(5);
      expect(subnets[0].subnet_type).toBe('private');
      expect(subnets[1].subnet_type).toBe('public');
      expect(subnets[2].subnet_type).toBe('private');
      expect(subnets[3].subnet_type).toBe('public');
      expect(subnets[4].subnet_type).toBe('intra');
      expect(subnets[4].size).toBe(27);
    });

    it('does not allocate a legacy service subnet with PrivateLink', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = calc.allocateSubnets('10.0.0.0/16', ['us-east-1a', 'us-east-1b'], 'ENTERPRISE', true);
      expect(subnets).toHaveLength(4);
    });

    it('allocates GCP subnets: host + pods', () => {
      const calc = new NetworkCalculator('gcp');
      const subnets = calc.allocateSubnets('10.0.0.0/16', ['us-central1-a', 'us-central1-b']);
      expect(subnets).toHaveLength(2);
      expect(subnets[0].subnet_type).toBe('host');
      expect(subnets[1].subnet_type).toBe('pods');
    });

    it('no subnets overlap', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = calc.allocateSubnets('10.0.0.0/16', ['us-east-1a', 'us-east-1b', 'us-east-1c']);
      for (let i = 0; i < subnets.length; i++) {
        for (let j = i + 1; j < subnets.length; j++) {
          expect(CIDRUtils.overlaps(subnets[i].cidr, subnets[j].cidr)).toBe(false);
        }
      }
    });

    it('all subnets are within VPC', () => {
      const vpcCIDR = '10.0.0.0/16';
      const calc = new NetworkCalculator('aws');
      const subnets = calc.allocateSubnets(vpcCIDR, ['us-east-1a', 'us-east-1b']);
      for (const subnet of subnets) {
        expect(CIDRUtils.isSubnetInVPC(subnet.cidr, vpcCIDR)).toBe(true);
      }
    });

    it('respects custom subnet size', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = calc.allocateSubnets('10.0.0.0/16', ['us-east-1a'], null, false, 24);
      expect(subnets[0].size).toBe(24);
      expect(subnets[1].size).toBe(24);
    });
  });

  describe('validateSubnetAllocation', () => {
    it('validates correct allocation', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = calc.allocateSubnets('10.0.0.0/16', ['us-east-1a', 'us-east-1b']);
      const result = calc.validateSubnetAllocation('10.0.0.0/16', subnets);
      expect(result.valid).toBe(true);
    });

    it('rejects subnet outside VPC', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = [{ name: 'test', cidr: '192.168.0.0/24' }];
      const result = calc.validateSubnetAllocation('10.0.0.0/16', subnets);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not within VPC');
    });

    it('rejects overlapping subnets', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = [
        { name: 'a', cidr: '10.0.0.0/24' },
        { name: 'b', cidr: '10.0.0.0/25' },
      ];
      const result = calc.validateSubnetAllocation('10.0.0.0/16', subnets);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('overlap');
    });
  });

  describe('calculateNetworkSummary', () => {
    it('calculates utilization correctly', () => {
      const calc = new NetworkCalculator('aws');
      const subnets = calc.allocateSubnets('10.0.0.0/16', ['us-east-1a']);
      const summary = calc.calculateNetworkSummary('10.0.0.0/16', subnets);
      expect(summary.total_ips).toBe(65536);
      expect(summary.used_ips).toBeGreaterThan(0);
      expect(summary.available_ips).toBeLessThan(65536);
      expect(summary.utilization_percent).toBeGreaterThan(0);
      expect(summary.subnet_count).toBe(3);
    });
  });

  describe('getAvailabilityZones', () => {
    it('returns AWS AZs with region prefix', () => {
      const calc = new NetworkCalculator('aws');
      expect(calc.getAvailabilityZones('us-east-1')).toEqual(['us-east-1a', 'us-east-1b']);
    });

    it('returns Azure numeric AZs', () => {
      const calc = new NetworkCalculator('azure');
      expect(calc.getAvailabilityZones('eastus')).toEqual(['1', '2']);
    });

    it('returns GCP AZs with region-letter format', () => {
      const calc = new NetworkCalculator('gcp');
      expect(calc.getAvailabilityZones('us-central1')).toEqual(['us-central1-a', 'us-central1-b']);
    });
  });
});

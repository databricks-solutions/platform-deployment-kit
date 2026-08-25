globalThis.Handlebars = require('handlebars');
const TemplateEngine = require('../../deploy/js/template-engine.js');

describe('TemplateEngine', () => {
  describe('constructor', () => {
    it('creates instance when Handlebars is available', () => {
      const engine = new TemplateEngine();
      expect(engine).toBeInstanceOf(TemplateEngine);
    });

    it('throws when Handlebars is undefined', () => {
      const saved = globalThis.Handlebars;
      globalThis.Handlebars = undefined;
      try {
        expect(() => new TemplateEngine()).toThrow('Handlebars library is not loaded');
      } finally {
        globalThis.Handlebars = saved;
      }
    });
  });

  describe('render(template, variables, templateName)', () => {
    let engine;
    beforeEach(() => {
      engine = new TemplateEngine();
    });

    it('returns empty string for null template', () => {
      expect(engine.render(null, {})).toBe('');
    });

    it('returns empty string for empty string template', () => {
      expect(engine.render('', {})).toBe('');
    });

    it('substitutes variables with triple-brace syntax', () => {
      const result = engine.render('{{{name}}}', { name: 'world' });
      expect(result).toBe('world');
    });

    it('handles missing variables gracefully (strict mode off)', () => {
      const result = engine.render('{{{missing}}}', {});
      expect(result).toBe('');
    });

    it('throws on invalid template syntax (unclosed {{#if}})', () => {
      expect(() => engine.render('{{#if foo}}no end', {})).toThrow();
    });
  });

  describe('custom helpers', () => {
    let engine;
    beforeEach(() => {
      engine = new TemplateEngine();
    });

    describe('eq helper', () => {
      it('returns true for equal values', () => {
        const result = engine.render('{{#if (eq a b)}}yes{{/if}}', { a: 'foo', b: 'foo' });
        expect(result).toBe('yes');
      });

      it('returns false for unequal values', () => {
        const result = engine.render('{{#if (eq a b)}}yes{{else}}no{{/if}}', { a: 'foo', b: 'bar' });
        expect(result).toBe('no');
      });
    });

    describe('contains helper', () => {
      it('detects substring', () => {
        const result = engine.render('{{#if (contains str sub)}}found{{/if}}', { str: 'hello world', sub: 'world' });
        expect(result).toBe('found');
      });

      it('returns false when substring not found', () => {
        const result = engine.render('{{#if (contains str sub)}}found{{else}}not found{{/if}}', { str: 'hello world', sub: 'xyz' });
        expect(result).toBe('not found');
      });
    });

    describe('each helper with @last', () => {
      it('iterates arrays and @last is true on last item', () => {
        const result = engine.render(
          '{{#each items}}{{{this}}}{{#unless @last}},{{/unless}}{{/each}}',
          { items: ['a', 'b', 'c'] }
        );
        expect(result).toBe('a,b,c');
      });
    });

    describe('each helper with @key', () => {
      it('iterates object keys', () => {
        const result = engine.render(
          '{{#each obj}}{{@key}}={{this}} {{/each}}',
          { obj: { x: '1', y: '2' } }
        );
        expect(result).toBe('x=1 y=2 ');
      });
    });
  });

  describe('prepareVariables(config)', () => {
    let engine;
    beforeEach(() => {
      engine = new TemplateEngine();
    });

    describe('boolean conversions', () => {
      it('converts create_new_vpc string "true" to boolean true', () => {
        const vars = engine.prepareVariables({ create_new_vpc: 'true' });
        expect(vars.create_new_vpc).toBe(true);
      });

      it('keeps enable_private_link false as false', () => {
        const vars = engine.prepareVariables({ enable_private_link: false });
        expect(vars.enable_private_link).toBe(false);
      });

      it('defaults NAT gateway mode to per-AZ', () => {
        const vars = engine.prepareVariables({});
        expect(vars.nat_gateway_mode).toBe('per_az');
      });

      it('preserves an explicit single NAT gateway mode', () => {
        const vars = engine.prepareVariables({ nat_gateway_mode: 'single' });
        expect(vars.nat_gateway_mode).toBe('single');
      });

      it('preserves an explicit no NAT gateway mode', () => {
        const vars = engine.prepareVariables({ nat_gateway_mode: 'none' });
        expect(vars.nat_gateway_mode).toBe('none');
      });
    });

    describe('availability_zones', () => {
      it('converts array to JSON string', () => {
        const vars = engine.prepareVariables({ availability_zones: ['us-east-1a', 'us-east-1b'] });
        expect(vars.availability_zones).toBe('["us-east-1a","us-east-1b"]');
      });

      it('defaults to "[]" when missing', () => {
        const vars = engine.prepareVariables({});
        expect(vars.availability_zones).toBe('[]');
      });
    });

    describe('tags / common_tags', () => {
      it('converts tags object to common_tags JSON string', () => {
        const vars = engine.prepareVariables({ tags: { env: 'prod', team: 'data' } });
        expect(vars.common_tags).toBe('{"env":"prod","team":"data"}');
      });

      it('defaults common_tags to "{}" when tags missing', () => {
        const vars = engine.prepareVariables({});
        expect(vars.common_tags).toBe('{}');
      });
    });

    describe('calculated_subnets', () => {
      const subnets = [
        { name: 'public-a', subnet_type: 'public', cidr: '10.0.0.0/24' },
        { name: 'private-b', subnet_type: 'private', cidr: '10.0.1.0/24' },
      ];

      it('applies name_replace (hyphens to underscores)', () => {
        const vars = engine.prepareVariables({ calculated_subnets: subnets });
        expect(vars.calculated_subnets[0].name_replace).toBe('public_a');
        expect(vars.calculated_subnets[1].name_replace).toBe('private_b');
      });

      it('sets is_public correctly', () => {
        const vars = engine.prepareVariables({ calculated_subnets: subnets });
        expect(vars.calculated_subnets[0].is_public).toBe(true);
        expect(vars.calculated_subnets[1].is_public).toBe(false);
      });

      it('sets is_private correctly', () => {
        const vars = engine.prepareVariables({ calculated_subnets: subnets });
        expect(vars.calculated_subnets[0].is_private).toBe(false);
        expect(vars.calculated_subnets[1].is_private).toBe(true);
      });
    });

    describe('first_public_subnet_var and first_private_subnet_var', () => {
      it('computes first_public_subnet_var from subnets', () => {
        const vars = engine.prepareVariables({
          calculated_subnets: [
            { name: 'pub-a', subnet_type: 'public' },
            { name: 'priv-a', subnet_type: 'private' },
          ],
        });
        expect(vars.first_public_subnet_var).toBe('pub_a');
        expect(vars.first_private_subnet_var).toBe('priv_a');
      });

      it('defaults first_public_subnet_var to "public_a" when no public subnet', () => {
        const vars = engine.prepareVariables({ calculated_subnets: [] });
        expect(vars.first_public_subnet_var).toBe('public_a');
      });

      it('defaults first_private_subnet_var to "private_a" when no private subnet', () => {
        const vars = engine.prepareVariables({ calculated_subnets: [] });
        expect(vars.first_private_subnet_var).toBe('private_a');
      });
    });

    describe('first_host_subnet_var for GCP subnets', () => {
      it('computes first_host_subnet_var from host subnet', () => {
        const vars = engine.prepareVariables({
          calculated_subnets: [{ name: 'host-primary', subnet_type: 'host' }],
        });
        expect(vars.first_host_subnet_var).toBe('host_primary');
      });

      it('defaults first_host_subnet_var to "host" when no host subnet', () => {
        const vars = engine.prepareVariables({});
        expect(vars.first_host_subnet_var).toBe('host');
      });
    });

    describe('pricing_tier_lower', () => {
      it('lowercases pricing_tier', () => {
        const vars = engine.prepareVariables({ pricing_tier: 'PREMIUM' });
        expect(vars.pricing_tier_lower).toBe('premium');
      });

      it('defaults to "premium" when pricing_tier missing', () => {
        const vars = engine.prepareVariables({});
        expect(vars.pricing_tier_lower).toBe('premium');
      });
    });

    describe('provider_upper', () => {
      it('uppercases provider', () => {
        const vars = engine.prepareVariables({ provider: 'aws' });
        expect(vars.provider_upper).toBe('AWS');
      });

      it('defaults to empty string when provider missing', () => {
        const vars = engine.prepareVariables({});
        expect(vars.provider_upper).toBe('');
      });
    });

    describe('existing_subnet_ids', () => {
      it('converts array to JSON string', () => {
        const vars = engine.prepareVariables({ existing_subnet_ids: ['subnet-111', 'subnet-222'] });
        expect(vars.existing_subnet_ids).toBe('["subnet-111","subnet-222"]');
      });

      it('defaults to "[]" when missing', () => {
        const vars = engine.prepareVariables({});
        expect(vars.existing_subnet_ids).toBe('[]');
      });
    });

    describe('existing_security_group_id', () => {
      it('wraps single value into a JSON array string', () => {
        const vars = engine.prepareVariables({ existing_security_group_id: 'sg-abc123' });
        expect(vars.existing_security_group_ids).toBe('["sg-abc123"]');
      });
    });

    describe('AWS PrivateLink subnet mode handling', () => {
      it('uses provided privatelink_subnet_mode when AWS and private link enabled', () => {
        const vars = engine.prepareVariables({
          provider: 'aws',
          enable_private_link: true,
          privatelink_subnet_mode: 'existing',
          existing_privatelink_subnet_id: 'subnet-pl-123',
        });
        expect(vars.privatelink_subnet_mode).toBe('existing');
        expect(vars.existing_privatelink_subnet_id).toBe('subnet-pl-123');
      });

      it('defaults privatelink_subnet_mode to "terraform_managed" when AWS and private link enabled without mode', () => {
        const vars = engine.prepareVariables({
          provider: 'aws',
          enable_private_link: true,
        });
        expect(vars.privatelink_subnet_mode).toBe('terraform_managed');
      });
    });

    describe('Non-AWS defaults', () => {
      it('defaults privatelink_subnet_mode to "terraform_managed" for non-AWS provider', () => {
        const vars = engine.prepareVariables({
          provider: 'azure',
          enable_private_link: true,
        });
        expect(vars.privatelink_subnet_mode).toBe('terraform_managed');
      });
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Analytics = require('../../deploy/js/analytics.js');

function createEnvironment() {
  const appendedScripts = [];
  const document = {
    createElement: vi.fn(() => ({})),
    head: { appendChild: vi.fn(script => appendedScripts.push(script)) }
  };
  const window = {
    location: {
      hash: '#/configure',
      origin: 'https://example.test',
      pathname: '/platform-kit/'
    },
    addEventListener: vi.fn()
  };

  return { window, document, appendedScripts };
}

describe('privacy-safe analytics', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('loads the public Google Analytics script during initialization', () => {
    const analytics = new Analytics(environment);

    expect(analytics.init()).toBe(true);
    expect(environment.appendedScripts).toHaveLength(1);
    expect(environment.appendedScripts[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-5X6FQW3GP1'
    );
  });

  it('initializes only once', () => {
    const analytics = new Analytics(environment);
    analytics.init();

    expect(analytics.init()).toBe(false);
    expect(environment.appendedScripts).toHaveLength(1);
  });

  it('rejects unknown event names and arbitrary provider values', () => {
    const analytics = new Analytics(environment);
    analytics.init();
    const initialQueueLength = environment.window.dataLayer.length;

    expect(analytics.track('form_value', 'aws')).toBe(false);
    expect(analytics.track('project_generated', 'customer-account-id')).toBe(false);
    expect(environment.window.dataLayer).toHaveLength(initialQueueLength);
  });

  it('emits only an allowlisted event and cloud provider', () => {
    const analytics = new Analytics(environment);
    analytics.init();

    expect(analytics.track('project_generated', 'gcp')).toBe(true);
    const args = Array.from(environment.window.dataLayer.at(-1));
    expect(args).toEqual([
      'event',
      'project_generated',
      { cloud_provider: 'gcp' }
    ]);
  });

  it('maps unknown routes to a fixed safe page location', () => {
    environment.window.location.hash = '#/unknown?account_id=sensitive';
    const analytics = new Analytics(environment);
    analytics.init();

    const args = Array.from(environment.window.dataLayer.at(-1));
    expect(args[0]).toBe('event');
    expect(args[1]).toBe('page_view');
    expect(args[2].page_location).toBe('https://example.test/platform-kit/#/');
    expect(JSON.stringify(args)).not.toContain('sensitive');
  });
});


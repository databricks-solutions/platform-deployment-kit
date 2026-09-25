import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Analytics = require('../../deploy/js/analytics.js');

function createEnvironment(consent = null) {
  const values = new Map();
  if (consent) values.set(Analytics.constants.CONSENT_KEY, consent);

  const elements = {
    'analytics-consent': {
      hidden: true,
      querySelector: vi.fn(() => ({ focus: vi.fn() }))
    },
    'analytics-accept': { addEventListener: vi.fn() },
    'analytics-decline': { addEventListener: vi.fn() },
    'analytics-preferences': { addEventListener: vi.fn() }
  };
  const appendedScripts = [];
  const document = {
    getElementById: vi.fn(id => elements[id] || null),
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
  const storage = {
    getItem: vi.fn(key => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value))
  };

  return { window, document, storage, elements, appendedScripts };
}

describe('privacy-safe analytics', () => {
  let environment;

  beforeEach(() => {
    environment = createEnvironment();
  });

  it('does not load Google Analytics before consent', () => {
    const analytics = new Analytics(environment);
    analytics.init();

    expect(environment.appendedScripts).toHaveLength(0);
    expect(environment.elements['analytics-consent'].hidden).toBe(false);
  });

  it('does not load Google Analytics when consent is declined', () => {
    const analytics = new Analytics(environment);
    analytics.init();
    analytics.setConsent('denied');

    expect(environment.appendedScripts).toHaveLength(0);
    expect(environment.storage.setItem).toHaveBeenCalledWith(
      Analytics.constants.CONSENT_KEY,
      'denied'
    );
  });

  it('loads only the public measurement script after consent', () => {
    const analytics = new Analytics(environment);
    analytics.init();
    analytics.setConsent('granted');

    expect(environment.appendedScripts).toHaveLength(1);
    expect(environment.appendedScripts[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-5X6FQW3GP1'
    );
  });

  it('rejects unknown event names and arbitrary provider values', () => {
    const analytics = new Analytics(environment);
    analytics.setConsent('granted');
    const initialQueueLength = environment.window.dataLayer.length;

    expect(analytics.track('form_value', 'aws')).toBe(false);
    expect(analytics.track('project_generated', 'customer-account-id')).toBe(false);
    expect(environment.window.dataLayer).toHaveLength(initialQueueLength);
  });

  it('emits only an allowlisted event and cloud provider', () => {
    const analytics = new Analytics(environment);
    analytics.setConsent('granted');

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
    analytics.setConsent('granted');

    const args = Array.from(environment.window.dataLayer.at(-1));
    expect(args[0]).toBe('event');
    expect(args[1]).toBe('page_view');
    expect(args[2].page_location).toBe('https://example.test/platform-kit/#/');
    expect(JSON.stringify(args)).not.toContain('sensitive');
  });
});


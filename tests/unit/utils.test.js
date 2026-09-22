import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

// Note: Node 18+ exposes crypto.subtle globally — no setup needed.

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _reset: () => { store = {}; },
  };
})();

globalThis.localStorage = localStorageMock;

// Mock document for DOM methods
globalThis.document = {
  createElement: vi.fn((tag) => {
    if (tag === 'div') {
      let textContent = '';
      return {
        get textContent() { return textContent; },
        set textContent(v) { textContent = v; },
        get innerHTML() {
          return textContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
      };
    }
    return {};
  }),
  getElementById: vi.fn(() => null),
  body: { appendChild: vi.fn(), removeChild: vi.fn() },
};

globalThis.URL = {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
};

// Load Utils via CJS require (the source uses module.exports)
const require = createRequire(import.meta.url);
const Utils = require('../../deploy/js/utils.js');

beforeEach(() => {
  localStorageMock._reset();
  vi.clearAllMocks();
});

// =============================================================================
// Pure functions
// =============================================================================

describe('debounce', () => {
  it('delays execution until after wait period', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = Utils.debounce(fn, 100);

    debounced('a');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('a');

    vi.useRealTimers();
  });

  it('coalesces multiple rapid calls into one', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = Utils.debounce(fn, 200);

    debounced('first');
    debounced('second');
    debounced('third');

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('third');

    vi.useRealTimers();
  });
});

describe('getProviderName', () => {
  it('maps aws to Amazon Web Services', () => {
    expect(Utils.getProviderName('aws')).toBe('Amazon Web Services');
  });

  it('maps azure to Microsoft Azure', () => {
    expect(Utils.getProviderName('azure')).toBe('Microsoft Azure');
  });

  it('maps gcp to Google Cloud Platform', () => {
    expect(Utils.getProviderName('gcp')).toBe('Google Cloud Platform');
  });

  it('returns the original string for unknown providers', () => {
    expect(Utils.getProviderName('unknown')).toBe('unknown');
  });
});

describe('getProviderIcon', () => {
  it('maps aws to bi-amazon text-warning', () => {
    expect(Utils.getProviderIcon('aws')).toBe('bi-amazon text-warning');
  });

  it('maps azure to bi-microsoft text-info', () => {
    expect(Utils.getProviderIcon('azure')).toBe('bi-microsoft text-info');
  });

  it('maps gcp to bi-google text-success', () => {
    expect(Utils.getProviderIcon('gcp')).toBe('bi-google text-success');
  });

  it('returns bi-cloud for unknown provider', () => {
    expect(Utils.getProviderIcon('unknown')).toBe('bi-cloud');
  });
});

describe('formatNumber', () => {
  it('formats a plain number with commas', () => {
    expect(Utils.formatNumber(1000)).toBe('1,000');
  });

  it('formats a large number with commas', () => {
    expect(Utils.formatNumber(1234567)).toBe('1,234,567');
  });

  it('returns small numbers unchanged', () => {
    expect(Utils.formatNumber(42)).toBe('42');
  });
});

// =============================================================================
// Storage operations
// =============================================================================

describe('getStorage / setStorage / clearStorage', () => {
  it('setStorage serializes value as JSON', () => {
    const result = Utils.setStorage('testKey', { foo: 'bar' });
    expect(result).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', JSON.stringify({ foo: 'bar' }));
  });

  it('getStorage deserializes JSON value', () => {
    Utils.setStorage('testKey', { foo: 'bar' });
    const value = Utils.getStorage('testKey');
    expect(value).toEqual({ foo: 'bar' });
  });

  it('getStorage returns null for missing key', () => {
    expect(Utils.getStorage('nonexistent')).toBeNull();
  });

  it('clearStorage clears all localStorage entries', () => {
    Utils.setStorage('a', 1);
    Utils.setStorage('b', 2);
    const result = Utils.clearStorage();
    expect(result).toBe(true);
    expect(localStorageMock.clear).toHaveBeenCalled();
  });
});

// =============================================================================
// HTML / Security
// =============================================================================

describe('escapeHtml', () => {
  it('escapes < and > characters', () => {
    expect(Utils.escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes & characters', () => {
    expect(Utils.escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes double quotes', () => {
    expect(Utils.escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(Utils.escapeHtml("it's")).toBe('it&#039;s');
  });

  it('leaves plain text unchanged', () => {
    expect(Utils.escapeHtml('hello world')).toBe('hello world');
  });
});


// =============================================================================
// DOM-related methods
// =============================================================================

describe('downloadFile', () => {
  it('calls URL.createObjectURL, appends anchor, clicks, removes, and revokes', () => {
    const mockAnchor = { href: null, download: null, click: vi.fn() };
    globalThis.document.createElement = vi.fn((tag) => {
      if (tag === 'a') return mockAnchor;
      if (tag === 'div') {
        let textContent = '';
        return {
          get textContent() { return textContent; },
          set textContent(v) { textContent = v; },
          get innerHTML() {
            return textContent
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          }
        };
      }
      return {};
    });
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
    globalThis.document.body.appendChild = vi.fn();
    globalThis.document.body.removeChild = vi.fn();

    const mockBlob = new Blob(['hello'], { type: 'text/plain' });
    Utils.downloadFile(mockBlob, 'test.txt');

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toBe('test.txt');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(globalThis.document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(globalThis.document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('showFlashMessage', () => {
  it('does nothing when container element is null', () => {
    // getElementById returns null (mock default), so no error should be thrown
    expect(() => Utils.showFlashMessage('test', 'info')).not.toThrow();
  });

  it('appends alert to container when element exists', () => {
    vi.useFakeTimers();
    const mockAlertDiv = { className: '', innerHTML: '', remove: vi.fn() };
    const mockContainer = { appendChild: vi.fn() };
    globalThis.document.getElementById = vi.fn((id) => {
      if (id === 'flash-messages') return mockContainer;
      return null;
    });
    globalThis.document.createElement = vi.fn(() => mockAlertDiv);

    Utils.showFlashMessage('Hello World', 'success');

    expect(mockContainer.appendChild).toHaveBeenCalledWith(mockAlertDiv);
    expect(mockAlertDiv.className).toContain('alert-success');

    // Timer should auto-remove after 5 seconds
    vi.advanceTimersByTime(5000);
    expect(mockAlertDiv.remove).toHaveBeenCalled();

    // Restore
    globalThis.document.getElementById = vi.fn(() => null);
    vi.useRealTimers();
  });

  it('uses "danger" class for error type', () => {
    const mockAlertDiv = { className: '', innerHTML: '', remove: vi.fn() };
    const mockContainer = { appendChild: vi.fn() };
    globalThis.document.getElementById = vi.fn((id) => {
      if (id === 'flash-messages') return mockContainer;
      return null;
    });
    globalThis.document.createElement = vi.fn(() => mockAlertDiv);

    Utils.showFlashMessage('Error occurred', 'error');
    expect(mockAlertDiv.className).toContain('alert-danger');

    globalThis.document.getElementById = vi.fn(() => null);
  });
});

describe('showLoading / hideLoading', () => {
  it('showLoading does nothing when overlay element is null', () => {
    globalThis.document.getElementById = vi.fn(() => null);
    expect(() => Utils.showLoading('Loading...')).not.toThrow();
    globalThis.document.getElementById = vi.fn(() => null);
  });

  it('showLoading sets message and removes d-none class', () => {
    const mockOverlay = { classList: { remove: vi.fn(), add: vi.fn() } };
    const mockMessageEl = { textContent: '' };
    globalThis.document.getElementById = vi.fn((id) => {
      if (id === 'loading-overlay') return mockOverlay;
      if (id === 'loading-message') return mockMessageEl;
      return null;
    });

    Utils.showLoading('Please wait');

    expect(mockMessageEl.textContent).toBe('Please wait');
    expect(mockOverlay.classList.remove).toHaveBeenCalledWith('d-none');

    globalThis.document.getElementById = vi.fn(() => null);
  });

  it('hideLoading does nothing when overlay element is null', () => {
    globalThis.document.getElementById = vi.fn(() => null);
    expect(() => Utils.hideLoading()).not.toThrow();
    globalThis.document.getElementById = vi.fn(() => null);
  });

  it('hideLoading adds d-none class when overlay exists', () => {
    const mockOverlay = { classList: { add: vi.fn() } };
    globalThis.document.getElementById = vi.fn((id) => {
      if (id === 'loading-overlay') return mockOverlay;
      return null;
    });

    Utils.hideLoading();
    expect(mockOverlay.classList.add).toHaveBeenCalledWith('d-none');

    globalThis.document.getElementById = vi.fn(() => null);
  });
});

describe('formatDate', () => {
  it('returns a non-empty string for a given date', () => {
    const date = new Date('2024-01-15T10:30:00');
    const result = Utils.formatDate(date);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('defaults to current date when no argument provided', () => {
    const result = Utils.formatDate();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('waitForJSZip', () => {
  it('resolves immediately when JSZip is already defined', async () => {
    globalThis.JSZip = {};
    await expect(Utils.waitForJSZip()).resolves.toBeUndefined();
    delete globalThis.JSZip;
  });

  it('rejects after timeout when JSZip never loads', async () => {
    vi.useFakeTimers();
    const promise = Utils.waitForJSZip(500);
    vi.advanceTimersByTime(600);
    await expect(promise).rejects.toThrow('JSZip library failed to load');
    vi.useRealTimers();
  });

  it('resolves when JSZip becomes available before timeout', async () => {
    vi.useFakeTimers();
    const promise = Utils.waitForJSZip(1000);
    // Simulate JSZip loading after 200ms
    setTimeout(() => { globalThis.JSZip = {}; }, 200);
    vi.advanceTimersByTime(300);
    await expect(promise).resolves.toBeUndefined();
    delete globalThis.JSZip;
    vi.useRealTimers();
  });
});

describe('updateProgress', () => {
  it('returns early when progressBar or progressContainer is null', () => {
    globalThis.document.getElementById = vi.fn(() => null);
    expect(() => Utils.updateProgress(1)).not.toThrow();
    globalThis.document.getElementById = vi.fn(() => null);
  });

  it('sets progress bar width and aria value', () => {
    const mockBar = { style: {}, setAttribute: vi.fn() };
    const mockContainer = { style: {} };
    globalThis.document.getElementById = vi.fn((id) => {
      if (id === 'progress-bar') return mockBar;
      if (id === 'progress-indicator') return mockContainer;
      return null;
    });

    Utils.updateProgress(2);

    expect(mockBar.style.width).toBe(`${(2 / 3) * 100}%`);
    expect(mockBar.setAttribute).toHaveBeenCalledWith('aria-valuenow', (2 / 3) * 100);
    expect(mockContainer.style.display).toBe('block');

    globalThis.document.getElementById = vi.fn(() => null);
  });
});

/**
 * Privacy-focused Google Analytics integration.
 *
 * Google Analytics is loaded only after explicit consent. The public API accepts
 * only fixed event names and cloud-provider values so user configuration cannot
 * accidentally be included in telemetry.
 */
(function (root, factory) {
  const Analytics = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = Analytics;
  }

  if (root) {
    root.PlatformAnalytics = new Analytics({
      window: root,
      document: root.document,
      storage: root.localStorage
    });
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const MEASUREMENT_ID = 'G-5X6FQW3GP1';
  const CONSENT_KEY = 'platform_kit_analytics_consent';
  const VALID_CONSENT = new Set(['granted', 'denied']);
  const VALID_PROVIDERS = new Set(['aws', 'azure', 'gcp']);
  const VALID_EVENTS = new Set([
    'cloud_provider_selected',
    'project_generated',
    'terraform_project_downloaded'
  ]);
  const ROUTES = Object.freeze({
    '/': 'home',
    '/select-provider': 'select_provider',
    '/configure': 'configure',
    '/summary': 'summary',
    '/download': 'download',
    '/reset': 'reset'
  });

  class Analytics {
    constructor(environment = {}) {
      this.window = environment.window || null;
      this.document = environment.document || null;
      this.storage = environment.storage || null;
      this.measurementId = MEASUREMENT_ID;
      this.enabled = false;
      this.initialized = false;
      this.bound = false;
    }

    getConsent() {
      try {
        const value = this.storage?.getItem(CONSENT_KEY);
        return VALID_CONSENT.has(value) ? value : null;
      } catch (_error) {
        return null;
      }
    }

    init() {
      if (!this.window || !this.document || this.bound) return;
      this.bound = true;

      this.document.getElementById('analytics-accept')?.addEventListener('click', () => {
        this.setConsent('granted');
      });
      this.document.getElementById('analytics-decline')?.addEventListener('click', () => {
        this.setConsent('denied');
      });
      this.document.getElementById('analytics-preferences')?.addEventListener('click', () => {
        this.showBanner();
      });
      this.window.addEventListener('hashchange', () => this.trackPageView());

      const consent = this.getConsent();
      if (consent === 'granted') {
        this.enable();
      } else if (!consent) {
        this.showBanner();
      }
    }

    showBanner() {
      const banner = this.document?.getElementById('analytics-consent');
      if (banner) {
        banner.hidden = false;
        banner.querySelector('button')?.focus();
      }
    }

    hideBanner() {
      const banner = this.document?.getElementById('analytics-consent');
      if (banner) banner.hidden = true;
    }

    setConsent(value) {
      if (!VALID_CONSENT.has(value)) return false;

      try {
        this.storage?.setItem(CONSENT_KEY, value);
      } catch (_error) {
        // Consent still applies for this page even if browser storage is blocked.
      }

      this.hideBanner();
      if (value === 'granted') {
        this.enable();
      } else {
        this.enabled = false;
        if (typeof this.window?.gtag === 'function') {
          this.window.gtag('consent', 'update', { analytics_storage: 'denied' });
        }
      }
      return true;
    }

    enable() {
      if (!this.window || !this.document) return false;
      this.enabled = true;

      if (!this.initialized) {
        this.window.dataLayer = this.window.dataLayer || [];
        this.window.gtag = this.window.gtag || function () {
          this.window.dataLayer.push(arguments);
        }.bind(this);

        this.window.gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied'
        });
        this.window.gtag('consent', 'update', { analytics_storage: 'granted' });
        this.window.gtag('js', new Date());
        this.window.gtag('config', this.measurementId, {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
          page_referrer: ''
        });

        const script = this.document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
        script.id = 'platform-kit-google-analytics';
        this.document.head.appendChild(script);
        this.initialized = true;
      } else {
        this.window.gtag('consent', 'update', { analytics_storage: 'granted' });
      }

      this.trackPageView();
      return true;
    }

    safeRoute(hash) {
      const route = String(hash || '').replace(/^#/, '').split('?')[0] || '/';
      return Object.prototype.hasOwnProperty.call(ROUTES, route) ? route : '/';
    }

    trackPageView() {
      if (!this.enabled || typeof this.window?.gtag !== 'function') return false;

      const route = this.safeRoute(this.window.location?.hash);
      const origin = this.window.location?.origin || '';
      const pathname = this.window.location?.pathname || '/';
      this.window.gtag('event', 'page_view', {
        page_title: `Platform Kit | ${ROUTES[route]}`,
        page_location: `${origin}${pathname}#${route}`,
        page_referrer: ''
      });
      return true;
    }

    track(eventName, provider) {
      if (!this.enabled || typeof this.window?.gtag !== 'function') return false;
      if (!VALID_EVENTS.has(eventName) || !VALID_PROVIDERS.has(provider)) return false;

      this.window.gtag('event', eventName, { cloud_provider: provider });
      return true;
    }
  }

  Analytics.constants = Object.freeze({
    MEASUREMENT_ID,
    CONSENT_KEY,
    ROUTES
  });

  return Analytics;
});


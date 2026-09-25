/**
 * Privacy-focused Google Analytics integration.
 *
 * The public API accepts only fixed event names and cloud-provider values so
 * user configuration cannot accidentally be included in telemetry.
 */
(function (root, factory) {
  const Analytics = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = Analytics;
  }

  if (root) {
    root.PlatformAnalytics = new Analytics({
      window: root,
      document: root.document
    });
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const MEASUREMENT_ID = 'G-5X6FQW3GP1';
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
      this.measurementId = MEASUREMENT_ID;
      this.initialized = false;
      this.bound = false;
    }

    init() {
      if (!this.window || !this.document || this.bound) return false;
      this.bound = true;
      this.window.addEventListener('hashchange', () => this.trackPageView());
      return this.enable();
    }

    enable() {
      if (!this.window || !this.document) return false;

      if (!this.initialized) {
        this.window.dataLayer = this.window.dataLayer || [];
        this.window.gtag = this.window.gtag || function () {
          this.window.dataLayer.push(arguments);
        }.bind(this);

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
      }

      this.trackPageView();
      return true;
    }

    safeRoute(hash) {
      const route = String(hash || '').replace(/^#/, '').split('?')[0] || '/';
      return Object.prototype.hasOwnProperty.call(ROUTES, route) ? route : '/';
    }

    trackPageView() {
      if (!this.initialized || typeof this.window?.gtag !== 'function') return false;

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
      if (!this.initialized || typeof this.window?.gtag !== 'function') return false;
      if (!VALID_EVENTS.has(eventName) || !VALID_PROVIDERS.has(provider)) return false;

      this.window.gtag('event', eventName, { cloud_provider: provider });
      return true;
    }
  }

  Analytics.constants = Object.freeze({ MEASUREMENT_ID, ROUTES });

  return Analytics;
});


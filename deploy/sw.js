// Service Worker for Databricks Deployer PWA
const CACHE_NAME = 'databricks-deployer-v14';
const BASE_PATH = self.location.pathname.replace('/sw.js', '') || './';

// Template files to cache
const templateFiles = [
  // AWS templates
  'templates/aws/config.json',
  'templates/aws/provider.tf.template',
  'templates/aws/variables.tf.template',
  'templates/aws/tfvars.tf.template',
  'templates/aws/main.tf.template',
  'templates/aws/outputs.tf.template',
  'templates/aws/versions.tf.template',
  'templates/aws/readme.md.template',
  // Azure templates
  'templates/azure/config.json',
  'templates/azure/provider.tf.template',
  'templates/azure/variables.tf.template',
  'templates/azure/tfvars.tf.template',
  'templates/azure/main.tf.template',
  'templates/azure/outputs.tf.template',
  'templates/azure/versions.tf.template',
  'templates/azure/readme.md.template',
  // GCP templates
  'templates/gcp/config.json',
  'templates/gcp/provider.tf.template',
  'templates/gcp/variables.tf.template',
  'templates/gcp/tfvars.tf.template',
  'templates/gcp/main.tf.template',
  'templates/gcp/outputs.tf.template',
  'templates/gcp/versions.tf.template',
  'templates/gcp/readme.md.template',
  // Module templates
  'templates/modules/network/main.tf.template',
  'templates/modules/network/variables.tf.template',
  'templates/modules/network/outputs.tf.template',
  'templates/modules/databricks/main.tf.template',
  'templates/modules/databricks/variables.tf.template',
  'templates/modules/databricks/outputs.tf.template'
];

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'css/main.css',
  BASE_PATH + 'js/app.js',
  BASE_PATH + 'js/network-calculator.js',
  BASE_PATH + 'js/terraform-generator.js',
  BASE_PATH + 'js/template-loader.js',
  BASE_PATH + 'js/template-engine.js',
  BASE_PATH + 'js/validators.js',
  BASE_PATH + 'js/utils.js',
  // Local libraries
  BASE_PATH + 'libs/bootstrap/css/bootstrap.min.css',
  BASE_PATH + 'libs/bootstrap/js/bootstrap.bundle.min.js',
  BASE_PATH + 'libs/bootstrap-icons/font/bootstrap-icons.css',
  BASE_PATH + 'libs/bootstrap-icons/font/fonts/bootstrap-icons.woff',
  BASE_PATH + 'libs/bootstrap-icons/font/fonts/bootstrap-icons.woff2',
  BASE_PATH + 'libs/jszip/jszip.min.js',
  BASE_PATH + 'libs/handlebars/handlebars.min.js',
  BASE_PATH + 'libs/choices.js/css/choices.min.css',
  BASE_PATH + 'libs/choices.js/js/choices.min.js',
  // Local fonts
  BASE_PATH + 'fonts/manrope/manrope-latin-wght-normal.woff2',
  BASE_PATH + 'fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2',
  BASE_PATH + 'fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2',
  BASE_PATH + 'fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2',
  BASE_PATH + 'fonts/jetbrains-mono/jetbrains-mono-latin-700-normal.woff2',
  // Template files
  ...templateFiles.map(file => BASE_PATH + file)
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        
        // Cache resources with error handling
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch((err) => {
            console.warn('Failed to cache:', url, err);
            // Don't fail the entire installation if one resource fails
            return null;
          });
        });
        
        return Promise.allSettled(cachePromises);
      })
      .then((results) => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`Cache installation: ${successful} successful, ${failed} failed`);
      })
      .catch((err) => {
        console.error('Cache install failed:', err);
      })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network (Cache First strategy)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // Filter out unsupported schemes (chrome-extension://, file://, etc.)
  const unsupportedSchemes = ['chrome-extension:', 'chrome:', 'moz-extension:', 'safari-extension:', 'file:'];
  if (unsupportedSchemes.some(scheme => url.protocol.startsWith(scheme))) {
    // Don't intercept these requests - let browser handle them
    return;
  }
  
  // Handle CDN resources (cache first, fallback to network)
  if (url.origin !== self.location.origin) {
    // For CDN resources, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Try network, but don't fail if offline
          return fetch(event.request)
            .then((response) => {
              // Cache successful responses (only http/https)
              if (response && response.status === 200 && (url.protocol === 'http:' || url.protocol === 'https:')) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache).catch((err) => {
                    console.warn('Failed to cache resource:', event.request.url, err);
                  });
                });
              }
              return response;
            })
            .catch(() => {
              // If offline and no cache, return a basic response
              if (event.request.destination === 'script') {
                return new Response('console.warn("Resource unavailable offline");', {
                  headers: { 'Content-Type': 'application/javascript' }
                });
              }
              return new Response('', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
    return;
  }

  // Always fetch version.json from network (never cache deploy metadata)
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // Handle same-origin requests (Cache First with Network Fallback)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
          // Return cached version if available
        if (cachedResponse) {
          // Also try to update cache in background (only for http/https)
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            fetch(event.request)
              .then((response) => {
                if (response && response.status === 200) {
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache).catch((err) => {
                      console.warn('Failed to update cache:', event.request.url, err);
                    });
                  });
                }
              })
              .catch(() => {
                // Ignore network errors when updating cache
              });
          }
          
          return cachedResponse;
        }
        
        // Not in cache, try network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Only cache http/https requests (not chrome-extension, etc.)
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              // Clone the response for caching
              const responseToCache = response.clone();

              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch((err) => {
                  console.warn('Failed to cache resource:', event.request.url, err);
                });
              });
            }

            return response;
          })
          .catch(() => {
            // Network failed, try fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(BASE_PATH + 'index.html');
            }
            
            // For other requests, return error
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

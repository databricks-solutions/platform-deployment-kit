// Migration worker: removes caches and registrations from earlier installable releases.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(name => name.startsWith('databricks-deployer-'))
          .map(name => caches.delete(name))
      ))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => Promise.all(
        clients.map(client => client.navigate(client.url))
      ))
  );
});

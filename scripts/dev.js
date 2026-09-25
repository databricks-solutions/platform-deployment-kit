const fs = require('fs');
const http = require('http');
const path = require('path');
const { build } = require('./build');

const repoRoot = path.resolve(__dirname, '..');
const deployDir = path.join(repoRoot, 'deploy');
const distDir = path.join(repoRoot, 'dist');
const port = Number(process.argv[2] || process.env.PORT || 8000);
const pollIntervalMs = 300;
const reloadClients = new Set();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tf': 'text/plain; charset=utf-8',
  '.tfvars': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip'
};

const devClient = `
<script data-oneclick-dev-client>
(() => {
  const resetKey = 'oneclick-dev-service-worker-reset';

  async function start() {
    if ('serviceWorker' in navigator) {
      const controlled = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      if (controlled && !sessionStorage.getItem(resetKey)) {
        sessionStorage.setItem(resetKey, 'true');
        window.location.reload();
        return;
      }
    }

    sessionStorage.removeItem(resetKey);
    const events = new EventSource('/__dev/events');
    events.addEventListener('reload', () => window.location.reload());
  }

  start().catch((error) => console.error('Development reload setup failed:', error));
})();
</script>`;

function validatePort() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${process.argv[2] || process.env.PORT}`);
  }
}

function snapshot(directory) {
  const entries = new Map();

  function visit(currentDirectory) {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const sourcePath = path.join(currentDirectory, entry.name);
      const relativePath = path.relative(directory, sourcePath);
      const stats = fs.lstatSync(sourcePath);
      const type = entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file';

      entries.set(relativePath, {
        type,
        size: stats.size,
        modifiedAt: stats.mtimeMs
      });

      if (entry.isDirectory()) visit(sourcePath);
    }
  }

  visit(directory);
  return entries;
}

function entryChanged(previous, next) {
  return !previous
    || previous.type !== next.type
    || previous.size !== next.size
    || previous.modifiedAt !== next.modifiedAt;
}

function syncDeploy(previousSnapshot, nextSnapshot) {
  const removedPaths = [...previousSnapshot.keys()]
    .filter((relativePath) => !nextSnapshot.has(relativePath))
    .sort((left, right) => right.length - left.length);

  for (const relativePath of removedPaths) {
    fs.rmSync(path.join(distDir, relativePath), { recursive: true, force: true });
  }

  for (const [relativePath, nextEntry] of nextSnapshot) {
    const previousEntry = previousSnapshot.get(relativePath);
    if (!entryChanged(previousEntry, nextEntry)) continue;

    const sourcePath = path.join(deployDir, relativePath);
    const destinationPath = path.join(distDir, relativePath);

    if (nextEntry.type === 'directory') {
      if (previousEntry && previousEntry.type !== 'directory') {
        fs.rmSync(destinationPath, { recursive: true, force: true });
      }
      fs.mkdirSync(destinationPath, { recursive: true });
      continue;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    if (previousEntry && previousEntry.type !== nextEntry.type) {
      fs.rmSync(destinationPath, { recursive: true, force: true });
    }
    fs.cpSync(sourcePath, destinationPath, { force: true });
  }
}

function notifyReload() {
  for (const response of reloadClients) {
    response.write('event: reload\ndata: changed\n\n');
  }
}

function injectDevClient(html) {
  return html.includes('</body>')
    ? html.replace('</body>', `${devClient}\n</body>`)
    : `${html}${devClient}`;
}

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${port}`);
  let pathname;

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const requestedPath = path.resolve(distDir, relativePath);
  if (requestedPath !== distDir && !requestedPath.startsWith(`${distDir}${path.sep}`)) return null;
  return requestedPath;
}

function serveFile(request, response) {
  let requestedPath = resolveRequestPath(request.url);
  if (!requestedPath) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  try {
    if (fs.statSync(requestedPath).isDirectory()) {
      requestedPath = path.join(requestedPath, 'index.html');
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  let content;
  try {
    content = fs.readFileSync(requestedPath);
    if (path.extname(requestedPath).toLowerCase() === '.html') {
      content = Buffer.from(injectDevClient(content.toString('utf8')));
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': mimeTypes[path.extname(requestedPath).toLowerCase()] || 'application/octet-stream'
  };
  response.writeHead(200, headers);
  response.end(request.method === 'HEAD' ? undefined : content);
}

function handleRequest(request, response) {
  const url = new URL(request.url, `http://localhost:${port}`);

  if (url.pathname === '/__dev/events') {
    response.writeHead(200, {
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Type': 'text/event-stream'
    });
    response.write('retry: 500\n\n');
    reloadClients.add(response);
    request.on('close', () => reloadClients.delete(response));
    return;
  }

  serveFile(request, response);
}

function main() {
  validatePort();
  build();

  let currentSnapshot = snapshot(deployDir);
  let syncing = false;
  const watcher = setInterval(() => {
    if (syncing) return;
    syncing = true;

    try {
      const nextSnapshot = snapshot(deployDir);
      const changed = [...nextSnapshot].some(([relativePath, entry]) => (
        entryChanged(currentSnapshot.get(relativePath), entry)
      )) || [...currentSnapshot.keys()].some((relativePath) => !nextSnapshot.has(relativePath));

      if (changed) {
        syncDeploy(currentSnapshot, nextSnapshot);
        currentSnapshot = nextSnapshot;
        process.stdout.write('Synced deploy/ changes to dist/.\n');
        notifyReload();
      }
    } catch (error) {
      process.stderr.write(`Could not sync deploy/ changes: ${error.message}\n`);
    } finally {
      syncing = false;
    }
  }, pollIntervalMs);

  const server = http.createServer(handleRequest);
  server.on('error', (error) => {
    clearInterval(watcher);
    throw error;
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Development server: http://localhost:${port}/?dev\n`);
    process.stdout.write('Watching deploy/ for changes. Press Ctrl+C to stop.\n');
  });

  function shutdown() {
    clearInterval(watcher);
    for (const response of reloadClients) response.end();
    server.close(() => process.exit(0));
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();

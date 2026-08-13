// Orbit Service Worker
//
// Offline contract: after ONE online visit to /projects, the app is fully
// usable offline. The HTML documents, every build chunk, the self-hosted font
// and the brand assets are all cached, and the data already lives in
// IndexedDB. The App Router prefetches in-viewport <Link>s, and BottomNav
// renders all three routes, so /dashboard and /settings warm up for free.
//
// Registered in production only — see components/layout/AppShell.tsx.

const VERSION = 'v4';
const RUNTIME = `orbit-runtime-${VERSION}`; // HTML documents + RSC payloads
const STATIC = `orbit-static-${VERSION}`; // immutable build output + brand assets

// Hash-free files safe to precache by name.
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-96.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/apple-touch-icon.png',
  '/avatar-192.jpg',
];

// Documents worth having before the user navigates to them.
const ROUTE_SHELLS = ['/projects', '/dashboard', '/extra-hours', '/settings'];

// Last-resort response when nothing at all is cached. Deliberately a self
// contained string rather than a Next route: a real page would need its own JS
// chunks, which by definition aren't cached in the only situation that can
// reach this.
const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Orbit — Offline</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;min-height:100dvh;display:flex;flex-direction:column;align-items:center;
       justify-content:center;gap:18px;background:#0F172A;color:#F1F5F9;text-align:center;
       padding:24px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  h1{font-size:19px;margin:0;font-weight:600}
  p{margin:0;font-size:14px;color:#94A3B8;max-width:32ch;line-height:1.5}
  button{margin-top:8px;padding:12px 24px;min-height:44px;border:0;border-radius:999px;
         background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;font-size:15px;
         font-weight:600;cursor:pointer}
</style></head>
<body>
  <svg width="72" height="72" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <g stroke="#3B82F6" stroke-width="1.7" stroke-linecap="round">
      <circle cx="24" cy="24" r="14"/>
      <ellipse cx="24" cy="24" rx="7" ry="14" transform="rotate(-24 24 24)"/>
      <ellipse cx="24" cy="24" rx="7" ry="14" transform="rotate(24 24 24)"/>
      <ellipse cx="24" cy="24" rx="14" ry="7.5" transform="rotate(-32 24 24)"/>
    </g>
  </svg>
  <h1>You're offline</h1>
  <p>Orbit hasn't finished caching yet. Reconnect once and it'll work offline from then on.</p>
  <button onclick="location.reload()">Try again</button>
</body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC);
      await staticCache.addAll(STATIC_ASSETS);

      // Best effort throughout: never fail the install because something
      // didn't fetch.
      const runtime = await caches.open(RUNTIME);
      const chunks = new Set();

      await Promise.allSettled(
        ROUTE_SHELLS.map(async (path) => {
          const res = await fetch(path, { cache: 'reload' });
          if (!res.ok) return;
          const html = await res.clone().text();
          await runtime.put(new Request(path), res);
          for (const match of html.matchAll(/\/_next\/static\/[^"'\\\s>]+/g)) {
            chunks.add(match[0]);
          }
        })
      );

      // Warm the build output now. The worker only starts controlling the page
      // *after* the first load, so without this it never sees the chunk
      // requests for that visit — and a user who closes the tab and goes
      // offline before returning would get nothing but the HTTP cache, which
      // can be evicted at any time.
      await Promise.allSettled([...chunks].map((url) => staticCache.add(url)));
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== RUNTIME && k !== STATIC).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/** Cache-first: for URLs whose bytes can never change. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

/**
 * Network-first with a cache fallback.
 *
 * `ignoreVary` is mandatory: Next sends
 * `Vary: rsc, next-router-state-tree, next-router-prefetch, ...` on every
 * app-router response, and the Cache API honours Vary on match(), so a plain
 * lookup would miss everything we stored.
 */
async function networkFirst(request, cacheName, cacheKey = request) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(cacheKey, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(cacheKey, { ignoreVary: true });
    if (cached) return cached;
    throw err;
  }
}

async function handleNavigation(request, url) {
  // Key on pathname only, so /projects?action=add (the manifest shortcut)
  // still resolves to the cached /projects document when offline.
  const shellKey = new Request(url.origin + url.pathname);
  try {
    return await networkFirst(request, RUNTIME, shellKey);
  } catch {
    const cache = await caches.open(RUNTIME);
    const fallback =
      (await cache.match(shellKey, { ignoreVary: true })) ??
      (await cache.match('/projects', { ignoreVary: true }));
    if (fallback) return fallback;
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never intercept the worker itself, the image optimizer, or dev tooling.
  if (
    url.pathname === '/sw.js' ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/turbopack') ||
    url.pathname.startsWith('/__nextjs')
  ) {
    return;
  }

  // Build output: Turbopack content-hashes every filename, so a URL's bytes
  // never change and cache-first is safe. This is what makes a cold offline
  // launch work at all — and it also covers next/font's woff2 files, which
  // land in /_next/static/media.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC).catch(() => Response.error()));
    return;
  }

  // Anything else under /_next/ stays untouched.
  if (url.pathname.startsWith('/_next/')) return;

  // RSC payloads: network-first only. Serving these cache-first would hydrate
  // the app against stale chunks; falling back only when the network is truly
  // gone is safe, because the matching chunks are cached in that state too.
  if (request.headers.has('RSC') || url.searchParams.has('_rsc')) {
    event.respondWith(
      networkFirst(request, RUNTIME).catch(() => Response.error())
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  event.respondWith(cacheFirst(request, STATIC).catch(() => Response.error()));
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Orbit', {
      body: data.body ?? 'You have updates in Orbit',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag ?? 'orbit-notification',
      data: { url: data.url ?? '/projects' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? '/projects'));
});

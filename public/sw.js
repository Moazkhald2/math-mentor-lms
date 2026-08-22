const CACHE = 'math-mentor-v1';
const OFFLINE_URLS = ['/', '/exams', '/dashboard'];
const CORE_ASSETS = ['/manifest.json', '/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([...OFFLINE_URLS, ...CORE_ASSETS].map((u) => new Request(u, { cache: 'reload' }))).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.includes('supabase')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (e.request.headers.get('accept')?.includes('text/html')) {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }
        return new Response('Offline - answers saved locally', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});

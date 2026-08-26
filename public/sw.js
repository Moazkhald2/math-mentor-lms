const CACHE = 'math-mentor-v2'
const PRECACHE = ['/']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = e.request.url
  // Never cache auth / supabase mutations
  if (url.includes('supabase') || url.includes('/auth/')) {
    return
  }
  e.respondWith(cacheFirst(e.request))
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok && req.url.startsWith(self.location.origin)) {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    return cached || Response.error()
  }
}

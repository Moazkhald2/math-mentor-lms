const CACHE = 'math-mentor-v1'
const PRECACHE = ['/', '/offline']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('supabase') || e.request.url.includes('cdn.jsdelivr.net') || e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com')) {
    e.respondWith(networkFirst(e.request))
  } else {
    e.respondWith(cacheFirst(e.request))
  }
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  return cached || fetch(req).then((res) => {
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(req, clone))
    }
    return res
  })
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((c) => c.put(req, clone))
    }
    return res
  } catch {
    const cached = await caches.match(req)
    return cached || new Response('Offline', { status: 503 })
  }
}

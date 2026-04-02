// KhoPhim Service Worker – enables PWA "Add to Home Screen"
const CACHE_NAME = "khophim-v1";
const PRECACHE_URLS = ["/", "/index.html"];

// Install – cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate – clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // CHIẾN LƯỢC CHO DEV: Bỏ qua hoàn toàn localhost và các request của Vite/Chrome Extensions
  if (
    url.hostname === "localhost" || 
    url.hostname === "127.0.0.1" ||
    url.pathname.includes("@vite") ||
    url.pathname.includes("node_modules") ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  if (event.request.method !== "GET") return;

  // 1. Navigation requests (HTML pages)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match("/index.html"))
    );
    return;
  }

  // 2. Static assets – stale-while-revalidate
  const isStaticAsset = 
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    event.request.destination === "font";

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
  }
});

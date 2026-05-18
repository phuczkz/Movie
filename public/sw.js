// KhoPhim Service Worker – enables PWA "Add to Home Screen"
const CACHE_NAME = "khophim-v4";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
];

const SAME_ORIGIN = self.location.origin;
const APP_SHELL_ASSET_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".woff2",
  ".woff",
  ".ttf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
]);

const getExtension = (path) => {
  const match = path.match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : "";
};

const isSameOrigin = (url) => url.origin === SAME_ORIGIN;

const shouldCacheStatic = (request, url) => {
  if (!isSameOrigin(url)) return false;
  const destination = request.destination;
  if (
    destination === "style" ||
    destination === "script" ||
    destination === "font"
  )
    return true;
  if (destination === "image") return true;
  return APP_SHELL_ASSET_EXTENSIONS.has(getExtension(url.pathname));
};

const precacheAppShellAssets = async (cache) => {
  try {
    const res = await fetch("/index.html", { cache: "no-store" });
    if (!res.ok) return;
    const html = await res.text();
    const urls = new Set();
    const assetRegex = /(?:href|src)="(\/[^"?#]+)(?:\?[^"#]*)?"/g;
    let match;
    while ((match = assetRegex.exec(html))) {
      const path = match[1];
      if (APP_SHELL_ASSET_EXTENSIONS.has(getExtension(path))) {
        urls.add(path);
      }
    }
    if (urls.size) {
      await cache.addAll(Array.from(urls));
    }
  } catch (err) {
    console.warn("[SW] precache app shell assets failed:", err);
  }
};

// Install – cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(PRECACHE_URLS);
        await precacheAppShellAssets(cache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate – clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
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

  // BỎ QUA streaming requests (HLS m3u8, TS segments, proxy, etc.)
  // Để tránh SW can thiệp vào video playback
  if (
    url.hostname.includes("stream.khophim") ||
    url.pathname.endsWith(".m3u8") ||
    url.pathname.endsWith(".ts") ||
    url.pathname.endsWith(".m4s") ||
    url.pathname.endsWith(".key") ||
    event.request.destination === "video" ||
    event.request.destination === "audio"
  ) {
    return;
  }

  if (event.request.method !== "GET") return;

  // 1. Navigation requests (HTML pages)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const responseClone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match("/index.html"))
    );
    return;
  }

  // 2. Static assets – stale-while-revalidate
  if (shouldCacheStatic(event.request, url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => null);

        return cached || fetchPromise;
      })
    );
  }
});

const DIRECT_CDN_HOSTS = [
  "img.otruyenapi.com",
  "otruyenapi.com",
  "ophim.live",
  "ophim1.com",
  "phimimg.com",
];

const STREAM_PROXY = (import.meta.env.VITE_STREAM_PROXY || "").trim().replace(/\/$/, "");

/**
 * Check if a URL belongs to a known Vietnamese CDN that should be proxied
 * through our own Worker instead of wsrv.nl.
 * @param {string} url - The image URL to check.
 * @returns {boolean}
 */
const isDirectCdnUrl = (url) => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DIRECT_CDN_HOSTS.some(
      (cdn) => hostname === cdn || hostname.endsWith(`.${cdn}`)
    );
  } catch {
    return false;
  }
};

/**
 * Check if a URL is a TMDB image.
 * @param {string} url
 * @returns {boolean}
 */
const isTmdbUrl = (url) => {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("tmdb.org");
  } catch {
    return false;
  }
};

/**
 * Resize a TMDB image URL by replacing its width segment.
 * @param {string} url - TMDB image URL.
 * @param {number} w - Desired width (mapped to closest TMDB size).
 * @returns {string}
 */
const resizeTmdb = (url, w = 342) => {
  if (!url) return url;
  let size = "w342";
  if (w > 1000) {
    size = "w1280";
  } else if (w > 700) {
    size = "w780";
  } else if (w > 400) {
    size = "w500";
  }
  return url.replace(/\/w(92|154|185|300|342|500|780|original)\//, `/${size}/`);
};

/**
 * Build a proxied image URL through our Cloudflare Worker's /img/ route.
 * This bypasses wsrv.nl entirely for whitelisted domains, reducing
 * the proxy chain from 3 hops to 1 and leveraging Cloudflare edge cache.
 *
 * @param {string} url - Source image URL.
 * @returns {string} Proxied URL via Worker /img/ route.
 */
const buildImageProxyUrl = (url) => {
  if (!url || !STREAM_PROXY) return url;
  return `${STREAM_PROXY}/img/?url=${encodeURIComponent(url)}`;
};

/**
 * Get an optimized poster URL for movie/comic cards.
 *
 * - TMDB: resize via TMDB path.
 * - Vietnamese CDNs: proxy through Worker /img/ route (direct fetch + edge cache).
 * - Other: fallback to wsrv.nl for WebP conversion and resize.
 *
 * @param {string} url - Original image URL.
 * @param {number} [w=360] - Desired width (used only for wsrv.nl fallback).
 * @param {number} [q=80] - Quality (1-100), used only for wsrv.nl fallback.
 * @returns {string|null}
 */
export const getOptimizedPoster = (url, w = 360, q = 80) => {
  if (!url) return url;

  try {
    // TMDB images: use their own CDN resize
    if (isTmdbUrl(url)) {
      return resizeTmdb(url, w);
    }

    // Vietnamese CDNs: proxy through Worker /img/ route (1 hop, edge cached)
    if (isDirectCdnUrl(url)) {
      return buildImageProxyUrl(url);
    }

    // Unknown domains: fallback to wsrv.nl for optimization
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&output=webp&w=${w}&fit=cover&q=${q}`;
  } catch {
    return url;
  }
};

/**
 * Get an optimized banner/landscape image URL.
 * Similar to getOptimizedPoster but for larger images (backdrops, banners).
 *
 * @param {string} url - Original image URL.
 * @param {number} [w=1280] - Desired width.
 * @param {number} [q=75] - Quality.
 * @returns {string|null}
 */
export const getOptimizedBanner = (url, w = 1280, q = 75) => {
  if (!url) return url;

  try {
    // TMDB images: use their own CDN resize
    if (isTmdbUrl(url)) {
      return resizeTmdb(url, w);
    }

    // Vietnamese CDNs: proxy through Worker /img/ route
    if (isDirectCdnUrl(url)) {
      return buildImageProxyUrl(url);
    }

    // Unknown domains: fallback to wsrv.nl
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&output=webp&w=${w}&fit=cover&q=${q}`;
  } catch {
    return url;
  }
};

/**
 * Get an optimized player poster URL.
 *
 * @param {string} url - Original poster URL.
 * @returns {string|null}
 */
export const getOptimizedPlayerPoster = (url) => {
  if (!url) return null;
  if (!url.startsWith("http")) return url;

  try {
    if (isTmdbUrl(url)) {
      return url;
    }

    // Vietnamese CDNs: proxy through Worker /img/ route
    if (isDirectCdnUrl(url)) {
      return buildImageProxyUrl(url);
    }

    // Others: fallback to wsrv.nl
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&w=1920&output=webp&q=90`;
  } catch {
    return url;
  }
};

/**
 * Convert a Hero backdrop URL to an optimized version.
 * Used for the large hero section background image.
 *
 * @param {string} url - Original backdrop URL.
 * @param {number} [w=640] - Desired width.
 * @param {number} [q=85] - Quality.
 * @returns {string|null}
 */
export const toOptimizedHeroImage = (url, w = 640, q = 85) => {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    // If already proxied through our Worker /img/ route, return as-is
    if (parsed.pathname.startsWith("/img")) {
      return url;
    }

    // If already proxied through wsrv.nl, update params
    if (parsed.hostname === "wsrv.nl") {
      parsed.searchParams.set("w", String(w));
      parsed.searchParams.set("output", "webp");
      parsed.searchParams.set("q", String(q));
      return parsed.toString();
    }

    if (isTmdbUrl(url)) {
      return url;
    }

    // Vietnamese CDNs: proxy through Worker /img/ route
    if (isDirectCdnUrl(url)) {
      return buildImageProxyUrl(url);
    }

    // Others: fallback to wsrv.nl
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&w=${w}&output=webp&q=${q}`;
  } catch {
    return url;
  }
};

/**
 * Proxy an avatar URL through our Worker /img/ route or wsrv.nl fallback.
 * Centralized utility to replace duplicate getProxiedAvatar functions
 * scattered across Comments, WatchChat, and Profile components.
 *
 * @param {string} url - Raw avatar URL (photoURL from Firebase, etc.).
 * @param {number} [size=100] - Desired width/height for wsrv.nl fallback.
 * @returns {string|null}
 */
export const getProxiedAvatar = (url, size = 100) => {
  if (!url) return null;
  // DiceBear SVGs and local paths don't need proxying
  if (url.includes("dicebear.com") || url.startsWith("/")) return url;

  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // If the avatar host is in our Worker whitelist, use /img/ route
    const IMAGE_PROXY_HOSTS = [
      "phimimg.com", "img.ophim.live", "ophim1.com", "ophim.live",
      "otruyenapi.com", "img.otruyenapi.com", "image.tmdb.org",
      "images.unsplash.com",
    ];

    const isProxyable = IMAGE_PROXY_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );

    if (isProxyable && STREAM_PROXY) {
      return buildImageProxyUrl(url);
    }

    // Fallback to wsrv.nl for other domains (Google, Facebook avatar URLs, etc.)
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&w=${size}&h=${size}&fit=cover&output=webp&q=80`;
  } catch {
    return url;
  }
};

export const normalizeImageUrl = (
  url,
  fallbackCdn = import.meta.env.VITE_KKPHIM_IMAGE_CDN || "https://phimimg.com"
) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Special CDN fix: Danviet images without ex-cdn wrapper
  if (trimmed.includes("danviet.vn/files/") && !trimmed.includes("i.ex-cdn.com")) {
    const after = trimmed.substring(trimmed.indexOf("danviet.vn/files/"));
    return `https://i.ex-cdn.com/${after}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  // If it starts with an external domain (e.g. any abc.xyz/...)
  if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\//.test(trimmed)) {
    return `https://${trimmed}`;
  }
  const clean = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${fallbackCdn}${clean}`;
};

/**
 * Generates an array of alternate URLs with different file extensions (.jpg, .jpeg, .png, .webp).
 * Flexible for movies whose files on server are named .jpg instead of .webp or vice versa.
 */
export const getAlternateExtensionUrls = (url) => {
  if (!url || typeof url !== "string") return [];
  const match = url.match(/\.(webp|jpg|jpeg|png)($|\?)/i);
  if (!match) return [];
  const ext = match[1].toLowerCase();
  const rest = match[2] || "";
  const base = url.slice(0, match.index);
  
  const extensions = ext === "webp" 
    ? ["jpg", "jpeg", "png"] 
    : ["webp", ext === "jpg" ? "jpeg" : "jpg", "png"];
    
  return extensions.map((e) => `${base}.${e}${rest}`);
};

/**
 * Builds an ordered fallback chain of candidate URLs to load a movie poster.
 * Prioritizes:
 * 1. Optimized poster URL (Worker /img/ proxy or wsrv.nl fallback)
 * 2. Raw poster URL (direct)
 * 3. Alternate extensions of poster (.jpg <-> .webp)
 * 4. Optimized thumb URL (fallback to thumb if poster fails)
 * 5. Raw thumb URL
 * 6. Alternate extensions of thumb (.webp <-> .jpg)
 */
export const getMoviePosterFallbackChain = (movie, width = 360, quality = 80) => {
  const chain = [];
  const seen = new Set();

  const add = (u) => {
    if (u && typeof u === "string" && !seen.has(u)) {
      seen.add(u);
      chain.push(u);
    }
  };

  const rawPoster = normalizeImageUrl(movie?.poster_url);
  const rawThumb = normalizeImageUrl(movie?.thumb_url || movie?.banner || movie?.backdrop_url);

  // 1. Poster candidates
  if (rawPoster) {
    add(getOptimizedPoster(rawPoster, width, quality));
    add(rawPoster);
    getAlternateExtensionUrls(rawPoster).forEach((altUrl) => {
      add(getOptimizedPoster(altUrl, width, quality));
      add(altUrl);
    });
  }

  // 2. Thumb candidates (nếu poster lỗi hoặc không hiển thị, linh hoạt lấy thumb)
  if (rawThumb && rawThumb !== rawPoster) {
    add(getOptimizedPoster(rawThumb, width, quality));
    add(rawThumb);
    getAlternateExtensionUrls(rawThumb).forEach((altUrl) => {
      add(getOptimizedPoster(altUrl, width, quality));
      add(altUrl);
    });
  }

  return chain;
};

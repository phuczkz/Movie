const DIRECT_CDN_HOSTS = [
  "img.otruyenapi.com",
  "otruyenapi.com",
];

/**
 * Check if a URL belongs to a known Vietnamese CDN that should be loaded directly.
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
  const size = w > 400 ? "w500" : "w342";
  return url.replace(/\/w(92|154|185|300|342|500|780|original)\//, `/${size}/`);
};

/**
 * Get an optimized poster URL for movie/comic cards.
 *
 * - TMDB: resize via TMDB path.
 * - Vietnamese CDNs: return the original URL directly (fast, no proxy needed).
 * - Other: proxy through wsrv.nl for WebP conversion and resize.
 *
 * @param {string} url - Original image URL.
 * @param {number} [w=360] - Desired width.
 * @param {number} [q=80] - Quality (1-100), used only for wsrv.nl proxy.
 * @returns {string|null}
 */
export const getOptimizedPoster = (url, w = 360, q = 80) => {
  if (!url) return url;

  try {
    // TMDB images: use their own CDN resize
    if (isTmdbUrl(url)) {
      return resizeTmdb(url, w);
    }

    // Vietnamese CDNs: load directly, no proxy needed
    if (isDirectCdnUrl(url)) {
      return url;
    }

    // Unknown domains: proxy through wsrv.nl for optimization
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
      return url; // TMDB banners are already at good resolution
    }

    // Vietnamese CDNs: load directly
    if (isDirectCdnUrl(url)) {
      return url;
    }

    // Unknown domains: proxy through wsrv.nl
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
    // TMDB or Vietnamese CDN: load directly
    if (isTmdbUrl(url) || isDirectCdnUrl(url)) {
      return url;
    }

    // Others: proxy through wsrv.nl
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&w=800&output=webp&q=75`;
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

    // If already proxied through wsrv.nl, update params
    if (parsed.hostname === "wsrv.nl") {
      parsed.searchParams.set("w", String(w));
      parsed.searchParams.set("output", "webp");
      parsed.searchParams.set("q", String(q));
      return parsed.toString();
    }

    // TMDB or Vietnamese CDN: load directly
    if (isTmdbUrl(url) || isDirectCdnUrl(url)) {
      return url;
    }

    // Others: proxy through wsrv.nl
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&w=${w}&output=webp&q=${q}`;
  } catch {
    return url;
  }
};

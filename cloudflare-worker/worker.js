/**
 * Cloudflare Worker — Stream Proxy cho khophim.io.vn
 *
 * Proxy video HLS (.m3u8 + .ts segments) và TMDB API.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://khophim.io.vn",
  "https://www.khophim.io.vn",
  "http://localhost:5173",
  "https://hlsjs.video-dev.org",
];

const DEFAULT_ALLOWED_HOSTS = [
  "kkphimplayer7.com",
  "opstream11.com",
];

function getListFromEnv(env, key, fallback = []) {
  const value = env?.[key];

  if (!value || typeof value !== "string") {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCorsHeaders(request, env) {
  const allowedOrigins = getListFromEnv(
    env,
    "ALLOWED_ORIGINS",
    DEFAULT_ALLOWED_ORIGINS
  );

  const requestOrigin = request.headers.get("Origin");
  let allowOrigin = allowedOrigins[0] || "*";

  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else {
      // Auto-allow localhost and 127.0.0.1 with any port for local development convenience.
      try {
        const url = new URL(requestOrigin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          allowOrigin = requestOrigin;
        }
      } catch { /* Ignore invalid origin URLs */ }
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers":
      "Range, Content-Type, Accept, Origin, If-None-Match, If-Modified-Since",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Content-Type, Accept-Ranges, Cache-Control, ETag, Last-Modified",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function isAllowedHost(hostname, allowedHosts) {
  if (!hostname || !Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    return false;
  }

  const normalizedHostname = hostname.toLowerCase();

  return allowedHosts.some((host) => {
    const normalizedHost = host.toLowerCase();
    return (
      normalizedHostname === normalizedHost ||
      normalizedHostname.endsWith(`.${normalizedHost}`)
    );
  });
}

function isBlockedPrivateHost(hostname) {
  const host = hostname.toLowerCase();

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    host === "::1" ||
    host === "[::1]"
  );
}

function buildUpstreamHeaders(request, targetUrl) {
  const headers = new Headers();

  // Forward standard client headers to keep the request as transparent and legitimate as possible.
  const passHeaders = [
    "Accept",
    "Accept-Language",
    "Range",
    "If-None-Match",
    "If-Modified-Since",
  ];

  for (const headerName of passHeaders) {
    const value = request.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  // Explicitly override Referer and Origin to prevent Cloudflare Worker from forwarding the client's values automatically.
  // We set Referer to the target URL's origin to make it look like a same-site request, which is universally allowed by CDNs.
  try {
    const targetOrigin = new URL(targetUrl).origin;
    headers.set("Referer", targetOrigin + "/");
    headers.set("Origin", targetOrigin);
  } catch {
    headers.set("Referer", "");
    headers.set("Origin", "");
  }

  return headers;
}

function proxifyUrl(rawUrl, baseUrl, requestUrl) {
  let workerOrigin = "";

  try {
    const parsedRequest = new URL(requestUrl);
    // Force https for production domains to avoid Mixed Content issues on HTTPS players.
    if (parsedRequest.hostname !== "localhost" && parsedRequest.hostname !== "127.0.0.1") {
      parsedRequest.protocol = "https:";
    }
    workerOrigin = parsedRequest.origin;
  } catch {
    return rawUrl;
  }

  try {
    const absoluteUrl = new URL(rawUrl, baseUrl);

    if (!["http:", "https:"].includes(absoluteUrl.protocol)) {
      return rawUrl;
    }

    return `${workerOrigin}/?url=${encodeURIComponent(absoluteUrl.href)}`;
  } catch {
    return rawUrl;
  }
}

function rewriteM3u8(content, baseUrl, requestUrl) {
  if (!content || typeof content !== "string") {
    return content;
  }

  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return line;
      }

      if (trimmed.startsWith("#")) {
        if (!trimmed.includes('URI="')) {
          return line;
        }

        return line.replace(/URI="([^"]+)"/g, (match, uri) => {
          try {
            const absoluteUrl = new URL(uri, baseUrl);
            if (isMediaSegment(absoluteUrl.pathname)) {
              return `URI="${absoluteUrl.href}"`;
            }
          } catch { /* Ignore malformed URIs in M3U8 headers */ }
          const proxied = proxifyUrl(uri, baseUrl, requestUrl);
          return `URI="${proxied}"`;
        });
      }

      try {
        const absoluteUrl = new URL(trimmed, baseUrl);
        if (isMediaSegment(absoluteUrl.pathname)) {
          return absoluteUrl.href;
        }
      } catch { /* Ignore lines that are not valid URLs */ }

      return proxifyUrl(trimmed, baseUrl, requestUrl);
    })
    .join("\n");
}

function copySelectedUpstreamHeaders(upstream, corsHeaders) {
  const headers = new Headers(corsHeaders);

  const contentType = upstream.headers.get("Content-Type");
  const contentLength = upstream.headers.get("Content-Length");
  const contentRange = upstream.headers.get("Content-Range");
  const acceptRanges = upstream.headers.get("Accept-Ranges");
  const etag = upstream.headers.get("ETag");
  const lastModified = upstream.headers.get("Last-Modified");
  const contentDisposition = upstream.headers.get("Content-Disposition");

  if (contentType) headers.set("Content-Type", contentType);
  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentRange) headers.set("Content-Range", contentRange);
  if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
  if (etag) headers.set("ETag", etag);
  if (lastModified) headers.set("Last-Modified", lastModified);
  if (contentDisposition) {
    headers.set("Content-Disposition", contentDisposition);
  }

  return headers;
}

function isMediaSegment(pathname) {
  const path = pathname.toLowerCase();

  return (
    path.endsWith(".ts") ||
    path.endsWith(".m4s") ||
    path.endsWith(".mp4") ||
    path.endsWith(".aac") ||
    path.endsWith(".mp3") ||
    path.endsWith(".vtt") ||
    path.endsWith(".srt")
  );
}

async function handleTmdb(request, env, corsHeaders) {
  const url = new URL(request.url);
  const tmdbPath = url.pathname.replace(/^\/tmdb\/?/, "");

  if (!tmdbPath) {
    return jsonResponse(
      { error: "Missing TMDB path" },
      400,
      corsHeaders
    );
  }

  const TMDB_KEY = env?.TMDB_API_KEY;

  if (!TMDB_KEY) {
    return jsonResponse(
      { error: "TMDB_API_KEY not configured on worker" },
      500,
      corsHeaders
    );
  }

  const tmdbUrl = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);

  url.searchParams.forEach((value, key) => {
    if (key !== "api_key") {
      tmdbUrl.searchParams.set(key, value);
    }
  });

  tmdbUrl.searchParams.set("api_key", TMDB_KEY);

  try {
    const tmdbRes = await fetch(tmdbUrl.toString(), {
      method: request.method,
      headers: {
        Accept: "application/json",
      },
      signal: request.signal, // Hủy tải từ TMDB nếu client hủy
      cf: {
        cacheEverything: true,
        cacheTtl: 14400 // Cache 4 hours
      }
    });

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=14400");

    if (request.method === "HEAD") {
      return new Response(null, {
        status: tmdbRes.status,
        headers,
      });
    }

    return new Response(tmdbRes.body, {
      status: tmdbRes.status,
      headers,
    });
  } catch {
    return jsonResponse(
      { error: "TMDB proxy failed" },
      502,
      corsHeaders
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse(
        { error: "Method not allowed" },
        405,
        corsHeaders
      );
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.pathname.startsWith("/tmdb")) {
      return handleTmdb(request, env, corsHeaders);
    }

    const targetUrl = requestUrl.searchParams.get("url");

    if (!targetUrl && requestUrl.pathname === "/") {
      return jsonResponse(
        {
          status: "ok",
          service: "stream-proxy",
        },
        200,
        corsHeaders
      );
    }

    if (!targetUrl) {
      return jsonResponse(
        { error: "Missing ?url= parameter" },
        400,
        corsHeaders
      );
    }

    let parsedTarget;

    try {
      parsedTarget = new URL(targetUrl);

      if (!["http:", "https:"].includes(parsedTarget.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return jsonResponse(
        { error: "Invalid URL" },
        400,
        corsHeaders
      );
    }

    if (isBlockedPrivateHost(parsedTarget.hostname)) {
      return jsonResponse(
        { error: "Blocked private host" },
        403,
        corsHeaders
      );
    }

    const allowedHosts = getListFromEnv(
      env,
      "ALLOWED_HOSTS",
      DEFAULT_ALLOWED_HOSTS
    );

    const allowAllHosts = env?.ALLOW_ALL_HOSTS !== "false";

    if (!allowAllHosts && !isAllowedHost(parsedTarget.hostname, allowedHosts)) {
      return jsonResponse(
        {
          error:
            "Host not allowed. Configure ALLOWED_HOSTS in Worker variables.",
        },
        403,
        corsHeaders
      );
    }

    const hasRange = request.headers.has("Range");
    const isGet = request.method === "GET";
    const cache = caches.default;
    const cacheKey = new Request(request.url, {
      method: "GET",
    });

    if (isGet && !hasRange) {
      const cachedResponse = await cache.match(cacheKey);

      if (cachedResponse) {
        const headers = new Headers(cachedResponse.headers);

        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }
    }

    try {
      const upstreamHeaders = buildUpstreamHeaders(request, targetUrl);
      const isMedia = isMediaSegment(parsedTarget.pathname);

      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: "follow",
        signal: request.signal, // QUAN TRỌNG: Hủy tải từ server gốc (ophim, kkphim) nếu người dùng tua video
        cf: isMedia ? { cacheEverything: true, cacheTtl: 86400 } : {}
      });

      if (
        !upstream.ok &&
        upstream.status !== 206 &&
        upstream.status !== 304
      ) {
        return jsonResponse(
          { error: `Upstream returned ${upstream.status}` },
          upstream.status,
          corsHeaders
        );
      }

      const pathname = parsedTarget.pathname.toLowerCase();
      const contentType = upstream.headers.get("Content-Type") || "";

      const isM3u8 =
        pathname.endsWith(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("m3u8");

      if (request.method === "HEAD") {
        const headers = copySelectedUpstreamHeaders(upstream, corsHeaders);

        return new Response(null, {
          status: upstream.status,
          headers,
        });
      }

      if (isM3u8) {
        const originalText = await upstream.text();
        const rewrittenText = rewriteM3u8(
          originalText,
          targetUrl,
          request.url
        );

        const isVodPlaylist = rewrittenText.includes("#EXT-X-ENDLIST");

        const headers = new Headers(corsHeaders);
        headers.set(
          "Content-Type",
          "application/vnd.apple.mpegurl; charset=utf-8"
        );
        headers.set(
          "Cache-Control",
          isVodPlaylist ? "public, max-age=600" : "no-store"
        );

        const response = new Response(rewrittenText, {
          status: upstream.status,
          headers,
        });

        if (
          isGet &&
          !hasRange &&
          upstream.status === 200 &&
          isVodPlaylist
        ) {
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }

        return response;
      }

      const headers = copySelectedUpstreamHeaders(upstream, corsHeaders);

      if (isMediaSegment(pathname)) {
        headers.set("Cache-Control", "public, max-age=86400");
      } else {
        headers.set("Cache-Control", "no-store");
      }

      const response = new Response(upstream.body, {
        status: upstream.status,
        headers,
      });

      if (
        isGet &&
        !hasRange &&
        upstream.status === 200 &&
        isMediaSegment(pathname)
      ) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    } catch (err) {
      return jsonResponse(
        {
          error: "Proxy error",
          message: err instanceof Error ? err.message : "Unknown error",
        },
        502,
        corsHeaders
      );
    }
  },
};

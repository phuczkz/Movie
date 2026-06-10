/**
 * Cloudflare Worker — Stream Proxy cho khophim.io.vn
 *
 * Proxy video HLS (.m3u8 + .ts segments) qua domain của bạn,
 * cho phép bypass firewall công ty chặn các CDN streaming.
 *
 * Cách hoạt động:
 *   GET /?url=https://cdn.example.com/video.m3u8
 *   → Worker fetch upstream, absolutize URLs trong m3u8, trả về cho client
 */

// ===================== CORS =====================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Content-Type",
  "Access-Control-Max-Age": "86400",
};

// ===================== M3U8 URL Resolution =====================

/**
 * Chuyển tất cả URL tương đối trong m3u8 thành URL tuyệt đối.
 * Điều này quan trọng để HLS.js loader có thể wrap chúng qua proxy.
 */
function absolutizeM3u8(content, baseUrl, requestUrl) {
  if (!content || typeof content !== "string") return content;

  let workerOrigin = "";
  if (requestUrl) {
    try {
      workerOrigin = new URL(requestUrl).origin;
    } catch {
      // ignore
    }
  }

  try {
    new URL(".", baseUrl);
  } catch {
    return content;
  }

  const lines = content.split("\n");
  return lines
    .map((line) => {
      const trimmed = line.trim();

      // Bỏ qua dòng trống
      if (!trimmed) return line;

      // Xử lý URI= trong các tag HLS (EXT-X-KEY, EXT-X-MAP, etc.)
      if (trimmed.startsWith("#")) {
        if (trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
            if (uri.startsWith("http://") || uri.startsWith("https://")) {
              return workerOrigin ? `URI="${workerOrigin}/?url=${encodeURIComponent(uri)}"` : match;
            }
            try {
              const absolute = new URL(uri, baseUrl).href;
              return workerOrigin ? `URI="${workerOrigin}/?url=${encodeURIComponent(absolute)}"` : `URI="${absolute}"`;
            } catch {
              return match;
            }
          });
        }
        return line;
      }

      // Dòng URL — resolve thành absolute và đi qua proxy
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return workerOrigin ? `${workerOrigin}/?url=${encodeURIComponent(trimmed)}` : line;
      }

      try {
        const absolute = new URL(trimmed, baseUrl).href;
        return workerOrigin ? `${workerOrigin}/?url=${encodeURIComponent(absolute)}` : absolute;
      } catch {
        return line;
      }
    })
    .join("\n");
}

// ===================== Main Handler =====================

export default {
  async fetch(request, env, ctx) {
    // Only cache GET requests
    const isGet = request.method === "GET";
    const cache = caches.default;

    if (isGet) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        const headers = new Headers(cachedResponse.headers);
        for (const [key, value] of Object.entries(CORS_HEADERS)) {
          headers.set(key, value);
        }
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const jsonHeaders = {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    };

    // Chỉ cho phép GET/HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

    const url = new URL(request.url);

    // ===================== TMDB API Proxy =====================
    // Logic: https://your-worker.com/tmdb/movie/popular -> https://api.themoviedb.org/3/movie/popular?api_key=...
    const pathname = url.pathname;
    if (pathname.includes("/tmdb")) {
      // Extract the part after /tmdb (e.g., /tmdb/movie/popular -> movie/popular)
      const parts = pathname.split("/tmdb");
      const tmdbPath = (parts[1] || "").replace(/^\//, "");
      const tmdbUrl = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);

      // Copy all query params from the client request
      url.searchParams.forEach((value, key) => {
        tmdbUrl.searchParams.set(key, value);
      });

      // Attach the secret API Key from environment variables
      const TMDB_KEY = env.TMDB_API_KEY;
      if (!TMDB_KEY) {
        return new Response(
          JSON.stringify({ error: "TMDB_API_KEY not configured on worker" }),
          { status: 500, headers: jsonHeaders }
        );
      }
      tmdbUrl.searchParams.set("api_key", TMDB_KEY);

      const tmdbRes = await fetch(tmdbUrl.toString());
      const tmdbData = await tmdbRes.arrayBuffer();

      const responseHeaders = new Headers(CORS_HEADERS);
      responseHeaders.set("Content-Type", "application/json; charset=utf-8");
      
      return new Response(tmdbData, {
        status: tmdbRes.status,
        headers: responseHeaders,
      });
    }

    const targetUrl = url.searchParams.get("url");


    // Health check endpoint
    if (!targetUrl && url.pathname === "/") {
      return new Response(
        JSON.stringify({ status: "ok", service: "stream-proxy" }),
        {
          status: 200,
          headers: jsonHeaders,
        }
      );
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing ?url= parameter" }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      );
    }

    // Validate URL
    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsedTarget.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    try {
      // ===== User-Agent rotation =====
      const USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      ];
      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

      // ===== Generate random Vietnamese residential IP =====
      // Common VN ISP IP ranges (Viettel, FPT, VNPT)
      const VN_IP_PREFIXES = [
        "113.160", "113.161", "113.185", "14.160", "14.161",
        "14.162", "14.176", "14.177", "27.64", "27.65",
        "42.112", "42.113", "42.114", "42.115", "42.116",
        "42.117", "42.118", "42.119", "58.186", "58.187",
        "171.224", "171.225", "171.226", "171.250", "171.251",
        "183.80", "183.81", "115.73", "115.74", "115.75",
      ];
      const prefix = VN_IP_PREFIXES[Math.floor(Math.random() * VN_IP_PREFIXES.length)];
      const randomIP = `${prefix}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

      // ===== Build fetch headers =====
      // Important: Do NOT mirror the target's own origin as Referer/Origin.
      // Many CDNs detect this pattern as a proxy/leech and respond with 403/404.
      // Instead, use a common Vietnamese movie site or omit them entirely.
      const fetchHeaders = {
        "User-Agent": request.headers.get("User-Agent") || randomUA,
        Accept: "*/*",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Forwarded-For": randomIP,
        "X-Real-IP": randomIP,
      };

      // Forward Range header (important for seeking in ts segments)
      const rangeHeader = request.headers.get("Range");
      if (rangeHeader) {
        fetchHeaders["Range"] = rangeHeader;
      }

      // ===== Attempt fetch with retry =====
      // Strategy 1: Minimal headers (no Origin/Referer — look like a direct browser hit)
      // Strategy 2: With Referer pointing to a known embedder
      const strategies = [
        { ...fetchHeaders },
        { ...fetchHeaders, Referer: "https://ophim.cc/", Origin: "https://ophim.cc" },
        { ...fetchHeaders, Referer: parsedTarget.origin + "/", Origin: parsedTarget.origin },
      ];

      let upstream = null;
      let lastStatus = 0;

      for (const hdrs of strategies) {
        try {
          const resp = await fetch(targetUrl, {
            headers: hdrs,
            redirect: "follow",
          });
          lastStatus = resp.status;

          if (resp.ok || resp.status === 206) {
            upstream = resp;
            break;
          }
          // Consume body to free connection for next attempt
          await resp.text().catch(() => {});
        } catch {
          // Network error — try next strategy
        }
      }

      if (!upstream) {
        return new Response(
          JSON.stringify({
            error: `Upstream returned ${lastStatus || 502}`,
            url: targetUrl,
          }),
          {
            status: lastStatus >= 400 ? lastStatus : 502,
            headers: jsonHeaders,
          }
        );
      }

      // ===== Detect content type =====
      const contentType = upstream.headers.get("Content-Type") || "";
      const isM3u8 =
        targetUrl.includes(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("m3u8");

      const responseHeaders = new Headers(CORS_HEADERS);

      // ===== M3U8 playlist: absolutize URLs =====
      if (isM3u8) {
        responseHeaders.set(
          "Content-Type",
          "application/vnd.apple.mpegurl; charset=utf-8"
        );
        responseHeaders.set("Cache-Control", "no-cache");

        const text = await upstream.text();
        const rewritten = absolutizeM3u8(text, targetUrl, request.url);

        return new Response(rewritten, {
          status: upstream.status,
          headers: responseHeaders,
        });
      }

      // ===== Binary content (ts segments, encryption keys, etc.) =====
      responseHeaders.set(
        "Content-Type",
        contentType || "application/octet-stream"
      );

      const contentLength = upstream.headers.get("Content-Length");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);

      const contentRange = upstream.headers.get("Content-Range");
      if (contentRange) responseHeaders.set("Content-Range", contentRange);

      // Cache ts/m4s segments aggressively (immutable content)
      if (targetUrl.includes(".ts") || targetUrl.includes(".m4s")) {
        responseHeaders.set("Cache-Control", "public, max-age=86400");
      }

      const responseToReturn = new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });

      if (isGet && (upstream.status === 200 || upstream.status === 206) && (targetUrl.includes(".ts") || targetUrl.includes(".m4s"))) {
        ctx.waitUntil(cache.put(request, responseToReturn.clone()));
      }

      return responseToReturn;
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Proxy error: ${err.message}` }),
        {
          status: 502,
          headers: jsonHeaders,
        }
      );
    }
  },
};

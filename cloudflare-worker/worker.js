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
function absolutizeM3u8(content, baseUrl) {
  if (!content || typeof content !== "string") return content;

  let base;
  try {
    base = new URL(".", baseUrl).href;
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
            if (uri.startsWith("http://") || uri.startsWith("https://"))
              return match;
            try {
              const absolute = new URL(uri, baseUrl).href;
              return `URI="${absolute}"`;
            } catch {
              return match;
            }
          });
        }
        return line;
      }

      // Dòng URL — resolve thành absolute
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return line; // Đã absolute rồi
      }

      try {
        return new URL(trimmed, baseUrl).href;
      } catch {
        return line;
      }
    })
    .join("\n");
}

// ===================== Main Handler =====================

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Chỉ cho phép GET/HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    // Health check endpoint
    if (!targetUrl && url.pathname === "/") {
      return new Response(
        JSON.stringify({ status: "ok", service: "stream-proxy" }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing ?url= parameter" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
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
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    try {
      // ===== Fetch upstream =====
      const fetchHeaders = {
        "User-Agent":
          request.headers.get("User-Agent") ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: parsedTarget.origin + "/",
        Origin: parsedTarget.origin,
      };

      // Forward Range header (important for seeking in ts segments)
      const rangeHeader = request.headers.get("Range");
      if (rangeHeader) {
        fetchHeaders["Range"] = rangeHeader;
      }

      const upstream = await fetch(targetUrl, {
        headers: fetchHeaders,
        redirect: "follow",
      });

      if (!upstream.ok && upstream.status !== 206) {
        return new Response(
          JSON.stringify({
            error: `Upstream returned ${upstream.status}`,
            url: targetUrl,
          }),
          {
            status: upstream.status >= 400 ? upstream.status : 502,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
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
          "application/vnd.apple.mpegurl"
        );
        responseHeaders.set("Cache-Control", "no-cache");

        const text = await upstream.text();
        const rewritten = absolutizeM3u8(text, targetUrl);

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

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Proxy error: ${err.message}` }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }
  },
};

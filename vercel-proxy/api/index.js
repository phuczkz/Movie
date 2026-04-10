/* global Buffer */
// Vercel Serverless Function Proxy

function absolutizeM3u8(content, baseUrl) {
  if (!content || typeof content !== "string") return content;
  try {
    new URL(".", baseUrl);
  } catch {
    return content;
  }
  const lines = content.split("\n");
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        if (trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
            if (uri.startsWith("http://") || uri.startsWith("https://")) return match;
            try { return `URI="${new URL(uri, baseUrl).href}"`; } catch { return match; }
          });
        }
        return line;
      }
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return line;
      try { return new URL(trimmed, baseUrl).href; } catch { return line; }
    })
    .join("\n");
}

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return response.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const baseHeaders = {
      "User-Agent": request.headers['user-agent'] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    };
    
    if (request.headers['range']) {
      baseHeaders["Range"] = request.headers['range'];
    }

    const targetOrigin = new URL(targetUrl).origin;
    const strategies = [
      { ...baseHeaders }, // No referer
      { ...baseHeaders, "Referer": "https://ophim.cc/", "Origin": "https://ophim.cc" },
      { ...baseHeaders, "Referer": targetOrigin + "/", "Origin": targetOrigin },
    ];

    let upstream = null;
    let lastStatus = 0;

    for (const hdrs of strategies) {
      try {
        const resp = await fetch(targetUrl, {
          method: "GET",
          headers: hdrs,
          redirect: "follow",
        });
        lastStatus = resp.status;
        if (resp.ok || resp.status === 206) {
          upstream = resp;
          break;
        }
      } catch {
        // Continue to next strategy
      }
    }

    if (!upstream) {
      return response.status(lastStatus >= 400 ? lastStatus : 502).json({
        error: `Upstream returned ${lastStatus}`,
        url: targetUrl
      });
    }

    // Pass back relevant headers
    const contentType = upstream.headers.get("content-type");
    if (contentType) response.setHeader("Content-Type", contentType);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) response.setHeader("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) response.setHeader("Content-Range", contentRange);

    if (contentType && (contentType.includes("mpegurl") || contentType.includes("x-mpegurl") || contentType.includes("application/vnd.apple.mpegurl"))) {
      const text = await upstream.text();
      const rewritten = absolutizeM3u8(text, targetUrl);
      return response.status(upstream.status).send(rewritten);
    } else {
      const arrayBuffer = await upstream.arrayBuffer();
      return response.status(upstream.status).send(Buffer.from(arrayBuffer));
    }

  } catch (err) {
    console.error(err);
    return response.status(502).json({ error: "Fetch failed", details: err.message });
  }
}

import express from "express";
import axios from "axios";
import cors from "cors";
import http from "node:http";
import https from "node:https";

const app = express();

const PORT = Number(process.env.PORT || 3000);
const REQUEST_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 25000);

const ALLOWED_HOSTS = (
  process.env.PROXY_ALLOWED_HOSTS || "ophim1.com,phimapi.com,kkphim"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (FRONTEND_ORIGIN.length === 1 && FRONTEND_ORIGIN[0] === "*") {
  app.use(cors());
} else {
  const allowSet = new Set(FRONTEND_ORIGIN);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowSet.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("CORS blocked"));
      },
    })
  );
}

app.disable("x-powered-by");

const upstream = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  maxRedirects: 5,
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 100 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100 }),
  validateStatus: () => true,
});

function parseTarget(raw) {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const url = new URL(decoded);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function isAllowedHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return ALLOWED_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
}

function toAbsoluteUrl(baseUrl, uri) {
  return new URL(uri, baseUrl).toString();
}

function isPlaylistUrl(absUrl) {
  try {
    const url = new URL(absUrl);
    return /\.m3u8$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function toProxyUrl(absUrl) {
  if (isPlaylistUrl(absUrl)) {
    return `/hls/playlist.m3u8?url=${encodeURIComponent(absUrl)}`;
  }
  return `/hls/media?url=${encodeURIComponent(absUrl)}`;
}

function rewriteTagUri(line, baseUrl) {
  return line.replace(/URI="([^"]+)"/g, (_, value) => {
    const abs = toAbsoluteUrl(baseUrl, value);
    return `URI="${toProxyUrl(abs)}"`;
  });
}

function buildUpstreamHeaders(targetUrl, req, isMedia = false) {
  const origin = `${targetUrl.protocol}//${targetUrl.host}`;
  const headers = {
    "User-Agent":
      req.headers["user-agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Referer: `${origin}/`,
    Origin: origin,
    Accept: req.headers.accept || "*/*",
  };

  if (isMedia && req.headers.range) {
    headers.Range = req.headers.range;
  }

  return headers;
}

function copyHeader(res, sourceHeaders, headerName) {
  const value = sourceHeaders[headerName];
  if (value) {
    res.setHeader(headerName, value);
  }
}

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/hls/playlist.m3u8", async (req, res) => {
  const target = parseTarget(req.query.url);

  if (!target) {
    res.status(400).send("Invalid or missing url");
    return;
  }

  if (!isAllowedHost(target.hostname)) {
    res.status(403).send("Host not allowed");
    return;
  }

  try {
    const response = await upstream.get(target.toString(), {
      responseType: "text",
      headers: buildUpstreamHeaders(target, req, false),
    });

    if (response.status >= 400) {
      res.status(response.status).send(`Upstream error: ${response.status}`);
      return;
    }

    const text = String(response.data || "");
    const lines = text.split(/\r?\n/);

    const rewritten = lines
      .map((lineRaw) => {
        const line = lineRaw.trim();
        if (!line) return lineRaw;

        if (line.startsWith("#")) {
          if (line.includes('URI="')) {
            try {
              return rewriteTagUri(lineRaw, target.toString());
            } catch {
              return lineRaw;
            }
          }
          return lineRaw;
        }

        try {
          const abs = toAbsoluteUrl(target.toString(), line);
          return toProxyUrl(abs);
        } catch {
          return lineRaw;
        }
      })
      .join("\n");

    res.status(200);
    res.setHeader(
      "Content-Type",
      "application/vnd.apple.mpegurl; charset=utf-8"
    );
    res.setHeader("Cache-Control", "no-store");
    res.send(rewritten);
  } catch (error) {
    const message =
      error?.code === "ECONNABORTED"
        ? "Playlist timeout"
        : "Playlist proxy failed";
    res.status(502).send(message);
  }
});

app.get("/hls/media", async (req, res) => {
  const target = parseTarget(req.query.url);

  if (!target) {
    res.status(400).send("Invalid or missing url");
    return;
  }

  if (!isAllowedHost(target.hostname)) {
    res.status(403).send("Host not allowed");
    return;
  }

  let response;
  try {
    response = await upstream.get(target.toString(), {
      responseType: "stream",
      headers: buildUpstreamHeaders(target, req, true),
    });
  } catch (error) {
    const message =
      error?.code === "ECONNABORTED" ? "Media timeout" : "Media proxy failed";
    res.status(502).send(message);
    return;
  }

  res.status(response.status);
  copyHeader(res, response.headers, "content-type");
  copyHeader(res, response.headers, "content-length");
  copyHeader(res, response.headers, "content-range");
  copyHeader(res, response.headers, "accept-ranges");
  copyHeader(res, response.headers, "cache-control");
  copyHeader(res, response.headers, "etag");
  copyHeader(res, response.headers, "last-modified");

  if (!response.headers["content-type"]) {
    res.setHeader("Content-Type", "application/octet-stream");
  }

  response.data.on("error", () => {
    if (!res.headersSent) {
      res.status(502).end("Upstream stream error");
      return;
    }
    res.end();
  });

  req.on("close", () => {
    if (response?.data?.destroy) {
      response.data.destroy();
    }
  });

  response.data.pipe(res);
});

app.listen(PORT, () => {
  console.log(`[proxy] running on :${PORT}`);
});

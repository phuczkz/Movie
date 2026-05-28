

// Stream proxy (optional)
export const STREAM_PROXY = (import.meta.env.VITE_STREAM_PROXY || "")
  .trim()
  .replace(/\/$/, "");

export const FALLBACK_PROXY = (import.meta.env.VITE_HLS_PROXY_BASE || "")
  .trim()
  .replace(/\/$/, "");

/**
 * Check if a segment URL is an ad.
 */
const isAdSegment = (url) => {
  if (!url) return false;
  // Pattern 1: convertv7/, convertv8/, convertv9/, etc.
  if (/convertv\d+\//i.test(url)) return true;
  // Pattern 2: /v7/hexhash/segment_XXXX.ts, /v8/..., etc.
  if (/\/v\d+\/[a-f0-9]{16,}\/segment_\d+\.ts/i.test(url)) return true;
  // Pattern 3: new adjump format (/adjump/YYYYMMDD/HEX/00000X.ts)
  if (/\/adjump\//i.test(url)) return true;
  return false;
};

/**
 * Strip ad segments from an HLS playlist.
 * Simple line-by-line approach — no complex block parsing needed.
 */
export const stripAdSegmentsFromPlaylist = (text = "", sourceUrl = "") => {
  if (!text || typeof text !== "string") return text;
  if (!text.includes("#EXTINF")) return text;

  // Resolve base URL for relative paths
  let baseUrl = "";
  if (sourceUrl) {
    try {
      baseUrl = new URL(".", sourceUrl).href;
    } catch {
      // ignore
    }
  }

  const lines = text.split(/\r?\n/);
  const out = [];
  let adsRemoved = 0;
  let i = 0;
  let accumulatedTime = 0; // track time in seconds

  while (i < lines.length) {
    const line = lines[i].trim();

    // ── Skip #EXT-X-KEY:METHOD=NONE (injected before ad blocks) ──
    if (line === "#EXT-X-KEY:METHOD=NONE") {
      // Allow cutting if before 2 mins (early ads) or after 13 mins (late ads)
      if (accumulatedTime < 2 * 60 || accumulatedTime >= 13 * 60) {
        i++;
        continue;
      }
    }

    // ── Handle #EXTINF lines — check if next line is an ad segment ──
    if (line.startsWith("#EXTINF")) {
      const durationMatch = line.match(/#EXTINF:([\d.]+)/);
      const segmentDuration = durationMatch ? parseFloat(durationMatch[1]) : 0;

      const nextLine = (lines[i + 1] || "").trim();
      if (nextLine && isAdSegment(nextLine)) {
        // User requested: only cut video ads from minute 14 onwards.
        // The segment around 2m57s contains movie footage with an ad title overlay,
        // so we keep it to avoid skipping movie content.
        // UPDATE: The user reported gambling ads at the very beginning (e.g. 28s).
        // So we now cut ads if they are in the first 2 minutes OR after 13 minutes.
        if (accumulatedTime < 2 * 60 || accumulatedTime >= 13 * 60) {
          // Skip both the #EXTINF and the ad segment URL
          adsRemoved++;
          i += 2;
          accumulatedTime += segmentDuration;
          continue;
        }
      }
      accumulatedTime += segmentDuration;
    }

    // ── Skip bare ad segment URLs (safety net) ──
    if (line && !line.startsWith("#") && isAdSegment(line)) {
      if (accumulatedTime < 2 * 60 || accumulatedTime >= 13 * 60) {
        adsRemoved++;
        i++;
        continue;
      }
    }

    // ── Keep this line ──
    // Convert relative URLs to absolute
    let finalLine = line;
    if (baseUrl && line && !line.startsWith("#") && !line.includes("://")) {
      if (line.startsWith("/")) {
        try {
          const urlObj = new URL(sourceUrl);
          finalLine = urlObj.origin + line;
        } catch {
          // ignore
        }
      } else {
        finalLine = baseUrl + line;
      }
    }

    out.push(finalLine);
    i++;
  }

  // ── Clean up orphaned discontinuity markers ──
  // After removing ads, we may have consecutive #EXT-X-DISCONTINUITY lines
  // or discontinuity at the very start/end. Clean those up.
  const cleaned = [];
  const trimmedOut = out.flatMap(l => {
    const t = l.trim();
    return t ? [t] : [];
  });
  for (let j = 0; j < trimmedOut.length; j++) {
    const curr = trimmedOut[j];

    if (curr === "#EXT-X-DISCONTINUITY") {
      // Skip if it's the first content line (nothing before to be discontinuous from)
      if (cleaned.length === 0) continue;

      // Skip if previous line is also a discontinuity (double-discontinuity from ad removal)
      const prev = cleaned[cleaned.length - 1];
      if (prev === "#EXT-X-DISCONTINUITY") continue;

      // Skip if it's right before #EXT-X-ENDLIST (trailing discontinuity)
      const nextNonEmpty = trimmedOut[j + 1];
      if (!nextNonEmpty || nextNonEmpty === "#EXT-X-ENDLIST") continue;

      // Skip if it's right after the header (before first #EXTINF)
      const hasExtinfBefore = cleaned.some((l) => l.startsWith("#EXTINF"));
      if (!hasExtinfBefore) continue;
    }

    cleaned.push(curr);
  }

  // Log results
  if (adsRemoved > 0) {
    console.log(
      "%c[BlockADS] ✓ Đã lọc %d đoạn chứa quảng cáo",
      "color: #10b981; font-weight: bold;",
      adsRemoved
    );
  }

  const result = cleaned.join("\n") + "\n";

  // Safety: if we accidentally removed all content, return original
  if (!result.includes("#EXTINF") && text.includes("#EXTINF")) return text;

  return result;
};

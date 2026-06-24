

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
  // Decode URL if it went through proxy (which encodes slashes as %2F) so regexes can match correctly
  let decoded = url;
  if (url.includes("%") || url.includes("?url=")) {
    try {
      decoded = decodeURIComponent(url);
    } catch {
      // ignore
    }
  }
  // Pattern 1: convertv7/, convertv8/, convertv9/, etc.
  if (/convertv\d+\//i.test(decoded)) return true;
  // Pattern 2: /v7/hexhash/segment_XXXX.ts, /v8/..., etc.
  if (/\/v\d+\/[a-f0-9]{16,}\/segment_\d+\.ts/i.test(decoded)) return true;
  // Pattern 3: new adjump format (/adjump/YYYYMMDD/HEX/00000X.ts)
  if (/\/adjump\//i.test(decoded)) return true;
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
  let i = 0;
  let accumulatedTime = 0; // track time in seconds

  while (i < lines.length) {
    const line = lines[i].trim();

    // ── Check if we are entering a discontinuity block ──
    if (line === "#EXT-X-DISCONTINUITY") {
      let nextDiscontinuityIndex = -1;
      let hasOnlyAdsInBlock = true;
      let hasSegmentsInBlock = false;
      let blockDuration = 0;

      for (let k = i + 1; k < lines.length; k++) {
        const l = lines[k].trim();
        if (l === "#EXT-X-DISCONTINUITY") {
          nextDiscontinuityIndex = k;
          break;
        }
        if (l.startsWith("#EXTINF")) {
          hasSegmentsInBlock = true;
          const durationMatch = l.match(/#EXTINF:([\d.]+)/);
          blockDuration += durationMatch ? parseFloat(durationMatch[1]) : 0;
        } else if (l && !l.startsWith("#")) {
          if (!isAdSegment(l)) {
            hasOnlyAdsInBlock = false;
          }
        }
      }

      // If the block contains only ads and we are allowed to cut them, skip the entire block
      if (
        nextDiscontinuityIndex !== -1 &&
        hasSegmentsInBlock &&
        hasOnlyAdsInBlock &&
        (accumulatedTime < 2 * 60 || accumulatedTime >= 13 * 60)
      ) {
        i = nextDiscontinuityIndex + 1;
        accumulatedTime += blockDuration;
        continue;
      }
    }

    // ── Skip #EXT-X-KEY:METHOD=NONE (injected before ad blocks) ──
    if (line === "#EXT-X-KEY:METHOD=NONE") {
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
        if (accumulatedTime < 2 * 60 || accumulatedTime >= 13 * 60) {
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

  // Log results omitted

  const result = cleaned.join("\n") + "\n";

  // Safety: if we accidentally removed all content, return original
  if (!result.includes("#EXTINF") && text.includes("#EXTINF")) return text;

  return result;
};

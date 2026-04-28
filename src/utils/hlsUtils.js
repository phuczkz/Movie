/**
 * HLS Manifest Ad-Stripping Utility
 *
 * Strips two known ad patterns from kkphim HLS playlists:
 *
 * Pattern 1 — convertv{N}/ segments (double-discontinuity wrapped):
 *   #EXT-X-DISCONTINUITY
 *   #EXTINF:4.0,
 *   convertv8/K9wnQHms.ts
 *   #EXT-X-DISCONTINUITY
 *
 * Pattern 2 — /v{N}/hexhash/segment_XXXX.ts (with METHOD=NONE key):
 *   #EXT-X-DISCONTINUITY
 *   #EXT-X-KEY:METHOD=NONE
 *   #EXTINF:3.6,
 *   /v8/18d007379882ef14b73445b93bf6168d/segment_0001.ts
 *   ...
 *   #EXT-X-DISCONTINUITY
 */

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
      // Only remove if we are past 13 minutes (to cover the 14m ad)
      if (accumulatedTime >= 13 * 60) {
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
        if (accumulatedTime >= 13 * 60) {
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
      if (accumulatedTime >= 13 * 60) {
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
  for (let j = 0; j < out.length; j++) {
    const curr = out[j].trim();

    // Skip empty lines
    if (!curr) continue;

    if (curr === "#EXT-X-DISCONTINUITY") {
      // Skip if it's the first content line (nothing before to be discontinuous from)
      if (cleaned.length === 0) continue;

      // Skip if previous line is also a discontinuity (double-discontinuity from ad removal)
      const prev = cleaned[cleaned.length - 1]?.trim();
      if (prev === "#EXT-X-DISCONTINUITY") continue;

      // Skip if it's right before #EXT-X-ENDLIST (trailing discontinuity)
      const nextNonEmpty = out.slice(j + 1).find((l) => l.trim());
      if (!nextNonEmpty || nextNonEmpty.trim() === "#EXT-X-ENDLIST") continue;

      // Skip if it's right after the header (before first #EXTINF)
      const hasExtinfBefore = cleaned.some((l) => l.trim().startsWith("#EXTINF"));
      if (!hasExtinfBefore) continue;
    }

    cleaned.push(curr);
  }

  // Log results
  if (adsRemoved > 0) {
    console.log(
      "%c[BlockADS] ✓ Đã lọc %d đoạn quảng cáo",
      "color: #10b981; font-weight: bold;",
      adsRemoved
    );
  }

  const result = cleaned.join("\n") + "\n";

  // Safety: if we accidentally removed all content, return original
  if (!result.includes("#EXTINF") && text.includes("#EXTINF")) return text;

  return result;
};

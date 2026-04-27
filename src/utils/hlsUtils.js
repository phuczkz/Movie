/**
 * HLS Manifest Filtering Utilities
 */

// Stream proxy — khi được cấu hình, tất cả HLS requests sẽ đi qua
// Cloudflare Worker proxy để bypass firewall chặn CDN video.
// Để trống = kết nối trực tiếp (không có overhead proxy).
export const STREAM_PROXY = (import.meta.env.VITE_STREAM_PROXY || "")
  .trim()
  .replace(/\/$/, "");

// Secondary proxy — used when the primary STREAM_PROXY fails (e.g. blocked by CDN).
// Falls back to direct connection only after both proxies fail.
export const FALLBACK_PROXY = (import.meta.env.VITE_HLS_PROXY_BASE || "")
  .trim()
  .replace(/\/$/, "");

/**
 * Loại bỏ các đoạn quảng cáo khỏi playlist HLS dựa trên từ khóa đen.
 * Đồng thời chuyển đổi các URL tương đối thành tuyệt đối.
 */
export const stripAdSegmentsFromPlaylist = (text = "", sourceUrl = "") => {
  if (!text || typeof text !== "string") return text;

  let baseUrl = "";
  if (sourceUrl) {
    try {
      baseUrl = new URL(".", sourceUrl).href;
    } catch {
      // ignore
    }
  }

  // 1. Separate the HLS header from the body (everything before the first segment or discontinuity)
  const firstInfIndex = text.indexOf("#EXTINF");
  const firstDiscIndex = text.indexOf("#EXT-X-DISCONTINUITY");
  const markerIndex = Math.min(
    firstInfIndex === -1 ? Infinity : firstInfIndex,
    firstDiscIndex === -1 ? Infinity : firstDiscIndex
  );

  let header = "";
  let body = text;
  if (markerIndex !== Infinity && markerIndex > 0) {
    header = text.substring(0, markerIndex);
    body = text.substring(markerIndex);
  }

  // 2. Split body into blocks by discontinuity
  const blocks = body.split(/(?:^|\n)#EXT-X-DISCONTINUITY\b/);

  // ── Blacklisted URL patterns ──
  // Any segment URL or block containing these strings is considered an ad.
  const blacklisted = [
    // kkphim ad patterns (critical — these are the most common)
    "convertv7",    // convertv7/xxx.ts — kkphim ad converter v7
    "convertv",     // future-proof: convertv8, convertv9, etc.
    "/v7/",         // /v7/hash/segment_XXXX.ts — kkphim mid-roll ads
    "segment_",     // segment_0001.ts, etc. — ad segment naming

    // General ad networks & CDNs
    "adjump",
    "khomay",
    "proxys",
    "bitcdn",
    "googleads",
    "doubleclick",
    "adnxs",
    "vads",
    "ccdn",
    "p-cdn",
    "media-ads",
    "stream-ads",
    "vid-ads",
    "clouddn",
    "phimads",
    "vntrailer",
    "mobads",
    "yandex",
    "mads",
    "traffic",
    "popunder",
    "banner",
    "delivery",
    "v-segments",
    "p-segments",
    "cloud-segments",
  ];

  // Helper: count #EXTINF entries in a block
  const countSegments = (blockText) => {
    const m = blockText.match(/#EXTINF:/g);
    return m ? m.length : 0;
  };

  const stripLines = (blockText) => {
    const lines = blockText.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip ad-related HLS directives (e.g. #EXT-X-KEY:METHOD=NONE injected before ad blocks)
      if (line.startsWith("#EXT-X-KEY:METHOD=NONE")) continue;

      if (line.startsWith("#EXTINF")) {
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
        if (nextLine && blacklisted.some((word) => nextLine.includes(word))) {
          i += 1;
          continue;
        }
      }
      if (!line.startsWith("#") && blacklisted.some((word) => line.includes(word))) continue;

      let finalLine = line;
      if (baseUrl && !line.startsWith("#") && !line.includes("://")) {
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
    }
    return out.join("\n");
  };

  // ── Phase 1: Classify each block ──
  const blockMeta = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) {
      blockMeta.push({ block, isEmpty: true, isAd: false, duration: 0, segCount: 0 });
      continue;
    }

    // Calculate duration
    const infMatches = block.match(/#EXTINF:([\d.]+)/g);
    let duration = 0;
    if (infMatches) {
      duration = infMatches.reduce((acc, str) => {
        const match = str.match(/[\d.]+/);
        return acc + (match ? parseFloat(match[0]) : 0);
      }, 0);
    }

    const segCount = countSegments(block);
    let isAd = false;

    // Rule 1: Explicit blacklist match
    if (blacklisted.some((word) => block.includes(word))) {
      isAd = true;
    }
    // Rule 2: Sequence reset pattern (segment numbers starting at 0/1 mid-movie)
    else if (duration > 0 && duration < 65 && blocks.length > 2) {
      const hasResetPattern = /segment_000[01]\.ts|[^a-zA-Z0-9]000[01]\.ts\b|[^a-zA-Z0-9][01]\.ts\b/i.test(block);
      if (hasResetPattern && i > 0) {
        isAd = true;
      }
    }

    blockMeta.push({ block, isEmpty: false, isAd, duration, segCount });
  }

  // ── Phase 2: Detect "island" ad patterns ──
  // kkphim wraps each ad segment in its own double-discontinuity:
  //   #EXT-X-DISCONTINUITY
  //   #EXTINF:4.36,
  //   convertv7/xxx.ts
  //   #EXT-X-DISCONTINUITY
  //   #EXT-X-DISCONTINUITY    ← creates empty block
  //   #EXTINF:3.92,
  //   convertv7/yyy.ts
  //   #EXT-X-DISCONTINUITY
  //
  // After splitting by discontinuity, this creates a pattern of:
  //   [1-seg block] [empty] [1-seg block] [empty] ...
  //
  // Heuristic: If we find 3+ consecutive non-empty blocks that each have
  // only 1 segment and duration < 8s, they're almost certainly ads.
  // (Real content blocks have dozens/hundreds of segments)
  let consecutiveTinyStart = -1;
  for (let i = 0; i < blockMeta.length; i++) {
    const m = blockMeta[i];
    if (m.isEmpty) continue; // skip empty blocks in the sequence check

    const isTiny = !m.isAd && m.segCount <= 2 && m.duration > 0 && m.duration < 8 && i > 0;

    if (isTiny) {
      if (consecutiveTinyStart === -1) consecutiveTinyStart = i;
    } else {
      // End of a consecutive run — if 3+ tiny blocks in a row, mark them all as ads
      if (consecutiveTinyStart !== -1) {
        let tinyCount = 0;
        for (let j = consecutiveTinyStart; j < i; j++) {
          if (!blockMeta[j].isEmpty) tinyCount++;
        }
        if (tinyCount >= 3) {
          for (let j = consecutiveTinyStart; j < i; j++) {
            if (!blockMeta[j].isEmpty) blockMeta[j].isAd = true;
          }
        }
      }
      consecutiveTinyStart = -1;
    }
  }
  // Handle trailing run
  if (consecutiveTinyStart !== -1) {
    let tinyCount = 0;
    for (let j = consecutiveTinyStart; j < blockMeta.length; j++) {
      if (!blockMeta[j].isEmpty) tinyCount++;
    }
    if (tinyCount >= 3) {
      for (let j = consecutiveTinyStart; j < blockMeta.length; j++) {
        if (!blockMeta[j].isEmpty) blockMeta[j].isAd = true;
      }
    }
  }

  // ── Phase 3: Build the clean manifest ──
  // CRITICAL: Do NOT join all blocks with #EXT-X-DISCONTINUITY blindly!
  // Each unnecessary discontinuity causes hls.js to reinit the codec on seek
  // (flush buffer + reset transmuxer + wait for keyframe = 500ms-2s PER discontinuity).
  //
  // Strategy: Merge adjacent content blocks into a single continuous stream
  // when they share the same segment URL pattern (same CDN, same encoding).
  // Only keep #EXT-X-DISCONTINUITY when the encoding genuinely changes.
  const validBlocks = [];
  for (const m of blockMeta) {
    if (m.isEmpty || m.isAd) continue;
    const stripped = stripLines(m.block);
    if (stripped && stripped.trim().length > 0) {
      validBlocks.push(stripped);
    }
  }

  // Helper: extract the "origin pattern" from a block's segment URLs
  // e.g. "https://s6.kkphim.com/path/" or just the relative path style
  const getBlockOriginPattern = (blockText) => {
    const lines = blockText.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        // Found a segment URL
        try {
          if (trimmed.includes("://")) {
            const u = new URL(trimmed);
            return u.origin + u.pathname.substring(0, u.pathname.lastIndexOf("/") + 1);
          }
        } catch {}
        // Relative URL — check if it has a directory prefix
        const slashIdx = trimmed.lastIndexOf("/");
        return slashIdx > 0 ? trimmed.substring(0, slashIdx + 1) : "relative";
      }
    }
    return "unknown";
  };

  // 3. Reconstruct the manifest — merge blocks when possible
  let result = header;
  if (validBlocks.length > 0) {
    if (result && !result.endsWith("\n")) result += "\n";

    const parts = [validBlocks[0]];
    for (let i = 1; i < validBlocks.length; i++) {
      const prevPattern = getBlockOriginPattern(validBlocks[i - 1]);
      const currPattern = getBlockOriginPattern(validBlocks[i]);

      if (prevPattern === currPattern && prevPattern !== "unknown") {
        // Same CDN origin + path → merge without discontinuity (seamless seeking)
        parts.push(validBlocks[i]);
      } else {
        // Different origin/encoding → keep discontinuity (codec reinit needed)
        parts.push("#EXT-X-DISCONTINUITY");
        parts.push(validBlocks[i]);
      }
    }
    result += parts.join("\n");
  }

  // Ensure EXTM3U is there if it was originally
  if (text.includes("#EXTM3U") && !result.includes("#EXTM3U")) {
    result = "#EXTM3U\n" + result;
  }

  // Ensure ENDLIST is there if it was originally
  if (text.includes("#EXT-X-ENDLIST") && !result.includes("#EXT-X-ENDLIST")) {
    result = result.trimEnd() + "\n#EXT-X-ENDLIST\n";
  }

  // If filtered result is critically broken, return original as fallback
  if (!result.includes("#EXTINF") && text.includes("#EXTINF")) return text;

  return result;
};

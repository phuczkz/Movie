/**
 * HLS Manifest Filtering Utilities
 */

// Stream proxy — khi được cấu hình, tất cả HLS requests sẽ đi qua
// Cloudflare Worker proxy để bypass firewall chặn CDN video.
// Để trống = kết nối trực tiếp (không có overhead proxy).
export const STREAM_PROXY = (import.meta.env.VITE_STREAM_PROXY || "")
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
  const blacklisted = ["adjump", "/v7/", "khomay", "proxys", "bitcdn", "ads"];

  const stripLines = (blockText) => {
    const lines = blockText.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith("#EXTINF")) {
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
        if (nextLine && blacklisted.some((word) => nextLine.includes(word))) {
          i += 1;
          continue;
        }
      }
      if (blacklisted.some((word) => line.includes(word))) continue;

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

  const validBlocks = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Calculate duration
    const infMatches = block.match(/#EXTINF:([\d.]+)/g);
    let duration = 0;
    if (infMatches) {
      duration = infMatches.reduce((acc, str) => {
        const match = str.match(/[\d.]+/);
        return acc + (match ? parseFloat(match[0]) : 0);
      }, 0);
    }

    let isAd = false;
    // Explicit blacklist check
    if (blacklisted.some((word) => block.includes(word))) {
      isAd = true;
    }
    // Heuristic: very short blocks between discontinuities are usually ads
    // (Keep this threshold low — 15s — to avoid stripping legitimate content)
    else if (duration > 0 && duration < 15 && blocks.length > 2) {
      isAd = true;
    }

    if (!isAd) {
      validBlocks.push(stripLines(block));
    }
  }

  // 3. Reconstruct the manifest
  let result = header;
  if (validBlocks.length > 0) {
    if (result && !result.endsWith("\n")) result += "\n";
    result += validBlocks.join("\n#EXT-X-DISCONTINUITY\n");
  }

  // Ensure EXTM3U is there if it was originally
  if (text.includes("#EXTM3U") && !result.includes("#EXTM3U")) {
    result = "#EXTM3U\n" + result;
  }

  // If filtered result is critically broken, return original as fallback
  if (!result.includes("#EXTINF") && text.includes("#EXTINF")) return text;

  return result;
};

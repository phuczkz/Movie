import { stripAdSegmentsFromPlaylist } from "../../utils/hlsUtils";


export const buildAdFreeLoader = (BaseLoader, sourceUrl) => {
  if (!BaseLoader) return null;

  return class AdFreePlaylistLoader extends BaseLoader {
    load(context, config, callbacks) {
      // IMPORTANT: Do NOT modify context.url — load directly from CDN.
      // This ensures hls.js uses the native URL for all requests,
      // maintaining full HTTP/2 multiplexing and connection pooling.
      const originalUrl = context.url;
      const onSuccess = callbacks?.onSuccess;

      const wrappedCallbacks = {
        ...callbacks,
        onSuccess: (response, stats, ctx, networkDetails) => {
          let nextResponse = response;

          // Strip ad segments from playlist text
          if (response?.data != null) {
            try {
              let text = response.data;
              if (typeof text !== "string") {
                if (text instanceof ArrayBuffer) {
                  text = new TextDecoder().decode(text);
                } else {
                  text = String(text);
                }
              }

              if (text.includes("#EXTM3U") || text.includes("#EXTINF")) {
                const filtered = stripAdSegmentsFromPlaylist(
                  text,
                  originalUrl || sourceUrl
                );
                if (
                  typeof filtered === "string" &&
                  filtered.length > 0 &&
                  filtered.includes("#EXTINF")
                ) {
                  if (filtered.length < text.length) {
                    // console.log(
                    //   "%c[BlockADS] ✓ Đã lọc quảng cáo (%d → %d bytes, -%d bytes)",
                    //   "color: #10b981; font-weight: bold;",
                    //   text.length,
                    //   filtered.length,
                    //   text.length - filtered.length
                    // );
                  }
                  nextResponse = { ...response, data: filtered };
                }
              }
            } catch (e) {
              console.debug("[AdFreeLoader] Filter error, using original:", e);
            }
          }

          if (onSuccess) onSuccess(nextResponse, stats, ctx, networkDetails);
        },
      };

      // Call the original loader's load method with UNMODIFIED URL
      super.load(context, config, wrappedCallbacks);
    }
  };
};

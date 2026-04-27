import { useState, useRef, useMemo, useEffect } from "react";
import { STREAM_PROXY, FALLBACK_PROXY, stripAdSegmentsFromPlaylist } from "../utils/hlsUtils";

/**
 * Hook to handle HLS library loading, manifest filtering for ad-stripping,
 * and player initialization.
 */
export const useHlsHandler = (source, isHls) => {
  const hlsRef = useRef(null);
  const [Hls, setHls] = useState(null);
  const [filteredSource, setFilteredSource] = useState(null);
  const blobUrlsRef = useRef([]);

  // Lazy load hls.js only when needed
  useEffect(() => {
    if (isHls && !Hls) {
      import("hls.js").then((mod) => {
        setHls(() => mod.default);
      });
    }
  }, [isHls, Hls]);

  const hlsConfig = useMemo(() => {
    // Detect true mobile via User-Agent + screen width
    const isMobile =
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;
    const isTablet = !isMobile && window.innerWidth <= 1024;

    return {
      maxBufferLength: isMobile ? 30 : 60,
      maxMaxBufferLength: isMobile ? 60 : 120,
      maxBufferSize: isMobile
        ? 60 * 1000 * 1000
        : isTablet
        ? 120 * 1000 * 1000
        : 200 * 1000 * 1000,
      maxBufferHole: 0.5,
      backBufferLength: 60,
      startLevel: -1, // Auto
      lowLatencyMode: false,
      abrEwmaDefaultEstimate: 2_000_000,
      abrBandWidthFactor: 0.8,
      abrBandWidthUpFactor: 0.6,
      fragLoadingRetryDelay: 500,
      fragLoadingMaxRetryTimeout: 32000,
      fragLoadingMaxRetry: 15,
      fragLoadingTimeOut: 30000,
      manifestLoadingMaxRetry: 6,
      manifestLoadingTimeOut: 30000,
      levelLoadingMaxRetry: 6,
      levelLoadingTimeOut: 30000,
      nudgeMaxRetry: 10,
      nudgeOffset: 0.1,
      enableWorker: true,
    };
  }, []);

  const [isFiltering, setIsFiltering] = useState(false);
  const needsFilter = isHls && Boolean(source) && Hls && !Hls.isSupported();
  const effectiveSource = needsFilter ? filteredSource || source : source;

  useEffect(() => {
    let cancelled = false;
    const revoke = () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };

    if (!needsFilter || !source) {
      revoke();
      setIsFiltering(false);
      return undefined;
    }

    const fetchWithProxy = async (targetUrl) => {
      const urls = [
        STREAM_PROXY ? `${STREAM_PROXY}?url=${encodeURIComponent(targetUrl)}` : null,
        FALLBACK_PROXY && FALLBACK_PROXY !== STREAM_PROXY ? `${FALLBACK_PROXY}?url=${encodeURIComponent(targetUrl)}` : null,
        targetUrl
      ].filter(Boolean);
      
      for (const u of urls) {
         try {
             const res = await fetch(u);
             if (res.ok) {
                 const text = await res.text();
                 if (text.includes("#EXTM3U") || text.includes("#EXTINF")) return text;
             }
         } catch {}
      }
      return null;
    };

    const fetchAndFilter = async () => {
      setIsFiltering(true);
      try {
        const text = await fetchWithProxy(source);
        if (cancelled) return;
        if (!text) throw new Error("All proxies and direct connection failed to load valid master playlist.");

        let finalManifestText = "";
        let baseUrl = "";
        try { baseUrl = new URL(".", source).href; } catch {}

        // If it's a master manifest with levels
        if (text.includes("#EXT-X-STREAM-INF")) {
           const lines = text.split(/\r?\n/);
           const newLines = [];
           const levelPromises = [];
           
           for (let i = 0; i < lines.length; i++) {
               const line = lines[i].trim();
               if (!line) continue;
               
               if (line.startsWith("#EXT-X-STREAM-INF")) {
                   newLines.push(line);
                   // find the next line that is the URL
                   let j = i + 1;
                   while (j < lines.length && lines[j].trim().startsWith("#")) {
                       newLines.push(lines[j].trim());
                       j++;
                   }
                   if (j < lines.length) {
                       const urlLine = lines[j].trim();
                       let absoluteUrl = urlLine;
                       if (!urlLine.includes("://")) {
                           if (urlLine.startsWith("/")) {
                               try { absoluteUrl = new URL(source).origin + urlLine; } catch {}
                           } else {
                               absoluteUrl = baseUrl + urlLine;
                           }
                       }
                       
                       const levelIndex = newLines.length;
                       newLines.push(""); // placeholder for blob url
                       
                       const promise = fetchWithProxy(absoluteUrl).then(lvlText => {
                           if (!lvlText) return absoluteUrl; // fallback to original absolute URL
                           const filtered = stripAdSegmentsFromPlaylist(lvlText, absoluteUrl);
                           const blob = new Blob([filtered], { type: "application/vnd.apple.mpegurl" });
                           const blobUrl = URL.createObjectURL(blob);
                           blobUrlsRef.current.push(blobUrl);
                           newLines[levelIndex] = blobUrl;
                           return blobUrl;
                       });
                       levelPromises.push(promise);
                       i = j; // skip the original url line
                   }
               } else {
                   newLines.push(line);
               }
           }
           
           await Promise.all(levelPromises);
           finalManifestText = newLines.filter(l => l !== "").join('\n');
           
           // Ensure it has #EXTM3U
           if (!finalManifestText.includes("#EXTM3U")) {
             finalManifestText = "#EXTM3U\n" + finalManifestText;
           }
        } else {
           // It's already a level manifest, just strip ads
           finalManifestText = stripAdSegmentsFromPlaylist(text, source);
        }

        if (cancelled) return;

        const masterBlob = new Blob([finalManifestText], { type: "application/vnd.apple.mpegurl" });
        const masterBlobUrl = URL.createObjectURL(masterBlob);
        blobUrlsRef.current.push(masterBlobUrl);
        setFilteredSource(masterBlobUrl);
        setIsFiltering(false);
      } catch (err) {
        if (!cancelled) {
          console.error("Filter failed, falling back to original", err);
          setFilteredSource(null);
          setIsFiltering(false);
        }
      }
    };

    fetchAndFilter();
    return () => {
      cancelled = true;
      revoke();
      setFilteredSource(null);
      setIsFiltering(false);
    };
  }, [needsFilter, source]);

  return {
    Hls,
    hlsRef,
    hlsConfig,
    effectiveSource,
    needsFilter,
    isFiltering,
  };
};

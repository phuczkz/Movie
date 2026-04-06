import { useState, useRef, useMemo, useEffect } from "react";
import { STREAM_PROXY, stripAdSegmentsFromPlaylist } from "../utils/hlsUtils";

/**
 * Hook to handle HLS library loading, manifest filtering for ad-stripping,
 * and player initialization.
 */
export const useHlsHandler = (source, isHls) => {
  const hlsRef = useRef(null);
  const [Hls, setHls] = useState(null);
  const [filteredSource, setFilteredSource] = useState(null);
  const playlistObjectUrlRef = useRef(null);

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
      maxBufferLength: isMobile ? 15 : 30,
      maxMaxBufferLength: isMobile ? 30 : 60,
      maxBufferSize: isMobile
        ? 30 * 1000 * 1000
        : isTablet
        ? 60 * 1000 * 1000
        : 100 * 1000 * 1000,
      maxBufferHole: 1.0,
      backBufferLength: 10,
      startLevel: -1, // Auto
      lowLatencyMode: false,
      abrEwmaDefaultEstimate: 1_500_000,
      abrBandWidthFactor: 0.7,
      abrBandWidthUpFactor: 0.5,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 16000,
      fragLoadingMaxRetry: 10,
      fragLoadingTimeOut: 60000,
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
      if (playlistObjectUrlRef.current) {
        URL.revokeObjectURL(playlistObjectUrlRef.current);
        playlistObjectUrlRef.current = null;
      }
    };

    if (!needsFilter || !source) {
      revoke();
      setIsFiltering(false);
      return undefined;
    }

    const fetchAndFilter = async () => {
      setIsFiltering(true);
      try {
        const fetchUrl = STREAM_PROXY
          ? `${STREAM_PROXY}?url=${encodeURIComponent(source)}`
          : source;
        const res = await fetch(fetchUrl);
        const text = await res.text();
        if (cancelled) return;

        const filtered = stripAdSegmentsFromPlaylist(text, source);
        const blob = new Blob([filtered], {
          type: "application/vnd.apple.mpegurl",
        });

        if (cancelled) return;
        revoke();
        playlistObjectUrlRef.current = URL.createObjectURL(blob);
        setFilteredSource(playlistObjectUrlRef.current);
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

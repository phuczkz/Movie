import { useState, useRef, useMemo, useEffect } from "react";
import { buildAdFreeLoader } from "../components/Player/AdFreeLoader";

/**
 * Hook to handle HLS library loading and ad-stripping configuration.
 *
 * Performance optimizations for < 100ms fragment loading:
 * 1. Preconnect + DNS prefetch to CDN (eliminates ~100-300ms connection setup)
 * 2. Back buffer = Infinity (instant backward seeking)
 * 3. Progressive loading + fragment prefetch (playback starts immediately)
 * 4. pLoader for ad-stripping (zero overhead on fragment loading)
 * 5. Optimistic ABR estimate (5Mbps) for faster quality selection
 */
export const useHlsHandler = (source, isHls) => {
  const hlsRef = useRef(null);
  const [Hls, setHls] = useState(null);

  // Lazy load hls.js only when needed
  useEffect(() => {
    if (isHls && !Hls) {
      import("hls.js").then((mod) => {
        setHls(() => mod.default);
      });
    }
  }, [isHls, Hls]);

  // ── Preconnect to CDN for faster fragment loading ──
  // By establishing TCP + TLS connection BEFORE the first fragment request,
  // we save ~100-300ms per new connection. The browser reuses this connection
  // for all subsequent requests via HTTP/2 multiplexing.
  useEffect(() => {
    if (!source || !isHls) return;

    let cdnOrigin = null;
    try {
      const url = new URL(source);
      cdnOrigin = url.origin;
    } catch {
      return;
    }
    if (!cdnOrigin) return;

    const cleanup = [];

    // DNS Prefetch — resolve hostname immediately
    const existingDns = document.head.querySelector(
      `link[rel="dns-prefetch"][href="${cdnOrigin}"]`
    );
    if (!existingDns) {
      const dns = document.createElement("link");
      dns.rel = "dns-prefetch";
      dns.href = cdnOrigin;
      document.head.appendChild(dns);
      cleanup.push(dns);
    }

    // Preconnect — establish TCP + TLS connection immediately
    const existingPreconnect = document.head.querySelector(
      `link[rel="preconnect"][href="${cdnOrigin}"]`
    );
    if (!existingPreconnect) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = cdnOrigin;
      preconnect.crossOrigin = "anonymous";
      document.head.appendChild(preconnect);
      cleanup.push(preconnect);
    }

    return () => {
      cleanup.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, [source, isHls]);

  // Build ad-free playlist loader once Hls is available
  const AdFreeLoaderClass = useMemo(() => {
    if (!Hls || !Hls.isSupported()) return null;
    const BaseLoader = Hls.DefaultConfig?.loader;
    if (!BaseLoader) return null;
    return buildAdFreeLoader(BaseLoader, source);
  }, [Hls, source]);

  const hlsConfig = useMemo(() => {
    const isMobile =
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;

    const config = {
      // ── FORWARD BUFFER ──
      maxBufferLength: isMobile ? 30 : 60,
      maxMaxBufferLength: isMobile ? 60 : 120,
      maxBufferSize: isMobile ? 100_000_000 : 300_000_000,

      // ── BACK BUFFER — instant backward seeking ──
      backBufferLength: isMobile ? 300 : Infinity,

      // ── GAP & STALL HANDLING ──
      maxBufferHole: 0.5,
      nudgeMaxRetry: 5,
      nudgeOffset: 0.2,
      maxFragLookUpTolerance: 0.25,

      // ── ABR ──
      startLevel: -1,
      abrEwmaDefaultEstimate: 5_000_000,
      abrBandWidthFactor: 0.95,
      abrBandWidthUpFactor: 0.7,

      // ── LOADING — minimal timeouts for fast failure detection ──
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 4,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 16000,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 3,

      // ── PERFORMANCE CORE ──
      enableWorker: true,
      lowLatencyMode: false,
      progressive: true,
      startFragPrefetch: true,

      // ── XHR OPTIMIZATION ──
      // Avoid sending credentials (cookies) to CDN — this prevents
      // CORS preflight (OPTIONS) requests which add ~50-200ms per request.
      xhrSetup: (xhr) => {
        xhr.withCredentials = false;
      },
    };

    // Ad-stripping via pLoader (playlist-only, no proxy, just text filter)
    if (AdFreeLoaderClass) {
      config.pLoader = AdFreeLoaderClass;
    }

    return config;
  }, [AdFreeLoaderClass]);

  return {
    Hls,
    hlsRef,
    hlsConfig,
  };
};

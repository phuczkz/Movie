import { useState, useRef, useMemo, useEffect } from "react";
import { buildAdFreeLoader } from "../components/Player/AdFreeLoader";

/**
 * Hook to handle HLS library loading and ad-stripping configuration.
 *
 * Performance optimizations for sub-200ms TTFF:
 * 1. Module-level hls.js preload (starts loading BEFORE component mount)
 * 2. Preconnect + DNS prefetch to CDN (eliminates ~100-300ms connection setup)
 * 3. Back buffer = Infinity (instant backward seeking, no re-download)
 * 4. progressive: true + stopLoad/startLoad flush on seek (fast start + clean buffer)
 * 5. fetchSetup (Fetch API, no preflight, HTTP/2 streaming — replaces xhrSetup)
 * 6. startFragPrefetch + low starvation delay (playback fires at first bytes)
 * 7. pLoader for ad-stripping (zero overhead on fragment loading)
 * 8. Optimistic ABR estimate for immediate quality selection
 */

// ── Module-level HLS.js preload ──
// Start loading hls.js immediately when this module is first imported,
// NOT when a component mounts. This eliminates ~50-150ms from the waterfall.
let _hlsModulePromise = null;
let _hlsModuleCache = null;

const preloadHls = () => {
  if (_hlsModuleCache) return Promise.resolve(_hlsModuleCache);
  if (!_hlsModulePromise) {
    _hlsModulePromise = import("hls.js").then((mod) => {
      _hlsModuleCache = mod.default;
      return _hlsModuleCache;
    });
  }
  return _hlsModulePromise;
};

// Start preloading immediately on module import
preloadHls();

export const useHlsHandler = (source, isHls) => {
  const hlsRef = useRef(null);
  const [Hls, setHls] = useState(() => _hlsModuleCache); // Use cache if already loaded

  // Resolve hls.js from preload promise (usually instant from cache)
  useEffect(() => {
    if (isHls && !Hls) {
      preloadHls().then((HlsClass) => {
        setHls(() => HlsClass);
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
      // Conservative buffer sizes to prevent network queue congestion.
      // Optimized: Reduced to 10s (mobile) / 15s (desktop) to avoid loading too many
      // heavy segments in parallel, which would congest the connection pool.
      maxBufferLength: isMobile ? 10 : 15,
      maxMaxBufferLength: isMobile ? 20 : 30,
      maxBufferSize: isMobile ? 10_000_000 : 20_000_000, // 10MB / 20MB

      // ── BACK BUFFER ──
      // Keep 2 minutes of played video in memory for instant backward seeking.
      // NEVER use Infinity — it causes unbounded memory growth that triggers
      // browser garbage collection, which mass-cancels pending network requests.
      backBufferLength: isMobile ? 120 : 300,

      // ── GAP & STALL HANDLING ──
      // After ad segments are stripped, there may be small gaps in the
      // timeline at discontinuity boundaries. These settings ensure hls.js
      // automatically skips over those gaps instead of freezing video.
      maxBufferHole: 1.0,          // skip gaps up to 1s (was 0.5 — too tight after ad removal)
      nudgeMaxRetry: 8,            // more retries before giving up on stall recovery
      nudgeOffset: 0.2,            // 200ms nudge per retry
      maxFragLookUpTolerance: 0.5, // wider tolerance for fragment matching after discontinuity

      // ── ABR ──
      startLevel: -1,
      // Optimized: Start with a lower default estimate (1Mbps desktop, 500Kbps mobile)
      // to quickly load a smaller first segment (instant start) and then dynamically scale up.
      abrEwmaDefaultEstimate: isMobile ? 500_000 : 1_000_000,
      abrBandWidthFactor: 0.95,
      abrBandWidthUpFactor: 0.7,
      testBandwidth: true,

      // ── LOADING — balanced timeouts for stable failure recovery ──
      fragLoadingTimeOut: 10000,
      fragLoadingMaxRetry: 5,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 20000,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 3,

      // ── PERFORMANCE CORE ──
      enableWorker: true,
      lowLatencyMode: true, // Optimized: Enable low latency mode to optimize buffer management
      // progressive: true — Fetch and append data to SourceBuffer incrementally.
      // This is the default and provides optimal buffering performance on most networks.
      progressive: true,
      startFragPrefetch: true,
      stretchShortVideoTrack: true,

      // ── FETCH API — replaces xhrSetup ──
      // Benefits of fetchSetup over xhrSetup:
      //   • No CORS preflight for credentialless requests (saves 50-200ms per req)
      //   • Native HTTP/2 multiplexing + connection reuse with no extra overhead
      // "omit" credentials = browser never attaches cookies to CDN requests,
      // which would otherwise force a costly OPTIONS preflight on every fragment.
      fetchSetup: (context, initParams) => {
        return new Request(context.url, {
          ...initParams,
          credentials: "omit",
          mode: "cors",
          cache: "default",  // re-use browser cache for repeated segment fetches
        });
      },

      // ── EARLY PLAYBACK TRIGGER ──
      // Reduce how much buffer hls.js requires before un-stalling playback.
      maxStarvationDelay: 2,        // Optimized: Reduced from 4s to 2s to resume faster after stall
      highBufferWatchdogPeriod: 2,  // check buffer health every 2s (default: 3)
      liveSyncDurationCount: 3,     // keep sync in live streams
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

import { useState, useRef, useMemo, useEffect } from "react";
import { buildAdFreeLoader } from '@/features/movies/components/Player/AdFreeLoader';


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

    const isKkphim = source && (source.includes("kkphim") || source.includes("phimapi"));

    const config = {
      // ── FORWARD BUFFER ──
      // Giữ buffer ở mức tối ưu (30s desktop / 20s mobile) để tránh vượt ngưỡng bộ nhớ MSE SourceBuffer
      // của trình duyệt (tránh QuotaExceededError gây rớt frame video trong khi audio vẫn nạp tiếp).
      maxBufferLength: isMobile ? 20 : 30,
      maxMaxBufferLength: isMobile ? 40 : 60,
      maxBufferSize: isMobile ? 30_000_000 : 60_000_000,

      // ── BACK BUFFER ──
      // Đệm lùi 30s (desktop) / 15s (mobile) vừa đủ để tua lại mà không giữ thừa rác trong RAM
      backBufferLength: isMobile ? 15 : 30,

      // ── GAP & STALL HANDLING ──
      maxBufferHole: 0.8,          // tự động lướt qua các khe hở đệm dưới 0.8s
      nudgeMaxRetry: 8,            // số lần thử vi chỉnh tự động khi gặp stall
      nudgeOffset: 0.15,           // nhích 150ms mỗi lần retry
      maxFragLookUpTolerance: 0.5, // dung sai tìm fragment

      // ── ABR ──
      startLevel: -1,
      abrEwmaDefaultEstimate: isMobile ? 1_000_000 : 3_000_000,
      abrBandWidthFactor: 0.8,
      abrBandWidthUpFactor: 0.6,
      testBandwidth: true,

      // ── LOADING — balanced timeouts for stable failure recovery ──
      fragLoadingTimeOut: isKkphim ? 12000 : 30000,
      fragLoadingMaxRetry: 10,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 64000,
      
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 5,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 5,
      appendErrorMaxRetry: 5,

      // ── PERFORMANCE CORE ──
      enableWorker: true,
      lowLatencyMode: false,
      // progressive: false — Cực kỳ quan trọng với MPEG-TS (.ts)!
      // Tránh việc audio nạp trước qua stream chunk trong khi video bị kẹt GOP/keyframe.
      progressive: false,
      startFragPrefetch: true,
      stretchShortVideoTrack: true,
      forceKeyFrameOnDiscontinuity: true,

      // ── FETCH API — replaces xhrSetup ──
      fetchSetup: (context, initParams) => {
        return new Request(context.url, {
          ...initParams,
          signal: initParams.signal,
          credentials: "omit",
          mode: "cors",
          cache: "default",
        });
      },

      // ── EARLY PLAYBACK TRIGGER ──
      maxStarvationDelay: 2.5,
      highBufferWatchdogPeriod: 2,
      liveSyncDurationCount: 3,
    };

    // Ad-stripping via pLoader (playlist-only, no proxy, just text filter)
    if (AdFreeLoaderClass) {
      config.pLoader = AdFreeLoaderClass;
    }

    return config;
  }, [AdFreeLoaderClass, source]);

  return {
    Hls,
    hlsRef,
    hlsConfig,
  };
};

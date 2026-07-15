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
      // Giữ buffer ở mức vừa đủ để prefetch liên tục mà không làm ngập connection pool.
      // 20s (desktop) / 12s (mobile) = ~4–10 segment prefetch đồng thời.
      // Quá lớn (60s+) sẽ gửi quá nhiều request cùng lúc → mỗi .ts chờ nhau → chậm.
      // hls.js tự scale lên maxMaxBufferLength khi mạng cho phép.
      maxBufferLength: isMobile ? 30 : 60,
      maxMaxBufferLength: isMobile ? 60 : 120,
      maxBufferSize: isMobile ? 60_000_000 : 120_000_000,

      // ── BACK BUFFER ──
      // Giữ vừa đủ để backward seek mà không chiếm quá nhiều RAM.
      // RAM quá lớn → browser GC → hủy pending network requests → .ts chậm.
      // 60s (desktop) / 30s (mobile) = đủ rewind 1 phút mà không gây leak.
      backBufferLength: isMobile ? 10 : 20,

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
      // Estimate băng thông ban đầu cao hơn để hls.js chọn quality tốt ngay từ segment đầu.
      // 3Mbps (desktop) / 1.5Mbps (mobile) → tránh bị kẹt ở quality thấp rồi mới scale lên.
      abrEwmaDefaultEstimate: isMobile ? 1_000_000 : 3_000_000,
      abrBandWidthFactor: 0.8,
      abrBandWidthUpFactor: 0.6,
      testBandwidth: true,

      // ── LOADING — balanced timeouts for stable failure recovery ──
      // Kiến trúc hệ thống: Chỉ áp dụng ngắt sớm (12s) cho KKphim vì server này có cơ chế bóp băng thông.
      // Với Ophim và các nguồn khác, giữ nguyên 30s (chuẩn HLS) để tránh việc tự ngắt liên tục khi mạng người dùng yếu.
      fragLoadingTimeOut: isKkphim ? 12000 : 30000,
      fragLoadingMaxRetry: 10,
      fragLoadingRetryDelay: 1000,
      // Timeout tối đa giữa 2 lần thử lại (Exponential backoff).
      // Giới hạn ở 64s (chuẩn gốc) để tránh việc dồn dập gọi lại server khi mạng đang chết hẳn.
      fragLoadingMaxRetryTimeout: 64000,
      
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 5, // Tăng từ 3 lên 5 để chống rớt mạng tạm thời lúc mới vào phim
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 5, // Tăng từ 3 lên 5
      appendErrorMaxRetry: 5, // Thêm mới: Cho phép thử lại nhiều lần hơn khi SourceBuffer gặp lỗi giải mã

      // ── PERFORMANCE CORE ──
      enableWorker: true,
      lowLatencyMode: false, // Optimized: Enable low latency mode to optimize buffer management
      // progressive: true — Fetch and append data to SourceBuffer incrementally.
      // This is the default and provides optimal buffering performance on most networks.
      progressive: true,
      startFragPrefetch: true,
      stretchShortVideoTrack: true,
      forceKeyFrameOnDiscontinuity: true, // Fix: Tránh kẹt hình (video freeze) khi seek backward
      maxAudioFramesDrift: 1, // Fix: Giữ đồng bộ chặt chẽ audio/video sau khi seek

      // ── FETCH API — replaces xhrSetup ──
      // Benefits of fetchSetup over xhrSetup:
      //   • No CORS preflight for credentialless requests (saves 50-200ms per req)
      //   • Native HTTP/2 multiplexing + connection reuse with no extra overhead
      // "omit" credentials = browser never attaches cookies to CDN requests,
      // which would otherwise force a costly OPTIONS preflight on every fragment.
      fetchSetup: (context, initParams) => {
        // Truyền lại tín hiệu abort (signal) để hls.js có thể ngắt kết nối tải thừa khi tua
        return new Request(context.url, {
          ...initParams,
          signal: initParams.signal,
          credentials: "omit",
          mode: "cors",
          cache: "default",
        });
      },

      // ── EARLY PLAYBACK TRIGGER ──
      // maxStarvationDelay: thời gian tối đa chờ buffer đủ trước khi un-stall.
      // 4s (tăng từ 2s) — tránh stall/unstall liên tục khi .ts tải mất 2-3s.
      maxStarvationDelay: 4,
      highBufferWatchdogPeriod: 2,  // check buffer health every 2s (default: 3)
      liveSyncDurationCount: 3,     // keep sync in live streams
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

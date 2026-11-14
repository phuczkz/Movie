import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { getMoviePosterFallbackChain, isSlowVodUrl } from "@/utils/image-helper.js";

const DEFAULT_FALLBACK = "https://placehold.co/600x900/0f172a/94a3b8?text=loading";

// Global cache các URL đã tải thành công trong session
const globalLoadedImageCache = new Set();

/**
 * Custom hook to manage movie image fallback URL chains with smart timeout.
 * Automatically cycles through direct CDN, worker proxy, and alternate extensions.
 * Implements a 2.5s client-side timeout (2.0s for slow vod) to prevent hanging
 * HTTP connections and browser connection pool starvation.
 *
 * @param {Object} movie - Movie data object containing poster_url, thumb_url, etc.
 * @param {number} [width=360] - Optimization target width
 * @param {number} [quality=80] - Optimization quality (1-100)
 * @param {string} [fallbackUrl=DEFAULT_FALLBACK] - Final fallback placeholder URL
 * @param {Function} [onLoadedOrFailed] - Callback when image finishes loading or exhausts all retries
 * @param {"poster"|"thumb"} [preferred="poster"] - "poster" | "thumb"
 * @returns {{ posterSrc: string, handlePosterError: Function, handlePosterLoad: Function, isLoaded: boolean, posterFallbackChain: string[] }}
 */
export const usePosterFallback = (
  movie,
  width = 360,
  quality = 80,
  fallbackUrl = DEFAULT_FALLBACK,
  onLoadedOrFailed,
  preferred = "poster"
) => {
  const posterFallbackChain = useMemo(() => {
    return getMoviePosterFallbackChain(movie, width, quality, preferred);
  }, [movie, width, quality, preferred]);

  const [prevChain, setPrevChain] = useState(posterFallbackChain);
  const [retryIndex, setRetryIndex] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState(null);
  const timerRef = useRef(null);

  // Khi movie hoặc chain thay đổi, reset lại index và loadedUrl trong render
  if (prevChain !== posterFallbackChain) {
    setPrevChain(posterFallbackChain);
    setRetryIndex(0);
    setLoadedUrl(null);
  }

  const currentSrc =
    retryIndex < posterFallbackChain.length
      ? posterFallbackChain[retryIndex]
      : fallbackUrl;

  const isLoaded = Boolean(
    !currentSrc ||
    currentSrc === fallbackUrl ||
    globalLoadedImageCache.has(currentSrc) ||
    loadedUrl === currentSrc
  );

  const advanceToNext = useCallback((failedSrc) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRetryIndex((prev) => {
      // Đảm bảo không bị nhảy cóc (double-increment) khi cả thẻ <img> DOM và probe nền cùng báo lỗi cho một URL
      if (failedSrc && posterFallbackChain[prev] !== failedSrc) {
        return prev;
      }
      const nextIdx = prev + 1;
      if (nextIdx >= posterFallbackChain.length && typeof onLoadedOrFailed === "function") {
        onLoadedOrFailed();
      }
      return nextIdx;
    });
  }, [posterFallbackChain, onLoadedOrFailed]);

  const handlePosterError = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    advanceToNext(currentSrc);
  }, [advanceToNext, currentSrc]);

  const handlePosterLoad = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (currentSrc && currentSrc !== fallbackUrl) {
      globalLoadedImageCache.add(currentSrc);
    }
    setLoadedUrl(currentSrc);
    if (typeof onLoadedOrFailed === "function") {
      onLoadedOrFailed();
    }
  }, [currentSrc, fallbackUrl, onLoadedOrFailed]);

  // Bộ đếm Timeout cho từng candidate URL
  useEffect(() => {
    if (!currentSrc || currentSrc === fallbackUrl) return;

    if (globalLoadedImageCache.has(currentSrc)) {
      return;
    }

    let isCancelled = false;
    const probe = new Image();

    probe.onload = () => {
      if (isCancelled) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      globalLoadedImageCache.add(currentSrc);
      setLoadedUrl(currentSrc);
    };

    probe.onerror = () => {
      if (isCancelled) return;
      advanceToNext(currentSrc);
    };

    // Với link upload/vod bị nghẽn: giới hạn 2000ms. Link khác 2500ms.
    const timeoutMs = isSlowVodUrl(currentSrc) ? 2000 : 2500;

    timerRef.current = setTimeout(() => {
      if (isCancelled) return;
      // TIMEOUT: Ngắt kết nối probe để giải phóng socket
      probe.src = "";
      advanceToNext(currentSrc);
    }, timeoutMs);

    probe.src = currentSrc;

    if (probe.complete && probe.naturalWidth > 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      globalLoadedImageCache.add(currentSrc);
      queueMicrotask(() => {
        if (!isCancelled) {
          setLoadedUrl(currentSrc);
        }
      });
    }

    return () => {
      isCancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      probe.src = "";
    };
  }, [currentSrc, advanceToNext, fallbackUrl]);

  return {
    posterSrc: currentSrc,
    handlePosterError,
    handlePosterLoad,
    isLoaded,
    posterFallbackChain,
  };
};

export default usePosterFallback;

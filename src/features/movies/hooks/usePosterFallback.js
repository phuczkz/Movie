import { useRef, useMemo, useCallback, useEffect } from "react";
import { getMoviePosterFallbackChain } from "@/utils/image-helper.js";

const DEFAULT_FALLBACK = "https://placehold.co/600x900/0f172a/94a3b8?text=loading";

/**
 * Custom hook to manage movie poster fallback URL chains.
 * Cycles through optimized, direct, alternate extension (.jpg <-> .webp),
 * and thumbnail URLs when an image fails to load.
 *
 * @param {Object} movie - Movie data object containing poster_url, thumb_url, etc.
 * @param {number} [width=360] - Optimization target width
 * @param {number} [quality=80] - Optimization quality (1-100)
 * @param {string} [fallbackUrl=DEFAULT_FALLBACK] - Final fallback placeholder URL
 * @param {Function} [onLoadedOrFailed] - Callback when image finishes loading or exhausts all retries
 * @returns {{ posterSrc: string, handlePosterError: Function, posterFallbackChain: string[] }}
 */
export const usePosterFallback = (
  movie,
  width = 360,
  quality = 80,
  fallbackUrl = DEFAULT_FALLBACK,
  onLoadedOrFailed
) => {
  const posterFallbackChain = useMemo(() => {
    return getMoviePosterFallbackChain(movie, width, quality);
  }, [movie, width, quality]);

  const posterRetryIndex = useRef(0);

  useEffect(() => {
    posterRetryIndex.current = 0;
  }, [movie]);

  const handlePosterError = useCallback((e) => {
    const nextIdx = posterRetryIndex.current + 1;
    if (nextIdx < posterFallbackChain.length) {
      posterRetryIndex.current = nextIdx;
      e.currentTarget.src = posterFallbackChain[nextIdx];
    } else {
      e.currentTarget.onerror = null;
      if (fallbackUrl) {
        e.currentTarget.src = fallbackUrl;
      }
      if (typeof onLoadedOrFailed === "function") {
        onLoadedOrFailed();
      }
    }
  }, [posterFallbackChain, fallbackUrl, onLoadedOrFailed]);

  return {
    posterSrc: posterFallbackChain[0] || fallbackUrl,
    handlePosterError,
    posterFallbackChain,
  };
};

export default usePosterFallback;

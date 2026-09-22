import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Calendar, Film, Globe, Heart, Info, ChevronDown } from "lucide-react";

import { useSavedMovie } from '@/features/movies/hooks/useSavedMovie.js';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail.js';
import { normalizeServerLabel, parseEpisodeNumber } from '@/utils/episodes.js';
import { isMobile } from '@/utils/responsive.js';
import { getOptimizedPoster } from '@/utils/image-helper.js';
import { usePosterFallback } from '@/features/movies/hooks/usePosterFallback.js';

const fallbackPoster =
  "https://placehold.co/600x900/0f172a/94a3b8?text=loading";
const fallbackLandscape =
  "https://placehold.co/1280x720/0f172a/94a3b8?text=No+Image";


// ─── Hover Preview Card ──────────────────────────────────────────────────────
const HoverCard = ({
  movie,
  isTrailer = false,
  thumbSrc,
  thumbFallbacks,
  audioBadges,
  alignment,
}) => {
  const { isSaved, toggleSave, loading: favLoading } = useSavedMovie(movie);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const thumbRetryIndex = useRef(0);

  const categories = useMemo(() => {
    const cats = movie?.category || [];
    if (!Array.isArray(cats)) return [];
    return cats
      .slice(0, 3)
      .flatMap((c) => {
        const name = typeof c === "string" ? c : c?.name || c?.slug || "";
        return name ? [name] : [];
      });
  }, [movie]);

  const qualityLabel = movie?.quality?.toUpperCase() || "HD";
  const episodeStatus = movie?.episode_current || "";
  const year = movie?.year;
  const content = movie?.content || movie?.origin?.content || "";

  // Detect trailer: check isTrailer prop, episode_current, or status
  const rawEpCurrent = episodeStatus.toLowerCase();
  const rawStatus = (movie?.status || "").toLowerCase();
  const isTrailerCard =
    isTrailer ||
    rawEpCurrent.includes("trailer") ||
    rawEpCurrent.includes("teaser") ||
    rawStatus.includes("trailer") ||
    rawStatus.includes("teaser");

  const statusLabel = (() => {
    if (isTrailerCard) return null;
    const s = episodeStatus.toLowerCase();
    if (s.includes("full") || s.includes("hoàn tất")) return "Full";
    if (s.includes("tập")) return episodeStatus;
    return episodeStatus;
  })();

  const alignmentClass = alignment === "left" ? "hc-popup--left" : alignment === "right" ? "hc-popup--right" : "";

  // Build a unique, ordered list of fallback URLs to try on error
  const fallbackChain = useMemo(() => {
    const seen = new Set();
    const chain = [];
    for (const src of (thumbFallbacks || [])) {
      if (src && !seen.has(src)) {
        seen.add(src);
        chain.push(src);
      }
    }
    if (!seen.has(fallbackLandscape)) chain.push(fallbackLandscape);
    return chain;
  }, [thumbFallbacks]);

  const handleThumbError = (e) => {
    const idx = thumbRetryIndex.current;
    if (idx < fallbackChain.length) {
      thumbRetryIndex.current = idx + 1;
      e.currentTarget.src = fallbackChain[idx];
    } else {
      e.currentTarget.onerror = null;
      e.currentTarget.src = fallbackLandscape;
      setThumbLoaded(true);
    }
  };

  return (
    <div className={`hc-popup ${alignmentClass}`} onClick={(e) => e.stopPropagation()}>
      {/* ── Landscape image ── */}
      <div className="hc-thumb">
        {!thumbLoaded && <div className="absolute inset-0 mc-img-skeleton" />}
        <img
          src={thumbSrc}
          alt={movie.name}
          loading="eager"
          onLoad={() => setThumbLoaded(true)}
          onError={handleThumbError}
        />
        <div className="hc-thumb-gradient" />
      </div>

      {/* ── Body ── */}
      <div className="hc-body">
        {/* Title */}
        <h3 className="hc-title">{movie.name}</h3>
        {movie.origin_name && movie.origin_name !== movie.name && (
          <p className="hc-origin">{movie.origin_name}</p>
        )}

        {/* Action row */}
        <div className="hc-actions">
          <Link
            to={isTrailerCard ? `/movie/${movie.slug}` : `/watch/${movie.slug}`}
            className="hc-btn-play"
            onClick={(e) => e.stopPropagation()}
          >
            <Play size={13} fill="currentColor" />
            {isTrailerCard ? "Xem Trailer" : "Xem Ngay"}
          </Link>

          <button
            type="button"
            className={`hc-icon-btn ${isSaved ? "hc-icon-btn--active" : ""}`}
            aria-label="Yêu thích"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSave();
            }}
            disabled={favLoading}
          >
            <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
          </button>

          <Link
            to={`/movie/${movie.slug}`}
            className="hc-icon-btn"
            aria-label="Chi tiết"
            title="Chi tiết"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronDown size={18} />
          </Link>
        </div>

        {/* Meta badges row */}
        <div className="hc-meta-row">
          {year && <span className="hc-meta-plain">{year}</span>}
          {qualityLabel && <span className="hc-meta-badge hc-meta-badge--blue">{qualityLabel}</span>}
          {statusLabel && <span className="hc-meta-badge hc-meta-badge--green">{statusLabel}</span>}
          {audioBadges.map((b) => (
            <span
              key={b.key}
              className={`hc-meta-badge ${b.code === "Trailer" ? "hc-meta-badge--red" : "hc-meta-badge--orange"
                }`}
            >
              {b.code}
            </span>
          ))}
        </div>

        {/* Genres */}
        {categories.length > 0 && (
          <p className="hc-genres">{categories.join(" • ")}</p>
        )}

        {/* Description */}
        {content && (
          <p className="hc-desc">
            {content.replace(/<[^>]*>/g, "").slice(0, 150)}
            {content.length > 150 ? "…" : ""}
          </p>
        )}
      </div>
    </div>
  );
};

// Bọc memo để HoverCard không re-render khi MovieCard cha cập nhật state không liên quan
const MemoHoverCard = memo(HoverCard);

// Module-level cache để lưu các URL poster đã tải thành công trong phiên làm việc.
// Giúp hiển thị ảnh tức thì, tránh giật/chớp nháy skeleton khi cuộn lên cuộn xuống.
const loadedPosterCache = new Set();

// ─── Main MovieCard ──────────────────────────────────────────────────────────
const MovieCard = ({ movie, priority = false, suppressHover = false }) => {
  const imgRef = useRef(null);
  const cardRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [alignment, setAlignment] = useState("center");
  const [apiReady, setApiReady] = useState(false);

  const slug = movie?.slug;
  const episodeCurrentText = movie?.episode_current;
  const movieLang = movie?.lang;

  const isHoverDevice = useRef(
    typeof window !== "undefined" ? window.matchMedia("(hover: hover)").matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    const handler = (e) => { isHoverDevice.current = e.matches; };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const hoverTimerRef = useRef(null);

  const handleMouseEnter = (e) => {
    if (suppressHover || !isHoverDevice.current || window.innerWidth < 1024) return;

    // Trigger API fetch only if user stays on the card for 250ms
    hoverTimerRef.current = setTimeout(() => {
      setApiReady(true);
      setHovered(true);
    }, 250);

    const rect = e.currentTarget.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const scrollParent = e.currentTarget.closest(".home-grid-movies") || e.currentTarget.closest(".overflow-x-auto");
    const parentRect = scrollParent ? scrollParent.getBoundingClientRect() : null;
    const rightBound = parentRect ? Math.min(window.innerWidth, parentRect.right) : window.innerWidth;
    const leftBound = parentRect ? Math.max(0, parentRect.left) : 0;
    const threshold = 160;

    if (center - leftBound < threshold) {
      setAlignment("left");
    } else if (rightBound - center < threshold) {
      setAlignment("right");
    } else {
      setAlignment("center");
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHovered(false);
  };

  // Chỉ fetch chi tiết phim khi người dùng hover (apiReady).
  // priority chỉ dùng để ưu tiên tải ảnh (loading="eager", fetchPriority="high"),
  // KHÔNG kích hoạt gọi API để tránh 12-16 request đồng loạt khi load trang.
  const { data: detailData, isFetched } = useMovieDetail(slug, {
    enabled: apiReady && !!slug,
  });
  const detailMovie = detailData?.movie;

  // Prioritize detailMovie when fetched, as the Detail API contains the most accurate, official poster
  const effectiveMovie = useMemo(() => {
    if (!detailMovie) return movie;
    return {
      ...movie,
      ...detailMovie,
      poster_url: detailMovie.poster_url || movie.poster_url,
      thumb_url: detailMovie.thumb_url || movie.thumb_url,
    };
  }, [movie, detailMovie]);

  const episodeList = useMemo(() => detailData?.episodes || [], [detailData?.episodes]);

  const isTrailer = useMemo(() => {
    // 1. Check original movie object from list
    const listEp = (movie?.episode_current || episodeCurrentText || "").toLowerCase();
    const listStatus = (movie?.status || "").toLowerCase();
    if (
      listEp.includes("trailer") ||
      listEp.includes("teaser") ||
      listStatus.includes("trailer") ||
      listStatus.includes("teaser")
    ) {
      return true;
    }

    // 2. Check detailMovie from API
    const detailEp = (detailMovie?.episode_current || "").toLowerCase();
    const detailStatus = (detailMovie?.status || "").toLowerCase();
    if (
      detailEp.includes("trailer") ||
      detailEp.includes("teaser") ||
      detailStatus.includes("trailer") ||
      detailStatus.includes("teaser")
    ) {
      return true;
    }

    // 3. Check if all fetched episodes are trailer/teaser/preview
    if (episodeList.length > 0) {
      const allEpisodesAreTrailers = episodeList.every((ep) => {
        const str = `${ep?.name || ""} ${ep?.slug || ""} ${ep?.filename || ""}`.toLowerCase();
        return (
          str.includes("trailer") ||
          str.includes("teaser") ||
          str.includes("preview") ||
          str.includes("bts")
        );
      });
      if (allEpisodesAreTrailers) {
        return true;
      }
    }

    return false;
  }, [
    movie?.episode_current,
    movie?.status,
    episodeCurrentText,
    detailMovie?.episode_current,
    detailMovie?.status,
    episodeList,
  ]);

  const audioBadges = useMemo(() => {
    if (isTrailer) {
      return [{ key: "trailer", code: "Trailer", label: "Trailer", episodeText: null }];
    }

    // Helper to compute episode text for a given list of episodes
    const computeEpisodeText = (eps) => {
      const latestFromList = eps.reduce((max, ep) => {
        const n = parseEpisodeNumber(ep?.name || ep?.slug);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, -1);

      const epTotalNum = parseEpisodeNumber(movie?.episode_total);
      const formatEp = (num) => (num < 10 && num > 0 ? `${num}` : num);

      if (latestFromList >= 0) {
        if (Number.isFinite(epTotalNum) && epTotalNum > 0) {
          return `${formatEp(Math.min(latestFromList, epTotalNum))}/${epTotalNum}`;
        }
        return `${formatEp(latestFromList)}`;
      }

      const current = (movie?.episode_current || "").toLowerCase();
      const isCompleted = current.includes("full") || current.includes("hoàn tất");

      const parsedCurrent = parseEpisodeNumber(current);
      if (parsedCurrent !== null && parsedCurrent > 0) {
        if (Number.isFinite(epTotalNum) && epTotalNum > 1) {
          return `${formatEp(parsedCurrent)}/${epTotalNum}`;
        }
        return formatEp(parsedCurrent);
      }
      if (isCompleted) return "Full";

      return null;
    };

    const badges = [];

    // Use actual episode data if fetched
    if (isFetched && episodeList.length > 0) {
      const serverEpisodesMap = new Map();
      episodeList.forEach((ep) => {
        const label = normalizeServerLabel(ep.server_name);
        if (label) {
          if (!serverEpisodesMap.has(label)) serverEpisodesMap.set(label, []);
          serverEpisodesMap.get(label).push(ep);
        }
      });

      const makeEpText = (serverLabel) => {
        const eps = serverEpisodesMap.get(serverLabel);
        return eps ? computeEpisodeText(eps) : null;
      };

      if (serverEpisodesMap.has("Vietsub"))
        badges.push({ key: "vietsub", code: "PĐ", label: "Phụ đề", episodeText: makeEpText("Vietsub") });
      if (serverEpisodesMap.has("Thuyết Minh"))
        badges.push({ key: "thuyetminh", code: "TM", label: "Thuyết minh", episodeText: makeEpText("Thuyết Minh") });
      if (serverEpisodesMap.has("Lồng Tiếng"))
        badges.push({ key: "longtieng", code: "LT", label: "Lồng tiếng", episodeText: makeEpText("Lồng Tiếng") });
    }

    // Fallback/Initial logic: use metadata from the movie object
    if (badges.length === 0) {
      const fallbackEpText = computeEpisodeText([]);
      const text = `${episodeCurrentText || ""} ${movieLang || ""} ${movie?.status || ""}`.toLowerCase();
      const hasEpisodeSignal = Boolean(fallbackEpText);

      const hasVietsub = text.includes("vietsub") || text.includes("phụ đề") || text.includes("phu de");
      const hasThuyetMinh = text.includes("thuyết minh") || text.includes("thuy minh") || text.includes("tm");
      const hasLongTieng = text.includes("lồng tiếng") || text.includes("long tieng") || text.includes("lt");

      if (hasEpisodeSignal && hasVietsub)
        badges.push({ key: "vietsub-f", code: "PĐ", label: "Phụ đề", episodeText: fallbackEpText });
      if (hasEpisodeSignal && hasThuyetMinh)
        badges.push({ key: "thuyetminh-f", code: "TM", label: "Thuyết minh", episodeText: fallbackEpText });
      if (hasEpisodeSignal && hasLongTieng)
        badges.push({ key: "longtieng-f", code: "LT", label: "Lồng tiếng", episodeText: fallbackEpText });

      if (badges.length === 0) {
        if (hasEpisodeSignal) {
          badges.push({ key: "vietsub-fallback", code: "PĐ", label: "Phụ đề", episodeText: fallbackEpText });
        } else {
          badges.push({ key: "trailer", code: "Trailer", label: "Trailer", episodeText: null });
        }
      }
    }

    return badges;
  }, [isTrailer, episodeList, episodeCurrentText, movieLang, movie.status, movie.episode_total, movie.episode_current, isFetched]);

  useEffect(() => {
    if (!cardRef.current || isInView) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px", threshold: 0.01 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isInView, slug]);

  // Dùng useMemo để tránh gọi DOM API (window.innerWidth) mỗi lần render
  const isMobileSize = useMemo(() => isMobile(), []);
  const posterWidth = priority ? (isMobileSize ? 300 : 480) : (isMobileSize ? 200 : 360);
  const posterQuality = isMobileSize ? 70 : 80;

  const onImageFallbackExhausted = useCallback(() => {
    setLoaded(true);
  }, []);

  const { posterSrc, handlePosterError } = usePosterFallback(
    effectiveMovie,
    posterWidth,
    posterQuality,
    fallbackPoster,
    onImageFallbackExhausted
  );

  const handlePosterLoad = useCallback(() => {
    if (posterSrc) loadedPosterCache.add(posterSrc);
    setLoaded(true);
  }, [posterSrc]);

  // Kiểm tra ảnh đã có trong bộ nhớ tạm session hoặc cache trình duyệt chưa
  const isCached = Boolean(posterSrc && loadedPosterCache.has(posterSrc));
  const isImageReady = loaded || isCached;

  useEffect(() => {
    // Nếu trình duyệt đã cache sẵn ảnh, kích hoạt hiển thị ngay lập tức
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      if (posterSrc) loadedPosterCache.add(posterSrc);
      requestAnimationFrame(() => {
        setLoaded(true);
      });
    }
  }, [posterSrc]);

  // Determine the best landscape image for the hover popup.
  // For movies from the API list, thumb_url = landscape, poster_url = portrait (already normalized).
  // For saved/favorites movies, thumb_url may be missing or same as poster_url (both portrait).
  // When API detail data is available (from useMovieDetail), prefer its thumb_url as the
  // definitive landscape source since normalizeMovie() in movies.js correctly swaps
  // Ophim's confusing poster/thumb naming.
  const bestLandscape =
    (detailMovie?.thumb_url && detailMovie.thumb_url !== detailMovie?.poster_url
      ? detailMovie.thumb_url
      : null) ||
    (effectiveMovie.thumb_url && effectiveMovie.thumb_url !== effectiveMovie.poster_url
      ? effectiveMovie.thumb_url
      : null) ||
    effectiveMovie.thumb_url ||
    effectiveMovie.poster_url;

  // Primary: optimized proxy URL for the thumb
  const thumbSrc =
    getOptimizedPoster(
      bestLandscape,
      isMobileSize ? 400 : 640,
      isMobileSize ? 70 : 80
    ) || fallbackLandscape;

  // Fallback chain for popup thumb: direct CDN URL → detail API URL → poster URL
  const thumbFallbacks = useMemo(() => {
    const sources = [];
    // 1st fallback: the raw landscape URL (skip all proxies)
    if (bestLandscape) sources.push(bestLandscape);
    // 2nd fallback: detail API thumb_url if different
    if (detailMovie?.thumb_url && detailMovie.thumb_url !== bestLandscape) {
      sources.push(detailMovie.thumb_url);
    }
    // 3rd fallback: the raw poster_url (different image, but better than nothing)
    if (movie.poster_url && movie.poster_url !== bestLandscape) sources.push(movie.poster_url);
    return sources;
  }, [bestLandscape, detailMovie?.thumb_url, movie.poster_url]);

  return (
    <div
      ref={cardRef}
      className="mc-wrapper group relative flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        to={`/movie/${movie.slug}`}
        state={{ movie, posterSrc, thumbSrc }}
        className="relative flex flex-col"
      >
        <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-800 relative shadow-lg lg:group-hover:shadow-emerald-500/20 transition-all duration-300">
          {/* Skeleton shimmer — visible until image is loaded */}
          {!isImageReady && (
            <div className="absolute inset-0 mc-img-skeleton" />
          )}
          <img
            ref={imgRef}
            src={posterSrc}
            alt={movie.name}
            className={`absolute h-full w-full object-cover lg:group-hover:scale-105 ${isImageReady ? "opacity-100 scale-100" : "opacity-0"
              } ${isCached ? "" : "transition-opacity duration-300"}`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            {...(priority
              ? { fetchPriority: "high" }
              : { fetchPriority: "low" })}
            onLoad={handlePosterLoad}
            onError={handlePosterError}
          />

          {audioBadges.length ? (
            <div className="absolute inset-x-3 bottom-3 flex flex-nowrap items-center justify-center gap-1 overflow-hidden z-10">
              {audioBadges.map((badge) => (
                <div
                  key={badge.key}
                  title={badge.label}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] leading-none font-bold uppercase shadow-md transition-transform duration-200 lg:group-hover:-translate-y-[2px] whitespace-nowrap ${badge.code === "PĐ"
                    ? "bg-slate-600/90 text-white backdrop-blur-md"
                    : badge.code === "TM"
                      ? "bg-amber-500/90 text-slate-950 backdrop-blur-md"
                      : badge.code === "NCT"
                        ? "bg-slate-500/90 text-white backdrop-blur-md"
                        : badge.code === "Trailer"
                          ? "bg-rose-500/90 text-white backdrop-blur-md"
                          : "bg-sky-500/90 text-white backdrop-blur-md"
                    }`}
                >
                  <span>
                    {badge.code}{badge.code !== "Trailer" && badge.code !== "NCT" && badge.episodeText ? `.${badge.episodeText}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </div>

        <div className="mt-2.5 flex flex-col items-center text-center px-1">
          <h3 className="text-sm sm:text-[15px] font-semibold text-white line-clamp-1 lg:group-hover:text-emerald-400 transition-colors">
            {movie.name}
          </h3>
          <p className="text-xs sm:text-[13px] font-medium text-slate-400 line-clamp-1 mt-0.5">
            {movie.origin_name || movie.name}
          </p>
        </div>
      </Link>

      {/* Hover Preview — overlays directly on the card, centered */}
      {hovered && (
        <MemoHoverCard
          movie={effectiveMovie}
          isTrailer={isTrailer}
          thumbSrc={thumbSrc}
          thumbFallbacks={thumbFallbacks}
          audioBadges={audioBadges}
          alignment={alignment}
        />
      )}
    </div>
  );
};

export default memo(MovieCard);

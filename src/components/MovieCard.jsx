import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Play, Calendar, Film, Globe, Heart, Info, ChevronDown } from "lucide-react";

import { useSavedMovie } from "../hooks/useSavedMovie.js";
import { getEpisodes } from "../api/movies.js";
import { normalizeServerLabel, parseEpisodeNumber } from "../utils/episodes.js";

const fallbackPoster =
  "https://placehold.co/600x900/0f172a/94a3b8?text=loading";
const fallbackLandscape =
  "https://placehold.co/1280x720/0f172a/94a3b8?text=No+Image";

const getOptimizedPoster = (url, w = 360) => {
  if (!url) return url;
  try {
    const rawHost = new URL(url).hostname;
    if (rawHost.includes("tmdb.org")) {
      return url.replace(
        /\/w(92|154|185|300|342|500|780|original)\//,
        `/w${w > 400 ? 500 : 342}/`
      );
    }
    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&output=webp&w=${w}&fit=cover&q=80`;
  } catch {
    return url;
  }
};


// ─── Hover Preview Card ──────────────────────────────────────────────────────
const HoverCard = ({ movie, thumbSrc, audioBadges, alignment }) => {
  const { isSaved, toggleSave, loading: favLoading } = useSavedMovie(movie);

  const categories = useMemo(() => {
    const cats = movie?.category || [];
    if (!Array.isArray(cats)) return [];
    return cats
      .slice(0, 3)
      .map((c) => (typeof c === "string" ? c : c?.name || c?.slug || ""))
      .filter(Boolean);
  }, [movie]);

  const qualityLabel = movie?.quality?.toUpperCase() || "HD";
  const episodeStatus = movie?.episode_current || "";
  const year = movie?.year;
  const content = movie?.content || movie?.origin?.content || "";

  const statusLabel = (() => {
    const s = episodeStatus.toLowerCase();
    if (s.includes("full") || s.includes("hoàn tất")) return "Full";
    if (s.includes("tập")) return episodeStatus;
    return episodeStatus;
  })();

  const alignmentClass = alignment === "left" ? "hc-popup--left" : alignment === "right" ? "hc-popup--right" : "";

  return (
    <div className={`hc-popup ${alignmentClass}`} onClick={(e) => e.stopPropagation()}>
      {/* ── Landscape image ── */}
      <div className="hc-thumb">
        <img
          src={thumbSrc}
          alt={movie.name}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackLandscape;
          }}
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
            to={`/watch/${movie.slug}`}
            className="hc-btn-play"
            onClick={(e) => e.stopPropagation()}
          >
            <Play size={13} fill="currentColor" />
            Xem Ngay
          </Link>

          <button
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
              className={`hc-meta-badge ${
                b.code === "Trailer" ? "hc-meta-badge--red" : "hc-meta-badge--orange"
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

// ─── Main MovieCard ──────────────────────────────────────────────────────────
const MovieCard = ({ movie, priority = false, suppressHover = false }) => {
  const imgRef = useRef(null);
  const cardRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [alignment, setAlignment] = useState("center");
  const [apiReady, setApiReady] = useState(false);

  const slug = movie?.slug;
  const episodeCurrentText = movie?.episode_current;
  const movieLang = movie?.lang;

  const [isHoverDevice, setIsHoverDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    setIsHoverDevice(mediaQuery.matches);

    const handler = (e) => setIsHoverDevice(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const hoverTimerRef = useRef(null);

  const handleMouseEnter = (e) => {
    if (suppressHover || !isHoverDevice) return;

    // Trigger API fetch only if user stays on the card for 250ms
    hoverTimerRef.current = setTimeout(() => {
      setApiReady(true);
      setHovered(true);
    }, 250);

    const rect = e.currentTarget.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const threshold = 160;

    if (center < threshold) {
      setAlignment("left");
    } else if (window.innerWidth - center < threshold) {
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

  const { data: episodeList = [], isFetched } = useQuery({
    queryKey: ["movie_episodes_v2", slug],
    queryFn: () => getEpisodes(slug),
    enabled: apiReady && !!slug,
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  // Helper to compute episode text for a given list of episodes
  const computeEpisodeText = (eps) => {
    const latestFromList = eps.reduce((max, ep) => {
      const n = parseEpisodeNumber(ep?.name || ep?.slug);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, -1);

    const epTotal = parseEpisodeNumber(movie?.episode_total);
    const formatEp = (num) => (num < 10 && num > 0 ? `${num}` : num);

    if (latestFromList >= 0) {
      if (Number.isFinite(epTotal) && epTotal > 0) {
        return `${formatEp(Math.min(latestFromList, epTotal))}/${epTotal}`;
      }
      return `${formatEp(latestFromList)}`;
    }

    const current = (movie?.episode_current || "").toLowerCase();
    if (current.includes("full") || current.includes("hoàn tất")) return "Full";
    
    const parsedCurrent = parseEpisodeNumber(current);
    if (parsedCurrent !== null && parsedCurrent > 0) {
        if (Number.isFinite(epTotal) && epTotal > 1) {
            return `${formatEp(parsedCurrent)}/${epTotal}`;
        }
        return formatEp(parsedCurrent);
    }
    
    return null;
  };

  const audioBadges = useMemo(() => {
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
      
      const hasVietsub = text.includes("vietsub") || text.includes("phụ đề") || text.includes("phu de");
      const hasThuyetMinh = text.includes("thuyết minh") || text.includes("thuy minh") || text.includes("tm");
      const hasLongTieng = text.includes("lồng tiếng") || text.includes("long tieng") || text.includes("lt");

      if (hasVietsub)
        badges.push({ key: "vietsub-f", code: "PĐ", label: "Phụ đề", episodeText: fallbackEpText });
      if (hasThuyetMinh)
        badges.push({ key: "thuyetminh-f", code: "TM", label: "Thuyết minh", episodeText: fallbackEpText });
      if (hasLongTieng)
        badges.push({ key: "longtieng-f", code: "LT", label: "Lồng tiếng", episodeText: fallbackEpText });

      if (badges.length === 0) {
        if (text.includes("trailer")) {
          badges.push({ key: "trailer", code: "Trailer", label: "Trailer", episodeText: null });
        } else {
          // Default to PĐ if we have no info yet
          badges.push({ key: "default-pd", code: "PĐ", label: "Phụ đề", episodeText: fallbackEpText });
        }
      }
    }

    return badges;
  }, [episodeList, episodeCurrentText, movieLang, movie.status, isFetched]);

  useEffect(() => {
    if (!imgRef.current || shouldLoad) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "900px", threshold: 0.01 }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [shouldLoad, slug]);

  const basePoster = movie.poster_url || movie.thumb_url;
  const posterSrc =
    shouldLoad || priority
      ? getOptimizedPoster(basePoster, priority ? 480 : 360) || fallbackPoster
      : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  const thumbSrc =
    getOptimizedPoster(movie.thumb_url || movie.poster_url, 640) ||
    fallbackLandscape;

  return (
    <div
      ref={cardRef}
      className="mc-wrapper group relative flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        to={`/movie/${movie.slug}`}
        state={{ movie }}
        className="relative flex flex-col"
      >
        <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-800 relative shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300">
          {/* Skeleton shimmer — visible until image is loaded */}
          {!loaded && (
            <div className="absolute inset-0 mc-img-skeleton" />
          )}
          <img
            ref={imgRef}
            src={posterSrc}
            alt={movie.name}
            className={`absolute h-full w-full object-cover transition-opacity duration-500 group-hover:scale-105 ${
              loaded ? "opacity-100 scale-100" : "opacity-0"
            }`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            {...(priority
              ? { fetchPriority: "high" }
              : { fetchPriority: "low" })}
            onLoad={() => setLoaded(true)}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = basePoster || fallbackPoster;
              setLoaded(true);
            }}
          />

          {audioBadges.length ? (
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2 justify-center z-10">
              {audioBadges.map((badge) => (
                <div
                  key={badge.key}
                  title={badge.label}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-bold uppercase shadow-md transition-transform duration-200 group-hover:-translate-y-[2px] whitespace-nowrap ${badge.code === "PĐ"
                      ? "bg-slate-600/90 text-white backdrop-blur-md"
                      : badge.code === "TM"
                        ? "bg-amber-500/90 text-slate-950 backdrop-blur-md"
                        : badge.code === "Trailer"
                          ? "bg-rose-500/90 text-white backdrop-blur-md"
                          : "bg-sky-500/90 text-white backdrop-blur-md"
                    }`}
                >
                  <span>
                    {badge.code}{badge.code !== "Trailer" && badge.episodeText ? `.${badge.episodeText}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </div>

        <div className="mt-4 flex flex-col items-center text-center px-1">
          <h3 className="text-[17px] font-semibold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
            {movie.name}
          </h3>
          <p className="text-[15px] font-medium text-slate-400 line-clamp-1 mt-1">
            {movie.origin_name || movie.name}
          </p>
        </div>
      </Link>

      {/* Hover Preview — overlays directly on the card, centered */}
      {hovered && (
        <HoverCard
          movie={movie}
          thumbSrc={thumbSrc}
          audioBadges={audioBadges}
          alignment={alignment}
        />
      )}
    </div>
  );
};

export default MovieCard;

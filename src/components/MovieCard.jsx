import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useEpisodeLabel } from "../hooks/useEpisodeLabel.js";
import { getEpisodes } from "../api/movies.js";
import { normalizeServerLabel } from "../utils/episodes.js";

const fallbackPoster =
  "https://placehold.co/600x900/0f172a/94a3b8?text=loading";

const getOptimizedPoster = (url, w = 360) => {
  if (!url) return url;
  try {
    const rawHost = new URL(url).hostname;
    // TMDB handled natively
    if (rawHost.includes("tmdb.org")) {
      return url.replace(/\/w(92|154|185|300|342|500|780|original)\//, `/w${w > 400 ? 500 : 342}/`);
    }
    // Sử dụng proxy wsrv.nl để nén thành WebP siêu nhẹ và tận dụng Cloudflare CDN toàn cầu
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&w=${w}&fit=cover&q=80`;
  } catch {
    return url;
  }
};

const MovieCard = ({ movie, priority = false }) => {
  const episodeLabel = useEpisodeLabel(movie);
  const imgRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const slug = movie?.slug;
  useEffect(() => {
    setShouldLoad(false);
    setLoaded(false);
  }, [slug]);

  const { data: episodeList = [] } = useQuery({
    queryKey: ["card-episodes", movie?.slug],
    queryFn: () => getEpisodes(movie.slug),
    enabled: shouldLoad && Boolean(movie?.slug),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const audioSummary = useMemo(() => {
    const summary = { vietsub: 0, thuyetMinh: 0, longTieng: 0 };
    (episodeList || []).forEach((ep) => {
      const label = normalizeServerLabel(ep?.server_name);
      if (label === "Vietsub") summary.vietsub += 1;
      else if (label === "Thuyết Minh") summary.thuyetMinh += 1;
      else if (label === "Lồng Tiếng") summary.longTieng += 1;
    });
    return summary;
  }, [episodeList]);

  const fallbackAudioLabel = movie?.lang
    ? normalizeServerLabel(movie.lang)
    : null;

  const audioBadges = useMemo(() => {
    const badges = [];
    const push = (key, code, label, count) => {
      badges.push({ key, code, label, count });
    };

    const { vietsub, thuyetMinh, longTieng } = audioSummary;
    if (vietsub) push("vietsub", "PD", "Phụ đề", vietsub);
    if (thuyetMinh) push("thuyetminh", "TM", "Thuyết minh", thuyetMinh);
    if (longTieng) push("longtieng", "LT", "Lồng tiếng", longTieng);

    if (!badges.length && fallbackAudioLabel) {
      if (fallbackAudioLabel === "Vietsub")
        push("vietsub-fallback", "PD", "Phụ đề", null);
      else if (fallbackAudioLabel === "Thuyết Minh")
        push("thuyetminh-fallback", "TM", "Thuyết minh", null);
      else if (fallbackAudioLabel === "Lồng Tiếng")
        push("longtieng-fallback", "LT", "Lồng tiếng", null);
    }

    return badges;
  }, [audioSummary, fallbackAudioLabel]);

  // Defer starting load until near viewport.
  // Deps include `slug` so we re-observe after a route change resets state.
  useEffect(() => {
    if (!imgRef.current || shouldLoad) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, shouldLoad]);

  const basePoster = movie.poster_url || movie.thumb_url;
  const posterSrc =
    shouldLoad
      ? getOptimizedPoster(basePoster, priority ? 480 : 360) || fallbackPoster
      : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // Transparent pixel placeholder

  return (
    <Link
      to={`/movie/${movie.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 shadow-lg transition hover:-translate-y-1 hover:shadow-emerald-500/20"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-slate-800 relative">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-slate-700/50" />
        )}
        <img
          ref={imgRef}
          src={posterSrc}
          alt={movie.name}
          className={`absolute h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          onLoad={() => {
            if (!loaded) setLoaded(true);
          }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            // Nếu wsrv proxy lỗi, tải ảnh gốc
            e.currentTarget.src = basePoster || fallbackPoster;
            if (!loaded) setLoaded(true);
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow">
          {episodeLabel}
        </span>
        {audioBadges.length ? (
          <div className="absolute inset-x-3 bottom-1 flex flex-wrap gap-2 justify-center">
            {audioBadges.map((badge) => (
              <div
                key={badge.key}
                title={badge.label}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] shadow-md shadow-black/30 transition-transform duration-200 group-hover:-translate-y-[2px] whitespace-nowrap ${
                  badge.code === "PD"
                    ? "bg-gray-800/95 text-white"
                    : badge.code === "TM"
                    ? "bg-amber-300/95 text-slate-950"
                    : "bg-sky-500/95 text-white"
                }`}
              >
                <span>{badge.code}</span>
                {badge.count !== null && badge.count !== undefined ? (
                  <span className="text-[10px] font-semibold tabular-nums opacity-90">
                    .{badge.count}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white line-clamp-2">
          {movie.name}
        </h3>
        <p className="text-xs text-slate-400">{movie.year || "N/A"}</p>
      </div>
    </Link>
  );
};

export default MovieCard;

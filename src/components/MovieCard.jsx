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

  const [apiReady, setApiReady] = useState(false);

  const slug = movie?.slug;
  useEffect(() => {
    // Reset state only if slug truly changes to avoid redundant flashes
    setShouldLoad(false);
    setLoaded(false);
    setApiReady(false);
  }, [slug]);

  // Trì hoãn việc gọi API lấy tập phim 800ms sau khi card lọt vào tầm mắt
  // Điều này giúp dành toàn bộ băng thông cho việc tải ảnh Poster trước
  useEffect(() => {
    if (shouldLoad || priority) {
      const timer = setTimeout(() => setApiReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [shouldLoad, priority]);

  const { data: episodeList = [] } = useQuery({
    queryKey: ["episodes", slug],
    queryFn: () => getEpisodes(slug),
    enabled: apiReady && !!slug,
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const audioBadges = useMemo(() => {
    const badges = [];

    // 1. Try to get highly accurate info from the full episode list first
    const serverMap = new Map();
    episodeList.forEach((ep) => {
      const label = normalizeServerLabel(ep.server_name);
      if (label) serverMap.set(label, true);
    });

    if (serverMap.has("Vietsub")) {
      badges.push({ key: "vietsub", code: "PD", label: "Phụ đề" });
    }
    if (serverMap.has("Thuyết Minh")) {
      badges.push({ key: "thuyetminh", code: "TM", label: "Thuyết minh" });
    }
    if (serverMap.has("Lồng Tiếng")) {
      badges.push({ key: "longtieng", code: "LT", label: "Lồng tiếng" });
    }

    // 2. Fallback to basic movie info if no episodes or no hits
    if (badges.length === 0) {
      const text = (movie?.episode_current || movie?.lang || "").toLowerCase();
      if (text.includes("vietsub") || text.includes("phụ đề")) {
        badges.push({ key: "vietsub-f", code: "PD", label: "Phụ đề" });
      }
      if (text.includes("thuyết minh")) {
        badges.push({ key: "thuyetminh-f", code: "TM", label: "Thuyết minh" });
      }
      if (text.includes("lồng tiếng")) {
        badges.push({ key: "longtieng-f", code: "LT", label: "Lồng tiếng" });
      }
    }

    return badges;
  }, [episodeList, movie?.episode_current, movie?.lang]);

  // Defer starting load until near viewport.
  useEffect(() => {
    if (!imgRef.current || shouldLoad) return undefined;

    // Tăng rootMargin lên 600px để ảnh tải sớm hơn hẳn trước khi người dùng cuộn tới
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px", threshold: 0.01 }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [slug, shouldLoad]);

  const basePoster = movie.poster_url || movie.thumb_url;
  const posterSrc =
    shouldLoad || priority
      ? getOptimizedPoster(basePoster, priority ? 480 : 360) || fallbackPoster
      : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  return (
    <Link
      to={`/movie/${movie.slug}`}
      state={{ movie }}
      className="group relative flex flex-col transition hover:-translate-y-1"
    >
      <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-800 relative shadow-lg group-hover:shadow-emerald-500/20 transition-all">
        {(!loaded && (shouldLoad || priority)) && (
          <div className="absolute inset-0 animate-pulse bg-slate-700/50" />
        )}
        <img
          ref={imgRef}
          src={posterSrc}
          alt={movie.name}
          className={`absolute h-full w-full object-cover transition duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"
            }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // Tăng mức độ ưu tiên tải cho các card quan trọng
          {...(priority ? { fetchPriority: "high" } : { fetchPriority: "low" })}
          onLoad={() => {
            setLoaded(true);
          }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = basePoster || fallbackPoster;
            setLoaded(true);
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow">
          {episodeLabel}
        </span>
        {audioBadges.length ? (
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2 justify-center z-10">
            {audioBadges.map((badge) => (
              <div
                key={badge.key}
                title={badge.label}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-bold uppercase shadow-md transition-transform duration-200 group-hover:-translate-y-[2px] whitespace-nowrap ${badge.code === "PD" || badge.code === "PĐ"
                    ? "bg-slate-600/90 text-white backdrop-blur-md"
                    : badge.code === "TM"
                      ? "bg-amber-500/90 text-slate-950 backdrop-blur-md"
                      : "bg-sky-500/90 text-white backdrop-blur-md"
                  }`}
              >
                <span>{badge.code}</span>
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
  );
};

export default MovieCard;

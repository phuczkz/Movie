import { useRef, useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEpisodes } from "../api/movies.js";
import { normalizeServerLabel, parseEpisodeNumber } from "../utils/episodes.js";

const fallbackPoster =
  "https://placehold.co/600x900/0f172a/94a3b8?text=loading";

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

const TrendingCard = ({ movie, index }) => {
  const imgRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
  }, [shouldLoad]);

  // Fetch episodes to accurately detect languages (PD, TM, LT)
  const { data: episodeList = [] } = useQuery({
    queryKey: ["card-episodes", movie?.slug],
    queryFn: () => getEpisodes(movie.slug),
    enabled: shouldLoad && Boolean(movie?.slug),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const basePoster = movie.poster_url || movie.thumb_url;
  const posterSrc = shouldLoad
    ? getOptimizedPoster(basePoster, 360) || fallbackPoster
    : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  const badges = useMemo(() => {
    const foundCodes = new Set();
    const result = [];

    // 1. Check from episode list (accurate)
    if (episodeList && episodeList.length > 0) {
      episodeList.forEach((ep) => {
        const label = normalizeServerLabel(ep?.server_name);
        if (label === "Thuyết Minh") foundCodes.add("TM");
        else if (label === "Lồng Tiếng") foundCodes.add("LT");
        else foundCodes.add("PĐ");
      });
    } else {
      // 2. Fallback to movie.lang if list not yet loaded or empty
      const raw = (movie.lang || "").toLowerCase();
      if (raw.includes("viet") || raw.includes("phu de")) foundCodes.add("PĐ");
      if (raw.includes("thuyet") || raw.includes("thuy minh"))
        foundCodes.add("TM");
      if (raw.includes("long") && raw.includes("tieng")) foundCodes.add("LT");
    }

    if (foundCodes.has("PĐ"))
      result.push({ code: "PĐ", bg: "bg-slate-800/90" });
    if (foundCodes.has("TM")) result.push({ code: "TM", bg: "bg-blue-600/90" });
    if (foundCodes.has("LT")) result.push({ code: "LT", bg: "bg-blue-600/90" });

    // Final fallback
    if (result.length === 0) result.push({ code: "PĐ", bg: "bg-slate-800/90" });
    return result;
  }, [episodeList, movie.lang]);

  const episodeText = (() => {
    const latestFromList = episodeList.reduce((max, ep) => {
      const n = parseEpisodeNumber(ep?.name || ep?.slug);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, -1);

    const epTotal = parseEpisodeNumber(movie?.episode_total);
    if (latestFromList >= 0) {
      if (Number.isFinite(epTotal) && epTotal > 0) {
        return `${Math.min(latestFromList, epTotal)}/${epTotal}`;
      }
      return `${latestFromList}`;
    }

    const raw = (movie?.episode_current || "")
      .replace(/hoàn tất\s*/gi, "")
      .trim();
    const parsedRaw = parseEpisodeNumber(raw);

    if (Number.isFinite(parsedRaw)) {
      if (Number.isFinite(epTotal) && epTotal > 0)
        return `${parsedRaw}/${epTotal}`;
      return `${parsedRaw}`;
    }

    return raw || "??";
  })();

  // 1. Slant UP to the right
  const polyUpStr =
    "0,14.5 0.5,12.5 1.5,11 3.5,10 6.5,9.3 93.5,0.7 96.5,1.3 98.5,2.5 99.5,4 100,8 100,95.5 99.5,97.5 98.5,98.8 96.5,99.6 93.5,100 6.5,100 3.5,99.6 1.5,98.8 0.5,97.5 0,95.5";
  // 2. Slant DOWN to the right (Reflected)
  const polyDownStr =
    "0,8 0.5,4 1.5,2.5 3.5,1.3 6.5,0.7 93.5,9.3 96.5,10 98.5,11 99.5,12.5 100,14.5 100,95.5 99.5,97.5 98.5,98.8 96.5,99.6 93.5,100 6.5,100 3.5,99.6 1.5,98.8 0.5,97.5 0,95.5";

  // Alternate based on index: Even (0, 2, 4...) slants UP, Odd (1, 3, 5...) slants DOWN.
  const polyStr = index % 2 === 0 ? polyUpStr : polyDownStr;

  const clipPathStyle = {
    clipPath: `polygon(${polyStr
      .split(" ")
      .map((c) => c.replace(",", "% ") + "%")
      .join(", ")})`,
  };

  return (
    <Link
      to={`/movie/${movie.slug}`}
      className="group relative flex flex-col min-w-[200px] sm:min-w-[240px] max-w-[240px] transition-all duration-300 hover:z-30 snap-start"
    >
      {/* Slanted Poster Container using EXACT custom polygon for all edges and rounded corners */}
      <div
        className="relative aspect-[2/3] w-full bg-slate-800 shadow-2xl transition-all duration-500 group-hover:brightness-110 group-hover:shadow-emerald-500/30"
        style={clipPathStyle}
      >
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-slate-700/50" />
        )}
        <img
          ref={imgRef}
          src={posterSrc}
          alt={movie.name}
          className={`absolute h-full w-full object-cover transition duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onLoad={() => setLoaded(true)}
        />

        {/* Custom Exact Border for Hover - Traces the polygon perfectly */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points={polyStr}
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

        {/* Badges Overlay - Bottom Center */}
        {badges.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex rounded-md overflow-hidden border border-white/5 shadow-2xl z-20">
            {badges.map((badge, idx) => (
              <div
                key={badge.code}
                className={`${
                  badge.bg
                } backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white uppercase whitespace-nowrap ${
                  idx < badges.length - 1 ? "border-r border-white/10" : ""
                }`}
              >
                {badge.code}.{episodeText}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        {/* Ranking Number */}
        <div className="flex-shrink-0">
          <span
            className="text-[80px] font-['Alfa_Slab_One'] text-[#ceb794] leading-none tracking-tighter inline-block"
            style={{
              WebkitTextStroke: "1.5px #000",
              textShadow:
                "1px 1px 0 #000, 2px 2px 0 #000, 3px 3px 0 #000, 4px 4px 0 #000, 5px 5px 0 #000, 6px 6px 0 #000, 7px 7px 0 #000",
              transform: "translateY(-4px)",
            }}
          >
            {index + 1}
          </span>
        </div>

        {/* Content Info */}
        <div className="flex flex-col min-w-0">
          <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors leading-tight">
            {movie.name}
          </h3>
          <p className="text-sm text-slate-400 font-medium line-clamp-1 mt-0.5">
            {movie.origin_name || movie.name}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default TrendingCard;

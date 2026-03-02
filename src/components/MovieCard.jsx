import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useEpisodeLabel } from "../hooks/useEpisodeLabel.js";

const fallbackPoster =
  "https://placehold.co/600x900/0f172a/94a3b8?text=loading";

// Cap concurrent image fetches to avoid long pending queues
const MAX_INFLIGHT_IMAGES = 8;
let inflight = 0;
const waiters = [];

const acquireSlot = (cb) => {
  if (inflight < MAX_INFLIGHT_IMAGES) {
    inflight += 1;
    cb();
    return;
  }
  waiters.push(cb);
};

const releaseSlot = () => {
  inflight = Math.max(0, inflight - 1);
  const next = waiters.shift();
  if (next) {
    inflight += 1;
    next();
  }
};

const withWidthParam = (url, w = 360) => {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(w));
    return u.toString();
  } catch {
    return url;
  }
};

const MovieCard = ({ movie }) => {
  const episodeLabel = useEpisodeLabel(movie);
  const imgRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [canLoad, setCanLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Defer starting load until near viewport
  useEffect(() => {
    if (!imgRef.current) return;
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
  }, []);

  // Acquire slot to cap concurrent fetches
  useEffect(() => {
    if (!shouldLoad || canLoad) return undefined;
    let cancelled = false;
    acquireSlot(() => {
      if (!cancelled) setCanLoad(true);
    });
    return () => {
      cancelled = true;
      if (canLoad && !loaded) releaseSlot();
    };
  }, [shouldLoad, canLoad, loaded]);

  const basePoster = movie.poster_url;
  const posterSrc =
    shouldLoad && canLoad
      ? withWidthParam(basePoster, 360) || fallbackPoster
      : undefined;

  const posterSrcSet =
    shouldLoad && canLoad && basePoster
      ? [
          `${withWidthParam(basePoster, 240)} 240w`,
          `${withWidthParam(basePoster, 360)} 360w`,
          `${withWidthParam(basePoster, 480)} 480w`,
        ].join(", ")
      : undefined;

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
          srcSet={posterSrcSet}
          alt={movie.name}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          sizes="(min-width: 1280px) 220px, (min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
          onLoad={() => {
            setLoaded(true);
            releaseSlot();
          }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackPoster;
            setLoaded(true);
            releaseSlot();
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow">
          {episodeLabel}
        </span>
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

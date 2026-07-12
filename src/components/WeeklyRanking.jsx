import { Link } from "react-router-dom";
import { getOptimizedPoster } from '@/utils/image-helper.js';

const fallbackPoster =
  "https://placehold.co/120x180/0f172a/94a3b8?text=N/A";

/**
 * WeeklyRanking — Modeled directly on MotChill's "Phim Hot Trong Tuần"
 *
 * A numbered ranking list showing top movies with:
 * - Large rank number (#1 - #10)
 * - Small poster thumbnail
 * - Movie name + origin name
 * - Episode status + quality badge
 *
 * Height is controlled by the parent container. If items exceed
 * the available height, the list scrolls vertically.
 */
const WeeklyRanking = ({ movies = [], title = "Phim hot trong tuần" }) => {
  if (!movies.length) return null;

  const displayMovies = movies.slice(0, 10);

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between flex-shrink-0 pb-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
          Tuần này
        </span>
      </div>

      <div className="flex-1 min-h-0 max-h-[420px] sm:max-h-[500px] xl:max-h-none rounded-xl bg-slate-900/40 border border-white/5 overflow-y-auto custom-scrollbar">
        <div className="divide-y divide-white/5">
          {displayMovies.map((movie, i) => {
            const posterSrc =
              getOptimizedPoster(
                movie.poster_url || movie.thumb_url,
                100,
                70
              ) || fallbackPoster;

            const episodeText = (() => {
              const raw = (movie.episode_current || "").toLowerCase();
              if (raw.includes("full") || raw.includes("hoàn tất")) return "Full";
              if (raw.includes("tập")) return movie.episode_current;
              return movie.episode_current || "";
            })();

            const rankColor =
              i === 0
                ? "text-amber-400"
                : i === 1
                  ? "text-slate-300"
                  : i === 2
                    ? "text-amber-700"
                    : "text-slate-500";

            return (
              <Link
                key={movie.slug}
                to={`/movie/${movie.slug}`}
                state={{ movie }}
                className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-white/5 transition-colors group"
              >
                {/* Rank number */}
                <span
                  className={`flex-shrink-0 w-7 text-center text-lg font-black tabular-nums ${rankColor}`}
                >
                  {i + 1}
                </span>

                {/* Small poster */}
                <div className="flex-shrink-0 w-10 h-[60px] sm:w-12 sm:h-[72px] rounded overflow-hidden bg-slate-800">
                  <img
                    src={posterSrc}
                    alt={movie.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallbackPoster;
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                    {movie.name}
                  </h3>
                  {movie.origin_name && movie.origin_name !== movie.name && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {movie.origin_name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {movie.year && (
                      <span className="text-[11px] text-slate-500">
                        {movie.year}
                      </span>
                    )}
                    {episodeText && (
                      <span className="text-[11px] text-emerald-500 font-medium">
                        {episodeText}
                      </span>
                    )}
                    {/* {movie.quality && (
                      <span className="text-[10px] font-bold text-amber-500 uppercase">
                        {movie.quality}
                      </span>
                    )} */}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WeeklyRanking;

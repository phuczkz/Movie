import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { searchMovies } from "../api/movies";
import { Play, Star } from "lucide-react";
import MovieCard from "./MovieCard";

const RelatedMovies = ({ movie, variant = "list" }) => {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasLoaded) {
          fetchRelated();
          setHasLoaded(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasLoaded, movie?.slug]);

  const fetchRelated = async () => {
    if (!movie) return;
    setLoading(true);
    try {
      let results = [];
      const movieCountry = Array.isArray(movie.country)
        ? movie.country[0]
        : movie.country;

      const countrySlug = movieCountry?.slug || movieCountry;

      // 1. Try search by partial name for sequels/seasons
      const nameForSearch = movie.name || "";
      const baseName = nameForSearch.split(/ phần | season | ss\d+ | p\d+ /i)[0].trim();

      if (baseName && (baseName !== nameForSearch || nameForSearch.match(/ \d+$/))) {
        const searchRes = await searchMovies(baseName);
        results = searchRes.filter(m => m.slug !== movie.slug);
      }

      // 2. Fetch by country if not enough results
      if (results.length < 12 && countrySlug) {
        const { getCountry } = await import("../api/movies");
        const countryRes = await getCountry(countrySlug);
        const filteredCountry = countryRes.filter(m =>
          m.slug !== movie.slug &&
          !results.find(r => r.slug === m.slug)
        );
        results = [...results, ...filteredCountry];
      }

      setRelated(results.slice(0, variant === "grid" ? 18 : 15));
    } catch (error) {
      console.error("Failed to fetch related movies:", error);
    } finally {
      setLoading(false);
    }
  };

  if (variant === "grid") {
    return (
      <div ref={containerRef} className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-emerald-500 rounded-full" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Có thể bạn cũng thích</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : related.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {related.map((m) => (
              <div key={m.slug} className="group relative">
                <Link to={`/movie/${m.slug}`} className="block">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 bg-slate-900 shadow-lg group-hover:shadow-emerald-500/10 transition-all duration-500 group-hover:-translate-y-1">
                    <img
                      src={m.poster_url}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                        <Play className="w-6 h-6 fill-current" />
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {m.year && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                          {m.year}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-[10px] font-bold text-white shadow-lg">
                        {m.episode_current || "Full"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 px-1">
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {m.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                      {m.origin_name || m.name}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : hasLoaded ? (
          <div className="py-12 text-center text-slate-500 text-sm italic border border-dashed border-white/10 rounded-3xl">
            Không tìm thấy phim liên quan tương đương
          </div>
        ) : (
          <div className="h-48" /> // Placeholder while waiting for observer
        )}
      </div>
    );
  }

  if (variant === "scroll") {
    return (
      <div ref={containerRef} className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-300">
            Phim liên quan
          </p>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar custom-scrollbar">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="min-w-[170px] sm:min-w-[200px] aspect-[2/3] bg-white/5 animate-pulse rounded-2xl" />
            ))
          ) : related.length ? (
            related.map((m) => (
              <div
                key={m.slug}
                className="min-w-[170px] sm:min-w-[200px] snap-start"
              >
                <MovieCard movie={m} suppressHover={true} />
              </div>
            ))
          ) : hasLoaded ? (
            <div className="text-slate-500 text-sm italic">Không tìm thấy phim liên quan</div>
          ) : null}
        </div>
      </div>
    );
  }

  // Default "list" variant
  return (
    <div ref={containerRef} className="flex flex-col h-[580px] rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 group/related-section">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-xl font-semibold text-white tracking-wide">Phim liên quan</h2>
      </div>

      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-16 h-24 bg-white/5 rounded-lg" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : related.length ? (
            related.map((m) => (
              <Link
                key={m.slug}
                to={`/movie/${m.slug}`}
                className="flex gap-3 group/item hover:bg-white/5 p-2 rounded-xl transition-colors"
              >
                <div className="relative w-16 h-24 shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-md">
                  <img
                    src={m.poster_url}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100 group-hover/item:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {m.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {m.year || "N/A"}
                    </span>
                    <span className="truncate opacity-80">{m.episode_current || "Full"}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : hasLoaded ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
              Không tìm thấy phim liên quan
            </div>
          ) : null}
        </div>
        {/* Bottom fade indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none opacity-100 group-hover/related-section:opacity-0 transition-opacity" />
      </div>
    </div>
  );
};

export default RelatedMovies;

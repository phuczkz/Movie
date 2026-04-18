import React, { memo } from "react";
import { ChevronDown } from "lucide-react";
import Rating from "../Rating";

const getHiRes = (url) => {
  if (!url || typeof url !== "string") return url;
  return url.replace(/\/w(92|154|185|300|342|500|780)\//, "/w1280/");
};

const getOptimizedImage = (url, w = 1280) => {
  if (!url) return url;
  try {
    const rawHost = new URL(url).hostname;
    if (rawHost.includes("tmdb.org")) return url;
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&w=${w}&fit=cover&q=75`;
  } catch {
    return url;
  }
};

const MovieHero = memo(({ 
  movie, 
  passedMovie, 
  heroImage, 
  isTrailer, 
  isMovie, 
  latestEpisodeNumber, 
  epTotal,
  slug
}) => {
  return (
    <>
      {heroImage ? (
        <div className="relative left-1/2 -translate-x-1/2 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] w-screen max-w-none pointer-events-none">
          <div className="aspect-[16/10] md:aspect-[2/1] xl:aspect-[21/9] w-full invisible pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-[125%] bg-[#0b0b15] z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full">
              <img
                src={getOptimizedImage(heroImage, 1200)}
                alt={movie?.name || "Banner"}
                className="w-full h-full object-cover object-[50%_15%]"
                fetchPriority="high"
              />
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#0b0b15] via-[#0b0b15]/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0b0b15] via-[#0b0b15]/80 to-transparent" />
            </div>
          </div>
          <div
            className="absolute top-full bottom-[-40%] left-0 w-full bg-slate-950/80 backdrop-blur-[8px] z-0 pointer-events-none"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
            }}
          />
        </div>
      ) : null}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-end -mt-24 sm:-mt-32 md:-mt-40 lg:-mt-52 xl:-mt-64 relative z-20">
          <div className="mx-auto lg:mx-0 w-32 sm:w-40 md:w-44 lg:w-64 shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border-0 lg:border-4 lg:border-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.9)] bg-slate-900 aspect-[2/3] ring-1 ring-white/10 relative z-30 transition-transform duration-500 hover:scale-[1.02]">
            <img
              src={getOptimizedImage(passedMovie?.poster_url || movie?.poster_url, 500)}
              alt={movie?.name || passedMovie?.name}
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
          </div>

          <div className="space-y-4 flex-1 w-full lg:pt-4 drop-shadow-2xl flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              {movie?.name || passedMovie?.name || "Đang tải tên phim..."}
            </h1>
            {movie?.origin_name ? (
              <>
                <p className="lg:hidden text-slate-200/80 text-sm font-medium drop-shadow-md">
                  {movie.origin_name}
                </p>
                <p className="hidden lg:block text-slate-100/90 text-sm font-medium drop-shadow-md">
                  Tên gốc: {movie.origin_name}
                </p>
              </>
            ) : null}

            <Rating movieSlug={slug} apiRating={movie?.rating} />

            {/* Meta Tags - Desktop */}
            <div className="hidden lg:flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white font-medium drop-shadow-md">
              {movie?.year && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.year}
                </span>
              )}
              <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                {isMovie
                  ? "Full"
                  : latestEpisodeNumber >= 0
                  ? `Tập ${latestEpisodeNumber}${epTotal ? `/${epTotal}` : ""}`
                  : movie?.episode_current
                  ? epTotal && !movie.episode_current.includes("/")
                    ? `${movie.episode_current}/${epTotal}`
                    : movie.episode_current
                  : isTrailer
                  ? "Trailer"
                  : "HD"}
              </span>
              {movie?.quality && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.quality}
                </span>
              )}
              {movie?.lang && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.lang}
                </span>
              )}
              {movie?.time && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.time}
                </span>
              )}
              {movie?.country?.length > 0 && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.country.map((c) => c.name || c).join(", ")}
                </span>
              )}
              {movie?.category?.length > 0 && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.category.map((c) => c.name || c).join(", ")}
                </span>
              )}
            </div>

            {/* Meta Tags - Mobile (Details dropdown) */}
            <details className="lg:hidden w-full">
              <summary className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-amber-200 cursor-pointer select-none">
                Thông tin phim
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-white font-medium">
                {movie?.year && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.year}
                  </span>
                )}
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                   {isMovie ? "Full" : latestEpisodeNumber >= 0 ? `Tập ${latestEpisodeNumber}` : isTrailer ? "Trailer" : "HD"}
                </span>
                {/* ... other mobile meta tags could go here if needed ... */}
                <div className="mt-4 rounded-3xl border border-white/5 bg-slate-900/60 p-5 space-y-3 text-left">
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-300">Giới thiệu</p>
                  <div className="text-slate-300 leading-relaxed text-[15px]" dangerouslySetInnerHTML={{ __html: movie?.content || "Chưa có mô tả." }} />
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </>
  );
});

export default MovieHero;

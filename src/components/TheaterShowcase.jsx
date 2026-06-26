import { Link } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { getOptimizedPoster } from "../utils/image-helper.js";
import { isMobile } from "../utils/responsive.js";

const fallbackThumb =
  "https://placehold.co/1280x720/0f172a/94a3b8?text=No+Image";

/**
 * TheaterShowcase — Inspired by MotChill's "Đề Cử" section
 * and PhimMoiChill's hero-style horizontal card row.
 *
 * Shows cinema movies as large landscape cards in a horizontal
 * scroll row with backdrop images, title overlay, genre chips,
 * and a play button — the way real Vietnamese movie sites do it.
 */
const TheaterCard = ({ movie, priority = false }) => {
  const [loaded, setLoaded] = useState(false);
  const isMobileSize = isMobile();

  const thumbSrc =
    getOptimizedPoster(
      movie.thumb_url || movie.poster_url,
      isMobileSize ? 480 : 720,
      isMobileSize ? 70 : 80
    ) || fallbackThumb;

  const categories = (movie.category || [])
    .slice(0, 3)
    .flatMap((c) => {
      const name = typeof c === "string" ? c : c?.name || "";
      return name ? [name] : [];
    });

  const qualityLabel = movie?.quality?.toUpperCase() || "HD";

  return (
    <Link
      to={`/movie/${movie.slug}`}
      state={{ movie }}
      className="group relative flex-shrink-0 w-[85vw] sm:w-[400px] lg:w-[440px] snap-start"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-800">
        {/* Shimmer */}
        {!loaded && (
          <div className="absolute inset-0 mc-img-skeleton" />
        )}
        <img
          src={thumbSrc}
          alt={movie.name}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackThumb;
            setLoaded(true);
          }}
        />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

        {/* Quality badge - top right */}
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-block rounded bg-amber-500/90 px-2 py-0.5 text-[11px] font-bold text-black uppercase backdrop-blur-sm">
            {qualityLabel}
          </span>
        </div>

        {/* Play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>

        {/* Content overlay - bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1 leading-tight">
            {movie.name}
          </h3>
          {movie.origin_name && movie.origin_name !== movie.name && (
            <p className="text-sm text-slate-300 line-clamp-1 mt-0.5">
              {movie.origin_name}
            </p>
          )}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-block rounded bg-white/10 px-2 py-0.5 text-[11px] text-slate-300 backdrop-blur-sm"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const TheaterShowcase = ({ movies = [], loading = false }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [movies]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Phim chiếu rạp</h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="flex-shrink-0 w-[85vw] sm:w-[400px] lg:w-[440px] aspect-video rounded-xl bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!movies.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Phim chiếu rạp</h2>
        <Link
          to="/category/phim-chieu-rap"
          className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          Xem tất cả
        </Link>
      </div>

      {/* Scroll container */}
      <div className="relative group/theater">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2"
        >
          {movies.map((movie, i) => (
            <TheaterCard key={movie.slug} movie={movie} priority={i < 2} />
          ))}
        </div>

        {/* Nav arrows - desktop only */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white backdrop-blur-sm opacity-0 group-hover/theater:opacity-100 transition-opacity hover:bg-black/80"
            aria-label="Cuộn trái"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white backdrop-blur-sm opacity-0 group-hover/theater:opacity-100 transition-opacity hover:bg-black/80"
            aria-label="Cuộn phải"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Edge fade - right */}
        <div className="absolute top-0 right-0 bottom-2 w-12 bg-gradient-to-l from-[#0b0b15] to-transparent pointer-events-none hidden sm:block" />
      </div>
    </section>
  );
};

export default TheaterShowcase;

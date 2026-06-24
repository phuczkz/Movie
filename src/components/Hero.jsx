import { useEffect, useRef, useState } from "react";
import { Info, Play } from "lucide-react";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { useEpisodeLabel } from "../hooks/useEpisodeLabel";
import { useMovieLogos } from "../hooks/useMovieLogo";
import { isMobile } from "../utils/responsive.js";
import { toOptimizedHeroImage } from "../utils/image-helper.js";

const withWidthParam = (url, w = 640) => {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(w));
    return u.toString();
  } catch {
    return url;
  }
};

const EMPTY_MOVIES = [];

const Hero = ({ movie, movies = EMPTY_MOVIES }) => {
  const movieList = Array.isArray(movies) ? movies.filter(Boolean) : [];
  const slides = movieList.length ? movieList : movie ? [movie] : [];
  const slideCount = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const isHoverDevice = useRef(
    typeof window !== "undefined" ? window.matchMedia("(hover: hover)").matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    const handler = (e) => { isHoverDevice.current = e.matches; };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const safeIndex = slideCount ? Math.min(activeIndex, slideCount - 1) : 0;
  const activeMovie = slides[safeIndex] || slides[0];
  const episodeLabel = useEpisodeLabel(activeMovie);
  const { logoMap } = useMovieLogos(slides);
  const activeLogo = logoMap.get(activeMovie?.slug) || null;

  useEffect(() => {
    if (slideCount <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, 6500);
    return () => clearInterval(timer);
  }, [slideCount]);

  if (!activeMovie) {
    return (
      <section className="relative isolate w-screen max-w-none left-1/2 -translate-x-1/2 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] overflow-hidden rounded-none bg-slate-900/40 h-[52vh] sm:h-[56vh] md:h-[60vh] lg:h-[78vh] xl:h-[82vh] 2xl:h-[85vh] min-h-[400px] sm:min-h-[450px] md:min-h-[500px] lg:min-h-[700px] max-h-[500px] sm:max-h-[580px] md:max-h-[650px] lg:max-h-[920px] xl:max-h-[1050px] 2xl:max-h-[1200px] animate-pulse">
        <div className="absolute inset-0 bg-slate-800/50" />
        <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-14 md:px-10 md:pb-24 lg:px-16 lg:pb-12 gap-6">
          <div className="h-12 w-1/3 bg-slate-700/50 rounded-lg" />
          <div className="h-6 w-1/4 bg-slate-700/30 rounded-lg" />
          <div className="flex gap-4">
             <div className="h-12 w-32 bg-slate-700/50 rounded-full" />
             <div className="h-12 w-32 bg-slate-700/30 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  // Yêu cầu: mọi CTA từ hero dẫn qua trang chi tiết trước khi xem
  const primaryLink = `/movie/${activeMovie.slug}`;
  const secondaryLink = `/watch/${activeMovie.slug}`;
  const primaryLabel = "Xem Ngay";

  // const categories = normalizeList(activeMovie.category);
  // const countries = normalizeList(activeMovie.country);
  const rawBackground =
    activeMovie.backdrop_url ||
    activeMovie.thumb_url ||
    activeMovie.poster_url ||
    "https://placehold.co/1600x900";

  // Inline TMDB size helper specific to Hero (needs w780, w1280, original variants)
  const tmdbResize = (url, size) => {
    if (!url || typeof url !== "string") return url;
    try {
      if (!new URL(url).hostname.includes("image.tmdb.org")) return url;
    } catch { return url; }
    return url.replace(/\/(w\d+|original)\//, `/${size}/`);
  };

  // Avoid noticeable blur from upscaling: use a larger TMDB source for the hero backdrop.
  const background = tmdbResize(rawBackground, "w1280") || rawBackground;

  const isTmdb = background.includes("image.tmdb.org");
  const isMobileSize = isMobile();
  const qVal = isMobileSize ? 70 : 85;

  const background640 = isTmdb ? tmdbResize(background, "w780") : toOptimizedHeroImage(background, 640, qVal);
  const background1280 = isTmdb ? background : toOptimizedHeroImage(background, 1280, qVal);
  const background1920 = isTmdb ? tmdbResize(background, "original") : toOptimizedHeroImage(background, 1920, qVal);
  const background2560 = background1920;
  const background3840 = background1920;
  // const ratingValue =
  //   typeof activeMovie.rating === "number"
  //     ? activeMovie.rating
  //     : typeof activeMovie.vote_average === "number"
  //       ? activeMovie.vote_average
  //       : undefined;
  // const rating =
  //   typeof ratingValue === "number" ? ratingValue.toFixed(1) : undefined;

  const partMatch = activeMovie?.name?.match(/(Phần\s+\d+|Part\s+\d+|Mùa\s+\d+|Season\s+\d+)/i);
  const partString = partMatch ? partMatch[0] : null;

  return (
    <LazyMotion features={domAnimation}>
    <section
      className="relative isolate w-screen max-w-none left-1/2 -translate-x-1/2 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] overflow-hidden rounded-none bg-slate-950/80 shadow-[0_40px_140px_-70px_rgba(0,0,0,0.95)] h-[52vh] sm:h-[56vh] md:h-[60vh] lg:h-[78vh] xl:h-[82vh] 2xl:h-[85vh] min-h-[400px] sm:min-h-[450px] md:min-h-[500px] lg:min-h-[700px] max-h-[500px] sm:max-h-[580px] md:max-h-[650px] lg:max-h-[920px] xl:max-h-[1050px] 2xl:max-h-[1200px]"
    >
      <div className="absolute inset-0">
        <AnimatePresence mode="popLayout">
          <m.img
            key={activeMovie?.slug}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            src={isMobileSize ? background640 : background1280}
            srcSet={`${background640} 640w, ${background1280} 1280w, ${background1920} 1920w, ${background2560} 2560w, ${background3840} 3840w`}
            sizes="100vw"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top brightness-105 contrast-[1.08]"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            aria-hidden="true"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = background;
              e.currentTarget.srcset = "";
            }}
          />
        </AnimatePresence>
        {/* Lớp phủ mỏng để dịu mắt, làm nổi bật thông tin */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/35 to-slate-950/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_60%,rgba(244,114,182,0.15),transparent_45%),radial-gradient(circle_at_78%_20%,rgba(52,211,153,0.15),transparent_42%)] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end items-center md:items-start text-center md:text-left gap-6 md:gap-7 px-4 pb-14 pt-12 sm:pb-16 md:px-10 md:pb-24 lg:px-16 lg:pb-12">
        <div className="max-w-3xl space-y-3 md:space-y-6">
          <AnimatePresence mode="wait">
            <m.div
              key={activeMovie?.slug}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-3 md:space-y-6"
            >
              <div className="gap-1.5 md:gap-2 flex flex-col items-center md:items-start w-full min-h-[40px] sm:min-h-[50px] md:min-h-[60px] lg:min-h-[80px]">
                {activeLogo ? (
                  <img
                    src={activeLogo}
                    alt={activeMovie.name}
                    className="mx-auto md:mx-0 max-h-[90px] sm:max-h-[100px] md:max-h-[120px] lg:max-h-[140px] 2xl:max-h-[180px] w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,1)] filter brightness-110 contrast-110"
                    draggable={false}
                    fetchPriority="high"
                    decoding="async"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-semibold leading-tight text-white drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)] line-clamp-2">
                    {activeMovie.name}
                  </h1>
                )}
                {activeMovie.origin_name && (
                  <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-white/80 drop-shadow-md text-center md:text-left">
                    {activeMovie.origin_name}
                  </h2>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-[11px] sm:text-[12px] md:text-[14px] font-medium text-white">
                {activeMovie.year ? (
                  <span className="rounded-md border border-white bg-transparent px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold shadow-black/50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-[2px]">
                    {activeMovie.year}
                  </span>
                ) : null}
                {partString ? (
                  <span className="rounded-md border border-white bg-transparent px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold shadow-black/50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-[2px]">
                    {partString}
                  </span>
                ) : null}
                {episodeLabel ? (
                  <span className="rounded-md border border-white bg-transparent px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold shadow-black/50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-[2px]">
                    {episodeLabel}
                  </span>
                ) : null}
                {activeMovie.time ? (
                  <span className="rounded-md border border-white bg-transparent px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold shadow-black/50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] backdrop-blur-[2px]">
                    {activeMovie.time}
                  </span>
                ) : null}
              </div>
            </m.div>
          </AnimatePresence>

              <div className="hidden md:flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                <Link
                  to={secondaryLink}
                  className="group hidden md:inline-flex items-center gap-2.5 sm:gap-3 rounded-full bg-[rgb(16,185,129)] px-4 sm:px-5 md:px-6 py-2 md:py-3 text-[12px] sm:text-[13px] md:text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-14px_rgba(16,185,129,0.7)] transition hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(16,185,129)]/80"
                >
                  <span className="flex size-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-white/30 text-slate-950/90 shadow-inner shadow-[rgba(16,185,129,0.4)] transition group-hover:scale-105">
                    <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" fill="currentColor" />
                  </span>
                  {primaryLabel}
                </Link>

                <Link
                  to={primaryLink}
                  state={{ movie: activeMovie }}
                  className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-[1px] hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Info className="size-4" />
                  Thông tin
                </Link>
              </div>
            </div>
          </div>

        {/* Lớp phủ click cho mobile */}
        <Link
          to={primaryLink}
          state={{ movie: activeMovie }}
          className="absolute inset-0 z-[5] md:hidden"
          aria-label={`Xem chi tiết ${activeMovie.name}`}
        />

        {slides.length > 1 ? (
          <div className="absolute z-20 left-1/2 -translate-x-1/2 bottom-3 md:bottom-4 flex items-center gap-1.5 md:gap-2 rounded-2xl p-2 lg:right-3 lg:left-auto lg:translate-x-0 lg:bottom-5">
            {slides.slice(0, 6).map((item, idx) => {
              const isActive = idx === safeIndex;
              const thumbSource =
                item.backdrop_url ||
                item.banner ||
                (item.thumb_url !== item.poster_url ? item.thumb_url : null) ||
                item.thumb_url ||
                item.poster_url ||
                "https://placehold.co/1600x900/0f172a/94a3b8?text=No+Image";
              const hasLandscape = Boolean(
                item.backdrop_url ||
                item.banner ||
                item.thumb_url !== item.poster_url
              );
              const fitClass = hasLandscape ? "object-cover" : "object-contain";
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`group relative transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(16,185,129)]/80 ${isActive
                    ? "w-4 h-1.5 bg-[rgb(16,185,129)] lg:w-32 lg:h-auto lg:aspect-video lg:bg-transparent lg:border-[rgb(16,185,129)]/80 lg:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.65)]"
                    : "w-1.5 h-1.5 bg-white/25 hover:bg-white/40 lg:w-32 lg:h-auto lg:aspect-video lg:bg-transparent lg:border-white/15 lg:hover:border-white/25"
                    } rounded-full lg:rounded-lg lg:border overflow-hidden`}
                  aria-label={`Chọn ${item.name}`}
                >
                  <div className="hidden lg:block absolute inset-0">
                    <img
                      src={withWidthParam(thumbSource, 320) || thumbSource}
                      alt={item.name}
                      className={`h-full w-full ${fitClass} transition duration-500 group-hover:scale-105`}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                    {isActive ? (
                      <span
                        className="absolute inset-0 ring-2 ring-[rgb(16,185,129)]/90"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
    </LazyMotion>
  );
};

export default Hero;

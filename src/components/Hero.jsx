import { useEffect, useState } from "react";
import { Info, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEpisodeLabel } from "../hooks/useEpisodeLabel";

const normalizeList = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter(Boolean);
};

const normalizeTmdbImageSize = (url, size = "w780") => {
  if (!url || typeof url !== "string") return url;
  // Only rewrite TMDB image URLs. Keep other CDNs as-is.
  try {
    const host = new URL(url).hostname;
    if (!host.includes("image.tmdb.org")) return url;
  } catch {
    return url;
  }
  return url.replace(/\/(w\d+|original)\//, `/${size}/`);
};

const toWsrv = (url, w = 640, q = 85) => {
  if (!url) return url;
  try {
    const parsed = new URL(url);

    // If already proxied through wsrv.nl, just update params.
    if (parsed.hostname === "wsrv.nl") {
      parsed.searchParams.set("w", String(w));
      parsed.searchParams.set("output", "webp");
      parsed.searchParams.set("q", String(q));
      return parsed.toString();
    }

    return `https://wsrv.nl/?url=${encodeURIComponent(
      url
    )}&w=${w}&output=webp&q=${q}`;
  } catch {
    return url;
  }
};

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

const Hero = ({ movie, movies = [] }) => {
  const movieList = Array.isArray(movies) ? movies.filter(Boolean) : [];
  const slides = movieList.length ? movieList : movie ? [movie] : [];
  const slideCount = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHoverDevice, setIsHoverDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    setIsHoverDevice(mediaQuery.matches);
    const handler = (e) => setIsHoverDevice(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const safeIndex = slideCount ? Math.min(activeIndex, slideCount - 1) : 0;
  const activeMovie = slides[safeIndex] || slides[0];
  const episodeLabel = useEpisodeLabel(activeMovie);

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, 6500);
    return () => clearInterval(timer);
  }, [slideCount, isPaused]);

  if (!activeMovie) return null;

  // Yêu cầu: mọi CTA từ hero dẫn qua trang chi tiết trước khi xem
  const primaryLink = `/movie/${activeMovie.slug}`;
  const secondaryLink = `/watch/${activeMovie.slug}`;
  const primaryLabel = "Xem Ngay";

  const categories = normalizeList(activeMovie.category);
  const countries = normalizeList(activeMovie.country);
  const rawBackground =
    activeMovie.backdrop_url ||
    activeMovie.thumb_url ||
    activeMovie.poster_url ||
    "https://placehold.co/1600x900";
  // Avoid noticeable blur from upscaling: use a larger TMDB source for the hero backdrop.
  // wsrv still delivers a properly sized WebP for each viewport.
  const background =
    normalizeTmdbImageSize(rawBackground, "w1280") || rawBackground;
  const background640 = toWsrv(background, 640);
  const background1280 = toWsrv(background, 1280);
  const background1920 = toWsrv(background, 1920);
  const background2560 = toWsrv(background, 2560);
  const background3840 = toWsrv(background, 3840);
  const ratingValue =
    typeof activeMovie.rating === "number"
      ? activeMovie.rating
      : typeof activeMovie.vote_average === "number"
        ? activeMovie.vote_average
        : undefined;
  const rating =
    typeof ratingValue === "number" ? ratingValue.toFixed(1) : undefined;

  return (
    <section
      className="relative isolate w-screen max-w-none left-1/2 -translate-x-1/2 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] overflow-hidden rounded-none md:rounded-[28px] bg-slate-950/80 shadow-[0_40px_140px_-70px_rgba(0,0,0,0.95)] h-[52vh] sm:h-[56vh] md:h-[60vh] lg:h-[78vh] xl:h-[82vh] 2xl:h-[85vh] min-h-[400px] sm:min-h-[450px] md:min-h-[500px] lg:min-h-[700px] max-h-[500px] sm:max-h-[580px] md:max-h-[650px] lg:max-h-[920px] xl:max-h-[1050px] 2xl:max-h-[1200px]"
      onMouseEnter={() => isHoverDevice && setIsPaused(true)}
      onMouseLeave={() => isHoverDevice && setIsPaused(false)}
    >
      <div className="absolute inset-0">
        {/* Backdrop chính – dùng <img> để kiểm soát object-position trên mobile */}
        {/* Backdrop chính – dùng <img> với srcSet để tự động tối ưu độ phân giải và CSS để tránh zoom */}
        <img
          src={background1280}
          srcSet={`${background640} 640w, ${background1280} 1280w, ${background1920} 1920w, ${background2560} 2560w, ${background3840} 3840w`}
          sizes="100vw"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top brightness-105 contrast-[1.08] transition-opacity duration-700 ease-out"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          aria-hidden="true"
        />
        {/* Lớp phủ mỏng để dịu mắt, làm nổi bật thông tin */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/35 to-slate-950/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_60%,rgba(244,114,182,0.15),transparent_45%),radial-gradient(circle_at_78%_20%,rgba(52,211,153,0.15),transparent_42%)] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end items-center md:items-start text-center md:text-left gap-6 md:gap-7 px-4 pb-16 pt-12 sm:pb-20 md:px-10 md:pb-24 lg:px-16 lg:pb-12">
        <div className="max-w-3xl space-y-5 md:space-y-6">

          <div className="space-y-1.5 md:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl min-[2000px]:text-9xl font-black leading-tight text-white drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)]">
              {activeMovie.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-[11px] sm:text-[12px] md:text-[13px] font-semibold text-white/90">
            {activeMovie.year ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 sm:px-3.5 sm:py-1.5 shadow-lg shadow-black/20">
                {activeMovie.year}
              </span>
            ) : null}
            {episodeLabel ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 sm:px-3.5 sm:py-1.5 shadow-lg shadow-black/20">
                {episodeLabel}
              </span>
            ) : null}
            {activeMovie.time ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 sm:px-3.5 sm:py-1.5 shadow-lg shadow-black/20">
                {activeMovie.time}
              </span>
            ) : null}
          </div>


          <div className="hidden sm:flex flex-wrap gap-3 text-sm text-slate-200">
            {countries.length ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 shadow-black/25 shadow-lg">
                Quốc gia
                <span className="text-white/80">{countries.join(", ")}</span>
              </span>
            ) : null}
            {categories.length ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 shadow-black/25 shadow-lg">
                Thể loại
                <span className="text-white/80">{categories.join(", ")}</span>
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
            <Link
              to={secondaryLink}
              className="group inline-flex items-center gap-2.5 sm:gap-3 rounded-full bg-[rgb(16,185,129)] px-4 sm:px-5 md:px-6 py-2 md:py-3 text-[12px] sm:text-[13px] md:text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-14px_rgba(16,185,129,0.7)] transition hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(16,185,129)]/80"
            >
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-white/30 text-slate-950/90 shadow-inner shadow-[rgba(16,185,129,0.4)] transition group-hover:scale-105">
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" fill="currentColor" />
              </span>
              {primaryLabel}
            </Link>

            <Link
              to={primaryLink}
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-[1px] hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Info className="h-4 w-4" />
              Thông tin
            </Link>
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 md:bottom-4 flex items-center gap-1.5 md:gap-2 rounded-2xl px-2 py-2 lg:right-3 lg:left-auto lg:translate-x-0 lg:bottom-5">
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
      </div>
    </section>
  );
};

export default Hero;

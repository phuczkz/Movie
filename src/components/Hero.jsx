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

const getHiRes = (url) => {
  if (!url || typeof url !== "string") return url;
  return url.replace(/\/w(92|154|185|300|342|500|780)\//, "/original/");
};

const Hero = ({ movie, movies = [] }) => {
  const movieList = Array.isArray(movies) ? movies.filter(Boolean) : [];
  const slides = movieList.length ? movieList : movie ? [movie] : [];
  const slideCount = slides.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeMovie = slides[activeIndex] || slides[0];
  const episodeLabel = useEpisodeLabel(activeMovie);

  useEffect(() => {
    setActiveIndex(0);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1 || isPaused) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, 6500);
    return () => clearInterval(timer);
  }, [slideCount, isPaused]);

  if (!activeMovie) return null;

  const isTmdb = activeMovie.slug?.startsWith("tmdb-");
  const primaryLink = isTmdb
    ? `/movie/${activeMovie.slug}`
    : `/watch/${activeMovie.slug}`;
  const secondaryLink = isTmdb
    ? `/watch/${activeMovie.slug}`
    : `/movie/${activeMovie.slug}`;
  const primaryLabel = isTmdb ? "Xem chi tiết" : "Xem ngay";

  const categories = normalizeList(activeMovie.category);
  const countries = normalizeList(activeMovie.country);
  const background = getHiRes(
    activeMovie.backdrop_url ||
      activeMovie.thumb_url ||
      activeMovie.poster_url ||
      "https://placehold.co/1600x900"
  );
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
      className="relative isolate -mx-4 md:-mx-8 lg:-mx-10 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] overflow-hidden rounded-none md:rounded-[28px] bg-slate-950/80 shadow-[0_40px_140px_-70px_rgba(0,0,0,0.95)] h-[78vh] md:h-[62vh] lg:h-[120vh] min-h-[460px] md:min-h-[460px] lg:min-h-[420px] max-h-[780px] md:max-h-[680px] lg:max-h-[720px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat brightness-110 contrast-[1.08] transition duration-700 ease-out"
          style={{ backgroundImage: `url(${background})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/60 to-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_60%,rgba(244,114,182,0.16),transparent_45%),radial-gradient(circle_at_78%_20%,rgba(52,211,153,0.18),transparent_42%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-center md:justify-center lg:justify-end items-center md:items-start text-center md:text-left gap-6 md:gap-7 px-4 pb-10 pt-16 md:px-10 md:pb-12 lg:px-16 lg:pb-8">
        <div className="max-w-3xl space-y-5 md:space-y-6">
          <div className="hidden md:inline-flex items-center gap-3 rounded-full bg-white/10 px-3 md:px-4 py-2 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-black/30 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Đề cử hôm nay
            {slides.length > 1 ? (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] md:text-[10px] font-bold">
                {activeIndex + 1}/{slides.length}
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5 md:space-y-2">
            {activeMovie.origin_name ? (
              <p className="text-[13px] md:text-sm font-semibold text-[rgb(16,185,129)] uppercase tracking-[0.12em] drop-shadow">
                {activeMovie.origin_name}
              </p>
            ) : null}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight text-white drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)]">
              {activeMovie.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 md:gap-3 text-[12px] md:text-[13px] font-semibold text-white/90">
            {rating ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgb(16,185,129)] px-3 py-1.5 md:px-3.5 text-slate-950 shadow-[0_10px_24px_rgba(16,185,129,0.45)]">
                IMDb
                <span className="text-sm font-black">{rating}</span>
              </span>
            ) : null}
            {activeMovie.year ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 md:px-3.5 shadow-lg shadow-black/20">
                {activeMovie.year}
              </span>
            ) : null}
            {episodeLabel ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 md:px-3.5 shadow-lg shadow-black/20">
                {episodeLabel}
              </span>
            ) : null}
            {activeMovie.time ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 md:px-3.5 shadow-lg shadow-black/20">
                {activeMovie.time}
              </span>
            ) : null}
          </div>

          <p className="hidden md:block max-w-3xl text-[15px] md:text-lg leading-relaxed text-slate-100/90 drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]">
            {activeMovie.content ||
              "Vào thời kỳ biến động, những nhân vật chủ chốt buộc phải đối mặt với lựa chọn định đoạt vận mệnh của cả vùng đất."}
          </p>

          <div className="flex flex-wrap gap-3 text-sm text-slate-200">
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
              to={primaryLink}
              className="group inline-flex items-center gap-2.5 md:gap-3 rounded-full bg-[rgb(16,185,129)] px-4 md:px-6 py-2.5 md:py-3 text-[13px] md:text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-14px_rgba(16,185,129,0.7)] transition hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(16,185,129)]/80"
            >
              <span className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-white/30 text-slate-950/90 shadow-inner shadow-[rgba(16,185,129,0.4)] transition group-hover:scale-105">
                <Play className="h-4 w-4 md:h-5 md:w-5" />
              </span>
              {primaryLabel}
            </Link>

            <Link
              to={secondaryLink}
              className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-[1px] hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Info className="h-4 w-4" />
              Thông tin
            </Link>
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 md:bottom-4 flex gap-1.5 md:gap-2 rounded-2xl bg-black/10 px-2 py-2 lg:bg-black/35 lg:right-3 lg:left-auto lg:translate-x-0 lg:bottom-5">
            {slides.slice(0, 6).map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`group relative h-11 w-11 md:h-12 md:w-12 lg:h-16 lg:w-28 overflow-hidden rounded-full lg:rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(16,185,129)]/80 ${
                    isActive
                      ? "border-[rgb(16,185,129)]/80 shadow-[0_10px_26px_-12px_rgba(16,185,129,0.65)] lg:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.65)]"
                      : "border-white/15 hover:border-white/25"
                  }`}
                  aria-label={`Chọn ${item.name}`}
                >
                  <img
                    src={item.thumb_url || item.poster_url}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  {isActive ? (
                    <span className="absolute inset-0 ring-2 ring-[rgb(16,185,129)]/90" aria-hidden="true" />
                  ) : null}
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

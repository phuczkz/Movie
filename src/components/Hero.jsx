import { Info, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const normalizeList = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter(Boolean);
};

const Hero = ({ movie }) => {
  if (!movie) return null;

  const isTmdb = movie.slug?.startsWith("tmdb-");
  const primaryLink = isTmdb ? `/movie/${movie.slug}` : `/watch/${movie.slug}`;
  const secondaryLink = isTmdb
    ? `/watch/${movie.slug}`
    : `/movie/${movie.slug}`;
  const primaryLabel = isTmdb ? "Xem chi tiết" : "Xem ngay";

  const categories = normalizeList(movie.category);
  const countries = normalizeList(movie.country);
  const background =
    movie.thumb_url || movie.poster_url || "https://placehold.co/1600x900";
  const rating =
    typeof movie.rating === "number" ? movie.rating.toFixed(1) : undefined;

  return (
    <section className="relative isolate -mx-4 md:-mx-6 lg:-mx-8 overflow-hidden rounded-none md:rounded-[32px] border border-white/5 bg-slate-950 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)] min-h-[520px]">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${background})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(52,211,153,0.16),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(248,113,113,0.18),transparent_35%)]" />
      </div>

      <div className="relative z-10 grid h-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-end gap-4 md:gap-6 px-4 md:px-10 lg:px-14 pb-10 pt-24 lg:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-black/30">
            <Sparkles className="h-4 w-4" />
            Đề cử hôm nay
          </div>

          <div className="space-y-2">
            {movie.origin_name ? (
              <p className="text-sm font-semibold text-amber-200/90 uppercase tracking-wide">
                {movie.origin_name}
              </p>
            ) : null}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]">
              {movie.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/90">
            {rating ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/90 px-3.5 py-1.5 text-slate-950 shadow-lg shadow-amber-500/40">
                IMDb
                <span className="text-sm font-bold">{rating}</span>
              </span>
            ) : null}
            {movie.year ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5">
                {movie.year}
              </span>
            ) : null}
            {movie.episode_current ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5">
                {movie.episode_current}
              </span>
            ) : null}
            {movie.time ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5">
                {movie.time}
              </span>
            ) : null}
          </div>

          <p className="text-base md:text-lg text-slate-200/90 max-w-3xl leading-relaxed drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]">
            {movie.content ||
              "Vào thời kỳ biến động, những nhân vật chủ chốt buộc phải đối mặt với lựa chọn định đoạt vận mệnh của cả vùng đất."}
          </p>

          <div className="flex flex-wrap gap-3 text-sm text-slate-200">
            {countries.length ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                Quốc gia
                <span className="text-white/80">{countries.join(", ")}</span>
              </span>
            ) : null}
            {categories.length ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                Thể loại
                <span className="text-white/80">{categories.join(", ")}</span>
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={primaryLink}
              className="inline-flex items-center gap-3 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:-translate-y-[1px] hover:bg-emerald-400"
            >
              <Play className="h-4 w-4" />
              {primaryLabel}
            </Link>

            <Link
              to={secondaryLink}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:border-white/30"
            >
              <Info className="h-4 w-4" />
              Thông tin
            </Link>
          </div>
        </div>

        <div className="relative hidden lg:flex items-end justify-end pr-10 pb-10">
          <div
            className="absolute -right-12 bottom-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative w-[380px] max-w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur">
            <img
              src={movie.poster_url}
              alt={movie.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

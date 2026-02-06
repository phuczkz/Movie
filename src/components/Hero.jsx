import { Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = ({ movie }) => {
  if (!movie) return null;

  const isTmdb = movie.slug?.startsWith("tmdb-");
  const primaryLink = isTmdb ? `/movie/${movie.slug}` : `/watch/${movie.slug}`;
  const primaryLabel = isTmdb ? "Xem chi tiết" : "Xem ngay";
  const secondaryLink = `/watch/${movie.slug}`;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-900/10 shadow-2xl">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(15,23,42,0.8), rgba(15,23,42,0.1)), url(${
            movie.thumb_url || movie.poster_url
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative z-10 grid gap-6 md:grid-cols-2 p-8 md:p-10 lg:p-14">
        <div className="space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            <Sparkles className="h-4 w-4" />
            Nổi bật
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white drop-shadow">
            {movie.name}
          </h1>
          <p className="text-base md:text-lg text-slate-200 max-w-2xl leading-relaxed">
            {movie.content ||
              "Khám phá trải nghiệm xem phim mượt mà với giao diện mới."}
          </p>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="rounded-full bg-white/10 px-3 py-1">
              {movie.year || "2024"}
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
              {movie.episode_current || "HD"}
            </span>
            {movie.category?.length ? (
              <span className="truncate">{movie.category.join(", ")}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to={primaryLink}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
            >
              <Play className="h-4 w-4" />
              {primaryLabel}
            </Link>
            {isTmdb ? (
              <Link
                to={secondaryLink}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-white/25"
              >
                Mở trang xem (TMDB)
              </Link>
            ) : (
              <Link
                to={`/movie/${movie.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:border-white/25"
              >
                Chi tiết
              </Link>
            )}
          </div>
        </div>

        <div className="relative hidden md:block">
          <div
            className="absolute -top-6 -right-6 h-72 w-52 rounded-3xl bg-emerald-400/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            <img
              src={movie.poster_url}
              alt={movie.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

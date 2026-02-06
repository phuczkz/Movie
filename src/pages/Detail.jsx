import { BookmarkPlus, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import EpisodeList from "../components/EpisodeList.jsx";
import { useMovieDetail } from "../hooks/useMovieDetail.js";

const Detail = () => {
  const { slug } = useParams();
  const { data, isLoading } = useMovieDetail(slug);

  if (isLoading)
    return <div className="text-slate-300">Đang tải chi tiết...</div>;

  const { movie, episodes = [] } = data || {};
  const isTmdb = movie?.slug?.startsWith("tmdb-");

  return (
    <div className="grid gap-8 lg:grid-cols-[280px,1fr]">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 shadow-xl">
          <img
            src={movie.poster_url}
            alt={movie.name}
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex gap-3">
          <button className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            <BookmarkPlus className="inline h-4 w-4 mr-2" />
            Lưu phim
          </button>
          <Link
            to={`/watch/${movie.slug}`}
            className={`flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white hover:border-emerald-400/40 ${
              episodes.length ? "" : "opacity-80"
            }`}
          >
            <Play className="inline h-4 w-4 mr-2" />
            {episodes.length ? "Xem ngay" : "Mở trang xem"}
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-400">
              Chi tiết
            </p>
            {isTmdb ? (
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
                TMDB
              </span>
            ) : null}
            {movie.rating ? (
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100">
                ⭐ {movie.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold text-white">{movie.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-300">
            <span className="rounded-full bg-white/10 px-3 py-1">
              {movie.year || "N/A"}
            </span>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
              {movie.episode_current || "HD"}
            </span>
            {movie.quality ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.quality}
              </span>
            ) : null}
            {movie.lang ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.lang}
              </span>
            ) : null}
            {movie.time ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.time}
              </span>
            ) : null}
            {movie.country?.length ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.country.map((c) => c.name || c).join(", ")}
              </span>
            ) : null}
            {movie.category?.length ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.category.map((c) => c.name || c).join(", ")}
              </span>
            ) : null}
          </div>
          {movie.origin_name ? (
            <p className="text-slate-400 text-sm">
              Tên gốc: {movie.origin_name}
            </p>
          ) : null}
          <div
            className="text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: movie.content || "Chưa có mô tả.",
            }}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Danh sách tập</h2>
          {episodes.length ? (
            <EpisodeList episodes={episodes} />
          ) : (
            <p className="text-slate-400">
              {isTmdb ? "Nguồn TMDB chưa có tập phát online." : "Chưa có tập."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Detail;

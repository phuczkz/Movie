import { Heart, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EpisodeList from "../components/EpisodeList.jsx";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSavedMovie } from "../hooks/useSavedMovie.js";
import {
  getLatestEpisodeNumber,
  normalizeServerLabel,
  parseEpisodeNumber,
} from "../utils/episodes.js";

const Detail = () => {
  const { slug } = useParams();
  const { data, isLoading } = useMovieDetail(slug);

  const { movie, episodes = [] } = data || {};
  const {
    isSaved,
    loading: saving,
    error,
    message,
    lastAction,
    toggleSave,
  } = useSavedMovie(movie);

  const serverGroups = useMemo(() => {
    if (!episodes?.length) return {};
    return episodes.reduce((acc, ep) => {
      if (!ep) return acc;
      const label = normalizeServerLabel(ep.server_name);
      acc[label] = acc[label] || [];
      acc[label].push(ep);
      return acc;
    }, {});
  }, [episodes]);

  const hasVietsub = !!serverGroups.Vietsub?.length;
  const hasThuyetMinh = !!serverGroups["Thuyết Minh"]?.length;

  const preferredServer = useMemo(() => {
    if (hasVietsub) return "Vietsub";
    if (hasThuyetMinh) return "Thuyết Minh";
    return Object.keys(serverGroups)[0] || null;
  }, [hasThuyetMinh, hasVietsub, serverGroups]);

  const [userSelectedServer, setUserSelectedServer] = useState(null);

  const selectedServer = useMemo(() => {
    if (userSelectedServer && serverGroups[userSelectedServer])
      return userSelectedServer;
    return preferredServer;
  }, [preferredServer, serverGroups, userSelectedServer]);

  const selectedEpisodes = useMemo(() => {
    if (selectedServer && serverGroups[selectedServer])
      return serverGroups[selectedServer];
    return episodes;
  }, [episodes, selectedServer, serverGroups]);

  if (isLoading)
    return <div className="text-slate-300">Đang tải chi tiết...</div>;

  const isTmdb = movie?.slug?.startsWith("tmdb-");

  const latestEpisodeNumber = getLatestEpisodeNumber(movie, episodes);
  const epTotal = parseEpisodeNumber(movie?.episode_total);
  const statusText = (
    movie?.status ||
    movie?.episode_current ||
    ""
  ).toLowerCase();
  const isCompleted =
    /hoan tat|hoàn tất|hoan thanh|trọn bộ|tron bo|full|completed/.test(
      statusText
    ) ||
    (latestEpisodeNumber >= 0 && epTotal && latestEpisodeNumber >= epTotal);

  const nextEpisodeText =
    movie?.next_episode_time ||
    movie?.nextEpisodeTime ||
    movie?.schedule ||
    movie?.air_time ||
    movie?.release_time ||
    movie?.upcoming_time ||
    movie?.time ||
    movie?.origin?.time;

  const nextEpisodeNumber =
    latestEpisodeNumber >= 0 ? latestEpisodeNumber + 1 : null;

  const formatNextTime = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    const lower = raw.toLowerCase();

    // Ignore durations like "43 phút/tập"; only show when it looks like a schedule
    if (/phu?t|phút|min|minute/.test(lower)) return null;

    // Try native Date first (handles ISO or RFC formats)
    const parsedNative = Date.parse(raw);
    if (!Number.isNaN(parsedNative)) {
      const d = new Date(parsedNative);
      const hh = `${d.getHours()}`.padStart(2, "0");
      const mm = `${d.getMinutes()}`.padStart(2, "0");
      const dd = `${d.getDate()}`.padStart(2, "0");
      const MM = `${d.getMonth() + 1}`.padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${hh}h${mm} ngày ${dd}/${MM}/${yyyy}`;
    }

    // Try pattern: HH:mm DD/MM/YYYY or variants with separators
    const regex =
      /(?:(\d{1,2})[:h](\d{2}))?[^\d]*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    const match = raw.match(regex);
    if (match) {
      const [, hh, mm, dd, MM, yyyy] = match;
      const hour = hh ? hh.padStart(2, "0") : null;
      const minute = mm ? mm.padStart(2, "0") : null;
      const day = dd.padStart(2, "0");
      const month = MM.padStart(2, "0");
      const year = `${yyyy}`.length === 2 ? `20${yyyy}` : yyyy;
      if (hour && minute)
        return `${hour}h${minute} ngày ${day}/${month}/${year}`;
      return `Ngày ${day}/${month}/${year}`;
    }

    // Fallback: show raw text
    return raw;
  };

  const formattedNextTime = formatNextTime(nextEpisodeText);
  const showUpcomingNotice =
    !isCompleted &&
    nextEpisodeNumber &&
    nextEpisodeNumber > latestEpisodeNumber;

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
          <button
            type="button"
            onClick={toggleSave}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition border ${
              isSaved
                ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 border-rose-400/50"
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-400/60"
            } ${saving ? "opacity-80" : ""}`}
          >
            <Heart
              className="h-4 w-4"
              fill={isSaved ? "currentColor" : "none"}
            />
            <span className="whitespace-nowrap">
              {saving ? "Đang lưu..." : isSaved ? "Bỏ yêu thích" : "Yêu thích"}
            </span>
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
        {message ? (
          <p
            className={`text-xs font-semibold ${
              lastAction === "remove" ? "text-rose-200" : "text-emerald-200"
            }`}
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-amber-200">
            {error.message || "Không thể cập nhật Yêu thích, thử lại sau."}
          </p>
        ) : null}
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
            <span className="rounded-full bg-white/10 px-3 py-1">
              {latestEpisodeNumber >= 0
                ? `Tập ${latestEpisodeNumber}`
                : movie.episode_current || "HD"}
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
          {Object.keys(serverGroups).length ? (
            <div className="flex items-center gap-2 pt-1">
              {hasVietsub ? (
                <button
                  type="button"
                  onClick={() => setUserSelectedServer("Vietsub")}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                    selectedServer === "Vietsub"
                      ? "border-emerald-400/70 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"
                  }`}
                >
                  Vietsub
                </button>
              ) : null}
              {hasThuyetMinh ? (
                <button
                  type="button"
                  onClick={() => setUserSelectedServer("Thuyết Minh")}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                    selectedServer === "Thuyết Minh"
                      ? "border-emerald-400/70 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"
                  }`}
                >
                  Thuyết minh
                </button>
              ) : null}
            </div>
          ) : null}
          {showUpcomingNotice ? (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-500/15 text-amber-100 px-4 py-3 text-sm font-semibold">
              <div>
                {nextEpisodeNumber
                  ? `Tập ${nextEpisodeNumber} sẽ cập nhật sớm.`
                  : "Tập mới sẽ có sớm, hãy quay lại để xem ngay khi cập nhật."}
              </div>
              {formattedNextTime ? (
                <div className="mt-1 text-xs font-semibold text-amber-50/90">
                  {nextEpisodeNumber
                    ? `Tập ${nextEpisodeNumber} dự kiến: ${formattedNextTime}`
                    : `Lịch dự kiến: ${formattedNextTime}`}
                </div>
              ) : null}
            </div>
          ) : null}
          {episodes.length ? (
            <EpisodeList
              episodes={selectedEpisodes}
              serverLabel={selectedServer || undefined}
            />
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

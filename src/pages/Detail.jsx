import { Heart, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import EpisodeList from "../components/EpisodeList.jsx";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSavedMovie } from "../hooks/useSavedMovie.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import {
  getLatestEpisodeNumber,
  normalizeServerLabel,
  parseEpisodeNumber,
} from "../utils/episodes.js";

// Try to fetch higher-res images for the banner to avoid pixelation when stretched
const getHiRes = (url) => {
  if (!url || typeof url !== "string") return url;
  return url.replace(/\/w(92|154|185|300|342|500|780)\//, "/original/");
};

const Detail = () => {
  const { slug } = useParams();
  const { data, isLoading } = useMovieDetail(slug);

  const { movie, episodes = [] } = data || {};
  const isTmdb = movie?.slug?.startsWith("tmdb-");
  const { data: altResults = [], isLoading: loadingAlts } = useSearchMovies(
    isTmdb ? movie?.name : ""
  );
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

  // Nếu là TMDB và chưa có tập, thử chuyển sang bản Ophim khớp tên/năm
  if (isTmdb && !episodes.length) {
    const normalized = (text) => (text || "").toLowerCase().trim();
    const namesToMatch = [movie?.name, movie?.origin_name]
      .map(normalized)
      .filter(Boolean);
    const targetYear = movie?.year;

    const bestMatch = loadingAlts
      ? null
      : altResults.find((m) => {
          const nameHit =
            namesToMatch.includes(normalized(m.name)) ||
            namesToMatch.includes(normalized(m.origin_name));
          const yearHit =
            targetYear && m.year ? String(m.year) === String(targetYear) : true;
          return nameHit && yearHit;
        });

    if (bestMatch && bestMatch.slug !== movie?.slug) {
      return <Navigate to={`/movie/${bestMatch.slug}`} replace />;
    }
  }

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

  const heroImage = getHiRes(
    movie?.backdrop_url ||
      movie?.banner ||
      movie?.thumb_url ||
      movie?.poster_url
  );

  return (
    <div className="space-y-8">
      {heroImage ? (
        <div
          className="overflow-hidden rounded-none border border-white/5 bg-slate-950/70 shadow-2xl lg:rounded-3xl"
          style={{
            width: "100vw",
            marginLeft: "calc(50% - 50vw)",
          }}
        >
          <div className="relative aspect-[16/5] w-full">
            <img
              src={heroImage}
              alt={movie.name}
              className="h-full w-full object-cover object-[50%_10%]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/60 to-slate-950/85" />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[380px,1fr] xl:grid-cols-[420px,1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/5 bg-slate-950/80 shadow-2xl px-6 py-8 lg:px-8 lg:py-9 space-y-6">
            <div className="flex flex-col gap-6">
              <div className="flex gap-4 lg:gap-6">
                <div className="w-36 sm:w-44 lg:w-48 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                  <img
                    src={movie.poster_url}
                    alt={movie.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-300/90">
                    Tập phim
                  </p>
                  {isTmdb ? (
                    <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">
                      TMDB
                    </span>
                  ) : null}
                  {movie.rating ? (
                    <span className="rounded-full bg-amber-500/25 px-3 py-1 text-xs font-semibold text-amber-50">
                      ⭐ {movie.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow">
                  {movie.name}
                </h1>
                {movie.origin_name ? (
                  <p className="text-slate-200/80 text-sm">
                    Tên gốc: {movie.origin_name}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-200/90">
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

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    to={`/watch/${movie.slug}`}
                    className={`flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:-translate-y-[1px] hover:bg-emerald-400 ${
                      episodes.length ? "" : "opacity-80"
                    }`}
                  >
                    <Play className="h-4 w-4" />
                    {episodes.length ? "Xem ngay" : "Mở trang xem"}
                  </Link>

                  <button
                    type="button"
                    onClick={toggleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                      isSaved
                        ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                        : "border-white/15 bg-white/5 text-white hover:border-emerald-300/60 hover:text-emerald-100"
                    } ${saving ? "opacity-80" : ""}`}
                  >
                    <Heart
                      className="h-4 w-4"
                      fill={isSaved ? "currentColor" : "none"}
                    />
                    {saving ? "Đang lưu..." : isSaved ? "Đã lưu" : "Yêu thích"}
                  </button>

                  {message ? (
                    <span
                      className={`text-xs font-semibold ${
                        lastAction === "remove"
                          ? "text-rose-200"
                          : "text-emerald-200"
                      }`}
                    >
                      {message}
                    </span>
                  ) : null}
                  {error ? (
                    <span className="text-xs text-amber-200">
                      {error.message || "Không thể cập nhật Yêu thích."}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 lg:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-sm uppercase tracking-[0.14em] text-slate-400">
                Giới thiệu
              </p>
            </div>
            <div
              className="text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: movie.content || "Chưa có mô tả.",
              }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-slate-900/70 shadow-xl p-6 lg:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Tập phim</h2>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-emerald-200">
                    {selectedServer || "Nguồn"}
                  </span>
                  <span className="text-slate-200/80">
                    {episodes.length ? `${episodes.length} tập` : ""}
                  </span>
                </span>
                {isCompleted ? (
                  <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100">
                    Hoàn tất
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {Object.keys(serverGroups).length ? (
            <div className="flex flex-wrap items-center gap-2">
              {hasVietsub ? (
                <button
                  type="button"
                  onClick={() => setUserSelectedServer("Vietsub")}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
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
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
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

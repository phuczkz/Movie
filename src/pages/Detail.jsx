import { Heart, Play } from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import EpisodeList from "../components/EpisodeList.jsx";
import Comments from "../components/Comments.jsx";
import Rating from "../components/Rating.jsx";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSavedMovie } from "../hooks/useSavedMovie.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useWatchProgress } from "../hooks/useWatchProgress.js";
import { useAuth } from "../context/AuthContext.jsx";
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

const formatTime = (secs) => {
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const Detail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useMovieDetail(slug);
  const { user } = useAuth();
  const { loadProgress, clearProgress } = useWatchProgress();

  const [resumeData, setResumeData] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Load watch progress for the modal
  useEffect(() => {
    if (!user || !slug) return;
    let cancelled = false;
    loadProgress(slug).then((data) => {
      if (cancelled || !data) return;
      if (data.currentTime > 10) {
        setResumeData(data);
        setShowResumeModal(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, slug, loadProgress]);

  const handleResume = useCallback(() => {
    if (!resumeData) return;
    const q = new URLSearchParams();
    if (resumeData.episodeSlug) q.set("episode", resumeData.episodeSlug);
    if (resumeData.server) q.set("server", resumeData.server);
    navigate(`/watch/${slug}?${q.toString()}`, {
      state: { initialTime: resumeData.currentTime },
    });
  }, [resumeData, slug, navigate]);

  const handleStartFromBeginning = useCallback(() => {
    clearProgress(slug);
    setShowResumeModal(false);
  }, [slug, clearProgress]);

  const { movie: baseMovie, episodes: baseEpisodes = [] } = data || {};
  const isTmdb = baseMovie?.slug?.startsWith("tmdb-");
  const { data: altResults = [], isLoading: loadingAlts } = useSearchMovies(
    isTmdb ? baseMovie?.name : ""
  );

  const bestAltMatch = useMemo(() => {
    if (!isTmdb || loadingAlts) return null;
    const normalized = (text) => (text || "").toLowerCase().trim();
    const namesToMatch = [baseMovie?.name, baseMovie?.origin_name]
      .map(normalized)
      .filter(Boolean);
    const targetYear = baseMovie?.year;

    return altResults.find((m) => {
      const nameHit =
        namesToMatch.includes(normalized(m.name)) ||
        namesToMatch.includes(normalized(m.origin_name));
      const yearHit =
        targetYear && m.year ? String(m.year) === String(targetYear) : true;
      return nameHit && yearHit;
    });
  }, [
    altResults,
    baseMovie?.name,
    baseMovie?.origin_name,
    baseMovie?.year,
    isTmdb,
    loadingAlts,
  ]);
  const {
    isSaved,
    loading: saving,
    error,
    message,
    lastAction,
    toggleSave,
  } = useSavedMovie(baseMovie);

  const altSlug =
    bestAltMatch && bestAltMatch.slug !== slug ? bestAltMatch.slug : null;

  const { data: altDetail } = useMovieDetail(
    altSlug && altSlug !== slug ? altSlug : null
  );

  const episodes = useMemo(() => {
    const altEpisodes = altDetail?.episodes || [];
    if (isTmdb && altEpisodes.length) return altEpisodes;
    return baseEpisodes;
  }, [altDetail?.episodes, baseEpisodes, isTmdb]);

  const movie = useMemo(
    () => altDetail?.movie || baseMovie,
    [altDetail?.movie, baseMovie]
  );

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
  const hasLongTieng = !!serverGroups["Lồng Tiếng"]?.length;
  const hasThuyetMinh = !!serverGroups["Thuyết Minh"]?.length;

  const preferredServer = useMemo(() => {
    if (hasVietsub) return "Vietsub";
    if (hasLongTieng) return "Lồng Tiếng";
    if (hasThuyetMinh) return "Thuyết Minh";
    return Object.keys(serverGroups)[0] || null;
  }, [hasLongTieng, hasThuyetMinh, hasVietsub, serverGroups]);

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

  const actors = useMemo(() => {
    const pools = [
      movie?.actor,
      movie?.actors,
      movie?.cast,
      movie?.origin?.actor,
      movie?.origin?.actors,
      movie?.origin?.cast,
    ];

    const collect = pools.flatMap((item) => {
      if (!item) return [];
      if (Array.isArray(item)) return item;
      if (typeof item === "string") return item.split(/[,/|]/);
      return [];
    });

    const normalized = collect
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === "string")
          return { name: entry.trim(), image: null };
        if (typeof entry === "object")
          return {
            name: String(
              entry.name || entry.full_name || entry.title || ""
            ).trim(),
            image:
              entry.avatar ||
              entry.image ||
              entry.photo ||
              entry.thumbnail ||
              null,
          };
        return null;
      })
      .filter((item) => item && item.name);

    const seen = new Set();
    return normalized.filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  }, [movie]);

  if (isLoading)
    return <div className="text-slate-300">Đang tải chi tiết...</div>;

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
    <div className="space-y-2">
      {heroImage ? (
        <div className="relative left-1/2 -translate-x-1/2 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] w-screen max-w-none overflow-hidden border border-white/5 bg-slate-950/70 shadow-2xl">
          <div className="relative aspect-[16/7] w-full">
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

                <Rating movieSlug={slug} apiRating={movie.rating} />

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
                    {saving
                      ? "Đang lưu..."
                      : isSaved
                      ? "Hủy Yêu thích"
                      : "Yêu thích"}
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

        <div className="space-y-5">
          <div className="self-start rounded-3xl border border-white/5 bg-slate-900/70 shadow-xl p-6 lg:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">Tập phim</h2>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1">
                    <span className="text-[11px] uppercase tracking-[0.08em] text-emerald-200">
                      {selectedServer || "Nguồn"}
                    </span>
                    <span className="text-slate-200/80">
                      {selectedEpisodes.length
                        ? `${selectedEpisodes.length} tập`
                        : ""}
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
                {hasLongTieng ? (
                  <button
                    type="button"
                    onClick={() => setUserSelectedServer("Lồng Tiếng")}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                      selectedServer === "Lồng Tiếng"
                        ? "border-emerald-400/70 bg-emerald-400 text-slate-950"
                        : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"
                    }`}
                  >
                    Lồng Tiếng
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
              <div className="max-h-48 overflow-y-auto pr-1">
                <EpisodeList
                  episodes={selectedEpisodes}
                  serverLabel={selectedServer || undefined}
                />
              </div>
            ) : (
              <p className="text-slate-400">
                {isTmdb
                  ? "Nguồn TMDB chưa có tập phát online."
                  : "Chưa có tập."}
              </p>
            )}
          </div>

          {actors.length ? (
            <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-sm uppercase tracking-[0.14em] text-slate-300">
                  Diễn viên
                </p>
                <span className="text-xs font-semibold text-slate-400">
                  {actors.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                {actors.map((actor) => {
                  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    actor.name
                  )}&background=0f172a&color=94a3b8&bold=true&size=128&format=png`;
                  const src = actor.image || fallback;
                  return (
                    <div
                      key={actor.name}
                      className="flex flex-col items-center gap-2 w-24"
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-lg">
                        <img
                          src={src}
                          alt={actor.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <span className="text-center text-sm text-slate-100 line-clamp-2 leading-tight">
                        {actor.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {movie && movie.slug && <Comments movieSlug={movie.slug} />}
        </div>
      </div>



      {/* Fullscreen Resume Modal */}
      {showResumeModal && resumeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Background Poster Full Width */}
            {(movie?.thumb_url || movie?.poster_url) && (
              <div className="absolute inset-0 z-0">
                <img
                  src={getHiRes(movie?.poster_url || movie?.thumb_url)}
                  alt="cover"
                  className="h-full w-full object-cover object-top opacity-100"
                />
                {/* Gradient masks to make text readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
              </div>
            )}

            {/* Modal Content */}
            <div className="relative z-10 px-6 pb-6 pt-36 text-center">
              <h3 className="mb-2 text-xl font-bold text-white tracking-tight drop-shadow-md">
                Tiếp tục xem phim?
              </h3>
              <p className="text-sm font-medium text-slate-200 drop-shadow-md">
                Bạn đang xem {
                  (resumeData.episodeName === "Full" || resumeData.episodeName === "Tập Full" || !resumeData.episodeName)
                    ? "Tập Full"
                    : (resumeData.episodeName.toLowerCase().startsWith("tập")
                        ? resumeData.episodeName
                        : `Tập ${resumeData.episodeName}`)
                } - phút {formatTime(resumeData.currentTime)} / {formatTime(resumeData.duration)}
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleResume}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-[2px] hover:bg-emerald-400 active:scale-[0.98]"
                >
                  <Play
                    className="h-4 w-4 transition-transform group-hover:scale-110"
                    fill="currentColor"
                  />
                  Có, tiếp tục xem
                </button>
                <button
                  type="button"
                  onClick={handleStartFromBeginning}
                  className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-md px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
                >
                  Tôi muốn xem từ đầu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detail;

import { Heart, Play, Globe2, Star, User, Film, Info } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.config";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import EpisodeList from "../components/EpisodeList.jsx";
import Comments from "../components/Comments.jsx";
import Rating from "../components/Rating.jsx";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSavedMovie } from "../hooks/useSavedMovie.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useMoviesByCountry } from "../hooks/useMoviesByCountry.js";
import { useWatchProgress } from "../hooks/useWatchProgress.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getLatestEpisodeNumber,
  normalizeServerLabel,
  parseEpisodeNumber,
} from "../utils/episodes.js";
import MovieCard from "../components/MovieCard.jsx";

// Try to fetch reasonable resolution images for the banner to balance quality and speed
const getHiRes = (url) => {
  if (!url || typeof url !== "string") return url;
  // Use w1280 for banner instead of original to speed up loading
  return url.replace(/\/w(92|154|185|300|342|500|780)\//, "/w1280/");
};

const getOptimizedImage = (url, w = 1280) => {
  if (!url) return url;
  try {
    const rawHost = new URL(url).hostname;
    // TMDB handled natively
    if (rawHost.includes("tmdb.org")) return url;
    // Use proxy for others
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&w=${w}&fit=cover&q=80`;
  } catch {
    return url;
  }
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
  const location = useLocation();
  const { data, isLoading } = useMovieDetail(slug);
  const { user } = useAuth();
  const { loadProgress, clearProgress } = useWatchProgress();

  // Thừa hưởng dữ liệu cơ bản từ card (poster, name) nếu có, để tránh "Chưa có tên"
  const passedMovie = location.state?.movie;

  const [resumeData, setResumeData] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [movieOverride, setMovieOverride] = useState(null);

  // Listen for admin movie override (trailer mode)
  useEffect(() => {
    if (!db || !slug) return;
    const unsub = onSnapshot(doc(db, "movieOverrides", slug), (snap) => {
      setMovieOverride(snap.exists() ? snap.data() : { mode: "full" });
    }, (err) => {
      console.warn("MovieOverride error:", err);
      setMovieOverride({ mode: "full" });
    });
    return unsub;
  }, [slug]);

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

  const movie = useMemo(() => {
    const detailMovie = altDetail?.movie || baseMovie;
    // Nếu API đã trả về và có tên hợp lệ, dùng nó. Nếu không, dùng passedMovie từ trang chủ.
    if (detailMovie?.name && detailMovie.name !== "unknown") return detailMovie;
    return passedMovie || detailMovie || null;
  }, [altDetail?.movie, baseMovie, passedMovie]);

  const categorySlugs = useMemo(() => (movie?.category || []).map(c => c.slug).filter(Boolean), [movie?.category]);
  const countrySlug = movie?.country?.[0]?.slug;

  const [deferLoad, setDeferLoad] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDeferLoad(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const { data: cat1Pool = [] } = useMoviesList("latest", categorySlugs[0], { enabled: deferLoad && !!categorySlugs[0] });
  const { data: cat2Pool = [] } = useMoviesList("latest", categorySlugs[1], { enabled: deferLoad && !!categorySlugs[1] });
  const { data: countryPool = [] } = useMoviesByCountry(countrySlug, { enabled: deferLoad && !!countrySlug });

  const relatedMovies = useMemo(() => {
    const combined = [];
    const max = 24;
    const len = Math.max(cat1Pool.length, cat2Pool.length, countryPool.length);

    for (let i = 0; i < len; i++) {
      if (cat1Pool[i]) combined.push(cat1Pool[i]);
      if (countryPool[i]) combined.push(countryPool[i]);
      if (cat2Pool[i]) combined.push(cat2Pool[i]);
      if (combined.length >= max) break;
    }

    const seen = new Set();
    seen.add(movie?.slug);
    return combined.filter(m => {
      if (!m || !m.slug || seen.has(m.slug)) return false;
      seen.add(m.slug);
      return true;
    }).slice(0, 16);
  }, [cat1Pool, cat2Pool, countryPool, movie?.slug]);

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

  const isMovie = useMemo(() => {
    if (!episodes?.length) return false;
    const nums = new Set(episodes.map(ep => parseEpisodeNumber(ep.name || ep.slug)).filter(n => n !== null));
    return nums.size <= 1;
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
    // Prioritize actors from the original TMDB source if available
    const baseActors = baseMovie?.slug?.startsWith("tmdb-") ? baseMovie?.actor : null;

    const pools = [
      baseActors,
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

  const isActuallyLoading = (isLoading && !passedMovie) || (isTmdb && loadingAlts && !altDetail?.movie && !passedMovie);

  if (isActuallyLoading)
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="text-slate-400 font-medium animate-pulse">Đang tải chi tiết phim...</div>
      </div>
    );

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
    passedMovie?.thumb_url ||
    passedMovie?.backdrop_url ||
    movie?.backdrop_url ||
    movie?.banner ||
    movie?.thumb_url ||
    passedMovie?.poster_url ||
    movie?.poster_url
  );

  return (
    <div className="space-y-2 relative">
      {heroImage ? (
        <div className="relative left-1/2 -translate-x-1/2 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] w-screen max-w-none pointer-events-none">
          {/* Spacer: Giữ nguyên khoảng trống gốc để không đẩy content đi chỗ khác */}
          <div className="aspect-[16/10] md:aspect-[2/1] xl:aspect-[21/9] w-full invisible pointer-events-none" />

          {/* Banner chỉ kéo dài xuống khoảng 25% phía dưới spacer (tương đương 1/3 khung thông tin đầu tiên) */}
          <div className="absolute top-0 left-0 w-full h-[125%] bg-slate-950 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full">
              <img
                src={getOptimizedImage(heroImage, 1280)}
                alt={movie?.name || "Banner"}
                className="w-full h-full object-cover object-[50%_10%]"
                fetchPriority="high"
              />
              {/* Lớp phủ tối ở trên để bảo vệ Header (Search, Menu, Logo) */}
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent" />
              
              {/* Lớp phủ tối ở dưới đậm hơn để bảo vệ thông tin phim (Title, Metadata) */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            </div>
          </div>
          <div
            className="absolute top-full bottom-[-25%] left-0 w-full bg-slate-950/70 backdrop-blur-[6px] z-0 pointer-events-none"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 30%)"
            }}
          />
        </div>
      ) : null}

      <div className="relative z-10 flex flex-col space-y-8 lg:space-y-12 pb-16">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:-mt-32 lg:-mt-48 xl:-mt-64 relative z-20">
            <div className="w-36 sm:w-44 md:w-48 lg:w-56 shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border-4 border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-slate-900 aspect-[2/3] ring-1 ring-white/10 relative z-30">
              <img
                src={getOptimizedImage(passedMovie?.poster_url || movie?.poster_url, 500)}
                alt={movie?.name || passedMovie?.name}
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
            </div>

            <div className="space-y-4 flex-1 md:pt-4 drop-shadow-2xl">
              {/* <div className="flex items-center gap-3">
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
              </div> */}

              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                {movie?.name || passedMovie?.name || "Đang tải tên phim..."}
              </h1>
              {movie.origin_name ? (
                <p className="text-slate-100/90 text-sm font-medium drop-shadow-md">
                  Tên gốc: {movie.origin_name}
                </p>
              ) : null}

              <Rating movieSlug={slug} apiRating={movie.rating} />

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white font-medium drop-shadow-md">
                {movie?.year && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.year}
                  </span>
                )}
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {isMovie
                    ? "Full"
                    : latestEpisodeNumber >= 0
                    ? `Tập ${latestEpisodeNumber}`
                    : movie?.episode_current || "HD"}
                </span>


                {movie?.quality && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.quality}
                  </span>
                )}
                {movie?.lang && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.lang}
                  </span>
                )}
                {movie?.time && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.time}
                  </span>
                )}
                {movie?.country?.length > 0 && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.country.map((c) => c.name || c).join(", ")}
                  </span>
                )}
                {movie?.category?.length > 0 && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.category.map((c) => c.name || c).join(", ")}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/watch/${slug}`);
                  }}
                  className={`flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:-translate-y-[1px] hover:bg-emerald-400 relative z-30 cursor-pointer ${episodes.length ? "" : "opacity-90"}`}
                >
                  {movieOverride?.mode === "trailer" ? (
                    <>
                      <Film className="h-4 w-4" fill="currentColor" />
                      Xem Trailer
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" fill="currentColor" />
                      {episodes.length ? "Xem ngay" : "Mở trang xem"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${isSaved
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
                    className={`text-xs font-semibold ${lastAction === "remove"
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

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-x-6 gap-y-6 lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px] items-start">
          {/* Cột 1: Giới thiệu (Vị trí 1 trên mọi thiết bị) */}
          <div className="lg:col-start-1 lg:row-start-1 space-y-6 lg:mb-0">
            <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 lg:p-8 space-y-3 shadow-xl h-full">
              <div className="flex items-center gap-3">
                <p className="text-sm uppercase tracking-[0.14em] text-slate-300">
                  Giới thiệu
                </p>
              </div>
              <div
                className="text-slate-300 leading-relaxed text-[15px]"
                dangerouslySetInnerHTML={{
                  __html: movie.content || "Chưa có mô tả.",
                }}
              />
            </div>
          </div>

          {/* Cột 2: Sidebar (Episodes, Actors, Related) */}
          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 space-y-6 min-w-0">
            <div className="self-start rounded-3xl border border-white/5 bg-slate-900/70 shadow-xl p-6 lg:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-white">Tập phim</h2>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    {!isMovie && (
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
                    )}

                    {isCompleted ? (
                      <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100">
                        Hoàn tất
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {Object.keys(serverGroups).length > 1 && !isMovie ? (
                <div className="flex flex-wrap items-center gap-2">
                  {hasVietsub ? (
                    <button
                      type="button"
                      onClick={() => setUserSelectedServer("Vietsub")}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${selectedServer === "Vietsub"
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
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${selectedServer === "Lồng Tiếng"
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
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${selectedServer === "Thuyết Minh"
                        ? "border-emerald-400/70 bg-emerald-400 text-slate-950"
                        : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"
                        }`}
                    >
                      Thuyết Minh
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

              {movieOverride?.mode === "trailer" ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
                  <div className="flex justify-center">
                    <Info className="h-6 w-6 text-amber-400" />
                  </div>
                  <p className="text-sm font-semibold text-amber-200">Phim hiện đang chưa có nguồn</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Bộ phim này hiện tại chỉ có Trailer. Bạn có thể xem bản giới hạn bằng nút "Xem Trailer" ở trên.</p>
                </div>
              ) : episodes.length ? (
                <div className="max-h-48 overflow-y-auto pr-1">
                  <EpisodeList
                    episodes={isMovie ? episodes : selectedEpisodes}
                    serverLabel={isMovie ? undefined : (selectedServer || undefined)}
                    showServerLabels={isMovie}
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
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {actors.map((actor) => {
                    return (
                      <Link
                        key={actor.name}
                        to={`/actor/${actor.id || actor.name}`}
                        className="flex flex-col items-center gap-2 w-20 sm:w-24 group/actor hover:-translate-y-1 transition-transform"
                      >
                        <div className="h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-lg group-hover/actor:border-emerald-500/50 group-hover/actor:shadow-emerald-500/20 transition-all flex items-center justify-center">
                          {actor.image ? (
                            <img
                              src={actor.image}
                              alt={actor.name}
                              className="h-full w-full object-cover group-hover/actor:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <User className="w-1/2 h-1/2 text-slate-400 group-hover/actor:text-emerald-400/80 transition-colors" />
                          )}
                        </div>
                        <span className="text-center text-xs sm:text-sm text-slate-100 line-clamp-2 leading-tight group-hover/actor:text-emerald-400 transition-colors">
                          {actor.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {relatedMovies.length > 0 && (
              <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-300">
                    Phim liên quan
                  </p>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
                  {relatedMovies.map((relMovie) => (
                    <div key={relMovie.slug} className="min-w-[170px] sm:min-w-[200px] snap-start">
                      <MovieCard movie={relMovie} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cột 1 hàng 2: Bình luận (Nằm dưới Intro trên Desktop, dưới Sidebar trên Mobile) */}
          <div className="lg:col-start-1 lg:row-start-2">
            {movie && movie.slug && (
              <Comments 
                movieSlug={movie.slug} 
                movieName={movie.name} 
              />
            )}
          </div>
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

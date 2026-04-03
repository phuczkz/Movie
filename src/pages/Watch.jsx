import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Bell,
  Globe2,
  Info,
  ListChecks,
  Play,
  Star,
  Timer,
  User,
} from "lucide-react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase.config.js";
import Player from "../components/Player.jsx";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useWatchProgress } from "../hooks/useWatchProgress.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useMoviesByCountry } from "../hooks/useMoviesByCountry.js";
import Comments from "../components/Comments.jsx";
import MovieCard from "../components/MovieCard.jsx";
import {
  getEpisodeLabel,
  normalizeServerLabel,
  parseEpisodeNumber,
} from "../utils/episodes.js";

const HLS_PROXY_PATH = "/hls/playlist.m3u8?url=";

const buildPlayableSource = (source, proxyBase) => {
  if (!source || typeof source !== "string") return "";

  const normalizedSource = source.trim();
  if (!normalizedSource) return "";

  const looksLikeHls = normalizedSource.toLowerCase().includes(".m3u8");
  if (!looksLikeHls) return normalizedSource;

  if (normalizedSource.includes(HLS_PROXY_PATH)) {
    return normalizedSource;
  }

  const baseRaw = String(proxyBase || "").trim();
  if (!baseRaw) return normalizedSource;

  const normalizedBase = baseRaw === "/" ? "" : baseRaw.replace(/\/+$/, "");

  const proxyPrefix = normalizedBase;
  return `${proxyPrefix}${HLS_PROXY_PATH}${encodeURIComponent(
    normalizedSource
  )}`;
};

const Watch = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const playerRef = useRef(null);
  const { user } = useAuth();
  const { saveProgress, forceSave } = useWatchProgress();

  const initialTime = location.state?.initialTime || 0;
  const progressRef = useRef({ currentTime: 0, duration: 0 });
  const lastSaveRef = useRef(0);
  const metaRef = useRef({
    slug: null,
    name: null,
    episodeNumber: null,
    server: null,
    movieName: null,
    posterUrl: null,
  });
  const [movieOverride, setMovieOverride] = useState(null);
  const [isTheater, setIsTheater] = useState(false);

  // Listen for admin movie override (trailer mode)
  useEffect(() => {
    if (!db || !slug) return;
    const unsub = onSnapshot(
      doc(db, "movieOverrides", slug),
      (snap) => {
        setMovieOverride(snap.exists() ? snap.data() : { mode: "full" });
      },
      (err) => {
        console.warn("MovieOverride error:", err);
        setMovieOverride({ mode: "full" });
      }
    );
    return unsub;
  }, [slug]);
  const [params, setParams] = useSearchParams();
  const selectedEpisode = params.get("episode");
  const selectedServerParam = params.get("server");
  const { data, isLoading } = useMovieDetail(slug);

  const { movie: baseMovie, episodes: baseEpisodes = [] } = data || {};
  const baseName = baseMovie?.name || "";
  const baseOriginName = baseMovie?.origin_name || "";
  const baseYear = baseMovie?.year || null;
  const isTmdb = baseMovie?.slug?.startsWith("tmdb-");

  const { data: altResults = [], isLoading: loadingAlts } = useSearchMovies(
    isTmdb ? baseMovie?.name : ""
  );

  const bestAltMatch = (() => {
    if (!isTmdb || loadingAlts) return null;
    const normalized = (text) => (text || "").toLowerCase().trim();
    const namesToMatch = [baseName, baseOriginName]
      .map(normalized)
      .filter(Boolean);
    const targetYear = baseYear;

    return altResults.find((m) => {
      const nameHit =
        namesToMatch.includes(normalized(m.name)) ||
        namesToMatch.includes(normalized(m.origin_name));
      const yearHit =
        targetYear && m.year ? String(m.year) === String(targetYear) : true;
      return nameHit && yearHit;
    });
  })();

  const { data: altDetail, isLoading: loadingAltDetail } = useMovieDetail(
    bestAltMatch?.slug
  );

  const movie =
    !isTmdb || !loadingAlts || bestAltMatch ? bestAltMatch || baseMovie : null;

  const episodes = altDetail?.episodes?.length
    ? altDetail.episodes
    : baseEpisodes;
  const episodesList = Array.isArray(episodes) ? episodes : [];
  const serverGroups = {};
  episodesList.forEach((ep) => {
    if (!ep) return;
    const label = normalizeServerLabel(ep.server_name);
    serverGroups[label] = serverGroups[label] || [];
    serverGroups[label].push(ep);
  });

  const preferredServer = serverGroups.Vietsub?.length
    ? "Vietsub"
    : serverGroups["Thuyết Minh"]?.length
    ? "Thuyết Minh"
    : Object.keys(serverGroups)[0];

  const requestedServer = normalizeServerLabel(selectedServerParam);
  const activeServer =
    requestedServer && serverGroups[requestedServer]?.length
      ? requestedServer
      : preferredServer;

  const sortEpisodes = (list = []) =>
    list
      .map((ep, idx) => ({
        ep,
        idx,
        num: parseEpisodeNumber(ep?.name || ep?.slug),
      }))
      .sort((a, b) => {
        const aHasNum = a.num !== null && a.num !== undefined;
        const bHasNum = b.num !== null && b.num !== undefined;
        if (aHasNum && bHasNum) return a.num - b.num;
        if (aHasNum) return -1;
        if (bHasNum) return 1;
        return a.idx - b.idx;
      })
      .map(({ ep }) => ep);

  const episodesForServer = sortEpisodes(serverGroups[activeServer] || []);

  const hasVietsub = Boolean(serverGroups.Vietsub?.length);
  const hasThuyetMinh = Boolean(serverGroups["Thuyết Minh"]?.length);

  const activeEpisode =
    episodesForServer.find((ep) => ep.slug === selectedEpisode) ||
    episodesForServer[0] ||
    null;

  const currentIndex = activeEpisode
    ? episodesForServer.findIndex((ep) => ep.slug === activeEpisode.slug)
    : -1;
  const nextEpisode =
    currentIndex >= 0 ? episodesForServer[currentIndex + 1] || null : null;

  const rawSource = activeEpisode?.link_m3u8 || activeEpisode?.embed || "";
  const proxyBase = import.meta.env.VITE_HLS_PROXY_BASE || "";
  const playableSource = useMemo(
    () => buildPlayableSource(rawSource, proxyBase),
    [rawSource, proxyBase]
  );

  const handleServerChange = (serverLabel) => {
    const targetLabel = normalizeServerLabel(serverLabel);
    if (!targetLabel || targetLabel === activeServer) return;
    const candidates = sortEpisodes(serverGroups[targetLabel] || []);
    if (!candidates.length) return;

    const currentSlug = params.get("episode");
    const matched = candidates.find((ep) => ep.slug === currentSlug);
    const nextSlug = (matched || candidates[0]).slug;

    const nextParams = new URLSearchParams(params);
    nextParams.set("server", targetLabel);
    nextParams.set("episode", nextSlug);
    setParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (!selectedEpisode || !playerRef.current) return;
    playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedEpisode]);

  // Save progress periodically via Player's onTimeUpdate
  // Throttle 5 giây để tránh gọi Firebase quá nhiều (giảm lag trên mobile)
  const onTimeUpdate = useCallback(
    (currentTime, duration) => {
      progressRef.current = { currentTime, duration };
      if (!user || !slug || !activeEpisode) return;
      const now = Date.now();
      if (now - lastSaveRef.current < 5000) return; // Throttle: tối đa 1 lần / 5 giây
      lastSaveRef.current = now;
      saveProgress(slug, {
        episodeSlug: activeEpisode.slug || activeEpisode.name,
        episodeName: activeEpisode.name,
        episodeNumber: parseEpisodeNumber(
          activeEpisode.name || activeEpisode.slug
        ),
        server: activeServer || null,
        currentTime,
        duration,
        movieName: movie?.name,
        posterUrl: movie?.poster_url || movie?.thumb_url || movie?.backdrop_url,
      });
    },
    [
      user,
      slug,
      activeEpisode,
      activeServer,
      saveProgress,
      movie?.name,
      movie?.poster_url,
      movie?.thumb_url,
      movie?.backdrop_url,
    ]
  );

  // Force-save khi user chuyển app (iOS background) - tránh mất progress
  useEffect(() => {
    if (!user || !slug) return undefined;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const { currentTime, duration } = progressRef.current;
        const {
          slug: epSlug,
          name: epName,
          episodeNumber,
          server: epServer,
          movieName,
          posterUrl,
        } = metaRef.current;
        if (currentTime > 10) {
          forceSave(slug, {
            episodeSlug: epSlug,
            episodeName: epName,
            episodeNumber,
            server: epServer,
            currentTime,
            duration,
            movieName,
            posterUrl,
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, slug, forceSave]);

  const actors = useMemo(() => {
    // Prioritize actors from the original TMDB source if available
    const baseActors = baseMovie?.slug?.startsWith("tmdb-")
      ? baseMovie?.actor
      : null;

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
  }, [movie, baseMovie?.actor, baseMovie?.slug]);

  const categorySlugs = useMemo(
    () => (movie?.category || []).map((c) => c.slug).filter(Boolean),
    [movie?.category]
  );
  const countrySlug = movie?.country?.[0]?.slug;

  const [deferLoad, setDeferLoad] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDeferLoad(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const { data: cat1Pool = [] } = useMoviesList("latest", categorySlugs[0], {
    enabled: deferLoad && !!categorySlugs[0],
  });
  const { data: cat2Pool = [] } = useMoviesList("latest", categorySlugs[1], {
    enabled: deferLoad && !!categorySlugs[1],
  });
  const { data: countryPool = [] } = useMoviesByCountry(countrySlug, {
    enabled: deferLoad && !!countrySlug,
  });

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
    return combined
      .filter((m) => {
        if (!m || !m.slug || seen.has(m.slug)) return false;
        seen.add(m.slug);
        return true;
      })
      .slice(0, 16);
  }, [cat1Pool, cat2Pool, countryPool, movie?.slug]);

  // Keep track of the current episode meta for the unmount flush
  useEffect(() => {
    if (activeEpisode) {
      metaRef.current = {
        slug: activeEpisode.slug || activeEpisode.name,
        name: activeEpisode.name,
        episodeNumber: parseEpisodeNumber(
          activeEpisode.name || activeEpisode.slug
        ),
        server: activeServer || null,
        movieName: movie?.name,
        posterUrl: movie?.poster_url || movie?.thumb_url || movie?.backdrop_url,
      };
    }
  }, [
    activeEpisode,
    activeServer,
    movie?.name,
    movie?.poster_url,
    movie?.thumb_url,
    movie?.backdrop_url,
  ]);

  // Force-save on pause or unmount
  useEffect(() => {
    return () => {
      if (!user || !slug) return;
      const { currentTime, duration } = progressRef.current;
      const {
        slug: epSlug,
        name: epName,
        episodeNumber,
        server: epServer,
        movieName,
        posterUrl,
      } = metaRef.current;
      if (currentTime > 10) {
        forceSave(slug, {
          episodeSlug: epSlug,
          episodeName: epName,
          episodeNumber,
          server: epServer,
          currentTime,
          duration,
          movieName,
          posterUrl,
        });
      }
    };
  }, [user, slug, forceSave]);

  useEffect(() => {
    if (!episodesForServer.length) return;

    const nextParams = new URLSearchParams(params);
    let changed = false;

    if (activeServer && params.get("server") !== activeServer) {
      nextParams.set("server", activeServer);
      changed = true;
    }

    const currentEpisode = params.get("episode");
    const hasEpisode = episodesForServer.some(
      (ep) => ep.slug === currentEpisode
    );
    if (!hasEpisode) {
      nextParams.set("episode", episodesForServer[0].slug);
      changed = true;
    }

    if (changed) {
      setParams(nextParams, { replace: true });
    }
  }, [episodesForServer, activeServer, params, setParams]);

  if (
    isLoading ||
    (isTmdb && loadingAlts && !bestAltMatch) ||
    (bestAltMatch && loadingAltDetail)
  )
    return <div className="text-slate-300 px-8 py-20">Đang tải player...</div>;

  if (!episodes.length) {
    return (
      <div className="space-y-3">
        <p className="text-slate-200">
          {isTmdb
            ? "TMDB không có nguồn và không tìm thấy nguồn thay thế."
            : "Phim này chưa có nguồn phát."}
        </p>
        <Link
          to={`/movie/${slug}`}
          className="inline-flex items-center gap-2 text-emerald-300 hover:underline"
        >
          <Info className="h-4 w-4" />
          Quay lại trang chi tiết
        </Link>
      </div>
    );
  }

  const statusLabel = getEpisodeLabel(movie, episodes);
  const notifyText = movie?.notify || movie?.showtimes;
  const categoriesText = (movie?.category || [])
    .map((c) => c.name || c)
    .join(", ");
  const countryText = (movie?.country || []).map((c) => c.name || c).join(", ");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">{movie?.name}</h1>
        {activeEpisode ? (
          <p className="text-slate-300">
            {episodes.length === 1 &&
            parseEpisodeNumber(activeEpisode.name) === 1
              ? "Full"
              : activeEpisode.name}{" "}
          </p>
        ) : null}
      </div>

      <div ref={playerRef}>
        {movieOverride?.mode === "trailer" ? (
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-slate-900 border border-white/10"
            style={{ aspectRatio: "16/9" }}
          >
            {movieOverride.trailerUrl ? (
              <iframe
                src={movieOverride.trailerUrl}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Info className="h-8 w-8 text-amber-400" />
                </div>
                <p className="text-white font-bold text-lg">
                  Phim đang chuẩn bị
                </p>
                <p className="text-slate-400 text-sm">
                  Phim này hiện chỉ có trailer. Vui lòng quay lại sau.
                </p>
              </div>
            )}
          </div>
        ) : (
          <Player
            source={playableSource}
            poster={movie?.thumb_url || movie?.poster_url}
            title={movie?.name}
            subtitle={
              activeEpisode?.name
                ? `${
                    episodes.length === 1 &&
                    parseEpisodeNumber(activeEpisode.name) === 1
                      ? "Full"
                      : activeEpisode.name
                  } • ${activeServer || "Vietsub"}`
                : undefined
            }
            onNextEpisode={() => {
              if (!nextEpisode) return;
              navigate(
                `/watch/${slug}?episode=${encodeURIComponent(
                  nextEpisode.slug || nextEpisode.name
                )}${
                  activeServer
                    ? `&server=${encodeURIComponent(activeServer)}`
                    : ""
                }`
              );
            }}
            hasNextEpisode={Boolean(nextEpisode)}
            onTimeUpdate={onTimeUpdate}
            initialTime={initialTime}
            theaterMode={isTheater}
            onToggleTheater={() => setIsTheater(!isTheater)}
          />
        )}
      </div>

      {isTheater && (
        <div
          className="fixed inset-0 z-[55] bg-black/90 transition-opacity duration-500 cursor-pointer pointer-events-auto"
          onClick={() => setIsTheater(false)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[380px,1fr] xl:grid-cols-[420px,1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/5 bg-slate-950/80 shadow-2xl px-6 py-8 lg:px-8 lg:py-9 space-y-6">
            <div className="flex flex-col gap-6">
              <div className="flex gap-4 lg:gap-6">
                <div className="w-36 sm:w-44 lg:w-48 shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                  <img
                    src={movie?.poster_url}
                    alt={movie?.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-white leading-tight">
                  {movie?.name}
                </h1>
                {movie?.origin_name && (
                  <p className="text-slate-200/80 text-sm">
                    Tên gốc: {movie.origin_name}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-200/90">
                  {movie?.year && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {movie.year}
                    </span>
                  )}
                  {statusLabel && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {statusLabel}
                    </span>
                  )}
                  {movie?.quality && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {movie.quality}
                    </span>
                  )}
                  {movie?.lang && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {movie.lang}
                    </span>
                  )}
                  {movie?.time && (
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {movie.time}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-200">
                  {countryText && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                      <Globe2 className="h-4 w-4" />
                      {countryText}
                    </span>
                  )}
                  {categoriesText && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                      <Star className="h-4 w-4 text-amber-300" />
                      {categoriesText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 min-w-0">
          {notifyText ? (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-500/15 px-4 py-3 flex items-center gap-3 shadow-lg shadow-amber-950/20 backdrop-blur-sm text-amber-100 font-semibold text-sm">
              <Bell className="h-5 w-5 text-amber-400" />
              <div>{notifyText}</div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-white/5 bg-slate-900/70 shadow-xl p-6 lg:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">
                Danh sách tập
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {(hasVietsub || hasThuyetMinh) && (
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => handleServerChange("Vietsub")}
                      disabled={!hasVietsub}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                        activeServer === "Vietsub"
                          ? "bg-emerald-400 text-slate-950"
                          : "text-slate-200 hover:bg-white/10"
                      } ${!hasVietsub ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      Vietsub
                    </button>
                    {hasThuyetMinh && (
                      <button
                        type="button"
                        onClick={() => handleServerChange("Thuyết Minh")}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          activeServer === "Thuyết Minh"
                            ? "bg-emerald-400 text-slate-950"
                            : "text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        Thuyết Minh
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {episodesForServer.length ? (
              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {episodesForServer.map((ep, idx) => (
                    <Link
                      key={`${activeServer || ""}-${ep.slug || ep.name || idx}`}
                      to={`/watch/${slug}?episode=${encodeURIComponent(
                        ep.slug || ep.name || `ep-${idx + 1}`
                      )}${
                        activeServer
                          ? `&server=${encodeURIComponent(activeServer)}`
                          : ""
                      }`}
                      className={`group flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        activeEpisode?.slug === ep.slug
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                          : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/60 hover:bg-white/10"
                      }`}
                    >
                      <Play
                        className={`h-4 w-4 mr-2 ${
                          activeEpisode?.slug === ep.slug
                            ? "text-white"
                            : "text-emerald-300"
                        }`}
                      />
                      {ep.name || `Tập ${idx + 1}`}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400">Chưa có tập.</p>
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
              <div className="flex overflow-x-auto gap-4 md:gap-6 pb-2 snap-x custom-scrollbar">
                {actors.map((actor) => {
                  return (
                    <Link
                      key={actor.name}
                      to={`/actor/${actor.id || actor.name}`}
                      className="flex flex-col items-center gap-2 min-w-[80px] sm:min-w-[96px] snap-start group/actor hover:-translate-y-1 transition-transform"
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

          <div id="comments">
            {movie && movie.slug && (
              <Comments movieSlug={movie.slug} movieName={movie.name} />
            )}
          </div>

          {relatedMovies.length > 0 && (
            <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <p className="text-sm uppercase tracking-[0.14em] text-slate-300">
                  Phim liên quan
                </p>
              </div>
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
                {relatedMovies.map((relMovie) => (
                  <div
                    key={relMovie.slug}
                    className="min-w-[170px] sm:min-w-[200px] snap-start"
                  >
                    <MovieCard movie={relMovie} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Watch;

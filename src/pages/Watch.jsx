import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Globe2,
  Info,
} from "lucide-react";
import { onSnapshot, doc, increment, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.config.js";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useWatchProgress } from "../hooks/useWatchProgress.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useActorsWithTmdbImages } from "../hooks/useActorsWithTmdbImages.js";
import Comments from "../components/Comments.jsx";
import RelatedMovies from "../components/RelatedMovies.jsx";
import {
  normalizeServerLabel,
  parseEpisodeNumber,
  isLastEpisode,
} from "../utils/episodes.js";

// Sub-components
import WatchHeader from "../components/watch/WatchHeader.jsx";
import PlayerSection from "../components/watch/PlayerSection.jsx";
import WatchSidebar from "../components/watch/WatchSidebar.jsx";
import WatchEpisodeGrid from "../components/watch/WatchEpisodeGrid.jsx";
import ActorSection from "../components/detail/ActorSection.jsx";
import SeasonSelector from "../components/SeasonSelector.jsx";
import { useSeries } from "../hooks/useSeries.js";

const PROVIDER_LABELS = {
  kkphim: "Nguồn 1",
  ophim: "Nguồn 2",
};

const PROVIDER_SOURCE_NAMES = {
  kkphim: "KKphim",
  ophim: "Ophim",
};

const normalizeProviderParam = (value) => {
  const lower = (value || "").toString().trim().toLowerCase();
  if (lower === "kkphim" || lower === "ophim") return lower;
  return null;
};

const buildEpisodeProviders = (episode) => {
  if (!episode) return {};
  const providers = { ...(episode._providers || {}) };
  const directLink = episode.link_m3u8 || episode.m3u8 || episode.linkplay || episode.link || "";
  const embedLink = episode.embed || "";
  const inferredProvider = normalizeProviderParam(episode._provider) || "kkphim";

  if (!providers[inferredProvider]?.link) {
    const fallbackLink = directLink || embedLink;
    if (fallbackLink) providers[inferredProvider] = { link: fallbackLink, kind: directLink ? "m3u8" : "embed" };
  }
  if (!providers.ophim?.link && embedLink && inferredProvider !== "ophim") {
    providers.ophim = { link: embedLink, kind: "embed" };
  }
  return providers;
};

const sortEpisodes = (list = []) =>
  list
    .map((ep, idx) => ({ ep, idx, num: parseEpisodeNumber(ep?.name || ep?.slug) }))
    .sort((a, b) => {
      const aHasNum = a.num !== null && a.num !== undefined;
      const bHasNum = b.num !== null && b.num !== undefined;
      if (aHasNum && bHasNum) return a.num - b.num;
      if (aHasNum) return -1;
      if (bHasNum) return 1;
      return a.idx - b.idx;
    })
    .map(({ ep }) => ep);

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
  const [deferLoad, setDeferLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDeferLoad(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const metaRef = useRef({ slug: null, name: null, episodeNumber: null, server: null, movieName: null, posterUrl: null });
  const [movieOverride, setMovieOverride] = useState(null);

  useEffect(() => {
    if (!db || !slug) return;
    return onSnapshot(doc(db, "movieOverrides", slug), (snap) => {
      setMovieOverride(snap.exists() ? snap.data() : { mode: "full" });
    }, (err) => {
      console.warn("MovieOverride error:", err);
      setMovieOverride({ mode: "full" });
    });
  }, [slug]);

  const [params, setParams] = useSearchParams();
  const selectedEpisode = params.get("episode");
  const selectedServerParam = params.get("server");
  const selectedProviderParam = normalizeProviderParam(params.get("provider"));

  const [autoProviderState, setAutoProviderState] = useState({ key: "", provider: null, notice: "" });
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const { data, isLoading } = useMovieDetail(slug);
  const { groups, currentSeason, nextSeason, isSeries } = useSeries(data?.movie);

  const { movie: baseMovie, episodes: baseEpisodes = [] } = data || {};
  const isTmdb = baseMovie?.slug?.startsWith("tmdb-");

  const needsAltSearch = isTmdb && (!baseEpisodes || baseEpisodes.length < 1);
  const { data: altResults = [], isLoading: loadingAlts } = useSearchMovies(needsAltSearch ? baseMovie?.name : "");

  const bestAltMatch = useMemo(() => {
    if (!isTmdb || loadingAlts) return null;
    const normalized = (text) => (text || "").toLowerCase().trim();
    const namesToMatch = [baseMovie?.name, baseMovie?.origin_name].map(normalized).filter(Boolean);
    const targetYear = baseMovie?.year;
    return altResults.find((m) => {
      const nameHit = namesToMatch.includes(normalized(m.name)) || namesToMatch.includes(normalized(m.origin_name));
      const yearHit = targetYear && m.year ? String(m.year) === String(targetYear) : true;
      return nameHit && yearHit;
    });
  }, [altResults, baseMovie, isTmdb, loadingAlts]);

  const altSlug = bestAltMatch?.slug;
  const { data: altDetail, isLoading: loadingAltDetail } = useMovieDetail(altSlug && altSlug !== slug ? altSlug : null);

  const movie = !isTmdb || !loadingAlts || bestAltMatch ? bestAltMatch || baseMovie : null;
  const episodes = altDetail?.episodes?.length ? altDetail.episodes : baseEpisodes;

  // Comprehensive loading state to prevent flickering during TMDB alternative search
  const isReallyLoading = isLoading || (needsAltSearch && loadingAlts) || (altSlug && altSlug !== slug && loadingAltDetail);
  const isNoMovie = !isLoading && !baseMovie && !loadingAlts;

  const serverGroups = useMemo(() => {
    const groups = {};
    (Array.isArray(episodes) ? episodes : []).forEach((ep) => {
      if (!ep) return;
      const label = normalizeServerLabel(ep.server_name);
      groups[label] = groups[label] || [];
      groups[label].push(ep);
    });
    return groups;
  }, [episodes]);

  const preferredServer = serverGroups.Vietsub?.length ? "Vietsub" : serverGroups["Thuyết Minh"]?.length ? "Thuyết Minh" : serverGroups["Lồng Tiếng"]?.length ? "Lồng Tiếng" : Object.keys(serverGroups)[0];
  const requestedServer = normalizeServerLabel(selectedServerParam);
  const activeServer = requestedServer && serverGroups[requestedServer]?.length ? requestedServer : preferredServer;
  const episodesForServer = sortEpisodes(serverGroups[activeServer] || []);

  const activeEpisode = episodesForServer.find((ep) => ep.slug === selectedEpisode) || episodesForServer[0] || null;
  const playbackScopeKey = `${slug || ""}__${activeServer || ""}__${activeEpisode?.slug || ""}`;

  const autoProviderOverride = autoProviderState.key === playbackScopeKey ? autoProviderState.provider : null;
  const autoProviderNotice = autoProviderState.key === playbackScopeKey ? autoProviderState.notice : "";
  const episodeProviders = buildEpisodeProviders(activeEpisode);

  const [prevScopeKey, setPrevScopeKey] = useState(playbackScopeKey);
  if (playbackScopeKey !== prevScopeKey) {
    setPrevScopeKey(playbackScopeKey);
    setUseEmbedFallback(false);
  }

  const availableProviders = Object.entries(episodeProviders).filter(([, v]) => v?.link).map(([k]) => k);
  const preferredProvider = normalizeProviderParam(activeEpisode?._preferredProvider) || availableProviders[0] || null;
  const activeProvider = (selectedProviderParam && episodeProviders[selectedProviderParam]?.link ? selectedProviderParam : null) || (autoProviderOverride && episodeProviders[autoProviderOverride]?.link ? autoProviderOverride : null) || preferredProvider;
  const activeProviderLabel = PROVIDER_LABELS[activeProvider] || "Mặc định";

  const activeSource = useEmbedFallback ? activeEpisode?.link_embed || activeEpisode?.embed || "" : (activeProvider ? episodeProviders[activeProvider]?.link : "") || activeEpisode?.link_m3u8 || activeEpisode?.embed || "";

  const currentIndex = activeEpisode ? episodesForServer.findIndex((ep) => ep.slug === activeEpisode.slug) : -1;
  const nextEpisode = currentIndex >= 0 ? episodesForServer[currentIndex + 1] || null : null;

  const handleProviderChange = useCallback((provider) => {
    const nextParams = new URLSearchParams(params);
    if (provider === "auto") {
      nextParams.delete("provider");
      setAutoProviderState({ key: playbackScopeKey, provider: null, notice: "" });
    } else {
      nextParams.set("provider", provider);
      setAutoProviderState({ key: playbackScopeKey, provider: null, notice: "" });
    }
    setParams(nextParams, { replace: true });
  }, [params, playbackScopeKey, setParams, setAutoProviderState]);

  const handlePlaybackIssue = useCallback((reason) => {
    if (selectedProviderParam || !activeProvider) return;
    const fallbackProvider = availableProviders.find(p => p !== activeProvider && episodeProviders[p]?.link);
    if (!fallbackProvider) return;

    setAutoProviderState((prev) => {
      if (prev.key === playbackScopeKey && prev.notice) return prev;
      const isDeadSource = ["manifest-error", "fatal-hls", "network-error", "network-timeout"].includes(reason);
      if (isDeadSource && activeEpisode?.link_embed && !useEmbedFallback) {
        setUseEmbedFallback(true);
        return { key: playbackScopeKey, provider: prev.provider || null, notice: `Nguồn ${activeProviderLabel} gặp sự cố kỹ thuật. Hệ thống đang tự động chuyển sang Trình phát dự phòng.` };
      }
      return { key: playbackScopeKey, provider: prev.provider || null, notice: `${PROVIDER_LABELS[activeProvider] || activeProvider} đang chậm. Vui lòng thử chuyển sang nguồn khác.` };
    });
  }, [selectedProviderParam, activeProvider, activeProviderLabel, availableProviders, episodeProviders, playbackScopeKey, activeEpisode?.link_embed, useEmbedFallback, setAutoProviderState, setUseEmbedFallback]);

  const handleServerChange = useCallback((serverLabel) => {
    const targetLabel = normalizeServerLabel(serverLabel);
    if (!targetLabel || targetLabel === activeServer) return;
    const candidates = sortEpisodes(serverGroups[targetLabel] || []);
    if (!candidates.length) return;
    const nextSlug = (candidates.find(ep => ep.slug === params.get("episode")) || candidates[0]).slug;
    const nextParams = new URLSearchParams(params);
    nextParams.set("server", targetLabel);
    nextParams.set("episode", nextSlug);
    setParams(nextParams, { replace: true });
  }, [activeServer, serverGroups, params, setParams]);

  useEffect(() => {
    if (selectedEpisode && playerRef.current) playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedEpisode]);

  const onTimeUpdate = useCallback((currentTime, duration) => {
    progressRef.current = { currentTime, duration };
    if (!user || !slug || !activeEpisode) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;
    saveProgress(slug, {
      episodeSlug: activeEpisode.slug || activeEpisode.name,
      episodeName: activeEpisode.name,
      episodeNumber: parseEpisodeNumber(activeEpisode.name || activeEpisode.slug),
      server: activeServer || null,
      currentTime, duration,
      movieName: movie?.name,
      seasonNumber: currentSeason,
      posterUrl: movie?.poster_url || movie?.thumb_url || movie?.backdrop_url,
    });
  }, [user, slug, activeEpisode, activeServer, saveProgress, movie, currentSeason]);

  useEffect(() => {
    if (activeEpisode) {
      metaRef.current = {
        slug: activeEpisode.slug || activeEpisode.name,
        name: activeEpisode.name,
        episodeNumber: parseEpisodeNumber(activeEpisode.name || activeEpisode.slug),
        server: activeServer || null,
        movieName: movie?.name,
        posterUrl: movie?.poster_url || movie?.thumb_url || movie?.backdrop_url,
      };
    }
  }, [activeEpisode, activeServer, movie]);

  useEffect(() => {
    return () => {
      if (!user || !slug) return;
      const { currentTime, duration } = progressRef.current;
      const m = metaRef.current;
      if (currentTime > 10) forceSave(slug, { ...m, episodeSlug: m.slug, episodeName: m.name, currentTime, duration });
    };
  }, [user, slug, forceSave]);

  useEffect(() => {
    if (!episodesForServer.length) return;
    const nextParams = new URLSearchParams(params);
    let changed = false;
    if (activeServer && params.get("server") !== activeServer) { nextParams.set("server", activeServer); changed = true; }
    if (!episodesForServer.some(ep => ep.slug === params.get("episode"))) { nextParams.set("episode", episodesForServer[0].slug); changed = true; }
    if (changed) setParams(nextParams, { replace: true });
  }, [episodesForServer, activeServer, params, setParams]);

  useEffect(() => {
    if (!slug || !db) return;
    setDoc(doc(db, "movieViews", slug), {
      slug,
      name: movie?.name || movie?.title || slug,
      poster: movie?.poster_url || movie?.thumb_url || "",
      views: increment(1),
      lastViewedAt: serverTimestamp(),
    }, { merge: true }).catch(err => console.warn("[ViewTracking] Error updating views:", err));
  }, [slug, movie]);

  const actors = useMemo(() => {
    const baseActors = baseMovie?.slug?.startsWith("tmdb-") ? baseMovie?.actor : null;
    const pools = [baseActors, movie?.actor, movie?.actors, movie?.cast, movie?.origin?.actor, movie?.origin?.actors, movie?.origin?.cast];
    const collect = pools.flatMap((item) => {
      if (!item) return [];
      if (Array.isArray(item)) return item;
      if (typeof item === "string") return item.split(/[,/|]/);
      return [];
    });
    const normalized = collect.map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return { id: null, name: entry.trim(), image: null };
      if (typeof entry === "object") return {
        id: entry.id || entry.tmdb_id || entry.person_id || null,
        name: String(entry.name || entry.full_name || entry.title || "").trim(),
        image: entry.avatar || entry.image || entry.profile_path || entry.photo || entry.thumbnail || null,
      };
      return null;
    }).filter((item) => item && item.name);
    const seen = new Set();
    return normalized.filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  }, [movie, baseMovie]);

  const { data: actorsWithImages = actors } = useActorsWithTmdbImages(actors);

  // 1. Initial Loading State
  if (isReallyLoading || (!deferLoad && !movie)) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.03),transparent_50%)]" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="loader-orbit loader-orbit-lg"></div>
        {/* Loading text removed for minimalist feel */}
      </div>
    </div>
  );

  // 2. Not Found State
  if (isNoMovie || (!movie && !isReallyLoading)) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-2xl">
        <Globe2 className="h-10 w-10 text-slate-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Không tìm thấy phim</h2>
        <p className="text-slate-400 max-w-md mx-auto">Vui lòng kiểm tra lại đường dẫn hoặc quay lại trang chủ để tìm kiếm những bộ phim khác.</p>
      </div>
      <Link to="/" className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20">
        Quay lại trang chủ
      </Link>
    </div>
  );

  // 3. No Sources State (After all fallbacks failed)
  if (!episodes.length && !isReallyLoading) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-2xl">
        <Info className="h-10 w-10 text-amber-500" />
      </div>
      <div className="space-y-3">
        <p className="text-white font-bold text-xl">{isTmdb ? "Dữ liệu nguồn phim đang gặp sự cố" : "Phim này chưa có nguồn phát"}</p>
        <div className="pt-4">
          <Link to={`/movie/${slug}`} className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold group transition-all">
            <Info className="h-5 w-5 group-hover:scale-110 transition-transform" /> 
            Quay lại trang chi tiết
          </Link>
        </div>
      </div>
    </div>
  );

  const countryText = (movie?.country || []).map(c => c.name || c).join(", ");
  const categoriesText = (movie?.category || []).map(c => c.name || c).join(", ");

  return (
    <div className="space-y-8 pb-12">
      <WatchHeader movie={movie} activeEpisode={activeEpisode} episodes={episodes} autoProviderNotice={autoProviderNotice} />

      {/* Row 1: Player & Information/Actors */}
      <div className="grid gap-8 items-stretch transition-all duration-500 xl:grid-cols-[1fr,380px] 2xl:grid-cols-[1fr,420px]">
        <div className="w-full">
          <PlayerSection 
            playerRef={playerRef} movieOverride={movieOverride} activeSource={activeSource} movie={movie}
            activeEpisode={activeEpisode} episodes={episodes} activeServer={activeServer} activeProviderLabel={activeProviderLabel}
            onNextEpisode={
              nextEpisode 
                ? () => navigate(`/watch/${slug}?episode=${nextEpisode.slug}&server=${activeServer}${selectedProviderParam ? `&provider=${selectedProviderParam}` : ""}`) 
                : (isLastEpisode(activeEpisode, movie) && nextSeason)
                ? () => navigate(`/watch/${nextSeason.slug}?episode=1`)
                : null
            }
            onTimeUpdate={onTimeUpdate} initialTime={initialTime}
            onPlaybackIssue={handlePlaybackIssue}
            nextSeason={nextSeason}
            isLastEpisodeOfSeason={isLastEpisode(activeEpisode, movie)}
          />
        </div>
        
        <div className="hidden xl:flex flex-col gap-6 h-full min-h-0">
          <WatchSidebar movie={movie} episodes={episodes} countryText={countryText} categoriesText={categoriesText} />
          <ActorSection actorsWithImages={actorsWithImages} variant="sidebar" />
        </div>
      </div>

      {/* Row 2: Grid/Comments & Related Movies */}
      <div className="grid gap-8 items-start xl:grid-cols-[1fr,380px] 2xl:grid-cols-[1fr,420px]">
        <div className="space-y-8">
          {isSeries && (
            <div className="pb-4">
              <SeasonSelector 
                groups={groups} 
                currentSeason={currentSeason} 
                currentSlug={slug}
              />
            </div>
          )}

          <WatchEpisodeGrid 
            serverGroups={serverGroups} activeServer={activeServer} handleServerChange={handleServerChange}
            episodesForServer={episodesForServer} activeEpisode={activeEpisode} slug={slug}
            activeProvider={activeProvider} handleProviderChange={handleProviderChange} availableProviders={availableProviders}
          />

          <div className="xl:hidden space-y-8">
            <WatchSidebar movie={movie} episodes={episodes} countryText={countryText} categoriesText={categoriesText} />
            <ActorSection actorsWithImages={actorsWithImages} isMobile={true} />
          </div>

          {movie?.slug && <Comments movieSlug={movie.slug} movieName={movie.name} />}
        </div>

        <div>
          <RelatedMovies movie={movie} variant="list" />
        </div>
      </div>
    </div>
  );
};

export default Watch;

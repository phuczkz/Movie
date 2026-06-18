import { useCallback, useEffect, useRef, useMemo, useState, lazy, Suspense } from "react";
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
import { onSnapshot, doc, increment, setDoc, updateDoc, serverTimestamp, arrayUnion, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.config.js";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useWatchProgress } from "../hooks/useWatchProgress.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useActorsWithTmdbImages } from "../hooks/useActorsWithTmdbImages.js";
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
import WatchMobileTabs from "../components/watch/WatchMobileTabs.jsx";
import ActorSection from "../components/detail/ActorSection.jsx";
import SeasonSelector from "../components/SeasonSelector.jsx";
import { useSeries } from "../hooks/useSeries.js";
import WatchSubtitles from "../components/watch/WatchSubtitles.jsx";

const Comments = lazy(() => import("../components/Comments.jsx"));
const WatchTogetherModal = lazy(() => import("../components/watch/WatchTogetherModal.jsx"));
const WatchChat = lazy(() => import("../components/watch/WatchChat.jsx"));

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
  const { user, userProfile } = useAuth();
  const { saveProgress, forceSave } = useWatchProgress();

  const [params, setParams] = useSearchParams();

  // Freeze initialTime per-episode: đọc từ location.state một lần duy nhất khi tập (episode) thay đổi.
  // Tránh việc setParams (cập nhật URL) làm mất location.state và reset initialTime về 0,
  // nhưng đồng thời đảm bảo chuyển sang tập mới thì initialTime = 0 chứ không kế thừa tập cũ.
  const currentEpisodeSlug = params.get("episode") || "default";
  const episodeInitialTimeRef = useRef({ slug: null, episode: null, time: 0 });
  
  if (episodeInitialTimeRef.current.slug !== slug || episodeInitialTimeRef.current.episode !== currentEpisodeSlug) {
    episodeInitialTimeRef.current = {
      slug,
      episode: currentEpisodeSlug,
      time: (typeof location.state?.initialTime === "number" && location.state.initialTime > 0)
        ? location.state.initialTime
        : 0,
    };
  }
  const initialTime = episodeInitialTimeRef.current.time;
  const progressRef = useRef({ currentTime: 0, duration: 0 });
  const lastSaveRef = useRef(0);
  const failedProvidersRef = useRef(new Set());
  const [deferLoad, setDeferLoad] = useState(false);
  const [mobileTab, setMobileTab] = useState("episodes");
  const [subtitles, setSubtitles] = useState([]);
  // Thay đổi mặc định hiển thị phụ đề sang false để tránh tự động gọi API tìm kiếm khi vào xem phim
  const [showSubtitleOverlay, setShowSubtitleOverlay] = useState(false);
  const [selectedSubLanguage, setSelectedSubLanguage] = useState("zh");

  // Prevent duplicate rendering on mobile by tracking desktop state
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 1280 : true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1280);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const roomId = params.get("room") || null;
  const setRoomId = useCallback((newId) => {
    const nextParams = new URLSearchParams(params);
    if (newId) {
      nextParams.set("room", newId);
    } else {
      nextParams.delete("room");
    }
    setParams(nextParams, { replace: true });
  }, [params, setParams]);

  const [roomData, setRoomData] = useState(null);
  const roomDataRef = useRef(null);
  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);
  const [isWatchTogetherModalOpen, setIsWatchTogetherModalOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const isSyncing = useRef(false);

  const isHost = Boolean(user && roomData && roomData.hostUid === user.uid);
  const isMember = Boolean(user && roomData && roomData.hostUid !== user.uid);

  const [sidebarTab, setSidebarTab] = useState("info");

  // Keep mobile tab on "chat" if mobile active tab changes and we enter room
  useEffect(() => {
    if (roomId && mobileTab === "episodes") {
      setMobileTab("chat");
    }
  }, [roomId, mobileTab, setMobileTab]);

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
    const namesToMatch = [baseMovie?.name, baseMovie?.origin_name].flatMap(n => n ? [normalized(n)] : []);
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
  const displayEpisodes = useMemo(() => serverGroups[preferredServer] || episodes, [serverGroups, preferredServer, episodes]);
  const requestedServer = normalizeServerLabel(selectedServerParam);
  const activeServer = requestedServer && serverGroups[requestedServer]?.length ? requestedServer : preferredServer;
  const episodesForServer = sortEpisodes(serverGroups[activeServer] || []);

  const activeEpisode = episodesForServer.find((ep) => ep.slug === selectedEpisode) || episodesForServer[0] || null;
  const playbackScopeKey = `${slug || ""}__${activeServer || ""}__${activeEpisode?.slug || ""}`;

  const autoProviderOverride = autoProviderState.key === playbackScopeKey ? autoProviderState.provider : null;
  const autoProviderNotice = autoProviderState.key === playbackScopeKey ? autoProviderState.notice : "";
  const episodeProviders = buildEpisodeProviders(activeEpisode);

  const prevScopeKeyRef = useRef(playbackScopeKey);
  const prevProviderRef = useRef(selectedProviderParam);
  if (playbackScopeKey !== prevScopeKeyRef.current || selectedProviderParam !== prevProviderRef.current) {
    prevScopeKeyRef.current = playbackScopeKey;
    prevProviderRef.current = selectedProviderParam;
    setUseEmbedFallback(false);
    // Clear failed providers when scope or selected provider changes to ensure a fresh start
    failedProvidersRef.current.clear();
  }

  const availableProviders = Object.entries(episodeProviders).flatMap(([k, v]) => v?.link ? [k] : []);
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
      failedProvidersRef.current.clear();
    } else {
      nextParams.set("provider", provider);
      setAutoProviderState({ key: playbackScopeKey, provider: null, notice: "" });
      // Clear all failed providers on manual switch to start fresh
      failedProvidersRef.current.clear();
    }
    setParams(nextParams, { replace: true });
  }, [params, playbackScopeKey, setParams, setAutoProviderState]);

  const handlePlaybackIssue = useCallback((reason) => {
    if (!activeProvider) return;

    // Mark the current provider as failed
    failedProvidersRef.current.add(activeProvider);

    // Find another provider that hasn't failed yet
    const fallbackProvider = availableProviders.find(
      p => p !== activeProvider && !failedProvidersRef.current.has(p) && episodeProviders[p]?.link
    );

    // If there's a fallback provider, update URL/params accordingly
    if (fallbackProvider) {
      const nextParams = new URLSearchParams(params);
      nextParams.delete("provider"); // Remove hardcoded provider param to let auto-provider switch
      setParams(nextParams, { replace: true });
    }

    setAutoProviderState((prev) => {
      // If we already have a notice for this specific playback scope, skip updating to avoid UI flickering
      if (prev.key === playbackScopeKey && prev.notice) return prev;

      const isDeadSource = ["manifest-error", "fatal-hls", "network-error", "network-timeout"].includes(reason);

      // If a working fallback provider is found
      if (fallbackProvider) {
        return {
          key: playbackScopeKey,
          provider: fallbackProvider,
          notice: `Nguồn ${activeProviderLabel} đang gặp sự cố. Hệ thống tự động chuyển sang Nguồn ${PROVIDER_LABELS[fallbackProvider] || fallbackProvider}.`
        };
      }

      // If all main sources failed, try embed fallback iframe
      if (isDeadSource && activeEpisode?.link_embed && !useEmbedFallback) {
        setUseEmbedFallback(true);
        return {
          key: playbackScopeKey,
          provider: prev.provider || null,
          notice: `Các nguồn chính gặp sự cố kỹ thuật. Hệ thống tự động chuyển sang Trình phát dự phòng.`
        };
      }

      // Absolutely no sources work
      return {
        key: playbackScopeKey,
        provider: prev.provider || null,
        notice: `Server lưu trữ video đang gặp vấn đề hoặc quá tải. Vui lòng quay lại sau.`
      };
    });
  }, [activeProvider, activeProviderLabel, availableProviders, episodeProviders, playbackScopeKey, activeEpisode?.link_embed, useEmbedFallback, setAutoProviderState, setUseEmbedFallback, params, setParams]);

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

  // 1. Listen to Room document in Firestore
  useEffect(() => {
    if (!db || !roomId) {
      setRoomData(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "watchRooms", roomId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomData(data);
      } else {
        // Room closed/deleted
        setRoomData(null);
        setRoomId(null);
      }
    }, (error) => {
      console.error("Lỗi lắng nghe phòng xem chung:", error);
    });

    return () => unsubscribe();
  }, [roomId, setRoomId]);

  // 1b. Member: Check Host Heartbeat (Online Status)
  useEffect(() => {
    if (!roomId || isHost) return;

    const interval = setInterval(() => {
      const currentData = roomDataRef.current;
      if (!currentData?.playerState?.updatedAt) return;

      const updatedAt = currentData.playerState.updatedAt;
      const updateMs = updatedAt.toMillis ? updatedAt.toMillis() : Date.now();
      const diffSeconds = (Date.now() - updateMs) / 1000;

      if (diffSeconds > 60) { // Host offline for more than 60 seconds
        alert("Chủ phòng đã ngoại tuyến. Bạn sẽ được đưa ra khỏi phòng xem chung.");
        setRoomId(null);
        setRoomData(null);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [roomId, isHost, setRoomId]);


  // 1d. Host: Heartbeat timer to keep room alive (runs even when video is paused)
  useEffect(() => {
    if (!isHost || !roomId || !db) return;

    const interval = setInterval(async () => {
      try {
        const roomRef = doc(db, "watchRooms", roomId);
        await updateDoc(roomRef, {
          "playerState.updatedAt": serverTimestamp(),
        });
      } catch (err) {
        console.warn("Lỗi gửi heartbeat chủ phòng:", err);
      }
    }, 15000); // Send heartbeat every 15 seconds

    return () => clearInterval(interval);
  }, [isHost, roomId]);

  // 1e. Participant Presence: Register active status in the room
  useEffect(() => {
    if (!roomId || !user || !db) return;

    const memberRef = doc(db, `watchRooms/${roomId}/members`, user.uid);
    const updatePresence = async () => {
      try {
        const displayName = userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Người dùng";
        const photoURL = userProfile?.photoURL || user.photoURL || null;
        await setDoc(memberRef, {
          userId: user.uid,
          userName: displayName,
          userAvatar: photoURL,
          lastActive: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn("Lỗi cập nhật hiện diện:", err);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 15000); // presence heartbeat every 15s

    return () => {
      clearInterval(interval);
      deleteDoc(memberRef).catch(() => { });
    };
  }, [roomId, user, userProfile]);

  // 2. Member: Sync Movie/Episode/Server/Provider from Firestore room state
  useEffect(() => {
    if (!roomData || isHost || !roomId) return;

    const nextParams = new URLSearchParams(params);
    let changed = false;

    if (roomData.movieSlug && roomData.movieSlug !== slug) {
      navigate(`/watch/${roomData.movieSlug}?room=${roomId}&episode=${roomData.episodeSlug}&server=${roomData.server || "Vietsub"}${roomData.provider ? `&provider=${roomData.provider}` : ""}`, { replace: true });
      return;
    }

    if (roomData.episodeSlug && roomData.episodeSlug !== params.get("episode")) {
      nextParams.set("episode", roomData.episodeSlug);
      changed = true;
    }
    if (roomData.server && roomData.server !== params.get("server")) {
      nextParams.set("server", roomData.server);
      changed = true;
    }
    if (roomData.provider && roomData.provider !== params.get("provider")) {
      nextParams.set("provider", roomData.provider);
      changed = true;
    } else if (!roomData.provider && params.get("provider")) {
      nextParams.delete("provider");
      changed = true;
    }

    if (changed) {
      setParams(nextParams, { replace: true });
    }
  }, [roomData, isHost, slug, params, setParams, navigate, roomId]);

  // 3. Host: Sync Episode / Server / Provider changes to Firestore
  useEffect(() => {
    if (!isHost || !roomId || !db) return;

    const updateRoomEpisode = async () => {
      try {
        const roomRef = doc(db, "watchRooms", roomId);
        await setDoc(roomRef, {
          episodeSlug: activeEpisode?.slug || "",
          server: activeServer || "Vietsub",
          provider: activeProvider || "",
          playerState: {
            isPlaying: false,
            currentTime: 0,
            updatedAt: serverTimestamp(),
          }
        }, { merge: true });
      } catch (err) {
        console.warn("Lỗi cập nhật tập lên phòng Firestore:", err);
      }
    };

    updateRoomEpisode();
  }, [activeEpisode, activeServer, activeProvider, isHost, roomId]);

  // 4. Host: Sync Player playback state (Play/Pause/Seek) to Firestore
  useEffect(() => {
    if (!player || !isHost || !roomId || !db) return;

    const updatePlayerState = async (isPlaying, currentTime) => {
      try {
        const roomRef = doc(db, "watchRooms", roomId);
        await setDoc(roomRef, {
          playerState: {
            isPlaying,
            currentTime,
            updatedAt: serverTimestamp(),
          }
        }, { merge: true });
      } catch (err) {
        console.error("Lỗi cập nhật trạng thái trình phát lên phòng:", err);
      }
    };

    const onPlay = () => {
      if (isSyncing.current) return;
      updatePlayerState(true, player.video.currentTime);
    };

    const onPause = () => {
      if (isSyncing.current) return;
      updatePlayerState(false, player.video.currentTime);
    };

    const onSeeked = () => {
      if (isSyncing.current) return;
      updatePlayerState(!player.video.paused, player.video.currentTime);
    };

    let lastTimeUpdate = 0;
    const onTimeUpdate = () => {
      if (isSyncing.current) return;
      const now = Date.now();
      if (now - lastTimeUpdate > 5000) {
        lastTimeUpdate = now;
        updatePlayerState(!player.video.paused, player.video.currentTime);
      }
    };

    player.on("video:play", onPlay);
    player.on("video:pause", onPause);
    player.on("video:seeked", onSeeked);
    player.on("video:timeupdate", onTimeUpdate);

    return () => {
      player.off("video:play", onPlay);
      player.off("video:pause", onPause);
      player.off("video:seeked", onSeeked);
      player.off("video:timeupdate", onTimeUpdate);
    };
  }, [player, isHost, roomId]);

  // 5. Member: Sync Player playback state from Firestore
  useEffect(() => {
    if (!player || !roomData || isHost || !roomData.playerState) return;

    const { isPlaying, currentTime } = roomData.playerState;

    isSyncing.current = true;

    // Sync Play/Pause
    if (isPlaying && player.video.paused) {
      player.play().catch(() => { });
    } else if (!isPlaying && !player.video.paused) {
      player.pause();
    }

    // Sync Time with fixed latency estimation (avoids client-clock desync)
    const hostTimeAdjusted = currentTime + (isPlaying ? 0.2 : 0);
    const videoEl = player.video;
    const timeDiff = Math.abs(videoEl.currentTime - hostTimeAdjusted);

    if (timeDiff > 1.5) {
      // eslint-disable-next-line react-hooks/immutability
      videoEl.currentTime = hostTimeAdjusted;
    }

    // Return cleanup to prevent isSyncing leak on fast re-renders
    const timer = setTimeout(() => {
      isSyncing.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, [player, roomData, isHost]);

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
    const currentProgressRef = progressRef;
    const currentMetaRef = metaRef;
    return () => {
      if (!user || !slug) return;
      const { currentTime, duration } = currentProgressRef.current;
      const m = currentMetaRef.current;
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
    const updateData = {
      slug,
      name: movie?.name || movie?.title || slug,
      poster: movie?.poster_url || movie?.thumb_url || "",
      views: increment(1),
      lastViewedAt: serverTimestamp(),
    };

    if (user?.uid) {
      updateData.userIds = arrayUnion(user.uid);
    }

    setDoc(doc(db, "movieViews", slug), updateData, { merge: true })
      .catch(err => console.warn("[ViewTracking] Error updating views:", err));
  }, [slug, movie, user]);

  const actors = useMemo(() => {
    const baseActors = baseMovie?.slug?.startsWith("tmdb-") ? baseMovie?.actor : null;
    const pools = [baseActors, movie?.actor, movie?.actors, movie?.cast, movie?.origin?.actor, movie?.origin?.actors, movie?.origin?.cast];
    const collect = pools.flatMap((item) => {
      if (!item) return [];
      if (Array.isArray(item)) return item;
      if (typeof item === "string") return item.split(/[,/|]/);
      return [];
    });
    const normalized = collect.flatMap((entry) => {
      if (!entry) return [];
      let item = null;
      if (typeof entry === "string") {
        item = { id: null, name: entry.trim(), image: null };
      } else if (typeof entry === "object") {
        item = {
          id: entry.id || entry.tmdb_id || entry.person_id || null,
          name: String(entry.name || entry.full_name || entry.title || "").trim(),
          image: entry.avatar || entry.image || entry.profile_path || entry.photo || entry.thumbnail || null,
        };
      }
      return (item && item.name) ? [item] : [];
    });
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
      <div className="size-20 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-2xl">
        <Globe2 className="size-10 text-slate-500" />
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
      <div className="size-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-2xl">
        <Info className="size-10 text-amber-500" />
      </div>
      <div className="space-y-3">
        <p className="text-white font-bold text-xl">{isTmdb ? "Dữ liệu nguồn phim đang gặp sự cố" : "Phim này chưa có nguồn phát"}</p>
        <div className="pt-4">
          <Link to={`/movie/${slug}`} className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold group transition-all">
            <Info className="size-5 group-hover:scale-110 transition-transform" />
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
      {isMember && (
        <style>{`
          .art-progress,
          .art-control-play,
          .art-video {
            pointer-events: none !important;
            opacity: 0.95;
          }
          .art-controls-right {
            pointer-events: auto !important;
          }
        `}</style>
      )}

      <WatchHeader
        movie={movie}
        autoProviderNotice={autoProviderNotice}
        onOpenWatchTogether={() => setIsWatchTogetherModalOpen(true)}
        hasActiveRoom={Boolean(roomId)}
      />

      {/* Row 1: Player & Information/Actors */}
      <div className="grid gap-8 items-stretch transition-all duration-500 xl:grid-cols-[1fr,380px] 2xl:grid-cols-[1fr,420px]">
        <div className="w-full">
          <PlayerSection
            playerRef={playerRef} movieOverride={movieOverride} activeSource={activeSource} movie={movie}
            activeEpisode={activeEpisode} episodes={displayEpisodes} activeServer={activeServer} activeProviderLabel={activeProviderLabel}
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
            onReady={setPlayer}
            player={player}
            subtitles={subtitles}
            showSubtitleOverlay={showSubtitleOverlay}
            setShowSubtitleOverlay={setShowSubtitleOverlay}
            selectedSubLanguage={selectedSubLanguage}
            setSelectedSubLanguage={setSelectedSubLanguage}
          />
        </div>

        {isDesktop && (
          <div className="hidden xl:flex flex-col gap-6 h-full min-h-0 overflow-hidden">
            <div className="flex border-b border-white/10 pb-1">
              <button
                type="button"
                onClick={() => setSidebarTab("info")}
                className={`flex-1 pb-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${sidebarTab === "info"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
              >
                Thông tin phim
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("subtitles")}
                className={`flex-1 pb-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${sidebarTab === "subtitles"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
              >
                Phụ đề gốc
              </button>
              {roomId && (
                <button
                  type="button"
                  onClick={() => setSidebarTab("chat")}
                  className={`flex-1 pb-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${sidebarTab === "chat"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Trò chuyện
                </button>
              )}
            </div>

            {sidebarTab === "info" && (
              <>
                <WatchSidebar movie={movie} episodes={displayEpisodes} countryText={countryText} categoriesText={categoriesText} />
                <ActorSection actorsWithImages={actorsWithImages} variant="sidebar" />
              </>
            )}

            <div className={sidebarTab === "subtitles" ? "block" : "hidden"}>
              <WatchSubtitles
                player={player}
                slug={slug}
                activeEpisode={activeEpisode}
                movie={movie}
                subtitles={subtitles}
                setSubtitles={setSubtitles}
                showSubtitleOverlay={showSubtitleOverlay}
                setShowSubtitleOverlay={setShowSubtitleOverlay}
                selectedLanguage={selectedSubLanguage}
                setSelectedLanguage={setSelectedSubLanguage}
              />
            </div>

            {sidebarTab === "chat" && roomId && (
              <Suspense fallback={<div className="text-slate-400 text-sm p-4">Đang tải cuộc trò chuyện...</div>}>
                <WatchChat roomId={roomId} roomHostId={roomData?.hostId} />
              </Suspense>
            )}
          </div>
        )}
      </div>

      {/* Mobile/Tablet Tabs */}
      {!isDesktop && (
        <WatchMobileTabs activeTab={mobileTab} onTabChange={setMobileTab} hasRoom={Boolean(roomId)} />
      )}

      {/* Row 2: Grid/Comments & Related Movies */}
      <div className="grid gap-8 items-start xl:grid-cols-[1fr,380px] 2xl:grid-cols-[1fr,420px]">
        <div className="space-y-8">
          {/* Desktop: always show all sections */}
          {isDesktop && (
            <div className="hidden xl:block space-y-8">
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
              {movie?.slug && (
                <Suspense fallback={<div className="text-slate-400 text-sm">Đang tải bình luận...</div>}>
                  <Comments movieSlug={movie.slug} movieName={movie.name} />
                </Suspense>
              )}
            </div>
          )}

          {/* Mobile/Tablet: tab-based content */}
          {!isDesktop && (
            <div className="xl:hidden space-y-8">
              {mobileTab === "episodes" && (
                <>
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
                  <WatchSidebar movie={movie} episodes={displayEpisodes} countryText={countryText} categoriesText={categoriesText} />
                  {movie?.slug && (
                    <Suspense fallback={<div className="text-slate-400 text-sm">Đang tải bình luận...</div>}>
                      <Comments movieSlug={movie.slug} movieName={movie.name} />
                    </Suspense>
                  )}
                </>
              )}

              <div className={mobileTab === "subtitles" ? "block" : "hidden"}>
                <WatchSubtitles
                  player={player}
                  slug={slug}
                  activeEpisode={activeEpisode}
                  movie={movie}
                  subtitles={subtitles}
                  setSubtitles={setSubtitles}
                  showSubtitleOverlay={showSubtitleOverlay}
                  setShowSubtitleOverlay={setShowSubtitleOverlay}
                  selectedLanguage={selectedSubLanguage}
                  setSelectedLanguage={setSelectedSubLanguage}
                />
              </div>

              {mobileTab === "chat" && roomId && (
                <Suspense fallback={<div className="text-slate-400 text-sm p-4">Đang tải cuộc trò chuyện...</div>}>
                  <WatchChat roomId={roomId} roomHostId={roomData?.hostId} />
                </Suspense>
              )}

              {mobileTab === "actors" && (
                <ActorSection actorsWithImages={actorsWithImages} isMobile={true} />
              )}

            </div>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <WatchTogetherModal
          isOpen={isWatchTogetherModalOpen}
          onClose={() => setIsWatchTogetherModalOpen(false)}
          roomId={roomId}
          setRoomId={setRoomId}
          isHost={isHost}
          movie={movie}
          activeEpisode={activeEpisode}
          activeServer={activeServer}
          activeProvider={activeProvider}
        />
      </Suspense>
    </div>
  );
};

export default Watch;

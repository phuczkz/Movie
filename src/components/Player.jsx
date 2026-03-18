import Hls from "hls.js";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Lazy-load ReactPlayer — only downloaded when the non-HLS / non-iframe path is
// actually rendered. This saves ~100 KB gzipped on the critical path for HLS
// streams, which is the primary use-case.
const ReactPlayer = React.lazy(() => import("react-player"));
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Volume2,
  VolumeX,
  Gauge,
  SlidersHorizontal,
  MoreVertical,
} from "lucide-react";

const SEEK_STEP = 10; // seconds
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const MOBILE_MEDIA_QUERY = "(max-width: 640px)";

// Remove ad fragments from HLS playlists by filtering out any lines/segments containing known ad markers.
const stripAdSegmentsFromPlaylist = (text = "") => {
  const lines = text.split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (line.startsWith("#EXTINF")) {
      const next = lines[i + 1];
      if (next && next.includes("adjump")) {
        if (out.length && out[out.length - 1] === "#EXT-X-DISCONTINUITY") {
          out.pop();
        }
        i += 1;
        continue;
      }
    }

    if (line.includes("adjump")) continue;
    out.push(line);
  }

  return out.join("\n");
};

const Player = ({
  source,
  poster,
  title,
  subtitle,
  actionSlot,
  onNextEpisode,
  hasNextEpisode = true,
}) => {
  const videoRef = useRef(null);
  const reactPlayerRef = useRef(null);
  const containerRef = useRef(null);
  const ignoreNextClickRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hlsRef = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const canUseIframe = useMemo(
    () => source && (source.includes("iframe") || source.includes("embed")),
    [source]
  );
  const isHls = useMemo(
    () => Boolean(source && source.endsWith(".m3u8")),
    [source]
  );

  const [filteredSource, setFilteredSource] = useState(null);
  const playlistObjectUrlRef = useRef(null);
  const needsFilter = isHls && Boolean(source) && !Hls.isSupported();
  const effectiveSource = needsFilter ? filteredSource || source : source;

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [qualityLevels, setQualityLevels] = useState([]); // [{label, level}]
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 auto
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const hideControlsTimeout = useRef(null);

  useEffect(() => {
    // Reset visual state when source changes
    const resetId = setTimeout(() => {
      setDuration(0);
      setProgress(0);
      setIsBuffering(true);
      setControlsVisible(true);
      setPlaying(false);
    }, 0);
    return () => clearTimeout(resetId);
  }, [source]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA_QUERY);
    const update = () => setIsSmallScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = null;
    }
  }, []);

  // Safari/native HLS: fetch playlist, drop ad fragments, and serve filtered blob
  useEffect(() => {
    let cancelled = false;
    const revoke = () => {
      if (playlistObjectUrlRef.current) {
        URL.revokeObjectURL(playlistObjectUrlRef.current);
        playlistObjectUrlRef.current = null;
      }
    };

    if (!needsFilter || !source) {
      revoke();
      return undefined;
    }

    const fetchAndFilter = async () => {
      try {
        const res = await fetch(source, { cache: "no-store" });
        const text = await res.text();
        if (cancelled) return;

        const filtered = stripAdSegmentsFromPlaylist(text);
        const blob = new Blob([filtered], {
          type: "application/vnd.apple.mpegurl",
        });
        revoke();
        playlistObjectUrlRef.current = URL.createObjectURL(blob);
        setFilteredSource(playlistObjectUrlRef.current);
      } catch {
        if (!cancelled) setFilteredSource(null);
      }
    };

    fetchAndFilter();
    return () => {
      cancelled = true;
      revoke();
      setFilteredSource(null);
    };
  }, [needsFilter, source]);

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimeout();
    if (!playing) return;
    hideControlsTimeout.current = setTimeout(
      () => setControlsVisible(false),
      3000
    );
  }, [playing, clearHideControlsTimeout]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  useEffect(() => {
    if (!effectiveSource || !isHls || !videoRef.current) return undefined;

    if (Hls.isSupported()) {
      const BaseLoader = Hls.DefaultConfig?.loader;
      const AdFreeLoader = BaseLoader
        ? class extends BaseLoader {
          load(context, config, callbacks) {
            const onSuccess = callbacks?.onSuccess;
            const wrappedCallbacks = {
              ...callbacks,
              onSuccess: (response, stats, ctx, networkDetails) => {
                let nextResponse = response;
                if (
                  typeof response?.data === "string" &&
                  (ctx?.type === "manifest" || ctx?.type === "level")
                ) {
                  nextResponse = {
                    ...response,
                    data: stripAdSegmentsFromPlaylist(response.data),
                  };
                }

                if (onSuccess) {
                  onSuccess(nextResponse, stats, ctx, networkDetails);
                }
              },
            };

            super.load(context, config, wrappedCallbacks);
          }
        }
        : null;

      // ================================================================
      // Optimized HLS config — tuned for reduced buffering on external
      // .m3u8 sources where network latency and CDN jitter are common.
      // ================================================================
      const hls = new Hls({
        // --- Buffer tuning ---
        maxBufferLength: 60,              // Buffer 60s ahead (default 30s)
        maxMaxBufferLength: 600,          // Hard cap at 10 min
        maxBufferSize: 120 * 1000 * 1000, // 120 MB (default 60 MB)
        maxBufferHole: 1.0,               // Tolerate 1s gaps (default 0.5s)
        backBufferLength: 30,             // Only keep 30s of watched buffer

        // --- ABR (Adaptive Bitrate) tuning ---
        abrEwmaDefaultEstimate: 1_500_000,   // Start assuming 1.5 Mbps
        abrEwmaDefaultEstimateMax: 5_000_000,
        abrBandWidthFactor: 0.9,          // More aggressive when BW is good
        abrBandWidthUpFactor: 0.7,        // Switch up quality faster
        capLevelToPlayerSize: true,

        // --- Loading & Retry ---
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 64000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,

        // --- Performance ---
        enableWorker: true,           // Decode in Web Worker thread
        lowLatencyMode: false,        // VOD — no need for low-latency
        progressive: true,            // Progressive segment loading
        testBandwidth: true,

        // --- Custom loader (ad filter) ---
        ...(AdFreeLoader ? { loader: AdFreeLoader } : {}),
      });

      hlsRef.current = hls;
      hls.loadSource(effectiveSource);
      hls.attachMedia(videoRef.current);

      // --- Error recovery -------------------------------------------------
      // Without this handler the player would freeze on network hiccups or
      // corrupt segments that are common with third-party .m3u8 sources.
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn("[HLS] Network error, attempting recovery…", data.details);
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.warn("[HLS] Media error, attempting recovery…", data.details);
            hls.recoverMediaError();
            break;
          default:
            console.error("[HLS] Fatal unrecoverable error", data.details);
            hls.destroy();
            break;
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        const details = data?.details;
        const fragments = details?.fragments || [];
        if (!details || !Array.isArray(fragments)) return;

        const filtered = fragments.filter((frag) => {
          const url = frag?.relurl || frag?.url;
          return !(url && url.includes("adjump"));
        });

        let cursor = 0;
        filtered.forEach((frag, idx) => {
          frag.start = cursor;
          frag.sn = idx;
          cursor += Number(frag?.duration) || 0;
        });

        details.fragments = filtered;
        details.totalduration = cursor;
        details.endSN = filtered.length ? filtered[filtered.length - 1].sn : 0;
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const preferredHeights = [320, 480, 720, 1080];
        const levels = (data?.levels || [])
          .map((lvl, idx) => ({ height: lvl.height, level: idx }))
          .sort((a, b) => (a.height || 0) - (b.height || 0))
          .map((lvl) => ({
            label: lvl.height ? `${lvl.height}p` : "Auto",
            level: lvl.level,
          }))
          .filter(
            (lvl) => !lvl.height || preferredHeights.includes(lvl.height)
          );

        const uniqueByHeight = [];
        const seen = new Set();
        for (const lvl of levels) {
          const key = lvl.label;
          if (seen.has(key)) continue;
          seen.add(key);
          uniqueByHeight.push(lvl);
        }

        const finalLevels = [{ label: "Auto", level: -1 }, ...uniqueByHeight];

        if (finalLevels.length) {
          setQualityLevels(finalLevels);
          setCurrentLevel(-1);
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(typeof data?.level === "number" ? data.level : -1);
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
        setQualityLevels([]);
        setCurrentLevel(-1);
      };
    }

    videoRef.current.src = effectiveSource;
    return undefined;
  }, [effectiveSource, isHls]);

  // Native video listeners
  // NOTE: playbackRate is intentionally NOT in the dependency array here.
  // Changing playback speed should not detach/reattach every event listener
  // (which causes a brief playback hiccup). A dedicated effect below handles it.
  useEffect(() => {
    if (!isHls || !videoRef.current) return undefined;
    const video = videoRef.current;

    const onTime = () => setProgress(video.currentTime || 0);
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      setIsBuffering(false);
    };
    const onPause = () => setPlaying(false);
    // Only "waiting" and "stalled" indicate real buffering.
    // "seeking" was removed — it fires immediately on seek even when the
    // target position is already buffered, causing a false loading spinner.
    const onBuffer = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onBuffer);
    video.addEventListener("seeking", onBuffer);
    video.addEventListener("stalled", onBuffer);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("canplaythrough", onCanPlay);
    video.addEventListener("playing", onCanPlay);

    video.playbackRate = playbackRate;

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onBuffer);
      video.removeEventListener("seeking", onBuffer);
      video.removeEventListener("stalled", onBuffer);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlay);
      video.removeEventListener("playing", onCanPlay);
    };
  }, [isHls, effectiveSource]);

  // Sync playbackRate independently so changing speed doesn't tear down
  // all event listeners above (which causes a playback hiccup).
  useEffect(() => {
    if (isHls && videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [isHls, playbackRate]);

  // Sync play/pause
  useEffect(() => {
    if (isHls && videoRef.current) {
      const video = videoRef.current;
      if (playing) {
        video.play().catch(() => setPlaying(false));
      } else {
        video.pause();
      }
    }
  }, [isHls, playing]);

  // Sync volume/mute for native video
  useEffect(() => {
    if (isHls && videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = muted ? 0 : volume;
    }
  }, [isHls, volume, muted]);

  // Auto-hide controls when playing
  useEffect(() => {
    const controlId = setTimeout(() => {
      setControlsVisible(true);
      if (playing) {
        scheduleHideControls();
      } else {
        clearHideControlsTimeout();
      }
    }, 0);
    return () => clearTimeout(controlId);
  }, [playing, scheduleHideControls, clearHideControlsTimeout]);

  useEffect(() => () => clearHideControlsTimeout(), [clearHideControlsTimeout]);

  const seekBy = useCallback(
    (delta) => {
      if (!source) return;
      // Native/hls video
      if (isHls && videoRef.current) {
        const next = Math.max(0, (videoRef.current.currentTime || 0) + delta);
        videoRef.current.currentTime = next;
        return;
      }
      // ReactPlayer paths
      if (
        reactPlayerRef.current &&
        typeof reactPlayerRef.current.seekTo === "function"
      ) {
        const player = reactPlayerRef.current;
        const current = player.getCurrentTime ? player.getCurrentTime() : 0;
        player.seekTo(Math.max(0, current + delta), "seconds");
      }
    },
    [source, isHls]
  );

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!target) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName?.toLowerCase?.();
      if (!tag) return false;
      return tag === "input" || tag === "textarea" || tag === "select";
    };

    const handler = (e) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showControls();
        seekBy(-SEEK_STEP);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        showControls();
        seekBy(SEEK_STEP);
      }
      if (e.code === "Space") {
        e.preventDefault();
        showControls();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [seekBy, showControls, togglePlay]);

  useEffect(() => {
    const onFsChange = () => {
      const fsEl =
        document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(Boolean(fsEl));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const toggleMute = () => setMuted((m) => !m);

  const handleSeekBar = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      Math.max((e.clientX - rect.left) / rect.width, 0),
      1
    );
    const target = duration * ratio;
    if (isHls && videoRef.current) {
      videoRef.current.currentTime = target;
    } else if (reactPlayerRef.current?.seekTo) {
      reactPlayerRef.current.seekTo(target, "seconds");
    }
    setProgress(target);
  };

  const handleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      document.exitFullscreen?.();
      document.webkitExitFullscreen?.();
      if (video?.webkitExitFullscreen) video.webkitExitFullscreen();
      return;
    }

    // Only trigger from user gesture; container preferred, fallback to video for iOS.
    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
        return;
      }
      if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
        return;
      }
    } catch {
      // ignore, try video fallback
    }

    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  };

  const formatTime = (value) => {
    if (!Number.isFinite(value)) return "00:00";
    const total = Math.max(0, Math.floor(value));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(total % 60)
      .toString()
      .padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const handleUserActivity = () => {
    showControls();
  };

  const handleVolumeButton = () => {
    if (isSmallScreen) {
      setShowVolumeSlider((v) => !v);
      return;
    }
    toggleMute();
  };

  const handleVolumeChange = useCallback((value) => {
    setVolume(value);
  }, []);

  const handleChangePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    if (isHls && videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleQualityChange = (level) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = level;
    setCurrentLevel(level);
  };

  const currentQualityLabel = useMemo(() => {
    if (currentLevel === -1) return "Auto";
    return qualityLevels.find((l) => l.level === currentLevel)?.label || "Auto";
  }, [currentLevel, qualityLevels]);

  const handleContainerClick = (e) => {
    if (canUseIframe) return;
    if (ignoreNextClickRef.current) return;
    if (e.target.closest("[data-control]") || e.defaultPrevented) return;
    handleUserActivity();
    togglePlay();
  };

  // Close floating menus when clicking outside controls (helps on mobile)
  useEffect(() => {
    const handleDocClick = (e) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target)) return;
      setShowMoreMenu(false);
      setShowVolumeSlider(false);
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  if (!effectiveSource) {
    return (
      <div className="aspect-video rounded-2xl border border-white/10 bg-slate-900/60" />
    );
  }

  const overlay = (
    <div
      className="absolute inset-0 text-white flex flex-col justify-between transition-opacity duration-300"
      style={{
        opacity: controlsVisible ? 1 : 0,
        pointerEvents: controlsVisible ? "auto" : "none",
      }}
    >
      {!isFullscreen ? (
        <div className="pointer-events-none bg-gradient-to-b from-black/65 via-black/20 to-transparent p-3 sm:p-5 flex items-start sm:items-center justify-between gap-3">
          <div className="space-y-1 drop-shadow">
            {title ? (
              <p className="text-xs sm:text-sm font-semibold leading-tight">
                {title}
              </p>
            ) : null}
            {subtitle ? (
              <p className="text-[11px] sm:text-xs text-slate-200 leading-tight">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actionSlot ? (
            <div className="pointer-events-auto flex-shrink-0" data-control>
              {actionSlot}
            </div>
          ) : null}
        </div>
      ) : (
        <div />
      )}

      {!canUseIframe ? (
        <div
          className="pointer-events-auto px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 sm:space-y-2"
          data-control
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/80">
            <span>
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
          <div
            className="relative h-2 sm:h-1.5 rounded-full bg-white/15 cursor-pointer"
            onClick={handleSeekBar}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-400"
              style={{
                width: duration ? `${(progress / duration) * 100}%` : "0%",
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-[12px] sm:text-[13px]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 border border-white/10 hover:border-emerald-300/60 hover:bg-white/25 transition"
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => seekBy(-SEEK_STEP)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition"
                aria-label="Tua lùi 10 giây"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => seekBy(SEEK_STEP)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition"
                aria-label="Tua tiến 10 giây"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              {onNextEpisode ? (
                <button
                  type="button"
                  onClick={onNextEpisode}
                  disabled={!hasNextEpisode}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${hasNextEpisode
                      ? "bg-white/10 border-white/10 hover:border-emerald-300/60 hover:bg-white/20"
                      : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                    }`}
                  aria-label="Sang tập tiếp theo"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <div
                className="relative flex items-center gap-2 pl-2"
                data-control
              >
                <button
                  type="button"
                  onClick={handleVolumeButton}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition"
                  aria-label="Bật/tắt tiếng"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </button>
                <div className="hidden sm:block">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={muted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-20 accent-emerald-400"
                  />
                </div>
                {showVolumeSlider ? (
                  <div className="sm:hidden absolute left-0 bottom-full mb-2 rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur p-3 text-xs text-white/90 z-30 w-44">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={muted ? 0 : volume}
                        onChange={(e) =>
                          handleVolumeChange(Number(e.target.value))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div
              className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end"
              data-control
            >
              <div className="relative">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition"
                  onClick={() => setShowMoreMenu((v) => !v)}
                  aria-label="Thêm tuỳ chọn"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showMoreMenu ? (
                  <div className="absolute right-2 sm:right-0 bottom-full mb-1 rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur p-3 text-xs text-white/90 z-20 min-w-[180px] max-w-[90vw] sm:max-w-[340px] space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/60">
                        <Gauge className="h-3.5 w-3.5" />
                        <span>Tốc độ</span>
                        <span className="ml-auto text-white/80">
                          {playbackRate}x
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {PLAYBACK_RATES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              handleChangePlaybackRate(r);
                              setShowMoreMenu(false);
                            }}
                            className={`rounded-lg px-2.5 py-1 text-center transition ${playbackRate === r
                                ? "bg-emerald-500/20 text-white"
                                : "bg-white/5 hover:bg-white/10"
                              }`}
                          >
                            {r}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {isHls && qualityLevels.length ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/60">
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          <span>Chất lượng</span>
                          <span className="ml-auto text-white/80">
                            {currentQualityLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {qualityLevels.map((lvl) => (
                            <button
                              key={lvl.level}
                              type="button"
                              onClick={() => {
                                handleQualityChange(lvl.level);
                                setShowMoreMenu(false);
                              }}
                              className={`rounded-lg px-2.5 py-1 text-left transition ${currentLevel === lvl.level
                                  ? "bg-emerald-500/20 text-white"
                                  : "bg-white/5 hover:bg-white/10"
                                }`}
                            >
                              {lvl.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleFullscreen}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const loadingOverlay = isBuffering ? (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
      <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-emerald-400 animate-spin" />
    </div>
  ) : null;

  if (isHls) {
    return (
      <div
        ref={containerRef}
        className="relative aspect-video overflow-visible rounded-2xl border border-white/10 bg-black shadow-2xl"
        onClick={handleContainerClick}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        <video
          ref={videoRef}
          poster={poster}
          preload="auto"
          className="player-native h-full w-full rounded-2xl"
          playsInline
          autoPlay
          controls={false}
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
        />
        {overlay}
        {loadingOverlay}
      </div>
    );
  }

  if (canUseIframe) {
    return (
      <div
        ref={containerRef}
        className="relative aspect-video overflow-visible rounded-2xl border border-white/10 bg-black"
        onClick={handleContainerClick}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        <iframe
          title="player"
          src={source}
          className="h-full w-full rounded-2xl"
          allowFullScreen
          onLoad={() => setIsBuffering(false)}
        />
        {overlay}
        {loadingOverlay}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video overflow-visible rounded-2xl border border-white/10 bg-black"
      onClick={handleContainerClick}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-black">
            <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-emerald-400 animate-spin" />
          </div>
        }
      >
        <ReactPlayer
          ref={reactPlayerRef}
          url={effectiveSource}
          playing={playing}
          controls={false}
          volume={muted ? 0 : volume}
          muted={muted}
          playbackRate={playbackRate}
          width="100%"
          height="100%"
          light={poster}
          onClickPreview={() => {
            ignoreNextClickRef.current = true;
            setPlaying(true);
            showControls();
            setTimeout(() => {
              ignoreNextClickRef.current = false;
            }, 0);
          }}
          onDuration={(d) => setDuration(d)}
          onProgress={({ playedSeconds }) => setProgress(playedSeconds)}
          onPlay={() => {
            setPlaying(true);
            setIsBuffering(false);
          }}
          onPause={() => setPlaying(false)}
          onReady={() => setIsBuffering(false)}
          onBuffer={() => setIsBuffering(true)}
          onBufferEnd={() => setIsBuffering(false)}
          style={{ borderRadius: "1rem", overflow: "hidden" }}
          config={{
            file: {
              attributes: {
                playsInline: true,
                preload: "auto",
                controlsList: "nodownload noremoteplayback noplaybackrate",
                disablePictureInPicture: true,
              },
            },
          }}
        />
      </Suspense>
      {overlay}
      {loadingOverlay}
    </div>
  );
};

export default Player;

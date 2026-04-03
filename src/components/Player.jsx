import Hls from "hls.js";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  PictureInPicture,
  Monitor,
} from "lucide-react";

const SEEK_STEP = 10; // seconds
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const MOBILE_MEDIA_QUERY = "(max-width: 640px)";
const BUFFERING_FAILOVER_MS = 15000;

const stripAdSegmentsFromPlaylist = (text = "", sourceUrl = "") => {
  if (!text || typeof text !== "string") return text;

  let baseUrl = "";
  if (sourceUrl) {
    try {
      baseUrl = new URL(".", sourceUrl).href;
    } catch {
      // ignore
    }
  }

  // 1. Separate the HLS header from the body (everything before the first segment or discontinuity)
  const firstInfIndex = text.indexOf("#EXTINF");
  const firstDiscIndex = text.indexOf("#EXT-X-DISCONTINUITY");
  const markerIndex = Math.min(
    firstInfIndex === -1 ? Infinity : firstInfIndex,
    firstDiscIndex === -1 ? Infinity : firstDiscIndex
  );

  let header = "";
  let body = text;
  if (markerIndex !== Infinity && markerIndex > 0) {
    header = text.substring(0, markerIndex);
    body = text.substring(markerIndex);
  }

  // 2. Split body into blocks by discontinuity
  const blocks = body.split(/(?:^|\n)#EXT-X-DISCONTINUITY\b/);
  const blacklisted = ["adjump", "/v7/", "khomay", "proxys", "bitcdn", "ads"];

  const stripLines = (blockText) => {
    const lines = blockText.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith("#EXTINF")) {
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
        if (nextLine && blacklisted.some((word) => nextLine.includes(word))) {
          i += 1;
          continue;
        }
      }
      if (blacklisted.some((word) => line.includes(word))) continue;

      let finalLine = line;
      if (baseUrl && !line.startsWith("#") && !line.includes("://")) {
        if (line.startsWith("/")) {
          try {
            const urlObj = new URL(sourceUrl);
            finalLine = urlObj.origin + line;
          } catch {
            // ignore
          }
        } else {
          finalLine = baseUrl + line;
        }
      }
      out.push(finalLine);
    }
    return out.join("\n");
  };

  const validBlocks = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Calculate duration
    const infMatches = block.match(/#EXTINF:([\d.]+)/g);
    let duration = 0;
    if (infMatches) {
      duration = infMatches.reduce((acc, str) => {
        const match = str.match(/[\d.]+/);
        return acc + (match ? parseFloat(match[0]) : 0);
      }, 0);
    }

    let isAd = false;
    // Explicit blacklist check
    if (blacklisted.some((word) => block.includes(word))) {
      isAd = true;
    }
    // Heuristic: very short blocks between discontinuities are usually ads
    // (Keep this threshold low — 15s — to avoid stripping legitimate content)
    else if (duration > 0 && duration < 15 && blocks.length > 2) {
      isAd = true;
    }

    if (!isAd) {
      validBlocks.push(stripLines(block));
    }
  }

  // 3. Reconstruct the manifest
  let result = header;
  if (validBlocks.length > 0) {
    if (result && !result.endsWith("\n")) result += "\n";
    result += validBlocks.join("\n#EXT-X-DISCONTINUITY\n");
  }

  // Ensure EXTM3U is there if it was originally
  if (text.includes("#EXTM3U") && !result.includes("#EXTM3U")) {
    result = "#EXTM3U\n" + result;
  }

  // If filtered result is critically broken, return original as fallback
  if (!result.includes("#EXTINF") && text.includes("#EXTINF")) return text;

  return result;
};

const Player = ({
  source,
  poster,
  title,
  subtitle,
  actionSlot,
  onNextEpisode,
  hasNextEpisode = true,
  onTimeUpdate,
  initialTime,
  theaterMode = false,
  onToggleTheater,
  onPlaybackIssue,
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

  const hlsConfig = useMemo(() => {
    // Phát hiện mobile thực sự qua User-Agent + screen width
    const isMobile =
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;
    const isTablet = !isMobile && window.innerWidth <= 1024;
    return {
      // === BUFFER: giữ nhỏ để video BẮT ĐẦU PHÁT NHANH ===
      // Server phim VN rất chậm (~150KB/s). Buffer nhỏ = ít chờ đợi hơn.
      maxBufferLength: isMobile ? 15 : 30,
      maxMaxBufferLength: isMobile ? 30 : 60,
      maxBufferSize: isMobile
        ? 30 * 1000 * 1000
        : isTablet
        ? 60 * 1000 * 1000
        : 100 * 1000 * 1000,
      // Cho phép lỗ hổng buffer lớn hơn — tránh HLS.js re-fetch liên tục
      maxBufferHole: 1.0,
      // Giải phóng RAM sớm
      backBufferLength: 10,

      // === START: chất lượng thấp nhất → phát nhanh nhất ===
      startLevel: 0,
      lowLatencyMode: false,

      // === ABR ===
      abrEwmaFastLive: 3.0,
      abrEwmaSlowLive: 9.0,
      abrEwmaFastVoD: 3.0,
      abrEwmaSlowVoD: 9.0,
      abrEwmaDefaultEstimate: 500_000,
      abrBandWidthFactor: 0.7,
      abrBandWidthUpFactor: 0.4,
      capLevelOnFPSDrop: false,

      // === NETWORK: timeout DÀI để KHÔNG hủy download đang chạy ===
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 16000,
      fragLoadingMaxRetry: 10,
      fragLoadingTimeOut: 60000, // 60s — cho server chậm đủ thời gian
      manifestLoadingRetryDelay: 1000,
      manifestLoadingMaxRetry: 6,
      manifestLoadingTimeOut: 30000,
      levelLoadingRetryDelay: 1000,
      levelLoadingMaxRetry: 6,
      levelLoadingTimeOut: 30000,

      // === STALL: để HLS.js tự xử lý, KHÔNG can thiệp ===
      nudgeMaxRetry: 5,
      nudgeOffset: 0.1,
      highBufferWatchdogPeriod: 3,

      enableWorker: true,
    };
  }, []);

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
  const [qualityLevels, setQualityLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const hideControlsTimeout = useRef(null);
  const bufferingSinceRef = useRef(null);
  const bufferingTimerRef = useRef(null);
  const bufferingIssueTimerRef = useRef(null);
  const playbackIssueReportedRef = useRef(false);
  const initialTimeConsumed = useRef(false);

  const clearBufferingIssueTimer = useCallback(() => {
    if (bufferingIssueTimerRef.current) {
      clearTimeout(bufferingIssueTimerRef.current);
      bufferingIssueTimerRef.current = null;
    }
  }, []);

  const reportPlaybackIssue = useCallback(
    (reason) => {
      if (!onPlaybackIssue) return;
      if (playbackIssueReportedRef.current) return;
      playbackIssueReportedRef.current = true;
      onPlaybackIssue(reason || "playback-issue");
    },
    [onPlaybackIssue]
  );

  useEffect(() => {
    // Reset visual state when source changes
    const resetId = setTimeout(() => {
      setDuration(0);
      setProgress(0);
      setIsBuffering(true);
      setControlsVisible(true);
      setPlaying(false);
      playbackIssueReportedRef.current = false;
    }, 0);
    clearBufferingIssueTimer();
    return () => clearTimeout(resetId);
  }, [source, clearBufferingIssueTimer]);

  useEffect(() => () => clearBufferingIssueTimer(), [clearBufferingIssueTimer]);

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
        // Cho phép browser cache playlist HLS để giảm tải mạng (giờ cao điểm)
        const res = await fetch(source);
        const text = await res.text();
        if (cancelled) return;

        const filtered = stripAdSegmentsFromPlaylist(text, source);
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
                    // Only swap in filtered content if it still looks like a valid playlist; otherwise keep the original to avoid levelParsingError.
                    try {
                      const filtered = stripAdSegmentsFromPlaylist(
                        response.data,
                        response.url || ctx?.url || source
                      );
                      if (
                        typeof filtered === "string" &&
                        filtered.includes("#EXTM3U") &&
                        filtered.includes("#EXTINF")
                      ) {
                        nextResponse = {
                          ...response,
                          data: filtered,
                        };
                      }
                    } catch (err) {
                      console.warn(
                        "[HLS] Playlist filter skipped due to parse error",
                        err?.message || err
                      );
                    }
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

      let hlsConfigOpts = {
        ...hlsConfig,
        capLevelToPlayerSize: true,
        ...(AdFreeLoader ? { loader: AdFreeLoader } : {}),
      };

      const hls = new Hls(hlsConfigOpts);

      hlsRef.current = hls;
      hls.loadSource(effectiveSource);
      hls.attachMedia(videoRef.current);

      // HLS error handling – cả non-fatal và fatal
      let networkRecoveryAttempts = 0;
      let mediaRecoveryAttempts = 0;

      hls.on(Hls.Events.ERROR, (_, data) => {
        // Non-fatal: CHỈ LOG, KHÔNG can thiệp.
        // Việc nudge/seek gây hủy download đang chạy → vòng lặp loading vô tận.
        if (!data.fatal) {
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            console.log("[HLS] Buffer stall detected — waiting for data…");
          }
          return;
        }

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            networkRecoveryAttempts += 1;
            console.warn(
              `[HLS] Network error (#${networkRecoveryAttempts}), attempting recovery…`,
              data.details
            );
            if (networkRecoveryAttempts <= 5) {
              // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
              setTimeout(() => {
                if (hlsRef.current) hls.startLoad();
              }, Math.min(500 * Math.pow(2, networkRecoveryAttempts - 1), 8000));
            } else {
              reportPlaybackIssue("network-timeout");
              // Sau 5 lần thất bại, reload nguồn từ đầu
              console.warn(
                "[HLS] Max network retries reached, reloading source…"
              );
              networkRecoveryAttempts = 0;
              hls.loadSource(effectiveSource);
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            mediaRecoveryAttempts += 1;
            console.warn(
              `[HLS] Media error (#${mediaRecoveryAttempts}), attempting recovery…`,
              data.details
            );
            if (mediaRecoveryAttempts <= 2) {
              hls.recoverMediaError();
            } else {
              // Swap codec after multiple media errors
              console.warn("[HLS] Swapping audio codec…");
              hls.swapAudioCodec();
              hls.recoverMediaError();
              mediaRecoveryAttempts = 0;
            }
            break;
          default:
            console.error("[HLS] Fatal unrecoverable error", data.details);
            reportPlaybackIssue("fatal-hls");
            hls.destroy();
            hlsRef.current = null;
            break;
        }
      });

      // NOTE: Removed aggressive in-place fragment stripping from LEVEL_LOADED.
      // That approach corrupted the HLS.js internal timeline (start positions, SN numbers)
      // causing constant re-buffering. Ad filtering is now handled only at the playlist
      // text level via AdFreeLoader above, which is safe.

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

    if (videoRef.current) {
      videoRef.current.src = effectiveSource;
      if (initialTime > 0 && !initialTimeConsumed.current) {
        videoRef.current.currentTime = initialTime;
        initialTimeConsumed.current = true;
      }
    }
    return undefined;
  }, [
    effectiveSource,
    isHls,
    hlsConfig,
    initialTime,
    source,
    reportPlaybackIssue,
  ]);

  useEffect(() => {
    if (!isHls || !videoRef.current) return undefined;
    const video = videoRef.current;

    const onTime = () => {
      const t = video.currentTime || 0;
      setProgress(t);
      if (onTimeUpdate) onTimeUpdate(t, video.duration || 0);
    };
    const onDuration = () => setDuration(video.duration || 0);
    const clearBufferingTimer = () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current);
        bufferingTimerRef.current = null;
      }
    };
    const onPlay = () => {
      setPlaying(true);
      clearBufferingTimer();
      setIsBuffering(false);
      playbackIssueReportedRef.current = false;
    };
    const onPause = () => setPlaying(false);

    const onBuffer = () => {
      // Debounce: only show spinner if buffering persists > 300ms
      // This avoids flashing the spinner on mobile during short network hiccups
      if (!bufferingTimerRef.current) {
        bufferingTimerRef.current = setTimeout(() => {
          setIsBuffering(true);
          bufferingTimerRef.current = null;
        }, 300);
      }
    };
    const onCanPlay = () => {
      clearBufferingTimer();
      setIsBuffering(false);
      playbackIssueReportedRef.current = false;
      // Ensure the resume feature jumps to the right mark as soon as video provides frame data
      if (initialTime > 0 && !initialTimeConsumed.current) {
        video.currentTime = initialTime;
        initialTimeConsumed.current = true;
      }
    };
    const onError = () => {
      reportPlaybackIssue("video-error");
    };
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
    video.addEventListener("error", onError);

    video.playbackRate = playbackRate;

    return () => {
      clearBufferingTimer();
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
      video.removeEventListener("error", onError);
    };
  }, [
    isHls,
    effectiveSource,
    initialTime,
    onTimeUpdate,
    playbackRate,
    reportPlaybackIssue,
  ]);

  useEffect(() => {
    clearBufferingIssueTimer();
    if (!effectiveSource || canUseIframe) return undefined;
    if (!isBuffering || (!playing && progress <= 0)) return undefined;

    bufferingIssueTimerRef.current = setTimeout(() => {
      reportPlaybackIssue("buffer-timeout");
    }, BUFFERING_FAILOVER_MS);

    return clearBufferingIssueTimer;
  }, [
    effectiveSource,
    canUseIframe,
    isBuffering,
    playing,
    progress,
    reportPlaybackIssue,
    clearBufferingIssueTimer,
  ]);

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

  // Stall monitor — CHỈ LOG, KHÔNG CAN THIỆP.
  // Lý do: server phim VN chậm (~5-10s/segment) nhưng VẪN TRẢ DATA.
  // Mọi hành động can thiệp (nudge, reload, hạ quality) đều HỦY download
  // đang chạy → server phải trả data từ đầu → vòng lặp loading vô tận.
  // Để HLS.js tự quản lý buffer + retry + quality switching.
  useEffect(() => {
    if (!isHls) return undefined;
    if (!isBuffering) {
      bufferingSinceRef.current = null;
      return undefined;
    }
    bufferingSinceRef.current = performance.now();
    // Chỉ log để debug, không can thiệp gì cả.
    const logger = setInterval(() => {
      if (!bufferingSinceRef.current || !hlsRef.current) return;
      const sec = Math.round(
        (performance.now() - bufferingSinceRef.current) / 1000
      );
      if (sec > 5 && sec % 10 === 0) {
        console.log(
          `[HLS] Buffering for ${sec}s… (level=${hlsRef.current.currentLevel}, waiting for server)`
        );
      }
    }, 5000);
    return () => clearInterval(logger);
  }, [isBuffering, isHls]);

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
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleFullscreen();
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

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error:", err);
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

  const isEnding =
    duration > 0 && Math.floor(progress) >= Math.floor(duration - 90);

  const uxButtons = (
    <div className="absolute bottom-12 sm:bottom-16 md:bottom-20 right-2 sm:right-6 flex flex-col items-end gap-2 sm:gap-3 z-30 pointer-events-none drop-shadow-2xl">
      {isEnding && hasNextEpisode && onNextEpisode ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNextEpisode();
          }}
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 rounded-md sm:rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all animate-in fade-in slide-in-from-right-4 hover:scale-105"
        >
          <span className="hidden sm:inline">Tập tiếp theo</span>
          <span className="sm:hidden">Tập tiếp</span>
          <SkipForward className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      ) : null}
    </div>
  );

  const overlay = (
    <div
      className="absolute inset-0 text-white flex flex-col justify-between transition-opacity duration-300"
      style={{
        opacity: controlsVisible ? 1 : 0,
        pointerEvents: controlsVisible ? "auto" : "none",
      }}
    >
      {!isFullscreen ? (
        <div className="pointer-events-none bg-gradient-to-b from-black/90 via-black/40 to-transparent pt-3 pb-12 sm:pt-5 px-3 sm:px-5 flex items-start sm:items-center justify-between gap-3">
          <div className="space-y-1 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
            {title ? (
              <p className="text-xs sm:text-sm font-semibold leading-tight text-white">
                {title}
              </p>
            ) : null}
            {subtitle ? (
              <p className="text-[11px] sm:text-xs text-slate-100 leading-tight">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actionSlot ? (
            <div
              className="pointer-events-auto flex-shrink-0 drop-shadow-md"
              data-control
            >
              {actionSlot}
            </div>
          ) : null}
        </div>
      ) : (
        <div />
      )}

      {!canUseIframe ? (
        <div
          className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-3 sm:pb-4 px-1.5 sm:px-4 space-y-1.5 sm:space-y-2"
          data-control
        >
          <div className="flex items-center justify-between text-[10px] min-[360px]:text-[11px] sm:text-xs text-white drop-shadow-md font-semibold px-0.5">
            <span>
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
          <div
            className="relative h-2 sm:h-1.5 rounded-full bg-white/25 cursor-pointer shadow-inner shadow-black/20"
            onClick={handleSeekBar}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              style={{
                width: duration ? `${(progress / duration) * 100}%` : "0%",
              }}
            />
          </div>
          <div className="flex flex-nowrap items-center justify-between gap-0.5 min-[360px]:gap-1 min-[400px]:gap-2 sm:gap-3 text-[10px] min-[360px]:text-[11px] min-[400px]:text-[12px] sm:text-[13px] drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-0.5 min-[360px]:gap-1 min-[400px]:gap-2 flex-nowrap">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/15 border border-white/10 hover:border-emerald-300/60 hover:bg-white/25 transition shadow-lg flex-shrink-0"
              >
                {playing ? (
                  <Pause
                    className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5"
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5"
                    fill="currentColor"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => seekBy(-SEEK_STEP)}
                className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
                aria-label="Tua lùi 10 giây"
              >
                <RotateCcw className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => seekBy(SEEK_STEP)}
                className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
                aria-label="Tua tiến 10 giây"
              >
                <RotateCw className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" />
              </button>
              {onNextEpisode ? (
                <button
                  type="button"
                  onClick={onNextEpisode}
                  disabled={!hasNextEpisode}
                  className={`flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full border transition flex-shrink-0 ${
                    hasNextEpisode
                      ? "bg-white/10 border-white/10 hover:border-emerald-300/60 hover:bg-white/20"
                      : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                  }`}
                  aria-label="Sang tập tiếp theo"
                >
                  <SkipForward className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" />
                </button>
              ) : null}
              <div
                className="relative flex items-center gap-2 pl-2"
                data-control
              >
                <button
                  type="button"
                  onClick={handleVolumeButton}
                  className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
                  aria-label="Bật/tắt tiếng"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3" />
                  ) : (
                    <Volume2 className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3" />
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
              className="flex items-center gap-0.5 min-[360px]:gap-1 min-[400px]:gap-2 sm:gap-3 flex-nowrap justify-end"
              data-control
            >
              <div className="relative">
                <button
                  type="button"
                  className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
                  onClick={() => setShowMoreMenu((v) => !v)}
                  aria-label="Thêm tuỳ chọn"
                >
                  <MoreVertical className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
                </button>
                {showMoreMenu ? (
                  <div
                    className="absolute right-2 sm:right-0 bottom-full mb-1 rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur p-3 text-xs text-white/90 z-20 min-w-[180px] max-w-[90vw] sm:max-w-[340px] space-y-3"
                    data-control
                  >
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
                            className={`rounded-lg px-2.5 py-1 text-center transition ${
                              playbackRate === r
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
                              className={`rounded-lg px-2.5 py-1 text-left transition ${
                                currentLevel === lvl.level
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
                onClick={togglePip}
                className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/15 border border-white/10 hover:border-emerald-300/60 hover:bg-white/25 transition shadow-lg flex-shrink-0"
                title="Picture-in-Picture"
              >
                <PictureInPicture className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
              </button>

              {onToggleTheater && (
                <button
                  type="button"
                  onClick={onToggleTheater}
                  className={`hidden sm:flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full border transition flex-shrink-0 ${
                    theaterMode
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                      : "bg-white/10 border-white/10 hover:border-emerald-300/60 hover:bg-white/20 text-white"
                  }`}
                  title={
                    theaterMode ? "Thoát chế độ rạp phim" : "Chế độ rạp phim"
                  }
                >
                  <Monitor className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleFullscreen}
                className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
                ) : (
                  <Maximize2 className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const loadingOverlay = (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200"
      style={{ opacity: isBuffering ? 1 : 0 }}
    >
      <div className="loader-orbit loader-orbit-md" />
    </div>
  );

  if (isHls) {
    return (
      <div
        ref={containerRef}
        className={`relative aspect-video overflow-visible bg-black shadow-2xl transition-all duration-500 ${
          theaterMode && !isFullscreen
            ? "z-[60] rounded-none sm:rounded-xl ring-1 ring-white/10"
            : "z-10 rounded-2xl border border-white/10"
        }`}
        onClick={handleContainerClick}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        <video
          ref={videoRef}
          poster={poster}
          preload="auto"
          playsInline
          className="player-native h-full w-full rounded-2xl"
          autoPlay
          controls={false}
          controlsList="nodownload noremoteplayback noplaybackrate"
        />
        {uxButtons}
        {overlay}
        {loadingOverlay}
      </div>
    );
  }

  if (canUseIframe) {
    return (
      <div
        ref={containerRef}
        className={`relative aspect-video overflow-visible bg-black transition-all duration-500 ${
          theaterMode && !isFullscreen
            ? "z-[60] rounded-none sm:rounded-xl ring-1 ring-white/10"
            : "z-10 rounded-2xl border border-white/10"
        }`}
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
        {uxButtons}
        {overlay}
        {loadingOverlay}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video overflow-visible bg-black transition-all duration-500 ${
        theaterMode && !isFullscreen
          ? "z-[60] rounded-none sm:rounded-xl ring-1 ring-white/10"
          : "z-10 rounded-2xl border border-white/10"
      }`}
      onClick={handleContainerClick}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-black">
            <div className="loader-orbit loader-orbit-md" />
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
            playbackIssueReportedRef.current = false;
          }}
          onPause={() => setPlaying(false)}
          onReady={() => {
            setIsBuffering(false);
            playbackIssueReportedRef.current = false;
          }}
          onBuffer={() => setIsBuffering(true)}
          onBufferEnd={() => setIsBuffering(false)}
          onError={() => reportPlaybackIssue("react-player-error")}
          style={{ borderRadius: "1rem", overflow: "hidden" }}
          config={{
            file: {
              attributes: {
                playsInline: true,
                preload: "auto",
                controlsList: "nodownload noremoteplayback noplaybackrate",
              },
            },
          }}
        />
      </Suspense>
      {uxButtons}
      {overlay}
      {loadingOverlay}
    </div>
  );
};

export default Player;

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePlayerState } from "../hooks/usePlayerState";
import { usePlayerActivity } from "../hooks/usePlayerActivity";
import { useHlsHandler } from "../hooks/useHlsHandler";
import { SEEK_STEP, MOBILE_MEDIA_QUERY } from "../utils/playerUtils";
import { STREAM_PROXY, stripAdSegmentsFromPlaylist } from "../utils/hlsUtils";

// Sub-components
import PlayerHeader from "./Player/PlayerHeader";
import PlayerControls from "./Player/PlayerControls";
import ProgressBar from "./Player/ProgressBar";
import BufferingOverlay from "./Player/BufferingOverlay";

const ReactPlayer = React.lazy(() => import("react-player"));

const Player = ({
  source,
  poster,
  title,
  subtitle,
  actionSlot,
  onNextEpisode,
  hasNextEpisode = true,
  onTimeUpdate,
  initialTime = 0,
  theaterMode = false,
  onToggleTheater,
  onPlaybackIssue,
}) => {
  const videoRef = useRef(null);
  const reactPlayerRef = useRef(null);
  const containerRef = useRef(null);
  const ignoreNextClickRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSmallScreenRef = useRef(false);

  const canUseIframe = useMemo(
    () => source && (source.includes("iframe") || source.includes("embed")),
    [source]
  );
  
  const isHls = useMemo(() => {
    if (!source) return false;
    try {
      const pathname = new URL(source, "https://dummy").pathname;
      return pathname.endsWith(".m3u8");
    } catch {
      return source.includes(".m3u8");
    }
  }, [source]);

  // Logic & State Hooks
  const {
    playing, setPlaying,
    volume, setVolume,
    muted, setMuted,
    duration, setDuration,
    progress, setProgress,
    isBuffering, setIsBuffering,
    playbackRate, setPlaybackRate,
    qualityLevels, setQualityLevels,
    currentLevel, setCurrentLevel,
    showMoreMenu, setShowMoreMenu,
    showVolumeSlider, setShowVolumeSlider,
    lastPositionRef,
    initialTimeConsumed,
    playbackIssueReportedRef,
    resetState,
  } = usePlayerState(initialTime);

  const { controlsVisible, showControls, handleUserActivity } = usePlayerActivity(playing);
  
  const { Hls, hlsRef, hlsConfig, effectiveSource, isFiltering } = useHlsHandler(source, isHls);

  // Combined buffering state including ad manifest filtering time
  const playerIsBuffering = isBuffering || isFiltering;
  
  // --- Handlers ---
  const onPlaybackIssueRef = useRef(onPlaybackIssue);
  useEffect(() => {
    onPlaybackIssueRef.current = onPlaybackIssue;
  }, [onPlaybackIssue]);

  const reportPlaybackIssue = useCallback((reason) => {
    if (!onPlaybackIssueRef.current || playbackIssueReportedRef.current) return;
    playbackIssueReportedRef.current = true;
    onPlaybackIssueRef.current(reason || "playback-issue");
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((v) => !v);
    showControls();
  }, [showControls]);

  const seekBy = useCallback((seconds) => {
    const video = videoRef.current || (reactPlayerRef.current?.getInternalPlayer());
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    video.currentTime = newTime;
    setProgress(newTime);
    showControls();
  }, [showControls]);

  const handleSeekBar = useCallback((e) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedPerc = x / rect.width;
    const seekTime = clickedPerc * duration;
    
    const video = videoRef.current || (reactPlayerRef.current?.getInternalPlayer());
    if (video) video.currentTime = seekTime;
    setProgress(seekTime);
    showControls();
  }, [duration, showControls]);

  const handleVolumeChange = useCallback((val) => {
    setVolume(val);
    setMuted(val === 0);
    const video = videoRef.current || (reactPlayerRef.current?.getInternalPlayer());
    if (video) video.volume = val;
  }, []);

  const handleVolumeButton = useCallback(() => {
    if (window.innerWidth <= 640) {
      setShowVolumeSlider((v) => !v);
    } else {
      setMuted((v) => !v);
    }
  }, []);

  const handleChangePlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate);
    const video = videoRef.current || (reactPlayerRef.current?.getInternalPlayer());
    if (video) video.playbackRate = rate;
  }, []);

  const handleQualityChange = useCallback((level) => {
    setCurrentLevel(level);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  }, []);

  // Sync play/pause state to native video
  useEffect(() => {
    if (!isHls || !videoRef.current) return;
    const video = videoRef.current;
    if (playing) {
      if (video.paused) {
        video.play().catch(() => setPlaying(false));
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [isHls, playing, setPlaying]);

  // Native Video Event Handlers
  useEffect(() => {
    if (!isHls || !videoRef.current) return undefined;
    const video = videoRef.current;

    const onTime = () => {
      const t = video.currentTime || 0;
      setProgress(t);
      lastPositionRef.current = t;
      if (onTimeUpdate) onTimeUpdate(t, video.duration || 0);
    };
    
    const onDuration = () => setDuration(video.duration || 0);
    const onPlay = () => { setPlaying(true); setIsBuffering(false); };
    const onPause = () => setPlaying(false);
    const onBuffer = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onError = () => reportPlaybackIssue("video-error");

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onBuffer);
    video.addEventListener("seeking", onBuffer);
    video.addEventListener("seeked", onCanPlay);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onCanPlay);
    video.addEventListener("error", onError);
    
    video.playbackRate = playbackRate;

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onBuffer);
      video.removeEventListener("seeking", onBuffer);
      video.removeEventListener("seeked", onCanPlay);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [isHls, onTimeUpdate, playbackRate, reportPlaybackIssue]);

  // Tracking for domains that consistently fail via proxy
  const proxyFailedGlobalDomains = useRef(new Set());

  // Reset state helper
  const handleReset = useCallback(() => {
    resetState();
  }, [resetState]);

  // HLS Instance Management
  useEffect(() => {
    if (!source || !isHls || !videoRef.current || !Hls) return undefined;
    
    // Reset state synchronously when source changes to avoid race conditions
    handleReset();

    if (isFiltering) return undefined;

    const startOffset = initialTime > 0 ? initialTime : lastPositionRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const BaseLoader = Hls.DefaultConfig?.loader;
    const proxyFailedUrls = new Set();
    const proxyFailedDomains = proxyFailedGlobalDomains.current;

    const AdFreeLoader = BaseLoader
      ? class extends BaseLoader {
          load(context, config, callbacks) {
            const originalUrl = context.url;
            let originalOrigin = null;
            try {
              if (originalUrl) originalOrigin = new URL(originalUrl).origin;
            } catch {}

            const shouldBypassProxy = proxyFailedUrls.has(context.url) || 
                                     (originalOrigin && proxyFailedDomains.has(originalOrigin));

            if (
              STREAM_PROXY &&
              context.url &&
              !context.url.includes(STREAM_PROXY) &&
              !shouldBypassProxy
            ) {
              context.url = `${STREAM_PROXY}?url=${encodeURIComponent(context.url)}`;
            }

            const onSuccess = callbacks?.onSuccess;
            const onError = callbacks?.onError;
            const wrappedCallbacks = {
              ...callbacks,
              onSuccess: (response, stats, ctx, networkDetails) => {
                let nextResponse = response;
                if (
                  typeof response?.data === "string" &&
                  (ctx?.type === "manifest" || ctx?.type === "level")
                ) {
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
                    // console.debug("[HLS] Playlist filter skipped", err);
                  }
                }
                if (onSuccess) onSuccess(nextResponse, stats, ctx, networkDetails);
              },
              onError: (error, ctx, networkDetails, stats) => {
                if (
                  STREAM_PROXY &&
                  originalUrl &&
                  context.url.includes(STREAM_PROXY)
                ) {
                  let proxyOrigin = null;
                  try { if (originalUrl) proxyOrigin = new URL(originalUrl).origin; } catch {}

                  if (!proxyFailedUrls.has(originalUrl)) {
                    // Only log once per session per domain to avoid log explosion
                    if (proxyOrigin && !proxyFailedDomains.has(proxyOrigin)) {
                      console.debug(`[HLS] Proxy failed for domain ${proxyOrigin}, switching to direct mode.`);
                      proxyFailedDomains.add(proxyOrigin);
                    }
                    proxyFailedUrls.add(originalUrl);

                    try { this.abort(); } catch { /* ignore */ }
                    const directLoader = new AdFreeLoader(config);
                    const directContext = { ...context, url: originalUrl };
                    directLoader.load(directContext, config, { ...callbacks, onSuccess: wrappedCallbacks.onSuccess });
                    return;
                  }
                }
                if (onError) onError(error, ctx, networkDetails, stats);
              },
            };

            super.load(context, config, wrappedCallbacks);
          }
        }
      : null;

    let hlsConfigOpts = {
      ...hlsConfig,
      capLevelToPlayerSize: false,
      ...(AdFreeLoader ? { loader: AdFreeLoader } : {}),
    };

    const hls = new Hls(hlsConfigOpts);
    hlsRef.current = hls;
    hls.loadSource(effectiveSource);
    hls.attachMedia(videoRef.current);

    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      const preferredHeights = [320, 480, 720, 1080];
      const levels = (data?.levels || [])
        .map((lvl, idx) => ({ height: lvl.height, level: idx }))
        .sort((a, b) => (a.height || 0) - (b.height || 0))
        .map((lvl) => ({
          label: lvl.height ? `${lvl.height}p` : "Auto",
          level: lvl.level,
        }))
        .filter((lvl) => !lvl.height || preferredHeights.includes(lvl.height));
        
      const uniqueByHeight = [];
      const seen = new Set();
      for (const lvl of levels) {
        if (!seen.has(lvl.label)) {
          seen.add(lvl.label);
          uniqueByHeight.push(lvl);
        }
      }

      setQualityLevels([{ level: -1, label: "Tự động" }, ...uniqueByHeight]);
      setCurrentLevel(-1);
      
      if (startOffset > 0) {
        videoRef.current.currentTime = startOffset;
        initialTimeConsumed.current = true;
      }
      
      // Handle auto-play if already set to true
      const video = videoRef.current;
      if (video && playing && video.paused) {
        video.play().catch(() => setPlaying(false));
      }
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => setCurrentLevel(data.level));

    let networkRecoveryAttempts = 0;
    let mediaRecoveryAttempts = 0;

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal) return;

      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          networkRecoveryAttempts += 1;
          if (
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
            data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR
          ) {
            reportPlaybackIssue("manifest-error");
            break;
          }
          if (networkRecoveryAttempts <= 5) {
            setTimeout(() => {
              if (hlsRef.current) hls.startLoad();
            }, Math.min(500 * Math.pow(2, networkRecoveryAttempts - 1), 8000));
          } else {
            reportPlaybackIssue("network-timeout");
            const currentPos = videoRef.current?.currentTime || lastPositionRef.current;
            networkRecoveryAttempts = 0;
            hls.loadSource(effectiveSource);
            if (currentPos > 0) {
              hls.once(Hls.Events.MANIFEST_PARSED, () => {
                if (videoRef.current) videoRef.current.currentTime = currentPos;
              });
            }
          }
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          mediaRecoveryAttempts += 1;
          if (mediaRecoveryAttempts <= 2) {
            hls.recoverMediaError();
          } else {
            hls.swapAudioCodec();
            hls.recoverMediaError();
            mediaRecoveryAttempts = 0;
          }
          break;
        default:
          reportPlaybackIssue("fatal-hls");
          hls.destroy();
          hlsRef.current = null;
          break;
      }
    });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setQualityLevels([]);
      setCurrentLevel(-1);
    };
  }, [effectiveSource, isHls, Hls, hlsConfig, initialTime, reportPlaybackIssue, isFiltering]);

  // External Controls / Fullscreen
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current || (reactPlayerRef.current?.getInternalPlayer());
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error("PiP error", e);
    }
  }, []);

  // Utility to handle clicks on the container (toggle play)
  const handleContainerClick = useCallback((e) => {
    if (ignoreNextClickRef.current) return;
    if (e.target.closest("[data-control]")) return;
    togglePlay();
  }, [togglePlay]);


  // Keyboard Shortcuts
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
        seekBy(-SEEK_STEP);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekBy(SEEK_STEP);
      } else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [seekBy, togglePlay, handleFullscreen]);

  // UI Components
  const overlay = (
    <div 
      className="absolute inset-0 z-20 flex flex-col justify-between transition-opacity duration-300"
      style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
    >
      <PlayerHeader 
        title={title} 
        subtitle={subtitle} 
        actionSlot={actionSlot} 
        isFullscreen={isFullscreen} 
      />
      
      {!canUseIframe && (
        <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-3 sm:pb-4 px-1.5 sm:px-4 space-y-1.5 sm:space-y-2" data-control>
          <ProgressBar progress={progress} duration={duration} onSeek={handleSeekBar} />
          <PlayerControls 
            playing={playing} togglePlay={togglePlay} onSeekBy={seekBy}
            onNextEpisode={onNextEpisode} hasNextEpisode={hasNextEpisode}
            volume={volume} muted={muted} onVolumeChange={handleVolumeChange} onToggleMute={handleVolumeButton}
            showVolumeSlider={showVolumeSlider} setShowVolumeSlider={setShowVolumeSlider}
            showMoreMenu={showMoreMenu} setShowMoreMenu={setShowMoreMenu}
            playbackRate={playbackRate} onPlaybackRateChange={handleChangePlaybackRate}
            isHls={isHls} qualityLevels={qualityLevels} currentLevel={currentLevel} onQualityChange={handleQualityChange}
            onTogglePip={togglePip} onToggleTheater={onToggleTheater} theaterMode={theaterMode}
            onFullscreen={handleFullscreen} isFullscreen={isFullscreen}
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video overflow-hidden bg-black shadow-2xl transition-all duration-500 ${
        theaterMode && !isFullscreen ? "z-[60] rounded-none sm:rounded-xl ring-1 ring-white/10" : "z-10 rounded-2xl border border-white/10"
      }`}
      onClick={handleContainerClick}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      {isHls ? (
        <>
          {poster && (
            <img 
              src={`https://wsrv.nl/?url=${encodeURIComponent(poster)}&w=800&output=webp&q=75`}
              alt="poster preloader" className="hidden" fetchPriority="high" decoding="sync" 
            />
          )}
          <video
            ref={videoRef}
            poster={poster ? `https://wsrv.nl/?url=${encodeURIComponent(poster)}&w=800&output=webp&q=75` : undefined}
            preload="auto" playsInline className="player-native h-full w-full object-contain"
            autoPlay controls={false} controlsList="nodownload noremoteplayback noplaybackrate"
          />
        </>
      ) : canUseIframe ? (
        <iframe title="player" src={source} className="h-full w-full" allowFullScreen onLoad={() => setIsBuffering(false)} />
      ) : (
        <Suspense fallback={<BufferingOverlay isBuffering={true} />}>
          <ReactPlayer
            ref={reactPlayerRef} url={effectiveSource} playing={playing} controls={false}
            volume={muted ? 0 : volume} muted={muted} playbackRate={playbackRate}
            width="100%" height="100%" light={poster}
            onClickPreview={() => { ignoreNextClickRef.current = true; setPlaying(true); showControls(); setTimeout(() => { ignoreNextClickRef.current = false; }, 0); }}
            onDuration={setDuration} onProgress={({ playedSeconds }) => setProgress(playedSeconds)}
            onPlay={() => { setPlaying(true); setIsBuffering(false); }} onPause={() => setPlaying(false)}
            onReady={() => setIsBuffering(false)} onBuffer={() => setIsBuffering(true)} onBufferEnd={() => setIsBuffering(false)}
            onError={() => reportPlaybackIssue("react-player-error")}
          />
        </Suspense>
      )}
      
      {overlay}
      <BufferingOverlay isBuffering={playerIsBuffering} />
    </div>
  );
};

export default Player;

import Hls from "hls.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";

const SEEK_STEP = 10; // seconds

const Player = ({ source, poster, title, subtitle, actionSlot }) => {
  const videoRef = useRef(null);
  const reactPlayerRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canUseIframe = useMemo(
    () => source && (source.includes("iframe") || source.includes("embed")),
    [source]
  );
  const isHls = useMemo(
    () => Boolean(source && source.endsWith(".m3u8")),
    [source]
  );
  const isReactPlayer = useMemo(
    () => Boolean(source && !isHls && !canUseIframe),
    [source, isHls, canUseIframe]
  );

  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const hideControlsTimeout = useRef(null);

  useEffect(() => {
    // Reset visual state when source changes
    setDuration(0);
    setProgress(0);
    setIsBuffering(true);
    setControlsVisible(true);
  }, [source]);

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = null;
    }
  }, []);

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
    if (!source || !source.endsWith(".m3u8") || !videoRef.current)
      return undefined;

    if (Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize: true });
      hls.loadSource(source);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    }

    videoRef.current.src = source;
    return undefined;
  }, [source]);

  // Native video listeners
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
  }, [isHls, source]);

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
    setControlsVisible(true);
    if (playing) {
      scheduleHideControls();
    } else {
      clearHideControlsTimeout();
    }
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

  useEffect(() => {
    const handler = (e) => {
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [seekBy, showControls]);

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

  const togglePlay = () => setPlaying((p) => !p);

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
    } catch (_) {
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

  const handleContainerClick = (e) => {
    if (canUseIframe) return;
    if (e.target.closest("[data-control]") || e.defaultPrevented) return;
    handleUserActivity();
    togglePlay();
  };

  if (!source) {
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
        <div className="pointer-events-none bg-gradient-to-b from-black/65 via-black/20 to-transparent p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="space-y-1 drop-shadow">
            {title ? (
              <p className="text-sm font-semibold leading-tight">{title}</p>
            ) : null}
            {subtitle ? (
              <p className="text-xs text-slate-200 leading-tight">{subtitle}</p>
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
        <div className="pointer-events-auto px-4 pb-3 space-y-2" data-control>
          <div className="flex items-center justify-between text-[11px] text-white/80">
            <span>
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
          <div
            className="relative h-1.5 rounded-full bg-white/15 cursor-pointer"
            onClick={handleSeekBar}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-400"
              style={{
                width: duration ? `${(progress / duration) * 100}%` : "0%",
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2 pl-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-20 accent-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
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

  if (source.endsWith(".m3u8")) {
    return (
      <div
        ref={containerRef}
        className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
        onClick={handleContainerClick}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        <video
          ref={videoRef}
          poster={poster}
          className="player-native h-full w-full"
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
        className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"
        onClick={handleContainerClick}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        <iframe
          title="player"
          src={source}
          className="h-full w-full"
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
      className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"
      onClick={handleContainerClick}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <ReactPlayer
        ref={reactPlayerRef}
        url={source}
        playing={playing}
        controls={false}
        volume={muted ? 0 : volume}
        muted={muted}
        width="100%"
        height="100%"
        light={poster}
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
        config={{
          file: {
            attributes: {
              playsInline: true,
              controlsList: "nodownload noremoteplayback noplaybackrate",
              disablePictureInPicture: true,
            },
          },
        }}
      />
      {overlay}
      {loadingOverlay}
    </div>
  );
};

export default Player;

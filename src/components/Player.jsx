import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import Artplayer from "artplayer";
import { useHlsHandler } from "../hooks/useHlsHandler";
import { buildAdFreeLoader } from "./Player/AdFreeLoader";
import { usePlayerHotkeys } from "./Player/usePlayerHotkeys";
import { getHeaderHtml } from "./Player/PlayerHeader";
import PlayerStyle from "./Player/PlayerStyle";

// ─────────────────────────────────────────────
// Main Player Component
// ─────────────────────────────────────────────
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
  onPlaybackIssue,
  currentSeason,
  nextSeason,
  isLastEpisodeOfSeason,
}) => {
  const artRef = useRef(null);             // DOM mount point for ArtPlayer
  const artInstanceRef = useRef(null);     // ArtPlayer instance
  const hlsInstanceRef = useRef(null);     // hls.js instance
  const mountedRef = useRef(false);        // Guard against StrictMode double-mount
  const nextEpBtnElRef = useRef(null);     // DOM ref for next-episode control button

  const onPlaybackIssueRef = useRef(onPlaybackIssue);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const nextSeasonRef = useRef(nextSeason);
  const isLastEpisodeOfSeasonRef = useRef(isLastEpisodeOfSeason);
  const playbackIssueReportedRef = useRef(false);

  useEffect(() => { nextSeasonRef.current = nextSeason; }, [nextSeason]);
  useEffect(() => { isLastEpisodeOfSeasonRef.current = isLastEpisodeOfSeason; }, [isLastEpisodeOfSeason]);
  
  const lastPositionRef = useRef(
    typeof initialTime === "number" && Number.isFinite(initialTime) ? initialTime : 0
  );

  useEffect(() => { onPlaybackIssueRef.current = onPlaybackIssue; }, [onPlaybackIssue]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);

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

  const { Hls, hlsConfig } = useHlsHandler(source, isHls);

  // Optimized poster URL via wsrv.nl (only for absolute URLs)
  const posterUrl = useMemo(() => {
    if (!poster) return null;
    if (!poster.startsWith("http")) return poster;
    return `https://wsrv.nl/?url=${encodeURIComponent(poster)}&w=800&output=webp&q=75`;
  }, [poster]);

  // LCP Optimization: preload poster image
  useLayoutEffect(() => {
    if (!posterUrl) return;
    const existing = document.head.querySelector(
      `link[rel="preload"][as="image"][href="${posterUrl}"]`
    );
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = posterUrl;
    link.setAttribute("fetchpriority", "high");
    link.dataset.copilot = "lcp-poster";
    document.head.appendChild(link);
    return () => { if (link.parentNode) link.parentNode.removeChild(link); };
  }, [posterUrl]);

  // Report playback issue (at most once per source)
  const reportPlaybackIssue = useCallback((reason) => {
    if (!onPlaybackIssueRef.current || playbackIssueReportedRef.current) return;
    playbackIssueReportedRef.current = true;
    onPlaybackIssueRef.current(reason || "playback-issue");
  }, []);

  // Use Custom Hook for Hotkeys
  usePlayerHotkeys(artInstanceRef);

  // ─── Initialize ArtPlayer ───
  useEffect(() => {
    if (canUseIframe || !artRef.current) return;
    if (isHls && !Hls) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    playbackIssueReportedRef.current = false;

    const isMobile =
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;

    let customType;
    if (isHls && Hls && Hls.isSupported()) {
      customType = {
        m3u8: (videoEl, url, artObj) => {
          const BaseLoader = Hls.DefaultConfig?.loader;
          const AdFreeLoader = buildAdFreeLoader(BaseLoader, url);

          const hls = new Hls({
            ...hlsConfig,
            capLevelToPlayerSize: false,
            ...(AdFreeLoader ? { loader: AdFreeLoader } : {}),
          });

          hlsInstanceRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(videoEl);

          let networkRecoveryAttempts = 0;
          let mediaRecoveryAttempts = 0;

          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            const art = artObj || artInstanceRef.current;

            const levels = (data?.levels || [])
              .map((lvl, idx) => ({
                height: lvl.height,
                level: idx,
                bitrate: lvl.bitrate
              }))
              .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bitrate || 0) - (a.bitrate || 0));

            const unique = [];
            const seen = new Set();
            for (const lvl of levels) {
              let label = lvl.height ? `${lvl.height}p` : (lvl.bitrate ? `${Math.round(lvl.bitrate / 1000)}k` : `SD ${lvl.level + 1}`);
              if (!seen.has(label)) {
                seen.add(label);
                unique.push({ html: label, level: lvl.level });
              }
            }

            if (art) {
              const qualityConfig = {
                name: "quality",
                width: 180,
                html: "Chất lượng",
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
                tooltip: "Chất lượng",
                selector: [{ default: true, html: "Tự động", level: -1 }, ...unique],
                onSelect(item) {
                  hls.currentLevel = item.level;
                  return item.html;
                },
              };

              const addQuality = () => {
                if (!art.setting) return;
                const existing = art.setting.settings?.find(s => s.name === "quality");
                if (existing) art.setting.update(qualityConfig);
                else art.setting.add(qualityConfig);
              };

              if (art.isReady) addQuality();
              else art.on("ready", addQuality);
            }

            const startOffset = lastPositionRef.current;
            if (startOffset > 0 && videoEl) videoEl.currentTime = startOffset;
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (!data.fatal) return;
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                networkRecoveryAttempts += 1;
                if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT || data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) {
                  reportPlaybackIssue("manifest-error");
                  break;
                }
                if (networkRecoveryAttempts <= 5) {
                  setTimeout(() => { if (hlsInstanceRef.current) hls.startLoad(); }, Math.min(500 * Math.pow(2, networkRecoveryAttempts - 1), 8000));
                } else {
                  reportPlaybackIssue("network-timeout");
                  networkRecoveryAttempts = 0;
                  hls.loadSource(url);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                mediaRecoveryAttempts += 1;
                if (mediaRecoveryAttempts <= 2) hls.recoverMediaError();
                else {
                  hls.swapAudioCodec();
                  hls.recoverMediaError();
                  mediaRecoveryAttempts = 0;
                }
                break;
              default:
                reportPlaybackIssue("fatal-hls");
                hls.destroy();
                hlsInstanceRef.current = null;
            }
          });
        },
      };
    }

    const headerHtml = getHeaderHtml(title, subtitle);

    const option = {
      container: artRef.current,
      url: source || "",
      type: isHls ? "m3u8" : undefined,
      poster: posterUrl || undefined,
      volume: 0.8,
      autoplay: false,
      pip: true,
      fullscreen: true,
      fullscreenWeb: false,
      playbackRate: true,
      setting: true,
      hotkey: false,
      theme: "#10b981",
      lang: "vi",
      muted: false,
      autoSize: false,
      aspectRatio: false,
      lock: false,
      fastForward: isMobile,
      autoPlayback: false,
      autoCursor: true,
      autoHide: 3000,
      airplay: true,
      playsInline: true,
      clickPause: true,
      settings: [],
      controls: [
        {
          position: "left",
          index: 11,
          html: `<div class="custom-10s-btn" style="display:flex;align-items:center;justify-content:center;position:relative;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill:transparent!important;"><path style="fill:transparent!important;" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path style="fill:transparent!important;" d="M3 3v5h5"/></svg><span style="position:absolute;font-size:9px;font-weight:700;top:50%;left:50%;transform:translate(-50%,-50%);margin-top:1px;">10</span></div>`,
          tooltip: "Lùi 10 giây",
          click: (art) => { art.backward = 10; },
        },
        {
          position: "left",
          index: 12,
          html: `<div class="custom-10s-btn" style="display:flex;align-items:center;justify-content:center;position:relative;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill:transparent!important;"><path style="fill:transparent!important;" d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path style="fill:transparent!important;" d="M21 3v5h-5"/></svg><span style="position:absolute;font-size:9px;font-weight:700;top:50%;left:50%;transform:translate(-50%,-50%);margin-top:1px;">10</span></div>`,
          tooltip: "Tiến 10 giây",
          click: (art) => { art.forward = 10; },
        },
        ...(onNextEpisode && (hasNextEpisode || (isLastEpisodeOfSeason && nextSeason)) ? [{
          position: "right",
          index: 20,
          html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>`,
          tooltip: isLastEpisodeOfSeason && nextSeason ? `Chuyển sang Phần ${nextSeason.seasonNumber}` : "Tập tiếp theo",
          click: () => { if (onNextEpisodeRef.current) onNextEpisodeRef.current(); },
        }] : []),
      ],
      layers: [
        { name: "header", html: headerHtml, style: { position: "absolute", top: "0", left: "0", right: "0", pointerEvents: "none" } },
        ...(onNextEpisode && (hasNextEpisode || (isLastEpisodeOfSeason && nextSeason)) ? [{
          name: "next-episode-overlay",
          html: `
            <div id="art-next-ep-layer" style="display: none; position: absolute; bottom: 80px; right: 24px; background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 14px 24px; color: #ffffff; font-size: 14px; font-weight: 700; cursor: pointer; align-items: center; gap: 12px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05); pointer-events: auto; user-select: none; max-width: 320px;">
              <span style="letter-spacing: 0.02em; line-height: 1.4;">
                ${isLastEpisodeOfSeason && nextSeason ? `<div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.1em;">Hết Phần ${currentSeason || ""}</div>Bạn có muốn chuyển sang <b>Phần ${nextSeason.seasonNumber} (Tập 1)</b> không?` : 'Tập tiếp theo'}
              </span>
            </div>`,
          click: () => { if (onNextEpisodeRef.current) onNextEpisodeRef.current(); },
          style: { position: "absolute", top: "0", left: "0", right: "0", bottom: "0", pointerEvents: "none" },
        }] : []),
      ],
      customType: customType || undefined,
    };

    if (!customType) delete option.customType;
    if (!option.type) delete option.type;
    if (!option.poster) delete option.poster;

    try {
      artInstanceRef.current = new Artplayer(option);
    } catch (err) {
      console.error("[Player] ArtPlayer init error:", err);
      mountedRef.current = false;
      return;
    }

    artInstanceRef.current.on("ready", () => {
      if (onNextEpisode && (hasNextEpisode || (isLastEpisodeOfSeason && nextSeason))) {
        nextEpBtnElRef.current = artInstanceRef.current.template?.$player?.querySelector?.("#art-next-ep-layer") || null;
        if (nextEpBtnElRef.current) {
          nextEpBtnElRef.current.onmouseenter = () => {
            Object.assign(nextEpBtnElRef.current.style, { background: "rgba(255, 255, 255, 0.18)", borderColor: "rgba(255, 255, 255, 0.3)", transform: "translateY(-4px)", boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)" });
          };
          nextEpBtnElRef.current.onmouseleave = () => {
            Object.assign(nextEpBtnElRef.current.style, { background: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.15)", transform: "translateY(0)", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)" });
          };
        }
      }
    });

    artInstanceRef.current.on("video:timeupdate", () => {
      const art = artInstanceRef.current;
      if (!art || !art.video) return;
      const t = art.video.currentTime || 0;
      const d = art.video.duration || 0;
      lastPositionRef.current = t;
      if (onTimeUpdateRef.current) onTimeUpdateRef.current(t, d);
      const btn = nextEpBtnElRef.current;
      if (btn && (hasNextEpisode || (isLastEpisodeOfSeasonRef.current && nextSeasonRef.current)) && d > 0) {
        const remainingTime = d - t;
        const shouldShow = remainingTime <= 190 || (t / d >= 0.9);
        btn.style.display = shouldShow ? "inline-flex" : "none";
      }
    });

    artInstanceRef.current.on("video:ended", () => {
      if (nextEpBtnElRef.current && (hasNextEpisode || (isLastEpisodeOfSeasonRef.current && nextSeasonRef.current))) nextEpBtnElRef.current.style.display = "inline-flex";
      if ((hasNextEpisode || (isLastEpisodeOfSeasonRef.current && nextSeasonRef.current)) && onNextEpisodeRef.current) onNextEpisodeRef.current();
    });

    artInstanceRef.current.on("video:play", () => artInstanceRef.current.emit("notice", "Đang phát"));
    artInstanceRef.current.on("video:pause", () => artInstanceRef.current.emit("notice", "Đã tạm dừng"));
    artInstanceRef.current.on("video:error", () => reportPlaybackIssue("video-error"));

    return () => {
      mountedRef.current = false;
      if (hlsInstanceRef.current) { hlsInstanceRef.current.destroy(); hlsInstanceRef.current = null; }
      if (artInstanceRef.current) { artInstanceRef.current.destroy(false); artInstanceRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, Hls, isHls, canUseIframe]);



  useEffect(() => {
    playbackIssueReportedRef.current = false;
    lastPositionRef.current = typeof initialTime === "number" && Number.isFinite(initialTime) ? initialTime : 0;
  }, [source, initialTime]);

  const containerClass = `relative w-full overflow-hidden bg-black shadow-2xl transition-all duration-500 z-10 rounded-2xl border border-white/10`;

  if (canUseIframe) {
    return (
      <div className={containerClass} style={{ aspectRatio: "16 / 9" }}>
        <iframe title="player" src={source} className="h-full w-full" allowFullScreen />
      </div>
    );
  }

  return (
    <div className={containerClass} style={{ aspectRatio: "16 / 9" }}>
      <div ref={artRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {actionSlot && <div className="absolute top-3 right-3 z-40 pointer-events-auto" data-control>{actionSlot}</div>}
      <PlayerStyle />
    </div>
  );
};

export default Player;

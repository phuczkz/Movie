import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import Artplayer from "artplayer";
import { useHlsHandler } from "../hooks/useHlsHandler";
import { STREAM_PROXY, FALLBACK_PROXY, stripAdSegmentsFromPlaylist } from "../utils/hlsUtils";
import { SkipForward, X } from "lucide-react";

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
  theaterMode = false,
  onToggleTheater,
  onPlaybackIssue,
}) => {
  const artRef = useRef(null);             // DOM mount point for ArtPlayer
  const artInstanceRef = useRef(null);     // ArtPlayer instance
  const hlsInstanceRef = useRef(null);     // hls.js instance
  const mountedRef = useRef(false);        // Guard against StrictMode double-mount
  const nextEpBtnElRef = useRef(null);     // DOM ref for next-episode control button

  const onPlaybackIssueRef = useRef(onPlaybackIssue);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onToggleTheaterRef = useRef(onToggleTheater);
  const playbackIssueReportedRef = useRef(false);
  const lastPositionRef = useRef(
    typeof initialTime === "number" && Number.isFinite(initialTime) ? initialTime : 0
  );
  useEffect(() => { onPlaybackIssueRef.current = onPlaybackIssue; }, [onPlaybackIssue]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);
  useEffect(() => { onToggleTheaterRef.current = onToggleTheater; }, [onToggleTheater]);

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

  // ─── Build the AdFreeLoader class (proxy chain + ad stripping) ───
  const buildAdFreeLoader = useCallback((BaseLoader, effectiveSource) => {
    if (!BaseLoader) return null;

    const PROXY_CHAIN = [
      ...(STREAM_PROXY ? [STREAM_PROXY] : []),
      ...(FALLBACK_PROXY && FALLBACK_PROXY !== STREAM_PROXY ? [FALLBACK_PROXY] : []),
    ];

    const domainFailedProxies = new Map();
    const urlFailedProxies = new Map();

    const getBestProxy = (origin) => {
      const domainFailed = origin ? domainFailedProxies.get(origin) : null;
      for (const proxy of PROXY_CHAIN) {
        if (domainFailed && domainFailed.has(proxy)) continue;
        return proxy;
      }
      return null;
    };

    const markProxyFailed = (origin, proxyBase) => {
      if (!origin) return;
      if (!domainFailedProxies.has(origin)) domainFailedProxies.set(origin, new Set());
      domainFailedProxies.get(origin).add(proxyBase);
    };

    return class AdFreeLoader extends BaseLoader {
      load(context, config, callbacks) {
        const originalUrl = context.url;
        let originalOrigin = null;
        try {
          if (originalUrl) originalOrigin = new URL(originalUrl).origin;
        } catch { /* ignore */ }

        // Only proxy manifests and levels by default. 
        // Fragments (TS) are bypassed to avoid buffering latency, unless direct fetch fails.
        const isManifestOrLevel = context.type === "manifest" || context.type === "level";
        let activeProxy = null;
        const alreadyProxied = PROXY_CHAIN.some((p) => context.url.includes(p));

        if (!alreadyProxied && context.url && isManifestOrLevel) {
          activeProxy = getBestProxy(originalOrigin);
          if (activeProxy) {
            context.url = `${activeProxy}?url=${encodeURIComponent(context.url)}`;
          }
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
                  response.url || ctx?.url || effectiveSource
                );
                if (
                  typeof filtered === "string" &&
                  filtered.includes("#EXTM3U") &&
                  filtered.includes("#EXTINF")
                ) {
                  nextResponse = { ...response, data: filtered };
                }
              } catch { /* Ignore malformed ad-filtering input */ }
            }
            if (onSuccess) onSuccess(nextResponse, stats, ctx, networkDetails);
          },
          onError: (error, ctx, networkDetails, stats) => {
            // If direct fragment fetch failed, try fallback to proxy
            if (!isManifestOrLevel && !activeProxy && !alreadyProxied && originalUrl) {
              const fallbackProxy = getBestProxy(originalOrigin);
              if (fallbackProxy) {
                console.debug(`[HLS] Direct fragment failed, retrying via proxy fallback.`);
                try { this.abort(); } catch { /* ignore */ }
                const retryLoader = new (this.constructor)(config);
                const retryContext = { ...context, url: `${fallbackProxy}?url=${encodeURIComponent(originalUrl)}` };
                retryLoader.load(retryContext, config, wrappedCallbacks);
                return;
              }
            }

            if (activeProxy && originalUrl) {
              markProxyFailed(originalOrigin, activeProxy);
              const nextProxy = getBestProxy(originalOrigin);

              if (nextProxy && nextProxy !== activeProxy) {
                console.debug(`[HLS] Primary proxy failed for ${originalOrigin}, trying secondary.`);
                try { this.abort(); } catch { /* ignore */ }
                const retryLoader = new (this.constructor)(config);
                const retryContext = { ...context, url: `${nextProxy}?url=${encodeURIComponent(originalUrl)}` };
                retryLoader.load(retryContext, config, wrappedCallbacks);
                return;
              }

              const urlFailed = urlFailedProxies.get(originalUrl);
              if (!urlFailed || !urlFailed.has("direct")) {
                console.debug(`[HLS] All proxies failed for ${originalOrigin}, trying direct.`);
                if (!urlFailedProxies.has(originalUrl)) urlFailedProxies.set(originalUrl, new Set());
                urlFailedProxies.get(originalUrl).add("direct");
                try { this.abort(); } catch { /* ignore */ }
                const directLoader = new (this.constructor)(config);
                const directContext = { ...context, url: originalUrl };
                directLoader.load(directContext, config, wrappedCallbacks);
                return;
              }
            }
            if (onError) onError(error, ctx, networkDetails, stats);
          },
        };
        super.load(context, config, wrappedCallbacks);
      }
    };
  }, []);

  // ─── Initialize ArtPlayer ───
  useEffect(() => {
    // Don't init if iframe source or no DOM mount point
    if (canUseIframe || !artRef.current) return;

    // For HLS sources, wait until hls.js has been lazy-loaded
    if (isHls && !Hls) return;

    // StrictMode guard: ignore the second mount in development
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Reset per-source state
    playbackIssueReportedRef.current = false;

    const isMobile =
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;

    // ── Build HLS customType ──
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

            // Build quality levels list (Highest to Lowest)
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
              let label = "";
              if (lvl.height) {
                label = `${lvl.height}p`;
              } else if (lvl.bitrate) {
                label = `${Math.round(lvl.bitrate / 1000)}k`;
              } else {
                label = `SD ${lvl.level + 1}`;
              }

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
                selector: [
                  { default: true, html: "Tự động", level: -1 },
                  ...unique,
                ],
                onSelect(item) {
                  hls.currentLevel = item.level;
                  return item.html;
                },
              };

              const addQuality = () => {
                if (!art.setting) return;
                const existing = art.setting.settings?.find(s => s.name === "quality");
                if (existing) {
                  art.setting.update(qualityConfig);
                } else {
                  art.setting.add(qualityConfig);
                }
              };

              if (art.isReady) {
                addQuality();
              } else {
                art.on("ready", addQuality);
              }
            }

            // Seek to initial time
            const startOffset = lastPositionRef.current;
            if (startOffset > 0 && videoEl) {
              videoEl.currentTime = startOffset;
            }
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
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
                  setTimeout(
                    () => { if (hlsInstanceRef.current) hls.startLoad(); },
                    Math.min(500 * Math.pow(2, networkRecoveryAttempts - 1), 8000)
                  );
                } else {
                  reportPlaybackIssue("network-timeout");
                  networkRecoveryAttempts = 0;
                  hls.loadSource(url);
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
                hlsInstanceRef.current = null;
            }
          });
        },
      };
    }

    // Header HTML layer
    const headerHtml = `
      <div id="art-header-layer" style="
        pointer-events:none;
        background:linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.3) 45%,transparent 100%);
        padding:12px 16px;
        display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
        width:100%;box-sizing:border-box;
      ">
        <div style="overflow:hidden">
          ${title ? `<p style="margin:0;font-size:13px;font-weight:600;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:480px">${title}</p>` : ""}
          ${subtitle ? `<p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.85);text-shadow:0 2px 6px rgba(0,0,0,1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:480px">${subtitle}</p>` : ""}
        </div>
      </div>`;

    // ── ArtPlayer options ──
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
      lock: isMobile,
      fastForward: isMobile,
      autoPlayback: false,
      autoCursor: true,
      autoHide: 3000,
      airplay: true,
      playsInline: true,
      clickPause: true,
      controls: [
        // Seek backward 10s (left side, after play button)
        {
          position: "left",
          index: 11,
          html: `<div class="custom-10s-btn" style="display:flex;align-items:center;justify-content:center;position:relative;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill:transparent!important;"><path style="fill:transparent!important;" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path style="fill:transparent!important;" d="M3 3v5h5"/></svg><span style="position:absolute;font-size:9px;font-weight:700;top:50%;left:50%;transform:translate(-50%,-50%);margin-top:1px;">10</span></div>`,
          tooltip: "Lùi 10 giây",
          click: (art) => {
            art.backward = 10;
          },
        },
        // Seek forward 10s (left side, after backward button)
        {
          position: "left",
          index: 12,
          html: `<div class="custom-10s-btn" style="display:flex;align-items:center;justify-content:center;position:relative;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill:transparent!important;"><path style="fill:transparent!important;" d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path style="fill:transparent!important;" d="M21 3v5h-5"/></svg><span style="position:absolute;font-size:9px;font-weight:700;top:50%;left:50%;transform:translate(-50%,-50%);margin-top:1px;">10</span></div>`,
          tooltip: "Tiến 10 giây",
          click: (art) => {
            art.forward = 10;
          },
        },
        // Theater mode button (desktop only)
        ...(onToggleTheater && !isMobile
          ? [
            {
              position: "right",
              index: 15,
              html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="3" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`,
              tooltip: theaterMode ? "Thoát chế độ rạp phim" : "Chế độ rạp phim",
              click: () => { if (onToggleTheaterRef.current) onToggleTheaterRef.current(); },
            },
          ]
          : []),
        // Next Episode button (always visible in control bar if next exists)
        ...(onNextEpisode && hasNextEpisode
          ? [
            {
              position: "right",
              index: 20,
              html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>`,
              tooltip: "Tập tiếp theo",
              click: (art) => { if (onNextEpisodeRef.current) onNextEpisodeRef.current(); },
            },
          ]
          : []),
      ],
      layers: [
        {
          name: "header",
          html: headerHtml,
          style: {
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            pointerEvents: "none",
            opacity: "0",
            transition: "opacity 0.3s ease",
          },
        },
        // Floating Next Episode button (shows above control bar)
        ...(onNextEpisode && hasNextEpisode
          ? [
            {
              name: "next-episode-overlay",
              html: `
                <div id="art-next-ep-layer" style="
                  display: none;
                  position: absolute;
                  bottom: 80px;
                  right: 24px;
                  background: rgba(255, 255, 255, 0.08);
                  backdrop-filter: blur(16px);
                  -webkit-backdrop-filter: blur(16px);
                  border: 1px solid rgba(255, 255, 255, 0.15);
                  border-radius: 12px;
                  padding: 12px 24px;
                  color: #ffffff;
                  font-size: 14px;
                  font-weight: 700;
                  cursor: pointer;
                  align-items: center;
                  gap: 10px;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
                  pointer-events: auto;
                  user-select: none;
                ">
                  <span style="letter-spacing: 0.03em;">Tập tiếp theo</span>
                </div>`,
              click: () => { if (onNextEpisodeRef.current) onNextEpisodeRef.current(); },
              style: {
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                pointerEvents: "none",
              },
            },
          ]
          : []),
      ],
      customType: customType || undefined,
    };

    // Remove undefined keys to avoid ArtPlayer validation errors
    if (!customType) delete option.customType;
    if (!option.type) delete option.type;
    if (!option.poster) delete option.poster;


    let art;
    try {
      art = new Artplayer(option);
      artInstanceRef.current = art;
    } catch (err) {
      console.error("[Player] ArtPlayer init error:", err);
      mountedRef.current = false;
      return;
    }

    // Show/hide header layer with controls visibility
    art.on("ready", () => {
      const layer = art.template?.$player?.querySelector?.("#art-header-layer");
      if (layer) {
        const parentLayer = layer.closest(".art-layer");
        if (parentLayer) {
          parentLayer.style.opacity = "1";
        }
        art.on("controls:show", () => {
          if (parentLayer) parentLayer.style.opacity = "1";
        });
        art.on("controls:hide", () => {
          if (parentLayer) parentLayer.style.opacity = "0";
        });
      }

      // Cache ref to the next-episode DOM button (injected via layer html)
      if (onNextEpisode && hasNextEpisode) {
        nextEpBtnElRef.current =
          art.template?.$player?.querySelector?.("#art-next-ep-layer") || null;

        // Add hover effect
        if (nextEpBtnElRef.current) {
          nextEpBtnElRef.current.onmouseenter = () => {
            nextEpBtnElRef.current.style.background = "rgba(255, 255, 255, 0.18)";
            nextEpBtnElRef.current.style.borderColor = "rgba(255, 255, 255, 0.3)";
            nextEpBtnElRef.current.style.transform = "translateY(-4px)";
            nextEpBtnElRef.current.style.boxShadow = "0 25px 50px rgba(0, 0, 0, 0.5)";
          };
          nextEpBtnElRef.current.onmouseleave = () => {
            nextEpBtnElRef.current.style.background = "rgba(255, 255, 255, 0.08)";
            nextEpBtnElRef.current.style.borderColor = "rgba(255, 255, 255, 0.15)";
            nextEpBtnElRef.current.style.transform = "translateY(0)";
            nextEpBtnElRef.current.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.4)";
          };
        }
      }

      // Note: Custom hotkeys (F, Space, Arrows) are now handled by a global document listener
      // defined below using a separate useEffect, ensuring they work regardless of focus.
    });

    // Track time progress + next-episode button visibility
    art.on("video:timeupdate", () => {
      const video = art.video;
      if (!video) return;
      const t = video.currentTime || 0;
      const d = video.duration || 0;
      lastPositionRef.current = t;
      if (onTimeUpdateRef.current) onTimeUpdateRef.current(t, d);

      // Show "Tập tiếp theo" button when the video is nearing its end
      const btn = nextEpBtnElRef.current;
      if (btn && hasNextEpisode && d > 0) {
        // Show if remaining time <= 3 minutes (190s) OR progress >= 90% (for short clips)
        const remainingTime = d - t;
        const shouldShow = remainingTime <= 190 || (t / d >= 0.9);
        btn.style.display = shouldShow ? "inline-flex" : "none";
      }
    });

    // Video ended → show button immediately + auto jump to next episode
    art.on("video:ended", () => {
      const btn = nextEpBtnElRef.current;
      if (btn && hasNextEpisode) btn.style.display = "inline-flex";
      if (hasNextEpisode && onNextEpisodeRef.current) {
        onNextEpisodeRef.current();
      }
    });

    // Track video play/pause to show notices (sync with clicks and hotkeys)
    art.on("video:play", () => {
      art.emit("notice", "Đang phát");
    });
    art.on("video:pause", () => {
      art.emit("notice", "Đã tạm dừng");
    });

    // Error reporting
    art.on("video:error", () => reportPlaybackIssue("video-error"));

    return () => {
      mountedRef.current = false;
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      if (artInstanceRef.current) {
        artInstanceRef.current.destroy(false);
        artInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, Hls, isHls, canUseIframe]);

  // Handle Resize when theater mode toggles
  useEffect(() => {
    const art = artInstanceRef.current;
    if (art && art.isReady) {
      // Small timeout to ensure DOM layout has updated
      setTimeout(() => art.resize(), 100);
    }
  }, [theaterMode]);

  // When source changes (e.g. episode switch), reset state
  // Note: mountedRef reset happens in the cleanup of the main useEffect
  useEffect(() => {
    playbackIssueReportedRef.current = false;
    lastPositionRef.current =
      typeof initialTime === "number" && Number.isFinite(initialTime) ? initialTime : 0;
  }, [source, initialTime]);

  // Global hotkeys (Space, F, Left, Right)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Do not trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target;
      if (
        target &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.isContentEditable)
      ) {
        return;
      }

      const art = artInstanceRef.current;
      if (!art || !art.isReady) return;

      // Handle Space for Play/Pause
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        art.toggle();
      }
      // Handle F for Fullscreen
      else if (e.code === "KeyF" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        art.fullscreen = !art.fullscreen;
        art.emit('notice', art.fullscreen ? "Toàn màn hình" : "Thoát toàn màn hình");
      }
      // Handle M for Mute
      else if (e.code === "KeyM" || e.key === "m" || e.key === "M") {
        e.preventDefault();
        art.muted = !art.muted;
        art.emit('notice', art.muted ? "Tắt tiếng" : "Bật tiếng");
      }
      // Handle Seek Backward
      else if (e.code === "ArrowLeft" || e.key === "ArrowLeft") {
        e.preventDefault();
        art.backward = 10;
        art.emit('notice', "Lùi 10 giây");
      }
      // Handle Seek Forward
      else if (e.code === "ArrowRight" || e.key === "ArrowRight") {
        e.preventDefault();
        art.forward = 10;
        art.emit('notice', "Tiến 10 giây");
      }
      // Handle Volume Up
      else if (e.code === "ArrowUp" || e.key === "ArrowUp") {
        e.preventDefault();
        const newVol = Math.min(art.volume + 0.1, 1);
        art.volume = newVol;
        art.emit('notice', `Âm lượng: ${Math.round(newVol * 100)}%`);
      }
      // Handle Volume Down
      else if (e.code === "ArrowDown" || e.key === "ArrowDown") {
        e.preventDefault();
        const newVol = Math.max(art.volume - 0.1, 0);
        art.volume = newVol;
        art.emit('notice', `Âm lượng: ${Math.round(newVol * 100)}%`);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // ── Theater mode container classes ──
  const containerClass = `relative w-full overflow-hidden bg-black shadow-2xl transition-all duration-500 ${theaterMode
    ? "z-[60] rounded-none sm:rounded-xl ring-1 ring-white/10"
    : "z-10 rounded-2xl border border-white/10"
    }`;

  // ── Iframe source ──
  if (canUseIframe) {
    return (
      <div
        className={containerClass}
        style={{ aspectRatio: "16 / 9" }}
      >
        <iframe
          title="player"
          src={source}
          className="h-full w-full"
          allowFullScreen
        />
      </div>
    );
  }

  // ── ArtPlayer ──
  return (
    <div
      className={containerClass}
      style={{ aspectRatio: "16 / 9" }}
    >
      {/* ArtPlayer mount target — must have explicit height */}
      <div
        ref={artRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* Action slot (e.g. admin buttons) */}
      {actionSlot && (
        <div className="absolute top-3 right-3 z-40 pointer-events-auto" data-control>
          {actionSlot}
        </div>
      )}

      {/* Responsive control bar optimization */}
      <style>
        {`
          /* Darken poster */
          .art-poster {
            filter: brightness(0.4) contrast(1.1) !important;
          }

          /* Mouse cursor fixes: ensure cursor is visible when moving or controls are shown */
          .art-video-player {
            cursor: default !important;
          }
          .art-video-player .art-mask,
          .art-video-player .art-video {
            cursor: default !important;
          }
          /* Hide cursor only when ArtPlayer adds the hide class after inactivity */
          .art-video-player.art-hide-cursor,
          .art-video-player.art-hide-cursor * {
            cursor: none !important;
          }
          /* Ensure controls still show the pointer */
          .art-control, .art-control *, .art-setting, .art-setting * {
            cursor: pointer !important;
          }

          /* Force font family on all player elements */
          .art-video-player, 
          .art-video-player *, 
          .art-control, 
          .art-layer, 
          .art-setting, 
          .art-info, 
          .art-contextmenu {
            font-family: 'Manrope', 'Satoshi', system-ui, -apple-system, sans-serif !important;
            -webkit-font-smoothing: antialiased;
          }

          /* Tablet and Mobile Adjustments (Desktop remains default) */
          @media (max-width: 768px) {
            /* Overall adjustments to prevent pushing out of frame */
            .art-bottom {
              white-space: nowrap !important;
              width: 100% !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              padding-right: 4px !important;
              padding-left: 4px !important;
            }
            .art-controls-left, .art-controls-right {
              display: flex !important;
              align-items: center !important;
              flex-shrink: 1 !important;
              min-width: 0 !important;
            }
            /* Force all controls to not have fixed large widths/margins naturally */
            .art-bottom .art-control {
              min-width: 0 !important;
              margin: 0 !important;
              padding: 0 4px !important;
            }
            .art-bottom .art-control svg {
              width: 18px !important;
              height: 18px !important;
            }
            .art-bottom .custom-10s-btn svg {
              width: 18px !important;
              height: 18px !important;
            }
            .art-bottom .custom-10s-btn span {
              font-size: 8px !important;
            }
            .art-bottom .art-control-time {
              font-size: 10px !important;
              padding: 0 4px !important;
            }
          }

          /* Mobile L */
          @media (max-width: 480px) {
            .art-bottom .art-control {
              padding: 0 2px !important;
            }
            .art-bottom .art-control svg {
              width: 16px !important;
              height: 16px !important;
            }
            .art-bottom .custom-10s-btn svg {
              width: 16px !important;
              height: 16px !important;
            }
            .art-bottom .custom-10s-btn span {
              font-size: 7.5px !important;
            }
            .art-bottom .art-control-time {
              font-size: 9px !important;
              padding: 0 2px !important;
              letter-spacing: -0.5px !important;
            }
            .art-bottom {
              padding-right: 2px !important;
              padding-left: 2px !important;
            }
          }

          /* Mobile S */
          @media (max-width: 360px) {
            .art-bottom .art-control {
              padding: 0 1px !important;
            }
            .art-bottom .art-control svg {
              width: 14px !important;
              height: 14px !important;
            }
            .art-bottom .custom-10s-btn svg {
              width: 14px !important;
              height: 14px !important;
            }
            .art-bottom .custom-10s-btn span {
              font-size: 6px !important;
            }
            .art-bottom .art-control-time {
              font-size: 8px !important;
              letter-spacing: -1px !important;
              padding: 0 1px !important;
            }
          }

          /* Hover effect for floating button */
          #art-next-ep-layer:hover {
            /* Handled in JS for background, shadow handled here */
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6) !important;
          }

          /* Adjust position for mobile */
          @media (max-width: 768px) {
            #art-next-ep-layer {
              bottom: 65px !important;
              right: 16px !important;
              padding: 10px 16px !important;
              font-size: 11px !important;
              border-radius: 8px !important;
              font-weight: 900 !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Player;

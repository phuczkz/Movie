/**
 * player-hls-adapter.js
 *
 * Đóng gói toàn bộ logic tạo customType cho Artplayer + hls.js:
 * - Khởi tạo hls.js instance
 * - Build quality selector từ manifest levels
 * - Xử lý lỗi mạng / media / fatal (auto-recovery)
 * - A/V desync watchdog
 *
 * Được tách từ Player.jsx để giảm kích thước component chính (~300 dòng).
 */

/**
 * Tạo customType object cho Artplayer hỗ trợ HLS streaming.
 *
 * @param {Object} params
 * @param {Function} params.Hls - hls.js constructor
 * @param {Object} params.hlsConfigRef - ref chứa hlsConfig hiện tại
 * @param {Object} params.hlsInstanceRef - ref lưu hls instance (để cleanup)
 * @param {Object} params.pendingSeekRef - ref chứa vị trí seek ban đầu
 * @param {Object} params.artInstanceRef - ref chứa Artplayer instance
 * @param {Object} params.mountedRef - ref theo dõi mounted state
 * @param {Function} params.reportPlaybackIssue - callback báo lỗi phát
 * @returns {Object} customType object cho Artplayer option
 */
export function createHlsCustomType({
  Hls,
  hlsConfigRef,
  hlsInstanceRef,
  pendingSeekRef,
  artInstanceRef,
  mountedRef,
  reportPlaybackIssue,
}) {
  return {
    m3u8: (videoEl, url, artObj) => {
      // ── Performance timing ──
      const t0 = performance.now();

      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }

      const seekTarget = pendingSeekRef.current;
      // KHÔNG xoá pendingSeekRef.current ở đây!
      // Hls.js sẽ dùng startPosition để tải đúng chunk mạng (tiết kiệm băng thông),
      // Nhưng ta vẫn cần pendingSeekRef cho sự kiện `loadedmetadata` phía dưới
      // để ép buộc trình duyệt/Artplayer không được reset về 0.

      const hls = new Hls({
        ...hlsConfigRef.current,
        startPosition: seekTarget > 0 ? seekTarget : -1,
        capLevelToPlayerSize: false,
      });

      hlsInstanceRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoEl);

      let networkRecoveryAttempts = 0;
      let mediaRecoveryAttempts = 0;
      let desyncRecoveryAttempts = 0;

      // Measure time to first frame
      const onCanPlay = () => {
        const elapsed = (performance.now() - t0).toFixed(0);
        console.log(
          `%c[Perf] ▶ Video ready in ${elapsed}ms`,
          elapsed <= 200
            ? "color: #10b981; font-weight: bold; font-size: 13px;"
            : elapsed <= 500
              ? "color: #f59e0b; font-weight: bold; font-size: 13px;"
              : "color: #ef4444; font-weight: bold; font-size: 13px;"
        );
        videoEl.removeEventListener("canplay", onCanPlay);
      };
      videoEl.addEventListener("canplay", onCanPlay);

      // ── Quality selector từ manifest ──
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const manifestTime = (performance.now() - t0).toFixed(0);
        console.log(
          `%c[Perf] 📋 Manifest parsed in ${manifestTime}ms (${data?.levels?.length || 0
          } levels)`,
          "color: #8b5cf6; font-weight: bold;"
        );

        const art = artObj || artInstanceRef.current;

        const levels = (data?.levels || [])
          .map((lvl, idx) => ({
            height: lvl.height,
            level: idx,
            bitrate: lvl.bitrate,
          }))
          .sort(
            (a, b) =>
              (b.height || 0) - (a.height || 0) ||
              (b.bitrate || 0) - (a.bitrate || 0)
          );

        const unique = [];
        const seen = new Set();
        for (const lvl of levels) {
          let label = lvl.height
            ? `${lvl.height}p`
            : lvl.bitrate
              ? `${Math.round(lvl.bitrate / 1000)}k`
              : `SD ${lvl.level + 1}`;
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
            const existing = art.setting.find("quality");
            if (existing) {
              art.setting.update(qualityConfig);
            } else {
              art.setting.add(qualityConfig);
            }
          };

          if (art.isReady) addQuality();
          else art.on("ready", addQuality);
        }
      });

      // ── Error handling with auto-recovery ──
      hls.on(Hls.Events.ERROR, (_, data) => {
        // Handle non-fatal errors that can cause A/V desync
        if (!data.fatal) {
          if (
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.FRAG_PARSING_ERROR
          ) {
            console.debug("[HLS] Non-fatal recovery:", data.details);
            // KHÔNG GỌI hls.startLoad() Ở ĐÂY.
            // Nếu gọi startLoad() lúc mạng đang chậm, nó sẽ hủy (cancel) segment đang tải dở
            // và bắt tải lại từ đầu (0%), gây ra tình trạng delay rất lâu và request bị canceled!
          }
          return;
        }

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
                if (hlsInstanceRef.current) hls.startLoad();
              }, Math.min(500 * Math.pow(2, networkRecoveryAttempts - 1), 8000));
            } else {
              reportPlaybackIssue("network-timeout");
              networkRecoveryAttempts = 0;
              hls.loadSource(url);
              hls.attachMedia(videoEl);
              const currentPos = videoEl.currentTime;
              if (currentPos > 0) {
                videoEl.currentTime = currentPos;
              }
              videoEl.play().catch(() => { });
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            mediaRecoveryAttempts += 1;
            if (mediaRecoveryAttempts <= 2) {
              console.warn(
                "[Player] Fatal media error, recovering media..."
              );
              hls.recoverMediaError();
            } else if (mediaRecoveryAttempts <= 4) {
              console.warn(
                "[Player] Persistent media error, swapping audio codec and recovering..."
              );
              hls.swapAudioCodec();
              hls.recoverMediaError();
            } else {
              console.error(
                "[Player] Media recovery failed multiple times. Reloading source completely..."
              );
              mediaRecoveryAttempts = 0;
              hls.loadSource(url);
              hls.attachMedia(videoEl);
              const currentPos = videoEl.currentTime;
              if (currentPos > 0) {
                videoEl.currentTime = currentPos;
              }
              videoEl.play().catch(() => { });
            }
            break;
          default:
            reportPlaybackIssue("fatal-hls");
            console.error(
              "[Player] Fatal HLS error, attempting full reload of stream..."
            );
            hls.destroy();
            hlsInstanceRef.current = null;
            // Wait 2s and reload the exact URL that had the error, preserving playhead
            setTimeout(() => {
              if (
                mountedRef.current &&
                artInstanceRef.current &&
                artInstanceRef.current.video
              ) {
                const currentPos = artInstanceRef.current.video.currentTime;
                if (currentPos > 0) {
                  // posterUrl is accessed via artInstanceRef — caller sets it on the instance
                  const poster = artInstanceRef.current._hlsPosterUrl || "";
                  artInstanceRef.current.switchUrl(url, poster);
                }
              }
            }, 2000);
        }
      });

      // ── A/V Desync & Stuck Buffer Watchdog ──
      setupDesyncWatchdog({
        videoEl,
        url,
        hlsInstanceRef,
        desyncRecoveryAttempts,
      });
    },
  };
}

/**
 * Thiết lập watchdog phát hiện A/V desync và buffer bị đứng.
 * Tự động recovery khi phát hiện video freeze.
 */
function setupDesyncWatchdog({ videoEl, url, hlsInstanceRef }) {
  let lastWatchdogTime = 0;
  let lastTotalFrames = 0;
  let lastCheckRealTime = 0;
  let desyncFreezeStartTime = 0;
  let lastSeekTime = 0;
  let desyncRecoveryAttempts = 0;

  if (videoEl && videoEl._desyncWatchdog) {
    clearInterval(videoEl._desyncWatchdog);
  }

  const desyncWatchdog = setInterval(() => {
    const now = performance.now();

    if (
      !videoEl ||
      videoEl.paused ||
      videoEl.ended ||
      videoEl.seeking ||
      videoEl.readyState < 3 ||
      document.hidden ||
      now - lastSeekTime < 2000
    ) {
      desyncFreezeStartTime = 0;
      return;
    }

    const currentTime = videoEl.currentTime;

    let totalFrames = 0;
    const quality =
      typeof videoEl.getVideoPlaybackQuality === "function"
        ? videoEl.getVideoPlaybackQuality()
        : null;
    if (quality) {
      totalFrames = quality.totalVideoFrames;
    } else if (typeof videoEl.webkitDecodedFrameCount === "number") {
      totalFrames = videoEl.webkitDecodedFrameCount;
    }

    if (lastCheckRealTime === 0) {
      lastWatchdogTime = currentTime;
      lastTotalFrames = totalFrames;
      lastCheckRealTime = now;
      return;
    }

    const timeDelta = currentTime - lastWatchdogTime;
    const frameDelta = totalFrames - lastTotalFrames;
    const playbackRate = videoEl.playbackRate || 1;
    const freezeTimeout = playbackRate > 1 ? 4000 : 3000;

    if (
      totalFrames > 0 &&
      lastTotalFrames > 0 &&
      timeDelta > 0.05 &&
      frameDelta === 0
    ) {
      if (desyncFreezeStartTime === 0) {
        desyncFreezeStartTime = now;
      } else if (now - desyncFreezeStartTime > freezeTimeout) {
        desyncRecoveryAttempts += 1;
        console.warn(
          `[Player] Video freeze detected at ${currentTime.toFixed(
            1
          )}s. Recovery #${desyncRecoveryAttempts}`
        );
        desyncFreezeStartTime = 0;

        if (hlsInstanceRef.current) {
          if (desyncRecoveryAttempts <= 2) {
            hlsInstanceRef.current.recoverMediaError();
          } else {
            desyncRecoveryAttempts = 0;
            hlsInstanceRef.current.loadSource(url);
            hlsInstanceRef.current.attachMedia(videoEl);
            if (currentTime > 0) videoEl.currentTime = currentTime;
            videoEl.play().catch(() => { });
          }

          lastWatchdogTime = videoEl.currentTime;
          lastTotalFrames = totalFrames;
          lastCheckRealTime = performance.now();
        }
      }
    } else {
      desyncFreezeStartTime = 0;
      if (frameDelta > 0) desyncRecoveryAttempts = 0;
    }

    lastWatchdogTime = currentTime;
    lastTotalFrames = totalFrames;
    lastCheckRealTime = now;
  }, 500);

  videoEl._desyncWatchdog = desyncWatchdog;

  const onSeeking = () => {
    lastSeekTime = performance.now();
    desyncFreezeStartTime = 0;
  };
  const onSeeked = () => {
    lastSeekTime = performance.now();
    desyncFreezeStartTime = 0;
    lastCheckRealTime = 0;
  };

  videoEl.addEventListener("seeking", onSeeking);
  videoEl.addEventListener("seeked", onSeeked);
  videoEl._seekCleanup = () => {
    videoEl.removeEventListener("seeking", onSeeking);
    videoEl.removeEventListener("seeked", onSeeked);
  };
}

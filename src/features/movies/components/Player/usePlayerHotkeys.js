import { useEffect } from 'react';

/**
 * Custom hook to handle global keyboard shortcuts for the player.
 */
export const usePlayerHotkeys = (artInstanceRef) => {
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

    // Integrate with Media Session API for PIP mode and OS media controls
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          const art = artInstanceRef.current;
          if (art && art.isReady) {
            const skipTime = details.seekOffset || 10;
            art.backward = skipTime;
            art.emit('notice', `Lùi ${skipTime} giây`);
          }
        });
        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          const art = artInstanceRef.current;
          if (art && art.isReady) {
            const skipTime = details.seekOffset || 10;
            art.forward = skipTime;
            art.emit('notice', `Tiến ${skipTime} giây`);
          }
        });
      } catch (error) {
        console.warn("Media Session API seek handlers not supported", error);
      }
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("seekbackward", null);
          navigator.mediaSession.setActionHandler("seekforward", null);
        } catch {
          // Media session handlers might not be supported on all browsers
        }
      }
    };
  }, [artInstanceRef]);
};

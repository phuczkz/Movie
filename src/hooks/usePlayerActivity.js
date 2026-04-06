import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Hook to manage player control visibility based on user activity.
 */
export const usePlayerActivity = (playing) => {
  const [controlsVisibleDuringPlayback, setControlsVisibleDuringPlayback] =
    useState(true);
  const hideControlsTimeout = useRef(null);

  const controlsVisible = !playing || controlsVisibleDuringPlayback;

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimeout();
    if (!playing) return;

    hideControlsTimeout.current = setTimeout(() => {
      setControlsVisibleDuringPlayback(false);
    }, 3000);
  }, [playing, clearHideControlsTimeout]);

  const showControls = useCallback(() => {
    setControlsVisibleDuringPlayback(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleUserActivity = useCallback(() => {
    showControls();
  }, [showControls]);

  useEffect(() => {
    if (!playing) {
      clearHideControlsTimeout();
      return;
    }
    scheduleHideControls();
  }, [playing, scheduleHideControls, clearHideControlsTimeout]);

  useEffect(() => {
    return () => clearHideControlsTimeout();
  }, [clearHideControlsTimeout]);

  return {
    controlsVisible,
    setControlsVisible: setControlsVisibleDuringPlayback,
    showControls,
    handleUserActivity,
  };
};

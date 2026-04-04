import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook to manage player control visibility based on user activity.
 */
export const usePlayerActivity = (playing) => {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeout = useRef(null);

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
      setControlsVisible(false);
    }, 3000);
  }, [playing, clearHideControlsTimeout]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleUserActivity = useCallback(() => {
    showControls();
  }, [showControls]);

  useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      clearHideControlsTimeout();
    } else {
      scheduleHideControls();
    }
  }, [playing, scheduleHideControls, clearHideControlsTimeout]);

  useEffect(() => {
    return () => clearHideControlsTimeout();
  }, [clearHideControlsTimeout]);

  return {
    controlsVisible,
    setControlsVisible,
    showControls,
    handleUserActivity,
  };
};

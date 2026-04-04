import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook to manage common video player state.
 */
export const usePlayerState = (initialTime = 0) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  const lastPositionRef = useRef(0);
  const initialTimeConsumed = useRef(false);
  const playbackIssueReportedRef = useRef(false);

  const resetState = useCallback(() => {
    setDuration(0);
    setProgress(0);
    setIsBuffering(true);
    setPlaying(false);
    playbackIssueReportedRef.current = false;
    lastPositionRef.current = 0;
    initialTimeConsumed.current = false;
  }, []);

  return {
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
  };
};

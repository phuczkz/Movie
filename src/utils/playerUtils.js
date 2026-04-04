/**
 * Player Utility Functions
 */

/**
 * Format seconds into HH:MM:SS or MM:SS format.
 */
export const formatTime = (value) => {
  if (isNaN(value) || value === null) return "00:00";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60);

  const mm = minutes < 10 ? `0${minutes}` : minutes;
  const ss = seconds < 10 ? `0${seconds}` : seconds;

  if (hours > 0) {
    const hh = hours < 10 ? `0${hours}` : hours;
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
};

/**
 * Constants for the player
 */
export const SEEK_STEP = 10;
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
export const MOBILE_MEDIA_QUERY = "(max-width: 640px)";
export const BUFFERING_FAILOVER_MS = 15000;

import React from 'react';
import { formatTime } from '../../utils/playerUtils';

/**
 * Progress bar and time display for the player.
 */
const ProgressBar = ({ progress, duration, onSeek }) => {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="flex items-center justify-between text-[10px] min-[360px]:text-[11px] sm:text-xs text-white drop-shadow-md font-semibold px-0.5">
        <span>
          {formatTime(progress)} / {formatTime(duration)}
        </span>
      </div>
      
      <div
        className="relative h-2 sm:h-1.5 rounded-full bg-white/25 cursor-pointer shadow-inner shadow-black/20"
        onClick={onSeek}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
          style={{
            width: duration ? `${(progress / duration) * 100}%` : "0%",
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

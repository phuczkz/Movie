import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Volume controls for the player.
 */
const VolumeControl = ({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  showSlider,
  setShowSlider,
}) => {
  return (
    <div className="relative flex items-center gap-2 pl-2" data-control>
      <button
        type="button"
        onClick={onToggleMute}
        className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
        aria-label="Bật/tắt tiếng"
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3" />
        ) : (
          <Volume2 className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3" />
        )}
      </button>
      
      {/* Desktop Slider */}
      <div className="hidden sm:block">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-20 accent-emerald-400"
        />
      </div>

      {/* Mobile Slider Overlay */}
      {showSlider ? (
        <div className="sm:hidden absolute left-0 bottom-full mb-2 rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur p-3 text-xs text-white/90 z-30 w-44">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VolumeControl;

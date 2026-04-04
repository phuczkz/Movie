import React from 'react';
import { Gauge, SlidersHorizontal, MoreVertical } from 'lucide-react';
import { PLAYBACK_RATES } from '../../utils/playerUtils';

/**
 * Settings menu for playback rate and quality selection.
 */
const SettingsMenu = ({
  isOpen,
  onToggle,
  playbackRate,
  onPlaybackRateChange,
  isHls,
  qualityLevels,
  currentLevel,
  onQualityChange,
}) => {
  const currentQualityLabel = React.useMemo(() => {
    if (currentLevel === -1) return "Tự động";
    const found = qualityLevels.find((lvl) => lvl.level === currentLevel);
    return found ? found.label : "Tự động";
  }, [currentLevel, qualityLevels]);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
        onClick={onToggle}
        aria-label="Thêm tuỳ chọn"
      >
        <MoreVertical className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-2 sm:right-0 bottom-full mb-1 rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur p-3 text-xs text-white/90 z-20 min-w-[180px] max-w-[90vw] sm:max-w-[340px] space-y-3"
          data-control
        >
          {/* Playback Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/60">
              <Gauge className="h-3.5 w-3.5" />
              <span>Tốc độ</span>
              <span className="ml-auto text-white/80">{playbackRate}x</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PLAYBACK_RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onPlaybackRateChange(r)}
                  className={`rounded-lg px-2.5 py-1 text-center transition ${
                    playbackRate === r
                      ? "bg-emerald-500/20 text-white font-bold"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>

          {/* Quality Levels (HLS only) */}
          {isHls && qualityLevels.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/60">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Chất lượng</span>
                <span className="ml-auto text-white/80">{currentQualityLabel}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {qualityLevels.map((lvl) => (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => onQualityChange(lvl.level)}
                    className={`rounded-lg px-2.5 py-1 text-left transition ${
                      currentLevel === lvl.level
                        ? "bg-emerald-500/20 text-white font-bold"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;

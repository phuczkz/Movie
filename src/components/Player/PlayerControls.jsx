import React from 'react';
import { 
  Pause, 
  Play, 
  RotateCcw, 
  RotateCw, 
  SkipForward, 
  PictureInPicture, 
  Monitor, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';
import VolumeControl from './VolumeControl';
import SettingsMenu from './SettingsMenu';
import { SEEK_STEP } from '../../utils/playerUtils';

/**
 * Bottom control bar buttons for the player.
 */
const PlayerControls = ({
  playing,
  togglePlay,
  onSeekBy,
  onNextEpisode,
  hasNextEpisode,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  showVolumeSlider,
  setShowVolumeSlider,
  showMoreMenu,
  setShowMoreMenu,
  playbackRate,
  onPlaybackRateChange,
  isHls,
  qualityLevels,
  currentLevel,
  onQualityChange,
  onTogglePip,
  onToggleTheater,
  theaterMode,
  onFullscreen,
  isFullscreen,
}) => {
  return (
    <div className="flex flex-nowrap items-center justify-between gap-0.5 min-[360px]:gap-1 min-[400px]:gap-2 sm:gap-3 text-[10px] min-[360px]:text-[11px] min-[400px]:text-[12px] sm:text-[13px] drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-0.5 min-[360px]:gap-1 min-[400px]:gap-2 flex-nowrap">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/15 border border-white/10 hover:border-emerald-300/60 hover:bg-white/25 transition shadow-lg flex-shrink-0"
        >
          {playing ? (
            <Pause className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" fill="currentColor" />
          ) : (
            <Play className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" fill="currentColor" />
          )}
        </button>

        {/* Seek Backward */}
        <button
          type="button"
          onClick={() => onSeekBy(-SEEK_STEP)}
          className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
          aria-label="Tua lùi 10 giây"
        >
          <RotateCcw className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" />
        </button>

        {/* Seek Forward */}
        <button
          type="button"
          onClick={() => onSeekBy(SEEK_STEP)}
          className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
          aria-label="Tua tiến 10 giây"
        >
          <RotateCw className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" />
        </button>

        {/* Next Episode */}
        {onNextEpisode && (
          <button
            type="button"
            onClick={onNextEpisode}
            disabled={!hasNextEpisode}
            className={`flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full border transition flex-shrink-0 ${
              hasNextEpisode
                ? "bg-white/10 border-white/10 hover:border-emerald-300/60 hover:bg-white/20"
                : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
            }`}
            aria-label="Sang tập tiếp theo"
          >
            <SkipForward className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-3.5 min-[400px]:w-3.5" />
          </button>
        )}

        {/* Volume */}
        <VolumeControl
          volume={volume}
          muted={muted}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
          showSlider={showVolumeSlider}
          setShowSlider={setShowVolumeSlider}
        />
      </div>

      <div className="flex items-center gap-0.5 min-[360px]:gap-1 min-[400px]:gap-2 sm:gap-3 flex-nowrap justify-end" data-control>
        {/* Settings Menu */}
        <SettingsMenu
          isOpen={showMoreMenu}
          onToggle={() => setShowMoreMenu(v => !v)}
          playbackRate={playbackRate}
          onPlaybackRateChange={onPlaybackRateChange}
          isHls={isHls}
          qualityLevels={qualityLevels}
          currentLevel={currentLevel}
          onQualityChange={onQualityChange}
        />

        {/* PiP */}
        <button
          type="button"
          onClick={onTogglePip}
          className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/15 border border-white/10 hover:border-emerald-300/60 hover:bg-white/25 transition shadow-lg flex-shrink-0"
          title="Picture-in-Picture"
        >
          <PictureInPicture className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
        </button>

        {/* Theater Mode */}
        {onToggleTheater && (
          <button
            type="button"
            onClick={onToggleTheater}
            className={`hidden sm:flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full border transition flex-shrink-0 ${
              theaterMode
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                : "bg-white/10 border-white/10 hover:border-emerald-300/60 hover:bg-white/20 text-white"
            }`}
            title={theaterMode ? "Thoát chế độ rạp phim" : "Chế độ rạp phim"}
          >
            <Monitor className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
          </button>
        )}

        {/* Fullscreen */}
        <button
          type="button"
          onClick={onFullscreen}
          className="flex h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 min-[400px]:h-8 min-[400px]:w-8 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:border-emerald-300/60 hover:bg-white/20 transition flex-shrink-0"
        >
          {isFullscreen ? (
            <Minimize2 className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
          ) : (
            <Maximize2 className="h-2.5 w-2.5 min-[360px]:h-3 min-[360px]:w-3 min-[400px]:h-4 min-[400px]:w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;

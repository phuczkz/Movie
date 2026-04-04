import React from 'react';

/**
 * Top bar header for the player, showing title, subtitle, and an optional action slot.
 */
const PlayerHeader = ({ title, subtitle, actionSlot, isFullscreen }) => {
  if (isFullscreen) return <div />;

  return (
    <div className="pointer-events-none bg-gradient-to-b from-black/90 via-black/40 to-transparent pt-3 pb-12 sm:pt-5 px-3 sm:px-5 flex items-start sm:items-center justify-between gap-3">
      <div className="space-y-1 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
        {title ? (
          <p className="text-xs sm:text-sm font-semibold leading-tight text-white line-clamp-1">
            {title}
          </p>
        ) : null}
        {subtitle ? (
          <p className="text-[11px] sm:text-xs text-slate-100 leading-tight line-clamp-1">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actionSlot ? (
        <div
          className="pointer-events-auto flex-shrink-0 drop-shadow-md"
          data-control
        >
          {actionSlot}
        </div>
      ) : null}
    </div>
  );
};

export default PlayerHeader;

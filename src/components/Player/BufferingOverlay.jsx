import React from 'react';

/**
 * Loading spinner overlay for the player.
 */
const BufferingOverlay = ({ isBuffering }) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200"
      style={{ opacity: isBuffering ? 1 : 0 }}
    >
      <div className="loader-orbit loader-orbit-md" />
    </div>
  );
};

export default BufferingOverlay;

import React, { memo } from "react";

const WatchHeader = memo(({ movie, autoProviderNotice }) => {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-white tracking-tight">
        {movie?.name}
      </h1>
      {autoProviderNotice && (
        <p className="text-amber-300 text-sm bg-amber-500/10 inline-block px-3 py-1 rounded-lg border border-amber-500/20">
          {autoProviderNotice}
        </p>
      )}
    </div>
  );
});

export default WatchHeader;

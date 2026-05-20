import React, { memo } from "react";
import { Users } from "lucide-react";

const WatchHeader = memo(({ movie, autoProviderNotice, onOpenWatchTogether, hasActiveRoom }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

      <button
        type="button"
        onClick={onOpenWatchTogether}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md self-start sm:self-center ${
          hasActiveRoom
            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/10"
            : "bg-white/10 text-white border border-white/10 hover:bg-white/15"
        }`}
      >
        <Users className="size-4" />
        {hasActiveRoom ? "Xem chung: Đang hoạt động" : "Xem cùng bạn bè"}
      </button>
    </div>
  );
});

export default WatchHeader;

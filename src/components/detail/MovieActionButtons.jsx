import React, { memo } from "react";
import { Play, Film, Heart } from "lucide-react";

const MovieActionButtons = memo(({ 
  onWatch, 
  isTrailer, 
  movieOverride, 
  episodes, 
  toggleSave, 
  isSaved, 
  saving, 
  error 
}) => {
  return (
    <div className="flex flex-row items-stretch gap-3 pt-1 w-full lg:w-auto lg:flex-row lg:flex-wrap lg:items-center">
      <button
        type="button"
        onClick={onWatch}
        className={`flex flex-1 lg:flex-none justify-center lg:justify-start items-center gap-2 rounded-full bg-emerald-500 px-4 sm:px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:-translate-y-[1px] hover:bg-emerald-400 relative z-30 cursor-pointer ${
          episodes.length ? "" : "opacity-90"
        }`}
      >
        {movieOverride?.mode === "trailer" || isTrailer ? (
          <>
            <Film className="h-4 w-4" fill="currentColor" />
            Xem Trailer
          </>
        ) : (
          <>
            <Play className="h-4 w-4" fill="currentColor" />
            {episodes.length ? "Xem ngay" : "Mở trang xem"}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={toggleSave}
        disabled={saving}
        className={`flex flex-1 lg:flex-none justify-center lg:justify-start items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
          isSaved
            ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
            : "border-white/15 bg-white/5 text-white hover:border-emerald-300/60 hover:text-emerald-100"
        } ${saving ? "opacity-80" : ""}`}
      >
        <Heart
          className="h-4 w-4"
          fill={isSaved ? "currentColor" : "none"}
        />
        {saving ? "Đang lưu..." : isSaved ? "Hủy Yêu thích" : "Yêu thích"}
      </button>

      {error ? (
        <span className="text-xs text-amber-200">
          {error.message || "Không thể cập nhật Yêu thích."}
        </span>
      ) : null}
    </div>
  );
});

export default MovieActionButtons;

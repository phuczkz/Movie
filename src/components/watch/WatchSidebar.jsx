import React, { memo } from "react";

const WatchSidebar = memo(({ movie, episodes, countryText, categoriesText }) => {
  return (
    <div className="rounded-3xl border border-white/5 bg-slate-950/80 shadow-2xl p-6 xl:p-8 flex flex-col gap-6">
      <h3 className="font-semibold text-white/90 uppercase tracking-[0.15em] text-xs flex justify-between">
        <span>Thông tin phim</span>
      </h3>
      <div className="flex gap-4">
        {movie?.poster_url && (
          <div className="w-24 xl:w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-lg bg-slate-900">
            <img
              src={movie.poster_url}
              alt={movie.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex flex-col gap-2.5 text-[13px] text-slate-400 min-w-0">
          {movie?.year && (
            <div>Năm: <span className="text-slate-100 font-semibold ml-1">{movie.year}</span></div>
          )}
          {episodes && (
            <div>Số tập: <span className="text-slate-100 font-semibold ml-1">{episodes.length}</span></div>
          )}
          {movie?.quality && (
            <div>Chất lượng: <span className="text-slate-100 font-semibold ml-1">{movie.quality}</span></div>
          )}
          {countryText && (
            <div className="truncate">Quốc gia: <span className="text-slate-100 font-semibold ml-1">{countryText}</span></div>
          )}
          {categoriesText && (
            <div className="line-clamp-2 leading-snug">Thể loại: <span className="text-slate-100 font-semibold ml-1">{categoriesText}</span></div>
          )}
        </div>
      </div>
    </div>
  );
});

export default WatchSidebar;

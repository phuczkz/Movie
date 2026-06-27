import React, { memo } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";

const WatchSidebar = memo(
  ({ movie, episodes, countryText, categoriesText }) => {
    return (
      <div className="flex flex-col gap-6">
        <h3 className="font-semibold text-white/90 uppercase tracking-[0.15em] text-xs flex justify-between">
          <span>Thông tin phim</span>
        </h3>
        <div className="flex gap-5">
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
              <div>
                Năm:{" "}
                <span className="text-slate-100 font-semibold ml-1">
                  {movie.year}
                </span>
              </div>
            )}
            {episodes && (
              <div>
                Số tập:{" "}
                <span className="text-slate-100 font-semibold ml-1">
                  {episodes.length}
                </span>
              </div>
            )}
            {countryText && (
              <div className="truncate">
                Quốc gia:{" "}
                <span className="text-slate-100 font-semibold ml-1">
                  {countryText}
                </span>
              </div>
            )}
            {categoriesText && (
              <div className="line-clamp-1 leading-snug">
                Thể loại:{" "}
                <span className="text-slate-100 font-semibold ml-1">
                  {categoriesText}
                </span>
              </div>
            )}

          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 space-y-3 text-left mt-2 xl:hidden">
          <div className="flex items-center gap-3">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-300">
              Giới thiệu
            </p>
          </div>
          <div
            className="text-slate-300 leading-relaxed text-[15px] prose prose-invert prose-sm max-w-none prose-a:text-emerald-400 hover:prose-a:text-emerald-300"
            dangerouslySetInnerHTML={{
              __html: movie?.content || "Chưa có mô tả.",
            }}
          />
        </div>

      </div>
    );
  }
);

export default WatchSidebar;

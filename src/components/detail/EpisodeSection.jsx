import React, { memo } from "react";
import { Info } from "lucide-react";
import EpisodeList from "../EpisodeList";

const EpisodeSection = memo(({ 
  episodes, 
  selectedEpisodes, 
  serverGroups, 
  selectedServer, 
  setUserSelectedServer, 
  isMovie, 
  isCompleted, 
  epTotal, 
  upcomingNotice, 
  movieOverride, 
  isTmdb 
}) => {
  const hasVietsub = !!serverGroups?.Vietsub?.length;
  const hasLongTieng = !!serverGroups?.["Lồng Tiếng"]?.length;
  const hasThuyetMinh = !!serverGroups?.["Thuyết Minh"]?.length;

  return (
    <div className="self-start rounded-3xl border border-white/5 bg-slate-900/70 shadow-xl p-6 lg:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Tập phim</h2>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {!isMovie && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1">
                <span className="text-[11px] uppercase tracking-[0.08em] text-emerald-200">
                  {selectedServer || "Nguồn"}
                </span>
                <span className="text-slate-200/80">
                  {selectedEpisodes.length ? `${selectedEpisodes.length}${epTotal ? `/${epTotal}` : ""} tập` : ""}
                </span>
              </span>
            )}
            {isCompleted && (
              <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100">Hoàn tất</span>
            )}
          </div>
        </div>
      </div>

      {Object.keys(serverGroups || {}).length > 1 && !isMovie && (
        <div className="flex flex-wrap items-center gap-2">
          {["Vietsub", "Lồng Tiếng", "Thuyết Minh"].map(label => {
            const hasSet = (label === "Vietsub" && hasVietsub) || 
                          (label === "Lồng Tiếng" && hasLongTieng) || 
                          (label === "Thuyết Minh" && hasThuyetMinh);
            if (!hasSet) return null;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setUserSelectedServer(label)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                  selectedServer === label
                    ? "border-emerald-400/70 bg-emerald-400 text-slate-950"
                    : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {upcomingNotice && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-500/15 text-amber-100 px-4 py-3 text-sm font-semibold flex items-start gap-3 mb-4 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
          <div className="mt-0.5 text-amber-400">{upcomingNotice.icon}</div>
          <div>{upcomingNotice.text}</div>
        </div>
      )}

      {movieOverride?.mode === "trailer" ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
          <div className="flex justify-center"><Info className="h-6 w-6 text-amber-400" /></div>
          <p className="text-sm font-semibold text-amber-200">Phim hiện đang chưa có nguồn</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Bộ phim này hiện tại chỉ có Trailer. Bạn có thể xem bản giới hạn bằng nút "Xem Trailer" ở trên.
          </p>
        </div>
      ) : episodes.length ? (
        <div className="max-h-64 lg:max-h-48 overflow-y-auto pr-1">
          <EpisodeList
            episodes={isMovie ? episodes : selectedEpisodes}
            serverLabel={isMovie ? undefined : selectedServer || undefined}
            showServerLabels={isMovie}
          />
        </div>
      ) : (
        <p className="text-slate-400">{isTmdb ? "Nguồn TMDB chưa có tập phát online." : "Chưa có tập."}</p>
      )}
    </div>
  );
});

export default EpisodeSection;

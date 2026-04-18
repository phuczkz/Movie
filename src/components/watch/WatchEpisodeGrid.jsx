import React, { memo } from "react";
import { ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { parseEpisodeNumber } from "../../utils/episodes";

const PROVIDER_LABELS = {
  kkphim: "Nguồn 1",
  ophim: "Nguồn 2",
};

const WatchEpisodeGrid = memo(({ 
  serverGroups, 
  activeServer, 
  handleServerChange, 
  episodesForServer, 
  activeEpisode, 
  slug, 
  activeProvider, 
  handleProviderChange, 
  availableProviders 
}) => {
  return (
    <div className="space-y-6">
      {/* Server Selection */}
      {Object.keys(serverGroups).length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(serverGroups).map((serverLabel) => (
            <button
              key={serverLabel}
              onClick={() => handleServerChange(serverLabel)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                activeServer === serverLabel
                  ? "border-emerald-500 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
              }`}
            >
              {serverLabel}
            </button>
          ))}
        </div>
      )}

      {/* Provider Selection (KKphim / Ophim) */}
      {availableProviders.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">Nguồn phát:</span>
          {availableProviders.map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                activeProvider === p
                  ? "border-sky-500/50 bg-sky-500/20 text-sky-400"
                  : "border-white/5 bg-white/5 text-slate-400 hover:border-sky-500/30 hover:text-sky-300"
              }`}
            >
              {PROVIDER_LABELS[p] || p}
            </button>
          ))}
          <button
            onClick={() => handleProviderChange("auto")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              !activeProvider || activeProvider === "auto"
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                : "border-white/5 bg-white/5 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-300"
            }`}
          >
            Tự động
          </button>
        </div>
      )}

      {/* Episode Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white/60">
          <ListChecks className="h-4 w-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Danh sách tập</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
          {episodesForServer.map((ep) => {
            const isActive = activeEpisode?.slug === ep.slug;
            const epNum = parseEpisodeNumber(ep.name || ep.slug);
            const label = episodesForServer.length === 1 && epNum === 1 ? "Full" : (ep.name || epNum || "??");
            
            return (
              <Link
                key={ep.slug}
                to={`/watch/${slug}?episode=${ep.slug}&server=${encodeURIComponent(activeServer)}`}
                className={`flex items-center justify-center rounded-lg border py-2.5 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? "border-emerald-500 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-105 z-10"
                    : "border-white/5 bg-white/5 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default WatchEpisodeGrid;

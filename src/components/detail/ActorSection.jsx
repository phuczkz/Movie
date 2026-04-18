import React, { memo } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";

const ActorSection = memo(({ actorsWithImages, isMobile = false, variant = "default" }) => {
  if (!actorsWithImages || actorsWithImages.length === 0) {
    if (isMobile) return <p className="text-slate-400 p-4">Chưa có danh sách diễn viên.</p>;
    return null;
  }

  // Mobile version (vertical grid with fixed height for 2 rows)
  if (isMobile) {
    return (
      <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300 font-bold">Diễn viên</p>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">{actorsWithImages.length}</span>
        </div>
        
        <div className="relative group/mobile-actors">
          <div className="h-[210px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-6 gap-x-4">
              {actorsWithImages.map((actor) => (
                <Link key={actor.name} to={`/actor/${actor.id || actor.name}`} className="flex flex-col items-center gap-2 group/actor">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-slate-800 shadow-lg group-hover/actor:border-emerald-500/50 transition-all flex items-center justify-center">
                    {actor.image ? (
                      <img src={actor.image} alt={actor.name} className="h-full w-full object-cover group-hover/actor:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <User className="w-1/2 h-1/2 text-slate-500" />
                    )}
                  </div>
                  <span className="text-center text-[10px] text-slate-200 line-clamp-2 leading-tight group-hover/actor:text-emerald-400 transition-colors">
                    {actor.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          {/* Bottom fade indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none opacity-80" />
        </div>
      </div>
    );
  }

  // Sidebar version (vertical scroll list)
  if (variant === "sidebar") {
    return (
      <div className="flex flex-col h-[280px] rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl overflow-hidden group/actor-section">
        <div className="p-5 pb-2 flex items-center justify-between shrink-0">
          <p className="text-sm uppercase tracking-[0.14em] text-slate-300 font-bold">Diễn viên</p>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{actorsWithImages.length}</span>
        </div>
        
        <div className="relative flex-1 min-h-0">
          <div className="h-full overflow-y-auto px-5 pb-5 custom-scrollbar space-y-2">
            {actorsWithImages.map((actor) => (
              <Link
                key={actor.name}
                to={`/actor/${actor.id || actor.name}`}
                className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-all group/actor"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800 group-hover/actor:border-emerald-500/50 shadow-sm transition-all flex items-center justify-center">
                  {actor.image ? (
                    <img
                      src={actor.image}
                      alt={actor.name}
                      className="h-full w-full object-cover group-hover/actor:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <User className="w-1/2 h-1/2 text-slate-500" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-slate-100 group-hover/actor:text-emerald-400 transition-colors truncate">
                    {actor.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Diễn viên</span>
                </div>
              </Link>
            ))}
          </div>
          {/* Bottom fade indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none opacity-100 group-hover/actor-section:opacity-0 transition-opacity" />
        </div>
      </div>
    );
  }

  // Default version (horizontal scroll)
  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm uppercase tracking-[0.14em] text-slate-300 font-bold">Diễn viên</p>
        <span className="text-xs font-semibold text-slate-400">{actorsWithImages.length}</span>
      </div>
      <div className="flex overflow-x-auto gap-4 md:gap-6 pb-2 snap-x custom-scrollbar">
        {actorsWithImages.map((actor) => (
          <Link
            key={actor.name}
            to={`/actor/${actor.id || actor.name}`}
            className="flex flex-col items-center gap-2 min-w-[80px] sm:min-w-[96px] snap-start group/actor hover:-translate-y-1 transition-transform"
          >
            <div className="h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full border border-white/10 bg-slate-800 shadow-lg group-hover/actor:border-emerald-500/50 transition-all flex items-center justify-center">
              {actor.image ? (
                <img
                  src={actor.image}
                  alt={actor.name}
                  className="h-full w-full object-cover group-hover/actor:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <User className="w-1/2 h-1/2 text-slate-500" />
              )}
            </div>
            <span className="text-center text-xs sm:text-sm text-slate-100 line-clamp-2 leading-tight group-hover/actor:text-emerald-400 transition-colors">
              {actor.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
});

export default ActorSection;

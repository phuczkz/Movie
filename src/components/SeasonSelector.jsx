import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Film } from 'lucide-react';

/**
 * Corporate Season Selector component.
 * @param {Object} groups - Grouped items { seasons: [], movies: [], series: [] }
 * @param {number} currentSeason - The number of the currently active season
 * @param {string} currentSlug - The slug of the currently active movie
 */
const SeasonSelector = ({ groups, currentSeason, currentSlug }) => {
  if (!groups) return null;
  const { seasons = [], movies = [] } = groups;

  const hasAny = seasons.length > 0 || movies.length > 0;
  if (!hasAny) return null;

  const renderSection = (title, items, icon, isSeason = false) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-400 group/title">
          {icon}
          <h3 className="text-xs font-bold uppercase tracking-widest transition-colors duration-300 group-hover/title:text-emerald-400">
            {title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {items.map((item) => {
            const isActive = isSeason 
              ? item.season === currentSeason 
              : item.slug === currentSlug;
              
            return (
              <Link
                key={item.slug || item.id}
                to={`/watch/${item.slug}?episode=1`}
                className={`inline-flex items-center justify-center text-center px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-sm md:text-[15px] font-semibold transition-all duration-300 border ${
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.08)]'
                    : 'bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.08] hover:border-emerald-500/30 hover:text-slate-100 hover:-translate-y-[1px]'
                }`}
              >
                {isSeason ? `Phần ${item.season}` : (item.name || "N/A").split(/[:(]/)[0].trim()}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-1">
      {renderSection("Mùa phim", seasons, <Layers className="size-4" />, true)}
      {renderSection("Bản điện ảnh", movies, <Film className="size-4" />)}
    </div>
  );
};

export default SeasonSelector;

import React, { memo } from "react";
import { m as Motion } from "framer-motion";

const WATCH_TABS = [
  { key: "episodes", label: "Tập phim" },
  { key: "info", label: "Thông tin" },
  { key: "watch_together", label: "Xem chung" },
];

const PILL_SPRING = {
  type: "spring",
  stiffness: 500,
  damping: 38,
  mass: 0.5,
};

const WatchMobileTabs = memo(({ activeTab, onTabChange, hasRoom, unreadCount = 0 }) => {
  return (
    <div className="xl:hidden w-full">
      <div className="relative flex w-full rounded-xl border border-white/10 bg-slate-900/60 p-1">
        {WATCH_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isWatchTogether = tab.key === "watch_together";

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`relative flex-1 min-w-0 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm transition-colors duration-150 flex items-center justify-center gap-1.5 select-none focus:outline-none ${
                isActive
                  ? "text-amber-200 font-bold"
                  : isWatchTogether && hasRoom
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-300 hover:text-slate-100 font-semibold"
              }`}
            >
              {isActive && (
                <Motion.div
                  layoutId="watch-mobile-tab-pill"
                  style={{ borderRadius: 8 }}
                  className="pointer-events-none absolute inset-0 bg-white/10 border border-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.28)]"
                  transition={PILL_SPRING}
                />
              )}

              <span className="relative z-10 truncate">{tab.label}</span>

              {/* Room Active Indicator */}
              {isWatchTogether && hasRoom && (
                <span className="relative z-10 size-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              )}

              {/* Unread Message Badge */}
              {isWatchTogether && unreadCount > 0 && !isActive && (
                <span className="absolute -top-1.5 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-slate-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

WatchMobileTabs.displayName = "WatchMobileTabs";

export default WatchMobileTabs;

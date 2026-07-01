import React, { memo } from "react";

const WatchMobileTabs = memo(({ activeTab, onTabChange, hasRoom, unreadCount = 0 }) => {
  const tabs = [
    { key: "episodes", label: "Tập phim" },
    { key: "info", label: "Thông tin" },
    { key: "watch_together", label: "Xem chung" },
  ];

  return (
    <div className="xl:hidden w-full">
      <div className="flex w-full rounded-xl border border-white/10 bg-slate-900/40 p-1">
        {tabs.map((tab) => {
          const isWatchTogether = tab.key === "watch_together";
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`relative flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-white/5 text-amber-200"
                  : "text-slate-300 hover:text-slate-100"
              } ${isWatchTogether && hasRoom && activeTab !== tab.key ? "text-emerald-400" : ""}`}
            >
              {tab.label}
              
              {/* Room Active Indicator */}
              {isWatchTogether && hasRoom && (
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}

              {/* Unread Message Badge */}
              {isWatchTogether && unreadCount > 0 && activeTab !== tab.key && (
                <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-slate-950">
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

export default WatchMobileTabs;

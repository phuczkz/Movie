import React, { memo } from "react";

const WatchMobileTabs = memo(({ activeTab, onTabChange, hasRoom }) => {
  const tabs = [
    { key: "episodes", label: "Tập phim" },
    { key: "info", label: "Thông tin" },
    ...(hasRoom ? [{ key: "chat", label: "Trò chuyện" }] : []),
    { key: "actors", label: "Diễn viên" },
  ];

  return (
    <div className="xl:hidden">
      <div className="flex w-full rounded-xl border border-white/10 bg-slate-900/40 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === tab.key
                ? "bg-white/5 text-amber-200"
                : "text-slate-300 hover:text-slate-100"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export default WatchMobileTabs;

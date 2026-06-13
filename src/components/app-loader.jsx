import { useEffect, useState } from "react";
import { Film } from "lucide-react";

export default function AppLoader() {
  const [progress, setProgress] = useState(0);

  // Simulate progress bar filling up smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        // Slow down progress as it approaches 95% to keep it showing if loading is slow
        if (prev >= 95) return prev;
        const remaining = 95 - prev;
        // Increment progress by a fraction of the remaining space for a realistic damping effect
        const increment = Math.max(1, Math.random() * (remaining * 0.15));
        return Math.min(prev + increment, 95);
      });
    }, 120);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0b0b15] flex flex-col items-center justify-center z-[99999] overflow-hidden select-none">
      {/* Background Radial Glow */}
      <div 
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06),transparent_50%)]" 
        aria-hidden="true" 
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-4 max-w-md w-full">
        {/* Glowing Emerald Logo Icon */}
        <div className="relative flex items-center justify-center size-20 sm:size-24 rounded-3xl bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)] border border-emerald-400/30">
          <Film className="size-10 sm:size-12 text-slate-950" fill="currentColor" />
          <div className="absolute inset-0 rounded-3xl ring-4 ring-emerald-500/20 animate-pulse" />
        </div>

        {/* Brand Text */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Kho<span className="text-emerald-400">Phim</span>
          </h1>
          <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
            XEM PHIM – ĐỌC TRUYỆN – TRẢI NGHIỆM
          </p>
        </div>

        {/* Horizontal Progress Bar Container */}
        <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading Indicator Text */}
        <span className="text-slate-500 text-xs tracking-wider animate-pulse">
          Đang tải...
        </span>
      </div>
    </div>
  );
}

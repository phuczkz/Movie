export default function MovieCardSkeleton({ variant = "portrait" }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 shadow-lg">
      <div className={`${variant === "landscape" ? "aspect-video" : "aspect-[2/3]"} w-full overflow-hidden bg-slate-800 relative animate-pulse`}>
        {/* Badge Placeholder */}
        <div className="absolute left-3 top-3 h-6 w-16 rounded-full bg-slate-700/50" />
      </div>
      <div className="p-3 space-y-2">
        {/* Title Placeholder */}
        <div className="h-4 w-3/4 rounded bg-slate-800 animate-pulse" />
        {/* Year Placeholder */}
        <div className="h-3 w-1/4 rounded bg-slate-800/80 animate-pulse" />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Play, Clock, ChevronRight, X } from "lucide-react";
import { db } from '@/firebase.config.js';
import { useAuth } from '@/features/auth/context/AuthContext.jsx';
import { getOptimizedPoster } from '@/utils/image-helper.js';

const formatTime = (secs) => {
  if (!secs) return "0:00";
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const ContinueWatching = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(
      collection(db, `users/${user.uid}/WatchProgress`),
      orderBy("updatedAt", "desc"),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.currentTime > 30 && item.posterUrl); // Only items with meaningful progress & poster
      setItems(data);
    });
    return () => unsubscribe();
  }, [user]);

  if (!user || items.length === 0 || dismissed) return null;

  return (
    <section className="relative">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 rounded-full bg-gradient-to-b from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Tiếp tục xem
          </h2>
          <Clock className="size-5 text-amber-400/60" />
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          aria-label="Ẩn phần tiếp tục xem"
          title="Ẩn"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Horizontal scroll list */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:-mx-5 sm:px-5">
        {items.map((item) => {
          const progress = item.duration > 0 ? Math.min((item.currentTime / item.duration) * 100, 100) : 0;
          const posterSrc = getOptimizedPoster(item.posterUrl, 300, 75) || item.posterUrl;

          const epLabel =
            item.episodeName === "Full" || item.episodeName === "Tập Full" || !item.episodeName
              ? ""
              : String(item.episodeName).toLowerCase().startsWith("tập")
                ? item.episodeName
                : `Tập ${item.episodeName}`;

          return (
            <Link
              key={item.id}
              to={`/watch/${item.slug}${item.episodeSlug ? `?episode=${item.episodeSlug}` : ""}${item.server ? `&server=${item.server}` : ""}`}
              state={{ initialTime: item.currentTime }}
              className="group relative flex-shrink-0 w-[140px] sm:w-[160px] md:w-[170px] flex flex-col"
            >
              {/* Poster */}
              <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-800 relative shadow-md group-hover:shadow-lg group-hover:shadow-emerald-500/10 transition-all duration-300">
                <img
                  src={posterSrc}
                  alt={item.movieName || item.slug}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = item.posterUrl;
                  }}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="size-12 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-xl shadow-emerald-500/30 scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="size-5 text-emerald-950 ml-0.5" fill="currentColor" />
                  </div>
                </div>

                {/* Bottom info */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-1.5">
                  {epLabel && (
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                      {epLabel}
                    </span>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{formatTime(item.currentTime)}</span>
                    {item.duration > 0 && <span>{formatTime(item.duration)}</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="mt-2 px-0.5">
                <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                  {item.movieName || item.slug}
                </h3>
              </div>
            </Link>
          );
        })}

        {/* View all link */}
        <Link
          to="/profile"
          className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[170px] aspect-[2/3] rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-300 group"
        >
          <div className="size-12 rounded-full bg-white/5 group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
            <ChevronRight className="size-5 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <span className="text-xs font-semibold">Xem tất cả</span>
        </Link>
      </div>
    </section>
  );
};

export default ContinueWatching;

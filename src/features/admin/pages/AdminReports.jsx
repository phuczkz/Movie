import { useReducer, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from '@/firebase.config.js';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Calendar,
  RefreshCw,
  Award,
  Film,
  AlertCircle
} from "lucide-react";

const initialState = {
  topMovies: [],
  loading: true,
  error: null,
};

function reportsReducer(state, action) {
  switch (action.type) {
    case "FETCH_SUCCESS":
      return {
        ...state,
        topMovies: action.payload,
        error: null,
        loading: false,
      };
    case "FETCH_ERROR":
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    default:
      return state;
  }
}

export default function AdminReports() {
  const [state, dispatch] = useReducer(reportsReducer, initialState);
  const { topMovies, loading, error } = state;

  useEffect(() => {
    if (!db) return;
    
    // Fetch top 50 movies to sort locally by unique users
    const q = query(
      collection(db, "movieViews"),
      orderBy("views", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Sort by unique users count
      docs.sort((a, b) => {
        const aCount = a.userIds ? a.userIds.length : 0;
        const bCount = b.userIds ? b.userIds.length : 0;
        
        if (bCount === aCount) {
           return (b.views || 0) - (a.views || 0);
        }
        return bCount - aCount;
      });

      dispatch({ type: "FETCH_SUCCESS", payload: docs.slice(0, 5) });
    }, (err) => {
      console.error("[AdminReports] Error:", err);
      dispatch({ type: "FETCH_ERROR", payload: err });
    });

    return unsub;
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <BarChart3 className="text-emerald-500 size-6" />
          Báo cáo thống kê
        </h2>
        <p className="text-slate-400 text-sm">
          Theo dõi hiệu suất và lượng người dùng yêu cầu trên hệ thống
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3 animate-in slide-in-from-top-4">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-bold uppercase tracking-wider text-[11px]">Lỗi dữ liệu</p>
            <p className="opacity-90 leading-relaxed">
              {error.code === 'permission-denied' 
                ? "Thiếu quyền truy cập. Vui lòng cập nhật Firestore Security Rules để cho phép khách (public) ghi vào 'movieViews' như đã hướng dẫn."
                : error.message?.includes('index')
                ? "Yêu cầu tạo Index. Vui lòng kiểm tra Console (F12) và nhấn vào liên kết được cung cấp bởi Firebase."
                : error.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Main Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="text-amber-500 size-5" />
              Top 5 phim được yêu cầu nhiều nhất
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <Calendar className="size-3" />
              Tất cả thời gian
            </div>
          </div>

          <div className="rounded-[32px] border border-white/5 bg-slate-900/60 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="loader-orbit loader-orbit-sm opacity-20" />
              </div>
            ) : topMovies.length === 0 ? (
              <div className="text-center space-y-4 p-12">
                <div className="size-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto text-slate-700">
                   <Film className="size-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-semibold">Chưa có dữ liệu thống kê</p>
                  <p className="text-slate-500 text-sm max-w-[280px] leading-relaxed">
                    Dữ liệu sẽ xuất hiện khi có người dùng truy cập vào trang chi tiết hoặc trang xem phim.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {topMovies.map((movie, index) => (
                  <div 
                    key={movie.id} 
                    className="group flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center size-10 shrink-0">
                      {index === 0 ? (
                        <div className="size-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-black italic shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                          1
                        </div>
                      ) : index === 1 ? (
                        <div className="size-7 rounded-full bg-slate-200/20 flex items-center justify-center text-slate-200 font-bold italic">
                          2
                        </div>
                      ) : index === 2 ? (
                        <div className="size-7 rounded-full bg-amber-700/20 flex items-center justify-center text-amber-700 font-bold italic">
                          3
                        </div>
                      ) : (
                        <span className="text-slate-600 font-bold">{index + 1}</span>
                      )}
                    </div>

                    {/* Movie Poster */}
                    <div className="relative h-16 w-12 rounded-lg bg-slate-800 shrink-0 overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-300">
                      {movie.poster ? (
                        <img 
                          src={movie.poster} 
                          alt="" 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Film className="size-5 text-slate-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                        {movie.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                        {movie.slug}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-xl tabular-nums">
                         {movie.userIds ? movie.userIds.length.toLocaleString() : "0"}
                         <TrendingUp className="size-4" />
                      </div>
                      <span className="text-[10px] text-slate-600 font-medium uppercase tracking-tighter">
                        Số User yêu cầu
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Cards */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 space-y-4">
            <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              <Award className="size-6" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white">Quán quân</h4>
              <p className="text-slate-400 text-sm mt-1">
                Phim được yêu thích nhất thời điểm hiện tại:
              </p>
            </div>
            {topMovies[0] && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                 <p className="text-emerald-400 font-semibold line-clamp-2">
                   {topMovies[0].name}
                 </p>
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <TrendingUp className="size-3" />
                    Đang tăng trưởng ổn định
                 </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 space-y-4">
             <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                <RefreshCw className="size-5" />
             </div>
             <p className="text-slate-500 text-xs italic leading-relaxed">
               Dữ liệu lượt xem được cập nhật theo thời gian thực mỗi khi có người xem phim trên trang web.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

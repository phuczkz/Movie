import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Play, Trash2 } from "lucide-react";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext";
import { useMovieDetail } from "../hooks/useMovieDetail.js";

const formatTime = (secs) => {
  if (!secs) return "0:00";
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

function WatchHistoryCard({ item, handleDelete, user, adminView = false }) {
  // Nếu dữ liệu cũ bị thiếu ảnh hoặc tên, tự fetch lại từ API
  const isMissingInfo = !item.posterUrl || !item.movieName;
  const { data } = useMovieDetail(isMissingInfo ? item.slug : null);
  
  const movieName = item.movieName || data?.movie?.name || item.slug;
  const posterUrl = item.posterUrl || data?.movie?.poster_url || data?.movie?.thumb_url || data?.movie?.backdrop_url;

  // Tự động bảo trì: Cứu dữ liệu cũ, update thẳng lên Firestore để lần sau không phải fetch lại
  useEffect(() => {
    if (isMissingInfo && data?.movie && user && db) {
      const pUrl = data.movie.poster_url || data.movie.thumb_url || data.movie.backdrop_url;
      const mName = data.movie.name;
      if (pUrl && mName) {
        updateDoc(doc(db, `users/${user.uid}/WatchProgress`, item.slug), {
          posterUrl: pUrl,
          movieName: mName
        }).catch(err => console.warn("Auto-fix history failed", err));
      }
    }
  }, [isMissingInfo, data, item.slug, user]);

  const epLabel =
    item.episodeName === "Full" || item.episodeName === "Tập Full" || (!item.episodeName)
      ? "Tập Full"
       : String(item.episodeName).toLowerCase().startsWith("tập")
          ? item.episodeName
          : `Tập ${item.episodeName}`;

  return (
    <div
      className={`group relative flex overflow-hidden rounded-xl border border-white/10 bg-slate-800/50 transition-all hover:scale-[1.01] hover:border-emerald-500/50 hover:shadow-lg ${
        adminView 
          ? "flex-row h-24 sm:h-24" 
          : "flex-row sm:flex-col h-28 sm:h-auto sm:aspect-[3/4] sm:bg-slate-900 sm:hover:shadow-2xl"
      }`}
    >
      {/* Image Section */}
      <div className={`${
        adminView ? "w-16 min-w-[4rem]" : "w-20 min-w-[5rem] sm:w-full sm:absolute sm:inset-0 sm:z-0"
      } flex-shrink-0 relative overflow-hidden bg-slate-900`}>
        {posterUrl ? (
          <img 
            src={posterUrl.replace(/\/w(92|154|185|300|342|500|780)\//, "/original/")} 
            alt={movieName} 
            className="h-full w-full object-cover object-top opacity-100 transition-transform duration-700 ease-out sm:group-hover:scale-110" 
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center opacity-30 bg-slate-800">
            <span className="font-bold text-[10px] sm:text-xs text-slate-300 uppercase tracking-widest break-words overflow-hidden line-clamp-2">{movieName}</span>
          </div>
        )}
        {/* Gradient Overlay applies only on desktop main view */}
        {!adminView && <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />}
      </div>

      {/* Delete Button (top right) */}
      <div className="absolute top-2 right-2 z-20">
        <button
          onClick={(e) => { e.preventDefault(); handleDelete(item.slug); }}
          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-950/40 hover:bg-rose-500/20 rounded-full backdrop-blur-md transition-all shadow-md active:scale-95"
          title="Xóa khỏi lịch sử"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content Section */}
      <div className={`relative z-10 flex flex-1 flex-col justify-center overflow-hidden ${
        adminView ? "p-3" : "p-3 sm:p-5 sm:justify-end"
      }`}>
        <h3 className={`font-bold text-white tracking-tight line-clamp-1 pr-6 ${
          adminView ? "text-xs sm:text-sm mb-0.5" : "text-sm sm:text-lg sm:mb-1 sm:line-clamp-2 sm:pr-0 sm:drop-shadow-lg"
        }`}>
          {movieName}
        </h3>
        
        <p className={`font-medium text-emerald-400 mb-0.5 ${
          adminView ? "text-[10px]" : "text-[11px] sm:text-sm sm:text-emerald-300 sm:drop-shadow-md"
        }`}>
          {epLabel}
        </p>
        
        <div className={`flex items-center justify-between ${adminView ? "mt-0.5" : "mt-2 sm:mt-0"}`}>
          <p className={`text-slate-400 ${
            adminView ? "text-[9px]" : "text-[10px] sm:text-xs sm:text-slate-300/90 sm:drop-shadow-md sm:mb-4"
          }`}>
            Đã xem: {formatTime(item.currentTime)}
          </p>

          {!adminView && (
            <Link
              to={`/watch/${item.slug}${item.episodeSlug ? `?episode=${item.episodeSlug}` : ""}${item.server ? `&server=${item.server}` : ""}`}
              state={{ initialTime: item.currentTime }}
              className="sm:hidden flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950"
            >
              <Play className="h-3 w-3" fill="currentColor" /> Tiếp
            </Link>
          )}
        </div>

        {/* Desktop-only full-width button (only in non-admin view) */}
        {!adminView && (
          <Link
            to={`/watch/${item.slug}${item.episodeSlug ? `?episode=${item.episodeSlug}` : ""}${item.server ? `&server=${item.server}` : ""}`}
            state={{ initialTime: item.currentTime }}
            className="hidden sm:flex group/btn items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-[2px] hover:bg-emerald-400 active:scale-[0.98] w-full mt-auto"
          >
            <Play className="h-4 w-4 transition-transform group-hover/btn:scale-110" fill="currentColor" /> 
            Tiếp tục xem
          </Link>
        )}
      </div>
    </div>
  );
}

export default function WatchHistory({ userId, adminView = false }) {
  const { user: currentUser } = useAuth();
  const uid = userId || currentUser?.uid;
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!uid || !db) return;
    const q = query(
      collection(db, `users/${uid}/WatchProgress`),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(data);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const handleDeleteClick = (slug) => {
    setDeleteTarget(slug);
  };

  const confirmDelete = async () => {
    if (!uid || !db || !deleteTarget) return;
    try {
      await deleteDoc(doc(db, `users/${uid}/WatchProgress`, deleteTarget));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa phim.");
    }
    setDeleteTarget(null);
  };


  if (!uid) return null;

  return (
    <div className={`${adminView ? "mt-0" : "mt-10"} space-y-6`}>
      {!adminView && (
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-bold text-white">Lịch sử xem phim</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {history.length}
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Đang tải lịch sử...</div>
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400 text-sm">
          {adminView ? "Người dùng này chưa xem phim nào." : "Bạn chưa xem bộ phim nào."}
        </div>
      ) : (
        <div className={`${adminView ? "max-h-none" : "max-h-[85vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar"}`}>
          <div className={`grid gap-3 sm:gap-4 ${adminView ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
            {history.map((item) => (
              <WatchHistoryCard 
                key={item.id} 
                item={item} 
                handleDelete={handleDeleteClick} 
                user={{ uid }} 
                adminView={adminView}
              />
            ))}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-2 text-lg font-bold text-white">Xóa phim này?</h3>
            <p className="mb-6 text-sm text-slate-300">
              Bạn có chắc chắn muốn xóa bộ phim này khỏi lịch sử không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Không, giữ lại
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white"
              >
                Có, xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

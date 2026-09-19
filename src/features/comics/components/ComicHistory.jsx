import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { BookOpen, Trash2 } from "lucide-react";
import { db } from '@/firebase.config.js';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useQuery } from "@tanstack/react-query";
import { comicApi } from '@/features/comics/api/comicApi';

const IMAGE_CDN = import.meta.env.VITE_COMIC_IMAGE_CDN || "https://img.otruyenapi.com/uploads/comics/";

function ComicHistoryCard({ item, handleDelete, uid, adminView = false }) {
  const isMissingInfo = !item.posterUrl || !item.comicName;
  const { data: detailData } = useQuery({
    queryKey: ["comicDetail", item.slug],
    queryFn: () => comicApi.getDetail(item.slug),
    enabled: isMissingInfo
  });

  const comicInfo = detailData?.data?.item;
  const comicName = item.comicName || comicInfo?.name || item.slug;
  const posterUrl = item.posterUrl || (comicInfo?.thumb_url ? `${IMAGE_CDN}${comicInfo.thumb_url}` : null);

  // Tự động cập nhật dữ liệu còn thiếu lên Firestore
  useEffect(() => {
    if (isMissingInfo && comicInfo && uid && db) {
      const pUrl = `${IMAGE_CDN}${comicInfo.thumb_url}`;
      const mName = comicInfo.name;
      if (pUrl && mName) {
        updateDoc(doc(db, `users/${uid}/ComicProgress`, item.slug), {
          posterUrl: pUrl,
          comicName: mName
        }).catch(err => console.warn("Auto-fix comic history failed", err));
      }
    }
  }, [isMissingInfo, comicInfo, item.slug, uid]);

  return (
    <div
      className={`group relative flex overflow-hidden rounded-2xl border border-white/10 bg-slate-800/50 transition-all hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-xl ${
        adminView 
          ? "flex-row h-24 sm:h-24 rounded-xl" 
          : "flex-col aspect-[2/3] bg-slate-900 shadow-md"
      }`}
    >
      {/* Image Section */}
      <div className={`${
        adminView ? "w-16 min-w-[4rem] relative" : "absolute inset-0 z-0"
      } flex-shrink-0 overflow-hidden bg-slate-900`}>
        {posterUrl ? (
          <img 
            src={posterUrl} 
            alt={comicName} 
            className="h-full w-full object-cover object-top opacity-100 transition-transform duration-500 ease-out group-hover:scale-105" 
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center opacity-30 bg-slate-800">
            <span className="font-bold text-[10px] sm:text-xs text-slate-300 uppercase tracking-widest break-words overflow-hidden line-clamp-2">{comicName}</span>
          </div>
        )}
        {!adminView && <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />}
      </div>

      {/* Delete Button (top right) */}
      <div className="absolute top-2 right-2 z-20">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleDelete(item.slug); }}
          className="p-1.5 text-white/60 hover:text-rose-400 bg-slate-950/50 hover:bg-rose-500/20 rounded-full backdrop-blur-md transition-all shadow-md active:scale-95"
          title="Xóa khỏi lịch sử"
          aria-label="Xóa khỏi lịch sử"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Content Section */}
      <div className={`relative z-10 flex flex-1 flex-col justify-end overflow-hidden ${
        adminView ? "p-3 justify-center" : "p-2.5 sm:p-3"
      }`}>
        <h3 className={`font-semibold text-white tracking-tight line-clamp-1 ${
          adminView ? "text-xs sm:text-sm mb-0.5" : "text-xs sm:text-sm drop-shadow-md"
        }`}>
          {comicName}
        </h3>
        
        <div className={`flex items-center justify-between gap-1 ${adminView ? "mt-0.5" : "mt-0.5 mb-1.5"}`}>
          <p className="text-[10px] sm:text-xs font-medium text-purple-400 truncate">
            Chương {item.chapterName}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-300/80 shrink-0">
            Đang đọc
          </p>
        </div>

        {!adminView && (
          <Link
            to={`/comics/chapter/${encodeURIComponent(item.chapterApiUrl)}`}
            state={{ slug: item.slug, thumb_url: item.posterUrl }}
            className="flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-purple-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:bg-purple-500 active:scale-95 w-full"
          >
            <BookOpen className="size-3 sm:size-3.5" /> 
            <span>Tiếp tục đọc</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ComicHistory({ userId, adminView = false }) {
  const { user: currentUser } = useAuth();
  const uid = userId || currentUser?.uid;
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (!uid || !db) return;
    const q = query(
      collection(db, `users/${uid}/ComicProgress`),
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
      await deleteDoc(doc(db, `users/${uid}/ComicProgress`, deleteTarget));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa lịch sử.");
    }
    setDeleteTarget(null);
  };

  if (!uid) return null;

  return (
    <div className={`${adminView ? "mt-0" : "mt-10"} space-y-6`}>
      {!adminView && (
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-semibold text-white">Lịch sử đọc truyện</h2>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {history.length}
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Đang tải lịch sử…</div>
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400 text-sm">
          {adminView ? "Người dùng này chưa đọc truyện nào." : "Bạn chưa đọc truyện nào."}
        </div>
      ) : (
        <div className={`${adminView ? "max-h-none" : "max-h-[85vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar"}`}>
          <div className={`grid gap-3 sm:gap-4 ${adminView ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"}`}>
            {history.map((item) => (
              <ComicHistoryCard 
                key={item.id} 
                item={item} 
                handleDelete={handleDeleteClick} 
                uid={uid} 
                adminView={adminView}
              />
            ))}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-2 text-lg font-semibold text-white">Xóa truyện này?</h3>
            <p className="mb-6 text-sm text-slate-300">
              Bạn có chắc chắn muốn xóa bộ truyện này khỏi lịch sử không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                Không, giữ lại
              </button>
              <button
                type="button"
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

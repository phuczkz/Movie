import { useEffect, useState, useMemo } from "react";
import {
  collection, addDoc, deleteDoc, doc, getDocs,
  query, serverTimestamp, onSnapshot, setDoc,
  collectionGroup, limit
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../context/AuthContext";
import { 
  Send, Trash2, Search, Film, 
  MessageCircle, ChevronRight, ArrowLeft, 
  User, Clock, CornerDownRight, RefreshCw,
  AlertCircle
} from "lucide-react";
import { useSearchMovies } from "../../hooks/useSearchMovies";
import ConfirmModal from "../../components/ConfirmModal";

const formatTime = (ts) => {
  if (!ts?.toDate) return "Vừa xong";
  return ts.toDate().toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
};

const cleanName = (name) => {
  if (!name) return "";
  // Check if it's likely a slug (has hyphens)
  if (name.includes("-") && !name.includes(" ")) {
    return name.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  return name;
};

/* ───── Comment Row Component for Admin ───── */
function AdminCommentRow({
  comment,
  movieSlug,
  isReply = false,
  replies = [],
  onDelete,
  onReply,
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onReply(comment.id, replyText);
      setReplyText("");
      setShowReplyInput(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`group ${isReply ? "ml-8 mt-2 border-l-2 border-white/5 pl-4" : "p-4 border-b border-white/5"}`}>
      <div className="flex gap-3">
        {/* Avatar Placeholder */}
        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
          {comment.photoURL ? (
            <img src={comment.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User className="h-4 w-4 text-slate-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-slate-200">{comment.displayName || "Ẩn danh"}</span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed break-words">{comment.content}</p>
          
          <div className="flex items-center gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isReply && (
              <button 
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
              >
                Trả lời
              </button>
            )}
            <button 
              onClick={() => onDelete(comment.id)}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-400 uppercase tracking-wider"
            >
              Xóa
            </button>
          </div>

          {showReplyInput && (
            <form onSubmit={handleSubmitReply} className="mt-3 flex gap-2">
              <div className="flex-1 relative">
                <CornerDownRight className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nhập phản hồi của Admin..."
                  className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!replyText.trim() || submitting}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}

          {/* Render Replies */}
          {replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {replies.map((r) => (
                <AdminCommentRow
                  key={r.id}
                  comment={r}
                  movieSlug={movieSlug}
                  isReply={true}
                  onDelete={onDelete}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Main AdminComments Component ───── */
export default function AdminComments() {
  const { user, userProfile } = useAuth();
  const [view, setView] = useState("list"); // 'list' or 'detail'
  const [movieSlug, setMovieSlug] = useState("");
  const [movieName, setMovieName] = useState("");
  
  const [commentedMovies, setCommentedMovies] = useState([]);
  const [allComments, setAllComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [toast, setToast] = useState(null); // { message: string, type: 'info'|'error'|'success' }
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, commentId: null, loading: false });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { data: searchResults = [], isFetching } = useSearchMovies(inputQuery);

  // 1. Snapshot for commented movies (from indexed 'commentedMovies' collection)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "commentedMovies"), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.lastCommentAt?.toMillis?.() || 0) - (a.lastCommentAt?.toMillis?.() || 0));
        setCommentedMovies(list);
      } else {
        // If index is empty, we can't easily find "virtual" documents in 'comments'
        // without a collectionGroup query or manual search.
        setCommentedMovies([]);
      }
    });

    return unsub;
  }, []);

  // 2. Discover older commented movies (that aren't in the index yet)
  const discoverMovies = async () => {
    setLoading(true);
    try {
      const q = query(collectionGroup(db, "items"), limit(500));
      const snap = await getDocs(q);
      

      const uniqueSlugs = new Set();
      snap.docs.forEach(d => {
        const path = d.ref.path; // e.g. "comments/slug/items/id"
        const parts = path.split("/");
        // Path matches "comments / {slug} / items / {id}"
        if (parts.length >= 2 && parts[0] === "comments") {
          uniqueSlugs.add(parts[1]);
        }
      });

      if (uniqueSlugs.size > 0) {
        const discovered = Array.from(uniqueSlugs).map(slug => ({
          id: slug,
          movieName: cleanName(slug),
          lastCommentAt: serverTimestamp() // Use current time for indexing
        }));

        // Persist to Firestore so it shows up in the normal onSnapshot next time
        for (const d of discovered) {
          try {
            await setDoc(doc(db, "commentedMovies", d.id), {
              movieName: d.movieName,
              lastCommentAt: d.lastCommentAt
            }, { merge: true });
          } catch (e) {
            console.warn(`Could not persist discovery for ${d.id}:`, e);
          }
        }

        showToast(`Đã tìm thấy và đồng bộ ${uniqueSlugs.size} phim có bình luận.`, "success");
      } else {
        showToast("Không tìm thấy bình luận nào thông qua quét sâu.", "info");
      }
    } catch (err) {
      console.error("Discovery error:", err);
      if (err.code === 'failed-precondition' || err.message?.includes("index")) {
        showToast("Cần tạo Index trên Firebase để quét bình luận. Vui lòng kiểm tra Console (F12) để lấy link tạo Index.", "error");
      } else {
        showToast("Lỗi khi quét: " + err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Snapshot for active movie comments
  useEffect(() => {
    if (!movieSlug || view !== "detail") {
      setAllComments([]);
      return;
    }
    setLoading(true);
    const q = query(collection(db, `comments/${movieSlug}/items`));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllComments(data);
      setLoading(false);

      // Auto-cleanup: If this movie is in the quick list but has 0 comments, remove it
      if (data.length === 0 && view === "detail" && movieSlug) {
        deleteDoc(doc(db, "commentedMovies", movieSlug)).catch(console.error);
      }
    });
    return unsub;
  }, [movieSlug, view]);

  // 3. Threading logic
  const { topComments, repliesMap } = useMemo(() => {
    const tops = [];
    const rMap = {};
    allComments.forEach(c => {
      if (c.parentId) {
        if (!rMap[c.parentId]) rMap[c.parentId] = [];
        rMap[c.parentId].push(c);
      } else {
        tops.push(c);
      }
    });
    // Sort
    tops.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    Object.keys(rMap).forEach(key => {
      rMap[key].sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    });
    return { topComments: tops, repliesMap: rMap };
  }, [allComments]);

  const handleReply = async (parentId, text) => {
    try {
      // 1. Add the reply
      await addDoc(collection(db, `comments/${movieSlug}/items`), {
        userId: user.uid,
        displayName: userProfile?.displayName || "Admin",
        photoURL: userProfile?.photoURL || null,
        content: text.trim(),
        createdAt: serverTimestamp(),
        parentId,
        likes: {},
        likeCount: 0,
        dislikeCount: 0,
      });

      // 2. Ensure the parent document in 'comments' is NOT virtual (add a dummy field)
      await setDoc(doc(db, "comments", movieSlug), { exists: true }, { merge: true });

      // 3. Update 'commentedMovies' index metadata
      await setDoc(doc(db, "commentedMovies", movieSlug), {
        movieName,
        lastCommentAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      showToast("Lỗi phản hồi: " + err.message, "error");
    }
  };

  const handleDelete = (commentId) => {
    setConfirmModal({
      isOpen: true,
      commentId,
      loading: false
    });
  };

  const confirmDelete = async () => {
    const commentId = confirmModal.commentId;
    if (!commentId) return;

    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      // 1. Delete the comment
      await deleteDoc(doc(db, "comments", movieSlug, "items", commentId));

      // 2. Find the next most recent comment to update the index timestamp
      const remaining = allComments.filter(calc => calc.id !== commentId);
      if (remaining.length > 0) {
        remaining.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        const latest = remaining[0];
        
        await setDoc(doc(db, "commentedMovies", movieSlug), {
          movieName: movieName,
          lastCommentAt: latest.createdAt || serverTimestamp()
        }, { merge: true });
      } else {
        await deleteDoc(doc(db, "commentedMovies", movieSlug));
        setView("list");
        showToast("Đã dọn dẹp danh sách quản lý.", "success");
      }
    } catch (err) {
      showToast("Lỗi xóa: " + err.message, "error");
    } finally {
      setConfirmModal({ isOpen: false, commentId: null, loading: false });
    }
  };

  const selectMovie = async (slug, name) => {
    setMovieSlug(slug);
    setMovieName(name);
    setView("detail");
    setShowSearchResults(false);
    setInputQuery("");
    
    // Auto-index if name is available to ensure it shows up in the list next time
    if (slug && name) {
      try {
        await setDoc(doc(db, "comments", slug), { exists: true }, { merge: true });
        await setDoc(doc(db, "commentedMovies", slug), {
          movieName: name,
          lastCommentAt: serverTimestamp()
        }, { merge: true });
      } catch (e) { console.error("Auto-index error:", e); }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="text-emerald-500" />
            Bình luận
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {view === "list" ? "Danh sách phim có bình luận" : `Đang quản lý: ${movieName}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {view === "list" && (
            <button 
              onClick={discoverMovies}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Đang quét..." : "Đồng bộ bình luận cũ"}
            </button>
          )}
          {view === "detail" && (
            <button 
              onClick={() => setView("list")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Quay lại
            </button>
          )}
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => {
                setInputQuery(e.target.value);
                setShowSearchResults(true);
              }}
              placeholder="Tìm phim để quản lý bình luận..."
              className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none transition-all shadow-xl"
            />
            
            {showSearchResults && (inputQuery || isFetching) && (
              <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-[400px] overflow-y-auto p-2 space-y-1">
                {isFetching ? (
                  <div className="py-8 text-center text-slate-500 text-sm">Đang tìm kiếm...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(m => (
                    <button
                      key={m.slug}
                      onClick={() => selectMovie(m.slug, m.name)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                    >
                      <img src={m.thumb_url} className="w-10 h-14 object-cover rounded shadow" alt="" />
                      <div>
                        <p className="text-sm font-bold text-slate-200">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.year}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500 text-sm">Không tìm thấy phim nào</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commentedMovies.length === 0 ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/5 rounded-[32px] bg-white/[0.01]">
                  <MessageCircle size={40} className="text-slate-700 mb-4" />
                  <p className="text-slate-500 max-w-xs">Chưa có phim nào trong danh sách quản lý nhanh.</p>
                  <p className="text-slate-600 text-xs mt-2 italic">Hãy nhấn nút "Đồng bộ" ở góc trên hoặc tìm kiếm phim.</p>
                </div>
            ) : (
              commentedMovies.map(m => (
                <button
                  key={m.id}
                  onClick={() => selectMovie(m.id, m.movieName)}
                  className="group relative bg-slate-900/60 border border-white/5 hover:border-emerald-500/40 p-5 rounded-[24px] text-left transition-all hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                      <Film size={20} />
                    </div>
                    <ChevronRight className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-slate-200 line-clamp-1 mb-1 group-hover:text-emerald-400">
                    {cleanName(m.movieName || m.id)}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatTime(m.lastCommentAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Detail View */
        <div className="space-y-4">
          <div className="bg-slate-900/60 rounded-[32px] border border-white/5 overflow-hidden">
            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : topComments.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                Phim này chưa có bình luận nào.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {topComments.map(c => (
                  <AdminCommentRow
                    key={c.id}
                    comment={c}
                    movieSlug={movieSlug}
                    replies={repliesMap[c.id] || []}
                    onDelete={handleDelete}
                    onReply={handleReply}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Xác nhận xóa?"
        message="Bạn có chắc chắn muốn xóa bình luận này và toàn bộ phản hồi liên quan? Hành động này không thể hoàn tác."
        confirmText="Xóa ngay"
        cancelText="Hủy"
        loading={confirmModal.loading}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, commentId: null, loading: false })}
        type="danger"
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 border ${
          toast.type === "error" 
            ? "bg-rose-500/90 border-rose-400 text-white" 
            : toast.type === "success"
            ? "bg-emerald-500/90 border-emerald-400 text-white"
            : "bg-slate-800/95 border-white/10 text-slate-200"
        }`}>
          {toast.type === "error" ? <Trash2 size={18} /> : <MessageCircle size={18} />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import {
  collection, getDocs, addDoc, deleteDoc, doc,
  query, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../context/AuthContext";
import { Send, Trash2, RefreshCw, Search, Film, MessageCircle, ChevronRight } from "lucide-react";
import { useSearchMovies } from "../../hooks/useSearchMovies";

const formatTime = (ts) => {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString("vi-VN");
};

export default function AdminComments() {
  const { user, userProfile } = useAuth();
  const [movieSlug, setMovieSlug] = useState("");
  const [movieName, setMovieName] = useState(""); // Display name
  const [inputQuery, setInputQuery] = useState("");
  const [comments, setComments] = useState([]);
  const [commentedMovies, setCommentedMovies] = useState([]); // List of movies with comments
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  const { data: searchResults = [], isFetching } = useSearchMovies(inputQuery);

  // Fetch movies that have comments
  useEffect(() => {
    // We listen to the base 'comments' collection to find all movie slugs
    const unsub = onSnapshot(collection(db, "comments"), async (snap) => {
      const slugs = snap.docs.map(d => d.id);
      
      // Also fetch names from our 'commentedMovies' index for better display
      const indexSnap = await getDocs(collection(db, "commentedMovies"));
      const indexMap = {};
      indexSnap.forEach(d => indexMap[d.id] = d.data());

      const data = slugs.map(slug => ({
        id: slug,
        movieName: indexMap[slug]?.movieName || slug,
        lastCommentAt: indexMap[slug]?.lastCommentAt || null
      })).sort((a, b) => {
        const timeA = a.lastCommentAt?.toMillis?.() || 0;
        const timeB = b.lastCommentAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setCommentedMovies(data);
    });
    return unsub;
  }, []);

  const fetchComments = useCallback(async (slug) => {
    if (!slug) return;
    setLoading(true);
    try {
      const q = query(collection(db, `comments/${slug}/items`));
      const snap = await getDocs(q);
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setComments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectMovie = (m) => {
    setMovieSlug(m.slug);
    setMovieName(m.name);
    setInputQuery(m.name);
    setShowResults(false);
    fetchComments(m.slug);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !movieSlug) return;
    setSending(true);
    try {
      const adminAvatar = userProfile?.photoURL || user?.photoURL || null;
      const adminName = userProfile?.displayName || user?.displayName || "Admin";
      await addDoc(collection(db, `comments/${movieSlug}/items`), {
        userId: user.uid,
        displayName: adminName,
        photoURL: adminAvatar,
        content: newComment.trim(),
        createdAt: serverTimestamp(),
        likes: {},
        likeCount: 0,
        dislikeCount: 0,
      });
      setNewComment("");
      await fetchComments(movieSlug);
    } catch (err) {
      alert("Lỗi gửi: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    setDeletingId(commentId);
    try {
      await deleteDoc(doc(db, `comments/${movieSlug}/items/${commentId}`));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Bình luận</h2>
        <p className="text-slate-400 text-sm mt-1">Quản lý bình luận theo từng phim</p>
      </div>

      {/* Search by name */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => {
              setInputQuery(e.target.value);
              setShowResults(true);
            }}
            placeholder="Tìm phim theo tên (vd: Trục Ngọc...)"
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none text-sm"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-slate-950 border border-white/10 shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden">
            {searchResults.map((m) => (
              <button
                key={m.slug}
                onClick={() => selectMovie(m)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left transition-colors"
                type="button"
              >
                <div className="h-10 w-8 rounded bg-white/5 shrink-0 overflow-hidden">
                  <img src={m.poster_url || m.thumb_url} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200 line-clamp-1">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.year}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {movieSlug && (
        <>
          {/* Comment input */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                  Quản lý bình luận: <span className="text-slate-200 ml-1">{movieName || movieSlug}</span>
                </p>
              </div>
              <button 
                onClick={() => { setMovieSlug(""); setMovieName(""); setInputQuery(""); }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
                type="button"
              >
                Quay lại danh sách
              </button>
            </div>
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Nhập nội dung bình luận..."
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !newComment.trim()}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Comments list */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-slate-500 py-12 text-sm">Chưa có bình luận nào</p>
            ) : (
              <div className="divide-y divide-white/5">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                      {c.photoURL ? (
                        <img src={c.photoURL} alt={c.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400">
                          {(c.displayName || "?")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-200">{c.displayName}</span>
                        {c.parentId && <span className="text-xs bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">Reply</span>}
                        <span className="text-xs text-slate-500 ml-auto">{formatTime(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-300 break-words">{c.content}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* List of movies with comments */}
      {!movieSlug && (
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-white">Phim có bình luận mới</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {commentedMovies.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 col-span-full text-center">Chưa có dữ liệu bình luận nào được ghi nhận.</p>
            ) : (
              commentedMovies.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMovie({ slug: m.id, name: m.movieName })}
                  className="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] flex items-center justify-between text-left transition-all group"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{m.movieName}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                      Mới nhất: {formatTime(m.lastCommentAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

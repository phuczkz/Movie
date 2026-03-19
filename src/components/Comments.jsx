import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Send, UserCircle } from "lucide-react";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext";

export default function Comments({ movieSlug }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!db || !movieSlug) return;
    const q = query(
      collection(db, `comments/${movieSlug}/items`),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(data);
    });
    return () => unsubscribe();
  }, [movieSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập để bình luận.");
    if (!newComment.trim() || submitting || !db) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, `comments/${movieSlug}/items`), {
        userId: user.uid,
        displayName: user.displayName || user.email?.split("@")[0] || "Ẩn danh",
        photoURL:
          user.photoURL ||
          `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`,
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment("");
    } catch (error) {
      console.error("Lỗi khi gửi bình luận:", error);
      alert("Đã xảy ra lỗi, vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Đang gửi...";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">Bình luận</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
          {comments.length}
        </span>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="hidden sm:block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-inner">
            <img
              src={
                user.photoURL ||
                `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
              }
              alt="Avatar"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Bạn nghĩ gì về bộ phim này?"
              className="w-full rounded-2xl border border-white/10 bg-white/5 pl-4 pr-14 py-3 sm:py-3.5 text-sm text-white placeholder-slate-400 focus:border-emerald-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Send className="h-[18px] w-[18px]" />
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
          Vui lòng{" "}
          <a href="/login" className="font-semibold text-emerald-400 hover:underline">
            đăng nhập
          </a>{" "}
          để tham gia bình luận.
        </div>
      )}

      <div className="space-y-6 pt-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/5 bg-white/5">
              {comment.photoURL ? (
                <img
                  src={comment.photoURL}
                  alt={comment.displayName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle className="h-full w-full text-slate-500" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200 text-sm">
                  {comment.displayName}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {formatTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-[15px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center text-sm font-medium text-slate-500 py-6">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  deleteField,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  Send,
  UserCircle,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext";
import { getProfanitySegments } from "../utils/profanity";

/* ───── Helpers ───── */
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

const renderContent = (content) =>
  getProfanitySegments(content).map((segment, idx) =>
    segment.isProfane ? (
      <span
        key={idx}
        className="text-slate-400/80 font-mono tracking-wider"
        title="Nội dung đã bị ẩn do chứa từ ngữ không phù hợp"
      >
        {segment.text}
      </span>
    ) : (
      <span key={idx}>{segment.text}</span>
    )
  );

/* ───── Custom Delete Modal ───── */
function DeleteModal({ onConfirm, onCancel, title = "Xóa bình luận", message = "Bạn có chắc chắn muốn xóa không?" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="h-11 rounded-2xl bg-white/5 font-semibold text-slate-300 hover:bg-white/10 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              className="h-11 rounded-2xl bg-rose-500 font-semibold text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Single Comment / Reply Row ───── */
function CommentRow({
  comment,
  movieSlug,
  movieName, // Add movieName
  isReply = false,
  replies = [],
  onReplySubmitted,
}) {
  const { user, userProfile } = useAuth();
  const currentUserAvatar =
    userProfile?.photoURL ||
    user?.photoURL ||
    (user?.uid
      ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
      : null);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Admin access
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email === ADMIN_EMAIL;
  const canDelete = isAdmin || user?.uid === comment.userId;

  // Reaction state
  const likes = comment.likes || {};
  const myReaction = user?.uid ? likes[user.uid] || null : null;
  const likeCount = comment.likeCount || 0;
  const dislikeCount = comment.dislikeCount || 0;

  /* ── Toggle like/dislike (Atomic Update) ── */
  const handleReaction = useCallback(
    async (type) => {
      if (!user || !db) return alert("Vui lòng đăng nhập.");
      const uid = user.uid;
      const docRef = doc(db, `comments/${movieSlug}/items/${comment.id}`);

      try {
        const updateData = {};

        if (myReaction === type) {
          // Gỡ bỏ reaction hiện tại
          updateData[`likes.${uid}`] = deleteField();
          if (type === "like") updateData.likeCount = increment(-1);
          else updateData.dislikeCount = increment(-1);
        } else {
          // Chuyển hoặc thêm mới reaction
          if (myReaction === "like") updateData.likeCount = increment(-1);
          if (myReaction === "dislike") updateData.dislikeCount = increment(-1);

          updateData[`likes.${uid}`] = type;
          if (type === "like") updateData.likeCount = increment(1);
          else updateData.dislikeCount = increment(1);
        }

        await updateDoc(docRef, updateData);
      } catch (err) {
        console.error("Lỗi reaction:", err);
        // Nếu lỗi do rules, báo người dùng
        if (err.code === "permission-denied") {
          alert("Lỗi: Không có quyền cập nhật. Bạn cần thiết lập Security Rules trên Firebase Console.");
        }
      }
    },
    [user, db, myReaction, movieSlug, comment.id]
  );

  /* ── Delete comment ── */
  const handleDelete = async () => {
    setShowDeleteModal(false);
    
    try {
      const batch = writeBatch(db);
      const mainRef = doc(db, `comments/${movieSlug}/items/${comment.id}`);
      batch.delete(mainRef);

      if (!isReply && replies.length > 0) {
        replies.forEach((r) => {
          const rRef = doc(db, `comments/${movieSlug}/items/${r.id}`);
          batch.delete(rRef);
        });
      }

      await batch.commit();
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
      if (err.code === "permission-denied") {
        alert("Lỗi: Không có quyền xóa. Nếu bạn là Admin, hãy đảm bảo đã cấu hình Security Rules.");
      } else {
        alert("Đã xảy ra lỗi khi xóa, vui lòng thử lại.");
      }
    }
  };

  /* ── Submit reply (same collection, with parentId) ── */
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập để trả lời.");
    if (!replyText.trim() || submittingReply || !db) return;

    setSubmittingReply(true);
    try {
      // Lưu reply vào cùng collection items, dùng parentId để liên kết
      await addDoc(collection(db, `comments/${movieSlug}/items`), {
        userId: user.uid,
        displayName:
          userProfile?.displayName ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "Ẩn danh",
        photoURL: currentUserAvatar,
        content: replyText.trim(),
        createdAt: serverTimestamp(),
        likes: {},
        likeCount: 0,
        dislikeCount: 0,
        parentId: comment.id, // ← Liên kết reply với comment cha
      });

      // Index the movie for the admin
      if (movieName) {
        await setDoc(doc(db, "commentedMovies", movieSlug), {
          movieName,
          lastCommentAt: serverTimestamp()
        }, { merge: true });
      }

      setReplyText("");
      setShowReplyInput(false);
      setShowReplies(true);
      if (onReplySubmitted) onReplySubmitted();
    } catch (err) {
      console.error("Lỗi gửi phản hồi:", err);
      alert("Đã xảy ra lỗi, vui lòng thử lại.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const avatarSrc =
    comment.userId === user?.uid ? currentUserAvatar : comment.photoURL;
  const displayName =
    comment.userId === user?.uid
      ? userProfile?.displayName || user?.displayName || comment.displayName
      : comment.displayName;

  return (
    <div className={`${isReply ? "ml-10 sm:ml-14" : ""}`}>
      <div className="flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div
          className={`shrink-0 overflow-hidden rounded-full border border-white/5 bg-white/5 ${
            isReply ? "h-8 w-8" : "h-10 w-10"
          }`}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserCircle className="h-full w-full text-slate-500" />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Bubble */}
          <div className="rounded-2xl bg-white/[0.06] px-4 py-2.5 inline-block max-w-full">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-slate-200 text-sm">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {formatTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-[14px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
              {renderContent(comment.content)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pl-1 text-[12px]">
            {/* Like */}
            <button
              type="button"
              onClick={() => handleReaction("like")}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                myReaction === "like"
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-slate-400 hover:text-emerald-400 hover:bg-white/5"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {likeCount > 0 && (
                <span className="font-semibold">{likeCount}</span>
              )}
            </button>

            {/* Dislike */}
            <button
              type="button"
              onClick={() => handleReaction("dislike")}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                myReaction === "dislike"
                  ? "text-rose-400 bg-rose-500/10"
                  : "text-slate-400 hover:text-rose-400 hover:bg-white/5"
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {dislikeCount > 0 && (
                <span className="font-semibold">{dislikeCount}</span>
              )}
            </button>

            {/* Reply button (only for top-level) */}
            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  if (!user) return alert("Vui lòng đăng nhập để trả lời.");
                  setShowReplyInput((v) => !v);
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="font-semibold">Trả lời</span>
              </button>
            )}

            {/* Delete button (Owner or Admin) */}
            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                title="Xóa bình luận"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Custom Delete Confirmation Modal */}
          {showDeleteModal && (
            <DeleteModal
              onConfirm={handleDelete}
              onCancel={() => setShowDeleteModal(false)}
              message={
                isReply
                  ? "Bạn có chắc chắn muốn xóa phản hồi này?"
                  : "Xóa bình luận này sẽ xóa tất cả các phản hồi liên quan. Bạn có chắc không?"
              }
            />
          )}

          {/* Reply input */}
          {showReplyInput && (
            <form
              onSubmit={handleSubmitReply}
              className="flex items-center gap-2 pt-1"
            >
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt="You"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCircle className="h-full w-full text-slate-500" />
                )}
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Viết phản hồi..."
                  autoFocus
                  className="w-full rounded-full border border-white/10 bg-white/5 pl-3.5 pr-10 py-2 text-[13px] text-white placeholder-slate-400 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Show/hide replies toggle */}
          {!isReply && replies.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-sky-400 hover:text-sky-300 pl-1 pt-0.5 transition-colors"
            >
              {showReplies ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Ẩn phản hồi
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Xem {replies.length} phản hồi
                </>
              )}
            </button>
          )}

          {/* Nested replies */}
          {!isReply && showReplies && (
            <div className="space-y-3 pt-1">
              {replies.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  movieSlug={movieSlug}
                  movieName={movieName}
                  isReply
                  replies={[]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Main Comments Component ───── */
export default function Comments({ movieSlug, movieName }) {
  const { user, userProfile } = useAuth();
  const [allDocs, setAllDocs] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const currentUserAvatar =
    userProfile?.photoURL ||
    user?.photoURL ||
    (user?.uid
      ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
      : null);

  // Lắng nghe tất cả docs trong items (cả comments lẫn replies)
  useEffect(() => {
    if (!db || !movieSlug) return;
    const q = query(collection(db, `comments/${movieSlug}/items`));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllDocs(data);
      },
      (error) => {
        console.error("Firebase Snapshot Error:", error);
      }
    );
    return () => unsubscribe();
  }, [movieSlug]);

  // Tách top-level comments và replies bằng parentId
  const { topComments, repliesMap } = useMemo(() => {
    if (!allDocs) return { topComments: [], repliesMap: {} };

    const tops = [];
    const rMap = {};

    for (const d of allDocs) {
      if (d.parentId) {
        // Đây là reply
        if (!rMap[d.parentId]) rMap[d.parentId] = [];
        rMap[d.parentId].push(d);
      } else {
        // Đây là top-level comment
        tops.push(d);
      }
    }

    // Sort top-level: mới nhất trước
    tops.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });

    // Sort replies: cũ nhất trước (trong thread)
    for (const key of Object.keys(rMap)) {
      rMap[key].sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
        return timeA - timeB;
      });
    }

    return { topComments: tops, repliesMap: rMap };
  }, [allDocs]);

  const topLevelCount = topComments.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập để bình luận.");
    if (!newComment.trim() || submitting || !db) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, `comments/${movieSlug}/items`), {
        userId: user.uid,
        displayName:
          userProfile?.displayName ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "Ẩn danh",
        photoURL: currentUserAvatar,
        content: newComment.trim(),
        createdAt: serverTimestamp(),
        likes: {},
        likeCount: 0,
        dislikeCount: 0,
        // Không có parentId = top-level comment
      });

      // Index the movie for the admin
      if (movieName) {
        await setDoc(doc(db, "commentedMovies", movieSlug), {
          movieName,
          lastCommentAt: serverTimestamp()
        }, { merge: true });
      }

      setNewComment("");
    } catch (error) {
      console.error("Lỗi khi gửi bình luận:", error);
      alert("Đã xảy ra lỗi, vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">Bình luận</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
          {topLevelCount}
        </span>
      </div>

      {user ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="hidden sm:block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-inner">
            {currentUserAvatar ? (
              <img
                src={currentUserAvatar}
                alt="Avatar"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white font-bold text-sm uppercase">
                {(user.email || "U").charAt(0)}
              </div>
            )}
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
          <a
            href="/login"
            className="font-semibold text-emerald-400 hover:underline"
          >
            đăng nhập
          </a>{" "}
          để tham gia bình luận.
        </div>
      )}

      <div className="space-y-5 pt-2">
        {topComments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            movieSlug={movieSlug}
            movieName={movieName}
            replies={repliesMap[comment.id] || []}
          />
        ))}
        {allDocs === null && (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        )}
        {allDocs !== null && topComments.length === 0 && (
          <div className="text-center text-sm font-medium text-slate-500 py-6">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        )}
      </div>
    </div>
  );
}

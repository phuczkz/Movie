/**
 * comment-item.jsx
 *
 * Component hiển thị một bình luận đơn lẻ (hoặc reply).
 * Được bọc React.memo để tránh re-render khi thêm bình luận mới
 * không liên quan đến item này.
 *
 * Tách từ Comments.jsx để giảm kích thước file gốc và cải thiện hiệu năng.
 */

import { memo, useState, useCallback } from "react";
import {
  doc,
  updateDoc,
  writeBatch,
  increment,
  deleteField,
  addDoc,
  collection,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
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
import { db } from "@/firebase.config.js";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getProxiedAvatar } from "@/utils/image-helper.js";
import { getProfanitySegments } from "@/utils/profanity";
import ConfirmModal from "@/components/ConfirmModal.jsx";

/* ── Helpers ── */
const renderTextWithMentions = (text) => {
  const mentionRegex = /(@\S+)/g;
  const parts = text.split(mentionRegex);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="text-sky-400 font-semibold">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const CommentContent = ({ content }) => {
  const segments = getProfanitySegments(content).map((segment, idx) => ({
    ...segment,
    keyId: `segment-${idx}-${segment.isProfane}`,
  }));

  return segments.map((segment) =>
    segment.isProfane ? (
      <span
        key={segment.keyId}
        className="text-slate-400/80 font-mono tracking-wider"
        title="Nội dung đã bị ẩn do chứa từ ngữ không phù hợp"
      >
        {segment.text}
      </span>
    ) : (
      <span key={segment.keyId}>{renderTextWithMentions(segment.text)}</span>
    )
  );
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

const EMPTY_REPLIES = [];

/* ── Single Comment / Reply Row ── */
function CommentItem({
  comment,
  movieSlug,
  movieName,
  isReply = false,
  replies = EMPTY_REPLIES,
  onReplySubmitted,
  allDocs,
}) {
  const { user, userProfile } = useAuth();
  const currentUserAvatar =
    userProfile?.photoURL ||
    user?.photoURL ||
    (user?.uid
      ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
      : null);

  const finalAvatar = getProxiedAvatar(currentUserAvatar);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          updateData[`likes.${uid}`] = deleteField();
          if (type === "like") updateData.likeCount = increment(-1);
          else updateData.dislikeCount = increment(-1);
        } else {
          if (myReaction === "like") updateData.likeCount = increment(-1);
          if (myReaction === "dislike") updateData.dislikeCount = increment(-1);

          updateData[`likes.${uid}`] = type;
          if (type === "like") updateData.likeCount = increment(1);
          else updateData.dislikeCount = increment(1);
        }

        await updateDoc(docRef, updateData);
      } catch (err) {
        console.error("Lỗi reaction:", err);
        if (err.code === "permission-denied") {
          alert(
            "Lỗi: Không có quyền cập nhật. Bạn cần thiết lập Security Rules trên Firebase Console."
          );
        }
      }
    },
    [user, myReaction, movieSlug, comment.id]
  );

  /* ── Delete comment ── */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const batch = writeBatch(db);
      const mainRef = doc(db, `comments/${movieSlug}/items/${comment.id}`);
      batch.delete(mainRef);

      const idsToDelete = [comment.id];

      if (!isReply && replies.length > 0) {
        replies.forEach((r) => {
          const rRef = doc(db, `comments/${movieSlug}/items/${r.id}`);
          batch.delete(rRef);
          idsToDelete.push(r.id);
        });
      }

      // Xoá các thông báo liên quan
      for (let i = 0; i < idsToDelete.length; i += 30) {
        const chunk = idsToDelete.slice(i, i + 30);
        const notifQ = query(
          collection(db, "notifications"),
          where("commentId", "in", chunk)
        );
        const notifSnap = await getDocs(notifQ);
        notifSnap.forEach((d) => batch.delete(d.ref));
      }

      await batch.commit();
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
      if (err.code === "permission-denied") {
        alert(
          "Lỗi: Không có quyền xóa. Nếu bạn là Admin, hãy đảm bảo đã cấu hình Security Rules."
        );
      } else {
        alert("Đã xảy ra lỗi khi xóa, vui lòng thử lại.");
      }
    } finally {
      setDeleting(false);
    }
  };

  /* ── Submit reply ── */
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập để trả lời.");
    if (!replyText.trim() || submittingReply || !db) return;

    setSubmittingReply(true);
    try {
      const newReplyRef = await addDoc(
        collection(db, `comments/${movieSlug}/items`),
        {
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
          parentId: comment.id,
        }
      );

      const finalMovieName = movieName || movieSlug;
      if (finalMovieName) {
        await setDoc(doc(db, "comments", movieSlug), { exists: true }, { merge: true });
        await setDoc(
          doc(db, "commentedMovies", movieSlug),
          { movieName: finalMovieName, lastCommentAt: serverTimestamp() },
          { merge: true }
        );
      }

      // Notification Logic
      const mentions = [];
      const mentionRegex = /@(\S+)/g;
      let match;
      while ((match = mentionRegex.exec(replyText)) !== null) {
        mentions.push(match[1].toLowerCase());
      }

      const userIdsToNotify = new Set();
      if (comment.userId && comment.userId !== user.uid) {
        userIdsToNotify.add(comment.userId);
      }

      mentions.forEach((m) => {
        if (m === "admin") {
          userIdsToNotify.add("admin");
        } else if (allDocs) {
          const found = allDocs.find(
            (d) =>
              d.displayName &&
              d.displayName.replace(/\s+/g, "").toLowerCase() === m
          );
          if (found && found.userId !== user.uid) {
            userIdsToNotify.add(found.userId);
          }
        }
      });

      for (const uid of userIdsToNotify) {
        await addDoc(collection(db, "notifications"), {
          userId: uid,
          senderId: user.uid,
          senderName:
            userProfile?.displayName ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "Ẩn danh",
          senderAvatar: currentUserAvatar || null,
          type: uid === comment.userId ? "reply" : "tag",
          movieSlug: movieSlug,
          movieName: finalMovieName,
          content: replyText.trim(),
          isRead: false,
          createdAt: serverTimestamp(),
          commentId: newReplyRef.id,
        });
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

  const proxiedAvatarSrc = getProxiedAvatar(avatarSrc);

  return (
    <div className={`${isReply ? "ml-10 sm:ml-14" : ""}`}>
      <div className="flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div
          className={`shrink-0 overflow-hidden rounded-full border border-white/5 bg-white/5 ${
            isReply ? "size-8" : "size-10"
          }`}
        >
          {proxiedAvatarSrc ? (
            <img
              src={proxiedAvatarSrc}
              alt={displayName}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
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
              <CommentContent content={comment.content} />
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
              <ThumbsUp className="size-3.5" />
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
              <ThumbsDown className="size-3.5" />
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
                  if (!showReplyInput) {
                    const tagObj = displayName
                      ? displayName.replace(/\s+/g, "")
                      : "User";
                    setReplyText(`@${tagObj} `);
                  }
                  setShowReplyInput((v) => !v);
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors"
              >
                <MessageCircle className="size-3.5" />
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
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {/* Custom Delete Confirmation Modal */}
          <ConfirmModal
            isOpen={showDeleteModal}
            title="Xác nhận xóa?"
            message={
              isReply
                ? "Bạn có chắc chắn muốn xóa phản hồi này?"
                : "Xóa bình luận này sẽ xóa tất cả các phản hồi liên quan. Bạn có chắc không?"
            }
            confirmText="Xóa ngay"
            cancelText="Hủy"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteModal(false)}
            type="danger"
          />

          {/* Reply input */}
          {showReplyInput && (
            <form
              onSubmit={handleSubmitReply}
              className="flex items-center gap-2 pt-1"
            >
              <div className="size-7 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {finalAvatar ? (
                  <img
                    src={finalAvatar}
                    alt="You"
                    className="h-full w-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <UserCircle className="h-full w-full text-slate-500" />
                )}
              </div>
              <div className="relative flex-1">
                <input
                  id={`reply-input-${comment.id}`}
                  name="reply"
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder=""
                  aria-label="Viết phản hồi"
                  ref={(input) => input && input.focus()}
                  className="w-full rounded-full border border-white/10 bg-white/5 pl-3.5 pr-10 py-2 text-[13px] text-transparent caret-white focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all relative z-10"
                  onScroll={(e) => {
                    const overlay = document.getElementById(
                      `reply-overlay-${comment.id}`
                    );
                    if (overlay) overlay.scrollLeft = e.target.scrollLeft;
                  }}
                />
                <div
                  id={`reply-overlay-${comment.id}`}
                  className="absolute inset-0 pointer-events-none pl-3.5 pr-10 py-2 text-[13px] text-white overflow-hidden whitespace-pre z-20"
                >
                  {!replyText ? (
                    <span className="text-slate-400">
                      Viết phản hồi... (Gõ @admin để tag quản trị viên)
                    </span>
                  ) : (
                    renderTextWithMentions(replyText)
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30 transition-colors z-30"
                >
                  <Send className="size-3.5" />
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
                  <ChevronUp className="size-3.5" />
                  Ẩn phản hồi
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  Xem {replies.length} phản hồi
                </>
              )}
            </button>
          )}

          {/* Nested replies */}
          {!isReply && showReplies && (
            <div className="space-y-3 pt-1">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  movieSlug={movieSlug}
                  movieName={movieName}
                  isReply
                  replies={[]}
                  allDocs={allDocs}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Bọc memo: khi thêm bình luận mới, các comment cũ không bị re-render
export default memo(CommentItem);

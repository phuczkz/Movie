/**
 * comment-form.jsx
 *
 * Form nhập bình luận mới (top-level).
 * Tách từ Comments.jsx để tách biệt logic input khỏi logic danh sách.
 */

import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Send, UserCircle } from "lucide-react";
import { db } from "@/firebase.config.js";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getProxiedAvatar } from "@/utils/image-helper.js";

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

/**
 * @param {Object} props
 * @param {string} props.movieSlug
 * @param {string} props.movieName
 * @param {Array} props.allDocs - Tất cả comment docs (dùng để tìm mention targets)
 */
export default function CommentForm({ movieSlug, movieName, allDocs }) {
  const { user, userProfile } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentUserAvatar =
    userProfile?.photoURL ||
    user?.photoURL ||
    (user?.uid
      ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
      : null);

  const finalAvatar = getProxiedAvatar(currentUserAvatar);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Vui lòng đăng nhập để bình luận.");
    if (!newComment.trim() || submitting || !db) return;

    setSubmitting(true);
    try {
      const newDocRef = await addDoc(
        collection(db, `comments/${movieSlug}/items`),
        {
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
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[1].toLowerCase());
      }

      const userIdsToNotify = new Set();
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
          type: "tag",
          movieSlug: movieSlug,
          movieName: finalMovieName,
          content: newComment.trim(),
          isRead: false,
          createdAt: serverTimestamp(),
          commentId: newDocRef.id,
        });
      }

      setNewComment("");
    } catch (error) {
      console.error("Lỗi khi gửi bình luận:", error);
      alert("Đã xảy ra lỗi, vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400 shrink-0">
        Vui lòng{" "}
        <a
          href="/login"
          className="font-semibold text-emerald-400 hover:underline"
        >
          đăng nhập
        </a>{" "}
        để tham gia bình luận.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-4 shrink-0"
    >
      <div className="hidden sm:block size-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-inner">
        {finalAvatar ? (
          <img
            src={finalAvatar}
            alt="Avatar"
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white font-bold text-sm uppercase">
            {(user.email || "U").charAt(0)}
          </div>
        )}
      </div>
      <div className="relative flex-1">
        <input
          id="main-comment-input"
          name="comment"
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder=""
          aria-label="Nhập bình luận của bạn"
          className="w-full rounded-2xl border border-white/10 bg-white/5 pl-4 pr-14 py-3 sm:py-3.5 text-sm text-transparent caret-white focus:border-emerald-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all relative z-10"
          onScroll={(e) => {
            const overlay = document.getElementById("main-overlay");
            if (overlay) overlay.scrollLeft = e.target.scrollLeft;
          }}
        />
        <div
          id="main-overlay"
          className="absolute inset-0 pointer-events-none pl-4 pr-14 py-3 sm:py-3.5 text-sm text-white overflow-hidden whitespace-pre z-20"
        >
          {!newComment ? (
            <span className="text-slate-400">
              Bạn nghĩ gì về phim này? (Gõ @admin để tag admin)
            </span>
          ) : (
            renderTextWithMentions(newComment)
          )}
        </div>
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors z-30"
        >
          <Send className="size-[18px]" />
        </button>
      </div>
    </form>
  );
}

/**
 * Comments.jsx
 *
 * Container component cho hệ thống bình luận.
 * Logic render từng comment và form nhập đã được tách sang:
 * - comments/comment-item.jsx (memo-wrapped single comment row)
 * - comments/comment-form.jsx (form nhập bình luận mới)
 *
 * File này chỉ giữ lại: Firestore listener, data processing, layout.
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";
import { db } from "@/firebase.config.js";
import CommentItem from "./comments/comment-item.jsx";
import CommentForm from "./comments/comment-form.jsx";

/* ───── Main Comments Component ───── */
export default function Comments({ movieSlug, movieName }) {
  const [allDocs, setAllDocs] = useState(null);

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
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    // Sort replies: cũ nhất trước (trong thread)
    for (const key of Object.keys(rMap)) {
      rMap[key].sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });
    }

    return { topComments: tops, repliesMap: rMap };
  }, [allDocs]);

  const topLevelCount = topComments.length;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center gap-3 shrink-0">
        <h2 className="text-xl font-semibold text-white">Bình luận</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
          {topLevelCount}
        </span>
      </div>

      <CommentForm
        movieSlug={movieSlug}
        movieName={movieName}
        allDocs={allDocs}
      />

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 pt-2">
        {topComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            movieSlug={movieSlug}
            movieName={movieName}
            replies={repliesMap[comment.id] || []}
            allDocs={allDocs}
          />
        ))}
        {allDocs === null && (
          <div className="flex justify-center py-6">
            <div className="loader-orbit loader-orbit-sm"></div>
          </div>
        )}
        {allDocs !== null && topComments.length === 0 && (
          <div className="text-center text-sm font-medium text-slate-300 py-6">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        )}
      </div>
    </div>
  );
}

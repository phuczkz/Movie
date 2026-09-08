import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from '@/firebase.config.js';
import { useAuth } from '@/features/auth/context/AuthContext';

export function useMovieRating(movieSlug, apiRating) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    average: 0,
    totalRatings: 0,
    userRating: 0,
    userComment: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !movieSlug) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      collection(db, `ratings/${movieSlug}/users`),
      (snapshot) => {
        let total = 0;
        let count = 0;
        let currentUserRating = 0;
        let currentUserComment = "";

        snapshot.forEach((d) => {
          const data = d.data();
          const val = data.rating;
          if (typeof val === "number" && !isNaN(val)) {
            total += val;
            count++;
          }
          if (user && d.id === user.uid) {
            currentUserRating = val || 0;
            currentUserComment = data.comment || "";
          }
        });

        const calculatedAvg = count > 0 ? (total / count).toFixed(1) : 0;

        setStats({
          average: count > 0 ? calculatedAvg : (apiRating ? Number(apiRating).toFixed(1) : 0),
          totalRatings: count,
          userRating: user ? currentUserRating : 0,
          userComment: user ? currentUserComment : "",
        });
        setLoading(false);
      },
      (error) => {
        console.warn("Lỗi tải đánh giá phim:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [movieSlug, user, apiRating]);

  const submitRating = useCallback(
    async ({ rating, comment = "" }) => {
      if (!user) {
        return { success: false, requireAuth: true };
      }
      if (!db || !movieSlug) {
        throw new Error("Không thể kết nối cơ sở dữ liệu.");
      }

      setSubmitting(true);
      try {
        const ratingDocRef = doc(db, `ratings/${movieSlug}/users`, user.uid);
        await setDoc(
          ratingDocRef,
          {
            rating: Number(rating),
            comment: comment.trim(),
            userId: user.uid,
            userName: user.displayName || user.email?.split("@")[0] || "Khán giả",
            userPhoto: user.photoURL || null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Cập nhật lạc quan trong local state
        setStats((prev) => ({
          ...prev,
          userRating: Number(rating),
          userComment: comment.trim(),
        }));

        return { success: true };
      } catch (err) {
        console.error("Lỗi khi lưu đánh giá:", err);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [user, movieSlug]
  );

  return {
    ...stats,
    submitting,
    loading,
    submitRating,
  };
}

export default useMovieRating;

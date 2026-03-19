import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { doc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext";

export default function Rating({ movieSlug, apiRating }) {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [average, setAverage] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!db || !movieSlug) return;
    const unsub = onSnapshot(collection(db, `ratings/${movieSlug}/users`), (snapshot) => {
      let total = 0;
      let count = 0;
      snapshot.forEach((d) => {
        const val = d.data().rating;
        if (typeof val === "number") {
          total += val;
          count++;
        }
        if (user && d.id === user.uid) {
          setUserRating(val);
        }
      });
      setTotalRatings(count);
      setAverage(count > 0 ? (total / count).toFixed(1) : 0);
    });
    return () => unsub();
  }, [movieSlug, user]);

  const handleRate = async (value) => {
    if (!user) {
      alert("Vui lòng đăng nhập để đánh giá phim.");
      return;
    }
    if (submitting || !db) return;
    setSubmitting(true);
    try {
      await setDoc(doc(db, `ratings/${movieSlug}/users`, user.uid), {
        rating: value,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setUserRating(value);
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi gửi đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex bg-white/5 rounded-full px-3 py-1.5 border border-white/10 shadow-inner">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            disabled={submitting}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleRate(star)}
            className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star
              className={`h-[18px] w-[18px] sm:h-5 sm:w-5 ${(hovered || userRating) >= star
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  : "text-slate-500 hover:text-amber-200"
                } transition-colors`}
            />
          </button>
        ))}
      </div>
      <div className="text-sm">
        {totalRatings > 0 ? (
          <span className="text-slate-300">
            <strong className="text-white text-base">{average}</strong>/5{" "}
            <span className="text-slate-500 text-xs">({totalRatings} lượt)</span>
          </span>
        ) : apiRating ? (
          <span className="text-slate-300">
            <strong className="text-white text-base">{Number(apiRating).toFixed(1)}</strong>
            <span className="text-slate-500 text-xs ml-1">(Đánh giá từ hệ thống)</span>
          </span>
        ) : (
          <span className="text-slate-500 text-xs">Chưa có đánh giá</span>
        )}
      </div>
    </div>
  );
}

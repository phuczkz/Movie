/**
 * profile-stats-card.jsx
 *
 * Thống kê tài khoản gọn nhẹ theo chuẩn giao diện ứng dụng di động:
 * - Bậc thành viên & ngày tham gia
 * - Chỉ số Yêu thích / Đã xem
 * - Lối tắt Kho phim yêu thích
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer } from "firebase/firestore";
import { ChevronRight, Heart } from "lucide-react";
import { db } from "@/firebase.config.js";
import { useAuth } from "@/features/auth/context/AuthContext.jsx";

const MOVIE_TIERS = [
  { min: 0, label: "Thành viên mới", textClass: "text-slate-300" },
  { min: 5, label: "Mọt phim", textClass: "text-emerald-400" },
  { min: 20, label: "Siêu mọt phim", textClass: "text-amber-400" },
  { min: 50, label: "Huyền thoại", textClass: "text-purple-400" },
];

function getTier(count) {
  let matched = MOVIE_TIERS[0];
  for (const tier of MOVIE_TIERS) {
    if (count >= tier.min) matched = tier;
  }
  return matched;
}

function formatJoinDate(dateValue) {
  if (!dateValue) return "Chưa rõ";
  try {
    const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (Number.isNaN(d.getTime())) return "Chưa rõ";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Chưa rõ";
  }
}

export default function ProfileStatsCard() {
  const { user, userProfile } = useAuth();

  const [watchCount, setWatchCount] = useState(null);
  const [favCount, setFavCount] = useState(null);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid || !db) return;
    const col = collection(db, `users/${uid}/WatchProgress`);
    getCountFromServer(col)
      .then((snap) => setWatchCount(snap.data().count))
      .catch(() => setWatchCount(0));
  }, [uid]);

  useEffect(() => {
    if (!uid || !db) return;
    const col = collection(db, `users/${uid}/FavoriteMovies`);
    getCountFromServer(col)
      .then((snap) => setFavCount(snap.data().count))
      .catch(() => setFavCount(0));
  }, [uid]);

  const joinDate = useMemo(() => {
    const raw =
      userProfile?.createdAt?.toDate?.() || user?.metadata?.creationTime;
    return formatJoinDate(raw);
  }, [user, userProfile]);

  const totalActivity = (watchCount || 0) + (favCount || 0);
  const tier = getTier(totalActivity);

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden min-w-0">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
        <span className="text-xs font-medium text-slate-400">Cấp bậc</span>
        <span className={`text-xs font-semibold ${tier.textClass}`}>
          {tier.label}
        </span>
      </div>

      {/* 3-column hairline stat strip */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] text-center">
        <div className="px-2 py-3.5 min-w-0">
          <p className="text-base sm:text-lg font-semibold text-white tabular-nums truncate">
            {favCount !== null ? favCount : "—"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">Yêu thích</p>
        </div>
        <div className="px-2 py-3.5 min-w-0">
          <p className="text-base sm:text-lg font-semibold text-white tabular-nums truncate">
            {watchCount !== null ? watchCount : "—"}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">Đã xem</p>
        </div>
        <div className="px-2 py-3.5 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-white tabular-nums truncate leading-6 sm:leading-7">
            {joinDate}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">Tham gia</p>
        </div>
      </div>

      {/* Quick Action Row */}
      <Link
        to="/favorites"
        className="flex items-center justify-between gap-3 px-4 min-h-[48px] border-t border-white/[0.06] text-sm font-medium text-slate-100 hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Heart size={16} className="text-rose-400 shrink-0" />
          <span className="truncate">Kho phim yêu thích</span>
        </span>
        <ChevronRight size={16} className="text-slate-500 shrink-0" />
      </Link>
    </div>
  );
}

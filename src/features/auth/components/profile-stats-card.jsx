/**
 * profile-stats-card.jsx
 *
 * Card thống kê hoạt động người dùng, hiển thị ở cột phải trang Profile.
 * Hỗ trợ cả chế độ Movie (phim) và Comic (MangaHub).
 *
 * Nội dung:
 * - Thống kê tổng quan: phim/truyện đã xem, yêu thích, ngày tham gia
 * - Huy hiệu cấp bậc người dùng
 * - Lối tắt thao tác nhanh (Quick Actions)
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getCountFromServer,
} from "firebase/firestore";
import {
  Film,
  Heart,
  BookOpen,
  Star,
  Trophy,
  Sparkles,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { db } from "@/firebase.config.js";
import { useAuth } from "@/features/auth/context/AuthContext.jsx";
import { useAppMode } from "@/context/AppModeContext";

/* ── Badge tiers dựa trên tổng hoạt động ── */
const MOVIE_TIERS = [
  { min: 0, label: "Thành viên mới", icon: Star, color: "text-slate-400", bg: "bg-slate-500/10" },
  { min: 5, label: "Mọt phim", icon: Film, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { min: 20, label: "Siêu mọt phim", icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
  { min: 50, label: "Huyền thoại", icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10" },
];

const COMIC_TIERS = [
  { min: 0, label: "Thành viên mới", icon: Star, color: "text-slate-400", bg: "bg-slate-500/10" },
  { min: 5, label: "Mọt truyện", icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10" },
  { min: 20, label: "Siêu mọt truyện", icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
  { min: 50, label: "Huyền thoại", icon: Sparkles, color: "text-rose-400", bg: "bg-rose-500/10" },
];

function getTier(count, isComic) {
  const tiers = isComic ? COMIC_TIERS : MOVIE_TIERS;
  let matched = tiers[0];
  for (const tier of tiers) {
    if (count >= tier.min) matched = tier;
  }
  return matched;
}

/* ── Format ngày tham gia ── */
function formatJoinDate(dateValue) {
  if (!dateValue) return "Chưa rõ";
  try {
    const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Chưa rõ";
  }
}

/* ── Stat Item ── */
function StatItem({ icon, label, value, accentColor = "text-emerald-400" }) {
  const IconComponent = icon;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 transition-all hover:bg-white/[0.06] hover:border-white/10">
      <div className={`p-2 rounded-lg bg-white/5 ${accentColor}`}>
        <IconComponent size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
          {label}
        </p>
        <p className="text-lg font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function ProfileStatsCard() {
  const { user, userProfile } = useAuth();
  const { appMode } = useAppMode();
  const isComic = appMode === "comic";

  const [watchCount, setWatchCount] = useState(null);
  const [favCount, setFavCount] = useState(null);

  const uid = user?.uid;

  // Đếm số phim/truyện đã xem (dùng để tính cấp bậc tier)
  useEffect(() => {
    if (!uid || !db) return;
    const collPath = isComic
      ? `users/${uid}/ReadProgress`
      : `users/${uid}/WatchProgress`;
    const col = collection(db, collPath);

    // Dùng getCountFromServer để không phải download toàn bộ docs
    getCountFromServer(col)
      .then((snap) => setWatchCount(snap.data().count))
      .catch(() => setWatchCount(0));
  }, [uid, isComic]);

  // Đếm số phim/truyện yêu thích
  useEffect(() => {
    if (!uid || !db) return;
    const collPath = isComic
      ? `users/${uid}/FavoriteComics`
      : `users/${uid}/FavoriteMovies`;
    const col = collection(db, collPath);
    getCountFromServer(col)
      .then((snap) => setFavCount(snap.data().count))
      .catch(() => setFavCount(0));
  }, [uid, isComic]);

  // Ngày tham gia
  const joinDate = useMemo(() => {
    const raw =
      userProfile?.createdAt?.toDate?.() ||
      user?.metadata?.creationTime;
    return formatJoinDate(raw);
  }, [user, userProfile]);

  // Huy hiệu / cấp bậc
  const totalActivity = (watchCount || 0) + (favCount || 0);
  const tier = getTier(totalActivity, isComic);
  const TierIcon = tier.icon;

  // Accent color theo chế độ
  const accentBorder = isComic ? "border-purple-500/20" : "border-emerald-500/20";
  const accentBg = isComic ? "bg-purple-500/5" : "bg-emerald-500/5";

  return (
    <div className={`rounded-2xl border ${accentBorder} ${accentBg} p-5 space-y-5`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${tier.bg}`}>
          <TierIcon size={22} className={tier.color} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Tổng quan tài khoản</h3>
          <p className={`text-xs font-bold ${tier.color}`}>{tier.label}</p>
        </div>
      </div>

      {/* Stats Grid: Yêu thích & Ngày tham gia */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatItem
          icon={Heart}
          label="Yêu thích"
          value={favCount !== null ? favCount : "..."}
          accentColor="text-rose-400"
        />
        <StatItem
          icon={CalendarDays}
          label="Ngày tham gia"
          value={joinDate}
          accentColor="text-sky-400"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
          Thao tác nhanh
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/favorites"
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/[0.07] hover:border-white/10 group"
          >
            <span className="flex items-center gap-2.5">
              <Heart size={16} className="text-rose-400" />
              Kho {isComic ? "truyện" : "phim"} yêu thích
            </span>
            <ArrowRight
              size={16}
              className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

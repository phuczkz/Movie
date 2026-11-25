import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, LogOut, Shield } from "lucide-react";
import { isFirebaseConfigured } from '@/firebase.config.js';
import { useAuth } from '@/features/auth/context/AuthContext.jsx';
import AvatarModal from '@/components/AvatarModal.jsx';
import { getProxiedAvatar } from "@/utils/image-helper.js";
import ProfileStatsCard from '@/features/auth/components/profile-stats-card.jsx';
import {
  normalizeBirthday,
  normalizePhoneNumber,
  pickFirstValue,
} from "@/features/auth/utils/profile-format.js";

const WatchHistory = lazy(() => import('@/features/movies/components/WatchHistory.jsx'));

const ROW_INPUT_CLASS =
  "flex-1 min-w-0 w-full max-w-full box-border appearance-none bg-transparent py-3 text-[15px] sm:text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none";

const Profile = () => {
  const navigate = useNavigate();
  const {
    user,
    userProfile,
    profileLoading,
    loading,
    isAdmin,
    updateProfileData,
    logout,
  } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Compute today's local date string once (YYYY-MM-DD) for max attribute
  const todayStr = useMemo(() => normalizeBirthday(new Date()), []);

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
      return;
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const profile = userProfile || {};
    const resolvedName = pickFirstValue(
      profile.displayName,
      user?.displayName
    );
    const resolvedBirthday = pickFirstValue(
      profile.birthday,
      profile.birthDate,
      profile.dob
    );
    const resolvedPhone = pickFirstValue(
      profile.phoneNumber,
      profile.phone,
      user?.phoneNumber
    );

    setDisplayName(typeof resolvedName === "string" ? resolvedName : "");
    setBirthday(normalizeBirthday(resolvedBirthday));
    setPhoneNumber(normalizePhoneNumber(resolvedPhone));
  }, [userProfile, user]);

  const avatarUrl = useMemo(() => {
    let rawUrl = null;
    if (userProfile?.photoURL) rawUrl = userProfile.photoURL;
    else if (user?.photoURL) rawUrl = user.photoURL;
    else if (user?.uid) rawUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`;

    if (!rawUrl) return null;
    return getProxiedAvatar(rawUrl, 200);
  }, [user, userProfile]);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="loader-orbit loader-orbit-md" />
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      setError(
        "Firebase chưa được cấu hình. Vui lòng bổ sung biến môi trường."
      );
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateProfileData({
        displayName: displayName.trim(),
        birthday: normalizeBirthday(birthday),
        phoneNumber: normalizePhoneNumber(phoneNumber),
      });
      setMessage("Đã lưu thông tin hồ sơ");
    } catch (err) {
      setError(err.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-0 py-2 sm:px-2 sm:py-4 lg:p-8 space-y-6 lg:space-y-8 min-w-0">
      {/* Identity Header: Gọn nhẹ chuẩn Mobile App, thoáng trên Desktop */}
      <div className="flex flex-col lg:flex-row items-center lg:items-center gap-3.5 lg:gap-6 pt-1 pb-2 lg:pt-0 lg:pb-7 lg:border-b lg:border-white/[0.07]">
        <div className="relative shrink-0">
          <div className="size-24 lg:size-28 rounded-full border-2 border-white/15 bg-white/5 overflow-hidden aspect-square">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full object-cover aspect-square"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-400/70 to-cyan-500/70 text-emerald-950 font-bold text-3xl select-none">
                {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAvatarModal(true)}
            className="absolute right-0 bottom-0 size-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-white border-2 border-[#0b0b15] transition-colors active:scale-95"
            title="Đổi ảnh đại diện"
            aria-label="Đổi ảnh đại diện"
          >
            <Camera size={15} />
          </button>
        </div>

        <div className="flex-1 min-w-0 text-center lg:text-left space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight break-words">
            {displayName || "Người dùng"}
          </h1>
          {user?.email && (
            <p className="text-sm text-slate-400 truncate">
              {user.email}
            </p>
          )}

          {/* 2 button Quản lý và Đăng xuất đặt dưới thông tin tên/email và ngay trên đầu 2 form */}
          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="h-9 sm:h-10 rounded-xl lg:rounded-full bg-amber-500/10 border border-amber-500/25 px-4 text-xs sm:text-sm font-medium text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Shield size={15} />
                <span>Bảng quản lý</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => logout().then(() => navigate("/"))}
              className="h-9 sm:h-10 rounded-xl lg:rounded-full bg-white/[0.05] border border-white/10 px-4 text-xs sm:text-sm font-medium text-slate-200 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400 active:scale-95 transition-all flex items-center gap-2"
            >
              <LogOut size={15} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Mobile ưu tiên Stats -> Form Grouped List -> Actions; Desktop 2 cột */}
      <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* Form Thông tin cá nhân dạng Inset Grouped List */}
        <div className="order-2 lg:order-1 min-w-0 space-y-5">
          {!isFirebaseConfigured && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
              Firebase chưa được cấu hình. Một số tính năng có thể không hoạt động.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4 min-w-0">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Thông tin cá nhân
              </h2>
              {profileLoading && (
                <span className="text-xs text-slate-400">Đang đồng bộ…</span>
              )}
            </div>

            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden min-w-0">
              <div className="flex items-center gap-3 px-4 min-h-[52px] focus-within:bg-white/[0.03] transition-colors min-w-0">
                <label
                  htmlFor="displayName"
                  className="w-24 sm:w-32 shrink-0 text-sm text-slate-400"
                >
                  Họ tên
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={ROW_INPUT_CLASS}
                  placeholder="Nhập tên của bạn"
                />
              </div>

              <div className="flex items-center gap-3 px-4 min-h-[52px] focus-within:bg-white/[0.03] transition-colors min-w-0">
                <label
                  htmlFor="birthday"
                  className="w-24 sm:w-32 shrink-0 text-sm text-slate-400"
                >
                  Ngày sinh
                </label>
                <input
                  id="birthday"
                  name="birthday"
                  type="date"
                  value={birthday || ""}
                  max={todayStr || undefined}
                  onChange={(e) => {
                    const value = e.target.value;
                    const clamped =
                      value && todayStr && value > todayStr ? todayStr : value;
                    setBirthday(clamped);
                  }}
                  className={ROW_INPUT_CLASS}
                />
              </div>

              <div className="flex items-center gap-3 px-4 min-h-[52px] focus-within:bg-white/[0.03] transition-colors min-w-0">
                <label
                  htmlFor="phoneNumber"
                  className="w-24 sm:w-32 shrink-0 text-sm text-slate-400"
                >
                  Điện thoại
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  value={phoneNumber}
                  onChange={(e) => {
                    const digits = (e.target.value || "").replace(/\D+/g, "");
                    setPhoneNumber(digits.slice(0, 11));
                  }}
                  className={ROW_INPUT_CLASS}
                  placeholder="0xxx xxx xxx"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 text-red-300 px-4 py-3 text-sm flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 px-4 py-3 text-sm flex items-center gap-2.5">
                <Check size={16} className="shrink-0" />
                <span className="min-w-0 break-words">{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || profileLoading}
              className="w-full lg:w-auto h-11 rounded-xl lg:rounded-full bg-emerald-500 px-7 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 active:scale-[0.99]"
            >
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </form>
        </div>

        {/* Thống kê hoạt động */}
        <div className="order-1 lg:order-2 min-w-0">
          <ProfileStatsCard />
        </div>
      </div>

      <Suspense fallback={<div className="text-slate-400 text-sm">Đang tải lịch sử...</div>}>
        <WatchHistory />
      </Suspense>

      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatarUrl={avatarUrl}
        onSuccess={(msg) => setMessage(msg)}
        onError={(err) => setError(err)}
      />
    </div>
  );
};

export default Profile;

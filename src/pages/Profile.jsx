import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { Camera, Check } from "lucide-react";
import { isFirebaseConfigured } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";
import WatchHistory from "../components/WatchHistory.jsx";
import AvatarModal from "../components/AvatarModal.jsx";

const formatDate = (value) => {
  if (!value) return "";
  if (value instanceof Timestamp)
    return value.toDate().toISOString().slice(0, 10);
  if (typeof value === "string" && value.includes("T"))
    return value.slice(0, 10);
  return value;
};

const Profile = () => {
  const navigate = useNavigate();
  const {
    user,
    userProfile,
    profileLoading,
    loading,
    updateProfileData,
    logout,
  } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    if (!user && !loading) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    const profile = userProfile || {};
    setDisplayName(profile.displayName || user?.displayName || "");
    setBirthday(formatDate(profile.birthday));
    setPhoneNumber(profile.phoneNumber || user?.phoneNumber || "");
  }, [userProfile, user]);

  const avatarUrl = useMemo(() => {
    if (userProfile?.photoURL) return userProfile.photoURL;
    if (user?.photoURL) return user.photoURL;
    if (user?.uid)
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`;
    return null;
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
      await updateProfileData({ displayName, birthday, phoneNumber });
      setMessage("Đã lưu thông tin hồ sơ");
    } catch (err) {
      setError(err.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-white/5">
        <div className="relative group shrink-0">
          <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-white/10 bg-white/5 overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-300">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-400/70 to-cyan-500/70 text-slate-900 font-bold text-3xl">
                {(user?.email || "").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAvatarModal(true)}
            className="absolute right-0 bottom-0 p-2.5 rounded-full bg-emerald-500 text-slate-950 shadow-xl border-4 border-slate-950 transition-all hover:scale-110 active:scale-95 z-20"
            title="Đổi ảnh đại diện"
          >
            <Camera size={20} />
          </button>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-emerald-500 font-black mb-1">
              Thành viên Movie
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight break-words">
              {displayName || "Người dùng"}
            </h1>
          </div>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto sm:mx-0">
            Quản lý thông tin cá nhân, cập nhật ảnh đại diện và xem lại lịch sử xem phim của bạn.
          </p>
          
          <div className="pt-4 flex flex-wrap justify-center sm:justify-start gap-3">
             <button
              onClick={() => logout().then(() => navigate("/"))}
              className="rounded-full bg-white/5 border border-white/10 px-6 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
          Firebase chưa được cấu hình. Một số tính năng có thể không hoạt động.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr,auto]">
        <form onSubmit={onSubmit} className="space-y-6 order-2 lg:order-1">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold ml-1">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 text-slate-400 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold ml-1">Họ tên / Biệt danh</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all"
                placeholder="Nhập tên của bạn"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold ml-1">Ngày sinh</label>
              <input
                type="date"
                value={birthday || ""}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  const value = e.target.value;
                  const today = new Date().toISOString().slice(0, 10);
                  const clamped = value && value > today ? today : value;
                  setBirthday(clamped);
                }}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold ml-1">Số điện thoại</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => {
                  const digits = (e.target.value || "").replace(/\D+/g, "");
                  setPhoneNumber(digits.slice(0, 10));
                }}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all"
                placeholder="0xxx xxx xxx"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 px-4 py-3 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 px-4 py-3 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <Check size={16} />
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || profileLoading}
            className="w-full sm:w-auto rounded-full bg-emerald-500 px-8 py-3.5 text-slate-950 font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 active:scale-95"
          >
            {saving ? "Đang xử lý..." : "Lưu thay đổi"}
          </button>
        </form>
      </div>

      <WatchHistory />

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

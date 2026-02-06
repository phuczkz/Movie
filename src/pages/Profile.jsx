import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { isFirebaseConfigured } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";

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

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    const profile = userProfile || {};
    setDisplayName(profile.displayName || user?.displayName || "");
    setBirthday(formatDate(profile.birthday));
    setPhoneNumber(profile.phoneNumber || user?.phoneNumber || "");
  }, [userProfile, user]);

  const avatarUrl = useMemo(() => {
    if (user?.photoURL) return user.photoURL;
    if (user?.uid)
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`;
    return null;
  }, [user]);

  const createdAt = useMemo(() => {
    const value = userProfile?.createdAt;
    if (!value) return "";
    if (value instanceof Timestamp) return value.toDate().toLocaleDateString();
    return value;
  }, [userProfile]);

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
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-20 w-20 rounded-full border border-white/15 bg-white/5 overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-400/70 to-cyan-500/70 text-slate-900 font-bold text-xl">
              {(user?.email || "").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-slate-400">
            Hồ sơ
          </p>
          <h1 className="text-3xl font-bold text-white">Thông tin tài khoản</h1>
          <p className="text-slate-400 mt-1">
            Email không thể thay đổi sau khi đăng ký.
          </p>
        </div>
        <div className="sm:ml-auto">
          <button
            onClick={() => logout().then(() => navigate("/"))}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:border-white/30"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
          Firebase chưa được cấu hình. Thêm các biến VITE_FIREBASE_* để kích
          hoạt.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-slate-200">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-slate-300"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-200">Họ tên / biệt danh</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-400 focus:border-white/40 focus:outline-none"
              placeholder="Tên hiển thị"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-slate-200">Ngày sinh</label>
            <input
              type="date"
              value={birthday || ""}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-400 focus:border-white/40 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-200">Số điện thoại</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-400 focus:border-white/40 focus:outline-none"
              placeholder="0123 456 789"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-100 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 px-3 py-2 text-sm">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || profileLoading}
          className="rounded-full bg-emerald-500 px-4 py-3 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
};

export default Profile;

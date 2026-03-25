import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onSnapshot, doc } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const { user, loginEmail, loginGoogle, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, "settings", "maintenance"), (snap) => {
      setMaintenanceEnabled(snap.exists() ? snap.data().enabled : false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.email === import.meta.env.VITE_ADMIN_EMAIL;
    if (isAdmin || !maintenanceEnabled) {
      navigate("/profile");
    }
  }, [user, navigate, maintenanceEnabled]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      setError(
        "Firebase chưa được cấu hình. Vui lòng bổ sung biến môi trường."
      );
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await loginEmail(email, password);
      // Admin always goes to profile, User only if no maintenance
      if (email === import.meta.env.VITE_ADMIN_EMAIL || !maintenanceEnabled) {
        navigate("/profile");
      }
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    if (!isFirebaseConfigured) {
      setError(
        "Firebase chưa được cấu hình. Vui lòng bổ sung biến môi trường."
      );
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await loginGoogle();
      const isAdmin = auth?.currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL;
      if (isAdmin || !maintenanceEnabled) {
        navigate("/profile");
      }
    } catch (err) {
      setError(err.message || "Đăng nhập Google thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.16em] text-slate-400">
          Tài khoản
        </p>
        <h1 className="text-3xl font-bold text-white">Đăng nhập</h1>
        <p className="text-slate-400 mt-2">
          Đăng nhập để lưu phim và xem hồ sơ của bạn.
        </p>
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
          Firebase chưa được cấu hình. Thêm các biến VITE_FIREBASE_* để kích
          hoạt.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-400 focus:border-white/40 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-400 focus:border-white/40 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-100 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full rounded-full bg-emerald-500 px-4 py-3 text-slate-900 font-semibold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60"
        >
          {submitting ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Hoặc
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        onClick={onGoogle}
        disabled={submitting || loading}
        className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-3 text-white font-semibold hover:border-white/30 disabled:opacity-60"
      >
        Đăng nhập với Google
      </button>

      <p className="text-sm text-slate-300">
        Chưa có tài khoản?{" "}
        <Link
          to="/register"
          className="text-emerald-400 hover:text-emerald-300"
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
};

export default Login;

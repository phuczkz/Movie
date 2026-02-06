import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isFirebaseConfigured } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";

const Register = () => {
  const navigate = useNavigate();
  const { user, registerEmail, loginGoogle, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/profile");
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      setError(
        "Firebase chưa được cấu hình. Vui lòng bổ sung biến môi trường."
      );
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await registerEmail(email, password);
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Đăng ký thất bại");
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
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Đăng ký Google thất bại");
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
        <h1 className="text-3xl font-bold text-white">Đăng ký</h1>
        <p className="text-slate-400 mt-2">
          Tạo tài khoản để đồng bộ và lưu phim yêu thích.
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
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Nhập lại mật khẩu</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {submitting ? "Đang xử lý..." : "Đăng ký"}
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
        Đăng ký với Google
      </button>

      <p className="text-sm text-slate-300">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-emerald-400 hover:text-emerald-300">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
};

export default Register;

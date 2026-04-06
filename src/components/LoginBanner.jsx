import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const UNSPLASH_BG_RAW =
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop";

const UNSPLASH_BG_OPTIMIZED = `https://wsrv.nl/?url=${encodeURIComponent(
  UNSPLASH_BG_RAW
)}&output=webp&w=960&fit=cover&q=80`;

const LoginBanner = () => {
  const { user, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const shouldShow = !loading && !user;

  const handleClose = () => {
    setDismissed(true);
  };

  if (!shouldShow || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="relative flex flex-col justify-end w-full max-w-2xl min-h-[480px] overflow-hidden bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
        {/* Background Image Container covering the entire modal */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${UNSPLASH_BG_OPTIMIZED})` }}
          aria-hidden="true"
        />
        {/* Lớp phủ toàn bộ ảnh */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/20 opacity-90"></div>

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
          aria-label="Đóng"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="px-4 md:px-8 pb-8 md:pb-12 pt-16 md:pt-20 text-center relative z-10 w-full">
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6 drop-shadow-lg leading-tight">
            Trải nghiệm xem cùng Kho Phim
          </h3>
          <p className="text-slate-100 text-2xl md:text-3xl mb-8 md:mb-10 px-2 md:px-4 drop-shadow-md leading-snug">
            Bạn vui lòng đăng ký/đăng nhập tài khoản để có trải nghiệm xem phim
            tốt nhất 😎
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-20">
            <Link
              to="/login"
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-emerald-500/30"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="px-8 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all shadow-lg"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginBanner;

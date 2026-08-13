import { Link } from "react-router-dom";
import { Home, Search, Film, ArrowLeft } from "lucide-react";
import SEO from '@/components/SEO.jsx';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <SEO title="404 — Không tìm thấy trang" />

      {/* Animated 404 Number */}
      <div className="relative mb-8">
        <span className="text-[140px] sm:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-500/20 via-slate-700/30 to-purple-500/20 select-none leading-none tracking-tighter">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-24 sm:size-28 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-emerald-500/5 animate-pulse">
            <Film className="size-12 sm:size-14 text-emerald-500/60" />
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="space-y-3 mb-10 max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Ôi! Trang này không tồn tại
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Có vẻ như bạn đã lạc vào một chiều không gian khác. Trang bạn tìm kiếm có thể đã bị xoá, đổi tên hoặc chưa từng tồn tại.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Home className="size-4" />
          Về trang chủ
        </Link>
        <Link
          to="/search"
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-2xl font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Search className="size-4" />
          Tìm kiếm phim
        </Link>
      </div>

      {/* Back link */}
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mt-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Quay lại trang trước
      </button>
    </div>
  );
};

export default NotFound;

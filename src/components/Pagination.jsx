import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
} from "lucide-react";

/**
 * Pagination Component
 * @param {number} currentPage - Trang hiện tại
 * @param {boolean} hasNext - Còn trang tiếp theo không
 * @param {function} onPageChange - Callback khi chuyển trang
 */
const Pagination = ({ currentPage, hasNext, onPageChange }) => {
  // Tạo danh sách trang hiển thị (cửa sổ trượt 5 trang xung quanh trang hiện tại)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - 2);
    let end = hasNext ? currentPage + 2 : currentPage;
    
    // Đảm bảo luôn hiển thị ít nhất một khoảng trang nếu có thể
    if (currentPage <= 3) {
      end = Math.max(end, Math.min(5, hasNext ? currentPage + (5 - currentPage) : currentPage));
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col items-center gap-5 py-12">
      <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
        {/* Quay về trang đầu */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-slate-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed group"
          title="Trang đầu"
        >
          <ChevronsLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Trang trước */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-10 px-3 sm:px-5 items-center gap-2 rounded-xl border border-white/5 bg-white/5 text-sm font-bold text-slate-300 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed group shadow-sm"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Danh sách số trang */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-1">
          {pages[0] > 1 && (
            <span className="text-slate-600 font-bold px-1 hidden sm:inline">...</span>
          )}
          
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition-all duration-500 transform active:scale-95 ${
                p === currentPage
                  ? "border-emerald-500 bg-emerald-500 text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] rotate-0 scale-105"
                  : "border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}

          {hasNext && (
            <span className="text-slate-600 font-bold px-1 hidden sm:inline">...</span>
          )}
        </div>

        {/* Trang sau */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="flex h-10 px-3 sm:px-5 items-center gap-2 rounded-xl border border-white/5 bg-white/5 text-sm font-bold text-slate-300 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed group shadow-sm"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
      
      {/* Chỉ báo trạng thái trang */}
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/10"></span>
        <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.25em] flex items-center gap-2">
          Page <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{currentPage}</span>
        </p>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/10"></span>
      </div>
    </div>
  );
};

export default Pagination;

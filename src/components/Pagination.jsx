import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Pagination Component
 * @param {number} currentPage - Trang hiện tại
 * @param {number} [totalPages] - Tổng số trang (nếu có từ API)
 * @param {boolean} [hasNext] - Còn trang tiếp theo không
 * @param {function} onPageChange - Callback khi chuyển trang
 */
const Pagination = ({ currentPage = 1, totalPages, hasNext, onPageChange }) => {
  const effectiveTotalPages = typeof totalPages === "number" && totalPages > 0 ? totalPages : null;
  const effectiveHasNext = effectiveTotalPages ? currentPage < effectiveTotalPages : Boolean(hasNext);

  // Tạo danh sách trang hiển thị (cửa sổ trượt 5 trang xung quanh trang hiện tại)
  const getPageNumbers = () => {
    if (effectiveTotalPages) {
      if (effectiveTotalPages <= 7) {
        return Array.from({ length: effectiveTotalPages }, (_, i) => i + 1);
      }

      let start = Math.max(1, currentPage - 2);
      let end = Math.min(effectiveTotalPages, currentPage + 2);

      if (currentPage <= 3) {
        start = 1;
        end = Math.min(effectiveTotalPages, 5);
      } else if (currentPage >= effectiveTotalPages - 2) {
        start = Math.max(1, effectiveTotalPages - 4);
        end = effectiveTotalPages;
      }

      const pages = [];
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Fallback khi không biết trước totalPages
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = effectiveHasNext ? currentPage + 2 : currentPage;

    if (currentPage <= 3) {
      end = Math.max(
        end,
        Math.min(5, effectiveHasNext ? currentPage + (5 - currentPage) : currentPage)
      );
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();
  const showFirstButton = effectiveTotalPages && pages[0] > 1;
  const showFirstEllipsis = effectiveTotalPages ? pages[0] > 2 : pages[0] > 1;
  const showLastEllipsis = effectiveTotalPages ? pages[pages.length - 1] < effectiveTotalPages - 1 : effectiveHasNext;
  const showLastButton = effectiveTotalPages && pages[pages.length - 1] < effectiveTotalPages;

  return (
    <div className="flex flex-col items-center gap-5 py-10 sm:py-12">
      <div className="flex items-center gap-1 sm:gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl max-w-full overflow-x-auto no-scrollbar">
        {/* Quay về trang đầu */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-white/60 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed group shrink-0"
          title="Trang đầu"
        >
          <ChevronsLeft
            size={18}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
        </button>

        {/* Trang trước */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-9 sm:h-10 px-2.5 sm:px-4 items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 text-xs sm:text-sm font-bold text-white/80 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed group shadow-sm shrink-0"
          title="Trang trước"
        >
          <ChevronLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Danh sách số trang */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-0.5">
          {/* Trang 1 nếu nằm ngoài dải hiển thị */}
          {showFirstButton && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="flex size-9 sm:size-10 items-center justify-center rounded-xl border text-xs sm:text-sm font-bold transition-all duration-300 transform active:scale-95 border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white shrink-0"
            >
              1
            </button>
          )}

          {showFirstEllipsis && (
            <span className="text-slate-600 font-bold px-1 select-none">
              …
            </span>
          )}

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`flex size-9 sm:size-10 items-center justify-center rounded-xl border text-xs sm:text-sm font-bold transition-all duration-300 transform active:scale-95 shrink-0 ${
                p === currentPage
                  ? "border-emerald-500 bg-emerald-500 text-emerald-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] rotate-0 scale-105"
                  : "border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}

          {showLastEllipsis && (
            <span className="text-slate-600 font-bold px-1 select-none">
              …
            </span>
          )}

          {/* Trang cuối nếu nằm ngoài dải hiển thị */}
          {showLastButton && (
            <button
              type="button"
              onClick={() => onPageChange(effectiveTotalPages)}
              className="flex size-9 sm:size-10 items-center justify-center rounded-xl border text-xs sm:text-sm font-bold transition-all duration-300 transform active:scale-95 border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white shrink-0"
            >
              {effectiveTotalPages}
            </button>
          )}
        </div>

        {/* Trang sau */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!effectiveHasNext}
          className="flex h-9 sm:h-10 px-2.5 sm:px-4 items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 text-xs sm:text-sm font-bold text-white/80 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed group shadow-sm shrink-0"
          title="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight
            size={16}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>

        {/* Quay về trang cuối */}
        {effectiveTotalPages && (
          <button
            type="button"
            onClick={() => onPageChange(effectiveTotalPages)}
            disabled={currentPage >= effectiveTotalPages}
            className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-white/60 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed group shrink-0"
            title={`Trang cuối (${effectiveTotalPages})`}
          >
            <ChevronsRight
              size={18}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useSearchMovies } from "@/features/movies/hooks/useSearchMovies.js";
import { usePosterFallback } from "@/features/movies/hooks/usePosterFallback.js";

const FALLBACK_POSTER =
  "https://placehold.co/120x180/0f172a/94a3b8?text=No+Image";

// Mục kết quả tìm kiếm nhanh - không thêm tag HD/FHD
const QuickResultItem = ({ movie, onSelect }) => {
  const { posterSrc, handlePosterError } = usePosterFallback(
    movie,
    120,
    70,
    FALLBACK_POSTER
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(movie)}
      className="w-full px-3 py-2.5 flex items-center gap-3 text-left rounded-xl hover:bg-white/5 active:bg-white/8 transition-colors active:scale-[0.99]"
    >
      <img
        src={posterSrc}
        alt={movie.name}
        className="w-10 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-800"
        loading="lazy"
        onError={handlePosterError}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white line-clamp-1 leading-tight">
          {movie.name}
        </p>
        {movie.origin_name && movie.origin_name !== movie.name && (
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
            {movie.origin_name}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">
          {movie.year || "Đang cập nhật"}
        </p>
      </div>
    </button>
  );
};

const SearchModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  // Giữ lại từ khóa đã nhập (nhớ từ khóa lúc nhập, không bị xóa khi tắt/bật lại popup)
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef(null);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto focus khi mở
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Nút Back Android / Gesture Back đóng modal
  useEffect(() => {
    if (open) {
      if (window.history.state?.modal !== "search-modal") {
        window.history.pushState({ modal: "search-modal" }, "");
      }
    }
  }, [open]);

  useEffect(() => {
    const handlePop = () => {
      if (open) onClose();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [open, onClose]);

  // Khóa cuộn trang KHÔNG dùng body position:fixed (gây viewport resize trên mobile)
  // Thay vào đó dùng overflow:hidden trên #root để giữ nguyên viewport height
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const root = document.getElementById("root") || document.documentElement;
    const originalOverflow = root.style.overflow;
    const originalHeight = root.style.height;

    root.style.overflow = "hidden";
    root.style.height = "100%";

    return () => {
      root.style.overflow = originalOverflow;
      root.style.height = originalHeight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const hasQuery = Boolean(debouncedQuery);

  const { data: results = [], isFetching } = useSearchMovies(
    debouncedQuery,
    "movie",
    { enabled: hasQuery }
  );
  const displayResults = results.slice(0, 7);

  const handleClose = () => {
    if (window.history.state?.modal === "search-modal") {
      window.history.replaceState(null, "");
    }
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    handleClose();
  };

  const handleSelect = (movie) => {
    if (!movie?.slug) return;
    navigate(`/movie/${movie.slug}`, { state: { movie } });
    handleClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <Motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* ── Search Popup ── */}
          <Motion.div
            key="search-panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="
              lg:hidden fixed left-3 right-3 bottom-0 z-[95]
              bg-[#0f0f1e]/98 backdrop-blur-2xl
              border border-white/10
              rounded-2xl
              shadow-[0_-16px_50px_rgba(0,0,0,0.85)]
              flex flex-col
              max-h-[75vh]
              overflow-hidden
            "
            style={{
              marginBottom: "calc(74px + max(12px, env(safe-area-inset-bottom, 12px)))",
            }}
          >
            {/* Thanh nhập tìm kiếm - màu tối đồng bộ giao diện, không bị trắng */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 p-3 flex-shrink-0"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nhập tên phim..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="
                    w-full h-11 rounded-xl
                    bg-[#181829] border border-white/15
                    pl-10 pr-9 text-sm text-white
                    placeholder:text-slate-400
                    focus:outline-none focus:border-white/30
                    appearance-none
                    transition-all
                  "
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Nút Hủy */}
              <button
                type="button"
                onClick={handleClose}
                className="
                  flex-shrink-0 h-11 px-3.5 rounded-xl
                  bg-[#181829] border border-white/15
                  text-xs font-semibold text-slate-300
                  hover:text-white hover:bg-white/10
                  active:scale-95 transition-all
                "
              >
                Hủy
              </button>
            </form>

            {/* Chỉ hiển thị kết quả khi có từ khóa đã nhập */}
            {hasQuery && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 pb-3 custom-scrollbar touch-pan-y border-t border-white/5 pt-2">
                <div className="mb-2 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {isFetching ? "Đang tìm..." : `Kết quả cho "${debouncedQuery}"`}
                  </span>
                </div>

                {displayResults.length === 0 && !isFetching ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Không tìm thấy phim phù hợp
                  </div>
                ) : (
                  <div className="space-y-1">
                    {displayResults.map((movie) => (
                      <QuickResultItem
                        key={movie.slug}
                        movie={movie}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}

                {displayResults.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="
                      w-full mt-2.5 py-2.5 rounded-xl
                      bg-white/5 border border-white/10
                      text-xs font-semibold text-slate-200
                      hover:bg-white/10 hover:text-white
                      active:scale-[0.99] transition-all
                    "
                  >
                    Xem tất cả kết quả
                  </button>
                )}
              </div>
            )}
          </Motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SearchModal;

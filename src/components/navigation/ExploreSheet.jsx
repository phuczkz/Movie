import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  X,
  Clapperboard,
  Globe,
  Heart,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  useMovieGenres,
  useMovieCountries,
} from "@/features/movies/hooks/useKKphimMovies.js";
import { isForbiddenGenre } from "@/utils/filter.js";

// Danh mục tĩnh dự phòng
const STATIC_GENRES = [
  { label: "Hành Động", to: "/category/hanh-dong" },
  { label: "Tình Cảm", to: "/category/tinh-cam" },
  { label: "Hài Hước", to: "/category/hai-huoc" },
  { label: "Kinh Dị", to: "/category/kinh-di" },
  { label: "Tâm Lý", to: "/category/tam-ly" },
  { label: "Phiêu Lưu", to: "/category/phieu-luu" },
  { label: "Hoạt Hình", to: "/category/hoat-hinh" },
  { label: "Viễn Tưởng", to: "/category/vien-tuong" },
  { label: "Thần Thoại", to: "/category/than-thoai" },
  { label: "Bí Ẩn", to: "/category/bi-an" },
  { label: "Chiếu Rạp", to: "/category/phim-chieu-rap" },
  { label: "Võ Thuật", to: "/category/vo-thuat" },
];

const STATIC_COUNTRIES = [
  { label: "Việt Nam", to: "/country/viet-nam" },
  { label: "Hàn Quốc", to: "/country/han-quoc" },
  { label: "Nhật Bản", to: "/country/nhat-ban" },
  { label: "Trung Quốc", to: "/country/trung-quoc" },
  { label: "Âu Mỹ", to: "/country/au-my" },
  { label: "Thái Lan", to: "/country/thai-lan" },
  { label: "Hồng Kông", to: "/country/hong-kong" },
  { label: "Đài Loan", to: "/country/dai-loan" },
  { label: "Ấn Độ", to: "/country/an-do" },
  { label: "Anh", to: "/country/anh" },
  { label: "Pháp", to: "/country/phap" },
  { label: "Canada", to: "/country/canada" },
];

const SkeletonChips = ({ count = 8 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="h-10 rounded-2xl bg-white/5 border border-white/5 animate-pulse"
      />
    ))}
  </>
);

const ChipGrid = ({ items, onSelect }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pb-6">
    {items.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        onClick={onSelect}
        className="
          flex items-center justify-center text-center
          px-3 py-2.5 rounded-2xl
          bg-white/5 border border-white/8
          text-sm font-medium text-slate-200
          hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300
          active:scale-95 active:bg-emerald-500/15
          transition-all duration-150
          min-h-[42px]
        "
      >
        {item.label}
      </Link>
    ))}
  </div>
);

const ExploreSheet = ({ open, onClose }) => {
  const navigate = useNavigate();
  // view: "menu" | "genre" | "country"
  const [view, setView] = useState("menu");
  const [prevOpen, setPrevOpen] = useState(open);
  const sheetRef = useRef(null);

  // Khi mở lại popup, luôn bắt đầu từ menu lựa chọn 3 options (đồng bộ trong lúc render)
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setView("menu");
    }
  }

  // Lazy-fetch dữ liệu chỉ khi mở sheet
  const { data: rawGenres, isLoading: loadingGenres } = useMovieGenres({
    enabled: open,
  });
  const { data: rawCountries, isLoading: loadingCountries } = useMovieCountries({
    enabled: open,
  });

  const genres =
    rawGenres && rawGenres.length > 0
      ? rawGenres
          .filter((g) => !isForbiddenGenre(g.slug))
          .map((g) => ({ label: g.name, to: `/category/${g.slug}` }))
      : STATIC_GENRES;

  const countries =
    rawCountries && rawCountries.length > 0
      ? rawCountries.map((c) => ({ label: c.name, to: `/country/${c.slug}` }))
      : STATIC_COUNTRIES;

  // Khóa cuộn trang 100% triệt để trên iOS Safari, Android Chrome & Desktop
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyRight = document.body.style.right;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.right = originalBodyRight;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Nút Back Android / Gesture Back đóng sheet
  useEffect(() => {
    if (open) {
      if (window.history.state?.modal !== "explore-sheet") {
        window.history.pushState({ modal: "explore-sheet" }, "");
      }
    }
  }, [open]);

  useEffect(() => {
    const handlePop = () => {
      if (open) {
        if (view !== "menu") {
          setView("menu");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [open, view, onClose]);

  const handleSelect = () => {
    if (window.history.state?.modal === "explore-sheet") {
      window.history.replaceState(null, "");
    }
    onClose();
  };

  const handleGoFavorites = () => {
    handleSelect();
    navigate("/favorites");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop: Khóa mọi thao tác cuộn xuyên qua nền ── */}
          <Motion.div
            key="explore-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
            style={{ touchAction: "none" }}
            onClick={onClose}
          />

          {/* ── Bottom Sheet Mở Rộng: Chiều cao 50% màn hình, bám sát mép đáy màn hình ── */}
          <Motion.div
            key="explore-sheet"
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="
              lg:hidden fixed inset-x-0 bottom-0 z-[95]
              h-[52vh] max-h-[52dvh] sm:h-[50vh] sm:max-h-[50dvh]
              bg-[#0f0f1e] border-t border-white/10
              rounded-t-[28px] rounded-b-none
              shadow-[0_-20px_60px_rgba(0,0,0,0.9)]
              flex flex-col
              overflow-hidden
            "
            style={{
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            {/* ── Drag Handle ── */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1" style={{ touchAction: "none" }}>
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* ── VIEW 1: Menu 3 options (Yêu thích, Thể loại, Quốc gia) ── */}
            {view === "menu" ? (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-white/5">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                      Mở rộng
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chọn mục bạn muốn khám phá
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng"
                    className="size-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white active:scale-95 transition-all"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* 3 Option Tiles */}
                <div
                  className="px-5 py-3 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar touch-pan-y space-y-2.5"
                  style={{
                    paddingBottom: "calc(84px + max(16px, env(safe-area-inset-bottom, 16px)))",
                  }}
                >
                  {/* Option 1: Yêu thích */}
                  <button
                    type="button"
                    onClick={handleGoFavorites}
                    className="
                      w-full flex items-center gap-3.5 p-3 rounded-2xl
                      bg-white/[0.03] border border-white/8
                      hover:bg-rose-500/10 hover:border-rose-500/30
                      active:scale-[0.98] transition-all text-left
                      group
                    "
                  >
                    <div className="size-11 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Heart className="size-5 fill-rose-500/30 stroke-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                        Yêu thích
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        Danh sách các bộ phim bạn đã lưu để xem lại
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>

                  {/* Option 2: Thể loại */}
                  <button
                    type="button"
                    onClick={() => setView("genre")}
                    className="
                      w-full flex items-center gap-3.5 p-3 rounded-2xl
                      bg-white/[0.03] border border-white/8
                      hover:bg-emerald-500/10 hover:border-emerald-500/30
                      active:scale-[0.98] transition-all text-left
                      group
                    "
                  >
                    <div className="size-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Clapperboard className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Thể loại
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        Hành Động, Hoạt Hình, Tình Cảm, Kinh Dị, Viễn Tưởng...
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>

                  {/* Option 3: Quốc gia */}
                  <button
                    type="button"
                    onClick={() => setView("country")}
                    className="
                      w-full flex items-center gap-3.5 p-3 rounded-2xl
                      bg-white/[0.03] border border-white/8
                      hover:bg-cyan-500/10 hover:border-cyan-500/30
                      active:scale-[0.98] transition-all text-left
                      group
                    "
                  >
                    <div className="size-11 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Globe className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        Quốc gia
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        Việt Nam, Hàn Quốc, Trung Quốc, Âu Mỹ, Thái Lan...
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIEW 2: Danh sách Thể loại / Quốc gia (có nút Quay lại) ── */
              <div className="flex flex-col flex-1 min-h-0">
                {/* Header với nút Quay lại */}
                <div
                  className="flex-shrink-0"
                  style={{ touchAction: "none" }}
                >
                  <div className="flex items-center justify-between px-4 pb-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setView("menu")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/8 text-xs font-semibold text-slate-300 hover:text-white active:scale-95 transition-all"
                    >
                      <ChevronLeft className="size-4" />
                      <span>Quay lại</span>
                    </button>

                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {view === "genre" ? "Thể Loại Phim" : "Quốc Gia"}
                    </h2>

                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Đóng"
                      className="size-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white active:scale-95 transition-all"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Segmented Switcher giữa Thể loại & Quốc gia */}
                  <div className="px-5 pb-3">
                    <div className="flex gap-2 p-1 rounded-2xl bg-white/5 border border-white/8">
                      {[
                        { id: "genre", label: "Thể Loại", icon: Clapperboard },
                        { id: "country", label: "Quốc Gia", icon: Globe },
                      ].map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setView(item.id)}
                            className={[
                              "relative flex-1 flex items-center justify-center gap-2",
                              "py-2 rounded-xl text-xs sm:text-sm font-semibold",
                              "transition-all duration-300 select-none overflow-hidden",
                              view === item.id
                                ? "bg-white/15 backdrop-blur-md border border-white/30 text-white shadow-[0_2px_16px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.25)]"
                                : "text-slate-400 hover:text-white hover:bg-white/5",
                            ].join(" ")}
                          >
                            {view === item.id && (
                              <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-white/5 to-transparent"
                              />
                            )}
                            <ItemIcon className="relative size-3.5 sm:size-4" />
                            <span className="relative">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Lưới danh mục cuộn mượt bên trong 50% màn hình, đệm đáy đủ lớn để không bị Tab Bar che */}
                <div
                  className="px-5 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar touch-pan-y"
                  style={{
                    paddingBottom: "calc(84px + max(16px, env(safe-area-inset-bottom, 16px)))",
                  }}
                >
                  {view === "genre" ? (
                    loadingGenres ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        <SkeletonChips count={8} />
                      </div>
                    ) : (
                      <ChipGrid items={genres} onSelect={handleSelect} />
                    )
                  ) : loadingCountries ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      <SkeletonChips count={8} />
                    </div>
                  ) : (
                    <ChipGrid items={countries} onSelect={handleSelect} />
                  )}
                </div>
              </div>
            )}
          </Motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ExploreSheet;

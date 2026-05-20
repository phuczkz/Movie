import { useState, useMemo } from "react";
import {
  Home,
  Heart,
  User,
  LayoutGrid,
  Repeat2,
  Film,
  BookOpen,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppMode } from "../context/AppModeContext";
import { useStandalone } from "../hooks/useStandalone";
import { LazyMotion, domAnimation, m as Motion, AnimatePresence } from "framer-motion";

/* ── static data ───────────────────────────────────────────────────────────── */

const MOVIE_GENRES = [
  { label: "Hành Động", to: "/category/hanh-dong" },
  { label: "Tình Cảm", to: "/category/tinh-cam" },
  { label: "Kinh Dị", to: "/category/kinh-di" },
  { label: "Hài Hước", to: "/category/hai-huoc" },
  { label: "Tâm Lý", to: "/category/tam-ly" },
  { label: "Viễn Tưởng", to: "/category/vien-tuong" },
  { label: "Hoạt Hình", to: "/category/hoat-hinh" },
  { label: "Phim Bộ", to: "/category/phim-bo" },
  { label: "Phim Lẻ", to: "/category/phim-le" },
  { label: "Phiêu Lưu", to: "/category/phieu-luu" },
];

const COMIC_GENRES = [
  { label: "Manga", to: "/comics/the-loai/manga" },
  { label: "Manhwa", to: "/comics/the-loai/manhwa" },
  { label: "Action", to: "/comics/the-loai/action" },
  { label: "Adventure", to: "/comics/the-loai/adventure" },
  { label: "Fantasy", to: "/comics/the-loai/fantasy" },
  { label: "Romance", to: "/comics/the-loai/romance" },
  { label: "Comedy", to: "/comics/the-loai/comedy" },
  { label: "Horror", to: "/comics/the-loai/horror" },
];

/* ── Tab config ────────────────────────────────────────────────────────────── */

const TABS = [
  { key: "home", icon: Home, label: "Trang chủ" },
  { key: "category", icon: LayoutGrid, label: "Thể loại" },
  { key: "mode", icon: Repeat2, label: "Chế độ" },
  { key: "favorites", icon: Heart, label: "Yêu thích" },
  { key: "profile", icon: User, label: "Cá nhân" },
];


/* ── helpers ───────────────────────────────────────────────────────────────── */

/** Map current pathname to a tab index (0-4). */
const resolveTab = (pathname) => {
  // Home
  if (pathname === "/" || pathname === "/comics" || pathname === "/comics/") return 0;
  // Categories
  if (
    pathname.startsWith("/category/") ||
    pathname.startsWith("/comics/the-loai/") ||
    pathname.startsWith("/comics/danh-sach/")
  )
    return 1;
  // Favorites
  if (pathname === "/favorites" || pathname === "/comics/favorites") return 3;
  // Profile (includes login/register since they redirect from profile)
  if (
    pathname === "/profile" ||
    pathname === "/comics/profile" ||
    pathname === "/login" ||
    pathname === "/register"
  )
    return 4;
  // Default to Home for other pages (detail, watch, etc.)
  return 0;
};

/* ── component ─────────────────────────────────────────────────────────────── */

const BottomNav = () => {
  const isStandalone = useStandalone();
  const { appMode, setAppMode } = useAppMode();
  const location = useLocation();
  const navigate = useNavigate();
  const isComic = appMode === "comic";

  // Read location.pathname in useMemo — it's a stable string read, not reactive subscription
  const routeTab = useMemo(
    () => resolveTab(location.pathname),
    [location]
  );

  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // Hide in non-standalone mode
  if (!isStandalone) return null;

  // Hide when reading a comic chapter (immersive reading experience)
  const isComicReader = location.pathname.includes("/comics/chapter/");
  if (isComicReader) return null;

  /**
   * Derive the visual active tab directly from state — no useEffect sync needed.
   * When a menu is open, the notch sits at that menu's tab.
   * Otherwise it follows the current route.
   */
  const activeTab = showCategoryMenu ? 1 : showModeMenu ? 2 : routeTab;

  /* ── handlers ─────────────────────────────────────────────────────────── */

  const handleTab = (index) => {
    setShowModeMenu(false);
    setShowCategoryMenu(false);

    switch (index) {
      case 0:
        navigate(isComic ? "/comics" : "/");
        break;
      case 1:
        setShowCategoryMenu(true);
        break;
      case 2:
        setShowModeMenu(true);
        break;
      case 3:
        navigate(isComic ? "/comics/favorites" : "/favorites");
        break;
      case 4:
        navigate(isComic ? "/comics/profile" : "/profile");
        break;
    }
  };

  const handleModeSelect = (mode) => {
    setAppMode(mode);
    setShowModeMenu(false);
    navigate(mode === "movie" ? "/" : "/comics");

  };

  const closeAll = () => {
    setShowCategoryMenu(false);
    setShowModeMenu(false);
  };


  /* ── render ───────────────────────────────────────────────────────────── */

  return (
    <LazyMotion features={domAnimation}>
      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(showCategoryMenu || showModeMenu) && (
          <Motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAll}
            className="lg:hidden fixed inset-0 z-[105] bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ── Category overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCategoryMenu && (
          <Motion.div
            key="category"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="lg:hidden fixed inset-x-3 bottom-24 z-[110] bg-[#0d1025]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <h2 className="text-lg font-bold text-white mb-4">
              Thể loại {isComic ? "Truyện" : "Phim"}
            </h2>
            <div className="grid grid-cols-2 gap-2.5 max-h-[42vh] overflow-y-auto custom-scrollbar pr-1">
              {(isComic ? COMIC_GENRES : MOVIE_GENRES).map((g) => (
                <button
                  key={g.to}
                  type="button"
                  onClick={() => {
                    navigate(g.to);
                    setShowCategoryMenu(false);
                  }}
                  className="bg-white/[0.04] border border-white/[0.06] py-3.5 rounded-2xl text-center text-sm font-semibold text-slate-200 active:scale-95 transition-all"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ── Mode picker ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModeMenu && (
          <Motion.div
            key="mode"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="lg:hidden fixed z-[110] bottom-24 inset-x-0 flex justify-center gap-3 px-4"
          >
            <button
              onClick={() => handleModeSelect("movie")}
              className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl border backdrop-blur-2xl font-bold text-sm transition-all active:scale-95 shadow-xl ${appMode === "movie"
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                  : "bg-[#0d1025]/90 border-white/10 text-slate-400"
                }`}
            >
              <Film size={20} />
              <span>Movie</span>
            </button>
            <button
              onClick={() => handleModeSelect("comic")}
              className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl border backdrop-blur-2xl font-bold text-sm transition-all active:scale-95 shadow-xl ${appMode === "comic"
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-[#0d1025]/90 border-white/10 text-slate-400"
                }`}
            >
              <BookOpen size={20} />
              <span>Comic</span>
            </button>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Navigation Bar ───────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-[100]"
        aria-label="Main Navigation"
      >
        <div
          className="relative"
          style={{
            height: "calc(60px + env(safe-area-inset-bottom, 0px))",
            marginTop: 24,
          }}
        >
          {/* ── Bar background ──────────────────────────────────────────── */}
          <div className="absolute inset-0 bg-[#0b0b15]" />

          {/* ── Static Center Notch ────────────────────── */}
          <div
            className="absolute z-20"
            style={{
              top: -24,
              width: 72,
              height: 72,
              left: "50%",
              marginLeft: -36, // center it
            }}
          >
            {/* Dark ring */}
            <div className="w-[72px] h-[72px] rounded-full bg-[#0b0b15] flex items-center justify-center relative">
              {/* Left curve connector */}
              <div className="absolute -left-[14px] bottom-[24px] w-[15px] h-[15px] overflow-hidden">
                <div
                  className="w-[30px] h-[30px] rounded-full"
                  style={{ boxShadow: "15px -15px 0 0 #0b0b15" }}
                />
              </div>
              {/* Right curve connector */}
              <div className="absolute -right-[14px] bottom-[24px] w-[15px] h-[15px] overflow-hidden">
                <div
                  className="w-[30px] h-[30px] rounded-full"
                  style={{ boxShadow: "-15px -15px 0 0 #0b0b15" }}
                />
              </div>
              {/* White FAB circle */}
              <button 
                className={`w-[56px] h-[56px] rounded-full bg-white shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center active:scale-95 transition-all ${
                  activeTab === 2 ? "ring-4 ring-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.5)]" : ""
                }`}
                onClick={() => handleTab(2)}
                aria-label="Mode toggle"
              >
                <Repeat2 
                  size={26} 
                  className={activeTab === 2 ? "text-emerald-600" : "text-[#0b0b15]"} 
                  strokeWidth={2.5} 
                />
              </button>
            </div>
          </div>

          {/* ── Icon row ────────────────────────────────────────────────── */}
          <div
            className="absolute inset-x-0 top-0 flex z-10"
            style={{ height: 64 }}
          >
            {TABS.map((tab, i) => {
              if (i === 2) {
                // The middle space is occupied by the FAB
                return <div key="spacer" className="flex-1" />;
              }
              const isActive = activeTab === i;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTab(i)}
                  aria-label={tab.label}
                  className="flex-1 flex flex-col items-center justify-center relative transition-colors active:bg-white/5"
                >
                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute top-0 inset-x-4 h-[3px] bg-emerald-500 rounded-b-md shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  )}
                  
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <tab.icon 
                      size={24} 
                      className={isActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "text-slate-400"} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </nav>
    </LazyMotion>
  );
};

export default BottomNav;

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogIn,
  Menu,
  Search,
  X,
  User,
  Film,
  BookOpen,
  LogOut,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useAppMode } from "../context/AppModeContext";
import { comicApi } from "../api/comicApi";
import SearchBar from "./SearchBar.jsx";
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const moviePrimaryNav = [
  { label: "Trang Chủ", to: "/" },
  { label: "Phim Bộ", to: "/category/phim-bo" },
  { label: "Hoạt Hình", to: "/category/hoat-hinh" },
  { label: "Phim Lẻ", to: "/category/phim-le" },
  { label: "Yêu Thích", to: "/favorites" },
];

const movieYearOptions = [
  { label: "2026", to: "/search?q=2026" },
  { label: "2025", to: "/search?q=2025" },
  { label: "2024", to: "/search?q=2024" },
  { label: "2023", to: "/search?q=2023" },
  { label: "2022", to: "/search?q=2022" },
  // { label: "Trước 2022", to: "/search?q=2010-2021" },
];

const movieGenreOptions = [
  { label: "Hành Động", to: "/category/hanh-dong" },
  { label: "Tình Cảm", to: "/category/tinh-cam" },
  { label: "Hài Hước", to: "/category/hai-huoc" },
  { label: "Kinh Dị", to: "/category/kinh-di" },
  { label: "Tâm Lý", to: "/category/tam-ly" },
  { label: "Phiêu Lưu", to: "/category/phieu-luu" },
];

const movieCountryOptions = [
  { label: "Việt Nam", to: "/country/viet-nam" },
  { label: "Hàn Quốc", to: "/country/han-quoc" },
  { label: "Nhật Bản", to: "/country/nhat-ban" },
  { label: "Trung Quốc", to: "/country/trung-quoc" },
  { label: "Âu Mỹ", to: "/country/au-my" },
  { label: "Thái Lan", to: "/country/thai-lan" },
];

const movieMoreOptions = [
  { label: "Phim Mới", to: "/category/phim-moi" },
  { label: "TV Show", to: "/search?q=tv-show" },
  { label: "Phim Sắp Chiếu", to: "/search?q=sap-chieu" },
  { label: "Thuyết Minh", to: "/search?q=thuyet-minh" },
  { label: "Phim Yêu Thích", to: "/favorites" },
];

const comicPrimaryNav = [
  { label: "MangaHub", to: "/comics" },
  { label: "Đang phát hành", to: "/comics/danh-sach/dang-phat-hanh" },
  { label: "Hoàn thành", to: "/comics/danh-sach/hoan-thanh" },
  { label: "Sắp ra mắt", to: "/comics/danh-sach/sap-ra-mat" },
  { label: "Yêu Thích", to: "/comics/favorites" },
];

const comicGenreOptions = [
  { label: "Action", to: "/comics/the-loai/action" },
  { label: "Adventure", to: "/comics/the-loai/adventure" },
  { label: "Fantasy", to: "/comics/the-loai/fantasy" },
  { label: "Romance", to: "/comics/the-loai/romance" },
  { label: "Manga", to: "/comics/the-loai/manga" },
  { label: "Manhwa", to: "/comics/the-loai/manhwa" },
];

const Dropdown = ({ label, options, isWide = false }) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const openNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const closeLater = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 100);
  };

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={closeLater}>
      <button className="flex items-center gap-1 px-2 lg:px-2.5 xl:px-3 py-2 text-sm xl:text-base font-semibold text-white/90 hover:text-white transition-colors">
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      {open && (
        <div
          className={`absolute z-30 mt-2 pt-1 ${isWide
            ? "fixed inset-x-4 lg:absolute lg:-right-40 lg:left-auto lg:translate-x-0 lg:w-[800px] xl:w-[1100px] 2xl:w-[1250px]"
            : "left-1/2 -translate-x-1/2 w-48"
            }`}
        >
          <div
            className={`rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl p-4 custom-scrollbar overflow-y-auto ${isWide
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-x-2 gap-y-1 max-h-[350px]"
              : "space-y-1 max-h-[400px]"
              }`}
          >
            {options.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MobileDropdown = ({ label, options, onNavigate }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner shadow-black/20">
      <button
        className="flex w-full items-center justify-between text-left text-base font-semibold text-white"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-white/90 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {options.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-center"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [apiGenreOptions, setApiGenreOptions] = useState([]);
  const location = useLocation();
  const { user, userProfile, logout } = useAuth();
  const { appMode, setAppMode } = useAppMode();
  const isAdmin = user && user.email === ADMIN_EMAIL;
  const navigate = useNavigate();
  const avatarUrl =
    userProfile?.photoURL ||
    user?.photoURL ||
    (user?.uid
      ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
      : null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await comicApi.getCategoryList();
        if (data.status === "success" && data.data && data.data.items) {
          const formatted = data.data.items.map((item) => ({
            label: item.name,
            to: `/comics/the-loai/${item.slug}`,
          }));
          setApiGenreOptions(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      }
    };
    fetchGenres();
  }, []);

  const closeAll = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };

  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 40);

      const isReadingComic = location.pathname.includes("/comics/chapter/");

      if (isReadingComic) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setIsHidden(true);
        } else if (currentScrollY < lastScrollY.current) {
          setIsHidden(false);
        }
      } else {
        setIsHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const isComicMode = appMode === "comic";
  const primaryNav = isComicMode ? comicPrimaryNav : moviePrimaryNav;
  const genreOptions = isComicMode
    ? apiGenreOptions.length > 0
      ? apiGenreOptions
      : comicGenreOptions
    : movieGenreOptions;

  const isHome = location.pathname === "/" || location.pathname === "/comics";
  const isDetail =
    location.pathname.startsWith("/movie/") ||
    location.pathname.startsWith("/comics/");
  const showTransparent = (isHome || isDetail) && !scrolled;

  return (
    <>
      <header
      className={`fixed inset-x-0 top-0 z-30 border-b transition-all duration-300 ${isHidden ? "-translate-y-full" : "translate-y-0"
        } ${showTransparent
          ? "border-transparent bg-transparent backdrop-blur-none [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]"
          : "border-white/5 bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/50 backdrop-blur-xl"
        }`}
    >
      {/* Mobile top bar */}
      <div className="lg:hidden relative px-4 py-3 flex items-center justify-between">
        <button
          aria-label="Toggle menu"
          onClick={() => {
            setMenuOpen((v) => !v);
            setSearchOpen(false);
          }}
          className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2">
          <button
            aria-label="Open search"
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
            className="inline-flex flex-shrink-0 items-center justify-center text-white p-2"
          >
            {searchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>

          {/* Mobile Toggle Button */}
          <button
            onClick={() => {
              setAppMode(appMode === "movie" ? "comic" : "movie");
              if (appMode === "movie") navigate("/comics");
              else navigate("/");
            }}
            className="inline-flex flex-shrink-0 items-center justify-center p-2 text-white bg-slate-800/80 rounded-full border border-white/10"
            title={`Chuyển sang ${appMode === "movie" ? "MangaHub" : "Xem Phim"
              }`}
          >
            {appMode === "movie" ? (
              <BookOpen className="h-5 w-5 text-purple-400" />
            ) : (
              <Film className="h-5 w-5 text-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop / tablet bar */}
      <div className="mx-auto w-full max-w-[1680px] px-4 py-3 hidden lg:flex items-center gap-2 xl:gap-4 md:px-6 lg:px-4 xl:px-8">
        <div className="flex-1 min-w-0">
          <SearchBar
            placeholder={
              isComicMode ? "Tìm kiếm truyện" : "Tìm kiếm phim, diễn viên"
            }
            className="max-w-xs lg:max-w-sm xl:max-w-xl"
          />
        </div>

        <nav className="flex items-center gap-0.5 xl:gap-1 text-white">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-2 lg:px-2.5 xl:px-3 py-2 text-sm xl:text-base font-semibold rounded-lg transition ${isActive ? "bg-white/10 text-white" : "hover:bg-white/10"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {!isComicMode && <Dropdown label="Năm" options={movieYearOptions} />}
          <Dropdown
            label="Thể Loại"
            options={genreOptions}
            isWide={isComicMode}
          />
          {!isComicMode && (
            <Dropdown label="Quốc Gia" options={movieCountryOptions} />
          )}
          {!isComicMode && <Dropdown label="Thêm" options={movieMoreOptions} />}
        </nav>

        <div className="flex items-center gap-2">
          {/* Desktop Toggle Button */}
          <button
            onClick={() => {
              setAppMode(appMode === "movie" ? "comic" : "movie");
              if (appMode === "movie") navigate("/comics");
              else navigate("/");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-sm font-semibold transition-colors mr-2"
          >
            {appMode === "movie" ? (
              <>
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-slate-200">Đọc Truyện</span>
              </>
            ) : (
              <>
                <Film className="w-4 h-4 text-blue-400" />
                <span className="text-slate-200">Xem Phim</span>
              </>
            )}
          </button>

          {user ? (
            <Link
              to={isComicMode ? "/comics/profile" : "/profile"}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 overflow-hidden shadow-lg shadow-slate-900/40 hover:border-white/30"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-400/70 to-cyan-500/70 text-slate-900 font-bold text-sm">
                  {(user.email || "").charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
            >
              <LogIn className="h-4 w-4" />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-full px-4 pb-3 z-40">
          <div className="rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl shadow-black/30 p-3">
            <SearchBar
              placeholder={
                isComicMode ? "Tìm kiếm truyện" : "Tìm kiếm phim, diễn viên"
              }
              className="w-full"
            />
          </div>
        </div>
      )}

    </header>

      {/* Mobile Sidebar & Backdrop - Moved outside header for proper stacking and to avoid clipping */}
      <div
        className={`lg:hidden fixed inset-0 z-[100] transition-all duration-300 ${menuOpen ? "visible" : "invisible"
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={closeAll}
        />

        {/* Sidebar Container */}
        <div
          className={`absolute inset-y-0 left-0 w-[300px] sm:w-[350px] bg-[#0b0b15] border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-out flex flex-col h-screen ${menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          {/* Sidebar Header (Profile Section) */}
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-6">
              <Link to={isComicMode ? "/comics" : "/"} onClick={closeAll} className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-center">
                  {isComicMode ? <BookOpen className="h-4 w-4 text-purple-400" /> : <Film className="h-4 w-4 text-blue-400" />}
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  {isComicMode ? "MangaHub" : "PHUCZK"}
                </span>
              </Link>
              <button
                onClick={closeAll}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {user ? (
              <div className="space-y-5">
                <Link
                  to={isComicMode ? "/comics/profile" : "/profile"}
                  onClick={closeAll}
                  className="flex items-center gap-4 group cursor-pointer"
                >
                  <div className="h-14 w-14 rounded-2xl border-2 border-emerald-500/20 bg-slate-800 p-0.5 shadow-xl group-hover:border-emerald-500/40 transition-all">
                    <div className="h-full w-full rounded-[14px] overflow-hidden bg-slate-700">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white font-bold text-lg uppercase bg-gradient-to-br from-slate-700 to-slate-800">
                          {(user.email || "U").charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-white truncate leading-tight group-hover:text-emerald-400 transition-colors">
                      {userProfile?.displayName || user.displayName || "Người dùng"}
                    </p>
                    {isAdmin && (
                      <p className="text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider mt-1 border border-emerald-500/20">
                        Admin
                      </p>
                    )}
                  </div>
                </Link>

                <button
                  onClick={async () => {
                    await logout();
                    closeAll();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98]"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={closeAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-[0.98]"
              >
                <User className="h-4 w-4" />
                <span>Đăng nhập ngay</span>
              </Link>
            )}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
            {/* Primary Navigation Section */}
            <div>
              <h3 className="px-2 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Danh mục</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {primaryNav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeAll}
                    className="group flex items-center gap-4 rounded-2xl bg-white/5 border border-white/5 px-4 py-4 text-base font-semibold text-slate-100 hover:bg-white/10 hover:border-white/10 active:scale-[0.98] transition-all"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-50 group-hover:scale-150 group-hover:opacity-100 transition-all" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Filters Section */}
            <div className="space-y-4">
              <h3 className="px-2 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Lọc & Phân loại</h3>
              <div className="space-y-3.5">
                {!isComicMode && (
                  <MobileDropdown
                    label="Năm phát hành"
                    options={movieYearOptions}
                    onNavigate={closeAll}
                  />
                )}
                <MobileDropdown
                  label="Thể Loại"
                  options={genreOptions}
                  onNavigate={closeAll}
                />
                {!isComicMode && (
                  <MobileDropdown
                    label="Quốc Gia"
                    options={movieCountryOptions}
                    onNavigate={closeAll}
                  />
                )}
                {!isComicMode && (
                  <MobileDropdown
                    label="Khác"
                    options={movieMoreOptions}
                    onNavigate={closeAll}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;

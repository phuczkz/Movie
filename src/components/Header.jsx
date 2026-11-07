import { useEffect, useRef, useState, useReducer, useMemo } from "react";
import {
  ChevronDown,
  LogIn,
  Menu,
  Search,
  X,
  User,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from '@/features/auth/context/AuthContext.jsx';
import { useMovieGenres, useMovieCountries } from '@/features/movies/hooks/useKKphimMovies.js';
import { isForbiddenGenre } from '@/utils/filter.js';
import SearchBar from '@/components/SearchBar.jsx';
import Notifications from '@/components/Notifications.jsx';

const moviePrimaryNav = [
  { label: "Trang Chủ", to: "/" },
  { label: "Phim Bộ", to: "/category/phim-bo" },
  { label: "Hoạt Hình", to: "/category/hoat-hinh" },
  { label: "Phim Lẻ", to: "/category/phim-le" },
  { label: "Yêu Thích", to: "/favorites" },
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

const Dropdown = ({
  label,
  options,
  variant = "default",
  isLoading = false,
  onTrigger,
}) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const isHoverDevice = useRef(
    typeof window !== "undefined" ? window.matchMedia("(hover: hover)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const handler = (e) => { isHoverDevice.current = e.matches; };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const openNow = () => {
    onTrigger?.();
    if (!isHoverDevice.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const closeLater = () => {
    if (!isHoverDevice.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    onTrigger?.();
    setOpen((prev) => !prev);
  };

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = () => setOpen(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [open]);

  // Determine container placement and grid classes based on variant
  let containerClasses = "left-1/2 -translate-x-1/2 w-48";
  let gridClasses = "space-y-1 max-h-[400px]";

  if (variant === "movie-genre") {
    containerClasses = "fixed inset-x-4 top-[64px] sm:top-[70px] lg:absolute lg:top-full lg:inset-x-auto lg:right-[-60px] xl:right-[-20px] 2xl:right-0 lg:w-[620px] xl:w-[700px] max-w-[calc(100vw-2rem)]";
    gridClasses = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 max-h-[380px]";
  } else if (variant === "movie-country") {
    containerClasses = "fixed inset-x-4 top-[64px] sm:top-[70px] lg:absolute lg:top-full lg:inset-x-auto lg:right-0 lg:w-[660px] xl:w-[760px] max-w-[calc(100vw-2rem)]";
    gridClasses = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 max-h-[380px]";
  }

  return (
    <div
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeLater}
      onClick={(e) => e.stopPropagation()}
      role="none"
    >
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center gap-0.5 xl:gap-1 px-1 xl:px-3 py-2 text-[13px] xl:text-base font-semibold text-white/90 hover:text-white transition-colors"
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 xl:h-4 xl:w-4 transition ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      {open && (
        <div className={`absolute z-40 mt-2 pt-1 ${containerClasses}`}>
          <div className={`rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 custom-scrollbar overflow-y-auto ${gridClasses}`}>
            {isLoading && options.length <= 6 ? (
              <div className="col-span-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 py-2">
                {[...Array(8)].map((_, idx) => (
                  <div key={idx} className="h-8 rounded-lg bg-white/5 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : (
              options.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center px-2.5 py-1.5 rounded-lg text-xs xl:text-sm text-slate-300 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/30 border border-transparent transition-all truncate"
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MobileDropdown = ({
  label,
  options,
  onNavigate,
  isLoading = false,
  onTrigger,
}) => {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    if (!open) {
      onTrigger?.();
    }
    setOpen((v) => !v);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner shadow-black/20">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-base font-semibold text-white active:opacity-75 transition-opacity"
        onClick={handleToggle}
      >
        <span>{label}</span>
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      {open && (
        isLoading && options.length <= 6 ? (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="h-9 rounded-xl bg-white/5 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-white/90 max-h-[320px] overflow-y-auto overscroll-y-contain custom-scrollbar pr-1 touch-pan-y">
            {options.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className="rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/15 hover:text-emerald-300 px-2.5 py-2.5 text-center text-xs font-medium text-slate-200 transition-all active:scale-95 active:bg-emerald-500/20 truncate"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
};

const initialHeaderState = {
  menuOpen: false,
  searchOpen: false,
  scrolled: false,
  isHidden: false,
};

function headerReducer(state, action) {
  switch (action.type) {
    case "SET_MENU_OPEN":
      return { ...state, menuOpen: action.payload };
    case "SET_SEARCH_OPEN":
      return { ...state, searchOpen: action.payload };
    case "SET_SCROLLED":
      return { ...state, scrolled: action.payload };
    case "SET_IS_HIDDEN":
      return { ...state, isHidden: action.payload };
    case "CLOSE_ALL":
      return { ...state, menuOpen: false, searchOpen: false };
    case "SET_SCROLL_STATE":
      return {
        ...state,
        scrolled: action.payload.scrolled,
        isHidden: action.payload.isHidden,
      };
    default:
      return state;
  }
}

const Header = () => {
  const [headerState, dispatch] = useReducer(headerReducer, initialHeaderState);
  const { menuOpen, searchOpen, scrolled, isHidden } = headerState;
  const location = useLocation();
  const { user, userProfile, logout, isAdmin } = useAuth();

  // Defer genre/country API calls until user interacts (hover, menu open, click) or idle prefetch
  const [navInteracted, setNavInteracted] = useState(false);
  const triggerNavFetch = () => {
    setNavInteracted(true);
  };

  // Prefetch when browser is idle so data is ready for mobile/tablet users
  useEffect(() => {
    if (navInteracted) return;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setNavInteracted(true), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setNavInteracted(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [navInteracted]);

  const avatarUrl =
    userProfile?.photoURL ||
    user?.photoURL ||
    (user?.uid
      ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
      : null);

  const shouldFetchMovieNav = navInteracted || menuOpen;
  const { data: apiMovieGenres = [], isLoading: isLoadingMovieGenres } = useMovieGenres({
    enabled: shouldFetchMovieNav,
  });
  const { data: apiMovieCountries = [], isLoading: isLoadingMovieCountries } = useMovieCountries({
    enabled: shouldFetchMovieNav,
  });

  const dynamicMovieGenreOptions = useMemo(() => {
    if (apiMovieGenres.length > 0) {
      return apiMovieGenres
        .filter((item) => !isForbiddenGenre(item))
        .map((item) => ({
          label: item.name,
          to: `/category/${item.slug}`,
        }));
    }
    return movieGenreOptions;
  }, [apiMovieGenres]);

  const dynamicMovieCountryOptions = useMemo(() => {
    if (apiMovieCountries.length > 0) {
      return apiMovieCountries.map((item) => ({
        label: item.name,
        to: `/country/${item.slug}`,
      }));
    }
    return movieCountryOptions;
  }, [apiMovieCountries]);

  // Android back button integration & clean navigation
  const isNavigatingRef = useRef(false);

  const closeMenu = () => {
    if (window.history.state?.modal === "mobile-menu") {
      window.history.back();
    } else {
      dispatch({ type: "SET_MENU_OPEN", payload: false });
    }
  };

  const closeSearch = () => {
    if (window.history.state?.modal === "mobile-search") {
      window.history.back();
    } else {
      dispatch({ type: "SET_SEARCH_OPEN", payload: false });
    }
  };

  const handleNavigation = () => {
    isNavigatingRef.current = true;
    if (window.history.state?.modal === "mobile-menu") {
      window.history.replaceState(null, "");
    }
    dispatch({ type: "CLOSE_ALL" });
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 150);
  };

  // Android Hardware / Gesture Back listener
  useEffect(() => {
    const handlePopState = () => {
      if (isNavigatingRef.current) return;
      if (menuOpen) {
        dispatch({ type: "SET_MENU_OPEN", payload: false });
      }
      if (searchOpen) {
        dispatch({ type: "SET_SEARCH_OPEN", payload: false });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [menuOpen, searchOpen]);

  // Sync history state & lock body scroll when sidebar opens
  useEffect(() => {
    if (menuOpen) {
      if (window.history.state?.modal !== "mobile-menu") {
        window.history.pushState({ modal: "mobile-menu" }, "");
      }

      // Lock body scroll on iOS & Android
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [menuOpen]);

  // Sync history state when mobile search opens
  useEffect(() => {
    if (searchOpen) {
      if (window.history.state?.modal !== "mobile-search") {
        window.history.pushState({ modal: "mobile-search" }, "");
      }
    }
  }, [searchOpen]);

  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const nextScrolled = currentScrollY > 40;

      dispatch({
        type: "SET_SCROLL_STATE",
        payload: { scrolled: nextScrolled, isHidden: false },
      });

      lastScrollY.current = currentScrollY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const primaryNav = moviePrimaryNav;
  const genreOptions = dynamicMovieGenreOptions;
  const countryOptions = dynamicMovieCountryOptions;

  const isHome = location.pathname === "/";
  const isDetail = location.pathname.startsWith("/movie/");
  const showTransparent = (isHome || isDetail) && !scrolled;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-all duration-300 border-b border-transparent bg-transparent backdrop-blur-none ${isHidden ? "-translate-y-full" : "translate-y-0"
          } ${showTransparent
            ? "[text-shadow:0_1px_8px_rgba(0,0,0,0.6)]"
            : "lg:border-white/5 lg:bg-gradient-to-b lg:from-slate-950/90 lg:via-slate-950/75 lg:to-slate-950/50 lg:backdrop-blur-xl"
          }`}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        {/* Mobile top bar with Notch/Dynamic Island protection (Center completely clear for Dynamic Island) */}
        <div className="lg:hidden relative px-4 py-2.5 sm:py-3 flex items-center justify-between min-h-[56px]">
          {/* Menu button - Glass circle */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => {
              triggerNavFetch();
              if (!menuOpen) {
                dispatch({ type: "SET_MENU_OPEN", payload: true });
                dispatch({ type: "SET_SEARCH_OPEN", payload: false });
              } else {
                closeMenu();
              }
            }}
            className="size-11 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-white/15 text-white shadow-lg active:scale-95 transition-all focus:outline-none"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Center is left completely clear so Dynamic Island / Notch sits without any obstruction */}

          {/* Right Action Group - Glass circles */}
          <div className="flex items-center gap-2">
            <Notifications
              buttonClassName="size-11 inline-flex flex-shrink-0 items-center justify-center rounded-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-white/15 text-white shadow-lg active:scale-95 transition-all relative"
            />
            <button
              type="button"
              aria-label="Open search"
              onClick={() => {
                if (!searchOpen) {
                  dispatch({ type: "SET_SEARCH_OPEN", payload: true });
                  if (menuOpen) closeMenu();
                } else {
                  closeSearch();
                }
              }}
              className="size-11 inline-flex flex-shrink-0 items-center justify-center rounded-full bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-white/15 text-white shadow-lg active:scale-95 transition-all focus:outline-none"
            >
              {searchOpen ? (
                <X className="size-5" />
              ) : (
                <Search className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop / tablet bar */}
        <div className="mx-auto w-full max-w-[1680px] px-4 py-3 hidden lg:flex items-center gap-2 xl:gap-4 md:px-6 lg:px-4 xl:px-8">
          {/* Desktop Logo */}
          <Link to="/" className="flex flex-shrink-0 items-center">
            <img src="/icons/logo.webp" alt="Logo" className="h-[56px] lg:h-[76px] -my-4 lg:-my-6 w-auto object-contain drop-shadow-md" />
          </Link>

          {/* SearchBar wrapper with specific widths per device */}
          <div className="flex-1 min-w-0 max-w-[200px] lg:max-w-[240px] xl:max-w-[320px] 2xl:max-w-[400px] mr-auto">
            <SearchBar
              placeholder="Tìm phim, diễn viên..."
              className="w-full"
            />
          </div>

          <nav
            className="flex flex-shrink-0 items-center gap-0.5 xl:gap-1 text-white"
            onMouseEnter={triggerNavFetch}
            onTouchStart={triggerNavFetch}
            onFocus={triggerNavFetch}
          >
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-1.5 xl:px-3 py-2 text-[13px] xl:text-base font-semibold rounded-lg transition ${isActive ? "bg-white/10 text-white" : "hover:bg-white/10"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <Dropdown
              label="Thể Loại"
              options={genreOptions}
              variant="movie-genre"
              isLoading={isLoadingMovieGenres}
              onTrigger={triggerNavFetch}
            />
            <Dropdown
              label="Quốc Gia"
              options={countryOptions}
              variant="movie-country"
              isLoading={isLoadingMovieCountries}
              onTrigger={triggerNavFetch}
            />
          </nav>

          <div className="flex flex-shrink-0 items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Notifications />
                <Link
                  to="/profile"
                  className="size-10 rounded-full border border-white/15 bg-white/10 overflow-hidden shadow-lg shadow-slate-900/40 hover:border-white/30"
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
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-400/70 to-cyan-500/70 text-emerald-950 font-semibold text-sm">
                      {(user.email || "").charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
              >
                <LogIn className="size-4" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search overlay */}
        {searchOpen && (
          <div
            className="lg:hidden absolute left-0 right-0 top-full px-4 pb-3 z-40 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
              paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
            }}
          >
            <div className="rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 p-3">
              <SearchBar
                placeholder="Tìm kiếm phim, diễn viên..."
                className="w-full"
              />
            </div>
          </div>
        )}

      </header>

      {/* Mobile Sidebar & Backdrop - Moved outside header for proper stacking and to avoid clipping */}
      <div
        className={`lg:hidden fixed inset-0 z-[100] transition-all duration-300 ${menuOpen ? "visible" : "invisible pointer-events-none"
          }`}
        style={{
          touchAction: menuOpen ? "none" : "auto",
        }}
      >
        {/* Backdrop */}
        <button
          type="button"
          className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 w-full h-full border-none cursor-default ${menuOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={closeMenu}
          aria-label="Đóng menu"
        />

        {/* Sidebar Container */}
        <div
          className={`absolute inset-y-0 left-0 w-[310px] sm:w-[350px] max-w-[85vw] bg-[#0b0b15] border-r border-white/10 shadow-[24px_0_60px_rgba(0,0,0,0.7)] transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col h-[100dvh] will-change-transform ${menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          style={{
            paddingLeft: "env(safe-area-inset-left, 0px)",
          }}
        >
          {/* Sidebar Header (Profile & Brand Section - Safe for iPhone Notch & Dynamic Island) */}
          <div
            className="p-5 sm:p-6 border-b border-white/5 bg-white/[0.02] flex-shrink-0"
            style={{
              paddingTop: "max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <Link to="/" onClick={handleNavigation} className="flex items-center active:scale-95 transition-transform">
                <img src="/icons/logo.webp" alt="Logo" className="h-[44px] sm:h-[50px] -my-2 w-auto object-contain drop-shadow" />
              </Link>
              <button
                type="button"
                onClick={closeMenu}
                className="size-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-white active:scale-95 active:bg-white/10 transition-all border border-white/5"
                aria-label="Đóng menu"
              >
                <X className="size-5" />
              </button>
            </div>

            {user ? (
              <div className="space-y-4">
                <Link
                  to="/profile"
                  onClick={handleNavigation}
                  className="flex items-center gap-3.5 group cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="size-13 sm:size-14 rounded-2xl border-2 border-emerald-500/20 bg-slate-800 p-0.5 shadow-xl group-hover:border-emerald-500/40 transition-all shrink-0">
                    <div className="h-full w-full rounded-[14px] overflow-hidden bg-slate-700">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-white font-semibold text-lg uppercase bg-gradient-to-br from-slate-700 to-slate-800">
                          {(user.email || "U").charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-semibold text-white truncate leading-tight group-hover:text-emerald-400 transition-colors">
                      {userProfile?.displayName || user.displayName || "Người dùng"}
                    </p>
                    {isAdmin ? (
                      <span className="text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold uppercase tracking-wider mt-1 border border-emerald-500/20">
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 truncate block mt-0.5">
                        {user.email || "Thành viên"}
                      </span>
                    )}
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    handleNavigation();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-xs sm:text-sm font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98]"
                >
                  <LogOut className="size-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={handleNavigation}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
              >
                <User className="size-4" />
                <span>Đăng nhập ngay</span>
              </Link>
            )}
          </div>

          {/* Sidebar Content (Scrollable Categories & Filters - Protected for iPhone Home Bar & Android Nav Bar) */}
          <div
            className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar p-5 space-y-7 touch-pan-y"
            style={{
              WebkitOverflowScrolling: "touch",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2.5rem)",
            }}
          >
            {/* Primary Navigation Section */}
            <div>
              <h3 className="px-2 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 select-none">
                Danh mục
              </h3>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={handleNavigation}
                  className="group flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-sm sm:text-base font-semibold text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] transition-all mb-2.5 shadow-sm"
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="size-5 text-emerald-400" />
                    Quản trị hệ thống
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                    Admin
                  </span>
                </Link>
              )}

              <div className="grid grid-cols-1 gap-2">
                {primaryNav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={handleNavigation}
                    className="group flex items-center gap-3.5 rounded-2xl bg-white/5 border border-white/5 p-3.5 text-sm sm:text-base font-semibold text-slate-100 hover:bg-white/10 hover:border-white/10 active:scale-[0.98] active:bg-white/10 transition-all"
                  >
                    <div className="size-1.5 rounded-full bg-emerald-500 opacity-60 group-hover:scale-150 group-hover:opacity-100 transition-all" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Filters Section */}
            <div className="space-y-4">
              <h3 className="px-2 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 select-none">
                Lọc & Phân loại
              </h3>
              <div className="space-y-3">
                <MobileDropdown
                  label="Thể Loại"
                  options={genreOptions}
                  onNavigate={handleNavigation}
                  isLoading={isLoadingMovieGenres}
                  onTrigger={triggerNavFetch}
                />
                <MobileDropdown
                  label="Quốc Gia"
                  options={countryOptions}
                  onNavigate={handleNavigation}
                  isLoading={isLoadingMovieCountries}
                  onTrigger={triggerNavFetch}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;

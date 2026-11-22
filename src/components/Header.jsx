import { useEffect, useRef, useState, useReducer, useMemo, lazy, Suspense } from "react";
import {
  ChevronDown,
  LogIn,
  User,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from '@/features/auth/context/AuthContext.jsx';
import { useMovieGenres, useMovieCountries } from '@/features/movies/hooks/useKKphimMovies.js';
import { isForbiddenGenre } from '@/utils/filter.js';
import SearchBar from '@/components/SearchBar.jsx';
const Notifications = lazy(() => import('@/components/Notifications.jsx'));

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

const initialHeaderState = {
  scrolled: false,
  isHidden: false,
};

function headerReducer(state, action) {
  switch (action.type) {
    case "SET_SCROLLED":
      return { ...state, scrolled: action.payload };
    case "SET_IS_HIDDEN":
      return { ...state, isHidden: action.payload };
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
  const { scrolled, isHidden } = headerState;
  const location = useLocation();
  const { user, userProfile } = useAuth();

  // Defer genre/country API calls until user interacts (hover, click) or idle prefetch
  const [navInteracted, setNavInteracted] = useState(false);
  const triggerNavFetch = () => {
    setNavInteracted(true);
  };

  // Prefetch when browser is idle so data is ready for users
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

  const shouldFetchMovieNav = navInteracted;
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

  const lastScrollY = useRef(0);
  const isHiddenRef = useRef(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = Math.max(0, window.scrollY);
      const diff = currentScrollY - lastScrollY.current;
      const nextScrolled = currentScrollY > 40;
      let nextIsHidden = isHiddenRef.current;

      if (currentScrollY <= 60) {
        nextIsHidden = false;
      } else if (diff > 8) {
        nextIsHidden = true;
      } else if (diff < -8) {
        nextIsHidden = false;
      }

      if (nextIsHidden !== isHiddenRef.current || nextScrolled !== scrolledRef.current) {
        isHiddenRef.current = nextIsHidden;
        scrolledRef.current = nextScrolled;
        dispatch({
          type: "SET_SCROLL_STATE",
          payload: { scrolled: nextScrolled, isHidden: nextIsHidden },
        });
      }

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
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-transform duration-300 ease-in-out border-b border-transparent bg-transparent backdrop-blur-none ${
        isHidden ? "-translate-y-full lg:translate-y-0" : "translate-y-0"
      } ${
        showTransparent
          ? "[text-shadow:0_1px_8px_rgba(0,0,0,0.6)]"
          : "lg:border-white/5 lg:bg-gradient-to-b lg:from-slate-950/90 lg:via-slate-950/75 lg:to-slate-950/50 lg:backdrop-blur-xl"
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {/* Desktop / tablet bar */}
      <div className="mx-auto w-full max-w-[1680px] px-4 py-3 hidden lg:flex items-center gap-2 xl:gap-4 md:px-6 lg:px-6 xl:px-6 2xl:px-8">
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
              <Suspense fallback={<div className="size-10" />}>
                <Notifications />
              </Suspense>
              <Link
                to="/profile"
                className="size-10 rounded-full border border-white/15 bg-white/10 overflow-hidden shadow-lg shadow-slate-900/40 hover:border-white/30 shrink-0 aspect-square"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="h-full w-full object-cover aspect-square"
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
    </header>
  );
};

export default Header;

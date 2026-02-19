import { useEffect, useState } from "react";
import { ChevronDown, LogIn, Menu, Search, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SearchBar from "./SearchBar.jsx";

const primaryNav = [
  { label: "Trang Chủ", to: "/" },
  { label: "Phim Bộ", to: "/category/phim-bo" },
  { label: "Hoạt Hình", to: "/category/hoat-hinh" },
  { label: "Phim Lẻ", to: "/category/phim-le" },
  { label: "Yêu Thích", to: "/favorites" },
];

const yearOptions = [
  { label: "2025", to: "/search?q=2025" },
  { label: "2024", to: "/search?q=2024" },
  { label: "2023", to: "/search?q=2023" },
  { label: "2022", to: "/search?q=2022" },
  { label: "Trước 2022", to: "/search?q=2010-2021" },
];

const genreOptions = [
  { label: "Hành Động", to: "/category/hanh-dong" },
  { label: "Tình Cảm", to: "/category/tinh-cam" },
  { label: "Hài Hước", to: "/category/hai-huoc" },
  { label: "Kinh Dị", to: "/category/kinh-di" },
  { label: "Tâm Lý", to: "/category/tam-ly" },
  { label: "Phiêu Lưu", to: "/category/phieu-luu" },
];

const countryOptions = [
  { label: "Việt Nam", to: "/country/viet-nam" },
  { label: "Hàn Quốc", to: "/country/han-quoc" },
  { label: "Nhật Bản", to: "/country/nhat-ban" },
  { label: "Trung Quốc", to: "/country/trung-quoc" },
  { label: "Âu Mỹ", to: "/country/au-my" },
  { label: "Thái Lan", to: "/country/thai-lan" },
];

const moreOptions = [
  { label: "Phim Mới", to: "/category/phim-moi" },
  { label: "TV Show", to: "/search?q=tv-show" },
  { label: "Phim Sắp Chiếu", to: "/search?q=sap-chieu" },
  { label: "Thuyết Minh", to: "/search?q=thuyet-minh" },
  { label: "Phim Yêu Thích", to: "/favorites" },
];

const Dropdown = ({ label, options }) => (
  <div className="relative group">
    <button className="flex items-center gap-1 px-3 py-2 text-base font-semibold text-white/90 hover:text-white">
      <span>{label}</span>
      <ChevronDown className="h-4 w-4" />
    </button>
    <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-48 -translate-x-1/2 opacity-0 transition duration-200 group-hover:opacity-100 group-hover:pointer-events-auto">
      <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl p-2 space-y-1">
        {options.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

const MobileDropdown = ({ label, options, onNavigate }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="col-span-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-inner shadow-black/20">
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
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-white/90">
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
  const location = useLocation();
  const { user } = useAuth();

  const avatarUrl = user
    ? user.photoURL ||
      (user.uid
        ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
        : null)
    : null;

  const closeAll = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = location.pathname === "/";
  const showTransparent = isHome && !scrolled;

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-all duration-300 relative ${
        showTransparent
          ? "border-transparent bg-transparent backdrop-blur-none"
          : "border-white/5 bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/50 backdrop-blur-xl"
      }`}
    >
      {/* Mobile top bar */}
      <div className="lg:hidden px-4 py-3 flex items-center justify-between">
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

        <Link
          to="/"
          onClick={closeAll}
          className="flex items-center gap-2 text-white"
        >
          <span className="rounded-lg bg-white/10 px-3 py-2 text-base font-bold tracking-tight shadow-lg shadow-black/40">
            KhoPhim
          </span>
        </Link>

        <button
          aria-label="Open search"
          onClick={() => {
            setSearchOpen((v) => !v);
            setMenuOpen(false);
          }}
          className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white"
        >
          {searchOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Desktop / tablet bar */}
      <div className="mx-auto w-full max-w-[1680px] px-4 py-3 hidden lg:flex items-center gap-3 md:gap-4 md:px-8 lg:px-10">
        <div className="flex-1 min-w-0">
          <SearchBar
            placeholder="Tìm kiếm phim, diễn viên"
            className="max-w-xl"
          />
        </div>

        <nav className="flex items-center gap-1 text-white">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 text-base font-semibold rounded-lg transition ${
                  isActive ? "bg-white/10 text-white" : "hover:bg-white/10"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Dropdown label="Năm" options={yearOptions} />
          <Dropdown label="Thể Loại" options={genreOptions} />
          <Dropdown label="Quốc Gia" options={countryOptions} />
          <Dropdown label="Thêm" options={moreOptions} />
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              to="/profile"
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
              placeholder="Tìm kiếm phim, diễn viên"
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Mobile mega menu */}
      {menuOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-full px-4 pb-4 z-40">
          <div className="rounded-3xl bg-gradient-to-b from-slate-800/95 to-slate-900/95 border border-white/10 shadow-2xl shadow-black/40 p-4 space-y-4">
            <Link
              to={user ? "/profile" : "/login"}
              onClick={closeAll}
              className="flex items-center justify-center gap-3 rounded-full bg-white/10 border border-white/10 py-3 text-white font-semibold text-base"
            >
              {user ? "Hồ sơ của bạn" : "Thành viên"}
            </Link>

            <div className="grid grid-cols-2 gap-3 text-white text-base font-semibold">
              {primaryNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeAll}
                  className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center shadow-inner shadow-black/20"
                >
                  {item.label}
                </Link>
              ))}
              <MobileDropdown
                label="Năm"
                options={yearOptions}
                onNavigate={closeAll}
              />
              <MobileDropdown
                label="Thể Loại"
                options={genreOptions}
                onNavigate={closeAll}
              />
              <MobileDropdown
                label="Quốc Gia"
                options={countryOptions}
                onNavigate={closeAll}
              />
              <MobileDropdown
                label="Thêm"
                options={moreOptions}
                onNavigate={closeAll}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

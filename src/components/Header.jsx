import { ChevronDown, LogIn } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SearchBar from "./SearchBar.jsx";

const primaryNav = [
  { label: "Trang Chủ", to: "/" },
  { label: "Phim Bộ", to: "/category/phim-bo" },
  { label: "Hoạt Hình", to: "/category/hoat-hinh" },
  { label: "Phim Lẻ", to: "/category/phim-le" },
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

const Header = () => {
  const { user } = useAuth();

  const avatarUrl = user
    ? user.photoURL ||
      (user.uid
        ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`
        : null)
    : null;

  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/30 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex-1">
          <SearchBar
            placeholder="Tìm kiếm phim, diễn viên"
            className="max-w-xl"
          />
        </div>

        <nav className="hidden md:flex items-center gap-1 text-white">
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

        <div className="hidden md:flex items-center gap-2">
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

      <div className="md:hidden px-4 pb-3 space-y-2">
        <SearchBar placeholder="Tìm kiếm phim, diễn viên" />
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
          {primaryNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full border border-white/10 px-3 py-1.5 bg-white/5"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <Link
              to="/profile"
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 overflow-hidden"
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
    </header>
  );
};

export default Header;

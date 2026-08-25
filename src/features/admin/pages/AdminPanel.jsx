import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  Users,
  MessageSquare,
  Film,
  ArrowLeft,
  Menu,
  X,
  BarChart3,
  Bell,
  Search,
  Command,
  ShieldCheck,
  Power
} from "lucide-react";
import AdminQuickSearchModal from "../components/AdminQuickSearchModal";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const AdminUsers = lazy(() => import("./AdminUsers"));
const AdminComments = lazy(() => import("./AdminComments"));
const AdminMovieStatus = lazy(() => import("./AdminMovieStatus"));
const AdminReports = lazy(() => import("./AdminReports"));
const AdminAnnouncements = lazy(() => import("./AdminAnnouncements"));

const NAV_ITEMS = [
  { id: "reports", label: "Báo cáo & Thống kê", icon: BarChart3 },
  { id: "announcements", label: "Thông báo", icon: Bell },
  { id: "users", label: "Người dùng", icon: Users },
  { id: "comments", label: "Bình luận", icon: MessageSquare },
  { id: "moviestatus", label: "Trạng thái phim", icon: Film },
];

const PAGE_MAP = {
  reports: AdminReports,
  announcements: AdminAnnouncements,
  users: AdminUsers,
  comments: AdminComments,
  moviestatus: AdminMovieStatus,
};

export default function AdminPanel() {
  const { user, userProfile, maintenance, loading } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("reports");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Keyboard listener for Ctrl+K or Cmd+K or Slash (/) to open quick search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="loader-orbit loader-orbit-md" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p className="text-xl font-semibold">
          Bạn không có quyền truy cập trang này.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const ActivePage = PAGE_MAP[section] || AdminReports;

  const handleNav = (id) => {
    setSection(id);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/70 lg:hidden cursor-default backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng sidebar"
        />
      )}

      {/* Sidebar Navigation - Fixed / Sticky Viewport */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 bg-slate-900/95 border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0`}
      >
        {/* Sidebar Header Logo */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-black">
                Admin Panel
              </p>
              <h1 className="text-base font-bold text-white leading-tight">Quản trị Hệ thống</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-white p-1 rounded-lg"
            aria-label="Đóng sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-inner"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`size-4 shrink-0 ${isActive ? "text-emerald-400" : "opacity-70"}`} />
                <span className="flex-1 text-left truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Back Button */}
        <div className="p-3 border-t border-white/5 bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
              Trang xem phim
            </span>
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          </button>
        </div>
      </aside>

      {/* Main Administrative Workplace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar for Desktop & Mobile */}
        <header className="shrink-0 sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Mở menu admin"
            >
              <Menu className="size-5" />
            </button>
            
            {/* Global Search Bar Trigger Input */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-slate-400 hover:text-white hover:border-white/20 transition-all text-xs sm:text-sm w-44 sm:w-72 lg:w-96"
            >
              <Search className="size-4 text-emerald-400 shrink-0" />
              <span className="truncate text-left flex-1">Tìm nhanh (User, Phim, Menu)...</span>
              <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-white/10 px-1.5 py-0.5 rounded-md border border-white/10">
                <Command className="size-2.5" /> K
              </span>
            </button>
          </div>

          {/* Right Header Controls (Maintenance Status & Profile Info) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Maintenance Mode Status Indicator */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              maintenance?.enabled 
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              <Power className="size-3.5" />
              <span>Bảo trì: {maintenance?.enabled ? "ĐANG BẬT" : "TẮT"}</span>
            </div>

            {/* Admin Avatar Badge */}
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-1.5 pr-3 rounded-2xl">
              <div className="size-7 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center overflow-hidden">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="" className="size-full object-cover" />
                ) : (
                  <span>A</span>
                )}
              </div>
              <div className="hidden md:block text-left text-xs">
                <p className="font-bold text-white truncate max-w-[120px]">{userProfile?.displayName || "Admin"}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <div className="loader-orbit loader-orbit-md" />
              </div>
            }
          >
            <ActivePage />
          </Suspense>
        </main>
      </div>

      {/* Instant Global Search Modal */}
      <AdminQuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigateSection={(secId) => handleNav(secId)}
      />
    </div>
  );
}

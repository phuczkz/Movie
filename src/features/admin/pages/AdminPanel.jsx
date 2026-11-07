import { useState, useEffect, useRef, lazy, Suspense } from "react";
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
  const { user, userProfile, maintenance, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("reports");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isNavigatingRef = useRef(false);

  // Close sidebar with history sync for Android back button
  const closeSidebar = () => {
    if (window.history.state?.adminSidebar) {
      window.history.back();
    } else {
      setSidebarOpen(false);
    }
  };

  // Android Back button listener
  useEffect(() => {
    const handlePopState = () => {
      if (isNavigatingRef.current) return;
      if (sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [sidebarOpen]);

  // Sync history state and lock body scroll when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      if (!window.history.state?.adminSidebar) {
        window.history.pushState({ adminSidebar: true }, "");
      }
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [sidebarOpen]);

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
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950">
        <div className="loader-orbit loader-orbit-md" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-950 text-white px-4 text-center">
        <p className="text-xl font-semibold">
          Bạn không có quyền truy cập trang này.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const ActivePage = PAGE_MAP[section] || AdminReports;

  const handleNav = (id) => {
    isNavigatingRef.current = true;
    if (window.history.state?.adminSidebar) {
      window.history.replaceState(null, "");
    }
    setSection(id);
    setSidebarOpen(false);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/75 lg:hidden cursor-default backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
          aria-label="Đóng sidebar"
        />
      )}

      {/* Sidebar Navigation - Fixed / Sticky Viewport */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] w-72 max-w-[85vw] z-40 bg-slate-900/98 border-r border-white/10 shadow-[24px_0_60px_rgba(0,0,0,0.8)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:sticky lg:top-0 lg:h-[100dvh] lg:w-64 lg:shrink-0 lg:shadow-none`}
        style={{
          paddingLeft: "env(safe-area-inset-left, 0px)",
        }}
      >
        {/* Sidebar Header Logo */}
        <div
          className="flex items-center justify-between p-5 border-b border-white/5 shrink-0"
          style={{
            paddingTop: "max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))",
          }}
        >
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
            onClick={closeSidebar}
            className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 active:scale-95 transition-all"
            aria-label="Đóng sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar overscroll-y-contain touch-pan-y">
          {NAV_ITEMS.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
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
        <div
          className="p-3 border-t border-white/5 bg-slate-950/40 shrink-0"
          style={{
            paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))",
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (window.history.state?.adminSidebar) {
                window.history.replaceState(null, "");
              }
              navigate("/");
            }}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 active:scale-[0.98] transition-all group"
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
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        {/* Top Header Bar for Desktop & Mobile */}
        <header
          className="shrink-0 sticky top-0 z-20 flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/5 bg-slate-900/80 backdrop-blur-md"
          style={{
            paddingTop: "max(0.6rem, env(safe-area-inset-top, 0px))",
            paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
            paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden size-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white active:scale-95 transition-all"
              aria-label="Mở menu admin"
            >
              <Menu className="size-5" />
            </button>
            
            {/* Global Search Bar Trigger Input */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 text-slate-400 hover:text-white hover:border-white/20 active:scale-[0.98] transition-all text-xs sm:text-sm flex-1 max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md"
            >
              <Search className="size-4 text-emerald-400 shrink-0" />
              <span className="truncate text-left flex-1">Tìm nhanh...</span>
              <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-white/10 px-1.5 py-0.5 rounded-md border border-white/10">
                <Command className="size-2.5" /> K
              </span>
            </button>
          </div>

          {/* Right Header Controls (Maintenance Status & Profile Info) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
            <div className="flex items-center gap-2 sm:gap-2.5 bg-white/5 border border-white/10 p-1 sm:p-1.5 sm:pr-3 rounded-2xl">
              <div className="size-8 sm:size-7 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center overflow-hidden shrink-0">
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
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar overscroll-y-contain"
          style={{
            paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))",
          }}
        >
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

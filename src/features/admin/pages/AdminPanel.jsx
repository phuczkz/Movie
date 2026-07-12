import { useState, lazy, Suspense } from "react";
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
} from "lucide-react";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const AdminUsers = lazy(() => import("./AdminUsers"));
const AdminComments = lazy(() => import("./AdminComments"));
// AdminMaintenance has been removed as it is no longer needed
const AdminMovieStatus = lazy(() => import("./AdminMovieStatus"));
const AdminReports = lazy(() => import("./AdminReports"));
const AdminAnnouncements = lazy(() => import("./AdminAnnouncements"));

const NAV_ITEMS = [
  { id: "reports", label: "Báo cáo", icon: BarChart3 },
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("reports");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden cursor-default"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 bg-slate-900/95 border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500 font-black mb-0.5">
              Admin
            </p>
            <h1 className="text-lg font-semibold text-white">Bảng điều khiển</h1>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-white p-1"
            aria-label="Đóng sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                section === item.id
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Back to site */}
        <div className="p-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="size-4" />
            Về trang xem phim
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate-900/90 backdrop-blur">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-2 -ml-1"
            aria-label="Mở menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold text-white">
            {NAV_ITEMS.find((n) => n.id === section)?.label}
          </span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="loader-orbit loader-orbit-sm" />
              </div>
            }
          >
            <ActivePage />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

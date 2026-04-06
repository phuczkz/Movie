import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  MessageSquare,
  Construction,
  Film,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const AdminUsers = lazy(() => import("./admin/AdminUsers"));
const AdminComments = lazy(() => import("./admin/AdminComments"));
const AdminMaintenance = lazy(() => import("./admin/AdminMaintenance"));
const AdminMovieStatus = lazy(() => import("./admin/AdminMovieStatus"));

const NAV_ITEMS = [
  { id: "users", label: "Người dùng", icon: Users },
  { id: "comments", label: "Bình luận", icon: MessageSquare },
  { id: "maintenance", label: "Bảo trì", icon: Construction },
  { id: "moviestatus", label: "Trạng thái phim", icon: Film },
];

const PAGE_MAP = {
  users: AdminUsers,
  comments: AdminComments,
  maintenance: AdminMaintenance,
  moviestatus: AdminMovieStatus,
};

export default function AdminPanel() {
  const { user, loading, maintenance } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("users");
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
          onClick={() => navigate("/")}
          className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const ActivePage = PAGE_MAP[section] || AdminUsers;

  const handleNav = (id) => {
    setSection(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 bg-slate-900/95 border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-500 font-black mb-0.5">
              Admin
            </p>
            <h1 className="text-lg font-black text-white">Bảng điều khiển</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-white p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                section === item.id
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "maintenance" && maintenance?.enabled && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        {/* Back to site */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang xem phim
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate-900/90 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-2 -ml-1"
          >
            <Menu className="h-5 w-5" />
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

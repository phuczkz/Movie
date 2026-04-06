import { Suspense, lazy, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const MaintenanceIllustration = lazy(() =>
  import("./MaintenanceIllustration.jsx")
);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function MaintenanceGuard({ children }) {
  const { user, logout, userProfile, maintenance } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = userProfile?.email === ADMIN_EMAIL;
  const isWhitelisted = userProfile?.isWhitelisted;
  const isLoginPath = location.pathname === "/login";

  const isActive =
    maintenance?.enabled && !isAdmin && !isWhitelisted && !isLoginPath;

  // Block DevTools shortcuts
  useEffect(() => {
    if (!isActive) return;

    const blockKeys = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    const blockCtxMenu = (e) => e.preventDefault();

    window.addEventListener("keydown", blockKeys, true);
    window.addEventListener("contextmenu", blockCtxMenu, true);
    return () => {
      window.removeEventListener("keydown", blockKeys, true);
      window.removeEventListener("contextmenu", blockCtxMenu, true);
    };
  }, [isActive]);

  return (
    <>
      {children}
      {isActive && (
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 flex flex-col items-center justify-center bg-white select-none text-slate-800"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Main Content Container */}
          {/* Main Content Container */}
          <div className="flex-1 w-full flex flex-col items-center justify-center overflow-y-auto custom-scrollbar py-12">
            <div className="max-w-4xl w-full px-6 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
              {/* Illustration */}
              <Suspense fallback={<div className="h-40 w-full" />}>
                <MaintenanceIllustration />
              </Suspense>

              {/* Typography */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black text-[#1e4e8c] tracking-tight uppercase">
                  {maintenance?.title || "BẢO TRÌ HỆ THỐNG"}
                </h1>
                <p className="text-xl md:text-2xl text-slate-500 font-medium whitespace-pre-wrap">
                  {maintenance?.message ||
                    "Admin đang nghèo, ủng hộ Admin để duy trì website"}
                </p>
              </div>

              {/* Sub-notice / Status indicator */}
              <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-blue-50 border border-blue-100/50">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                  {maintenance?.statusText || "ĐANG NÂNG CẤP HỆ THỐNG"}
                </span>
              </div>

              {/* Logout Option for trapped users */}
              {user && (
                <div className="pt-4">
                  <button
                    onClick={() => logout().then(() => navigate("/login"))}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl hover:shadow-slate-200 active:scale-95 text-sm font-bold"
                  >
                    <LogOut size={18} />
                    Đăng xuất tài khoản
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Copyright/Footer */}
          <div className="w-full py-8 text-center text-slate-400 text-xs font-medium tracking-widest uppercase mt-auto bg-slate-50/50 border-t border-slate-100">
            © 2026 Movie Streaming — All Rights Reserved
          </div>
        </div>
      )}
    </>
  );
}

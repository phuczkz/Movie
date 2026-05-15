import { Suspense, lazy, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAppMode } from "../context/AppModeContext";
import SelectionScreen from "./SelectionScreen.jsx";
import MaintenanceNew from "./MaintenanceNew.jsx";

const MaintenanceIllustration = lazy(() =>
  import("./MaintenanceIllustration.jsx")
);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function MaintenanceGuard({ children }) {
  const { userProfile, maintenance, loading } = useAuth();
  const { appMode } = useAppMode();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  const isAdmin = userProfile?.email === ADMIN_EMAIL;
  const isWhitelisted = userProfile?.isWhitelisted;
  const isLoginPath = location.pathname === "/login";

  const isActive =
    maintenance?.enabled &&
    !isAdmin &&
    !isWhitelisted &&
    !isLoginPath;

  useEffect(() => {
    // Only auto-redirect on direct entry/refresh. Do not override explicit in-app navigation.
    if (navigationType !== "POP") return;
    if (appMode === "comic" && location.pathname === "/") {
      navigate("/comics", { replace: true });
    }
  }, [appMode, location.pathname, navigate, navigationType]);

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

  if (loading || !maintenance.isLoaded) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[99999]">
        <div className="relative flex flex-col items-center gap-5">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (isActive) {
    /* 
    // Old Maintenance UI (Kept as requested)
    return (
      <div
        style={{ zIndex: 99999 }}
        className="fixed inset-0 grid grid-rows-[1fr_auto] bg-white select-none text-slate-800 overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
          <div className="w-full flex items-center justify-center px-6 py-6">
            <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <Suspense fallback={<div className="h-40 w-full" />}>
                <MaintenanceIllustration />
              </Suspense>
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black text-[#1e4e8c] tracking-tight uppercase">
                  {maintenance?.title || "BẢO TRÌ HỆ THỐNG"}
                </h1>
                <p className="text-xl md:text-2xl text-slate-500 font-medium whitespace-pre-wrap">
                  {maintenance?.message ||
                    "Admin đang nghèo, ủng hộ Admin để duy trì website"}
                </p>
              </div>
              <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-blue-50 border border-blue-100/50">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                  {maintenance?.statusText || "ĐANG NÂNG CẤP HỆ THỐNG"}
                </span>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
                {user && (
                  <button
                    onClick={() => logout().then(() => navigate("/login"))}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-all shadow-md active:scale-95 text-sm font-bold"
                  >
                    <LogOut size={18} />
                    Đăng xuất tài khoản
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
    );
    */
    return <MaintenanceNew />;
  }

  if (!appMode && !isLoginPath) {
    return <SelectionScreen />;
  }

  return <>{children}</>;
}

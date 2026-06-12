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

  const { pathname } = location;

  useEffect(() => {
    // Only auto-redirect on direct entry/refresh. Do not override explicit in-app navigation.
    if (navigationType !== "POP") return;
    if (appMode === "comic" && pathname === "/") {
      navigate("/comics", { replace: true });
    }
  }, [appMode, navigate, navigationType, pathname]);

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

  // Modified to load the App in parallel during Firebase initialization to improve UX/speed and to use the unified orbital loader design.
  const showInitialLoading = loading || !maintenance.isLoaded;

  return (
    <>
      {showInitialLoading && (
        <div className="fixed inset-0 bg-[#0b0b15] flex flex-col items-center justify-center z-[99999] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,176,155,0.05),transparent_50%)]" />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="loader-orbit loader-orbit-lg"></div>
            <div className="animate-pulse flex flex-col items-center">
              <span className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase"></span>
            </div>
          </div>
        </div>
      )}

      {!showInitialLoading && isActive && <MaintenanceNew />}

      {!showInitialLoading && !isActive && !appMode && !isLoginPath && (
        <SelectionScreen />
      )}

      {/* Render children during loading (to preload lazy bundles in parallel) or when active normally */}
      {(!isActive || showInitialLoading) && (appMode || isLoginPath || showInitialLoading) && (
        <div style={{ display: showInitialLoading ? "none" : "contents" }}>
          {children}
        </div>
      )}
    </>
  );
}

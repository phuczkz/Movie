import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Construction, LogOut, Settings, Bell, Wrench, AlertTriangle } from "lucide-react";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const AnimatedIllustration = () => (
  <div className="relative w-full max-w-lg aspect-[4/3] flex items-center justify-center">
    {/* Background Decorative Elements */}
    <div className="absolute inset-0 pointer-events-none">
      <Settings 
        className="absolute top-10 left-10 text-blue-100 h-16 w-16 animate-[spin_8s_linear_infinite]" 
        style={{ willChange: "transform" }}
      />
      <Settings 
        className="absolute bottom-10 right-10 text-blue-100 h-12 w-12 animate-[spin_12s_linear_infinite_reverse]" 
        style={{ willChange: "transform" }}
      />
      <Bell 
        className="absolute top-20 right-20 text-blue-50 h-8 w-8 animate-bounce delay-700" 
        style={{ willChange: "transform" }}
      />
      <Wrench 
        className="absolute bottom-20 left-20 text-blue-50 h-10 w-10 animate-pulse" 
        style={{ willChange: "opacity" }}
      />
    </div>

    {/* Laptop Base */}
    <div className="relative w-4/5 h-3/4 flex flex-col items-center">
      {/* Screen */}
      <div className="w-full h-full bg-[#f8fafc] border-x-8 border-t-8 border-[#e2e8f0] rounded-t-3xl overflow-hidden shadow-inner flex flex-col items-center justify-center p-8 relative">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        </div>
        
        {/* Mirror effect / Screen Glow */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/20 to-transparent skew-x-[-20deg] pointer-events-none" />

        {/* Construction Barrier on Screen */}
        <div className="relative z-10 w-full flex flex-col items-center space-y-3 drop-shadow-md">
          {/* Barrier Lights */}
          <div className="flex gap-20 -mb-2">
            <div className="h-4 w-4 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" style={{ willChange: "opacity, filter" }} />
            <div className="h-4 w-4 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse delay-300" style={{ willChange: "opacity, filter" }} />
          </div>

          {/* Barrier Top Plank */}
          <div className="w-4/5 h-8 bg-[#fbbf24] rounded-sm overflow-hidden border-2 border-[#1e293b] flex shadow-lg">
            <div className="w-full h-full bg-[repeating-linear-gradient(-45deg,#1e293b_0,#1e293b_15px,transparent_15px,transparent_30px)]" />
          </div>

          {/* Barrier Bottom Plank */}
          <div className="w-4/5 h-8 bg-[#fbbf24] rounded-sm overflow-hidden border-2 border-[#1e293b] flex shadow-lg">
            <div className="w-full h-full bg-[repeating-linear-gradient(-45deg,#1e293b_0,#1e293b_15px,transparent_15px,transparent_30px)]" />
          </div>
          
          {/* Barrier Stand */}
          <div className="absolute -bottom-16 w-full flex justify-around">
            <div className="w-2 h-16 bg-slate-400 rounded-b-lg border-2 border-[#1e293b]" />
            <div className="w-2 h-16 bg-slate-400 rounded-b-lg border-2 border-[#1e293b]" />
          </div>

          <AlertTriangle 
            className="h-12 w-12 text-[#fbbf24] mt-4 filter drop-shadow-md animate-bounce" 
            style={{ willChange: "transform" }}
          />
        </div>
      </div>

      {/* Keyboard Base */}
      <div className="w-[110%] h-6 bg-[#cbd5e1] border-b-4 border-[#94a3b8] rounded-b-xl shadow-2xl relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-2 bg-slate-400/30 rounded-full" />
      </div>
    </div>
  </div>
);

export default function MaintenanceGuard({ children }) {
  const { user, logout, userProfile, maintenance } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // We can use maintenanceMode from useAuth instead of local state to be consistent
  // But let's keep local setMaintenance for now or use the one from AuthContext.
  // Actually, using the one from AuthContext is better to avoid duplicate listeners.

  // Logic: Active if maintenance is enabled 
  // AND user is NOT admin 
  // AND user is NOT whitelisted
  // AND NOT on login path
  const isAdmin = userProfile?.email === ADMIN_EMAIL;
  const isWhitelisted = userProfile?.isWhitelisted;
  const isLoginPath = location.pathname === "/login";
  
  const isActive = maintenance?.enabled && !isAdmin && !isWhitelisted && !isLoginPath;

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
          <div className="max-w-4xl w-full px-6 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
            
            {/* Illustration */}
            <AnimatedIllustration />

            {/* Typography */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black text-[#1e4e8c] tracking-tight uppercase">
                BẢO TRÌ HỆ THỐNG
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 font-medium">
                {maintenance?.message || "We will be back soon"}
              </p>
            </div>

            {/* Sub-notice / Status indicator */}
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-blue-50 border border-blue-100/50">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                Đang nâng cấp hệ thống
              </span>
            </div>

            {/* Logout Option for trapped users */}
            {user && (
              <div className="pt-8">
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

          {/* Copyright/Footer */}
          <div className="absolute bottom-8 text-slate-400 text-xs font-medium tracking-widest uppercase">
            © 2026 Movie Streaming — All Rights Reserved
          </div>
        </div>
      )}
    </>
  );
}

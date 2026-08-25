import { useEffect, useState, useMemo, useRef } from "react";
import { 
  Search, 
  X, 
  Users, 
  MessageSquare, 
  Film, 
  BarChart3, 
  Bell, 
  ArrowRight,
  ShieldCheck,
  UserCircle,
  Command
} from "lucide-react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from '@/firebase.config.js';
import { useSearchMovies } from '@/features/movies/hooks/useSearchMovies';

const NAV_ITEMS = [
  { id: "reports", label: "Báo cáo & Thống kê", icon: BarChart3, category: "Menu Nav" },
  { id: "announcements", label: "Quản lý Thông báo", icon: Bell, category: "Menu Nav" },
  { id: "users", label: "Quản lý Người dùng", icon: Users, category: "Menu Nav" },
  { id: "comments", label: "Quản lý Bình luận", icon: MessageSquare, category: "Menu Nav" },
  { id: "moviestatus", label: "Trạng thái Phim", icon: Film, category: "Menu Nav" },
];

export default function AdminQuickSearchModal({ isOpen, onClose, onNavigateSection, onSelectUser, onSelectMovie }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Search Movies Hook
  const { data: movieResults = [], isFetching: isSearchingMovies } = useSearchMovies(searchTerm);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Fetch matched users when typing search term
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setUsersList([]);
      return;
    }

    let isMounted = true;
    setLoadingUsers(true);

    const searchUsers = async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), limit(20)));
        if (!isMounted) return;

        const term = searchTerm.toLowerCase();
        const matched = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (u) =>
              (u.displayName || "").toLowerCase().includes(term) ||
              (u.email || "").toLowerCase().includes(term) ||
              (u.id || "").toLowerCase().includes(term)
          )
          .slice(0, 5);

        setUsersList(matched);
      } catch (err) {
        console.error("Admin search users error:", err);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Filtered Navigation items
  const matchedNavItems = useMemo(() => {
    if (!searchTerm.trim()) return NAV_ITEMS;
    const term = searchTerm.toLowerCase();
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(term));
  }, [searchTerm]);

  // Combine all search results into flat list for keyboard navigation
  const allResults = useMemo(() => {
    const list = [];
    matchedNavItems.forEach((nav) => list.push({ type: "nav", data: nav }));
    usersList.forEach((user) => list.push({ type: "user", data: user }));
    movieResults.slice(0, 5).forEach((movie) => list.push({ type: "movie", data: movie }));
    return list;
  }, [matchedNavItems, usersList, movieResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults.length]);

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === "Enter" && allResults[selectedIndex]) {
      e.preventDefault();
      executeSelection(allResults[selectedIndex]);
    }
  };

  const executeSelection = (item) => {
    if (item.type === "nav") {
      onNavigateSection(item.data.id);
    } else if (item.type === "user") {
      onNavigateSection("users");
      if (onSelectUser) onSelectUser(item.data.id);
    } else if (item.type === "movie") {
      onNavigateSection("comments");
      if (onSelectMovie) onSelectMovie(item.data.slug, item.data.name);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop overlay */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Content */}
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 z-10"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <Search className="size-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm nhanh User, Phim, Bình luận hoặc Menu..."
            className="flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
            aria-label="Admin global search"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          ) : (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
              <Command className="size-3" /> ESC
            </span>
          )}
        </div>

        {/* Search Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar min-h-0">
          {/* Quick Nav Category */}
          {matchedNavItems.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Menu Quản lý
              </p>
              {matchedNavItems.map((nav) => {
                const globalIdx = allResults.findIndex((r) => r.type === "nav" && r.data.id === nav.id);
                const isSelected = globalIdx === selectedIndex;
                const IconComponent = nav.icon;

                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => executeSelection({ type: "nav", data: nav })}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "hover:bg-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? "bg-emerald-500/20" : "bg-white/5"}`}>
                        <IconComponent className="size-4" />
                      </div>
                      <span className="font-semibold text-sm">{nav.label}</span>
                    </div>
                    <ArrowRight className={`size-4 transition-transform ${isSelected ? "translate-x-1" : "opacity-0"}`} />
                  </button>
                );
              })}
            </div>
          )}

          {/* User Results */}
          {(usersList.length > 0 || loadingUsers) && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Người dùng matched ({usersList.length})</span>
                {loadingUsers && <span className="loader-orbit loader-orbit-xs" />}
              </p>
              {usersList.map((u) => {
                const globalIdx = allResults.findIndex((r) => r.type === "user" && r.data.id === u.id);
                const isSelected = globalIdx === selectedIndex;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => executeSelection({ type: "user", data: u })}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "hover:bg-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="size-full object-cover" />
                        ) : (
                          <UserCircle className="size-5 text-slate-400" />
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                          {u.displayName || "Ẩn danh"}
                          {u.isWhitelisted && (
                            <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                          )}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{u.email || u.id}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-white/5 text-slate-400">
                      User
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Movie Results */}
          {(movieResults.length > 0 || isSearchingMovies) && searchTerm.length >= 2 && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Phim liên quan ({movieResults.length})</span>
                {isSearchingMovies && <span className="loader-orbit loader-orbit-xs" />}
              </p>
              {movieResults.slice(0, 5).map((m) => {
                const globalIdx = allResults.findIndex((r) => r.type === "movie" && r.data.slug === m.slug);
                const isSelected = globalIdx === selectedIndex;

                return (
                  <button
                    key={m.slug}
                    type="button"
                    onClick={() => executeSelection({ type: "movie", data: m })}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "hover:bg-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={m.thumb_url} alt="" className="w-8 h-11 object-cover rounded-lg shrink-0 border border-white/10" />
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-sm truncate">{m.name}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">{m.origin_name || m.slug}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Phim
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {allResults.length === 0 && !loadingUsers && !isSearchingMovies && (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm font-semibold">Không tìm thấy kết quả nào cho "{searchTerm}"</p>
              <p className="text-xs mt-1 text-slate-600">Thử tìm theo tên User, email, hoặc tên phim.</p>
            </div>
          )}
        </div>

        {/* Modal Footer Tips */}
        <div className="p-3 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 px-5">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-400">↑↓</strong> Di chuyển</span>
            <span><strong className="text-slate-400">Enter</strong> Chọn</span>
            <span><strong className="text-slate-400">ESC</strong> Đóng</span>
          </div>
          <span className="text-emerald-500/80 font-bold uppercase tracking-wider">Quick Search Admin</span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Home,
  LayoutGrid,
  Bell,
  User,
  Search,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext.jsx";
import { useNotificationsList } from "@/features/notifications/hooks/useNotificationsList.js";
import ExploreSheet from "@/components/navigation/ExploreSheet.jsx";
import NotificationSheet from "@/components/navigation/NotificationSheet.jsx";
import SearchModal from "@/components/navigation/SearchModal.jsx";

// Preload route chunks để chuyển trang tức thì không bị giật/lag
const preloadRoute = (to) => {
  if (to === "/favorites") {
    import("@/features/movies/pages/Saved.jsx");
  } else if (to === "/profile") {
    import("@/features/auth/pages/Profile.jsx");
  } else if (to === "/") {
    import("@/features/movies/pages/Home.jsx");
  }
};

// Danh sách tabs của Cụm 1 (Trang chủ - Mở rộng - Thông báo - Cá nhân)
const TABS = [
  {
    id: "home",
    label: "Trang chủ",
    to: "/",
    IconOutline: (props) => <Home {...props} />,
    IconFill: (props) => (
      <Home {...props} style={{ fill: "currentColor", stroke: "none" }} />
    ),
  },
  {
    id: "more",
    label: "Mở rộng",
    to: null,
    IconOutline: (props) => <LayoutGrid {...props} />,
    IconFill: (props) => (
      <LayoutGrid {...props} style={{ fill: "currentColor", stroke: "none" }} />
    ),
  },
  {
    id: "notifications",
    label: "Thông báo",
    to: null,
    IconOutline: (props) => <Bell {...props} />,
    IconFill: (props) => (
      <Bell {...props} style={{ fill: "currentColor", stroke: "none" }} />
    ),
  },
  {
    id: "profile",
    label: "Cá nhân",
    to: null,
    IconOutline: (props) => <User {...props} />,
    IconFill: (props) => (
      <User {...props} style={{ fill: "currentColor", stroke: "none" }} />
    ),
  },
];

// Các route ẩn Tab Bar
const HIDDEN_ROUTES = ["/watch/", "/admin"];

const FloatingTabBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotificationsList();

  const [expandedOpen, setExpandedOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Preload các trang khi component mount để chuyển trang không có độ trễ
  useEffect(() => {
    const idleId =
      typeof window !== "undefined" && window.requestIdleCallback
        ? window.requestIdleCallback(() => {
            preloadRoute("/favorites");
            preloadRoute("/profile");
          })
        : setTimeout(() => {
            preloadRoute("/favorites");
            preloadRoute("/profile");
          }, 800);

    return () => {
      if (typeof window !== "undefined" && window.cancelIdleCallback && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
    };
  }, []);

  // ── Smart Scroll hide/show ──
  const [isBarVisible, setIsBarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY);
        const diff = currentY - lastScrollY.current;

        if (currentY <= 60) {
          setIsBarVisible(true);
        } else if (diff > 10) {
          setIsBarVisible(false);
        } else if (diff < -10) {
          setIsBarVisible(true);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Luôn hiện khi mở Expanded, Notifications hoặc Search
  const isBarShown = isBarVisible || expandedOpen || notificationsOpen || searchOpen;

  // Ẩn hoàn toàn ở trang Watch & Admin
  const shouldHide = HIDDEN_ROUTES.some((r) =>
    location.pathname.startsWith(r)
  );
  if (shouldHide) return null;

  const pathname = location.pathname;

  // Xác định DUY NHẤT một tab active (loại bỏ hoàn toàn lỗi 2 tab cùng sáng gây chữ mờ)
  const activeTabId = (() => {
    if (expandedOpen) return "more";
    if (notificationsOpen) return "notifications";
    if (pathname === "/") return "home";
    if (pathname === "/profile" || pathname === "/login" || pathname === "/register") return "profile";
    if (pathname === "/favorites" || pathname.startsWith("/category/") || pathname.startsWith("/country/")) return "more";
    return null;
  })();

  const handleTabClick = (tab) => {
    if (tab.id === "more") {
      setNotificationsOpen(false);
      setSearchOpen(false);
      setExpandedOpen((prev) => !prev);
      return;
    }
    if (tab.id === "notifications") {
      setExpandedOpen(false);
      setSearchOpen(false);
      setNotificationsOpen((prev) => !prev);
      return;
    }
    setExpandedOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
  };

  const handleSearchClick = () => {
    setExpandedOpen(false);
    setNotificationsOpen(false);
    setSearchOpen((prev) => !prev);
  };

  return (
    <>
      {/* PopUp Mở rộng (Yêu thích, Thể loại, Quốc gia) */}
      <ExploreSheet
        open={expandedOpen}
        onClose={() => setExpandedOpen(false)}
      />

      {/* PopUp Thông báo (chuyển từ PopDown trên header thành PopUp bám đáy) */}
      <NotificationSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* PopUp Tìm kiếm */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* ── Fixed Wrapper ở đáy màn hình (z-[98] để nổi lên trên Bottom Sheet ở z-[95]) ── */}
      {/* Dùng inset-x-0 bottom-0 thay vì left/right riêng để không bị ảnh hưởng khi body position:fixed */}
      <div
        className={`
          lg:hidden fixed inset-x-0 bottom-0 z-[98]
          flex items-end justify-center gap-2.5
          transition-transform duration-300 ease-out pointer-events-none
          ${isBarShown ? "translate-y-0" : "translate-y-[120%]"}
        `}
        style={{
          paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
          paddingLeft: "max(12px, env(safe-area-inset-left, 12px))",
          paddingRight: "max(12px, env(safe-area-inset-right, 12px))",
          /* Ghim thẳng vào viewport thực, tránh bị body-fixed làm lệch */
          willChange: "transform",
        }}
      >
        {/* ─── Cụm 1: Capsule ─── */}
        <div
          className="
            pointer-events-auto
            flex items-center gap-1 p-1.5
            rounded-full
            bg-[#12121f]/92 backdrop-blur-2xl
            border border-white/10
            shadow-[0_12px_40px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4)]
          "
        >
          {TABS.map((tab) => {
            const active = tab.id === activeTabId;
            const profileTo = user ? "/profile" : "/login";
            const to = tab.id === "profile" ? profileTo : tab.to;

            const buttonInner = (
              <Motion.div
                layout
                transition={{
                  layout: { type: "spring", stiffness: 480, damping: 34 },
                }}
                className={`
                  relative flex items-center justify-center
                  rounded-full select-none
                  transition-colors duration-200
                  ${active
                    ? "px-3.5 py-2.5 text-white font-bold"
                    : "px-2.5 py-2.5 text-white/60 hover:text-white"
                  }
                `}
              >
                {/* Active Sliding Pill: di chuyển trơn tru giữa các tab */}
                {active && (
                  <Motion.div
                    layoutId="floating-tab-active-pill"
                    className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-md border border-white/35 shadow-[0_2px_16px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.3)]"
                    transition={{
                      type: "spring",
                      stiffness: 480,
                      damping: 34,
                      mass: 0.6,
                    }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-1.5">
                  <span className="relative inline-flex items-center justify-center">
                    {active ? (
                      <tab.IconFill className="size-5 flex-shrink-0" />
                    ) : (
                      <tab.IconOutline className="size-5 flex-shrink-0 stroke-[1.5]" />
                    )}

                    {/* Dấu chấm thông báo chưa đọc khi có thông báo mới */}
                    {tab.id === "notifications" && unreadCount > 0 && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 size-2 rounded-full ${
                          active
                            ? "bg-white/80 ring-1 ring-white/50"
                            : "bg-emerald-400 ring-2 ring-[#12121f] shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                        }`}
                      />
                    )}
                  </span>

                  {/* Nhãn chữ trượt nở mượt mà không delay */}
                  <AnimatePresence initial={false}>
                    {active && (
                      <Motion.span
                        key={`label-${tab.id}`}
                        initial={{ opacity: 0, width: 0, x: -3 }}
                        animate={{ opacity: 1, width: "auto", x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -3 }}
                        transition={{
                          width: { type: "spring", stiffness: 480, damping: 34 },
                          opacity: { duration: 0.15 },
                        }}
                        className="text-[13px] font-bold whitespace-nowrap overflow-hidden leading-none select-none pl-1"
                      >
                        {tab.label}
                      </Motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </Motion.div>
            );

            if (!to) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  aria-label={tab.label}
                  className="focus:outline-none"
                >
                  {buttonInner}
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                to={to}
                onClick={() => handleTabClick(tab)}
                onPointerEnter={() => preloadRoute(to)}
                onTouchStart={() => preloadRoute(to)}
                aria-label={tab.label}
                className="focus:outline-none"
              >
                {buttonInner}
              </Link>
            );
          })}
        </div>

        {/* ─── Cụm 2: Nút tròn Search ─── */}
        <button
          type="button"
          aria-label="Tìm kiếm"
          onClick={handleSearchClick}
          className={`
            pointer-events-auto
            w-12 h-12 flex-shrink-0
            flex items-center justify-center
            rounded-full
            bg-[#12121f]/92 backdrop-blur-2xl
            border transition-all duration-200
            shadow-[0_12px_40px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4)]
            focus:outline-none active:scale-90
            ${searchOpen
              ? "border-white/30 text-white bg-white/10 backdrop-blur-md shadow-[0_2px_16px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]"
              : "border-white/10 text-white/70 hover:border-white/25 hover:text-white"
            }
          `}
        >
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <Motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Motion.span>
            ) : (
              <Motion.span
                key="search"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Search className="size-5 stroke-[1.75]" />
              </Motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
};

export default FloatingTabBar;

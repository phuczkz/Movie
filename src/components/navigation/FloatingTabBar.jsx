import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, m as Motion } from "framer-motion";
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

// Các route ẩn Tab Bar (đã mở lại cho trang /watch/)
const HIDDEN_ROUTES = ["/admin"];

const CAPSULE_SPRING = {
  type: "spring",
  stiffness: 460,
  damping: 36,
  mass: 0.7,
};

// Hiển thị nhãn chữ mượt mà; tự kích hoạt GPU marquee nếu chữ vượt khung trên màn hình hẹp
const TabLabel = memo(({ label }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;
      const diff = Math.ceil(text.scrollWidth - container.clientWidth);
      setOverflowPx(diff > 1 ? diff + 4 : 0);
    };

    measure();
    let ro;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(containerRef.current);
    }
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [label]);

  const isOverflowing = overflowPx > 0;

  return (
    <Motion.span
      ref={containerRef}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={`relative inline-flex items-center overflow-hidden max-w-[72px] min-[360px]:max-w-[82px] min-[390px]:max-w-[104px] sm:max-w-[140px] pl-0.5 select-none ${
        isOverflowing ? "tab-label-mask" : ""
      }`}
    >
      <span
        ref={textRef}
        style={
          isOverflowing
            ? { "--tab-marquee-offset": `-${overflowPx}px` }
            : undefined
        }
        className={`inline-block whitespace-nowrap text-[12px] min-[360px]:text-[13px] font-bold leading-none will-change-transform ${
          isOverflowing ? "tab-marquee-active" : ""
        }`}
      >
        {label}
      </span>
    </Motion.span>
  );
});

TabLabel.displayName = "TabLabel";

const FloatingTabBar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const notificationsData = useNotificationsList();
  const { unreadCount } = notificationsData;

  const [expandedOpen, setExpandedOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined"
      ? Boolean(document.fullscreenElement || document.webkitFullscreenElement)
      : false
  );

  // ── Smart Scroll hide/show ──
  const [isBarVisible, setIsBarVisible] = useState(true);
  const isBarVisibleRef = useRef(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Reset trạng thái hiển thị & đóng popup khi chuyển trang (đồng bộ trong lúc render)
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setExpandedOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
    setIsBarVisible(true);
  }

  useEffect(() => {
    isBarVisibleRef.current = true;
    lastScrollY.current = typeof window !== "undefined" ? Math.max(0, window.scrollY) : 0;
  }, [location.pathname]);

  // Preload các trang khi component mount để chuyển trang không có độ trễ
  useEffect(() => {
    const idleId =
      typeof window !== "undefined" && window.requestIdleCallback
        ? window.requestIdleCallback(() => {
            preloadRoute("/");
            preloadRoute("/favorites");
            preloadRoute("/profile");
          })
        : setTimeout(() => {
            preloadRoute("/");
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

  // Tự động ẩn Tab Bar khi bật Fullscreen trên Player (trang Watch)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement || document.webkitFullscreenElement)
      );
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY);
        const diff = currentY - lastScrollY.current;
        let nextVisible = isBarVisibleRef.current;

        if (currentY <= 60) {
          nextVisible = true;
        } else if (diff > 10) {
          nextVisible = false;
        } else if (diff < -10) {
          nextVisible = true;
        }

        if (nextVisible !== isBarVisibleRef.current) {
          isBarVisibleRef.current = nextVisible;
          setIsBarVisible(nextVisible);
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

  // Ẩn hoàn toàn ở Admin hoặc khi đang xem video Fullscreen
  const shouldHide =
    isFullscreen ||
    HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r));
  if (shouldHide) return null;

  const pathname = location.pathname;

  // Xác định DUY NHẤT một tab active; trang Watch (/watch/:slug) giữ null (4 icon gọn)
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

      {/* PopUp Thông báo (dùng chung dữ liệu từ FloatingTabBar để tránh duplicate listener) */}
      <NotificationSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notificationsData={notificationsData}
      />

      {/* PopUp Tìm kiếm */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* ── Fixed Wrapper ở đáy màn hình (z-[98] để nổi lên trên Bottom Sheet ở z-[95]) ── */}
      <div
        className={`
          lg:hidden fixed inset-x-0 bottom-0 z-[98]
          max-w-full overflow-hidden
          flex items-end justify-center gap-1.5 min-[360px]:gap-2.5
          transition-transform duration-300 ease-out pointer-events-none
          ${isBarShown ? "translate-y-0" : "translate-y-[120%]"}
        `}
        style={{
          paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
          paddingLeft: "max(8px, env(safe-area-inset-left, 8px))",
          paddingRight: "max(8px, env(safe-area-inset-right, 8px))",
          willChange: "transform",
        }}
      >
        {/* ─── Cụm 1: Capsule ─── */}
        <Motion.div
          layout
          style={{ borderRadius: 9999 }}
          transition={{ layout: CAPSULE_SPRING }}
          className="
            pointer-events-auto
            min-w-0 max-w-[calc(100vw-66px)] min-[360px]:max-w-[calc(100vw-76px)] sm:max-w-[calc(100vw-88px)]
            flex items-center gap-0.5 min-[360px]:gap-1 p-1 min-[360px]:p-1.5
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
                style={{ borderRadius: 9999 }}
                transition={{ layout: CAPSULE_SPRING }}
                className={`
                  relative flex items-center justify-center
                  overflow-hidden select-none
                  transition-colors duration-200
                  ${active
                    ? "px-2.5 py-2 min-[360px]:px-3.5 min-[360px]:py-2.5 text-white font-bold"
                    : "px-2 py-2 min-[360px]:px-2.5 min-[360px]:py-2.5 text-white/60 hover:text-white"
                  }
                `}
              >
                {/* Active Sliding Pill: thuần GPU, không lồng backdrop-blur để tránh tụt FPS */}
                {active && (
                  <Motion.div
                    layoutId="floating-tab-active-pill"
                    style={{ borderRadius: 9999 }}
                    className="pointer-events-none absolute inset-0 bg-white/[0.18] border border-white/30 shadow-[0_2px_16px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.28)]"
                    transition={CAPSULE_SPRING}
                  />
                )}

                <Motion.span
                  layout="position"
                  className="relative z-10 flex items-center gap-1 min-[360px]:gap-1.5 min-w-0"
                >
                  <span className="relative inline-flex items-center justify-center flex-shrink-0">
                    {active ? (
                      <tab.IconFill className="size-[18px] min-[360px]:size-5 flex-shrink-0" />
                    ) : (
                      <tab.IconOutline className="size-[18px] min-[360px]:size-5 flex-shrink-0 stroke-[1.5]" />
                    )}

                    {/* Dấu chấm đỏ báo hiệu thông báo chưa đọc */}
                    {tab.id === "notifications" && unreadCount > 0 && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 size-2 rounded-full ${
                          active
                            ? "bg-rose-400 ring-1 ring-white/60 shadow-[0_0_6px_rgba(251,113,133,0.85)]"
                            : "bg-rose-500 ring-2 ring-[#12121f] shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                        }`}
                      />
                    )}
                  </span>

                  {/* Nhãn chữ trượt nở mượt mà, tự marquee nếu vượt khung */}
                  {active && <TabLabel key={`label-${tab.id}`} label={tab.label} />}
                </Motion.span>
              </Motion.div>
            );

            if (!to) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  aria-label={tab.label}
                  className="flex-shrink-0 focus:outline-none"
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
                className="flex-shrink-0 focus:outline-none"
              >
                {buttonInner}
              </Link>
            );
          })}
        </Motion.div>

        {/* ─── Cụm 2: Nút tròn Search ─── */}
        <button
          type="button"
          aria-label="Tìm kiếm"
          onClick={handleSearchClick}
          className={`
            pointer-events-auto
            w-10 h-10 min-[360px]:w-11 min-[360px]:h-11 sm:w-12 sm:h-12 flex-shrink-0
            flex items-center justify-center
            rounded-full
            bg-[#12121f]/92 backdrop-blur-2xl
            border transition-all duration-200
            shadow-[0_12px_40px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4)]
            focus:outline-none active:scale-90
            ${searchOpen
              ? "border-white/30 text-white bg-white/10 shadow-[0_2px_16px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]"
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
                  className="size-[18px] min-[360px]:size-5"
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
                <Search className="size-[18px] min-[360px]:size-5 stroke-[1.75]" />
              </Motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );
};

export default FloatingTabBar;

import { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, m as Motion } from "framer-motion";
import { Bell, Trash2, X, Megaphone, LogIn } from "lucide-react";
import { formatNotificationTime } from "@/features/notifications/hooks/useNotificationsList.js";

const SheetNotificationItem = ({ notif, onSelect, onDelete }) => {
  return (
    <div
      onClick={() => onSelect(notif)}
      className={`group relative flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
        !notif.isRead
          ? "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12] border-emerald-500/20"
          : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 active:bg-white/8"
      }`}
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800 flex items-center justify-center">
        {notif.isSystemAnnouncement ? (
          <div className="h-full w-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
            <Megaphone className="size-5" />
          </div>
        ) : notif.senderAvatar ? (
          <img
            src={notif.senderAvatar}
            alt="avatar"
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white font-bold text-sm bg-emerald-500/20 text-emerald-400">
            {notif.senderName?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs sm:text-sm text-slate-300 leading-snug">
          <span className="font-semibold text-white">
            {notif.senderName}
          </span>
          {notif.type === "announcement"
            ? " đã cập nhật bài viết / thông báo mới: "
            : notif.type === "tag"
            ? " đã nhắc đến bạn trong một bình luận ở "
            : " đã trả lời bình luận của bạn trong "}
          <span className="font-semibold text-emerald-400">
            {notif.movieName || notif.movieSlug}
          </span>
        </p>
        {notif.content && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            {notif.content}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {notif.isSystemAnnouncement && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Hệ thống
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {formatNotificationTime(notif.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-center">
        {!notif.isRead && (
          <div className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        )}
        <button
          type="button"
          onClick={(e) => onDelete(e, notif)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 active:bg-rose-500/25 transition-all"
          title="Xóa thông báo"
          aria-label="Xóa thông báo"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
};

function NotificationSheet({ open, onClose, notificationsData }) {
  const {
    user,
    allNotifications,
    unreadCount,
    handleNotificationClick,
    handleDeleteNotification,
    handleClearAll,
  } = notificationsData;

  const sheetRef = useRef(null);

  // Khóa cuộn trang KHÔNG dùng body position:fixed (gây viewport resize trên mobile)
  // Thay vào đó dùng overflow:hidden trên #root để giữ nguyên viewport height
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const root = document.getElementById("root") || document.documentElement;
    const originalOverflow = root.style.overflow;
    const originalHeight = root.style.height;

    root.style.overflow = "hidden";
    root.style.height = "100%";

    return () => {
      root.style.overflow = originalOverflow;
      root.style.height = originalHeight;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Nút Back Android / Gesture Back đóng sheet
  useEffect(() => {
    if (open) {
      if (window.history.state?.modal !== "notification-sheet") {
        window.history.pushState({ modal: "notification-sheet" }, "");
      }
    }
  }, [open]);

  useEffect(() => {
    const handlePop = () => {
      if (open) onClose();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [open, onClose]);

  const onSelect = (notif) => {
    if (window.history.state?.modal === "notification-sheet") {
      window.history.replaceState(null, "");
    }
    handleNotificationClick(notif, onClose);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <Motion.div
            key="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
            style={{ touchAction: "none" }}
            onClick={onClose}
          />

          {/* ── Bottom Sheet PopUp Thông báo ── */}
          <Motion.div
            key="notif-sheet"
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="
              lg:hidden fixed inset-x-0 bottom-0 z-[95]
              h-[60vh] max-h-[60dvh] sm:h-[55vh] sm:max-h-[55dvh]
              bg-[#0f0f1e] border-t border-white/10
              rounded-t-[28px] rounded-b-none
              shadow-[0_-20px_60px_rgba(0,0,0,0.9)]
              flex flex-col
              overflow-hidden
            "
            style={{
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }}
          >
            {/* Header: Drag handle + Tiêu đề + Nút Xóa hết + Nút Đóng */}
            <div
              className="flex-shrink-0"
              style={{ touchAction: "none" }}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Title & Actions */}
              <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    Thông báo
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {unreadCount} mới
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {user && allNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs font-semibold text-slate-400 hover:text-rose-400 active:text-rose-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Xóa hết</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng"
                    className="size-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white active:scale-95 transition-all"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content List */}
            <div
              className="px-4 py-3 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar touch-pan-y space-y-2"
              style={{
                paddingBottom: "calc(84px + max(16px, env(safe-area-inset-bottom, 16px)))",
              }}
            >
              {!user ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4 gap-3">
                  <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                    <Bell className="size-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Đăng nhập để xem thông báo
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Nhận thông báo khi có tập phim mới, câu trả lời bình luận hoặc thông báo từ hệ thống.
                    </p>
                  </div>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-emerald-950 text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <LogIn className="size-3.5" />
                    <span>Đăng nhập ngay</span>
                  </Link>
                </div>
              ) : allNotifications.length === 0 ? (
                <div className="py-14 text-center flex flex-col items-center justify-center text-slate-400 gap-2.5 px-4">
                  <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                    <Bell className="size-7" />
                  </div>
                  <p className="text-sm font-semibold text-white">Chưa có thông báo nào</p>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Khi có người trả lời bình luận, nhắc đến bạn hoặc có thông báo hệ thống, chúng sẽ xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                allNotifications.map((notif) => (
                  <SheetNotificationItem
                    key={notif.id}
                    notif={notif}
                    onSelect={onSelect}
                    onDelete={handleDeleteNotification}
                  />
                ))
              )}
            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default memo(NotificationSheet);


import { useEffect, useState, useRef } from "react";
import { Bell, Trash2, X, Megaphone } from "lucide-react";
import {
  useNotificationsList,
  formatNotificationTime,
} from "@/features/notifications/hooks/useNotificationsList.js";

const NotificationItem = ({ notif, onSelect, onDelete }) => {
  return (
    <div
      onClick={() => onSelect(notif)}
      className={`group relative flex items-start gap-3 p-3.5 rounded-xl border border-transparent transition-all cursor-pointer ${
        !notif.isRead
          ? "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12] border-emerald-500/20"
          : "hover:bg-white/5 active:bg-white/10"
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
        <p className="text-sm text-slate-300 leading-snug">
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
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 active:bg-rose-500/25 transition-all opacity-0 group-hover:opacity-100"
          title="Xóa thông báo"
          aria-label="Xóa thông báo"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
};

export default function Notifications({ buttonClassName = "", iconClassName = "" }) {
  const {
    user,
    allNotifications,
    unreadCount,
    handleNotificationClick,
    handleDeleteNotification,
    handleClearAll,
  } = useNotificationsList();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Thông báo"
        className={buttonClassName || "relative flex items-center justify-center p-2 rounded-full text-white hover:bg-white/10 transition-colors"}
      >
        <Bell className={iconClassName || "size-5 filter drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] ring-2 ring-slate-950" />
        )}
      </button>

      {/* ─── Desktop Dropdown (>= 1024px) ─── */}
      {open && (
        <div className="hidden lg:flex absolute right-0 top-full mt-2 w-[400px] max-h-[520px] rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02] flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-400">
                  {unreadCount}
                </span>
              )}
            </div>
            {allNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-medium text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="size-3" />
                Xóa tất cả
              </button>
            )}
          </div>
          <div className="flex-1 max-h-[440px] overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar min-h-0">
            {allNotifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Chưa có thông báo nào.
              </div>
            ) : (
              allNotifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onSelect={(n) => {
                    handleNotificationClick(n);
                    setOpen(false);
                  }}
                  onDelete={handleDeleteNotification}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

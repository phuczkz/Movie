import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { Bell, Trash2, X, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase.config.js";
import { useAuth, useAnnouncements } from "@/features/auth/context/AuthContext";

const formatNotificationTime = (timestamp) => {
  if (!timestamp) return "";
  try {
    let date;
    if (typeof timestamp?.toDate === "function") date = timestamp.toDate();
    else if (typeof timestamp?.toMillis === "function") date = new Date(timestamp.toMillis());
    else if (typeof timestamp?.seconds === "number") date = new Date(timestamp.seconds * 1000);
    else date = new Date(timestamp);

    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
};

const NotificationItem = ({ notif, onSelect, onDelete, isMobileView = false }) => {
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
          className={`p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 active:bg-rose-500/25 transition-all ${
            isMobileView
              ? "opacity-60 active:opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
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
  const { user, userProfile, markAnnouncementAsRead, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const { data: announcements = [] } = useAnnouncements();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !db) return;

    const recipientIds = [user.uid];
    if (isAdmin) {
      recipientIds.push("admin");
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "in", recipientIds)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotifications(docs);
      },
      (error) => {
        console.error("Notifications fetch error", error);
      }
    );

    return () => unsubscribe();
  }, [user, isAdmin]);

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

  const localReadList = JSON.parse(
    localStorage.getItem("readAnnouncements") || "[]"
  );
  const userReadList = userProfile?.readAnnouncements || [];
  const readList = [...new Set([...localReadList, ...userReadList])];

  const markAnnouncementRead = async (versionKey, docId) => {
    try {
      const localRead = JSON.parse(
        localStorage.getItem("readAnnouncements") || "[]"
      );
      let updatedLocal = false;
      if (versionKey && !localRead.includes(versionKey)) {
        localRead.push(versionKey);
        updatedLocal = true;
      }
      if (docId && !localRead.includes(docId)) {
        localRead.push(docId);
        updatedLocal = true;
      }
      if (updatedLocal) {
        localStorage.setItem("readAnnouncements", JSON.stringify(localRead));
      }
    } catch (e) {
      console.error(e);
    }

    if (userProfile) {
      try {
        if (versionKey) await markAnnouncementAsRead(versionKey);
        if (docId && docId !== versionKey) await markAnnouncementAsRead(docId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const stripHtmlAndDecode = (htmlStr) => {
    if (!htmlStr) return "";
    try {
      const parsed = new DOMParser().parseFromString(htmlStr, "text/html");
      return (parsed.body.textContent || parsed.body.innerText || "")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      return htmlStr
        .replace(/<[^>]*>?/gm, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim();
    }
  };

  const systemNotifs = announcements.map((ann) => {
    const updatedAtMillis = ann.updatedAt?.toMillis
      ? ann.updatedAt.toMillis()
      : ann.createdAt?.toMillis
      ? ann.createdAt.toMillis()
      : 0;
    const versionKey = `${ann.id}_${updatedAtMillis}`;
    const isRead =
      readList.includes(versionKey) ||
      readList.includes(ann.id);

    const cleanContent = stripHtmlAndDecode(ann.content);

    return {
      id: `sys_${ann.id}`,
      announcementId: ann.id,
      versionKey,
      type: "announcement",
      senderName: "Ban Quản Trị",
      senderAvatar: "/apple-touch-icon.png",
      movieName: ann.title || "Thông báo hệ thống",
      movieSlug: ann.movieSlug || "",
      content: cleanContent ? cleanContent.slice(0, 90) : "",
      isRead,
      createdAt: ann.updatedAt || ann.createdAt,
      isSystemAnnouncement: true,
    };
  });

  const allNotifications = [...systemNotifs, ...notifications]
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis
        ? a.createdAt.toMillis()
        : a.createdAt?.seconds
        ? a.createdAt.seconds * 1000
        : 0;
      const timeB = b.createdAt?.toMillis
        ? b.createdAt.toMillis()
        : b.createdAt?.seconds
        ? b.createdAt.seconds * 1000
        : 0;
      return timeB - timeA;
    })
    .slice(0, 15);

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), {
        isRead: true,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.isSystemAnnouncement) {
      if (!notif.isRead) {
        await markAnnouncementRead(notif.versionKey, notif.announcementId);
      }
      setOpen(false);
      if (notif.movieSlug) {
        navigate(`/movie/${notif.movieSlug}`);
      } else {
        navigate("/");
      }
    } else {
      if (!notif.isRead) handleMarkAsRead(notif.id);
      setOpen(false);
      if (notif.movieSlug) {
        navigate(`/movie/${notif.movieSlug}`);
      }
    }
  };

  const handleDeleteNotification = async (e, notif) => {
    e.preventDefault();
    e.stopPropagation();
    if (notif.isSystemAnnouncement) {
      await markAnnouncementRead(notif.versionKey, notif.announcementId);
      return;
    }
    try {
      await deleteDoc(doc(db, "notifications", notif.id));
    } catch (error) {
      console.error("Lỗi xóa thông báo:", error);
    }
  };

  const handleClearAll = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (allNotifications.length === 0) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa tất cả thông báo?")) return;

    try {
      const userNotifs = allNotifications.filter((n) => !n.isSystemAnnouncement);
      if (userNotifs.length > 0) {
        const batch = writeBatch(db);
        userNotifs.forEach((notif) => {
          batch.delete(doc(db, "notifications", notif.id));
        });
        await batch.commit();
      }

      const sysNotifs = allNotifications.filter((n) => n.isSystemAnnouncement);
      for (const notif of sysNotifs) {
        await markAnnouncementRead(notif.versionKey, notif.announcementId);
      }
    } catch (error) {
      console.error("Lỗi xóa tất cả thông báo:", error);
    }
  };

  if (!user) return null;

  return (
    <>
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
                    onSelect={handleNotificationClick}
                    onDelete={handleDeleteNotification}
                    isMobileView={false}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile Dropdown Menu (< 1024px) - Drops directly under Header / Bell icon ─── */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="lg:hidden fixed inset-0 z-[100] pointer-events-none">
            {/* Subtle Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-150 pointer-events-auto"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Dropdown Container positioned directly below top bar */}
            <div
              className="fixed z-10 right-2.5 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] w-[calc(100vw-20px)] max-w-[380px] max-h-[75vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d0e19]/95 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden pointer-events-auto"
            >
              {/* Pointer notch arrow pointing up to the notification bell */}
              <div className="absolute -top-1.5 right-[4.25rem] size-3 bg-[#0d0e19] border-t border-l border-white/10 rotate-45 pointer-events-none" />

              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02] flex-shrink-0 relative z-10">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Thông báo</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {unreadCount} mới
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {allNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs font-medium text-slate-400 hover:text-rose-400 active:text-rose-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Xóa hết</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="size-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 transition-all ml-0.5"
                    aria-label="Đóng thông báo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification List Scroll Area */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 space-y-1 custom-scrollbar min-h-0 relative z-10">
                {allNotifications.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400 gap-2.5 px-4">
                    <div className="size-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                      <Bell className="size-6" />
                    </div>
                    <p className="text-sm font-semibold text-white">Chưa có thông báo nào</p>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      Khi có người trả lời bình luận, nhắc đến bạn hoặc có thông báo từ hệ thống, chúng sẽ xuất hiện tại đây.
                    </p>
                  </div>
                ) : (
                  allNotifications.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onSelect={handleNotificationClick}
                      onDelete={handleDeleteNotification}
                      isMobileView={true}
                    />
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

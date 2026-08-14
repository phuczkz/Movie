import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  deleteDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { Bell, Trash2, X, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase.config.js";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function Notifications() {
  const { user, userProfile, markAnnouncementAsRead } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    if (!user || !db) return;

    const recipientIds = [user.uid];
    if (user.email === ADMIN_EMAIL) {
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
  }, [user, ADMIN_EMAIL]);

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const activeDocs = docs.filter((d) => d.active === true);
        setAnnouncements(activeDocs);
      },
      (error) => {
        console.error("Announcements fetch error", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const readList =
    userProfile?.readAnnouncements ||
    JSON.parse(localStorage.getItem("readAnnouncements") || "[]");

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
      (!ann.updatedAt && readList.includes(ann.id));

    const cleanContent = stripHtmlAndDecode(ann.content);

    return {
      id: `sys_${ann.id}`,
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
        if (userProfile) {
          await markAnnouncementAsRead(notif.versionKey);
        } else {
          const localRead = JSON.parse(
            localStorage.getItem("readAnnouncements") || "[]"
          );
          if (!localRead.includes(notif.versionKey)) {
            localRead.push(notif.versionKey);
            localStorage.setItem("readAnnouncements", JSON.stringify(localRead));
          }
        }
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
      if (userProfile) {
        await markAnnouncementAsRead(notif.versionKey);
      } else {
        const localRead = JSON.parse(
          localStorage.getItem("readAnnouncements") || "[]"
        );
        if (!localRead.includes(notif.versionKey)) {
          localRead.push(notif.versionKey);
          localStorage.setItem("readAnnouncements", JSON.stringify(localRead));
        }
      }
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
        if (userProfile) {
          await markAnnouncementAsRead(notif.versionKey);
        } else {
          const localRead = JSON.parse(
            localStorage.getItem("readAnnouncements") || "[]"
          );
          if (!localRead.includes(notif.versionKey)) {
            localRead.push(notif.versionKey);
            localStorage.setItem("readAnnouncements", JSON.stringify(localRead));
          }
        }
      }
    } catch (error) {
      console.error("Lỗi xóa tất cả thông báo:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute -right-[80px] sm:-right-[88px] lg:right-0 mt-2 w-[340px] sm:w-[380px] lg:w-[400px] max-w-[calc(100vw-32px)] rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl overflow-hidden z-50 flex flex-col">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <h3 className="font-semibold text-white">Thông báo</h3>
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
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {allNotifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                Chưa có thông báo nào.
              </div>
            ) : (
              allNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                    !notif.isRead ? "bg-emerald-500/5" : ""
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
                  <div
                    className={`flex-1 min-w-0 pr-6 ${
                      notif.isRead ? "opacity-50" : ""
                    }`}
                  >
                    <p className="text-sm text-slate-300">
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
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {notif.content}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="size-2 shrink-0 rounded-full bg-emerald-500 mt-1.5" />
                  )}
                  {/* Delete single notification button */}
                  <button
                    onClick={(e) => handleDeleteNotification(e, notif)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                    title="Xóa thông báo này"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

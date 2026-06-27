import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

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
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
          return timeB - timeA;
        });
        setNotifications(docs.slice(0, 15));
      },
      (error) => {
        console.error("Notifications fetch error", error);
      }
    );

    return () => unsubscribe();
  }, [user, ADMIN_EMAIL]);

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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), {
        isRead: true,
      });
    } catch (e) {
      console.error(e);
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
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl overflow-hidden z-50">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <h3 className="font-semibold text-white">Thông báo</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                Chưa có thông báo nào.
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  to={`/watch/${notif.movieSlug}`}
                  onClick={() => {
                    if (!notif.isRead) handleMarkAsRead(notif.id);
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    !notif.isRead ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <div className="size-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                    {notif.senderAvatar ? (
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
                  <div className={`flex-1 min-w-0 ${notif.isRead ? 'opacity-50' : ''}`}>
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-white">
                        {notif.senderName}
                      </span>
                      {notif.type === "tag"
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
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { db } from "@/firebase.config.js";
import { useAuth, useAnnouncements } from "@/features/auth/context/AuthContext";

export const formatNotificationTime = (timestamp) => {
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

export function useNotificationsList() {
  const { user, userProfile, markAnnouncementAsRead, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const { data: announcements = [] } = useAnnouncements();
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
    .slice(0, 20);

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

  const handleNotificationClick = async (notif, onAfterClick) => {
    if (notif.isSystemAnnouncement) {
      if (!notif.isRead) {
        await markAnnouncementRead(notif.versionKey, notif.announcementId);
      }
      onAfterClick?.();
      if (notif.movieSlug) {
        navigate(`/movie/${notif.movieSlug}`);
      } else {
        navigate("/");
      }
    } else {
      if (!notif.isRead) handleMarkAsRead(notif.id);
      onAfterClick?.();
      if (notif.movieSlug) {
        navigate(`/movie/${notif.movieSlug}`);
      }
    }
  };

  const handleDeleteNotification = async (e, notif) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
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
    e?.preventDefault?.();
    e?.stopPropagation?.();
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

  return {
    user,
    allNotifications,
    unreadCount,
    handleNotificationClick,
    handleDeleteNotification,
    handleClearAll,
  };
}


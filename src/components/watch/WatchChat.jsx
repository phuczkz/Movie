import React, { useState, useEffect, useRef } from "react";
import { Send, UserCircle, Users } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../context/AuthContext";

export default function WatchChat({ roomId, roomHostId }) {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const chatContainerRef = useRef(null);
  const [activeMembers, setActiveMembers] = useState([]);
  const [showMembersList, setShowMembersList] = useState(false);

  useEffect(() => {
    if (!db || !roomId) return;

    const q = query(
      collection(db, `watchRooms/${roomId}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(list);
    }, (error) => {
      console.error("Lỗi lắng nghe tin nhắn chat:", error);
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!db || !roomId) return;

    const q = query(
      collection(db, `watchRooms/${roomId}/members`),
      orderBy("lastActive", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const now = Date.now();
      const activeList = list.filter(m => {
        if (!m.lastActive) return true;
        const activeMs = m.lastActive.toMillis ? m.lastActive.toMillis() : now;
        return (now - activeMs) < 40000;
      });
      setActiveMembers(activeList);
    }, (error) => {
      console.error("Lỗi lắng nghe danh sách thành viên:", error);
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!user || !db || !text.trim() || submitting) return;

    setSubmitting(true);
    const content = text.trim();
    setText("");

    try {
      const displayName = userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Người dùng";
      const photoURL = userProfile?.photoURL || user.photoURL || null;

      await addDoc(collection(db, `watchRooms/${roomId}/messages`), {
        userId: user.uid,
        userName: displayName,
        userAvatar: photoURL,
        content: content,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getProxiedAvatar = (url) => {
    if (!url) return null;
    if (url.includes("dicebear.com") || url.startsWith("/")) return url;
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=50&h=50&fit=cover&output=webp&q=80`;
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  return (
    <div className="relative flex flex-col h-[400px] xl:h-[410px] 2xl:h-[520px] bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Trò chuyện phòng
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md shrink-0">
            {messages.length} tin nhắn
          </span>
          <button 
            onClick={() => setShowMembersList(!showMembersList)}
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition-all shrink-0 ${
              showMembersList 
                ? "bg-emerald-500 text-slate-950" 
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            <Users className="size-3" />
            <span>{activeMembers.length} người</span>
          </button>
        </div>
      </div>

      {/* Member list overlay */}
      {showMembersList && (
        <div className="absolute inset-x-0 top-[45px] bottom-0 bg-slate-950/95 backdrop-blur-md z-20 flex flex-col p-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="text-xs font-bold text-slate-300">Đang xem chung ({activeMembers.length})</span>
            <button 
              onClick={() => setShowMembersList(false)}
              className="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              Đóng
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
            {activeMembers.map((m) => (
              <div key={m.userId} className="flex items-center gap-2.5 py-1">
                <div className="size-7 rounded-full overflow-hidden bg-white/5 border border-white/5 relative shrink-0">
                  {m.userAvatar ? (
                    <img src={getProxiedAvatar(m.userAvatar)} alt={m.userName} className="h-full w-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <UserCircle className="h-full w-full text-slate-500" />
                  )}
                  <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 border border-slate-950" />
                </div>
                <span className="text-xs text-slate-200 font-medium truncate max-w-[150px]">{m.userName}</span>
                {m.userId === roomHostId && (
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 ml-auto shrink-0">
                    Chủ phòng
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages List */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.userId === user?.uid;
          const avatar = getProxiedAvatar(msg.userAvatar);

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 max-w-[85%] ${
                isMe ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              {!isMe && (
                <div className="size-7 shrink-0 rounded-full overflow-hidden bg-white/5 border border-white/5">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={msg.userName}
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <UserCircle className="h-full w-full text-slate-500" />
                  )}
                </div>
              )}

              {/* Message Bubble */}
              <div className="flex flex-col space-y-0.5">
                {!isMe && (
                  <span className="text-[10px] font-semibold text-slate-400 pl-1">
                    {msg.userName}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 text-xs leading-relaxed break-words ${
                    isMe
                      ? "bg-emerald-500 text-slate-950 font-medium rounded-tr-none"
                      : "bg-white/[0.06] text-slate-200 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className={`text-[9px] text-slate-500 ${isMe ? "text-right pr-1" : "pl-1"}`}>
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <span className="text-slate-500 text-xs">Chưa có tin nhắn nào.</span>
            <span className="text-slate-600 text-[10px] mt-1">Hãy gửi tin nhắn để chào mọi người nhé!</span>
          </div>
        )}
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-slate-950/20">
          <div className="relative flex items-center">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-30 transition-colors"
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 text-center text-[11px] text-slate-500 border-t border-white/5">
          Vui lòng đăng nhập để gửi tin nhắn.
        </div>
      )}
    </div>
  );
}

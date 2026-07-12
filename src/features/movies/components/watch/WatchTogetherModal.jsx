import React, { useState } from "react";
import { Users, Share2, LogOut, Copy, Check, Tv, X } from "lucide-react";
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from '@/firebase.config.js';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function WatchTogetherModal({
  isOpen,
  onClose,
  roomId,
  setRoomId,
  isHost,
  movie,
  activeEpisode,
  activeServer,
  activeProvider,
  inline = false,
}) {
  const { user, userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputCode, setInputCode] = useState("");

  // Generate a random 6-character room ID
  const generateRoomId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = async () => {
    if (!user || !db) return alert("Vui lòng đăng nhập để tạo phòng!");
    setLoading(true);
    const newRoomId = generateRoomId();

    try {
      const roomRef = doc(db, "watchRooms", newRoomId);
      const hostName = userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Chủ phòng";

      await setDoc(roomRef, {
        roomId: newRoomId,
        movieSlug: movie?.slug || "",
        movieName: movie?.name || movie?.title || "",
        episodeSlug: activeEpisode?.slug || "",
        server: activeServer || "Vietsub",
        provider: activeProvider || "",
        hostUid: user.uid,
        hostName: hostName,
        createdTime: serverTimestamp(),
        playerState: {
          isPlaying: false,
          currentTime: 0,
          updatedAt: serverTimestamp(),
        },
      });

      setRoomId(newRoomId);
    } catch (error) {
      console.error("Lỗi tạo phòng:", error);
      alert("Đã xảy ra lỗi khi tạo phòng, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !db) return alert("Vui lòng đăng nhập để tham gia!");
    if (inputCode.length !== 6) return alert("Mã phòng phải gồm 6 ký tự!");
    setLoading(true);

    try {
      const roomRef = doc(db, "watchRooms", inputCode);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        setRoomId(inputCode);
        onClose();
      } else {
        alert("Không tìm thấy mã phòng này hoặc phòng đã bị đóng!");
      }
    } catch (error) {
      console.error("Lỗi tham gia phòng:", error);
      alert("Đã xảy ra lỗi khi xác minh phòng, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!db || !roomId) return;
    setLoading(true);

    try {
      if (isHost) {
        // If Host leaves, we can delete the room doc to clean up
        await deleteDoc(doc(db, "watchRooms", roomId));
      }
      setRoomId(null);
      onClose();
    } catch (error) {
      console.error("Lỗi rời phòng:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInviteLink = () => {
    if (!roomId) return "";
    const params = new URLSearchParams(window.location.search);
    params.set("room", roomId);
    if (activeEpisode?.slug) params.set("episode", activeEpisode.slug);
    if (activeServer) params.set("server", activeServer);
    if (activeProvider) params.set("provider", activeProvider);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = (
    <div className={`relative w-full ${inline ? "" : "max-w-md"} overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md`}>
      {/* Close Button */}
      {!inline && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <X className="size-5" />
        </button>
      )}

        <div className="flex flex-col items-center text-center gap-4">
          <div className="rounded-2xl bg-emerald-500/10 p-3.5 border border-emerald-500/20">
            <Users className="size-8 text-emerald-400" />
          </div>

          <h2 className="text-xl font-semibold text-white tracking-tight">
            Xem Phim Chung (Watch Together)
          </h2>
          <p className="text-slate-400 text-sm max-w-xs">
            Cùng bạn bè thưởng thức những thước phim sắc nét và trò chuyện trực tuyến thời gian thực.
          </p>

          {roomId ? (
            <div className="w-full space-y-5 pt-3">
              {/* Active Room View */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-left space-y-3.5">
                <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Mã Phòng
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-400 tracking-wider">
                    {roomId}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Vai trò của bạn</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    isHost ? "bg-emerald-500/15 text-emerald-400" : "bg-sky-500/15 text-sky-400"
                  }`}>
                    {isHost ? "Chủ phòng (Host)" : "Người xem (Member)"}
                  </span>
                </div>
              </div>

              {/* Copy Invite Link */}
              <div className="space-y-1.5">
                <label htmlFor="invite-link" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left block pl-1">
                  Đường dẫn mời tham gia
                </label>
                <div className="relative flex items-center">
                  <input
                    id="invite-link"
                    type="text"
                    readOnly
                    value={getInviteLink()}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-2.5 pl-3 pr-12 text-xs font-mono text-slate-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl p-2 text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                  >
                    {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                >
                  <LogOut className="size-4" />
                  {isHost ? "Giải tán phòng" : "Rời phòng"}
                </button>
              </div>
            </div>
          ) : (
            /* Creation View */
            <div className="w-full pt-4 space-y-5">
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-50"
              >
                {loading && !inputCode ? (
                  <div className="size-5 animate-spin rounded-full border-2 border-emerald-950 border-t-transparent" />
                ) : (
                  <>
                    <Tv className="size-4" />
                    Tạo phòng xem chung
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <span className="relative bg-slate-900 px-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Hoặc tham gia phòng
                </span>
              </div>

              <div className="space-y-2 text-left">
                <label htmlFor="room-code-input" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Nhập mã phòng đã có
                </label>
                <div className="flex gap-2">
                  <input
                    id="room-code-input"
                    type="text"
                    placeholder="MÃ PHÒNG (VD: AB34EF)"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase().trim())}
                    maxLength={6}
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-xs font-mono text-white tracking-widest placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleJoinRoom}
                    disabled={loading || inputCode.length !== 6}
                    className="px-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {loading && inputCode ? "..." : "Vào"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );

  if (inline) return content;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
      {content}
    </div>
  );
}

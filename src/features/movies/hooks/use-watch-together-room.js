/**
 * use-watch-together-room.js
 *
 * Hook quản lý toàn bộ logic phòng Xem Chung (Watch Together):
 * - Lắng nghe Firestore room document
 * - Heartbeat host / member presence
 * - Đồng bộ episode/server/provider giữa host và member
 * - Đồng bộ trạng thái player (play/pause/seek) realtime
 *
 * Tách từ Watch.jsx để giảm ~250 dòng logic Firebase khỏi page component.
 */

import { useEffect, useRef, useState } from "react";
import {
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase.config.js";

/**
 * @param {Object} params
 * @param {string|null} params.roomId - ID phòng xem chung (từ URL param)
 * @param {Function} params.setRoomId - Setter cho roomId
 * @param {Object|null} params.user - Firebase user object
 * @param {Object|null} params.userProfile - User profile từ Firestore
 * @param {Object|null} params.player - Artplayer instance
 * @param {string} params.slug - Movie slug hiện tại
 * @param {Object|null} params.activeEpisode - Episode đang phát
 * @param {string} params.activeServer - Server đang chọn
 * @param {string|null} params.activeProvider - Provider đang chọn
 * @param {URLSearchParams} params.params - Search params hiện tại
 * @param {Function} params.setParams - Setter search params
 * @param {Function} params.navigate - React Router navigate
 */
export function useWatchTogetherRoom({
  roomId,
  setRoomId,
  user,
  userProfile,
  player,
  slug,
  activeEpisode,
  activeServer,
  activeProvider,
  params,
  setParams,
  navigate,
}) {
  const [roomData, setRoomData] = useState(null);
  const roomDataRef = useRef(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    roomDataRef.current = roomData;
  }, [roomData]);

  const isHost = Boolean(user && roomData && roomData.hostUid === user.uid);
  const isMember = Boolean(user && roomData && roomData.hostUid !== user.uid);

  // 1. Listen to Room document in Firestore
  useEffect(() => {
    if (!db || !roomId) {
      setRoomData(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "watchRooms", roomId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomData(data);
      } else {
        // Room closed/deleted
        setRoomData(null);
        setRoomId(null);
      }
    }, (error) => {
      console.error("Lỗi lắng nghe phòng xem chung:", error);
    });

    return () => unsubscribe();
  }, [roomId, setRoomId]);

  // 1b. Member: Check Host Heartbeat (Online Status)
  useEffect(() => {
    if (!roomId || isHost) return;

    const interval = setInterval(() => {
      const currentData = roomDataRef.current;
      if (!currentData?.playerState?.updatedAt) return;

      const updatedAt = currentData.playerState.updatedAt;
      const updateMs = updatedAt.toMillis ? updatedAt.toMillis() : Date.now();
      const diffSeconds = (Date.now() - updateMs) / 1000;

      if (diffSeconds > 60) {
        alert("Chủ phòng đã ngoại tuyến. Bạn sẽ được đưa ra khỏi phòng xem chung.");
        setRoomId(null);
        setRoomData(null);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [roomId, isHost, setRoomId]);

  // 1d. Host: Heartbeat timer to keep room alive
  useEffect(() => {
    if (!isHost || !roomId || !db) return;

    const interval = setInterval(async () => {
      try {
        const roomRef = doc(db, "watchRooms", roomId);
        await updateDoc(roomRef, {
          "playerState.updatedAt": serverTimestamp(),
        });
      } catch (err) {
        console.warn("Lỗi gửi heartbeat chủ phòng:", err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isHost, roomId]);

  // 1e. Participant Presence: Register active status in the room
  useEffect(() => {
    if (!roomId || !user || !db) return;

    const memberRef = doc(db, `watchRooms/${roomId}/members`, user.uid);
    const updatePresence = async () => {
      try {
        const displayName = userProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Người dùng";
        const photoURL = userProfile?.photoURL || user.photoURL || null;
        await setDoc(memberRef, {
          userId: user.uid,
          userName: displayName,
          userAvatar: photoURL,
          lastActive: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn("Lỗi cập nhật hiện diện:", err);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 15000);

    return () => {
      clearInterval(interval);
      deleteDoc(memberRef).catch(() => { });
    };
  }, [roomId, user, userProfile]);

  // 2. Member: Sync Movie/Episode/Server/Provider from Firestore room state
  useEffect(() => {
    if (!roomData || isHost || !roomId) return;

    const nextParams = new URLSearchParams(params);
    let changed = false;

    if (roomData.movieSlug && roomData.movieSlug !== slug) {
      navigate(`/watch/${roomData.movieSlug}?room=${roomId}&episode=${roomData.episodeSlug}&server=${roomData.server || "Vietsub"}${roomData.provider ? `&provider=${roomData.provider}` : ""}`, { replace: true });
      return;
    }

    if (roomData.episodeSlug && roomData.episodeSlug !== params.get("episode")) {
      nextParams.set("episode", roomData.episodeSlug);
      changed = true;
    }
    if (roomData.server && roomData.server !== params.get("server")) {
      nextParams.set("server", roomData.server);
      changed = true;
    }
    if (roomData.provider && roomData.provider !== params.get("provider")) {
      nextParams.set("provider", roomData.provider);
      changed = true;
    } else if (!roomData.provider && params.get("provider")) {
      nextParams.delete("provider");
      changed = true;
    }

    if (changed) {
      setParams(nextParams, { replace: true });
    }
  }, [roomData, isHost, slug, params, setParams, navigate, roomId]);

  // 3. Host: Sync Episode / Server / Provider changes to Firestore
  useEffect(() => {
    if (!isHost || !roomId || !db) return;

    const updateRoomEpisode = async () => {
      try {
        const roomRef = doc(db, "watchRooms", roomId);
        await setDoc(roomRef, {
          episodeSlug: activeEpisode?.slug || "",
          server: activeServer || "Vietsub",
          provider: activeProvider || "",
          playerState: {
            isPlaying: false,
            currentTime: 0,
            updatedAt: serverTimestamp(),
          }
        }, { merge: true });
      } catch (err) {
        console.warn("Lỗi cập nhật tập lên phòng Firestore:", err);
      }
    };

    updateRoomEpisode();
  }, [activeEpisode, activeServer, activeProvider, isHost, roomId]);

  // 4. Host: Sync Player playback state (Play/Pause/Seek) to Firestore
  useEffect(() => {
    if (!player || !isHost || !roomId || !db) return;

    const updatePlayerState = async (isPlaying, currentTime) => {
      try {
        const roomRef = doc(db, "watchRooms", roomId);
        await setDoc(roomRef, {
          playerState: {
            isPlaying,
            currentTime,
            updatedAt: serverTimestamp(),
          }
        }, { merge: true });
      } catch (err) {
        console.error("Lỗi cập nhật trạng thái trình phát lên phòng:", err);
      }
    };

    const onPlay = () => {
      if (isSyncing.current) return;
      updatePlayerState(true, player.video.currentTime);
    };

    const onPause = () => {
      if (isSyncing.current) return;
      updatePlayerState(false, player.video.currentTime);
    };

    const onSeeked = () => {
      if (isSyncing.current) return;
      updatePlayerState(!player.video.paused, player.video.currentTime);
    };

    let lastTimeUpdate = 0;
    const onTimeUpdate = () => {
      if (isSyncing.current) return;
      const now = Date.now();
      if (now - lastTimeUpdate > 5000) {
        lastTimeUpdate = now;
        updatePlayerState(!player.video.paused, player.video.currentTime);
      }
    };

    player.on("video:play", onPlay);
    player.on("video:pause", onPause);
    player.on("video:seeked", onSeeked);
    player.on("video:timeupdate", onTimeUpdate);

    return () => {
      player.off("video:play", onPlay);
      player.off("video:pause", onPause);
      player.off("video:seeked", onSeeked);
      player.off("video:timeupdate", onTimeUpdate);
    };
  }, [player, isHost, roomId]);

  // 5. Member: Sync Player playback state from Firestore
  useEffect(() => {
    if (!player || !roomData || isHost || !roomData.playerState) return;

    const { isPlaying, currentTime } = roomData.playerState;

    isSyncing.current = true;

    // Sync Play/Pause
    if (isPlaying && player.video.paused) {
      player.play().catch(() => { });
    } else if (!isPlaying && !player.video.paused) {
      player.pause();
    }

    // Sync Time with fixed latency estimation (avoids client-clock desync)
    const hostTimeAdjusted = currentTime + (isPlaying ? 0.2 : 0);
    const videoEl = player.video;
    const timeDiff = Math.abs(videoEl.currentTime - hostTimeAdjusted);

    if (timeDiff > 1.5) {
      // eslint-disable-next-line react-hooks/immutability
      videoEl.currentTime = hostTimeAdjusted;
    }

    // Return cleanup to prevent isSyncing leak on fast re-renders
    const timer = setTimeout(() => {
      isSyncing.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, [player, roomData, isHost]);

  return {
    roomData,
    isHost,
    isMember,
  };
}

export default useWatchTogetherRoom;

import { useCallback, useRef } from "react";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";

const MIN_SECONDS_TO_SAVE = 10;

const SAVE_DEBOUNCE_MS = 15_000;


export const useWatchProgress = () => {
  const { user } = useAuth();
  const lastSaveRef = useRef(0);

  const saveProgress = useCallback(
    async (slug, data) => {
      if (!user || !db || !slug) return;
      if (!data || data.currentTime < MIN_SECONDS_TO_SAVE) return;

      // Simple debounce: skip if called too soon after the last save
      const now = Date.now();
      if (now - lastSaveRef.current < SAVE_DEBOUNCE_MS) return;
      lastSaveRef.current = now;

      try {
        const ref = doc(db, "users", user.uid, "WatchProgress", slug);
        await setDoc(
          ref,
          {
            slug,
            episodeSlug: data.episodeSlug || null,
            episodeName: data.episodeName || null,
            server: data.server || null,
            currentTime: Math.floor(data.currentTime),
            duration: Math.floor(data.duration || 0),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        // Silently fail — progress saving is not critical
        console.warn("[WatchProgress] save failed:", err.message);
      }
    },
    [user]
  );


  const forceSave = useCallback(
    async (slug, data) => {
      if (!user || !db || !slug) return;
      if (!data || data.currentTime < MIN_SECONDS_TO_SAVE) return;

      lastSaveRef.current = Date.now();
      try {
        const ref = doc(db, "users", user.uid, "WatchProgress", slug);
        await setDoc(
          ref,
          {
            slug,
            episodeSlug: data.episodeSlug || null,
            episodeName: data.episodeName || null,
            server: data.server || null,
            currentTime: Math.floor(data.currentTime),
            duration: Math.floor(data.duration || 0),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("[WatchProgress] force save failed:", err.message);
      }
    },
    [user]
  );

  const loadProgress = useCallback(
    async (slug) => {
      if (!user || !db || !slug) return null;

      try {
        const ref = doc(db, "users", user.uid, "WatchProgress", slug);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) return null;
        return snapshot.data();
      } catch (err) {
        console.warn("[WatchProgress] load failed:", err.message);
        return null;
      }
    },
    [user]
  );


  const clearProgress = useCallback(
    async (slug) => {
      if (!user || !db || !slug) return;
      try {
        const ref = doc(db, "users", user.uid, "WatchProgress", slug);
        await deleteDoc(ref);
      } catch (err) {
        console.warn("[WatchProgress] clear failed:", err.message);
      }
    },
    [user]
  );

  return { saveProgress, forceSave, loadProgress, clearProgress };
};

export default useWatchProgress;

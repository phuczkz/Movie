import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '@/firebase.config.js';
import { useAuth } from '@/features/auth/context/AuthContext.jsx';

const getTimestamp = (doc) => {
  const t = doc.createdAt || doc.updatedAt;
  if (!t) return 0;
  if (typeof t?.toMillis === "function") return t.toMillis();
  if (typeof t?.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const useSavedMoviesList = () => {
  const { user } = useAuth();
  const uid = user?.uid;

  const [prevUid, setPrevUid] = useState(uid);
  const [movies, setMovies] = useState([]);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [error, setError] = useState(null);

  // Adjust state during render when user changes
  if (uid !== prevUid) {
    setPrevUid(uid);
    setMovies([]);
    setHasSnapshot(false);
    setError(null);
  }

  const colRef = useMemo(() => {
    if (!uid || !db) return null;
    return collection(db, "users", uid, "FavoriteMovies");
  }, [uid]);

  useEffect(() => {
    if (!colRef) return undefined;

    // Listen to collection directly to avoid missing-field omissions or index errors
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort client-side by createdAt (or updatedAt) descending
        items.sort((a, b) => getTimestamp(b) - getTimestamp(a));

        setMovies(items);
        setError(null);
        setHasSnapshot(true);
      },
      (err) => {
        console.error("[useSavedMoviesList] onSnapshot error:", err);
        setError(err);
        setHasSnapshot(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [colRef]);

  return { movies, loading: colRef ? !hasSnapshot : false, error };
};

export default useSavedMoviesList;


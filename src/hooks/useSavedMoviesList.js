import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";

export const useSavedMoviesList = () => {
  const { user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [error, setError] = useState(null);

  const colRef = useMemo(() => {
    if (!user || !db) return null;
    return collection(db, "users", user.uid, "FavoriteMovies");
  }, [user, db]);

  useEffect(() => {
    if (!colRef) return undefined;

    const q = query(colRef, orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setMovies(items);
        setHasSnapshot(true);
      },
      (err) => {
        setError(err);
        setHasSnapshot(true);
      }
    );

    return () => {
      unsubscribe();
      setMovies([]);
      setError(null);
      setHasSnapshot(false);
    };
  }, [colRef]);

  return { movies, loading: colRef ? !hasSnapshot : false, error };
};

export default useSavedMoviesList;

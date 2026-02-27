import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  Timestamp,
  doc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  isFirebaseConfigured,
} from "../firebase.config";

const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: true,
  profileLoading: false,
  loginGoogle: async () => {},
  loginEmail: async () => {},
  registerEmail: async () => {},
  updateProfileData: async () => {},
  logout: async () => {},
  saveMovie: async () => {},
  removeSavedMovie: async () => {},
});

const rejectIfMissing = () => {
  throw new Error(
    "Firebase chưa được cấu hình. Kiểm tra các biến môi trường VITE_FIREBASE_*"
  );
};

const buildDefaultProfile = (currentUser) => ({
  email: currentUser.email,
  displayName: currentUser.displayName || "Người dùng",
  phoneNumber: currentUser.phoneNumber || "",
  birthday: "",
  photoURL: currentUser.photoURL || "",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const ensureFirebase = () => {
    if (!auth || !db) return rejectIfMissing();
    return true;
  };

  const ensureCurrentUser = () => {
    ensureFirebase();
    const currentUser = auth.currentUser;
    if (!currentUser)
      throw new Error("Bạn cần đăng nhập để lưu hoặc quản lý phim.");
    return currentUser;
  };

  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser || !db) return null;
    setProfileLoading(true);
    try {
      const ref = doc(db, "users", currentUser.uid);
      const snapshot = await getDoc(ref);
      const base = buildDefaultProfile(currentUser);
      const normalizeDate = (value) => {
        if (!value) return "";
        if (value instanceof Timestamp)
          return value.toDate().toISOString().slice(0, 10);
        if (typeof value === "string") return value;
        return "";
      };

      if (!snapshot.exists()) {
        await setDoc(ref, base);
        return {
          id: ref.id,
          ...base,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
      }

      const data = snapshot.data() || {};
      return {
        id: ref.id,
        email: data.email ?? base.email,
        displayName: data.displayName ?? base.displayName,
        phoneNumber:
          typeof data.phoneNumber === "string"
            ? data.phoneNumber.trim()
            : base.phoneNumber,
        birthday: normalizeDate(data.birthday) || base.birthday,
        photoURL: data.photoURL ?? base.photoURL,
        createdAt: data.createdAt ?? Timestamp.now(),
        updatedAt: data.updatedAt ?? Timestamp.now(),
      };
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser).then((profile) => setUserProfile(profile));
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchProfile]);

  const value = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      profileLoading,
      loginGoogle: async () => {
        if (!auth || !googleProvider) return rejectIfMissing();
        const credential = await signInWithPopup(auth, googleProvider);
        const currentUser = credential.user;
        const profile = await fetchProfile(currentUser);
        setUserProfile(profile);
        return credential;
      },
      loginEmail: async (email, password) => {
        if (!auth) return rejectIfMissing();
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const profile = await fetchProfile(credential.user);
        setUserProfile(profile);
        return credential;
      },
      registerEmail: async (email, password) => {
        if (!auth) return rejectIfMissing();
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        if (db) {
          const ref = doc(db, "users", credential.user.uid);
          await setDoc(ref, buildDefaultProfile(credential.user));
        }
        const profile = await fetchProfile(credential.user);
        setUserProfile(profile);
        return credential;
      },
      updateProfileData: async (payload = {}) => {
        ensureFirebase();
        const currentUser = auth.currentUser;
        if (!currentUser) return rejectIfMissing();

        const ref = doc(db, "users", currentUser.uid);
        const data = {
          ...payload,
          updatedAt: serverTimestamp(),
        };

        if (payload.displayName) {
          await updateProfile(currentUser, {
            displayName: payload.displayName,
          });
        }

        await setDoc(ref, data, { merge: true });

        const updatedSnapshot = await getDoc(ref);
        const updatedData = updatedSnapshot.data() || {};
        const normalizeDate = (value) => {
          if (!value) return "";
          if (value instanceof Timestamp)
            return value.toDate().toISOString().slice(0, 10);
          if (typeof value === "string") return value;
          return "";
        };
        const base = buildDefaultProfile(currentUser);
        setUserProfile((prev) => ({
          id: ref.id,
          email: updatedData.email ?? prev?.email ?? base.email,
          displayName:
            updatedData.displayName ?? prev?.displayName ?? base.displayName,
          phoneNumber:
            typeof updatedData.phoneNumber === "string"
              ? updatedData.phoneNumber.trim()
              : prev?.phoneNumber ?? base.phoneNumber,
          birthday:
            normalizeDate(updatedData.birthday) ||
            normalizeDate(prev?.birthday) ||
            base.birthday,
          photoURL: updatedData.photoURL ?? prev?.photoURL ?? base.photoURL,
          createdAt:
            updatedData.createdAt ?? prev?.createdAt ?? Timestamp.now(),
          updatedAt: updatedData.updatedAt ?? Timestamp.now(),
        }));
      },
      logout: async () => {
        if (!auth) return rejectIfMissing();
        return signOut(auth);
      },
      saveMovie: async (movie) => {
        const currentUser = ensureCurrentUser();
        if (!movie || !movie.slug)
          throw new Error("Thiếu thông tin phim để lưu.");

        const ref = doc(
          db,
          "users",
          currentUser.uid,
          "FavoriteMovies",
          movie.slug
        );
        const payload = {
          slug: movie.slug,
          name: movie.name || "Phim chưa đặt tên",
          poster_url: movie.poster_url || movie.thumb_url || "",
          year: movie.year || null,
          quality: movie.quality || null,
          lang: movie.lang || movie.language || null,
          type: movie.type || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(ref, payload, { merge: true });
        return true;
      },
      removeSavedMovie: async (slug) => {
        const currentUser = ensureCurrentUser();
        if (!slug) throw new Error("Thiếu slug phim cần xoá.");
        const ref = doc(db, "users", currentUser.uid, "FavoriteMovies", slug);
        await deleteDoc(ref);
        return true;
      },
    }),
    [user, loading, userProfile, profileLoading, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

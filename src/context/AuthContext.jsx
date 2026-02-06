import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  serverTimestamp,
  setDoc,
  updateDoc,
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
});

const rejectIfMissing = () => {
  throw new Error(
    "Firebase chưa được cấu hình. Kiểm tra các biến môi trường VITE_FIREBASE_*"
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const ensureFirebase = () => {
    if (!auth || !db) return rejectIfMissing();
    return true;
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

  const fetchProfile = async (currentUser) => {
    if (!currentUser || !db) return null;
    setProfileLoading(true);
    try {
      const ref = doc(db, "users", currentUser.uid);
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        const defaults = buildDefaultProfile(currentUser);
        await setDoc(ref, defaults);
        return {
          id: ref.id,
          ...defaults,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
      }

      const data = snapshot.data();
      return { id: ref.id, ...data };
    } finally {
      setProfileLoading(false);
    }
  };

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
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
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

        await updateDoc(ref, data);

        setUserProfile((prev) => ({
          ...(prev || {}),
          ...data,
          // Normalize possible Timestamp values when rendering
          updatedAt:
            data.updatedAt instanceof Timestamp
              ? data.updatedAt
              : Timestamp.now(),
        }));
      },
      logout: async () => {
        if (!auth) return rejectIfMissing();
        return signOut(auth);
      },
    }),
    [user, loading, userProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

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
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  isFirebaseConfigured,
  storage,
  adminAuth,
} from "../firebase.config";

const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: true,
  profileLoading: false,
  maintenance: { enabled: false, title: "", message: "", statusText: "" },
  loginGoogle: async () => { },
  loginEmail: async () => { },
  registerEmail: async () => { },
  updateProfileData: async () => { },
  uploadAvatar: async () => { },
  logout: async () => { },
  saveMovie: async () => { },
  removeSavedMovie: async () => { },
  createAccountByAdmin: async () => { },
  deleteUserByAdmin: async () => { },
  toggleMaintenanceMode: async () => { },
  toggleUserWhitelist: async () => { },
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
  isWhitelisted: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const ensureFirebase = useCallback(() => {
    if (!auth || !db) return rejectIfMissing();
    return true;
  }, []);

  const ensureCurrentUser = useCallback(() => {
    ensureFirebase();
    const currentUser = auth.currentUser;
    if (!currentUser)
      throw new Error("Bạn cần đăng nhập để lưu hoặc quản lý phim.");
    return currentUser;
  }, [ensureFirebase]);



  const [maintenance, setMaintenance] = useState({ enabled: false, title: "", message: "", statusText: "" });

  useEffect(() => {
    if (!db) return undefined;
    const ref = doc(db, "settings", "maintenance");
    const unsubscribe = onSnapshot(ref, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMaintenance({
          enabled: data.enabled === true,
          title: data.title || "BẢO TRÌ HỆ THỐNG",
          message: data.message || "Admin đang nghèo, ủng hộ Admin để duy trì website",
          statusText: data.statusText || "ĐANG NÂNG CẤP HỆ THỐNG",
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    let profileUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Cleanup previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (currentUser) {
        if (!db) {
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", currentUser.uid);
        
        // Use onSnapshot for real-time profile updates
        profileUnsubscribe = onSnapshot(userRef, async (snapshot) => {
          if (!snapshot.exists()) {
            const base = buildDefaultProfile(currentUser);
            await setDoc(userRef, base);
            // The snapshot listener will fire again with the new data
          } else {
            const data = snapshot.data();
            
            const normalizeDate = (value) => {
              if (!value) return "";
              if (value instanceof Timestamp)
                return value.toDate().toISOString().slice(0, 10);
              if (typeof value === "string") return value;
              return "";
            };

            const profile = {
              id: snapshot.id,
              email: data.email || currentUser.email,
              displayName: data.displayName || currentUser.displayName || "Người dùng",
              phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber.trim() : "",
              birthday: normalizeDate(data.birthday),
              isWhitelisted: data.isWhitelisted === true,
              photoURL: data.photoURL || currentUser.photoURL || "",
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now(),
            };
            setUserProfile(profile);
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile onSnapshot error:", error);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      profileLoading,
      maintenance,
      loginGoogle: async () => {
        if (!auth || !googleProvider) return rejectIfMissing();
        return signInWithPopup(auth, googleProvider);
      },
      loginEmail: async (email, password) => {
        if (!auth) return rejectIfMissing();
        return signInWithEmailAndPassword(auth, email, password);
      },
      registerEmail: async (email, password, displayName) => {
        if (!auth) return rejectIfMissing();
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        // Set displayName on Firebase Auth profile
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
        if (db) {
          const ref = doc(db, "users", credential.user.uid);
          const profileData = buildDefaultProfile(credential.user);
          if (displayName) profileData.displayName = displayName;
          await setDoc(ref, profileData);
        }
        return credential;
      },
      updateProfileData: async (data, timeoutMs = 15000) => {
        ensureFirebase();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Cần đăng nhập để cập nhật hồ sơ.");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Yêu cầu quá hạn (Timeout). Vui lòng kiểm tra kết nối mạng.")), timeoutMs)
        );

        try {
          console.log("Starting profile update with data:", data);
          const updateTask = (async () => {
            const userRef = doc(db, "users", currentUser.uid);

            if (data.displayName) {
              console.log("Updating displayName in Firebase Auth...");
              await updateProfile(currentUser, { displayName: data.displayName });
              console.log("Auth displayName updated.");
            }

            console.log("Updating Firestore document...");
            await setDoc(userRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
            console.log("Firestore document updated.");

            setUserProfile(prev => ({ ...prev, ...data }));
            return true;
          })();

          await Promise.race([updateTask, timeoutPromise]);
          console.log("Profile update successful.");
        } catch (error) {
          console.error("Profile update error:", error);
          throw error;
        }
      },
      logout: async () => {
        if (!auth) return rejectIfMissing();
        return signOut(auth);
      },
      uploadAvatar: async (file, maxWidth = 400, quality = 0.7) => {
        ensureFirebase();
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Cần đăng nhập để tải ảnh lên.");

        try {
          console.log("Processing image for Firestore storage (Base64)...");

          // Image Resizing/Compression utility
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
              const img = new Image();
              img.src = event.target.result;
              img.onload = () => {
                const canvas = document.createElement("canvas");
                // Maintain aspect ratio, max width 400px
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                  height = (maxWidth / width) * height;
                  width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to compressed jpeg
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
              };
              img.onerror = reject;
            };
            reader.onerror = reject;
          });

          console.log("Image compressed. Base64 length:", base64.length);
          if (base64.length > 800000) { // Safety check for Firestore (~0.8MB)
            throw new Error("Ảnh quá lớn ngay cả khi đã nén. Vui lòng chọn ảnh nhỏ hơn.");
          }

          console.log("Updating Firestore document only (Auth has 2048 char limit)...");
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, { photoURL: base64, updatedAt: serverTimestamp() }, { merge: true });
          console.log("Firestore document updated.");

          setUserProfile(prev => ({ ...prev, photoURL: base64 }));
          console.log("Profile updated successfully with Base64 in Firestore.");
          return base64;
        } catch (error) {
          console.error("Firestore Avatar Error:", error);
          throw error;
        }
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
      createAccountByAdmin: async (email, password, displayName) => {
        if (!adminAuth) throw new Error("AdminAuth chưa được cấu hình.");
        // Use secondary auth to avoid signing out the current admin
        const credential = await createUserWithEmailAndPassword(
          adminAuth,
          email,
          password
        );
        const newUser = credential.user;
        
        if (displayName) {
          await updateProfile(newUser, { displayName });
        }

        if (db) {
          const userRef = doc(db, "users", newUser.uid);
          const profileData = buildDefaultProfile(newUser);
          if (displayName) profileData.displayName = displayName;
          await setDoc(userRef, profileData);
        }
        
        // Return the new user info but don't switch context
        return credential;
      },
      deleteUserByAdmin: async (userId) => {
        if (!db) return;
        const ref = doc(db, "users", userId);
        await deleteDoc(ref);
        return true;
      },
      toggleMaintenanceMode: async (enabled) => {
        if (!db) return;
        const ref = doc(db, "settings", "maintenance");
        await setDoc(ref, { enabled: enabled, updatedAt: serverTimestamp() }, { merge: true });
      },
      toggleUserWhitelist: async (userId, whitelisted) => {
        if (!db) return;
        const ref = doc(db, "users", userId);
        await updateDoc(ref, { isWhitelisted: whitelisted, updatedAt: serverTimestamp() });
      },
    }),
    [
      user,
      loading,
      userProfile,
      profileLoading,
      createAccountByAdmin,
      deleteUserByAdmin,
      toggleMaintenanceMode,
      toggleUserWhitelist,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

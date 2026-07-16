import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

let firebaseSdkPromise = null;

const loadFirebaseSdk = () => {
  if (firebaseSdkPromise) return firebaseSdkPromise;
  firebaseSdkPromise = Promise.all([
    import('@/firebase.config.js'),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]).then(([config, authMod, firestoreMod]) => ({
    config,
    authMod,
    firestoreMod,
  }));
  return firebaseSdkPromise;
};

const awaitAuthStateInit = async (authMod, auth) => {
  if (!authMod?.onAuthStateChanged || !auth) return;
  if (auth.currentUser) return;
  await new Promise((resolve) => {
    const unsubscribe = authMod.onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
};

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
  saveComic: async () => { },
  removeSavedComic: async () => { },
  createAccountByAdmin: async () => { },
  deleteUserByAdmin: async () => { },
  toggleMaintenanceMode: async () => { },
  toggleUserWhitelist: async () => { },
  markAnnouncementAsRead: async () => { },
});

const rejectIfMissing = () => {
  throw new Error(
    "Firebase chưa được cấu hình. Kiểm tra các biến môi trường VITE_FIREBASE_*"
  );
};

const buildDefaultProfile = (currentUser, serverTimestamp) => ({
  email: currentUser.email,
  displayName: currentUser.displayName || "Người dùng",
  phoneNumber: currentUser.phoneNumber || "",
  birthday: "",
  photoURL: currentUser.photoURL || "",
  isWhitelisted: false,
  readAnnouncements: [],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const ensureCurrentUser = useCallback(async () => {
    const { config, authMod } = await loadFirebaseSdk();
    if (!config.auth || !config.db) return rejectIfMissing();
    await awaitAuthStateInit(authMod, config.auth);
    const currentUser = config.auth.currentUser;
    if (!currentUser)
      throw new Error("Bạn cần đăng nhập để lưu hoặc quản lý phim.");
    return currentUser;
  }, []);

  const [maintenance, setMaintenance] = useState({
    enabled: false,
    title: "",
    message: "",
    statusText: "",
    isLoaded: false,
  });

  const firebaseStartedRef = useRef(false);
  const cleanup = useRef({
    unsubscribeAuth: null,
    profileUnsubscribe: null,
    maintenanceUnsubscribe: null,
  }).current;

  const startFirebaseListeners = useCallback(async () => {
    if (firebaseStartedRef.current) return;
    firebaseStartedRef.current = true;
    setLoading(true);

    try {
      const { config, authMod, firestoreMod } = await loadFirebaseSdk();

      if (!config.isFirebaseConfigured || !config.auth) {
        setMaintenance((prev) => ({ ...prev, isLoaded: true }));
        setLoading(false);
        return;
      }

      if (config.db) {
        const maintenanceRef = firestoreMod.doc(
          config.db,
          "settings",
          "maintenance"
        );
        cleanup.maintenanceUnsubscribe = firestoreMod.onSnapshot(
          maintenanceRef,
          (snap) => {
            if (!snap.exists()) {
              setMaintenance((prev) => ({ ...prev, isLoaded: true }));
              return;
            }
            const data = snap.data();
            setMaintenance({
              enabled: data.enabled === true,
              title: data.title || "BẢO TRÌ HỆ THỐNG",
              message:
                data.message ||
                "Admin đang nghèo, ủng hộ Admin để duy trì website",
              statusText: data.statusText || "ĐANG NÂNG CẤP HỆ THỐNG",
              isLoaded: true,
            });
          }
        );
      }

      cleanup.unsubscribeAuth = authMod.onAuthStateChanged(
        config.auth,
        async (currentUser) => {
          setUser(currentUser);

          if (cleanup.profileUnsubscribe) {
            cleanup.profileUnsubscribe();
            cleanup.profileUnsubscribe = null;
          }

          if (!currentUser) {
            setUserProfile(null);
            setProfileLoading(false);
            setLoading(false);
            return;
          }

          if (!config.db) {
            setProfileLoading(false);
            setLoading(false);
            return;
          }

          setProfileLoading(true);
          const userRef = firestoreMod.doc(config.db, "users", currentUser.uid);

          cleanup.profileUnsubscribe = firestoreMod.onSnapshot(
            userRef,
            async (snapshot) => {
              if (!snapshot.exists()) {
                const base = buildDefaultProfile(
                  currentUser,
                  firestoreMod.serverTimestamp
                );
                await firestoreMod.setDoc(userRef, base);
                return;
              }

              const data = snapshot.data();
              const { Timestamp } = firestoreMod;
              const normalizeDate = (value) => {
                if (!value) return "";
                if (Timestamp && value instanceof Timestamp)
                  return value.toDate().toISOString().slice(0, 10);
                if (typeof value === "string") return value;
                return "";
              };

              const profile = {
                id: snapshot.id,
                email: data.email || currentUser.email,
                displayName:
                  data.displayName || currentUser.displayName || "Người dùng",
                phoneNumber:
                  typeof data.phoneNumber === "string"
                    ? data.phoneNumber.trim()
                    : "",
                birthday: normalizeDate(data.birthday),
                isWhitelisted: data.isWhitelisted === true,
                readAnnouncements: data.readAnnouncements || [],
                photoURL: data.photoURL || currentUser.photoURL || "",
                createdAt:
                  data.createdAt || (Timestamp ? Timestamp.now() : undefined),
                updatedAt:
                  data.updatedAt || (Timestamp ? Timestamp.now() : undefined),
              };
              setUserProfile(profile);
              setProfileLoading(false);
              setLoading(false);
            },
            (error) => {
              console.error("Profile onSnapshot error:", error);
              setProfileLoading(false);
              setLoading(false);
            }
          );
        }
      );
    } catch (err) {
      console.error("Firebase auth init failed:", err);
      setMaintenance((prev) => ({ ...prev, isLoaded: true }));
      setLoading(false);
    }
  }, [cleanup]);

  useEffect(() => {
    return () => {
      if (typeof cleanup.unsubscribeAuth === "function") {
        cleanup.unsubscribeAuth();
      }
      if (typeof cleanup.profileUnsubscribe === "function") {
        cleanup.profileUnsubscribe();
      }
      if (typeof cleanup.maintenanceUnsubscribe === "function") {
        cleanup.maintenanceUnsubscribe();
      }
    };
  }, [cleanup]);

  useEffect(() => {
    startFirebaseListeners();
  }, [startFirebaseListeners]);

  const value = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      profileLoading,
      maintenance,
      loginGoogle: async () => {
        const { config, authMod } = await loadFirebaseSdk();
        if (!config.auth || !config.googleProvider) return rejectIfMissing();
        return authMod.signInWithPopup(config.auth, config.googleProvider);
      },
      loginEmail: async (email, password) => {
        const { config, authMod } = await loadFirebaseSdk();
        if (!config.auth) return rejectIfMissing();
        return authMod.signInWithEmailAndPassword(config.auth, email, password);
      },
      registerEmail: async (email, password, displayName) => {
        const { config, authMod, firestoreMod } = await loadFirebaseSdk();
        if (!config.auth) return rejectIfMissing();
        const credential = await authMod.createUserWithEmailAndPassword(
          config.auth,
          email,
          password
        );
        // Set displayName on Firebase Auth profile
        if (displayName) {
          await authMod.updateProfile(credential.user, { displayName });
        }
        if (config.db) {
          const ref = firestoreMod.doc(config.db, "users", credential.user.uid);
          const profileData = buildDefaultProfile(
            credential.user,
            firestoreMod.serverTimestamp
          );
          if (displayName) profileData.displayName = displayName;
          await firestoreMod.setDoc(ref, profileData);
        }
        return credential;
      },
      updateProfileData: async (data, timeoutMs = 15000) => {
        const { config, authMod, firestoreMod } = await loadFirebaseSdk();
        if (!config.auth || !config.db) return rejectIfMissing();
        await awaitAuthStateInit(authMod, config.auth);
        const currentUser = config.auth.currentUser;
        if (!currentUser) throw new Error("Cần đăng nhập để cập nhật hồ sơ.");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Yêu cầu quá hạn (Timeout). Vui lòng kiểm tra kết nối mạng."
                )
              ),
            timeoutMs
          )
        );

        try {
          console.log("Starting profile update with data:", data);
          const updateTask = (async () => {
            const userRef = firestoreMod.doc(
              config.db,
              "users",
              currentUser.uid
            );

            if (data.displayName) {
              console.log("Updating displayName in Firebase Auth...");
              await authMod.updateProfile(currentUser, {
                displayName: data.displayName,
              });
              console.log("Auth displayName updated.");
            }

            console.log("Updating Firestore document...");
            await firestoreMod.setDoc(
              userRef,
              { ...data, updatedAt: firestoreMod.serverTimestamp() },
              { merge: true }
            );
            console.log("Firestore document updated.");

            setUserProfile((prev) => ({ ...prev, ...data }));
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
        const { config, authMod } = await loadFirebaseSdk();
        if (!config.auth) return rejectIfMissing();
        return authMod.signOut(config.auth);
      },
      uploadAvatar: async (file, maxWidth = 400, quality = 0.7) => {
        const { config, authMod, firestoreMod } = await loadFirebaseSdk();
        if (!config.auth || !config.db) return rejectIfMissing();
        await awaitAuthStateInit(authMod, config.auth);
        const currentUser = config.auth.currentUser;
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
          if (base64.length > 800000) {
            // Safety check for Firestore (~0.8MB)
            throw new Error(
              "Ảnh quá lớn ngay cả khi đã nén. Vui lòng chọn ảnh nhỏ hơn."
            );
          }

          console.log(
            "Updating Firestore document only (Auth has 2048 char limit)..."
          );
          const userRef = firestoreMod.doc(config.db, "users", currentUser.uid);
          await firestoreMod.setDoc(
            userRef,
            { photoURL: base64, updatedAt: firestoreMod.serverTimestamp() },
            { merge: true }
          );
          console.log("Firestore document updated.");

          setUserProfile((prev) => ({ ...prev, photoURL: base64 }));
          console.log("Profile updated successfully with Base64 in Firestore.");
          return base64;
        } catch (error) {
          console.error("Firestore Avatar Error:", error);
          throw error;
        }
      },
      saveMovie: async (movie) => {
        if (!movie || !movie.slug)
          throw new Error("Thiếu thông tin phim để lưu.");
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db || !config.auth) return rejectIfMissing();
        const currentUser = await ensureCurrentUser();

        const ref = firestoreMod.doc(
          config.db,
          "users",
          currentUser.uid,
          "FavoriteMovies",
          movie.slug
        );
        const payload = {
          slug: movie.slug,
          name: movie.name || "Phim chưa đặt tên",
          origin_name: movie.origin_name || "",
          poster_url: movie.poster_url || movie.thumb_url || "",
          thumb_url: movie.thumb_url || movie.poster_url || "",
          year: movie.year || null,
          quality: movie.quality || null,
          lang: movie.lang || movie.language || null,
          type: movie.type || null,
          episode_current: movie.episode_current || null,
          episode_total: movie.episode_total || null,
          content: (movie.content || "").slice(0, 300) || null,
          createdAt: firestoreMod.serverTimestamp(),
          updatedAt: firestoreMod.serverTimestamp(),
        };

        await firestoreMod.setDoc(ref, payload, { merge: true });
        return true;
      },
      removeSavedMovie: async (slug) => {
        if (!slug) throw new Error("Thiếu slug phim cần xoá.");
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db || !config.auth) return rejectIfMissing();
        const currentUser = await ensureCurrentUser();
        const ref = firestoreMod.doc(
          config.db,
          "users",
          currentUser.uid,
          "FavoriteMovies",
          slug
        );
        await firestoreMod.deleteDoc(ref);
        return true;
      },
      saveComic: async (comic) => {
        if (!comic || !comic.slug)
          throw new Error("Thiếu thông tin truyện để lưu.");
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db || !config.auth) return rejectIfMissing();
        const currentUser = await ensureCurrentUser();

        const ref = firestoreMod.doc(
          config.db,
          "users",
          currentUser.uid,
          "FavoriteComics",
          comic.slug
        );

        // Extract necessary fields for card display, handling both API detail and card-like objects
        const payload = {
          slug: comic.slug,
          name: comic.name || comic.origin_name || "Truyện không tên",
          thumb_url: comic.thumb_url || comic.poster_url || "",
          status: comic.status || null,
          category: comic.category || null,
          author: comic.author || null,
          updatedAt: comic.updatedAt || firestoreMod.serverTimestamp(),
          // Store latest chapter if available
          chaptersLatest: comic.chapters?.[0]?.server_data?.length > 0
            ? [{ chapter_name: comic.chapters[0].server_data[comic.chapters[0].server_data.length - 1].chapter_name }]
            : (Array.isArray(comic.chaptersLatest) ? comic.chaptersLatest : []),
          createdAt: firestoreMod.serverTimestamp(),
        };

        console.log("Saving comic to Firestore:", payload);
        await firestoreMod.setDoc(ref, payload, { merge: true });
        return true;
      },
      removeSavedComic: async (slug) => {
        if (!slug) throw new Error("Thiếu slug truyện cần xoá.");
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db || !config.auth) return rejectIfMissing();
        const currentUser = await ensureCurrentUser();
        const ref = firestoreMod.doc(
          config.db,
          "users",
          currentUser.uid,
          "FavoriteComics",
          slug
        );
        await firestoreMod.deleteDoc(ref);
        return true;
      },
      createAccountByAdmin: async (email, password, displayName) => {
        const [{ config, authMod, firestoreMod }, { initializeApp, getAuth }] = await Promise.all([
          loadFirebaseSdk(),
          import("firebase/app")
        ]);
        
        // Initialize AdminApp on demand to save initial bundle size
        const adminApp = initializeApp(config.firebaseConfig, "AdminApp_" + Date.now());
        const adminAuth = getAuth(adminApp);

        // Use secondary auth to avoid signing out the current admin
        const credential = await authMod.createUserWithEmailAndPassword(
          adminAuth,
          email,
          password
        );

        const newUser = credential.user;

        if (displayName) {
          await authMod.updateProfile(newUser, { displayName });
        }

        if (config.db) {
          const userRef = firestoreMod.doc(config.db, "users", newUser.uid);
          const profileData = buildDefaultProfile(
            newUser,
            firestoreMod.serverTimestamp
          );
          if (displayName) profileData.displayName = displayName;
          await firestoreMod.setDoc(userRef, profileData);
        }

        // Return the new user info but don't switch context
        return credential;
      },
      deleteUserByAdmin: async (userId) => {
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db) return;
        const ref = firestoreMod.doc(config.db, "users", userId);
        await firestoreMod.deleteDoc(ref);
        return true;
      },
      toggleMaintenanceMode: async (enabled) => {
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db) return;
        const ref = firestoreMod.doc(config.db, "settings", "maintenance");
        await firestoreMod.setDoc(
          ref,
          { enabled: enabled, updatedAt: firestoreMod.serverTimestamp() },
          { merge: true }
        );
      },
      toggleUserWhitelist: async (userId, whitelisted) => {
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db) return;
        const ref = firestoreMod.doc(config.db, "users", userId);
        await firestoreMod.updateDoc(ref, {
          isWhitelisted: whitelisted,
          updatedAt: firestoreMod.serverTimestamp(),
        });
      },
      markAnnouncementAsRead: async (announcementId) => {
        const { config, firestoreMod } = await loadFirebaseSdk();
        if (!config.db) return;
        const currentUser = await ensureCurrentUser();
        const userRef = firestoreMod.doc(config.db, "users", currentUser.uid);
        
        await firestoreMod.updateDoc(userRef, {
          readAnnouncements: firestoreMod.arrayUnion(announcementId),
          updatedAt: firestoreMod.serverTimestamp(),
        });
        
        setUserProfile((prev) => ({
          ...prev,
          readAnnouncements: [...(prev?.readAnnouncements || []), announcementId],
        }));
      },
    }),
    [user, loading, userProfile, profileLoading, maintenance, ensureCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => use(AuthContext);

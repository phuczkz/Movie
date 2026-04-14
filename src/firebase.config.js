import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * LƯU Ý BẢO MẬT FIREBASE:
 * 
 * 1. Hiển thị Khóa API: Trong ứng dụng Vite/React (phía client), API key của Firebase 
 *    BẮT BUỘC phải xuất hiện trong gói code để SDK có thể định danh dự án của bạn.
 *    Đây là điều HOÀN TOÀN BÌNH THƯỜNG và được thiết kế bởi Google.
 * 
 * 2. Cách bảo mật: "Bí mật" KHÔNG nằm ở API Key. Bảo mật được thực thi thông qua:
 *    - Firebase Console > Auth > Settings > Authorized Domains (Thêm domain sản phẩm của bạn vào đây)
 *    - Firebase Console > Cloud Firestore/Storage > Rules (Định nghĩa ai có quyền đọc/ghi)
 * 
 * 3. Biến môi trường: Chúng ta sử dụng import.meta.env để thuận tiện, nhưng Vite 
 *    sẽ thay thế chúng bằng các chuỗi ký tự thực tế trong quá trình đóng gói.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if we have the configuration
export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey) && 
  Boolean(firebaseConfig.projectId);

const app =
  isFirebaseConfigured && !getApps().length
    ? initializeApp(firebaseConfig)
    : getApps().length
    ? getApp()
    : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export const db = app ? getFirestore(app) : null;

// Secondary Firebase app for administrative tasks (like creating users)
// Note: This relies on Security Rules for actual permission control.
export const adminApp = isFirebaseConfigured
  ? initializeApp(firebaseConfig, "AdminApp")
  : null;
export const adminAuth = adminApp ? getAuth(adminApp) : null;


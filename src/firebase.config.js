import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

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

// Auth and DB are initialized on demand or shared across the app
export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export const db = app
  ? initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    })
  : null;


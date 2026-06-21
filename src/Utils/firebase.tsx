import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(
  typeof process.env.NEXT_PUBLIC_FB_API_KEY === "string" &&
  process.env.NEXT_PUBLIC_FB_API_KEY.trim().length > 0,
);

function createFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

export const app = createFirebaseApp();
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const provider = new GoogleAuthProvider();

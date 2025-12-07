// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";

if (typeof window === 'undefined') {
  // Fix for "TypeError: localStorage.getItem is not a function"
  // Some dependency is polluting the global scope with a broken localStorage object (object with no methods).
  // We detect this and remove it so libraries fall back to their safe server-side behavior.
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem !== 'function') {
    console.warn('Detected broken global localStorage on server. Removing it to prevent crashes.');
    try {
      // @ts-ignore
      delete global.localStorage;
    } catch (e) {
      console.error('Failed to delete broken localStorage:', e);
    }
  }
}
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration is read from environment variables
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence settings
import { initializeAuth, browserLocalPersistence, inMemoryPersistence } from "firebase/auth";

const auth = initializeAuth(app, {
  persistence: typeof window === "undefined" ? inMemoryPersistence : browserLocalPersistence,
});

const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, auth, db, storage, functions };

import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = [
  ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["VITE_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
  ["VITE_FIREBASE_MESSAGING_SENDER_ID", firebaseConfig.messagingSenderId],
  ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
] as const;

const missingKeys = requiredConfig
  .filter(([, value]) => !value || String(value).trim().length === 0 || String(value).startsWith("your_"))
  .map(([key]) => key);

export const ADMIN_EMAIL = "seigendc@gmail.com";
const missingConfigError = missingKeys.length > 0 ? `Missing Firebase environment values: ${missingKeys.join(", ")}` : "";
let activeApp: FirebaseApp | undefined;
let activeAuth: Auth | undefined;
let activeDb: Firestore | undefined;
let activeStorage: FirebaseStorage | undefined;
let initError = "";

if (!missingConfigError) {
  try {
    activeApp = initializeApp(firebaseConfig);
    activeAuth = getAuth(activeApp);
    activeDb = getFirestore(activeApp);
    activeStorage = getStorage(activeApp);
  } catch (error) {
    activeApp = undefined;
    activeAuth = undefined;
    activeDb = undefined;
    activeStorage = undefined;
    initError = error instanceof Error ? error.message : "Firebase could not initialize.";
  }
}

export const firebaseConfigError = missingConfigError || initError;
export const isFirebaseConfigured = Boolean(activeApp) && !firebaseConfigError;
export const app = activeApp as FirebaseApp;
export const auth = activeAuth as Auth;
export const googleProvider = new GoogleAuthProvider();
export const db = activeDb as Firestore;
export const storage = activeStorage as FirebaseStorage;

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "seedstreet-app",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:425883713028:web:b1d79dd4ae414771fd0b79",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBewBW-Z9P5HtcUTsLvmEn0aZtBjwvD68I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "seedstreet-app.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "seedstreet-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "425883713028",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, dbId);

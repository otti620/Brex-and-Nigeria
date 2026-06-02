import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "brex-app",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:425883713028:web:b1d79dd4ae414771fd0b79",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBewBW-Z9P5HtcUTsLvmEn0aZtBjwvD68I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "brex-app.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "brex-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "425883713028",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";

const isConfigured = !!(config.apiKey && config.projectId && config.appId);

let app: any;
let auth: any;
let db: any;

if (isConfigured) {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app, dbId);
    
    // Connection validation as per firebase-integration skill
    const testConnection = async () => {
      try {
        const { doc, getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, '_health_check', 'ping')).catch((err) => {
          console.log("Firestore connection check: operating in offline/sandbox mode.", err.message);
        });
      } catch (error: any) {
        console.log("Firestore health check ignored:", error.message);
      }
    };
    testConnection();
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase is not configured. Please set the VITE_FIREBASE_* environment variables.");
}

export { app, auth, db, isConfigured, config };

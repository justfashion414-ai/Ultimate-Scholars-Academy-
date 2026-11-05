import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

import appletConfig from "../../firebase-applet-config.json";

// Check if real Firebase configurations are provided
const isFirebaseConfigured = true;

// Public Firebase client config - safe to bundle client-side
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || appletConfig.apiKey || "",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || "",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || "",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || "",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || "",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || appletConfig.appId || ""
};

const databaseId = (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || "ai-studio-scholarsacademyg-ebf73b95-53a0-4ed1-9ffc-b16f8e56a9cc";

const app = initializeApp(firebaseConfig);

// Initialize Firestore with local persistent IndexedDB cache and multi-tab management
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

const auth = getAuth(app);

// Verify the Firestore connection as per skill guidelines
async function testConnection() {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase Firestore connected successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration or internet connection.");
    } else {
      console.log("Firestore connection test completed.");
    }
  }
}

testConnection();

export { app, db, auth, isFirebaseConfigured };

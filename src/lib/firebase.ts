import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Check if real Firebase configurations are provided
const isFirebaseConfigured = !!((import.meta as any).env.VITE_FIREBASE_API_KEY);

// Public Firebase client config - safe to bundle client-side
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0955896565.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0955896565",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0955896565.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "639435262599",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:639435262599:web:ceadda9fc35fac46afc622"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with local persistent IndexedDB cache and multi-tab management
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, "ai-studio-scholarsacademyg-ebf73b95-53a0-4ed1-9ffc-b16f8e56a9cc");

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

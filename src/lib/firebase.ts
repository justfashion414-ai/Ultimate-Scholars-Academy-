import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Public Firebase client config - safe to bundle client-side
const firebaseConfig = {
  apiKey: "AIzaSyD7nZn2gqqhsZXVoiaWNuqwE_ifCAuaYWg",
  authDomain: "gen-lang-client-0955896565.firebaseapp.com",
  projectId: "gen-lang-client-0955896565",
  storageBucket: "gen-lang-client-0955896565.firebasestorage.app",
  messagingSenderId: "639435262599",
  appId: "1:639435262599:web:ceadda9fc35fac46afc622"
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

export { app, db, auth };

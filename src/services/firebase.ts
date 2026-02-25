import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

// IMPORTANT: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let db = null;

try {
  // Check if config is valid (at least apiKey and projectId are required)
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID environment variables.');
  } else {
    // Initialize Firebase only if config is valid
    app = initializeApp(firebaseConfig);
    // Get a Firestore instance
    db = getFirestore(app);
    console.log('Firebase Initialized. Project ID:', firebaseConfig.projectId);
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export { db, app };

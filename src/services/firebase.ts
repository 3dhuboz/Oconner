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

let app;
let db: Firestore;

try {
  // Check if config is valid (at least apiKey and projectId are required)
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID environment variables.');
    // Initialize with dummy config to prevent crash, but Firebase won't work
    // Or better, don't initialize and let db be undefined/mock?
    // If we don't initialize, getFirestore throws.
    // Let's throw a custom error that can be caught? No, top level throw crashes.
    // We'll initialize a dummy app if needed, but that might fail connection.
    // Better to just log and let it fail later or provide a mock.
  }
  
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Get a Firestore instance
  db = getFirestore(app);
  
  console.log('Firebase Initialized. Project ID:', firebaseConfig.projectId);
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  // Provide a dummy db object or re-throw?
  // If we re-throw, app crashes.
  // If we don't, db is undefined.
  // We can export db as potentially undefined, but that breaks types.
  // Let's cast it, but it will crash on usage.
  // But usage is inside components (useEffect), so ErrorBoundary might catch it!
  db = {} as Firestore; 
}

export { db };

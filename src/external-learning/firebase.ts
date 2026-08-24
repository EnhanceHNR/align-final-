
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  memoryLocalCache
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDpp9VLSPjpvFhv8PcrjfoQUDZE_mckVvU",
  authDomain: "studio-3524371045-b11af.firebaseapp.com",
  projectId: "studio-3524371045-b11af",
  storageBucket: "studio-3524371045-b11af.firebasestorage.app",
  messagingSenderId: "1065356021023",
  appId: "1:1065356021023:web:b4b4584d5b4bfa4b1a342a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

/**
 * Custom Firestore Initialization:
 * 1. Enables experimentalForceLongPolling to resolve "Could not reach Cloud Firestore backend" 
 *    errors which often occur when WebSockets are blocked or unstable.
 * 2. Enables persistentLocalCache to allow the app to work offline and load faster.
 */
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
});

const storage = getStorage(app);

export { auth, db, storage };

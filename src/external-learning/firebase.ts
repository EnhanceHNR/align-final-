
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  memoryLocalCache
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyAO24wkvq0CcupNxwHanrTa8tbWWVQW0Is",
  authDomain: "inventory-and-labtrk-957-b97b0.firebaseapp.com",
  databaseURL: "https://inventory-and-labtrk-957-b97b0-default-rtdb.firebaseio.com",
  projectId: "inventory-and-labtrk-957-b97b0",
  storageBucket: "inventory-and-labtrk-957-b97b0.firebasestorage.app",
  messagingSenderId: "312066085011",
  appId: "1:312066085011:web:8381920b8d49a150287d66"
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

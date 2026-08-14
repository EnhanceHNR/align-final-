import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export { FieldValue };

let app: App | undefined;

try {
  // Check if the default app is already initialized
  const apps = getApps();
  app = apps.find(a => a.name === '[DEFAULT]');

  if (!app) {
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
      
      // Fix private key formatting if it has escaped newlines
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else {
      // In production, initialize with default credentials
      app = initializeApp({
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  }
} catch (error) {
  console.error('Firebase Admin init error:', error);
}

let authInstance = null as any;
let dbInstance = null as any;
let storageInstance = null as any;

if (app) {
  try {
    authInstance = getAuth(app);
  } catch (error) {
    console.error('Firebase Admin Auth init error:', error);
  }
  
  try {
    dbInstance = getFirestore(app);
  } catch (error) {
    console.error('Firebase Admin Firestore init error:', error);
  }
  
  try {
    storageInstance = getStorage(app);
  } catch (error) {
    console.error('Firebase Admin Storage init error:', error);
  }
}

export const adminAuth = authInstance;
export const adminDb = dbInstance;
export const adminStorage = storageInstance;

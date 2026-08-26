import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

function initFirebaseAdmin() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-3524371045-b11af.firebasestorage.app';

  if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = typeof process.env.GCP_SERVICE_ACCOUNT_KEY === 'string' && process.env.GCP_SERVICE_ACCOUNT_KEY.startsWith('{') 
        ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY) 
        : process.env.GCP_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket
    });
  }

  return initializeApp({ storageBucket });
}

const app = initFirebaseAdmin();

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app);

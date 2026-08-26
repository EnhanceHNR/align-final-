import * as admin from 'firebase-admin';

function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = typeof process.env.GCP_SERVICE_ACCOUNT_KEY === 'string' && process.env.GCP_SERVICE_ACCOUNT_KEY.startsWith('{') 
          ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY) 
          : process.env.GCP_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-3524371045-b11af.firebasestorage.app'
      });
    }

    return admin.initializeApp({
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-3524371045-b11af.firebasestorage.app'
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    // Return existing app if it somehow got created during the race condition
    if (admin.apps.length > 0) {
      return admin.app();
    }
    throw error;
  }
}

const app = initFirebaseAdmin();

export const adminDb = app.firestore();
export const adminAuth = app.auth();
export default admin;
export const adminStorage = app.storage();

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-3524371045-b11af.firebasestorage.app';
        if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket
            });
        } else if (process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID || 'studio-3524371045-b11af',
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
                storageBucket
            });
        } else {
            admin.initializeApp({ storageBucket });
        }
    } catch (error: any) {
        console.error('Firebase admin initialization error', error.stack);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;

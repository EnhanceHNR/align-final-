const fs = require('fs');

const code = `import * as admin from 'firebase-admin';

// In Next.js, files can be executed multiple times. 
// We must cache the initialized admin instance on the global object.
const globalAny: any = global;

if (!globalAny.firebaseAdminInitialized) {
    if (!admin.apps.length) {
        try {
            const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-3524371045-b11af.firebasestorage.app';
            
            if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
                const serviceAccount = typeof process.env.GCP_SERVICE_ACCOUNT_KEY === 'string' && process.env.GCP_SERVICE_ACCOUNT_KEY.startsWith('{') 
                    ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY) 
                    : process.env.GCP_SERVICE_ACCOUNT_KEY;
                
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
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
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\\n'),
                    }),
                    storageBucket
                });
            } else {
                admin.initializeApp({ storageBucket });
            }
        } catch (error: any) {
            console.error('Firebase admin initialization error', error.stack);
            if (!admin.apps.length) {
                admin.initializeApp();
            }
        }
    }
    globalAny.firebaseAdminInitialized = true;
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
`;

fs.writeFileSync('src/lib/firebaseAdmin.ts', code);

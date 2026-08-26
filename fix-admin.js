const fs = require('fs');
let code = fs.readFileSync('src/lib/firebaseAdmin.ts', 'utf8');

code = code.replace(
    /if \(!admin\.apps\.length\) \{([\s\S]*?)export const adminDb/m,
    `if (!admin.apps.length) {
    try {
        const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-3524371045-b11af.firebasestorage.app';
        
        // If running in Google Cloud (Cloud Functions/Cloud Run), use ADC
        if (process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.FUNCTIONS_EMULATOR) {
            admin.initializeApp({ storageBucket });
        }
        else if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
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
        // Fallback initialize to avoid "Default app does not exist" crashes
        if (!admin.apps.length) {
            admin.initializeApp();
        }
    }
}

export const adminDb`
);

fs.writeFileSync('src/lib/firebaseAdmin.ts', code);

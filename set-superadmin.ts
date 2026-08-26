import 'dotenv/config';
import { adminDb } from './src/lib/firebaseAdmin';

async function makeSuperAdmin(email: string) {
    console.log(`Setting ${email} to Super Admin...`);
    const snapshot = await adminDb.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
    
    if (snapshot.empty) {
        console.error("User not found!");
        return;
    }
    
    const docRef = snapshot.docs[0].ref;
    await docRef.update({ isSuperAdmin: true });
    console.log(`Successfully made ${email} a Super Admin!`);
    process.exit(0);
}

// User's email from the logs earlier
makeSuperAdmin('enhancetech001@gmail.com');

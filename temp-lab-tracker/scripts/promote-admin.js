const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : null;

if (!serviceAccount) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env');
  console.log('Please add your Service Account JSON (as a string) to your .env file first.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/promote-admin.js <email>');
  process.exit(1);
}

async function promote() {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      console.error(`No user found with email: ${email}`);
      console.log('Make sure the user has signed up or exists in the database first.');
      process.exit(1);
    }

    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({ role: 'admin' });

    console.log(`Success! User ${email} (UID: ${userDoc.id}) has been promoted to ADMIN.`);
    process.exit(0);
  } catch (error) {
    console.error('Promotion error:', error);
    process.exit(1);
  }
}

promote();

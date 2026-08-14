const admin = require('firebase-admin');
const serviceAccount = require('./firebase-blueprint.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('submissions').orderBy('createdAt', 'desc').limit(5).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Doc ID: ${doc.id}`);
    console.log(`Selfie URL: ${data.senderSelfieUrl}`);
    console.log(`Photo URL: ${data.photoUrl}`);
    console.log(`Delivery URL: ${data.deliveryPersonPhotoUrl}`);
    console.log('---');
  });
}

check().catch(console.error);

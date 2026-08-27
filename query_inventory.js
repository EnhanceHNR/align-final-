const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const snapshot = await db.collection('inventoryItems').get();
  snapshot.docs.forEach(doc => {
    console.log(`ID: ${doc.id}, Name: ${doc.data().name}`);
  });
}
run();

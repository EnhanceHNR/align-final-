const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
  const app = initializeApp({});
  console.log('App initialized');
  const db = getFirestore(app);
  console.log('Firestore initialized');
} catch (e) {
  console.error('Caught error:', e);
}

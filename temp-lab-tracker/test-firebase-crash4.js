const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');

process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "studio-3524371045-b11af",
  storageBucket: "studio-3524371045-b11af.firebasestorage.app",
  locationId: "us-central"
});

try {
  const app = initializeApp();
  console.log("App initialized successfully.");
  const auth = getAuth(app);
  console.log("Auth initialized successfully.");
  const firestore = getFirestore(app);
  console.log("Firestore initialized successfully.");
} catch (e) {
  console.error("Crash!", e);
}

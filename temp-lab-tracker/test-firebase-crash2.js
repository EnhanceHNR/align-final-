const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: undefined,
  authDomain: undefined,
  projectId: "studio-3524371045-b11af"
};

try {
  console.log("Initializing app...");
  const app = initializeApp(firebaseConfig);
  console.log("App initialized successfully.");
  console.log("Initializing auth...");
  const auth = getAuth(app);
  console.log("Auth initialized successfully.");
  console.log("Initializing firestore...");
  const firestore = getFirestore(app);
  console.log("Firestore initialized successfully.");
} catch (e) {
  console.error("Crash!", e);
}

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: undefined,
  projectId: "studio-3524371045-b11af",
};

try {
  const app = initializeApp(firebaseConfig);
  console.log("App initialized.");
  const db = getFirestore(app);
  console.log("Firestore initialized.");
} catch (e) {
  console.error("Crash!", e);
}

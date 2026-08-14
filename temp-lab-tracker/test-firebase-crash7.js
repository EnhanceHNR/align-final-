const { initializeApp, getApps } = require('firebase/app');
const { getAuth } = require('firebase/auth');

process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "studio-3524371045-b11af"
});

const firebaseConfig = {
  apiKey: "my-fake-api-key",
  projectId: "studio-3524371045-b11af"
};

let firebaseApp;
try {
  firebaseApp = initializeApp();
  getAuth(firebaseApp); // This throws because API key is missing
} catch (e) {
  console.log("Caught!", e.code);
  try {
    firebaseApp = initializeApp(firebaseConfig); // Will this throw duplicate-app?
  } catch (err) {
    console.error("Secondary crash:", err.code);
  }
}

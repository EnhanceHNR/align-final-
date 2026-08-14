const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');

// Simulate the FIREBASE_CONFIG that Firebase Web Frameworks injects
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "studio-3524371045-b11af"
});

try {
  const app = initializeApp();
  console.log("App initialized successfully.");
  const auth = getAuth(app);
  console.log("Auth initialized successfully.");
} catch (e) {
  console.error("Crash!", e);
}

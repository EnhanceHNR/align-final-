const { initializeApp, getApps } = require('firebase/app');

process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "studio-3524371045-b11af"
});

try {
  initializeApp();
} catch (e) {
  console.log("Caught!", e.code);
}
console.log("Apps length:", getApps().length);

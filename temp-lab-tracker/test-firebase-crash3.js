const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "studio-3524371045-b11af",
  "appId": "1:1065356021023:web:b4b4584d5b4bfa4b1a342a",
  "apiKey": "AIzaSyDpp9VLSPjpvFhv8PcrjfoQUDZE_mckVvU",
  "authDomain": "studio-3524371045-b11af.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1065356021023"
};

try {
  const app = initializeApp(firebaseConfig);
  console.log("App initialized successfully.");
  const auth = getAuth(app);
  console.log("Auth initialized successfully.");
  const firestore = getFirestore(app);
  console.log("Firestore initialized successfully.");
} catch (e) {
  console.error("Crash!", e);
}

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAO24wkvq0CcupNxwHanrTa8tbWWVQW0Is",
  authDomain: "inventory-and-labtrk-957-b97b0.firebaseapp.com",
  databaseURL: "https://inventory-and-labtrk-957-b97b0-default-rtdb.firebaseio.com",
  projectId: "inventory-and-labtrk-957-b97b0",
  storageBucket: "inventory-and-labtrk-957-b97b0.firebasestorage.app",
  messagingSenderId: "312066085011",
  appId: "1:312066085011:web:8381920b8d49a150287d66"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const email = "enhancetech001@gmail.com";
    const password = "EnhanceTech123!";
    console.log(`Attempting to create admin user: ${email}`);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      firstName: "Enhance",
      lastName: "Tech",
      email: email,
      role: "admin",
      isActive: true,
      createdAt: new Date().toISOString()
    });
    console.log("Admin user created successfully in Auth and Firestore!");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
       console.log("Email already exists in Auth. Make sure their Firestore profile role is 'admin'.");
    } else {
       console.error("Error creating admin user:", error);
    }
    process.exit(1);
  }
}

createAdmin();

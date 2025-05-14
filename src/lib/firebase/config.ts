// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Add other Firebase services like getAuth, getStorage if needed

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmN_RKuibnDbYpc-nJLIURKu32q9oMqSY",
  authDomain: "bizsight-6ovt7.firebaseapp.com",
  projectId: "bizsight-6ovt7",
  storageBucket: "bizsight-6ovt7.firebasestorage.app",
  messagingSenderId: "914265862044",
  appId: "1:914265862044:web:c4705ab6ad6042f44a6259"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export { app, db };

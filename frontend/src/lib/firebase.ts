// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// REPLACE WITH YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyDKbDWtmGiZhl-vTnq5Nid0T2MT7W0BKHM",
    authDomain: "universalaudit-v5.firebaseapp.com",
    projectId: "universalaudit-v5",
    storageBucket: "universalaudit-v5.firebasestorage.app",
    messagingSenderId: "571351007359",
    appId: "1:571351007359:web:6b285bda4da2f666cbbf4a",
    measurementId: "G-M9NYKHGKDP"
};

// Initialize Firebase (Singleton pattern to avoid double init in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };

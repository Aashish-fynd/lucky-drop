// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "lucky-drop-stgmd",
  appId: "1:454139732710:web:a763b3b7a665bf34ebd127",
  storageBucket: "lucky-drop-stgmd.firebasestorage.app",
  apiKey: "AIzaSyBZwU5_n1YN0X9B8tEXF7OZu4c3HHSug5E",
  authDomain: "lucky-drop-stgmd.firebaseapp.com",
  messagingSenderId: "454139732710"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
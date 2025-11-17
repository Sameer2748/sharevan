import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBS19N1JWFDwRkHKOrJRkooWgq1nWpvP1M",
  authDomain: "sharevan-1d09f.firebaseapp.com",
  projectId: "sharevan-1d09f",
  storageBucket: "sharevan-1d09f.firebasestorage.app",
  messagingSenderId: "386709865070",
  appId: "1:386709865070:web:35263df449b703c0041c7f",
  measurementId: "G-9VGPLXHW7C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app;

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA4XMVH3pupxbA2Hmh716neg8-DGpGewZo",
  authDomain: "tsucampus-network.firebaseapp.com",
  projectId: "tsucampus-network",
  storageBucket: "tsucampus-network.firebasestorage.app",
  messagingSenderId: "394909553341",
  appId: "1:394909553341:web:3ec6178af25b069e431dd4"
};

const app = initializeApp(firebaseConfig);
export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const messaging = getMessaging(app);
export { getToken, onMessage };
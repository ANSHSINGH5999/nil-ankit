import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGXqn3_QjQuV2k8JcyKGrBBw78Po7ToU4",
  authDomain: "skill-sync-a0c52.firebaseapp.com",
  projectId: "skill-sync-a0c52",
  storageBucket: "skill-sync-a0c52.firebasestorage.app",
  messagingSenderId: "396809127660",
  appId: "1:396809127660:web:a78c3ae3506ed486ba47c9"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

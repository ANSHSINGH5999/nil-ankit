import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDRT9WyYk7WsGcOI6s-ROvHgUxv0yybC7E",
  authDomain: "livesensordata-5053a.firebaseapp.com",
  databaseURL: "https://livesensordata-5053a-default-rtdb.firebaseio.com",
  projectId: "livesensordata-5053a",
  storageBucket: "livesensordata-5053a.firebasestorage.app",
  messagingSenderId: "37170121708",
  appId: "1:37170121708:web:a008a45432864ae58c8ec9",
  measurementId: "G-D5J2TC46TJ"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analyticsPromise =
  typeof window === "undefined"
    ? Promise.resolve(null)
    : isSupported().then((supported) => (supported ? getAnalytics(app) : null));

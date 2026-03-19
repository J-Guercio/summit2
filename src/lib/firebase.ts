import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5aN1oAdzr2aWg_1H9Dy7g4u-JCYaiVLY",
  authDomain: "summit-5904a.firebaseapp.com",
  projectId: "summit-5904a",
  storageBucket: "summit-5904a.firebasestorage.app",
  messagingSenderId: "356424139410",
  appId: "1:356424139410:web:f8102481d70eb698f51c4b",
  measurementId: "G-L52M9JV5DK",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

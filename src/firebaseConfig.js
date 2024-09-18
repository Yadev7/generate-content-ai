// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  // Add other Firebase configuration options
  apiKey: "AIzaSyDtjSLiZFCFrTh39rd_iwjkdC90tkjacZs",
  authDomain: "sai-contentai.firebaseapp.com",
  projectId: "sai-contentai",
  storageBucket: "sai-contentai.appspot.com",
  messagingSenderId: "264868483787",
  appId: "1:264868483787:web:0fc9e994a98276672e814e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, query, orderBy };

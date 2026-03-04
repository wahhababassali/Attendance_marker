import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// Replace the values below with your Firebase project settings
// Go to Firebase Console → Project Settings → General to get these values
const firebaseConfig = {
  apiKey: "AIzaSyCE36858RyCF7YAol1JtCY1nCtq3mZhONs",
  authDomain: "attendance-marker-86d42.firebaseapp.com",
  projectId: "attendance-marker-86d42",
  storageBucket: "attendance-marker-86d42.appspot.com",
  messagingSenderId: "115455354307",
  appId: "1:115455354307:web:placeholder"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { db };

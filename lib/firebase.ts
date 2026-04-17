import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCGZaaVC_4wkDj8z2hGSrY2UpjxjH581W0",
  authDomain: "wizard-76ec5.firebaseapp.com",
  projectId: "wizard-76ec5",
  storageBucket: "wizard-76ec5.firebasestorage.app",
  messagingSenderId: "276453083130",
  appId: "1:276453083130:web:c9516002538c4b0de80643",
  measurementId: "G-SX4J6QPKXC"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, app, db };

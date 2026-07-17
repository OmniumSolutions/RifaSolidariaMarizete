import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACyQOyfVplD97Pze6SBUndlK2_m8RjJ74",
  authDomain: "gen-lang-client-0004718651.firebaseapp.com",
  projectId: "gen-lang-client-0004718651",
  storageBucket: "gen-lang-client-0004718651.firebasestorage.app",
  messagingSenderId: "489970310502",
  appId: "1:489970310502:web:b219e733cd35f87a247ca7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-rifasolidriamari-7966541f-9a5d-4596-9578-d886d8ab96d3");

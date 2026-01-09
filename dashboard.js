import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// тот же firebaseConfig
const firebaseConfig = {
  apiKey: "AIzaSyBxBlZBees_bhwyaU4eOazUqf6Ehsr8OBs",
  authDomain: "energy-audit-app-41964.firebaseapp.com",
  projectId: "energy-audit-app-41964",
  storageBucket: "energy-audit-app-41964.firebasestorage.app",
  messagingSenderId: "928434993398",
  appId: "1:928434993398:web:1c6302bc0e8a3e15ba54d7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminLink = document.getElementById("admin-link");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  // ✅ показываем админку ТОЛЬКО админу
  if (snap.data().role === "admin") {
    adminLink.innerHTML = `<a href="admin.html">Админка</a>`;
  }
});

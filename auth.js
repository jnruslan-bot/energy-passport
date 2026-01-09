import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ ПРАВИЛЬНЫЙ firebaseConfig (ТОЛЬКО ОБЪЕКТ)
const firebaseConfig = {
  apiKey: "AIzaSyBxBlZBees_bhwyaU4eOazUqf6Ehsr8OBs",
  authDomain: "energy-audit-app-41964.firebaseapp.com",
  projectId: "energy-audit-app-41964",
  storageBucket: "energy-audit-app-41964.firebasestorage.app",
  messagingSenderId: "928434993398",
  appId: "1:928434993398:web:1c6302bc0e8a3e15ba54d7"
};

// 🔹 Инициализация Firebase (ОДИН РАЗ)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const msg = document.getElementById("msg");

// ================== РЕГИСТРАЦИЯ ==================
window.register = async () => {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      role: "user",
      status: "active",
      createdAt: serverTimestamp()
    });

    window.location.href = "dashboard.html";
  } catch (e) {
    msg.textContent = e.message;
  }
};

// ================== ВХОД ==================
window.login = async () => {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));

    if (!snap.exists() || snap.data().status !== "active") {
      await signOut(auth);
      msg.textContent = "Доступ заблокирован";
      return;
    }

    window.location.href = "dashboard.html";
  } catch (e) {
    msg.textContent = e.message;
  }
};

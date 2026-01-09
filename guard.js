import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔹 Firebase config (один и тот же везде)
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

const adminLink = document.getElementById("adminLink");
const logoutBtn = document.getElementById("logoutBtn");

// 🔐 Проверка авторизации
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  // ❌ Нет записи или пользователь заблокирован
  if (!snap.exists() || snap.data().status !== "active") {
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  // ✅ Если админ — показываем ссылку
  if (snap.data().role === "admin") {
    adminLink.style.display = "inline";
  }
});

// 🚪 Кнопка выхода
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

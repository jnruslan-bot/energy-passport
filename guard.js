// guard.js (safe version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔹 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBxBlZBees_bhwyaU4eOazUqf6Ehsr8OBs",
  authDomain: "energy-audit-app-41964.firebaseapp.com",
  projectId: "energy-audit-app-41964",
  storageBucket: "energy-audit-app-41964.firebasestorage.app",
  messagingSenderId: "928434993398",
  appId: "1:928434993398:web:1c6302bc0e8a3e15ba54d7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// маленький хелпер: мягкий редирект
function goHome() {
  window.location.href = "index.html";
}

// Подключаемся когда DOM готов, чтобы элементы точно существовали
document.addEventListener("DOMContentLoaded", () => {
  const adminLink = document.getElementById("adminLink"); // может быть null — это ОК
  const logoutBtn = document.getElementById("logoutBtn"); // может быть null — это ОК

  // 🚪 Кнопка выхода (если она есть на странице)
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("SignOut error:", e);
      } finally {
        goHome();
      }
    });
  }

  // 🔐 Проверка авторизации
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      goHome();
      return;
    }

    try {
      const snap = await getDoc(doc(db, "users", user.uid));

      // ❌ Нет записи или пользователь заблокирован
      if (!snap.exists() || snap.data()?.status !== "active") {
        try {
          await signOut(auth);
        } catch (e) {
          console.error("SignOut error:", e);
        }
        goHome();
        return;
      }

      // ✅ Если админ — показываем ссылку (если она есть на странице)
      if (snap.data()?.role === "admin" && adminLink) {
        adminLink.style.display = "inline";
      }
    } catch (e) {
      // Любая ошибка чтения профиля -> безопаснее выкинуть на главную
      console.error("Auth/Firestore guard error:", e);
      try {
        await signOut(auth);
      } catch (e2) {
        console.error("SignOut error:", e2);
      }
      goHome();
    }
  });
});

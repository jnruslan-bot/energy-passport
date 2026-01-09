import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const tbody = document.getElementById("users");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "index.html";
    return;
  }

  const snap = await getDocs(collection(db, "users"));
  const me = snap.docs.find(
    d => d.id === user.uid && d.data().role === "admin"
  );

  if (!me) {
    location.href = "dashboard.html";
    return;
  }

  tbody.innerHTML = "";

  snap.forEach(d => {
  const u = d.data();

  const blockBtn =
    d.id === auth.currentUser.uid
      ? "—"
      : `<button onclick="blockUser('${d.id}')">Блок</button>`;

  const deleteBtn =
    d.id === auth.currentUser.uid
      ? "—"
      : `<button onclick="deleteUser('${d.id}')">Удалить</button>`;

  tbody.innerHTML += `
    <tr>
      <td>${u.email}</td>
      <td>${u.status}</td>
      <td>
        ${blockBtn}
        ${deleteBtn}
      </td>
    </tr>`;
});
});
// 🔒 Блокировка
window.blockUser = async (uid) => {
  await updateDoc(doc(db, "users", uid), {
    status: "blocked"
  });
  alert("Пользователь заблокирован");
  location.reload();
};

// ❌ Удаление
window.deleteUser = async (uid) => {
  if (!confirm("Точно удалить пользователя?")) return;
  await deleteDoc(doc(db, "users", uid));
  alert("Пользователь удалён");
  location.reload();
};
window.goBack = () => {
  window.location.href = "dashboard.html";
};

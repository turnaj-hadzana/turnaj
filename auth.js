import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Firebase konfigurácia
const firebaseConfig = {
  apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGpIlfz40",
  authDomain: "turnaj-a28c5.firebaseapp.com",
  projectId: "turnaj-a28c5",
  storageBucket: "turnaj-a28c5.firebasestorage.app",
  messagingSenderId: "13732191148",
  appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
};

// Inicializácia Firebase aplikácie
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Zabráni odoslaniu formulára

    const username = document.getElementById('meno').value.trim(); // Získa meno používateľa
    const password = document.getElementById('password').value; // Získa heslo
    const errorMessage = document.getElementById('loginError'); // Pre získanie elementu pre chybové správy

    // Skryje predchádzajúce chybové správy
    errorMessage.style.display = 'none';

    // Skontroluj, či je zadané používateľské meno a heslo
    if (!username || !password) {
        errorMessage.textContent = 'Prosím, vyplňte všetky polia.';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        // Získa dokument používateľa z Firestore
        const userDocRef = doc(db, 'users', username);
        const userDoc = await getDoc(userDocRef);

        // Ak používateľ neexistuje
        if (!userDoc.exists()) {
            errorMessage.textContent = 'Používateľ neexistuje.';
            errorMessage.style.display = 'block';
            return;
        }

        const userData = userDoc.data(); // Získa údaje používateľa

        // Ak sa heslá zhodujú
        if (userData.password === password) {
            alert('Úspešné prihlásenie!');
            window.location.href = 'spravca-turnaja.html'; // Presmerovanie na dashboard
        } else {
            errorMessage.textContent = 'Nesprávne heslo.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Chyba pri prihlasovaní:', error);
        errorMessage.textContent = 'Chyba pri prihlasovaní: ' + error.message;
        errorMessage.style.display = 'block';
    }
});

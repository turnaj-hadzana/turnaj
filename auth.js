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
    const password = document.getElementById('password').value.trim(); // Odstráni medzery pred a za heslom
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
        console.log(`Získavam používateľa: ${username}`);
        const userDocRef = doc(db, 'users', username);
        const userDoc = await getDoc(userDocRef);

        // Skontrolujeme, či dokument existuje
        if (!userDoc.exists()) {
            console.log('Používateľ neexistuje!');
            errorMessage.textContent = 'Používateľ neexistuje.';
            errorMessage.style.display = 'block';
            return;
        }

        const userData = userDoc.data(); // Získa údaje používateľa
        console.log('Nájdené údaje používateľa:', userData);

        // Porovnáme heslá priamo, keď sú obe hodnoty upravené pomocou trim()
        if (userData.password === password) {
            alert('Úspešné prihlásenie!');
            window.location.href = 'spravca-turnaja.html'; // Presmerovanie na dashboard
        } else {
            console.log('Heslo sa nezhoduje');
            errorMessage.textContent = 'Nesprávne heslo.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Chyba pri prihlasovaní:', error);
        errorMessage.textContent = 'Chyba pri prihlasovaní: ' + error.message;
        errorMessage.style.display = 'block';
    }
});

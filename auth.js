import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, doc, getDoc, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

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
const auth = getAuth(app); // Inicializácia Firebase Auth

// Funkcia na úpravu menu
function updateHeaderMenu(user) { // Upravený parameter na objekt user
    const usernameItem = document.getElementById('usernameItem');
    const usernameSpan = document.getElementById('usernameSpan');
    const registerItem = document.getElementById('registerItem');
    const adminItem = document.getElementById('adminItem');
    const loginLink = document.querySelector('a[href="login.html"]'); // Získame odkaz na prihlásenie

    if (user) { // Používame objekt user na kontrolu prihlásenia
        // Ak je používateľ prihlásený
        usernameItem.style.display = 'list-item';
        usernameSpan.textContent = user.displayName || user.email; // Zobrazíme meno alebo email
        if (loginLink) {
            loginLink.textContent = 'Odhlásenie'; // Zmeníme text na "Odhlásenie"
            loginLink.removeEventListener('click', loginClickHandler); // Odstránime pôvodný listener
            loginLink.addEventListener('click', handleLogout); // Pridáme listener pre odhlásenie
        }

        // Ak je prihlásený "admin", zobrazí aj ďalšie možnosti
        if (user.email === 'admin@example.com') { // Toto by malo byť nahradené porovnaním roly z databázy
            registerItem.style.display = 'list-item';
            adminItem.style.display = 'list-item';
        } else {
            registerItem.style.display = 'none'; // skryjeme pre beznych userov
            adminItem.style.display = 'none'; // skryjeme pre beznych userov
        }


    } else {
        //ak nie je prihlaseny takto
        usernameItem.style.display = 'none';
        registerItem.style.display = 'none';
        adminItem.style.display = 'none';
        if (loginLink) {
            loginLink.textContent = 'Prihlásenie'; // Vrátime text na "Prihlásenie"
            loginLink.removeEventListener('click', handleLogout); // Odstránime odhlasovanie
            loginLink.addEventListener('click', loginClickHandler);  //pridame povodny listener
            loginLink.style.display = 'list-item'; //zobrazime prihlasenie
        }
    }
}
let loginClickHandler;
// Funkcia pre odhlásenie
function handleLogout(event) {
    event.preventDefault(); // Zabránime presmerovaniu
    signOut(auth).then(() => {
        console.log('Používateľ odhlásený.');
        localStorage.removeItem('username'); // Odstránime používateľské meno z localStorage
        updateHeaderMenu(null); // Aktualizujeme menu
        window.location.href = '/index.html'; // Presmerujeme na hlavnú stránku
    }).catch((error) => {
        console.error('Chyba pri odhlasovaní:', error);
    });
}



document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
     loginClickHandler =  function(event) { // Store the original login click handler
        event.preventDefault();
        const usernameInput = document.getElementById('meno');
        const passwordInput = document.getElementById('password');
        const errorMessage = document.getElementById('loginError');

        errorMessage.style.display = 'none';

        if (!usernameInput.value.trim() || !passwordInput.value.trim()) {
            errorMessage.textContent = 'Prosím, vyplňte všetky polia.';
            errorMessage.style.display = 'block';
            return;
        }

        getDoc(doc(db, 'users', usernameInput.value.trim()))
            .then(userDoc => {
                if (!userDoc.exists()) {
                    errorMessage.textContent = 'Používateľ neexistuje.';
                    errorMessage.style.display = 'block';
                    return;
                }

                const userData = userDoc.data();

                if (userData.password === passwordInput.value.trim()) {
                    localStorage.setItem('username', usernameInput.value.trim());
                    updateHeaderMenu(userDoc.data());
                    window.location.href = 'index.html';
                } else {
                    errorMessage.textContent = 'Nesprávne heslo.';
                    errorMessage.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Chyba pri prihlasovaní:', error);
                errorMessage.textContent = 'Chyba pri prihlasovaní: ' + error.message;
                errorMessage.style.display = 'block';
            });
    };
    if (loginForm) {
        loginForm.addEventListener('submit', loginClickHandler);
    }


    // Pri načítaní stránky skontrolujeme, či je používateľ už prihlásený a upravíme menu
    onAuthStateChanged(auth, (user) => {
        updateHeaderMenu(user); // Zavoláme funkciu s aktuálnym používateľom
    });
});

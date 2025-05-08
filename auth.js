import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGpIlfz40",
    authDomain: "turnaj-a28c5.firebaseapp.com",
    projectId: "turnaj-a28c5",
    storageBucket: "turnaj-a28c5.firebasestorage.app",
    messagingSenderId: "13732191148",
    appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function updateHeaderMenu(username) {
    const usernameItem = document.getElementById('usernameItem');
    const usernameSpan = document.getElementById('usernameSpan');
    const registerItem = document.getElementById('registerItem');
    const adminItem = document.getElementById('adminItem');
    const loginLink = document.querySelector('a[href="login.html"]');

    if (username) {
        // Ak je používateľ prihlásený
        usernameItem.style.display = 'list-item';
        usernameSpan.textContent = username;

        // Ak je prihlásený "admin", zobrazí aj ďalšie možnosti
        if (username === 'admin') {
            registerItem.style.display = 'list-item';
            adminItem.style.display = 'list-item';
        } else {
            registerItem.style.display = 'none';
            adminItem.style.display = 'none';
        }
        
    } else {
        //ak nie je prihlaseny takto
        usernameItem.style.display = 'none';
        registerItem.style.display = 'none';
        adminItem.style.display = 'none';
        if (loginLink) {
            loginLink.style.display = 'list-item';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) { 
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const username = document.getElementById('meno').value.trim();
            const password = document.getElementById('password').value.trim();
            const errorMessage = document.getElementById('loginError');

            errorMessage.style.display = 'none';

            if (!username || !password) {
                errorMessage.textContent = 'Prosím, vyplňte všetky polia.';
                errorMessage.style.display = 'block';
                return;
            }

            try {
                const userDocRef = doc(db, 'users', username);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    errorMessage.textContent = 'Používateľ neexistuje.';
                    errorMessage.style.display = 'block';
                    return;
                }

                const userData = userDoc.data();

                if (userData.password === password) {
                    localStorage.setItem('username', username);
                    updateHeaderMenu(username);
                    if (username === "admin") {
                        window.location.href = 'spravca-turnaja.html';
                    } else {
                        window.location.href = 'index.html';
                    }
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
    }
    // Pri načítaní stránky skontrolujeme, či je používateľ už prihlásený a upravíme menu
    const loggedInUsername = localStorage.getItem('username');
    updateHeaderMenu(loggedInUsername);
});

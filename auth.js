// Tvoja Firebase konfigurácia
const firebaseConfig = {
    apiKey: "AIzaSyAPW_DWwLqaiymC_uAoC8ozb6UZ7fIwsQM",
    authDomain: "turnaj-653d7.firebaseapp.com",
    projectId: "turnaj-653d7",
    storageBucket: "turnaj-653d7.firebasestorage.app",
    messagingSenderId: "38415358286",
    appId: "1:38415358286:web:428472df8c239172bd261f",
    measurementId: "G-07DBYGZMYV"
};

// Inicializácia Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginErrorDiv = document.getElementById('loginError');
    const registrationForm = document.getElementById('registrationForm');
    const registrationErrorDiv = document.getElementById('registrationError');

    // Logika pre prihlásenie
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const usernameInput = document.getElementById('meno');
            const passwordInput = document.getElementById('password');

            if (usernameInput && passwordInput) {
                const username = usernameInput.value;
                const password = passwordInput.value;

                db.collection('users')
                    .where('username', '==', username)
                    .limit(1)
                    .get()
                    .then((querySnapshot) => {
                        if (!querySnapshot.empty) {
                            const doc = querySnapshot.docs[0];
                            const userData = doc.data();
                            const email = userData.email;

                            return auth.signInWithEmailAndPassword(email, password);
                        } else {
                            throw new Error('Používateľské meno nebolo nájdené.');
                        }
                    })
                    .then((userCredential) => {
                        const user = userCredential.user;
                        console.log('Používateľ prihlásený:', user);
                        window.location.href = '/index.html';
                    })
                    .catch((error) => {
                        console.error('Chyba pri prihlásení:', error);
                        if (loginErrorDiv) {
                            loginErrorDiv.textContent = error.message;
                            loginErrorDiv.style.display = 'block';
                        }
                    });
            }
        });
    }

    // Logika pre registráciu
    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const emailInput = document.getElementById('regEmail');
            const passwordInput = document.getElementById('regPassword');
            const usernameInput = document.getElementById('regUsername');

            if (emailInput && passwordInput && usernameInput) {
                const email = emailInput.value;
                const password = passwordInput.value;
                const username = usernameInput.value;

                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        console.log('Používateľ úspešne zaregistrovaný:', user);
                        return db.collection('users').doc(user.uid).set({
                            username: username,
                            email: email
                        });
                    })
                    .then(() => {
                        console.log('Používateľské meno uložené do Firestore.');
                        window.location.href = '/login.html';
                    })
                    .catch((error) => {
                        console.error('Chyba pri registrácii:', error);
                        if (registrationErrorDiv) {
                            registrationErrorDiv.textContent = error.message;
                            registrationErrorDiv.style.display = 'block';
                        }
                    });
            }
        });
    }

    // (Voliteľné) Kód pre sledovanie stavu prihlásenia
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Používateľ je prihlásený:", user);
            // Môžeš tu pridať presmerovanie alebo inú logiku po prihlásení
        } else {
            console.log("Používateľ nie je prihlásený.");
        }
    });
});

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

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginErrorDiv = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Zabránenie predvolenému odoslaniu formulára

            const emailInput = document.getElementById('email'); // Opravené ID
            const passwordInput = document.getElementById('password');

            if (emailInput && passwordInput) {
                const email = emailInput.value;
                const password = passwordInput.value;

                auth.signInWithEmailAndPassword(email, password) // Opravená premenná
                    .then((userCredential) => {
                        // Používateľ úspešne prihlásený
                        const user = userCredential.user;
                        console.log('Používateľ prihlásený:', user);
                        // Presmeruj používateľa na inú stránku po úspešnom prihlásení
                        window.location.href = '/index.html'; // Alebo na inú požadovanú stránku
                    })
                    .catch((error) => {
                        // Chyba pri prihlásení
                        const errorCode = error.code;
                        const errorMessage = error.message;
                        console.error('Chyba pri prihlásení:', errorCode, errorMessage);
                        if (loginErrorDiv) {
                            loginErrorDiv.textContent = errorMessage;
                            loginErrorDiv.style.display = 'block';
                        }
                    });
            }
        });
    }

    // (Voliteľné) Kód pre sledovanie stavu prihlásenia, ak ho chceš mať aj na tejto stránke
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Používateľ je prihlásený na stránke prihlásenia:", user);
            // Ak je používateľ už prihlásený, presmeruj ho preč z prihlasovacej stránky
            window.location.href = '/index.html'; // Alebo na inú požadovanú stránku
        } else {
            console.log("Používateľ nie je prihlásený na stránke prihlásenia.");
            // Používateľ nie je prihlásený, môže vyplniť formulár
        }
    });
});

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
const analytics = firebase.analytics();

// Získanie referencií na HTML elementy
const signInButton = document.getElementById('signInWithGoogle');
const authStatusDiv = document.getElementById('authStatus');
const signOutButtonElement = document.getElementById('signOutButton');

// Funkcia na prihlásenie cez Google
const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Používateľ bol úspešne prihlásený.
            const user = result.user;
            console.log("Používateľ prihlásený:", user);
            authStatusDiv.textContent = `Prihlásený ako: ${user.displayName} (${user.email})`;
            signInButton.style.display = 'none';
            signOutButtonElement.style.display = 'block';
        }).catch((error) => {
            // Chyba pri prihlasovaní.
            const errorCode = error.code;
            const errorMessage = error.message;
            const email = error.email;
            const credential = error.credential;
            console.error("Chyba pri prihlasovaní:", errorCode, errorMessage, email, credential);
            authStatusDiv.textContent = `Chyba pri prihlasovaní: ${errorMessage}`;
        });
};

// Funkcia na odhlásenie
const signOut = () => {
    auth.signOut().then(() => {
        // Používateľ bol úspešne odhlásený.
        console.log("Používateľ odhlásený.");
        authStatusDiv.textContent = 'Používateľ odhlásený.';
        signInButton.style.display = 'block';
        signOutButtonElement.style.display = 'none';
    }).catch((error) => {
        // Chyba pri odhlasovaní.
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Chyba pri odhlasovaní:", errorCode, errorMessage);
        authStatusDiv.textContent = `Chyba pri odhlasovaní: ${errorMessage}`;
    });
};

// Pridanie event listenerov na tlačidlá (až keď sú elementy DOM dostupné)
document.addEventListener('DOMContentLoaded', () => {
    const signInButton = document.getElementById('signInWithGoogle');
    const authStatusDiv = document.getElementById('authStatus');
    const signOutButtonElement = document.getElementById('signOutButton');

    if (signInButton) {
        signInButton.addEventListener('click', signInWithGoogle);
    }
    if (signOutButtonElement) {
        signOutButtonElement.addEventListener('click', signOut);
    }

    // Sledovanie stavu prihlásenia používateľa pri načítaní stránky
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Používateľ je prihlásený.
            console.log("Používateľ je prihlásený:", user);
            if (authStatusDiv) {
                authStatusDiv.textContent = `Prihlásený ako: ${user.displayName} (${user.email})`;
            }
            if (signInButton) {
                signInButton.style.display = 'none';
            }
            if (signOutButtonElement) {
                signOutButtonElement.style.display = 'block';
            }
        } else {
            // Používateľ nie je prihlásený.
            console.log("Používateľ nie je prihlásený.");
            if (authStatusDiv) {
                authStatusDiv.textContent = 'Používateľ nie je prihlásený.';
            }
            if (signInButton) {
                signInButton.style.display = 'block';
            }
            if (signOutButtonElement) {
                signOutButtonElement.style.display = 'none';
            }
        }
    });
});

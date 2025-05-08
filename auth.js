// Firebase Konfigurácia
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
const firestore = firebase.firestore();

// Spracovanie registrácie
document.getElementById('registrationForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Kontrola hesla
    if (password !== confirmPassword) {
        document.getElementById('registrationError').innerText = 'Heslá sa nezhodujú!';
        document.getElementById('registrationError').style.display = 'block';
        return;
    }

    // Vytvorenie používateľa
    auth.createUserWithEmailAndPassword(username + "@example.com", password) // Pre Firebase potrebujeme email
        .then((userCredential) => {
            const user = userCredential.user;

            // Uloženie údajov do Firestore
            firestore.collection('users').doc(user.uid).set({
                username: username,
                email: username + "@example.com", // Meno + doména ako email
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert('Úspešná registrácia! Môžete sa prihlásiť.');
                window.location.href = '/login.html'; // Presmerovanie na prihlasovaciu stránku
            }).catch((error) => {
                document.getElementById('registrationError').innerText = 'Chyba pri uložení do databázy.';
                document.getElementById('registrationError').style.display = 'block';
            });

        }).catch((error) => {
            document.getElementById('registrationError').innerText = error.message;
            document.getElementById('registrationError').style.display = 'block';
        });
});

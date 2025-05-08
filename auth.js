// Firebase Konfigurácia
const firebaseConfig = {
  apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGpIlfz40",
  authDomain: "turnaj-a28c5.firebaseapp.com",
  projectId: "turnaj-a28c5",
  storageBucket: "turnaj-a28c5.firebasestorage.app",
  messagingSenderId: "13732191148",
  appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
};

// Inicializácia Firebase
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// Spracovanie registrácie
// Spracovanie registrácie
document.getElementById('registrationForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Zabraňuje štandardnému odoslaniu formulára

    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Kontrola hesla
    if (password !== confirmPassword) {
        document.getElementById('registrationError').innerText = 'Heslá sa nezhodujú!';
        document.getElementById('registrationError').style.display = 'block'; // Zobrazí chybovú správu
        return; // Ukončí funkciu, aby sa neodosielali údaje
    }

    // Uloženie používateľských údajov do Firestore
    firestore.collection('users').add({
        username: username,
        password: password, // Heslo je uložené v čitateľnej podobe, čo by malo byť zašifrované
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Úspešná registrácia! Môžete sa prihlásiť.');
        window.location.href = 'login.html'; // Presmerovanie na prihlasovaciu stránku
    }).catch((error) => {
        document.getElementById('registrationError').innerText = 'Chyba pri uložení do databázy.';
        document.getElementById('registrationError').style.display = 'block'; // Zobrazí chybovú správu
    });
});


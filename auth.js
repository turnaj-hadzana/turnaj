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
document.getElementById('registrationForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) {
        document.getElementById('registrationError').innerText = 'Heslá sa nezhodujú!';
        document.getElementById('registrationError').style.display = 'block';
        return;
    }

    try {
        // Hashovanie hesla pomocou bcrypt
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        // Uloženie do Firestore – ako dokument s názvom používateľa
        await firestore.collection('users').doc(username).set({
            password: hashedPassword,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Úspešná registrácia! Môžete sa prihlásiť.');
        window.location.href = 'login.html';

    } catch (error) {
        console.error('Chyba pri ukladaní:', error);
        document.getElementById('registrationError').innerText = 'Chyba pri uložení do databázy.';
        document.getElementById('registrationError').style.display = 'block';
    }
});

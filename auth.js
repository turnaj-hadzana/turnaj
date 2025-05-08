const firebaseConfig = {
  apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGpIlfz40",
  authDomain: "turnaj-a28c5.firebaseapp.com",
  projectId: "turnaj-a28c5",
  storageBucket: "turnaj-a28c5.firebasestorage.app",
  messagingSenderId: "13732191148",
  appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('meno').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('loginError');

    errorMessage.style.display = 'none';

    try {
        const userDoc = await db.collection('users').doc(username).get();

        if (!userDoc.exists) {
            errorMessage.textContent = 'Používateľ neexistuje.';
            errorMessage.style.display = 'block';
            return;
        }

        const userData = userDoc.data();

        if (userData.password === password) {
            alert('Úspešné prihlásenie!');
            window.location.href = 'dashboard.html';
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

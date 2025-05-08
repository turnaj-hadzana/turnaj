document.addEventListener("DOMContentLoaded", function () {
    const username = localStorage.getItem('username'); // Načítanie používateľského mena z localStorage
    const loginLink = document.querySelector('a[href="login.html"]'); // Získame odkaz na prihlásenie/odhlásenie

    if (username) {
        // Ak je používateľ prihlásený
        document.getElementById('usernameItem').style.display = 'list-item';
        document.getElementById('usernameSpan').textContent = username; // Zobrazenie používateľského mena v hlavičke

        // Ak je prihlásený "admin", zobrazí aj ďalšie možnosti
        if (username === 'admin') {
            document.getElementById('registerItem').style.display = 'list-item';
            document.getElementById('adminItem').style.display = 'list-item';
        }

        // Zmeníme text a href na odhlásenie
        if (loginLink) {
            loginLink.textContent = 'Odhlásenie';
            loginLink.href = '#'; // Prevent default behavior, we'll handle it with JS
            loginLink.addEventListener('click', handleLogout); // Pridáme event listener pre odhlásenie
        }

    } else {
        // Ak používateľ nie je prihlásený, nastavíme odkaz na prihlásenie
        if (loginLink) {
            loginLink.textContent = 'Prihlásenie'; // Nastavíme text na "Prihlásenie"
            loginLink.href = 'login.html'; // Nastavíme href na prihlásenie
            loginLink.removeEventListener('click', handleLogout); // Odstránime event listener pre odhlásenie, ak bol predtým nastavený
        }
    }
});

function handleLogout(event) {
    event.preventDefault(); // Zabránime predvolenému správaniu odkazu (presmerovaniu)
    localStorage.removeItem('username'); // Odstránime používateľské meno z localStorage
    // Tu by mal byť aj kód pre odhlásenie z Firebase Auth, ak ho používaš
    // Napríklad: firebase.auth().signOut();
    // Po odhlásení aktualizujeme menu
    document.getElementById('usernameItem').style.display = 'none';
    document.getElementById('registerItem').style.display = 'none';
    document.getElementById('adminItem').style.display = 'none';
    const loginLink = document.querySelector('a[href="#"]'); // Získame odkaz pomocou href
    if (loginLink) {
        loginLink.textContent = 'Prihlásenie';
        loginLink.href = 'login.html';
        loginLink.removeEventListener('click', handleLogout);
    }

    window.location.href = 'index.html'; // Presmerujeme na hlavnú stránku
}


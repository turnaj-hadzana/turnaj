document.addEventListener("DOMContentLoaded", function () {
    const username = localStorage.getItem('username'); // Načítanie používateľského mena z localStorage

    if (username) {
        // Ak je používateľ prihlásený
        document.getElementById('usernameItem').style.display = 'list-item'; // Zobrazí meno používateľa v menu
        document.getElementById('usernameSpan').textContent = username; // Zobrazenie používateľského mena v hlavičke

        // Ak je prihlásený "admin", zobrazí aj ďalšie možnosti
        if (username === 'admin') {
            document.getElementById('registerItem').style.display = 'list-item';
            document.getElementById('adminItem').style.display = 'list-item';
        }

        // Skryje položku Prihlásenie, keď je používateľ prihlásený
        document.querySelector('a[href="login.html"]').style.display = 'none';
    }
});

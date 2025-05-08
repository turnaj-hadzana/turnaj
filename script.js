fetch('header.html')
    .then(response => response.text())
    .then(data => {
        // Krok 1: Vložíme hlavičku do DOM
        document.body.insertAdjacentHTML('afterbegin', data);

        // Krok 2: AŽ TERAZ, keď je hlavička v DOM,
        // môžeme bezpečne nájsť jej prvky a aktualizovať ich
        // na základe stavu prihlásenia z localStorage.

        const loggedInUsername = localStorage.getItem('username');
        const usernameItem = document.getElementById('usernameItem');
        const usernameSpan = document.getElementById('usernameSpan');
        const registerItem = document.getElementById('registerItem');
        const adminItem = document.getElementById('adminItem');
        // Nájdeme odkaz, ktorý je pôvodne na login.html
        const loginLinkElement = document.querySelector('nav ul li a[href="login.html"], nav ul li a[href="#"]'); // Hľadáme odkaz na prihlásenie alebo odhlásenie

        if (loggedInUsername) {
            // Ak je používateľ prihlásený:
            if (usernameItem) usernameItem.style.display = 'list-item';
            if (usernameSpan) usernameSpan.textContent = loggedInUsername;

            // Zobrazenie/skrytie admin/registrácia pre admina:
            if (loggedInUsername === 'admin') {
                if (registerItem) registerItem.style.display = 'list-item';
                if (adminItem) adminItem.style.display = 'list-item';
            } else {
                // Pre bežných používateľov skryjeme admin/registrácia:
                if (registerItem) registerItem.style.display = 'none';
                if (adminItem) adminItem.style.display = 'none';
            }

            // Zmeníme odkaz "Prihlásenie" na "Odhlásenie":
            if (loginLinkElement) {
                loginLinkElement.textContent = 'Odhlásenie';
                loginLinkElement.href = '#'; // Alebo iná hodnota, ktorú spracuje tvoj logout handler
                // POZNÁMKA: Bude potrebné zabezpečiť, aby sa event listener pre odhlásenie (handleLogout funkcia z header-logic.js)
                // pridal k tomuto konkrétnemu 'Odhlásenie' odkazu PO jeho vytvorení/úprave tu.
                // Ideálne presunúť celú logiku z header-logic.js (vrátane pridania event listenera) sem, do tohto .then bloku.
            }

        } else {
            // Ak používateľ NIE JE prihlásený:
            // Skryjeme položku používateľa a zabezpečíme viditeľnosť prihlásenia:
            if (usernameItem) usernameItem.style.display = 'none';
            if (registerItem) registerItem.style.display = 'none';
            if (adminItem) adminItem.style.display = 'none';
            // Zabezpečíme, že odkaz "Prihlásenie" je viditeľný a má správny href:
            if (loginLinkElement) {
                loginLinkElement.textContent = 'Prihlásenie';
                loginLinkElement.href = 'login.html';
                loginLinkElement.style.display = 'list-item'; // Uisti sa, že je viditeľný
            }
        }

        // Logika z header-logic.js a DOMContentLoaded listener v auth.js, ktoré robili túto aktualizáciu,
        // už pravdepodobne nebudú potrebné na stránkach, kde takto dynamicky vkladáš hlavičku.

    })
    .catch(error => {
        console.error('Chyba pri načítaní hlavičky:', error);
    });

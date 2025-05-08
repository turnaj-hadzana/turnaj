function handleLogout(event) {
    event.preventDefault(); // Zabránime predvolenému správaniu odkazu
    localStorage.removeItem('username'); // Odstránime používateľské meno z localStorage
    // TODO: Tu by mal byť aj kód pre odhlásenie z Firebase Auth, ak ho používaš bezpečne
    // Napríklad: firebase.auth().signOut(); // Ak používaš Firebase Auth
    window.location.href = 'index.html'; // Presmerujeme na hlavnú stránku (alebo login.html)
}


// Skript na načítanie a aktualizáciu hlavičky - tento kód pôjde do script.js
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
        // Nájdeme odkaz, ktorý je pôvodne na login.html - toto je stabilný spôsob nájdenia elementu
        const loginLogoutLinkElement = document.querySelector('nav ul li a[href="login.html"]');


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

            // *** Zmeníme odkaz "Prihlásenie" na "Odhlásenie" a pridáme event listener ***
            if (loginLogoutLinkElement) {
                loginLogoutLinkElement.textContent = 'Odhlásenie';
                loginLogoutLinkElement.href = '#'; // Alebo iná hodnota, ktorú spracuje tvoj logout handler
                // Pridáme event listener pre odhlásenie k tomuto odkazu
                loginLogoutLinkElement.addEventListener('click', handleLogout);
                 // Zabezpečíme, že je viditeľný (ak bol predtým skrytý logikou v auth.js)
                loginLogoutLinkElement.style.display = 'list-item';
            }

        } else {
            // Ak používateľ NIE JE prihlásený:
            // Skryjeme položku používateľa a admin/registrácia:
            if (usernameItem) usernameItem.style.display = 'none';
            if (registerItem) registerItem.style.display = 'none';
            if (adminItem) adminItem.style.display = 'none';

            // Zabezpečíme, že odkaz "Prihlásenie" je viditeľný a má správny href:
            if (loginLogoutLinkElement) {
                loginLogoutLinkElement.textContent = 'Prihlásenie';
                loginLogoutLinkElement.href = 'login.html';
                loginLogoutLinkElement.style.display = 'list-item'; // Uisti sa, že je viditeľný
                // Odstránime event listener pre odhlásenie, ak tam bol pridaný
                 loginLogoutLinkElement.removeEventListener('click', handleLogout);
            }
        }

         // POZNÁMKA: DOMContentLoaded listenery v auth.js a header-logic.js
         // ktoré aktualizujú hlavičku, by mali byť na stránkach, kde
         // používaš tento script.js, odstránené alebo upravené,
         // aby sa zabránilo duplicitnému spúšťaniu logiky aktualizácie menu.
         // Napr. v auth.js odstrániť: document.addEventListener('DOMContentLoaded', ... updateHeaderMenu(...));
         // V header-logic.js odstrániť: document.addEventListener('DOMContentLoaded', ... celá logika aktualizácie ...);
         // Ak bola funkcia handleLogout v header-logic.js a odstránil/a si jej definíciu,
         // uisti sa, že je definovaná buď v script.js (ako je ukázané vyššie),
         // alebo ju načítaš iným spôsobom (napr. tagom <script> pred načítaním script.js).

    })
    .catch(error => {
        console.error('Chyba pri načítaní hlavičky:', error);
    });

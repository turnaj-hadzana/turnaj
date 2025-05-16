function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}
fetch('header.html')
    .then(response => response.text())
    .then(data => {
        document.body.insertAdjacentHTML('afterbegin', data);
        const loggedInUsername = localStorage.getItem('username');
        const usernameItem = document.getElementById('usernameItem');
        const usernameSpan = document.getElementById('usernameSpan');
        const registerItem = document.getElementById('registerItem');
        const adminItem = document.getElementById('adminItem');
        const loginLogoutLinkElement = document.querySelector('nav ul li a[href="login.html"]');
        if (loggedInUsername) {
            if (usernameItem) usernameItem.style.display = 'list-item';
            if (usernameSpan) usernameSpan.textContent = loggedInUsername;
            if (loggedInUsername === 'admin') {
                if (registerItem) registerItem.style.display = 'list-item';
                if (adminItem) adminItem.style.display = 'list-item';
            } else {
                if (registerItem) registerItem.style.display = 'none';
                if (adminItem) adminItem.style.display = 'none';
            }
            if (loginLogoutLinkElement) {
                loginLogoutLinkElement.textContent = 'Odhlásenie';
                loginLogoutLinkElement.href = '#';
                loginLogoutLinkElement.addEventListener('click', handleLogout);
                loginLogoutLinkElement.style.display = 'list-item';
            }
        } else {
            if (usernameItem) usernameItem.style.display = 'none';
            if (registerItem) registerItem.style.display = 'none';
            if (adminItem) adminItem.style.display = 'none';
            if (loginLogoutLinkElement) {
                loginLogoutLinkElement.textContent = 'Prihlásenie';
                loginLogoutLinkElement.href = 'login.html';
                loginLogoutLinkElement.style.display = 'list-item';
                loginLogoutLinkElement.removeEventListener('click', handleLogout);
            }
        }
    })
    .catch(error => {
        console.error('Chyba pri načítaní hlavičky:', error);
    });

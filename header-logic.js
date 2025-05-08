document.addEventListener("DOMContentLoaded", function () {
    const username = localStorage.getItem('username');
    const loginLink = document.querySelector('a[href="login.html"]');

    if (username) {
        document.getElementById('usernameItem').style.display = 'list-item';
        document.getElementById('usernameSpan').textContent = username;

        if (username === 'admin') {
            document.getElementById('registerItem').style.display = 'list-item';
            document.getElementById('adminItem').style.display = 'list-item';
        }

        if (loginLink) {
            loginLink.textContent = 'Odhlásenie';
            loginLink.href = '#';
            loginLink.addEventListener('click', handleLogout);
        }

    } else {
        if (loginLink) {
            loginLink.textContent = 'Prihlásenie';
            loginLink.href = 'login.html';
            loginLink.removeEventListener('click', handleLogout);
        }
    }
});

function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('username');
    document.getElementById('usernameItem').style.display = 'none';
    document.getElementById('registerItem').style.display = 'none';
    document.getElementById('adminItem').style.display = 'none';
    const loginLink = document.querySelector('a[href="#"]');
    if (loginLink) {
        loginLink.textContent = 'Prihlásenie';
        loginLink.href = 'login.html';
        loginLink.removeEventListener('click', handleLogout);
    }

    window.location.href = 'index.html';
}


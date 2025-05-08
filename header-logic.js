const username = localStorage.getItem('username');

if (username) {
    const loginItem = document.getElementById('loginItem');
    const logoutItem = document.getElementById('logoutItem');
    const registerItem = document.getElementById('registerItem');
    const adminItem = document.getElementById('adminItem');

    if (loginItem) loginItem.style.display = 'none';
    if (logoutItem) logoutItem.style.display = 'list-item';

    if (username === 'admin') {
        if (registerItem) registerItem.style.display = 'list-item';
        if (adminItem) adminItem.style.display = 'list-item';
    }

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('username');
            window.location.href = 'index.html';
        });
    }
}

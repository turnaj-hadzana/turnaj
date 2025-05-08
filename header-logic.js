// Skript sa spustí po načítaní header.html
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (username === 'admin') {
        const registerItem = document.getElementById('registerItem');
        const adminItem = document.getElementById('adminItem');

        if (registerItem) registerItem.style.display = 'list-item';
        if (adminItem) adminItem.style.display = 'list-item';
    }
});

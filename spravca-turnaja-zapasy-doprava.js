document.addEventListener('DOMContentLoaded', () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    loadCategoriesTable();
     if (categoriesContentSection) {
          categoriesContentSection.style.display = 'block';
          const otherSections = document.querySelectorAll('main > section, main > div');
          otherSections.forEach(section => {
               if (section.id !== 'categoriesContentSection') {
                    section.style.display = 'none';
               }
          });
     }
});

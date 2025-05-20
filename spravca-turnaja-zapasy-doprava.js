import { db, categoriesCollectionRef, groupsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc } from './spravca-turnaja-common.js'; // Importuj potrebné funkcie

document.addEventListener('DOMContentLoaded', () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Referencie na HTML elementy
    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDescriptionInput = document.getElementById('matchDescription');
    const matchDateInput = document.getElementById('matchDate');
    const matchTimeInput = document.getElementById('matchTime');
    const matchLocationInput = document.getElementById('matchLocation');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchTeam1Input = document.getElementById('matchTeam1');
    const matchTeam2Input = document.getElementById('matchTeam2');
    const matchModalTitle = document.getElementById('matchModalTitle');

    // Zobrazenie správnej sekcie po načítaní
    // loadCategoriesTable(); // Túto funkciu nemáme definovanú, takže ju zatiaľ zakomentujem alebo odstránim, ak nie je potrebná
    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // Event listener pre tlačidlo "Pridať"
    addButton.addEventListener('click', () => {
        // Resetuj formulár a skryté ID
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas / dopravu';

        // Naplň select pre kategórie
        populateCategorySelect(matchCategorySelect);

        // Vyčisti a zablokuj select pre skupiny, kým sa nevyberie kategória
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (voliteľné) --</option>';
        matchGroupSelect.disabled = true;

        openModal(matchModal);
    });

    // Event listener pre zmenu kategórie
    matchCategorySelect.addEventListener('change', () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (voliteľné) --</option>';
            matchGroupSelect.disabled = true;
        }
    });

    // Event listener pre zatvorenie modálneho okna
    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
    });

    // Event listener pre odoslanie formulára (zatiaľ len pre zobrazenie dát)
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Zabráni predvolenému odoslaniu formulára

        const matchData = {
            description: matchDescriptionInput.value,
            date: matchDateInput.value,
            time: matchTimeInput.value,
            location: matchLocationInput.value,
            categoryId: matchCategorySelect.value,
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroupSelect.value || null, // Ak nie je vybraná skupina
            groupName: matchGroupSelect.value ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text : null,
            team1: matchTeam1Input.value || null,
            team2: matchTeam2Input.value || null,
            // Pridaj ďalšie polia podľa potreby (napr. typ: 'zapas'/'doprava')
            createdAt: new Date() // Pre časovú značku vytvorenia
        };

        console.log('Dáta zápasu/dopravy na uloženie:', matchData);


        closeModal(matchModal); // Zatvor modálne okno po (simulovanom) uložení
        alert("Zápas/doprava by sa uložila! (Pozri konzolu)");
    });

    // !!! Dôležité: Ak loadCategoriesTable() nie je potrebná alebo ju nevieš definovať,
    // potom ju odstráň alebo sa uisti, že je definovaná inde.
    // Pôvodne si volal túto funkciu na začiatku.
});

// Ak funkcia loadCategoriesTable() skutočne nikde nie je, môžeš ju definovať tu
// (aj keď zatiaľ nemáme "tabuľku" kategórií na stránke, názov je mätúci)
// Ak mala naplniť niečo iné, treba to premenovať a prispôsobiť.
// function loadCategoriesTable() {
//     console.log("Funkcia loadCategoriesTable() je volaná, ale nie je definovaná jej implementácia pre zobrazenie dát.");
//     // Sem by prišla logika načítania a zobrazenia dát zápasov/dopravy
// }

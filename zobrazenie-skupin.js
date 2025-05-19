import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Globálne premenné pre HTML elementy a dáta
let dynamicContentArea = null;
let backToCategoriesButton = null;
let backToGroupButtonsButton = null;
let categoryButtonsContainer = null;
let categoryTitleDisplay = null;
let groupSelectionButtons = null;
let allGroupsContent = null;
let singleGroupContent = null;
let allGroupsContainer = null;
let allGroupsUnassignedDisplay = null;
let singleGroupDisplayBlock = null;
let singleGroupUnassignedDisplay = null;

// Dáta z databázy
let allCategories = [];
let allGroups = [];
let allTeams = []; // Predpokladá sa, že toto pole obsahuje informácie o tímoch vrátane `clubName`

// Premenné pre sledovanie aktuálneho stavu zobrazenia
let currentCategoryId = null;
let currentGroupId = null;

// --- Funkcie na získanie HTML elementov a kontrolu ich existencie ---
function getHTMLElements() {
    dynamicContentArea = document.getElementById('dynamicContentArea');
    backToCategoriesButton = document.getElementById('backToCategoriesButton');
    backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');
    categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
    categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
    groupSelectionButtons = document.getElementById('groupSelectionButtons');
    allGroupsContent = document.getElementById('allGroupsContent');
    singleGroupContent = document.getElementById('singleGroupContent');
    
    // QuerySelector pre vnútorne elementy, ktoré nemajú ID
    allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
    allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
    singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null;
    singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;

    // Kontrola, či boli nájdené všetky potrebné elementy
    const elementsFound = dynamicContentArea && backToCategoriesButton && backToGroupButtonsButton &&
                            categoryButtonsContainer && categoryTitleDisplay && groupSelectionButtons &&
                            allGroupsContent && singleGroupContent &&
                            allGroupsContainer && allGroupsUnassignedDisplay && // Tieto môžu byť null, ak nie sú zobrazené
                            singleGroupDisplayBlock && singleGroupUnassignedDisplay; // Tieto môžu byť null, ak nie sú zobrazené
    
    // Ak niektoré kľúčové elementy chýbajú, zobraziť chybu a skryť ostatné
    if (!elementsFound) {
        if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>FATAL ERROR: Chyba pri inicializácii aplikácie. Chýbajú potrebné HTML elementy. Skontrolujte konzolu pre detaily.</p>';
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
        if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        console.error("Chýbajúce HTML elementy pre správnu funkčnosť aplikácie!");
        return false;
    }
    return true;
}

// --- Funkcia na načítanie dát z databázy ---
async function loadAllTournamentData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Zabezpečiť, že categoryId je správne prepojené (pre spätnú kompatibilitu)
        allGroups = allGroups.map(group => {
            if (!group.categoryId) {
                const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                if (categoryFromId) {
                    group.categoryId = categoryFromId.id;
                }
            }
            return group;
        }).filter(group => group.categoryId); // Filtrovať skupiny bez platného categoryId
        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));

        const teamsSnapshot = await getDocs(clubsCollectionRef); // Podľa komentára sa tu načítavajú tímy, nie kluby
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ak 'clubsCollectionRef' naozaj obsahuje kluby a nie tímy, budeš musieť mať 'allClubs' a potom mapovať team.clubId na club.name
        // Pre tento kód predpokladáme, že allTeams už obsahuje tímy s clubName (alebo clubId a názvy klubov sa budú musieť dodatočne načítať/spojiť)
        // Ak 'allTeams' má len 'clubId', pridaj sem načítanie klubov:
        // const clubsSnapshot = await getDocs(clubsCollectionRef);
        // const allClubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // A potom pri vytváraní URL dohľadaj clubName z allClubsData
    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (dynamicContentArea && categoryButtonsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = '<p class="error-message">Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
            categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
        } else if (dynamicContentArea) {
            dynamicContentArea.innerHTML = '<p class="error-message">Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        // Skryť všetko okrem prípadnej chybovej správy
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
        if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja."); // Voliteľné upozornenie pre používateľa
    }
}

// --- Funkcia na kontrolu zobrazenia hlavných obsahových oblastí ---
function showOnly(containerIdToShow) {
    // Skryť obe hlavné obsahové oblasti na začiatku
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';

    // Pridanie/odstránenie špeciálnej triedy pre dynamickú zmenu štýlov
    if (dynamicContentArea) {
        if (containerIdToShow === 'singleGroupContent') {
            dynamicContentArea.classList.add('single-group-active');
        } else {
            dynamicContentArea.classList.remove('single-group-active');
        }
    }

    // Zobrazenie vybraného kontajnera
    switch (containerIdToShow) {
        case 'allGroupsContent':
            if (allGroupsContent) allGroupsContent.style.display = 'block';
            break;
        case 'singleGroupContent':
            if (singleGroupContent) singleGroupContent.style.display = 'block';
            break;
        default: // Skryť obe hlavné obsahové oblasti
            if (allGroupsContent) allGroupsContent.style.display = 'none';
            if (singleGroupContent) singleGroupContent.style.display = 'none';
            break;
    }

    // Logika pre zmenu veľkosti tabuliek (ak sa zobrazuje)
    if (containerIdToShow === 'allGroupsContent' && allGroupsContainer && window.getComputedStyle(allGroupsContent).display !== 'none') {
        const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
        if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, allGroupsContainer);
        }
    } else if (containerIdToShow === 'singleGroupContent' && singleGroupContent && window.getComputedStyle(singleGroupContent).display !== 'none') {
        const uniformWidth = findMaxTableContentWidth(singleGroupContent);
        if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, singleGroupContent);
        }
    }
}

---

### Funkcie pre správu aktívnych tried tlačidiel

```javascript
// Odstráni triedu 'active' zo všetkých tlačidiel kategórií
function clearActiveCategoryButtons() {
    const categoryButtons = categoryButtonsContainer ? categoryButtonsContainer.querySelectorAll('.display-button') : [];
    categoryButtons.forEach(button => button.classList.remove('active'));
}

// Pridá triedu 'active' tlačidlu kategórie s daným ID
function setActiveCategoryButton(categoryId) {
    clearActiveCategoryButtons();
    const categoryButton = categoryButtonsContainer ? categoryButtonsContainer.querySelector(`.display-button[data-category-id="${categoryId}"]`) : null;
    if (categoryButton) {
        categoryButton.classList.add('active');
    }
}

// Odstráni triedu 'active' zo všetkých tlačidiel výberu skupiny
function clearActiveGroupButtons() {
    const groupButtons = groupSelectionButtons ? groupSelectionButtons.querySelectorAll('.display-button') : [];
    groupButtons.forEach(button => button.classList.remove('active'));

    // Odstrániť 'active-title' z názvov skupín v prehľade
    const groupTitlesInAllView = allGroupsContainer ? allGroupsContainer.querySelectorAll('.group-display h3') : [];
    groupTitlesInAllView.forEach(title => title.classList.remove('active-title'));
}

// Pridá triedu 'active' tlačidlu výberu skupiny s daným ID
function setActiveGroupButton(groupId) {
    clearActiveGroupButtons();
    const groupButton = groupSelectionButtons ? groupSelectionButtons.querySelector(`.display-button[data-group-id="${groupId}"]`) : null;
    if (groupButton) {
        groupButton.classList.add('active');
    }

    // Pridať triedu 'active-title' zodpovedajúcemu názvu skupiny v prehľade
    if (allGroupsContainer) {
        const groupDisplays = allGroupsContainer.querySelectorAll('.group-display');
        groupDisplays.forEach(groupDiv => {
            if (groupDiv.dataset.groupId === groupId) { // Používame dataset.groupId
                const h3Title = groupDiv.querySelector('h3');
                if (h3Title) {
                    h3Title.classList.add('active-title');
                }
            }
        });
    }
}

---

### Funkcie pre navigáciu a zobrazenie obsahu

```javascript
// Zobrazí úvodný pohľad s tlačidlami kategórií
function displayCategoriesAsButtons() {
    currentCategoryId = null;
    currentGroupId = null;
    if (!getHTMLElements()) {
        return;
    }

    // Nastaviť viditeľnosť pre pohľad s tlačidlami kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Skryť ostatné hlavné obsahové oblasti
    showOnly(null);

    // Vyčistiť a znova vygenerovať tlačidlá kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';

    // Odstrániť triedy 'active' z tlačidiel
    clearActiveCategoryButtons();
    clearActiveGroupButtons();

    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }

    // Zoskupiť kategórie (Chlapci, Dievčatá, Ostatné) a vytvoriť tlačidlá
    const chlapciCategories = [];
    const dievcataCategories = [];
    const ostatneCategories = [];
    const sortedCategories = [...allCategories].sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

    sortedCategories.forEach(category => {
        const categoryName = category.name || category.id;
        if (categoryName.endsWith(' CH')) {
            chlapciCategories.push(category);
        } else if (categoryName.endsWith(' D')) {
            dievcataCategories.push(category);
        } else {
            ostatneCategories.push(category);
        }
    });

    const createCategoryGroupDisplay = (title, categories) => {
        if (categories.length === 0) return null;
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('category-group');
        const heading = document.createElement('h3');
        heading.textContent = title;
        groupDiv.appendChild(heading);
        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('category-buttons');
        groupDiv.appendChild(buttonsDiv);
        categories.forEach(category => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = category.name || category.id;
            button.dataset.categoryId = category.id;
            button.addEventListener('click', () => {
                const categoryId = button.dataset.categoryId;
                displayGroupsForCategory(categoryId);
            });
            buttonsDiv.appendChild(button);
        });
        return groupDiv;
    };

    if (categoryButtonsContainer) {
        const chlapciGroup = createCategoryGroupDisplay('Chlapci', chlapciCategories);
        if (chlapciGroup) {
            categoryButtonsContainer.appendChild(chlapciGroup);
        }
        const dievcataGroup = createCategoryGroupDisplay('Dievčatá', dievcataCategories);
        if (dievcataGroup) {
            categoryButtonsContainer.appendChild(dievcataGroup);
        }
        const ostatneGroup = createCategoryGroupDisplay('Ostatné kategórie', ostatneCategories);
        if (ostatneGroup) {
            categoryButtonsContainer.appendChild(ostatneGroup);
        }

        if (categoryButtonsContainer.children.length === 0) {
            categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        }
    }
}

// Zobrazí prehľad skupín pre vybranú kategóriu
function displayGroupsForCategory(categoryId) {
    currentCategoryId = categoryId;
    currentGroupId = null;
    if (!getHTMLElements()) {
        goBackToCategories();
        return;
    }

    // Nastaviť viditeľnosť pre pohľad prehľadu skupín
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistiť obsah oblastí
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';

    // Zobraziť oblasť všetkých skupín, skryť detail jednej skupiny
    showOnly('allGroupsContent');

    // Nastaviť aktívnu triedu pre vybranú kategóriu
    setActiveCategoryButton(categoryId);
    clearActiveGroupButtons();

    // Aktualizovať hash v URL
    window.location.hash = 'category-' + encodeURIComponent(categoryId);

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
        console.error(`Kategória "${categoryId}" sa nenašla.`);
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        showOnly(null);
        if (dynamicContentArea && categoryButtonsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `<p class="error-message">Chyba: Kategória "${categoryId}" sa nenašla. Prosím, skúste znova alebo kontaktujte administrátora.</p>`;
            categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
        }
        return;
    }

    if (categoryTitleDisplay) categoryTitleDisplay.textContent = selectedCategory.name || selectedCategory.id;

    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

    // Apply special layout class if exactly 5 groups for this category
    if (allGroupsContainer) {
        if (groupsInCategory.length === 5) {
            allGroupsContainer.classList.add('force-3-plus-2-layout');
        } else {
            allGroupsContainer.classList.remove('force-3-plus-2-layout');
        }
    }

    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));

    if (groupsInCategory.length === 0) {
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContainer) allGroupsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
    } else {
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = group.name || group.id;
            button.dataset.groupId = group.id;
            button.addEventListener('click', () => {
                const groupIdToDisplay = button.dataset.groupId;
                displaySingleGroup(groupIdToDisplay);
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button);
        });

        // Vygenerovať zobrazenie všetkých skupín s tímami (upravené pre UL/LI klik)
        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display');
            groupDiv.dataset.groupId = group.id; // Pridané data-group-id k div.group-display

            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);
            groupTitle.style.cursor = 'pointer'; // Názov skupiny v prehľade je klikateľný
            groupTitle.addEventListener('click', () => {
                const groupIdToDisplay = group.id;
                displaySingleGroup(groupIdToDisplay);
            });

            const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
            if (teamsInGroup.length === 0) {
                const noTeamsPara = document.createElement('p');
                noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                noTeamsPara.style.padding = '10px';
                groupDiv.appendChild(noTeamsPara);
            } else {
                teamsInGroup.sort((a, b) => {
                    const orderA = a.orderInGroup || Infinity;
                    const orderB = b.orderInGroup || Infinity;
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    const nameA = (a.name || a.id || '').toLowerCase();
                    const nameB = (b.name || b.id || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'sk-SK');
                });
                const teamList = document.createElement('ul');
                teamList.classList.add('team-list'); // Trieda pre UL
                teamsInGroup.forEach(team => {
                    const teamItem = document.createElement('li');
                    teamItem.classList.add('team-list-item'); // Trieda pre LI
                    teamItem.textContent = team.name || 'Neznámy tím';
                    teamItem.style.cursor = 'pointer'; // Vizuálna indikácia klikateľnosti

                    // Predpokladáme, že 'team' objekt má vlastnosť 'clubName'
                    const clubName = team.clubName || 'Neznámy klub';

                    // Získať aktuálnu kategóriu a skupinu pre kompletný názov tímu
                    const categoryForUrl = allCategories.find(cat => cat.id === currentCategoryId);
                    const groupForUrl = allGroups.find(g => g.id === group.id);

                    const fullTeamName = `${categoryForUrl ? (categoryForUrl.name || categoryForUrl.id) : ''} - ${groupForUrl ? (groupForUrl.name || groupForUrl.id) : ''} - ${team.name || 'Neznámy tím'}`.trim();
                    
                    // Bezpečné kódovanie pre URL
                    const cleanedClubName = encodeURIComponent(clubName.replace(/\s/g, '+'));
                    const cleanedTeamName = encodeURIComponent(fullTeamName.replace(/\s/g, '+'));

                    teamItem.addEventListener('click', () => {
                        const url = `prihlasene-kluby.html?club=${cleanedClubName}&team=${cleanedTeamName}`;
                        window.location.href = url;
                    });
                    teamList.appendChild(teamItem);
                });
                groupDiv.appendChild(teamList);
            }
            if (allGroupsContainer) allGroupsContainer.appendChild(groupDiv);
        });
    }

    // Zobraziť nepriradené tímy
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === categoryId
    );

    if (unassignedTeamsInCategory.length > 0) {
        if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
        const unassignedDivContent = document.createElement('div');
        unassignedDivContent.classList.add('unassigned-teams-section'); // Nová trieda pre sekciu nepriradených tímov
        const unassignedTitle = document.createElement('h2');
        unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
        unassignedDivContent.appendChild(unassignedTitle);
        unassignedTeamsInCategory.sort((a, b) => {
            const nameA = (a.name || a.id || '').toLowerCase();
            const nameB = (b.name || b.id || '').toLowerCase();
            return nameA.localeCompare(nameB, 'sk-SK');
        });
        const unassignedList = document.createElement('ul');
        unassignedList.classList.add('unassigned-team-list'); // Trieda pre UL nepriradených tímov
        unassignedTeamsInCategory.forEach(team => {
            const teamItem = document.createElement('li');
            teamItem.classList.add('unassigned-team-list-item'); // Trieda pre LI nepriradených tímov
            teamItem.textContent = team.name || 'Neznámy tím';
            // Nepriradené tímy pravdepodobne nebudú klikateľné na presmerovanie, ale ak by mali byť, pridaj event listener
            unassignedList.appendChild(teamItem);
        });
        unassignedDivContent.appendChild(unassignedList);
        if (allGroupsUnassignedDisplay) {
            allGroupsUnassignedDisplay.appendChild(unassignedDivContent);
        }
    } else {
        if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    }
}

// Zobrazí detail jednej skupiny
function displaySingleGroup(groupId) {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) {
        console.error(`Skupina "${groupId}" sa nenašla.`);
        const hash = window.location.hash;
        const categoryPrefix = '#category-';
        const hashParts = hash.startsWith(categoryPrefix) ? hash.substring(categoryPrefix.length).split('/')[0] : null;
        const categoryIdFromHash = hashParts ? decodeURIComponent(hashParts) : null;

        if (categoryIdFromHash && allCategories.some(cat => cat.id === categoryIdFromHash)) {
            displayGroupsForCategory(categoryIdFromHash);
        } else {
            goBackToCategories();
        }
        return;
    }

    currentCategoryId = group.categoryId;
    currentGroupId = groupId;

    if (!getHTMLElements()) {
        goBackToCategories();
        return;
    }

    // Zabezpečiť viditeľnosť základných elementov pre detail skupiny
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block';

    // Vyčistiť obsah oblastí detailu skupiny
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    // Zobraziť detail jednej skupiny, skryť oblasť všetkých skupín
    showOnly('singleGroupContent');

    // Nastaviť aktívnu triedu pre vybranú kategóriu a skupinu
    setActiveCategoryButton(currentCategoryId);
    setActiveGroupButton(groupId);

    // Aktualizovať hash v URL
    window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;

    const category = allCategories.find(cat => cat.id === currentCategoryId);
    if (category && categoryTitleDisplay) {
        categoryTitleDisplay.textContent = category.name || category.id;
    }

    if (singleGroupDisplayBlock) {
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = group.name || group.id;
        groupTitle.style.cursor = 'default';
        groupTitle.style.pointerEvents = 'none';
        singleGroupDisplayBlock.appendChild(groupTitle);

        const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
        if (teamsInGroup.length === 0) {
            const noTeamsPara = document.createElement('p');
            noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
            noTeamsPara.style.padding = '10px';
            singleGroupDisplayBlock.appendChild(noTeamsPara);
        } else {
            teamsInGroup.sort((a, b) => {
                const orderA = a.orderInGroup || Infinity;
                const orderB = b.orderInGroup || Infinity;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                const nameA = (a.name || a.id || '').toLowerCase();
                const nameB = (b.name || b.id || '').toLowerCase();
                return nameA.localeCompare(nameB, 'sk-SK');
            });
            const teamList = document.createElement('ul');
            teamList.classList.add('team-list'); // Trieda pre UL
            teamsInGroup.forEach(team => {
                const teamItem = document.createElement('li');
                teamItem.classList.add('team-list-item'); // Trieda pre LI
                teamItem.textContent = team.name || 'Neznámy tím';
                teamItem.style.cursor = 'pointer'; // Vizuálna indikácia klikateľnosti

                // Predpokladáme, že 'team' objekt má vlastnosť 'clubName'
                const clubName = team.clubName || 'Neznámy klub';

                // Získať aktuálnu kategóriu a skupinu pre kompletný názov tímu
                const categoryForUrl = allCategories.find(cat => cat.id === currentCategoryId);
                const groupForUrl = allGroups.find(g => g.id === groupId);

                const fullTeamName = `${categoryForUrl ? (categoryForUrl.name || categoryForUrl.id) : ''} - ${groupForUrl ? (groupForUrl.name || groupForUrl.id) : ''} - ${team.name || 'Neznámy tím'}`.trim();
                
                // Bezpečné kódovanie pre URL
                const cleanedClubName = encodeURIComponent(clubName.replace(/\s/g, '+'));
                const cleanedTeamName = encodeURIComponent(fullTeamName.replace(/\s/g, '+'));

                teamItem.addEventListener('click', () => {
                    const url = `prihlasene-kluby.html?club=${cleanedClubName}&team=${cleanedTeamName}`;
                    window.location.href = url;
                });
                teamList.appendChild(teamItem);
            });
            singleGroupDisplayBlock.appendChild(teamList);
        }
    }

    // Zobraziť nepriradené tímy pre danú kategóriu
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === currentCategoryId
    );

    if (unassignedTeamsInCategory.length > 0) {
        if (singleGroupUnassignedDisplay) {
            singleGroupUnassignedDisplay.innerHTML = '';
            const unassignedDivContent = document.createElement('div');
            unassignedDivContent.classList.add('unassigned-teams-section');
            const unassignedTitle = document.createElement('h2');
            unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
            unassignedDivContent.appendChild(unassignedTitle);
            unassignedTeamsInCategory.sort((a, b) => {
                const nameA = (a.name || a.id || '').toLowerCase();
                const nameB = (b.name || b.id || '').toLowerCase();
                return nameA.localeCompare(nameB, 'sk-SK');
            });
            const unassignedList = document.createElement('ul');
            unassignedList.classList.add('unassigned-team-list');
            unassignedTeamsInCategory.forEach(team => {
                const teamItem = document.createElement('li');
                teamItem.classList.add('unassigned-team-list-item');
                teamItem.textContent = team.name || 'Neznámy tím';
                unassignedList.appendChild(teamItem);
            });
            unassignedDivContent.appendChild(unassignedList);
            if (singleGroupUnassignedDisplay) {
                singleGroupUnassignedDisplay.appendChild(unassignedDivContent);
            }
        }
    } else {
        if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    }
}

// Návrat na zobrazenie kategórií
function goBackToCategories() {
    currentCategoryId = null;
    currentGroupId = null;
    if (!getHTMLElements()) {
        return;
    }

    // Nastaviť viditeľnosť pre pohľad kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistiť obsah oblastí
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';

    // Skryť ostatné hlavné obsahové oblasti
    showOnly(null);

    // Odstrániť triedy 'active' z tlačidiel
    clearActiveCategoryButtons();
    clearActiveGroupButtons();

    // Odstrániť hash z URL
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    displayCategoriesAsButtons(); // Zobraziť úvodné tlačidlá kategórií
}

// Návrat na prehľad skupín v aktuálnej kategórii
function goBackToGroupView() {
    const categoryIdToReturnTo = currentCategoryId;
    currentGroupId = null;

    if (!getHTMLElements()) {
        goBackToCategories();
        return;
    }

    if (!categoryIdToReturnTo) {
        goBackToCategories();
        return;
    }

    // Nastaviť viditeľnosť pre pohľad prehľadu skupín
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistiť obsah oblasti detailu skupiny
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    // Zobraziť oblasť všetkých skupín, skryť detail jednej skupiny
    showOnly('allGroupsContent');

    // Aktívnou zostáva kategória, aktívna skupina sa ruší
    setActiveCategoryButton(categoryIdToReturnTo);
    clearActiveGroupButtons();

    // Aktualizovať hash v URL (odstrániť časť so skupinou)
    window.location.hash = 'category-' + encodeURIComponent(categoryIdToReturnTo);

    // Zobraziť prehľad skupín pre danú kategóriu (znova vygeneruje)
    displayGroupsForCategory(categoryIdToReturnTo);
}

---

### Pomocné funkcie pre šírku tabuliek (zostali nezmenené)

```javascript
// Tieto funkcie sa pravdepodobne týkajú štylovania flexboxom, aj keď hovoríš o "tabuľkách"
// Môžu byť relevantné, ak .group-display simuluje tabuľky
function findMaxTableContentWidth(containerElement) {
    let maxWidth = 0;
    if (!containerElement) {
        return 0;
    }
    const groupDisplays = containerElement.querySelectorAll('.group-display'); // Zmenené z groupTables na groupDisplays
    if (groupDisplays.length === 0) {
        return 0;
    }
    groupDisplays.forEach(displayDiv => { // Zmenené z table na displayDiv
        const originalStyles = {
            flexBasis: displayDiv.style.flexBasis,
            width: displayDiv.style.width,
            minWidth: displayDiv.style.minWidth,
            maxWidth: displayDiv.style.maxWidth,
            flexShrink: displayDiv.style.flexShrink,
            flexGrow: displayDiv.style.flexGrow,
            display: displayDiv.style.display
        };
        let tempDisplay = originalStyles.display;
        if (window.getComputedStyle(displayDiv).display === 'none') {
            displayDiv.style.display = 'block';
        }
        displayDiv.style.flexBasis = 'max-content';
        displayDiv.style.width = 'auto';
        displayDiv.style.minWidth = 'auto';
        displayDiv.style.maxWidth = 'none';
        displayDiv.style.flexShrink = '0';
        displayDiv.style.flexGrow = '0';
        const requiredWidth = displayDiv.offsetWidth;
        displayDiv.style.flexBasis = originalStyles.flexBasis;
        displayDiv.style.width = originalStyles.width;
        displayDiv.style.minWidth = originalStyles.minWidth;
        displayDiv.style.maxWidth = originalStyles.maxWidth;
        displayDiv.style.flexShrink = originalStyles.flexShrink;
        displayDiv.style.flexGrow = originalStyles.flexGrow;
        if (window.getComputedStyle(displayDiv).display === 'block' && tempDisplay === 'none') {
            displayDiv.style.display = originalStyles.display;
        }
        if (requiredWidth > maxWidth) {
            maxWidth = requiredWidth;
        }
    });
    const safetyPadding = 20;
    return maxWidth > 0 ? maxWidth + safetyPadding : 0;
}

function setUniformTableWidth(width, containerElement) {
    if (width <= 0 || !containerElement) {
        return;
    }
    const groupDisplays = containerElement.querySelectorAll('.group-display'); // Zmenené z groupTables na groupDisplays
    if (groupDisplays.length === 0) {
        return;
    }
    groupDisplays.forEach(displayDiv => { // Zmenené z table na displayDiv
        displayDiv.style.width = `${width}px`;
        displayDiv.style.minWidth = `${width}px`;
        displayDiv.style.maxWidth = `${width}px`;
        displayDiv.style.flexBasis = 'auto'; // Reset flex-basis
        displayDiv.style.flexShrink = '0';
        displayDiv.style.flexGrow = '0';
    });
}

---

### Spracovanie načítania stránky a zmeny hashu URL

```javascript
// Spracovanie načítania stránky
document.addEventListener('DOMContentLoaded', async () => {
    if (!getHTMLElements()) {
        return;
    }

    await loadAllTournamentData();

    // Pridať poslucháčov udalostí pre tlačidlá späť
    if (backToCategoriesButton) backToCategoriesButton.addEventListener('click', goBackToCategories);
    if (backToGroupButtonsButton) backToGroupButtonsButton.addEventListener('click', goBackToGroupView);

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

    // Ak existujú dáta (načítanie bolo úspešné)
    if (allCategories.length > 0) {
        displayCategoriesAsButtons(); // Toto naplní #categoryButtonsContainer a nastaví jeho display

        if (hash && hash.startsWith(categoryPrefix)) {
            const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
            const urlCategoryId = hashParts[0];
            const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;
            const decodedCategoryId = decodeURIComponent(urlCategoryId);
            const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;

            const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

            if (categoryExists) {
                displayGroupsForCategory(decodedCategoryId);

                if (decodedGroupId) {
                    const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                    if (groupExists) {
                        displaySingleGroup(decodedGroupId);
                    } else {
                        console.warn(`Skupina "${decodedGroupId}" z URL sa nenašla v kategórii "${decodedCategoryId}". Zobrazujem prehľad skupín kategórie.`);
                    }
                } else {
                    console.log(`V hashi je iba kategória "${decodedCategoryId}". Zobrazujem prehľad skupín.`);
                }
            } else {
                console.warn(`Kategória "${decodedCategoryId}" z URL sa nenašla. Zobrazujem úvodné kategórie.`);
            }
        } else {
            console.log("Žiadny platný hash. Zobrazujem úvodné kategórie.");
        }
    }
});

// Spracovanie zmeny hashu v URL
window.addEventListener('hashchange', () => {
    if (!getHTMLElements()) {
        return;
    }

    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

    if (hash && hash.startsWith(categoryPrefix)) {
        const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
        const urlCategoryId = hashParts[0];
        const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;
        const decodedCategoryId = decodeURIComponent(urlCategoryId);
        const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;

        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            const alreadyInTargetState = (currentCategoryId === decodedCategoryId) &&
                                         (currentGroupId === decodedGroupId);
            if (alreadyInTargetState) {
                return;
            }

            currentCategoryId = decodedCategoryId;
            currentGroupId = decodedGroupId;

            if (decodedGroupId) {
                const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                if (groupExists) {
                    displayGroupsForCategory(decodedCategoryId);
                    displaySingleGroup(decodedGroupId);
                } else {
                    console.warn(`Skupina "${decodedGroupId}" z URL sa nenašla pri zmene hashu. Zobrazujem prehľad skupín kategórie "${decodedCategoryId}".`);
                    displayGroupsForCategory(decodedCategoryId);
                }
            } else {
                console.log(`V hashi je iba kategória "${decodedCategoryId}" pri zmene hashu. Zobrazujem prehľad skupín.`);
                displayGroupsForCategory(decodedCategoryId);
            }
        } else {
            console.warn(`Kategória "${decodedCategoryId}" z URL sa nenašla pri zmene hashu. Vraciam sa na úvod.`);
            goBackToCategories();
        }
    } else {
        console.log("Hash nezačína 'category-' alebo je prázdny pri zmene hashu. Vraciam sa na úvod.");
        goBackToCategories();
    }
});

// Spracovanie zmeny veľkosti okna
window.addEventListener('resize', () => {
    if (!getHTMLElements()) {
        return;
    }
    if (currentCategoryId !== null) {
        const isAllGroupsVisible = allGroupsContent && window.getComputedStyle(allGroupsContent).display !== 'none';
        const isSingleGroupVisible = singleGroupContent && window.getComputedStyle(singleGroupContent).display !== 'none';

        if (isAllGroupsVisible && allGroupsContainer) {
            const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
            if (uniformWidth > 0) {
                setUniformTableWidth(uniformWidth, allGroupsContainer);
            }
        } else if (isSingleGroupVisible && singleGroupContent) {
            const uniformWidth = findMaxTableContentWidth(singleGroupContent);
            if (uniformWidth > 0) {
                setUniformTableWidth(uniformWidth, singleGroupContent);
            }
        }
    }
});

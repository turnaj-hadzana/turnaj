// zobrazenie-skupin.js

// Importy z common súboru (predpokladá sa, že spravca-turnaja-common.js existuje a obsahuje tieto exporty)
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// --- Globálne premenné pre HTML elementy a dáta ---
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

// Dáta z databázy (budú naplnené po načítaní)
let allCategories = [];
let allGroups = [];
let allTeams = []; // Predpokladá sa, že toto pole obsahuje informácie o tímoch vrátane `clubName`

// Premenné pre sledovanie aktuálneho stavu zobrazenia (pre navigáciu histórie)
let currentCategoryId = null;
let currentGroupId = null;

---

### Pomocné funkcie

```javascript
/**
 * Pomocná funkcia na získanie "čistého" názvu klubu z názvu tímu pre URL parameter 'club'.
 * Odstráni koncové písmeno (napr. 'A', 'B') a prípadné prebytočné názvy kategórií,
 * ak sa nechtiac vyskytli v názve klubu.
 *
 * @param {string} rawClubNameFromData - Názov klubu, ako je v dátach (napr. "HC Tatran Stupava A").
 * @param {string} categoryNameFromData - Názov kategórie (napr. "U10 CH"), pre prípadné odstránenie z názvu klubu.
 * @returns {string} Vyčistený názov klubu pre URL (napr. "HC Tatran Stupava").
 */
function getCleanClubNameForUrl(rawClubNameFromData, categoryNameFromData) {
    if (!rawClubNameFromData) return 'Neznámy klub';

    let cleanedName = rawClubNameFromData;

    // 1. Odstránenie koncového písmena (napr. 'A', 'B') oddeleného medzerou
    // Regex: medzera + jedno veľké písmeno (A-Z) na konci reťazca
    const regexEndLetter = /\s[A-Z]$/;
    if (regexEndLetter.test(cleanedName)) {
        cleanedName = cleanedName.replace(regexEndLetter, '');
    }

    // 2. Odstránenie názvu kategórie, ak je náhodou na začiatku názvu klubu.
    // Niekedy sa môže stať, že názov klubu obsahuje aj názov kategórie (ak boli dáta spojené).
    // Napr. "U10 CH - HC Tatran Stupava", chceme len "HC Tatran Stupava".
    if (categoryNameFromData) {
        // Vytvoríme regex, ktorý hľadá názov kategórie na začiatku reťazca,
        // s voliteľnými medzerami a pomlčkami. 'i' pre ignorovanie veľkých/malých písmen.
        // `replace(/[-\s]/g, '[-+\\s]')` zabezpečí, že regex bude hľadať medzery/pomlčky
        // ktoré môžu byť aj ako `+` alebo `%20` v URL-enkódovanom stave.
        const categoryRegex = new RegExp(`^${categoryNameFromData.replace(/[-\s]/g, '[-+\\s]')}\\s*-\\s*`, 'i');
        cleanedName = cleanedName.replace(categoryRegex, '');
    }

    // Na záver odstránime prebytočné medzery na začiatku/konci
    return cleanedName.trim();
}

/**
 * Získava referencie na všetky potrebné HTML elementy.
 * @returns {boolean} True, ak boli všetky kľúčové elementy nájdené, inak false.
 */
function getHTMLElements() {
    dynamicContentArea = document.getElementById('dynamicContentArea');
    backToCategoriesButton = document.getElementById('backToCategoriesButton');
    backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');
    categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
    categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
    groupSelectionButtons = document.getElementById('groupSelectionButtons');
    allGroupsContent = document.getElementById('allGroupsContent');
    singleGroupContent = document.getElementById('singleGroupContent');
    
    // QuerySelector pre vnútorné elementy, ktoré nemajú ID
    allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
    allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
    singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null;
    singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;

    // Kontrola, či boli nájdené všetky potrebné elementy
    const elementsFound = dynamicContentArea && backToCategoriesButton && backToGroupButtonsButton &&
                            categoryButtonsContainer && categoryTitleDisplay && groupSelectionButtons &&
                            allGroupsContent && singleGroupContent &&
                            allGroupsContainer && allGroupsUnassignedDisplay &&
                            singleGroupDisplayBlock && singleGroupUnassignedDisplay;
    
    // Ak niektoré kľúčové elementy chýbajú, zobraziť chybu a skryť ostatné časti UI
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

/**
 * Načíta všetky potrebné dáta (kategórie, skupiny, tímy) z Firebase Firestore.
 */
async function loadAllTournamentData() {
    try {
        // Načítanie kategórií
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        // Načítanie skupín
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Zabezpečiť, že categoryId je správne prepojené (pre spätnú kompatibilitu alebo ak chýba)
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

        // Načítanie tímov (predpokladá sa, že clubsCollectionRef obsahuje dáta o tímoch)
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ak 'clubsCollectionRef' naozaj obsahuje len kluby a nie tímy,
        // museli by ste tu načítať aj kolekciu tímov a spojiť ich dáta s klubmi.
        // Pre tento kód predpokladáme, že `allTeams` už obsahuje tímy s `clubName` alebo `clubId`.
    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        // Zobrazenie chybovej správy v UI
        if (dynamicContentArea && categoryButtonsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = '<p class="error-message">Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
            categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
        } else if (dynamicContentArea) {
            dynamicContentArea.innerHTML = '<p class="error-message">Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        // Skryť ostatné časti UI, ak sa dáta nenačítali
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
        if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja. Skontrolujte prosím internetové pripojenie.");
    }
}

/**
 * Zobrazí len jeden špecifikovaný kontajner s obsahom a skryje ostatné.
 * @param {string|null} containerIdToShow - ID kontajnera, ktorý sa má zobraziť ('allGroupsContent', 'singleGroupContent'), alebo null pre skrytie oboch.
 */
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
        default: // Ak žiadny nie je určený, skryť oba
            if (allGroupsContent) allGroupsContent.style.display = 'none';
            if (singleGroupContent) singleGroupContent.style.display = 'none';
            break;
    }

    // Logika pre dynamickú zmenu šírky tabuliek (pre lepší layout)
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

/**
 * Odstráni triedu 'active' zo všetkých tlačidiel kategórií.
 */
function clearActiveCategoryButtons() {
    const categoryButtons = categoryButtonsContainer ? categoryButtonsContainer.querySelectorAll('.display-button') : [];
    categoryButtons.forEach(button => button.classList.remove('active'));
}

/**
 * Nastaví triedu 'active' pre špecifické tlačidlo kategórie.
 * @param {string} categoryId - ID kategórie, ktorej tlačidlo má byť aktívne.
 */
function setActiveCategoryButton(categoryId) {
    clearActiveCategoryButtons();
    const categoryButton = categoryButtonsContainer ? categoryButtonsContainer.querySelector(`.display-button[data-category-id="${categoryId}"]`) : null;
    if (categoryButton) {
        categoryButton.classList.add('active');
    }
}

/**
 * Odstráni triedu 'active' zo všetkých tlačidiel skupín a názvov skupín.
 */
function clearActiveGroupButtons() {
    const groupButtons = groupSelectionButtons ? groupSelectionButtons.querySelectorAll('.display-button') : [];
    groupButtons.forEach(button => button.classList.remove('active'));

    // Odstrániť 'active-title' z názvov skupín v prehľade (ak sú zobrazené)
    const groupTitlesInAllView = allGroupsContainer ? allGroupsContainer.querySelectorAll('.group-display h3') : [];
    groupTitlesInAllView.forEach(title => title.classList.remove('active-title'));
}

/**
 * Nastaví triedu 'active' pre špecifické tlačidlo skupiny a jej názov v prehľade.
 * @param {string} groupId - ID skupiny, ktorej tlačidlo a názov má byť aktívny.
 */
function setActiveGroupButton(groupId) {
    clearActiveGroupButtons();
    const groupButton = groupSelectionButtons ? groupSelectionButtons.querySelector(`.display-button[data-group-id="${groupId}"]`) : null;
    if (groupButton) {
        groupButton.classList.add('active');
    }

    // Pridať triedu 'active-title' zodpovedajúcemu názvu skupiny v prehľade (ak je zobrazený)
    if (allGroupsContainer) {
        const groupDisplays = allGroupsContainer.querySelectorAll('.group-display');
        groupDisplays.forEach(groupDiv => {
            if (groupDiv.dataset.groupId === groupId) {
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
/**
 * Zobrazí úvodnú obrazovku s tlačidlami kategórií.
 */
function displayCategoriesAsButtons() {
    currentCategoryId = null; // Resetuje aktuálne vybranú kategóriu
    currentGroupId = null;    // Resetuje aktuálne vybranú skupinu

    if (!getHTMLElements()) {
        return; // Ak chýbajú kľúčové HTML elementy, zastaviť
    }

    // Nastaviť viditeľnosť pre pohľad s tlačidlami kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Skryť ostatné hlavné obsahové oblasti (prehľad skupín, detail skupiny)
    showOnly(null);

    // Vyčistiť a znova vygenerovať tlačidlá kategórií
    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';

    // Odstrániť triedy 'active' z predtým aktívnych tlačidiel
    clearActiveCategoryButtons();
    clearActiveGroupButtons();

    // Vyčistiť hash z URL (ak existuje)
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }

    // Zoskupiť kategórie (Chlapci, Dievčatá, Ostatné) a vytvoriť tlačidlá pre každú skupinu
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

    /**
     * Pomocná funkcia na vytvorenie divu pre skupinu kategórií s tlačidlami.
     * @param {string} title - Názov skupiny kategórií (napr. "Chlapci").
     * @param {Array<Object>} categories - Pole kategórií, ktoré patria do tejto skupiny.
     * @returns {HTMLDivElement|null} Vytvorený div element, alebo null, ak nie sú žiadne kategórie.
     */
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
            button.dataset.categoryId = category.id; // Uloží ID kategórie do datasetu
            button.addEventListener('click', () => {
                const categoryId = button.dataset.categoryId;
                displayGroupsForCategory(categoryId); // Zobrazí skupiny pre vybranú kategóriu
            });
            buttonsDiv.appendChild(button);
        });
        return groupDiv;
    };

    // Pridanie skupín kategórií do kontajnera tlačidiel
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

/**
 * Zobrazí prehľad všetkých skupín pre vybranú kategóriu.
 * @param {string} categoryId - ID kategórie, pre ktorú sa majú zobraziť skupiny.
 */
function displayGroupsForCategory(categoryId) {
    currentCategoryId = categoryId; // Nastaví aktuálne vybranú kategóriu
    currentGroupId = null;        // Resetuje vybranú skupinu

    if (!getHTMLElements()) {
        goBackToCategories(); // Ak chýbajú HTML elementy, vrátiť sa na kategórie
        return;
    }

    // Nastaviť viditeľnosť pre pohľad prehľadu skupín
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistiť obsah oblastí pred novým zobrazením
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';

    // Zobraziť oblasť všetkých skupín, skryť detail jednej skupiny
    showOnly('allGroupsContent');

    // Nastaviť aktívnu triedu pre vybranú kategóriu a vyčistiť aktívne skupiny
    setActiveCategoryButton(categoryId);
    clearActiveGroupButtons();

    // Aktualizovať hash v URL s ID kategórie
    window.location.hash = 'category-' + encodeURIComponent(categoryId);

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
        console.error(`Kategória "${categoryId}" sa nenašla.`);
        // Ak sa kategória nenašla, skryť relevantné časti UI a zobraziť chybu
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

    // Zobraziť názov vybranej kategórie
    if (categoryTitleDisplay) categoryTitleDisplay.textContent = selectedCategory.name || selectedCategory.id;

    // Filtrovať a zoradiť skupiny patriace do tejto kategórie
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

    // Aplikovať špeciálnu triedu pre rozloženie, ak je presne 5 skupín (pre špecifický CSS layout)
    if (allGroupsContainer) {
        if (groupsInCategory.length === 5) {
            allGroupsContainer.classList.add('force-3-plus-2-layout');
        } else {
            allGroupsContainer.classList.remove('force-3-plus-2-layout');
        }
    }

    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));

    if (groupsInCategory.length === 0) {
        // Ak nie sú žiadne skupiny v kategórii
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContainer) allGroupsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
    } else {
        // Vygenerovať tlačidlá pre výber skupín
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = group.name || group.id;
            button.dataset.groupId = group.id;
            button.addEventListener('click', () => {
                const groupIdToDisplay = button.dataset.groupId;
                displaySingleGroup(groupIdToDisplay); // Zobrazí detail vybranej skupiny
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button);
        });

        // Vygenerovať zobrazenie všetkých skupín s ich tímami
        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display');
            groupDiv.dataset.groupId = group.id; // Uloží ID skupiny na div element

            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);
            groupTitle.style.cursor = 'pointer'; // Názov skupiny v prehľade je klikateľný
            groupTitle.addEventListener('click', () => {
                const groupIdToDisplay = group.id;
                displaySingleGroup(groupIdToDisplay); // Zobrazí detail skupiny po kliknutí na názov
            });

            const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
            if (teamsInGroup.length === 0) {
                const noTeamsPara = document.createElement('p');
                noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                noTeamsPara.style.padding = '10px';
                groupDiv.appendChild(noTeamsPara);
            } else {
                // Zoradí tímy v skupine (najprv podľa orderInGroup, potom abecedne)
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

                    // Získa názov klubu z dát (napr. z team.clubName alebo z prepojenej kolekcie klubov)
                    const clubNameForListItem = team.clubName || 'Neznámy klub';

                    // Uloží názov klubu do data atribútu LI elementu, aby sa dal získať pri kliknutí
                    teamItem.dataset.clubName = clubNameForListItem;

                    // Získa názov kategórie pre URL (napr. "U10 CH")
                    const categoryForUrl = allCategories.find(cat => cat.id === currentCategoryId);
                    const categoryNameForUrl = categoryForUrl ? (categoryForUrl.name || categoryForUrl.id) : '';
                    
                    // Zostavenie celého názvu tímu pre parameter '&team='
                    // Formát: "Kategória - Názov tímu" (napr. "U10 CH - HC Tatran Stupava A")
                    const fullTeamName = `${categoryNameForUrl} - ${team.name || 'Neznámy tím'}`.trim();
                    
                    // Bezpečné URL kódovanie pre parameter 'team' (medzery sa menia na '+')
                    const cleanedTeamName = encodeURIComponent(fullTeamName.replace(/\s/g, '+'));

                    // Poslucháč udalosti pre kliknutie na tím
                    teamItem.addEventListener('click', (event) => {
                        // Získa názov klubu priamo z kliknutého LI elementu
                        const clickedClubNameRaw = event.currentTarget.dataset.clubName;

                        // Vyčistí názov klubu pomocou getCleanClubNameForUrl() a potom ho URL-enkóduje
                        // Výsledok: "ŠKP+Topoľčany" (bez 'A', 'B' atď.)
                        const cleanedClubName = encodeURIComponent(getCleanClubNameForUrl(clickedClubNameRaw, categoryNameForUrl).replace(/\s/g, '+'));

                        // Vytvorí finálnu URL a presmeruje prehliadač
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

    // Zobraziť nepriradené tímy v danej kategórii
    const unassignedTeamsInCategory = allTeams.filter(team =>
        // Tím je nepriradený, ak nemá groupId alebo má prázdne groupId, a patrí do aktuálnej kategórie
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === categoryId
    );

    if (unassignedTeamsInCategory.length > 0) {
        if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
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
            // Nepriradené tímy tu nie sú klikateľné, ale ak by mali byť, pridajte event listener ako vyššie
            unassignedList.appendChild(teamItem);
        });
        unassignedDivContent.appendChild(unassignedList);
        if (allGroupsUnassignedDisplay) {
            allGroupsUnassignedDisplay.appendChild(unassignedDivContent);
        }
    } else {
        if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistiť, ak nie sú nepriradené tímy
    }
}

/**
 * Zobrazí detail jednej skupiny.
 * @param {string} groupId - ID skupiny, ktorej detail sa má zobraziť.
 */
function displaySingleGroup(groupId) {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) {
        console.error(`Skupina "${groupId}" sa nenašla.`);
        // Pokus o návrat do predchádzajúceho platného stavu
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

    currentCategoryId = group.categoryId; // Nastaví aktuálnu kategóriu
    currentGroupId = groupId;            // Nastaví aktuálnu skupinu

    if (!getHTMLElements()) {
        goBackToCategories();
        return;
    }

    // Zabezpečiť viditeľnosť základných elementov pre detail skupiny
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block'; // Zobrazí tlačidlo späť na prehľad skupín

    // Vyčistiť obsah oblastí detailu skupiny
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    // Zobraziť oblasť detailu jednej skupiny, skryť prehľad všetkých skupín
    showOnly('singleGroupContent');

    // Nastaviť aktívnu triedu pre vybranú kategóriu a skupinu
    setActiveCategoryButton(currentCategoryId);
    setActiveGroupButton(groupId);

    // Aktualizovať hash v URL s ID kategórie a skupiny
    window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;

    const category = allCategories.find(cat => cat.id === currentCategoryId);
    if (category && categoryTitleDisplay) {
        categoryTitleDisplay.textContent = category.name || category.id;
    }

    if (singleGroupDisplayBlock) {
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = group.name || group.id;
        groupTitle.style.cursor = 'default';      // Názov skupiny v detaile už nie je klikateľný
        groupTitle.style.pointerEvents = 'none'; // Zakáže kliknutie
        singleGroupDisplayBlock.appendChild(groupTitle);

        const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
        if (teamsInGroup.length === 0) {
            const noTeamsPara = document.createElement('p');
            noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
            noTeamsPara.style.padding = '10px';
            singleGroupDisplayBlock.appendChild(noTeamsPara);
        } else {
            // Zoradí tímy v skupine
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

                // Získa názov klubu z dát
                const clubNameForListItem = team.clubName || 'Neznámy klub';

                // Uloží názov klubu do data atribútu LI elementu
                teamItem.dataset.clubName = clubNameForListItem;

                // Získa názov kategórie pre URL
                const categoryForUrl = allCategories.find(cat => cat.id === currentCategoryId);
                const categoryNameForUrl = categoryForUrl ? (categoryForUrl.name || categoryForUrl.id) : '';
                
                // Zostavenie celého názvu tímu pre parameter '&team='
                const fullTeamName = `${categoryNameForUrl} - ${team.name || 'Neznámy tím'}`.trim();
                
                // Bezpečné URL kódovanie pre parameter 'team'
                const cleanedTeamName = encodeURIComponent(fullTeamName.replace(/\s/g, '+'));

                // Poslucháč udalosti pre kliknutie na tím
                teamItem.addEventListener('click', (event) => {
                    // Získa názov klubu priamo z kliknutého LI elementu
                    const clickedClubNameRaw = event.currentTarget.dataset.clubName;

                    // Vyčistí názov klubu pomocou getCleanClubNameForUrl() a potom ho URL-enkóduje
                    const cleanedClubName = encodeURIComponent(getCleanClubNameForUrl(clickedClubNameRaw, categoryNameForUrl).replace(/\s/g, '+'));

                    // Vytvorí finálnu URL a presmeruje prehliadač
                    const url = `prihlasene-kluby.html?club=${cleanedClubName}&team=${cleanedTeamName}`;
                    window.location.href = url;
                });
                teamList.appendChild(teamItem);
            });
            singleGroupDisplayBlock.appendChild(teamList);
        }
    }

    // Zobraziť nepriradené tímy pre danú kategóriu pod detailom skupiny
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

/**
 * Vráti sa na zobrazenie úvodných tlačidiel kategórií.
 */
function goBackToCategories() {
    currentCategoryId = null; // Resetuje aktuálnu kategóriu
    currentGroupId = null;    // Resetuje aktuálnu skupinu

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

/**
 * Vráti sa na prehľad skupín v aktuálne vybranej kategórii.
 */
function goBackToGroupView() {
    const categoryIdToReturnTo = currentCategoryId; // Uloží ID aktuálnej kategórie
    currentGroupId = null;                         // Resetuje aktuálnu skupinu

    if (!getHTMLElements()) {
        goBackToCategories();
        return;
    }

    if (!categoryIdToReturnTo) {
        goBackToCategories(); // Ak nie je aktuálna kategória, vráti sa na úvod
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

### Pomocné funkcie pre šírku tabuliek

```javascript
/**
 * Nájde maximálnu potrebnú šírku pre zobrazenie obsahu skupín (tabuliek)
 * v danom kontajneri. Používa sa na zabezpečenie jednotnej šírky stĺpcov.
 * @param {HTMLElement} containerElement - HTML element kontajnera (.groups-container alebo singleGroupContent).
 * @returns {number} Maximálna šírka v pixeloch.
 */
function findMaxTableContentWidth(containerElement) {
    let maxWidth = 0;
    if (!containerElement) {
        return 0;
    }
    const groupDisplays = containerElement.querySelectorAll('.group-display');
    if (groupDisplays.length === 0) {
        return 0;
    }
    groupDisplays.forEach(displayDiv => {
        // Uloží pôvodné štýly, aby sme ich mohli obnoviť po výpočte
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
        // Ak je element skrytý, dočasne ho zobraziť, aby sme mohli zmerať jeho šírku
        if (window.getComputedStyle(displayDiv).display === 'none') {
            displayDiv.style.display = 'block';
        }
        // Nastaví štýly tak, aby element zaujal len toľko miesta, koľko potrebuje jeho obsah
        displayDiv.style.flexBasis = 'max-content';
        displayDiv.style.width = 'auto';
        displayDiv.style.minWidth = 'auto';
        displayDiv.style.maxWidth = 'none';
        displayDiv.style.flexShrink = '0';
        displayDiv.style.flexGrow = '0';

        const requiredWidth = displayDiv.offsetWidth; // Získa skutočnú šírku obsahu

        // Obnoví pôvodné štýly
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
    const safetyPadding = 20; // Pridá malý padding pre istotu
    return maxWidth > 0 ? maxWidth + safetyPadding : 0;
}

/**
 * Nastaví uniformnú šírku pre všetky zobrazenia skupín (tabuliek) v danom kontajneri.
 * @param {number} width - Šírka v pixeloch, na ktorú sa majú tabuľky nastaviť.
 * @param {HTMLElement} containerElement - HTML element kontajnera.
 */
function setUniformTableWidth(width, containerElement) {
    if (width <= 0 || !containerElement) {
        return;
    }
    const groupDisplays = containerElement.querySelectorAll('.group-display');
    if (groupDisplays.length === 0) {
        return;
    }
    groupDisplays.forEach(displayDiv => {
        displayDiv.style.width = `${width}px`;
        displayDiv.style.minWidth = `${width}px`;
        displayDiv.style.maxWidth = `${width}px`;
        displayDiv.style.flexBasis = 'auto'; // Reset flex-basis
        displayDiv.style.flexShrink = '0';
        displayDiv.style.flexGrow = '0';
    });
}

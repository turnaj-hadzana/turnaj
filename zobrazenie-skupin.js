// zobrazenie-skupin.js

import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

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

let allCategories = [];
let allGroups = [];
let allTeams = [];

let currentCategoryId = null;
let currentGroupId = null;

// Funkcia na získanie "čistého" názvu klubu pre URL
// Prioritne čistí z rawClubNameFromData, ale ak je prázdne, použije teamNameForCleaning.
function getCleanClubNameForUrl(rawClubNameFromData, categoryNameFromData, teamNameForCleaning) {
    let cleanedName = rawClubNameFromData;

    // Ak je rawClubNameFromData prázdne (lebo team.clubName bolo prázdne/null/undefined),
    // použijeme teamNameForCleaning (ktoré je team.name) ako základ.
    if (!cleanedName && teamNameForCleaning) {
        cleanedName = teamNameForCleaning;
    }

    if (!cleanedName) return 'Neznámy klub'; // Fallback ak ani team.name nie je k dispozícii

    // Odstránenie koncových písmen ako 'A', 'B', 'C' (napr. 'Tím A' -> 'Tím')
    cleanedName = cleanedName.replace(/\s[A-Z]$/, '');

    // Odstránenie predpony kategórie (napr. 'U10 CH - Tím' -> 'Tím')
    if (categoryNameFromData) {
        // Vytvoríme regex, ktorý nájde prefix kategórie a pomlčku s medzerami
        const categoryPrefixRegex = new RegExp(`^${categoryNameFromData.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*-\\s*`);
        cleanedName = cleanedName.replace(categoryPrefixRegex, '');
    }

    // Nahradenie medzier '+' pre URL
    return cleanedName.replace(/\s/g, '+');
}

// Funkcia na získanie referencií na HTML elementy
function getHTMLElements() {
    dynamicContentArea = document.getElementById('dynamicContentArea');
    backToCategoriesButton = document.getElementById('backToCategoriesButton');
    backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');
    categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
    categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
    groupSelectionButtons = document.getElementById('groupSelectionButtons');
    allGroupsContent = document.getElementById('allGroupsContent');
    singleGroupContent = document.getElementById('singleGroupContent');
    allGroupsContainer = document.getElementById('allGroupsContainer');
    allGroupsUnassignedDisplay = document.getElementById('allGroupsUnassignedDisplay');
    singleGroupDisplayBlock = document.getElementById('singleGroupDisplayBlock');
    singleGroupUnassignedDisplay = document.getElementById('singleGroupUnassignedDisplay');

    const elements = [
        dynamicContentArea, backToCategoriesButton, backToGroupButtonsButton,
        categoryButtonsContainer, categoryTitleDisplay, groupSelectionButtons,
        allGroupsContent, singleGroupContent, allGroupsContainer,
        allGroupsUnassignedDisplay, singleGroupDisplayBlock, singleGroupUnassignedDisplay
    ];

    const missingElements = elements.filter(el => el === null);

    if (missingElements.length > 0) {
        console.error('Chyba: Niektoré požadované HTML elementy neboli nájdené:', missingElements.map(el => el ? el.id : 'Neznámy element'));
        // Skryť všetky relevantné sekcie, ak chýba základný element
        if (dynamicContentArea) dynamicContentArea.style.display = 'none';
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
        alert('Chyba pri načítaní stránky. Niektoré základné prvky chýbajú. Skúste prosím načítať stránku znova.');
        return false;
    }
    return true;
}

// Načíta všetky dáta z Firebase
async function loadAllTournamentData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allGroups.forEach(group => {
            if (!group.categoryId && group.id) { // Ak skupina nemá categoryId, skúsime ju odvodiť z ID
                const categoryIdMatch = group.id.match(/^(U\d+[A-Z]*\s*[A-Z]*)/);
                if (categoryIdMatch && allCategories.some(cat => cat.id === categoryIdMatch[1].trim())) {
                    group.categoryId = categoryIdMatch[1].trim();
                }
            }
        });
        allGroups.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));


        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log('Údaje načítané:', { allCategories, allGroups, allTeams });
    } catch (error) {
        console.error('Chyba pri načítaní údajov turnaja:', error);
        alert('Nepodarilo sa načítať údaje o turnaji. Skúste to neskôr.');
    }
}

// Zobrazí len jeden z kontajnerov obsahu a ostatné skryje
function showOnly(containerIdToShow) {
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';

    if (containerIdToShow === 'allGroupsContent' && allGroupsContent) {
        allGroupsContent.style.display = 'block'; // Block pre vertikálne usporiadanie
        if (dynamicContentArea) dynamicContentArea.classList.remove('single-group-active');
        const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
        if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, allGroupsContainer);
        }
    } else if (containerIdToShow === 'singleGroupContent' && singleGroupContent) {
        singleGroupContent.style.display = 'block'; // Block pre vertikálne usporiadanie
        if (dynamicContentArea) dynamicContentArea.classList.add('single-group-active');
        const uniformWidth = findMaxTableContentWidth(singleGroupContent);
        if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, singleGroupContent);
        }
    } else {
        // Ak sa nič nemá zobraziť (napr. na úvodnej stránke s kategóriami)
        if (dynamicContentArea) dynamicContentArea.classList.remove('single-group-active');
    }
}

// Vyčistí aktívne štýly zo všetkých tlačidiel kategórií
function clearActiveCategoryButtons() {
    const buttons = categoryButtonsContainer ? categoryButtonsContainer.querySelectorAll('.display-button') : [];
    buttons.forEach(button => button.classList.remove('active'));
}

// Nastaví aktívny štýl pre vybrané tlačidlo kategórie
function setActiveCategoryButton(categoryId) {
    clearActiveCategoryButtons();
    const button = categoryButtonsContainer ? categoryButtonsContainer.querySelector(`button[data-category-id="${categoryId}"]`) : null;
    if (button) {
        button.classList.add('active');
    }
}

// Vyčistí aktívne štýly zo všetkých tlačidiel skupín
function clearActiveGroupButtons() {
    const buttons = groupSelectionButtons ? groupSelectionButtons.querySelectorAll('.group-button') : [];
    buttons.forEach(button => button.classList.remove('active'));
    // Clear active state on group titles in allGroupsContent as well
    const groupTitles = allGroupsContainer ? allGroupsContainer.querySelectorAll('.group-title-button') : [];
    groupTitles.forEach(button => button.classList.remove('active'));
}

// Nastaví aktívny štýl pre vybrané tlačidlo skupiny
function setActiveGroupButton(groupId) {
    clearActiveGroupButtons();
    const button = groupSelectionButtons ? groupSelectionButtons.querySelector(`button[data-group-id="${groupId}"]`) : null;
    if (button) {
        button.classList.add('active');
    }
    // Set active state on group title in allGroupsContent
    const groupTitleButton = allGroupsContainer ? allGroupsContainer.querySelector(`.group-title-button[data-group-id="${groupId}"]`) : null;
    if (groupTitleButton) {
        groupTitleButton.classList.add('active');
    }
}

// Nová funkcia na vykreslenie tlačidiel kategórií
function _renderCategoryButtons() {
    if (!categoryButtonsContainer) return;
    categoryButtonsContainer.innerHTML = ''; // Vyčistíme existujúce tlačidlá

    if (allCategories.length === 0) {
        categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }

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

    if (categoryButtonsContainer.children.length === 0 && allCategories.length > 0) {
        // Fallback pre kategórie, ktoré nezapadajú do logiky 'Chlapci'/'Dievčatá'/'Ostatné'
        categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie, alebo sú mimo definovaných skupín.</p>';
    }
}

// Zobrazí kategórie ako tlačidlá na úvodnej stránke
function displayCategoriesAsButtons() {
    currentCategoryId = null;
    currentGroupId = null;
    if (!getHTMLElements()) {
        return;
    }

    // Zabezpečíme, že tlačidlá kategórií sú vykreslené a viditeľné
    _renderCategoryButtons(); 
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';

    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    showOnly(null); // Skryjeme obsah skupín/jednotlivej skupiny

    clearActiveCategoryButtons();
    clearActiveGroupButtons();

    // Vyčistíme hash iba ak sme naozaj na koreňovej stránke kategórií
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }
}

// Zobrazí skupiny pre vybranú kategóriu
function displayGroupsForCategory(categoryId) {
    if (!getHTMLElements() || !categoryId) {
        return;
    }

    currentCategoryId = categoryId;
    currentGroupId = null;

    // Zabezpečíme, že tlačidlá kategórií sú viditeľné
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'block'; // Zobrazí tlačidlo "Späť na kategórie"
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none'; // Skryje tlačidlo "Späť na skupiny"

    showOnly('allGroupsContent');

    clearActiveCategoryButtons();
    setActiveCategoryButton(categoryId);
    clearActiveGroupButtons();

    const category = allCategories.find(cat => cat.id === categoryId);
    if (categoryTitleDisplay) categoryTitleDisplay.textContent = category ? category.name : 'Neznáma kategória';

    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';

    const categoryGroups = allGroups.filter(group => group.categoryId === categoryId);
    const categoryTeams = allTeams.filter(team => team.categoryId === categoryId);

    const assignedTeamIds = new Set();
    const groupOrderMap = new Map();

    categoryGroups.forEach(group => {
        // Tlačidlo pre výber skupiny
        const groupButton = document.createElement('button');
        groupButton.classList.add('group-button');
        groupButton.textContent = group.name;
        groupButton.dataset.groupId = group.id;
        groupButton.addEventListener('click', () => displaySingleGroup(group.id));
        if (groupSelectionButtons) groupSelectionButtons.appendChild(groupButton);

        // Zobrazenie obsahu skupiny
        const groupDisplay = document.createElement('div');
        groupDisplay.classList.add('group-display');

        const groupTitle = document.createElement('h3');
        groupTitle.textContent = group.name;
        const groupTitleButton = document.createElement('button');
        groupTitleButton.classList.add('group-title-button');
        groupTitleButton.textContent = group.name;
        groupTitleButton.dataset.groupId = group.id;
        groupTitleButton.addEventListener('click', () => displaySingleGroup(group.id));
        groupDisplay.appendChild(groupTitleButton);

        const teamList = document.createElement('ul');
        teamList.classList.add('team-list');
        
        const teamsInGroup = categoryTeams.filter(team => team.groupId === group.id)
                                          .sort((a, b) => (a.orderInGroup || 999) - (b.orderInGroup || 999) || (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
        
        teamsInGroup.forEach(team => {
            const listItem = document.createElement('li');
            const clubNameForUrl = getCleanClubNameForUrl(team.clubName, category.name, team.name);
            const teamLink = document.createElement('a');
            teamLink.href = `prihlasene-kluby.html?category=${encodeURIComponent(category.id)}&club=${encodeURIComponent(clubNameForUrl)}&team=${encodeURIComponent(team.id)}`;
            teamLink.textContent = team.name;
            listItem.appendChild(teamLink);
            teamList.appendChild(listItem);
            assignedTeamIds.add(team.id);
        });
        groupDisplay.appendChild(teamList);
        if (allGroupsContainer) allGroupsContainer.appendChild(groupDisplay);

        groupOrderMap.set(group.id, group.orderInGroup || 999);
    });

    // Zabezpečenie správneho zoradenia skupín v allGroupsContainer
    const sortedGroupDisplays = Array.from(allGroupsContainer.children).sort((a, b) => {
        const idA = a.querySelector('.group-title-button')?.dataset.groupId;
        const idB = b.querySelector('.group-title-button')?.dataset.groupId;
        const orderA = idA ? groupOrderMap.get(idA) : 999;
        const orderB = idB ? groupOrderMap.get(idB) : 999;
        return orderA - orderB;
    });
    allGroupsContainer.innerHTML = ''; // Vyčistíme kontajner
    sortedGroupDisplays.forEach(node => allGroupsContainer.appendChild(node));


    // Zobrazí nepriradené tímy pre túto kategóriu
    const unassignedTeams = categoryTeams.filter(team => !assignedTeamIds.has(team.id));
    if (unassignedTeams.length > 0) {
        const unassignedDiv = document.createElement('div');
        unassignedDiv.classList.add('unassigned-teams-block');
        unassignedDiv.innerHTML = '<h3>Nepriradené tímy:</h3>';
        const unassignedList = document.createElement('ul');
        unassignedList.classList.add('team-list');
        unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK')).forEach(team => {
            const listItem = document.createElement('li');
            const clubNameForUrl = getCleanClubNameForUrl(team.clubName, category.name, team.name);
            const teamLink = document.createElement('a');
            teamLink.href = `prihlasene-kluby.html?category=${encodeURIComponent(category.id)}&club=${encodeURIComponent(clubNameForUrl)}&team=${encodeURIComponent(team.id)}`;
            teamLink.textContent = team.name;
            listItem.appendChild(teamLink);
            unassignedList.appendChild(listItem);
        });
        unassignedDiv.appendChild(unassignedList);
        if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.appendChild(unassignedDiv);
    }

    // Aktualizácia hashu URL
    history.replaceState({}, document.title, `#category-${encodeURIComponent(categoryId)}`);
}

// Zobrazí detaily jednej skupiny
function displaySingleGroup(groupId) {
    if (!getHTMLElements() || !groupId || !currentCategoryId) {
        console.error("Nemôžem zobraziť jednotlivú skupinu bez ID skupiny alebo aktuálnej kategórie.");
        return;
    }

    currentGroupId = groupId;

    // Zabezpečíme, že tlačidlá kategórií sú viditeľné
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none'; // Skryje skupinové tlačidlá
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'block';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block'; // Zobrazí tlačidlo "Späť na skupiny"

    showOnly('singleGroupContent');

    setActiveGroupButton(groupId);

    const group = allGroups.find(g => g.id === groupId && g.categoryId === currentCategoryId);
    if (!group) {
        console.error('Skupina nenájdená:', groupId, 'v kategórii:', currentCategoryId);
        if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = `<p>Skupina s ID "${groupId}" v kategórii "${currentCategoryId}" sa nenašla.</p>`;
        return;
    }

    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    const category = allCategories.find(cat => cat.id === currentCategoryId);
    if (categoryTitleDisplay) categoryTitleDisplay.textContent = category ? `${category.name} - ${group.name}` : `Neznáma kategória - ${group.name}`;


    const groupDisplay = document.createElement('div');
    groupDisplay.classList.add('group-display');

    const groupTitle = document.createElement('h3');
    groupTitle.textContent = group.name;
    groupDisplay.appendChild(groupTitle);

    const teamList = document.createElement('ul');
    teamList.classList.add('team-list');

    const teamsInGroup = allTeams.filter(team => team.groupId === group.id && team.categoryId === currentCategoryId)
                                  .sort((a, b) => (a.orderInGroup || 999) - (b.orderInGroup || 999) || (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

    const assignedTeamIds = new Set();
    teamsInGroup.forEach(team => {
        const listItem = document.createElement('li');
        const clubNameForUrl = getCleanClubNameForUrl(team.clubName, category.name, team.name);
        const teamLink = document.createElement('a');
        teamLink.href = `prihlasene-kluby.html?category=${encodeURIComponent(category.id)}&club=${encodeURIComponent(clubNameForUrl)}&team=${encodeURIComponent(team.id)}`;
        teamLink.textContent = team.name;
        listItem.appendChild(teamLink);
        teamList.appendChild(listItem);
        assignedTeamIds.add(team.id);
    });
    groupDisplay.appendChild(teamList);
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.appendChild(groupDisplay);

    // Zobrazí nepriradené tímy pre túto kategóriu aj v pohľade jednej skupiny
    const categoryTeams = allTeams.filter(team => team.categoryId === currentCategoryId);
    const unassignedTeams = categoryTeams.filter(team => !assignedTeamIds.has(team.id));
    if (unassignedTeams.length > 0) {
        const unassignedDiv = document.createElement('div');
        unassignedDiv.classList.add('unassigned-teams-block');
        unassignedDiv.innerHTML = '<h3>Nepriradené tímy v tejto kategórii:</h3>';
        const unassignedList = document.createElement('ul');
        unassignedList.classList.add('team-list');
        unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK')).forEach(team => {
            const listItem = document.createElement('li');
            const clubNameForUrl = getCleanClubNameForUrl(team.clubName, category.name, team.name);
            const teamLink = document.createElement('a');
            teamLink.href = `prihlasene-kluby.html?category=${encodeURIComponent(category.id)}&club=${encodeURIComponent(clubNameForUrl)}&team=${encodeURIComponent(team.id)}`;
            teamLink.textContent = team.name;
            listItem.appendChild(teamLink);
            unassignedList.appendChild(listItem);
        });
        unassignedDiv.appendChild(unassignedList);
        if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.appendChild(unassignedDiv);
    }

    // Aktualizácia hashu URL
    history.replaceState({}, document.title, `#category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`);
}

// Navigácia späť na zobrazenie kategórií
function goBackToCategories() {
    displayCategoriesAsButtons();
}

// Navigácia späť na zobrazenie skupín v aktuálnej kategórii
function goBackToGroupView() {
    if (currentCategoryId) {
        displayGroupsForCategory(currentCategoryId);
    } else {
        console.warn("Nemôžem sa vrátiť na skupiny, pretože nie je vybraná žiadna kategória.");
        goBackToCategories();
    }
}

// Funkcia na nájdenie maximálnej šírky obsahu tabuľky
function findMaxTableContentWidth(containerElement) {
    if (!containerElement) return 0;

    let maxWidth = 0;
    // Dočasne nastavíme display na block a width na auto, aby sme získali skutočnú potrebnú šírku
    const tempStyles = [];
    containerElement.querySelectorAll('.group-display').forEach(groupDisplay => {
        tempStyles.push({
            element: groupDisplay,
            display: groupDisplay.style.display,
            width: groupDisplay.style.width
        });
        groupDisplay.style.display = 'block';
        groupDisplay.style.width = 'auto';
        // Pre inner HTML, aby sa zohľadnil obsah
        const innerContent = groupDisplay.querySelector('h3, ul'); // Alebo akýkoľvek dôležitý vnútorný obsah
        if (innerContent) {
            maxWidth = Math.max(maxWidth, innerContent.scrollWidth);
        } else {
            maxWidth = Math.max(maxWidth, groupDisplay.scrollWidth);
        }
    });

    // Vrátime pôvodné štýly
    tempStyles.forEach(style => {
        style.element.style.display = style.display;
        style.element.style.width = style.width;
    });

    return maxWidth;
}

// Funkcia na nastavenie jednotnej šírky pre tabuľky
function setUniformTableWidth(width, containerElement) {
    if (!containerElement || width === 0) return;
    const padding = 20; // Pridáme nejaký padding pre lepší vzhľad
    containerElement.querySelectorAll('.group-display').forEach(groupDisplay => {
        groupDisplay.style.width = `${width + padding}px`;
    });
}


// Spustenie kódu po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    if (!getHTMLElements()) {
        return;
    }

    await loadAllTournamentData();

    // Vykreslíme tlačidlá kategórií hneď po načítaní dát
    _renderCategoryButtons(); 

    if (backToCategoriesButton) backToCategoriesButton.addEventListener('click', goBackToCategories);
    if (backToGroupButtonsButton) backToGroupButtonsButton.addEventListener('click', goBackToGroupView);

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

    if (allCategories.length > 0) {
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
                displayCategoriesAsButtons();
            }
        } else {
            console.log("Žiadny platný hash. Zobrazujem úvodné kategórie.");
            displayCategoriesAsButtons();
        }
    } else {
        // Ak nie sú žiadne kategórie, displayCategoriesAsButtons() už zobrazí správu o chýbajúcich kategóriách
        displayCategoriesAsButtons();
    }
});

// Reakcia na zmenu hashu URL (navigácia pomocou prehliadača)
window.addEventListener('hashchange', () => {
    if (!getHTMLElements()) {
        return;
    }

    // Zabezpečíme, že tlačidlá kategórií sú vykreslené a viditeľné pri zmene hashu
    _renderCategoryButtons(); 
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

// Reakcia na zmenu veľkosti okna (pre prispôsobenie šírky tabuliek)
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

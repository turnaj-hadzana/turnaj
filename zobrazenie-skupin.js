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

    // Odstrániť "(D)" alebo "(C)" a podobné označenia z názvu klubu
    cleanedName = cleanedName.replace(/\s*\(C\)\s*$/, '').replace(/\s*\(D\)\s*$/, '').trim();

    // Ak názov klubu stále obsahuje názov kategórie (napr. "TJ Jednota (Starší žiaci)"), odstrániť ho
    if (categoryNameFromData) {
        const regex = new RegExp(`\\s*\\(${escapeRegExp(categoryNameFromData)}\\)\\s*`, 'i');
        cleanedName = cleanedName.replace(regex, '').trim();
    }

    // Nahradiť medzery a špeciálne znaky pomlčkami
    cleanedName = cleanedName.replace(/[^a-zA-Z0-9šŠčČťŤžŽýÝáÁíÍéÉúÚäÄôÔňŇľĽŕŔďĎřŘěĚúůÚŮõÖüÜñÑüÜßäöüÄÖÜáéíóúýěřšžčťďňľŕúůÄÖÜßáéíóúýěščřžťďňľŕÚůØøåÅàÀâÂçÇèÈéÉêÊëËìÌîÎïÏñÑòÒôÔùÙûÛýÝÿŸÁÉÍÓÚÝĚŘŠŽČŤĎŇĽŔüÜäöüß]/g, '-').replace(/-+/g, '-');
    // Odstrániť úvodné a koncové pomlčky
    cleanedName = cleanedName.replace(/^-+|-+$/g, '');
    // Prevod na malé písmená (voliteľné, ale dobré pre URL)
    cleanedName = cleanedName.cleanedName = cleanedName.toLowerCase();

    return cleanedName;
}

// Pomocná funkcia na escapovanie špeciálnych znakov pre RegExp
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& znamená nájdený reťazec
}

function getHTMLElements() {
    dynamicContentArea = document.getElementById('dynamicContentArea');
    backToCategoriesButton = document.getElementById('backToCategoriesButton');
    backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');
    categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
    categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
    groupSelectionButtons = document.getElementById('groupSelectionButtons');
    allGroupsContent = document.getElementById('allGroupsContent');
    singleGroupContent = document.getElementById('singleGroupContent');
    allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
    allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
    singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null;
    singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;

    if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton ||
        !categoryButtonsContainer || !categoryTitleDisplay || !groupSelectionButtons ||
        !allGroupsContent || !singleGroupContent || !allGroupsContainer ||
        !allGroupsUnassignedDisplay || !singleGroupDisplayBlock || !singleGroupUnassignedDisplay) {
        console.error('Chýbajú HTML elementy. Skontrolujte HTML ID a štruktúru.');
        return false;
    }
    return true;
}

// Nová pomocná funkcia na skrytie všetkých dynamických oblastí
function hideAllDynamicContentAreas() {
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    if (dynamicContentArea) {
        dynamicContentArea.classList.remove('single-group-active');
    }
}

// Upravená funkcia showOnly
function showOnly(containerIdToShow) {
    hideAllDynamicContentAreas(); // Skryjeme všetky dynamické časti

    // Tlačidlá kategórií budú riadené v displayX funkciách explicitne

    // Kontajner categoryButtonsContainer by mal byť vždy viditeľný, keď nie je zobrazený single group
    // alebo ak sa vraciame na kategórie.
    // Jeho display: flex; je nastavený v displayCategoriesAsButtons, displayGroupsForCategory, displaySingleGroup.
    // Zabezpečíme, že ak sa niečo zobrazí, categoryButtonsContainer sa neskryje.
    if (categoryButtonsContainer) {
        // categoryButtonsContainer.style.display = 'flex'; // Toto riadime v displayX funkciách
    }


    if (dynamicContentArea) {
        if (containerIdToShow === 'singleGroupContent') {
            dynamicContentArea.classList.add('single-group-active');
        } else {
            dynamicContentArea.classList.remove('single-group-active');
        }
    }

    switch (containerIdToShow) {
        case 'allGroupsContent':
            if (allGroupsContent) allGroupsContent.style.display = 'block';
            break;
        case 'singleGroupContent':
            if (singleGroupContent) singleGroupContent.style.display = 'block';
            break;
        default:
            // Default stav je, že je zobrazený len categoryButtonsContainer
            break;
    }

    // Pôvodná logika pre šírky tabuliek zostáva
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


function displayCategoriesAsButtons() {
    currentCategoryId = null;
    currentGroupId = null;
    if (!getHTMLElements()) {
        return;
    }

    showOnly(null); // Toto teraz len skryje allGroupsContent a singleGroupContent

    // Explicitne nastavíme viditeľnosť pre tento pohľad
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá kategórií vždy viditeľné
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';
    clearActiveCategoryButtons();
    clearActiveGroupButtons();

    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }

    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'display-button';
        button.textContent = category.name;
        button.onclick = () => displayGroupsForCategory(category.id);
        if (categoryButtonsContainer) {
            categoryButtonsContainer.appendChild(button);
        }
    });
}

function displayGroupsForCategory(categoryId) {
    currentCategoryId = categoryId;
    currentGroupId = null;
    if (!getHTMLElements()) {
        goBackToCategories(); // Vrátime sa na kategórie, ak chýbajú elementy
        return;
    }

    showOnly('allGroupsContent'); // Zobrazí allGroupsContent

    // Explicitne nastavíme viditeľnosť pre tento pohľad
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá kategórií stále viditeľné
    if (categoryTitleDisplay) {
        categoryTitleDisplay.style.display = 'block'; // Názov kategórie viditeľný
        const category = allCategories.find(cat => cat.id === categoryId);
        categoryTitleDisplay.textContent = category ? category.name : 'Neznáma kategória';
    }
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá skupín viditeľné
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'block';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';


    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';


    setActiveCategoryButton(categoryId);
    clearActiveGroupButtons();

    // Kódovanie hashu zostáva zachované
    window.location.hash = 'category-' + encodeURIComponent(categoryId);

    const groupsInThisCategory = allGroups.filter(group => group.categoryId === categoryId);

    // Zobrazí tlačidlá pre výber skupín
    if (groupSelectionButtons) {
        groupsInThisCategory.forEach(group => {
            const button = document.createElement('button');
            button.className = 'display-button';
            button.textContent = group.name;
            button.onclick = () => displaySingleGroup(group.id);
            groupSelectionButtons.appendChild(button);
        });
        if (groupsInThisCategory.length === 0) {
            groupSelectionButtons.innerHTML = '<p>Zatiaľ nie sú pridané žiadne skupiny pre túto kategóriu.</p>';
        }
    }


    // Zobrazí všetky skupiny pod sebou (ako si mal v pôvodnom kóde, ale vyčistené)
    groupsInThisCategory.forEach(group => {
        const groupDisplay = document.createElement('div');
        groupDisplay.className = 'group-display';
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = group.name;
        groupTitle.onclick = () => displaySingleGroup(group.id); // Kliknuteľný názov skupiny pre detail
        groupDisplay.appendChild(groupTitle);

        const ul = document.createElement('ul');
        const teamsInGroup = allTeams.filter(team => team.assignedGroupId === group.id).sort((a, b) => a.order - b.order);
        teamsInGroup.forEach(team => {
            const li = document.createElement('li');
            const teamNameSpan = document.createElement('span');
            teamNameSpan.className = 'team-name';
            teamNameSpan.textContent = team.name;
            li.appendChild(teamNameSpan);
            ul.appendChild(li);
        });
        groupDisplay.appendChild(ul);
        if (allGroupsContainer) {
            allGroupsContainer.appendChild(groupDisplay);
        }
    });

    const unassignedTeams = allTeams.filter(team => team.categoryId === categoryId && !team.assignedGroupId);
    if (unassignedTeams.length > 0 && allGroupsUnassignedDisplay) {
        const unassignedTitle = document.createElement('h3');
        unassignedTitle.textContent = 'Nepriradené tímy';
        allGroupsUnassignedDisplay.appendChild(unassignedTitle);
        const ul = document.createElement('ul');
        unassignedTeams.forEach(team => {
            const li = document.createElement('li');
            const teamNameSpan = document.createElement('span');
            teamNameSpan.className = 'team-name';
            teamNameSpan.textContent = team.name;
            li.appendChild(teamNameSpan);
            ul.appendChild(li);
        });
        allGroupsUnassignedDisplay.appendChild(ul);
    }
    // Použi classList pre dynamické nastavenie layoutu
    if (groupsInThisCategory.length >= 5 && allGroupsContainer) { // Ak je 5 a viac skupín
        allGroupsContainer.classList.add('force-3-plus-2-layout');
    } else {
        allGroupsContainer.classList.remove('force-3-plus-2-layout');
    }
}


function displaySingleGroup(groupId) {
    const group = allGroups.find(g => g.id === groupId);
    if (!group) {
        console.error(`Skupina "${groupId}" sa nenašla.`);
        goBackToCategories(); // Návrat na kategórie, ak skupina neexistuje
        return;
    }

    currentCategoryId = group.categoryId;
    currentGroupId = groupId;

    if (!getHTMLElements()) {
        goBackToCategories();
        return;
    }

    showOnly('singleGroupContent'); // Zobrazí singleGroupContent

    // Explicitne nastavíme viditeľnosť pre tento pohľad
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá kategórií stále viditeľné
    if (categoryTitleDisplay) {
        categoryTitleDisplay.style.display = 'block'; // Názov kategórie viditeľný
        const category = allCategories.find(cat => cat.id === currentCategoryId);
        categoryTitleDisplay.textContent = category ? category.name : 'Neznáma kategória';
    }
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá skupín stále viditeľné
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'block';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block'; // Tlačidlo späť na skupiny viditeľné

    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';

    setActiveCategoryButton(currentCategoryId);
    setActiveGroupButton(groupId);

    // Kódovanie hashu zostáva zachované
    window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;

    const groupDisplay = document.createElement('div');
    groupDisplay.className = 'group-display';
    const groupTitle = document.createElement('h3');
    groupTitle.textContent = group.name;
    // V detaile skupiny by názov nemal byť klikateľný
    groupTitle.style.cursor = 'default';
    groupTitle.style.pointerEvents = 'none';
    groupDisplay.appendChild(groupTitle);

    const ul = document.createElement('ul');
    const teamsInGroup = allTeams.filter(team => team.assignedGroupId === group.id).sort((a, b) => a.order - b.order);
    teamsInGroup.forEach(team => {
        const li = document.createElement('li');
        const teamNameSpan = document.createElement('span');
        teamNameSpan.className = 'team-name';
        teamNameSpan.textContent = team.name;
        li.appendChild(teamNameSpan);
        ul.appendChild(li);
    });
    groupDisplay.appendChild(ul);
    if (singleGroupDisplayBlock) {
        singleGroupDisplayBlock.appendChild(groupDisplay);
    }

    const unassignedTeams = allTeams.filter(team => team.categoryId === currentCategoryId && !team.assignedGroupId);
    if (unassignedTeams.length > 0 && singleGroupUnassignedDisplay) {
        const unassignedTitle = document.createElement('h3');
        unassignedTitle.textContent = 'Nepriradené tímy';
        singleGroupUnassignedDisplay.appendChild(unassignedTitle);
        const ul = document.createElement('ul');
        unassignedTeams.forEach(team => {
            const li = document.createElement('li');
            const teamNameSpan = document.createElement('span');
            teamNameSpan.className = 'team-name';
            teamNameSpan.textContent = team.name;
            li.appendChild(teamNameSpan);
            ul.appendChild(li);
        });
        singleGroupUnassignedDisplay.appendChild(ul);
    }
}

function goBackToCategories() {
    currentCategoryId = null;
    currentGroupId = null;
    if (!getHTMLElements()) {
        return;
    }

    showOnly(null); // Skryje allGroupsContent a singleGroupContent

    // Explicitne nastavíme, čo má byť viditeľné pre tento stav
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá kategórií viditeľné
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';


    clearActiveCategoryButtons();
    clearActiveGroupButtons();

    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    displayCategoriesAsButtons(); // Toto znova vygeneruje a nastaví tlačidlá kategórií
}

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

    showOnly('allGroupsContent'); // Zobrazí allGroupsContent

    // Explicitne nastavíme, čo má byť viditeľné pre tento stav
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá kategórií viditeľné
    if (categoryTitleDisplay) {
        categoryTitleDisplay.style.display = 'block'; // Názov kategórie viditeľný
        const category = allCategories.find(cat => cat.id === categoryIdToReturnTo);
        categoryTitleDisplay.textContent = category ? category.name : 'Neznáma kategória';
    }
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá skupín viditeľné
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'block';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';


    setActiveCategoryButton(categoryIdToReturnTo);
    clearActiveGroupButtons();

    // Kódovanie hashu zostáva zachované
    window.location.hash = 'category-' + encodeURIComponent(categoryIdToReturnTo);

    displayGroupsForCategory(categoryIdToReturnTo); // Toto znova vygeneruje a nastaví skupiny pre kategóriu
}

function setActiveCategoryButton(categoryId) {
    if (categoryButtonsContainer) {
        Array.from(categoryButtonsContainer.children).forEach(button => {
            if (button.textContent === allCategories.find(cat => cat.id === categoryId)?.name) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
}

function clearActiveCategoryButtons() {
    if (categoryButtonsContainer) {
        Array.from(categoryButtonsContainer.children).forEach(button => {
            button.classList.remove('active');
        });
    }
}

function setActiveGroupButton(groupId) {
    if (groupSelectionButtons) {
        Array.from(groupSelectionButtons.children).forEach(button => {
            if (button.textContent === allGroups.find(group => group.id === groupId)?.name) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
}

function clearActiveGroupButtons() {
    if (groupSelectionButtons) {
        Array.from(groupSelectionButtons.children).forEach(button => {
            button.classList.remove('active');
        });
    }
}

// Funkcia na nájdenie maximálnej šírky obsahu tabuľky pre uniformné zobrazenie
function findMaxTableContentWidth(container) {
    let maxWidth = 0;
    const groupDisplays = container.querySelectorAll('.group-display');

    groupDisplays.forEach(groupDisplay => {
        const ul = groupDisplay.querySelector('ul');
        if (ul) {
            // Dočasne nastavíme display na block, aby sme získali správnu šírku
            ul.style.display = 'block';
            const liElements = ul.querySelectorAll('li');
            liElements.forEach(li => {
                const teamNameSpan = li.querySelector('.team-name');
                if (teamNameSpan) {
                    const tempSpan = document.createElement('span');
                    tempSpan.style.visibility = 'hidden';
                    tempSpan.style.position = 'absolute';
                    tempSpan.style.whiteSpace = 'nowrap';
                    tempSpan.textContent = teamNameSpan.textContent;
                    document.body.appendChild(tempSpan);
                    maxWidth = Math.max(maxWidth, tempSpan.offsetWidth);
                    document.body.removeChild(tempSpan);
                }
            });
            // Vrátime pôvodný display, ak bol nejaký
            ul.style.display = ''; // Reset na predvolené, alebo CSS riadené
        }
    });

    // Pridáme nejaký padding/margin
    return maxWidth + 40; // Napr. 20px padding z každej strany
}

// Funkcia na nastavenie uniformnej šírky pre všetky skupiny
function setUniformTableWidth(width, container) {
    const groupDisplays = container.querySelectorAll('.group-display');
    groupDisplays.forEach(groupDisplay => {
        groupDisplay.style.width = `${width}px`;
        groupDisplay.style.flexBasis = 'auto'; // Reset flex-basis
        groupDisplay.style.flexGrow = '0';
        groupDisplay.style.flexShrink = '0';
    });
}


async function fetchData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const teamsSnapshot = await getDocs(clubsCollectionRef); // Predpokladá sa, že tímy sú v clubsCollectionRef
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log('Načítané kategórie:', allCategories);
        console.log('Načítané skupiny:', allGroups);
        console.log('Načítané tímy:', allTeams);

    } catch (error) {
        console.error("Chyba pri načítaní dát: ", error);
        // Zobrazí chybovú správu pre používateľa
        if (dynamicContentArea) {
            dynamicContentArea.innerHTML = '<p>Nastala chyba pri načítaní dát. Skúste to prosím neskôr.</p>';
        }
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    if (!getHTMLElements()) {
        return; // Zastaví vykonávanie, ak chýbajú HTML elementy
    }

    await fetchData();

    // Pridanie event listenerov pre tlačidlá späť
    if (backToCategoriesButton) {
        backToCategoriesButton.addEventListener('click', goBackToCategories);
    }
    if (backToGroupButtonsButton) {
        backToGroupButtonsButton.addEventListener('click', goBackToGroupView);
    }

    // Spracovanie URL hashu pri prvom načítaní stránky
    const hash = window.location.hash;
    if (hash.startsWith('#category-')) {
        const parts = hash.substring(1).split('/group-');
        const decodedCategoryId = decodeURIComponent(parts[0].substring('category-'.length));

        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            if (parts.length > 1) {
                const decodedGroupId = decodeURIComponent(parts[1]);
                const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                if (groupExists) {
                    console.log(`V hashi je kategória aj skupina. Zobrazujem detail skupiny "${decodedGroupId}" v kategórii "${decodedCategoryId}".`);
                    displaySingleGroup(decodedGroupId);
                } else {
                    console.warn(`Skupina "${decodedGroupId}" v kategórii "${decodedCategoryId}" z URL sa nenašla. Zobrazujem prehľad skupín v kategórii.`);
                    displayGroupsForCategory(decodedCategoryId);
                }
            } else {
                console.log(`V hashi je iba kategória "${decodedCategoryId}". Zobrazujem prehľad skupín.`);
                displayGroupsForCategory(decodedCategoryId);
            }
        } else {
            console.warn(`Kategória "${decodedCategoryId}" z URL sa nenašla. Vraciam sa na úvod.`);
            goBackToCategories();
        }
    } else {
        console.log("Hash nezačína 'category-' alebo je prázdny. Zobrazujem úvodné kategórie.");
        displayCategoriesAsButtons();
    }
});


// Reakcia na zmenu hashu (napr. pri použití histórie prehliadača)
window.addEventListener('hashchange', () => {
    if (!getHTMLElements()) {
        return;
    }
    const hash = window.location.hash;
    console.log('Hash zmenený na:', hash);

    if (hash.startsWith('#category-')) {
        const parts = hash.substring(1).split('/group-');
        const decodedCategoryId = decodeURIComponent(parts[0].substring('category-'.length));

        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            if (parts.length > 1) {
                const decodedGroupId = decodeURIComponent(parts[1]);
                const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                if (groupExists) {
                    console.log(`V hashi je kategória aj skupina "${decodedGroupId}" pri zmene hashu. Zobrazujem detail skupiny.`);
                    displaySingleGroup(decodedGroupId);
                } else {
                    console.warn(`Skupina "${decodedGroupId}" v kategórii "${decodedCategoryId}" z URL sa nenašla pri zmene hashu. Zobrazujem prehľad skupín v kategórii.`);
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

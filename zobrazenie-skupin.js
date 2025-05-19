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

// Funkcia na získanie HTML elementov
// Uistí sa, že všetky elementy sú definované
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

    if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton ||
        !categoryButtonsContainer || !categoryTitleDisplay || !groupSelectionButtons ||
        !allGroupsContent || !singleGroupContent || !allGroupsContainer ||
        !allGroupsUnassignedDisplay || !singleGroupDisplayBlock || !singleGroupUnassignedDisplay) {
        console.error("Chyba: Niektoré HTML elementy neboli nájdené.");
        return false;
    }
    return true;
}

// Funkcia na načítanie všetkých dát
async function loadAllData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const clubsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        alert('Nepodarilo sa načítať dáta turnaja. Skúste obnoviť stránku.');
        console.error("Chyba pri načítaní dát turnaja:", error);
         // Clear data arrays on error to ensure empty state is reflected
         allCategories = [];
         allGroups = [];
         allTeams = [];
    }
}

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

    // Odstrániť suffix, ktorý môže byť kategóriou alebo iným identifikátorom tímu
    // Napríklad: "MŠK Žilina - U11" -> "MŠK Žilina"
    // Napríklad: "FBC Mikuláš - Chlapci" -> "FBC Mikuláš"
    // Regex na odstránenie najbežnejších suffixov po pomlčke alebo čísla na konci
    // Upravené tak, aby nerozprávalo názvy ako "ŠK Odeva Lipany"
    const suffixRegex = /\s*[-–—]\s*(U\d{1,2}|Muži|Ženy|Chlapci|Dievčatá|\d+)$/i;
    cleanedName = cleanedName.replace(suffixRegex, '').trim();

    // Odstrániť prípadný prebytočný suffix "- A", "- B", " - 01" atď.
    // Dôležité: Nepoužívať príliš agresívny regex, aby sa predišlo orezaniu mien ako "SK Partizánske"
    // Toto je bezpečné, pretože hľadá iba číslo alebo jedno-tri písmena na konci, ak predchádza medzera
    const trailingCodeRegex = /\s+[A-Z]{1,3}$|\s+\d+$/;
    let match = cleanedName.match(trailingCodeRegex);
    if (match) {
        cleanedName = cleanedName.substring(0, match.index).trim();
    }

    // Ak je categoryNameFromData platná kategória a je v názve, odstrániť ju
    if (categoryNameFromData && cleanedName.endsWith(` - ${categoryNameFromData}`)) {
        cleanedName = cleanedName.substring(0, cleanedName.length - (` - ${categoryNameFromData}`).length).trim();
    }
    // Ešte raz skontrolovať či názov náhodou nie je ID kategórie (edge case)
    if (allCategories.some(cat => cat.id === cleanedName)) {
        cleanedName = rawClubNameFromData || teamNameForCleaning || 'Neznámy klub'; // Fallback to raw if it was just a category ID
    }

    return cleanedName;
}


// Navigačné funkcie
function goBackToCategories() {
    if (!getHTMLElements()) return;

    currentCategoryId = null;
    currentGroupId = null;
    window.location.hash = ''; // Clear hash
    displayCategories();
}

function goBackToGroupButtons() {
    if (!getHTMLElements()) return;

    if (currentCategoryId) {
        displayGroupsForCategory(currentCategoryId);
    } else {
        goBackToCategories();
    }
}

function displayCategories() {
    if (!getHTMLElements()) return;

    dynamicContentArea.style.display = 'block';
    categoryButtonsContainer.style.display = 'block';
    groupSelectionButtons.style.display = 'none';
    allGroupsContent.style.display = 'none';
    singleGroupContent.style.display = 'none';

    backToCategoriesButton.style.display = 'none';
    backToGroupButtonsButton.style.display = 'none';
    categoryTitleDisplay.textContent = 'Výber kategórie'; // Default title for category selection

    categoryButtonsContainer.innerHTML = ''; // Clear existing buttons

    if (allCategories.length === 0) {
        categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú definované žiadne kategórie.</p>';
        return;
    }

    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-button';
        button.textContent = category.name || category.id;
        button.dataset.categoryId = category.id;
        button.addEventListener('click', () => {
            currentCategoryId = category.id;
            window.location.hash = `category-${category.id}`; // Set hash
            displayGroupsForCategory(category.id);
        });
        categoryButtonsContainer.appendChild(button);
    });
}

function displayGroupsForCategory(categoryId) {
    if (!getHTMLElements()) return;

    currentCategoryId = categoryId;
    currentGroupId = null; // Reset current group when changing category

    categoryButtonsContainer.style.display = 'none';
    groupSelectionButtons.style.display = 'block';
    allGroupsContent.style.display = 'none';
    singleGroupContent.style.display = 'none';

    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'none';

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    categoryTitleDisplay.textContent = selectedCategory ? `Kategória: ${selectedCategory.name || selectedCategory.id}` : 'Neznáma kategória';

    groupSelectionButtons.innerHTML = ''; // Clear existing buttons

    const groupsInThisCategory = allGroups.filter(group => group.categoryId === categoryId);
    const teamsInThisCategory = allTeams.filter(team => team.categoryId === categoryId);

    if (groupsInThisCategory.length > 0) {
        // Sort groups by name or ID
        groupsInThisCategory.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        groupsInThisCategory.forEach(group => {
            const groupTeams = teamsInThisCategory.filter(team => team.groupId === group.id);
            if (groupTeams.length > 0) { // Only show group button if there are teams in it
                const button = document.createElement('button');
                button.className = 'group-button';
                button.textContent = group.name || group.id;
                button.dataset.groupId = group.id;
                button.addEventListener('click', () => {
                    currentGroupId = group.id;
                    window.location.hash = `category-${categoryId}-group-${group.id}`; // Set hash for group
                    displaySingleGroup(categoryId, group.id);
                });
                groupSelectionButtons.appendChild(button);
            }
        });
    }

    const unassignedTeams = teamsInThisCategory.filter(team => !team.groupId || allGroups.every(g => g.id !== team.groupId));
    if (unassignedTeams.length > 0) {
        const unassignedButton = document.createElement('button');
        unassignedButton.className = 'group-button unassigned-button';
        unassignedButton.textContent = 'Nepriradené tímy';
        unassignedButton.dataset.groupId = 'unassigned';
        unassignedButton.addEventListener('click', () => {
            currentGroupId = 'unassigned';
            window.location.hash = `category-${categoryId}-group-unassigned`; // Set hash for unassigned
            displaySingleGroup(categoryId, 'unassigned');
        });
        groupSelectionButtons.appendChild(unassignedButton);
    }

    if (groupSelectionButtons.innerHTML === '') {
        groupSelectionButtons.innerHTML = '<p>Pre túto kategóriu zatiaľ nie sú priradené žiadne tímy.</p>';
    }

    // Always show "Zobraziť všetky skupiny" button if there are any teams in the category
    if (teamsInThisCategory.length > 0) {
        const allGroupsButton = document.createElement('button');
        allGroupsButton.className = 'group-button all-groups-button';
        allGroupsButton.textContent = 'Zobraziť všetky skupiny';
        allGroupsButton.addEventListener('click', () => {
            currentGroupId = null; // Clear current group
            window.location.hash = `category-${categoryId}-all`; // Set hash for all groups
            displayAllGroupsForCategory(categoryId);
        });
        groupSelectionButtons.appendChild(allGroupsButton);
    }
}


function displayAllGroupsForCategory(categoryId) {
    if (!getHTMLElements()) return;

    currentCategoryId = categoryId; // Keep category selected
    currentGroupId = null; // No specific group selected

    categoryButtonsContainer.style.display = 'none';
    groupSelectionButtons.style.display = 'none';
    allGroupsContent.style.display = 'block';
    singleGroupContent.style.display = 'none';

    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'block';

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    categoryTitleDisplay.textContent = selectedCategory ? `Všetky skupiny: ${selectedCategory.name || selectedCategory.id}` : 'Všetky skupiny (Neznáma kategória)';

    allGroupsContainer.innerHTML = ''; // Clear previous content
    allGroupsUnassignedDisplay.innerHTML = ''; // Clear unassigned content

    const groupsInThisCategory = allGroups.filter(group => group.categoryId === categoryId);
    const teamsInThisCategory = allTeams.filter(team => team.categoryId === categoryId);

    if (groupsInThisCategory.length > 0) {
        groupsInThisCategory.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        groupsInThisCategory.forEach(group => {
            const groupTeams = teamsInThisCategory.filter(team => team.groupId === group.id);

            if (groupTeams.length > 0) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'group-block';

                const groupTitle = document.createElement('h3');
                groupTitle.textContent = `Skupina: ${group.name || group.id}`;
                groupDiv.appendChild(groupTitle);

                const table = document.createElement('table');
                table.className = 'group-table';
                const thead = table.createTHead();
                const tbody = table.createTBody();

                // Headers
                const headerRow = thead.insertRow();
                ['Názov tímu', 'Klub', 'Link'].forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    headerRow.appendChild(th);
                });

                // Sort teams within the group by their name
                groupTeams.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

                groupTeams.forEach(team => {
                    const row = tbody.insertRow();
                    const nameCell = row.insertCell();
                    nameCell.textContent = team.name || team.id;

                    const clubName = team.clubName || getCleanClubNameForUrl(team.clubName, team.categoryId, team.name);
                    const clubCell = row.insertCell();
                    clubCell.textContent = clubName;


                    const linkCell = row.insertCell();
                    const linkButton = document.createElement('a');
                    linkButton.href = `prihlasene-kluby.html?club=${encodeURIComponent(clubName)}&team=${encodeURIComponent(team.id)}`;
                    linkButton.textContent = 'Zobraziť detaily';
                    linkButton.target = '_blank'; // Open in new tab
                    linkCell.appendChild(linkButton);
                });

                groupDiv.appendChild(table);
                allGroupsContainer.appendChild(groupDiv);
            }
        });
    }

    const unassignedTeams = teamsInThisCategory.filter(team => !team.groupId || allGroups.every(g => g.id !== team.groupId));
    if (unassignedTeams.length > 0) {
        const unassignedDiv = document.createElement('div');
        unassignedDiv.className = 'group-block unassigned-block';

        const unassignedTitle = document.createElement('h3');
        unassignedTitle.textContent = 'Nepriradené tímy';
        unassignedDiv.appendChild(unassignedTitle);

        const table = document.createElement('table');
        table.className = 'group-table';
        const thead = table.createTHead();
        const tbody = table.createTBody();

        // Headers
        const headerRow = thead.insertCell();
        ['Názov tímu', 'Klub', 'Link'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        // Sort unassigned teams
        unassignedTeams.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        unassignedTeams.forEach(team => {
            const row = tbody.insertRow();
            const nameCell = row.insertCell();
            nameCell.textContent = team.name || team.id;

            const clubName = team.clubName || getCleanClubNameForUrl(team.clubName, team.categoryId, team.name);
            const clubCell = row.insertCell();
            clubCell.textContent = clubName;

            const linkCell = row.insertCell();
            const linkButton = document.createElement('a');
            linkButton.href = `prihlasene-kluby.html?club=${encodeURIComponent(clubName)}&team=${encodeURIComponent(team.id)}`;
            linkButton.textContent = 'Zobraziť detaily';
            linkButton.target = '_blank'; // Open in new tab
            linkCell.appendChild(linkButton);
        });

        unassignedDiv.appendChild(table);
        allGroupsUnassignedDisplay.appendChild(unassignedDiv);
    }

    if (allGroupsContainer.innerHTML === '' && allGroupsUnassignedDisplay.innerHTML === '') {
        allGroupsContent.innerHTML = '<p>Pre túto kategóriu zatiaľ nie sú priradené žiadne tímy ani skupiny.</p>';
    } else {
        // Apply uniform width after content is rendered
        requestAnimationFrame(() => {
            const uniformWidth = findMaxTableContentWidth(allGroupsContent);
            if (uniformWidth > 0) {
                setUniformTableWidth(uniformWidth, allGroupsContent);
            }
        });
    }
}

function displaySingleGroup(categoryId, groupId) {
    if (!getHTMLElements()) return;

    currentCategoryId = categoryId; // Keep category selected
    currentGroupId = groupId; // Set current group selected

    categoryButtonsContainer.style.display = 'none';
    groupSelectionButtons.style.display = 'none';
    allGroupsContent.style.display = 'none';
    singleGroupContent.style.display = 'block';

    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'block';

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    let groupTitleText;
    if (groupId === 'unassigned') {
        groupTitleText = `Nepriradené tímy v kategórii: ${selectedCategory ? selectedCategory.name || selectedCategory.id : 'Neznáma kategória'}`;
    } else {
        const selectedGroup = allGroups.find(group => group.id === groupId);
        groupTitleText = selectedGroup ? `Skupina: ${selectedGroup.name || selectedGroup.id}` : 'Neznáma skupina';
        if (selectedCategory) {
            groupTitleText += ` (Kategória: ${selectedCategory.name || selectedCategory.id})`;
        }
    }
    categoryTitleDisplay.textContent = groupTitleText;


    singleGroupDisplayBlock.innerHTML = ''; // Clear previous content
    singleGroupUnassignedDisplay.innerHTML = ''; // Clear unassigned content

    let teamsToDisplay;
    if (groupId === 'unassigned') {
        teamsToDisplay = allTeams.filter(team => team.categoryId === categoryId && (!team.groupId || allGroups.every(g => g.id !== team.groupId)));
    } else {
        teamsToDisplay = allTeams.filter(team => team.categoryId === categoryId && team.groupId === groupId);
    }

    if (teamsToDisplay.length === 0) {
        singleGroupContent.innerHTML = '<p>Žiadne tímy v tejto skupine/kategórii.</p>';
    } else {
        const table = document.createElement('table');
        table.className = 'group-table';
        const thead = table.createTHead();
        const tbody = table.createTBody();

        // Headers
        const headerRow = thead.insertRow();
        ['Názov tímu', 'Klub', 'Link'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        // Sort teams
        teamsToDisplay.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        teamsToDisplay.forEach(team => {
            const row = tbody.insertRow();
            const nameCell = row.insertCell();
            nameCell.textContent = team.name || team.id;

            const clubName = team.clubName || getCleanClubNameForUrl(team.clubName, team.categoryId, team.name);
            const clubCell = row.insertCell();
            clubCell.textContent = clubName;

            const linkCell = row.insertCell();
            const linkButton = document.createElement('a');
            linkButton.href = `prihlasene-kluby.html?club=${encodeURIComponent(clubName)}&team=${encodeURIComponent(team.id)}`;
            linkButton.textContent = 'Zobraziť detaily';
            linkButton.target = '_blank'; // Open in new tab
            linkCell.appendChild(linkButton);
        });
        singleGroupDisplayBlock.appendChild(table);

        // Apply uniform width after content is rendered
        requestAnimationFrame(() => {
            const uniformWidth = findMaxTableContentWidth(singleGroupContent);
            if (uniformWidth > 0) {
                setUniformTableWidth(uniformWidth, singleGroupContent);
            }
        });
    }
}


function findMaxTableContentWidth(container) {
    let maxWidth = 0;
    const tables = container.querySelectorAll('.group-table');

    tables.forEach(table => {
        // Clone the table to measure without affecting current layout
        const clonedTable = table.cloneNode(true);
        clonedTable.style.position = 'absolute';
        clonedTable.style.visibility = 'hidden';
        clonedTable.style.width = 'auto'; // Allow content to dictate width
        document.body.appendChild(clonedTable);

        // Calculate content width by summing up column widths
        // Ensure colgroup is present for proper measurement
        let colgroup = clonedTable.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            clonedTable.prepend(colgroup);
        }
        colgroup.innerHTML = ''; // Clear existing cols

        // Add cols to the cloned table, then measure cells to get their natural width
        let currentTableWidth = 0;
        const headerCells = clonedTable.querySelector('thead tr')?.cells;
        if (headerCells && headerCells.length > 0) {
            Array.from(headerCells).forEach((cell, index) => {
                const col = document.createElement('col');
                const cellWidth = cell.offsetWidth; // This gets the rendered width
                col.style.width = `${cellWidth}px`;
                colgroup.appendChild(col);
                currentTableWidth += cellWidth;
            });
             maxWidth = Math.max(maxWidth, currentTableWidth);
        }
        document.body.removeChild(clonedTable);
    });

    return maxWidth;
}


function setUniformTableWidth(width, container) {
    const tables = container.querySelectorAll('.group-table');
    tables.forEach(table => {
        table.style.width = `${width}px`;
        // To make columns distribute evenly within the new fixed width,
        // you might need to adjust column widths using <col> tags within <colgroup>.
        // This is complex and usually requires re-measuring relative widths or
        // using flexbox/grid for column layout if table-layout: fixed is not desired.
        // For now, we'll just set table width. If columns still look off,
        // table-layout: fixed; and explicit <col> widths might be needed.
    });
}


// Spracovanie hashu URL pri načítaní a pri zmene hashu
async function handleHashChange() {
    if (!getHTMLElements()) {
        console.error("HTML elements not ready for hash change handling.");
        return;
    }

    // Ensure data is loaded before processing hash
    await loadAllData(); // <--- AWAITING DATA LOADING HERE

    const hash = window.location.hash.substring(1); // Remove '#'
    console.log(`Spracoávam hash: ${hash}`);

    if (hash.startsWith('category-')) {
        const parts = hash.split('-');
        const decodedCategoryId = parts[1]; // e.g., "U11"
        const decodedGroupParam = parts[3]; // e.g., "group", "unassigned", "all"

        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            if (decodedGroupParam === 'all') {
                console.log(`V hashi je kategória \"${decodedCategoryId}\" a 'all' skupiny. Zobrazujem všetky skupiny.`);
                displayAllGroupsForCategory(decodedCategoryId);
            } else if (decodedGroupParam && decodedGroupParam !== 'group') { // Check for specific group ID or 'unassigned'
                 console.log(`V hashi je kategória \"${decodedCategoryId}\" a skupina/param \"${decodedGroupParam}\". Zobrazujem jednu skupinu.`);
                 displaySingleGroup(decodedCategoryId, decodedGroupParam);
            } else {
                console.log(`V hashi je iba kategória \"${decodedCategoryId}\". Zobrazujem prehľad skupín.`);
                displayGroupsForCategory(decodedCategoryId);
            }
        } else {
            console.warn(`Kategória \"${decodedCategoryId}\" z URL sa nenašla. Vraciam sa na úvod.`);
            goBackToCategories();
        }
    } else {
        console.log("Hash nezačína 'category-' alebo je prázdny. Zobrazujem úvodnú obrazovku.");
        displayCategories(); // Show default categories view
    }
}


// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Get HTML elements first
    if (!getHTMLElements()) return;

    // Load data and then handle URL state
    await loadAllData(); // <--- AWAIT THIS CALL
    handleHashChange(); // Now call after data is loaded

    // Add event listeners
    if (backToCategoriesButton) {
        backToCategoriesButton.addEventListener('click', goBackToCategories);
    }
    if (backToGroupButtonsButton) {
        backToGroupButtonsButton.addEventListener('click', goBackToGroupButtons);
    }
});

// Reakcia na zmenu hashu v URL (pre prehliadačové tlačidlá späť/vpred)
window.addEventListener('hashchange', handleHashChange);

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

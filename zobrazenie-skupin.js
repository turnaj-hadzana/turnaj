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

// Funkcia na získanie HTML elementov a základnú kontrolu
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


    if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton || !categoryButtonsContainer || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent) {
        console.error("Chyba: Niektoré kľúčové HTML elementy neboli nájdené.");
        return false;
    }
    return true;
}

// Načítanie všetkých dát z Firestore
async function loadAllData() {
    try {
        console.log("Načítavam všetky kategórie, skupiny a tímy...");
        const [categoriesSnapshot, groupsSnapshot, clubsSnapshot] = await Promise.all([
            getDocs(categoriesCollectionRef),
            getDocs(groupsCollectionRef),
            getDocs(clubsCollectionRef)
        ]);

        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allTeams = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Dáta úspešne načítané.");
        console.log("Kategórie:", allCategories);
        console.log("Skupiny:", allGroups);
        console.log("Tímy:", allTeams);

        // Pre DEBUG: pridajte ID tímu, ak chýba (malo by byť teamName)
        allTeams.forEach(team => {
            if (!team.id) {
                team.id = team.teamName; // Predpokladáme, že ID tímu je teamName ak nie je explicitne nastavené
            }
        });

    } catch (error) {
        console.error("Chyba pri načítaní dát:", error);
        dynamicContentArea.innerHTML = '<p style="color: red;">Chyba pri načítaní dát. Skúste prosím obnoviť stránku.</p>';
    }
}

// Funkcia na zobrazenie tlačidiel pre kategórie
function displayCategoryButtons() {
    if (!getHTMLElements()) return;

    hideAllContent();
    categoryButtonsContainer.style.display = 'flex';
    categoryTitleDisplay.style.display = 'none';
    groupSelectionButtons.style.display = 'none';

    categoryButtonsContainer.innerHTML = ''; // Vyčistíme predošlé tlačidlá

    if (allCategories.length === 0) {
        categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú vytvorené žiadne kategórie.</p>';
        return;
    }

    allCategories.sort((a, b) => a.name.localeCompare(b.name)).forEach(category => {
        const button = document.createElement('button');
        button.classList.add('display-button');
        button.textContent = category.name;
        button.onclick = () => {
            currentCategoryId = category.id; // Uložíme vybranú kategóriu
            currentGroupId = null; // Resetujeme vybranú skupinu
            // Zmeníme hash URL, aby to fungovalo s históriou prehliadača
            window.location.hash = `#category-${encodeURIComponent(category.name)}`;
            displayGroupsForCategory(category.id);
        };
        categoryButtonsContainer.appendChild(button);
    });

    // Skryť tlačidlá Späť na kategórie/skupiny pri zobrazení kategórií
    backToCategoriesButton.style.display = 'none';
    backToGroupButtonsButton.style.display = 'none';
}

// Funkcia na zobrazenie skupín pre vybranú kategóriu
function displayGroupsForCategory(categoryId) {
    if (!getHTMLElements()) return;

    hideAllContent();
    backToCategoriesButton.style.display = 'block'; // Zobraziť tlačidlo Späť na kategórie
    backToGroupButtonsButton.style.display = 'none'; // Skryť tlačidlo Späť na skupiny
    categoryTitleDisplay.style.display = 'block';
    groupSelectionButtons.style.display = 'flex';
    allGroupsContent.style.display = 'block';


    const category = allCategories.find(cat => cat.id === categoryId);
    if (!category) {
        console.error("Kategória sa nenašla pre ID:", categoryId);
        goBackToCategories();
        return;
    }

    categoryTitleDisplay.textContent = `Kategória: ${category.name}`;
    groupSelectionButtons.innerHTML = ''; // Vyčistíme predošlé tlačidlá skupín
    allGroupsContainer.innerHTML = ''; // Vyčistíme kontajner všetkých skupín
    allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistíme kontajner tímov bez skupiny

    // Filter groups and teams for the current category
    const groupsForCategory = allGroups.filter(group => group.categoryId === categoryId);
    const currentCategoryTeams = allTeams.filter(team => team.categoryId === categoryId);
    const unassignedTeamsForCategory = currentCategoryTeams.filter(team => team.groupId === null).sort((a, b) => a.clubName.localeCompare(b.clubName));


    // Display "All Groups" button for the category
    const allGroupsButton = document.createElement('button');
    allGroupsButton.classList.add('display-button');
    allGroupsButton.textContent = 'Všetky skupiny';
    allGroupsButton.onclick = () => {
        currentGroupId = null; // Reset current group to show all
        window.location.hash = `#category-${encodeURIComponent(category.name)}`; // Udržujeme hash kategórie
        displayGroupsForCategory(categoryId); // Opätovne zobrazíme všetky skupiny
    };
    if (currentGroupId === null) {
        allGroupsButton.classList.add('active'); // Označiť ako aktívne
    }
    groupSelectionButtons.appendChild(allGroupsButton);


    // Display buttons for each group in the category
    groupsForCategory.sort((a, b) => a.name.localeCompare(b.name)).forEach(group => {
        const button = document.createElement('button');
        button.classList.add('display-button');
        button.textContent = `Skupina: ${group.name}`;
        button.onclick = () => {
            currentGroupId = group.id; // Uložíme vybranú skupinu
            window.location.hash = `#group-${encodeURIComponent(category.name)}-${encodeURIComponent(group.name)}`;
            displaySingleGroup(categoryId, group.id);
        };
        if (currentGroupId === group.id) {
            button.classList.add('active'); // Označiť ako aktívne
        }
        groupSelectionButtons.appendChild(button);
    });

    // Display all groups in the category with their teams
    if (allGroupsContainer) {
        allGroupsContainer.innerHTML = ''; // Clear previous content

        if (groupsForCategory.length === 0 && unassignedTeamsForCategory.length === 0) {
            allGroupsContainer.innerHTML = '<p>V tejto kategórii zatiaľ nie sú vytvorené žiadne skupiny ani tímy.</p>';
        } else {
            // Sort groups for consistent display
            groupsForCategory.sort((a, b) => a.name.localeCompare(b.name)).forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.classList.add('group-block');
                groupDiv.innerHTML = `
                    <h3>Skupina: ${group.name}</h3>
                    <table class="data-table team-table">
                        <thead>
                            <tr>
                                <th>Názov klubu</th>
                                <th>Názov tímu</th>
                                <th>Poradie v skupine</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                `;
                const tbody = groupDiv.querySelector('tbody');
                const teamsInGroup = currentCategoryTeams.filter(team => team.groupId === group.id).sort((a, b) => (a.orderInGroup || Infinity) - (b.orderInGroup || Infinity));

                if (teamsInGroup.length === 0) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td colspan="3" style="text-align: center;">V tejto skupine zatiaľ nie sú žiadne tímy.</td>`;
                    tbody.appendChild(tr);
                } else {
                    teamsInGroup.forEach(team => {
                        const tr = document.createElement('tr');

                        const clubNameTd = document.createElement('td');
                        clubNameTd.textContent = team.clubName;
                        tr.appendChild(clubNameTd);

                        const teamNameTd = document.createElement('td');
                        const teamNameSpan = document.createElement('span');
                        teamNameSpan.textContent = team.id; // team.id by mal byť názov tímu
                        teamNameSpan.classList.add('team-name-link');
                        teamNameSpan.style.cursor = 'pointer';
                        teamNameSpan.style.textDecoration = 'underline';
                        teamNameSpan.onclick = function() {
                            const clubNameEncoded = encodeURIComponent(team.clubName);
                            const teamIdEncoded = encodeURIComponent(team.id);
                            window.location.href = `prihlasene-kluby.html?club=${clubNameEncoded}&team=${teamIdEncoded}`;
                        };
                        teamNameTd.appendChild(teamNameSpan);
                        tr.appendChild(teamNameTd);

                        const orderTd = document.createElement('td');
                        orderTd.textContent = team.orderInGroup !== undefined && team.orderInGroup !== null ? team.orderInGroup : 'Nezadané';
                        tr.appendChild(orderTd);

                        tbody.appendChild(tr);
                    });
                }
                allGroupsContainer.appendChild(groupDiv);
            });
        }

        // Display unassigned teams if any
        if (allGroupsUnassignedDisplay) {
            allGroupsUnassignedDisplay.innerHTML = ''; // Clear previous content
            if (unassignedTeamsForCategory.length > 0) {
                const unassignedDiv = document.createElement('div');
                unassignedDiv.classList.add('unassigned-teams-block');
                unassignedDiv.innerHTML = `
                    <h3>Tímy bez skupiny v kategórii ${categoryTitleDisplay.textContent.replace('Kategória: ', '')}</h3>
                    <table class="data-table team-table">
                        <thead>
                            <tr>
                                <th>Názov klubu</th>
                                <th>Názov tímu</th>
                                <th>Poradie v skupine</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    </table>
                `;
                const tbody = unassignedDiv.querySelector('tbody');
                unassignedTeamsForCategory.forEach(team => {
                    const tr = document.createElement('tr');

                    const clubNameTd = document.createElement('td');
                    clubNameTd.textContent = team.clubName;
                    tr.appendChild(clubNameTd);

                    const teamNameTd = document.createElement('td');
                    const teamNameSpan = document.createElement('span');
                    teamNameSpan.textContent = team.id; // team.id by mal byť názov tímu
                    teamNameSpan.classList.add('team-name-link');
                    teamNameSpan.style.cursor = 'pointer';
                    teamNameSpan.style.textDecoration = 'underline';
                    teamNameSpan.onclick = function() {
                        const clubNameEncoded = encodeURIComponent(team.clubName);
                        const teamIdEncoded = encodeURIComponent(team.id);
                        window.location.href = `prihlasene-kluby.html?club=${clubNameEncoded}&team=${teamIdEncoded}`;
                    };
                    teamNameTd.appendChild(teamNameSpan);
                    tr.appendChild(teamNameTd);

                    const orderTd = document.createElement('td');
                    orderTd.textContent = 'N/A'; // Tímy bez skupiny nemajú poradie
                    tr.appendChild(orderTd);

                    tbody.appendChild(tr);
                });
                allGroupsUnassignedDisplay.appendChild(unassignedDiv);
            }
        }

        // Apply uniform table width after content is generated
        if (allGroupsContent) {
            const uniformWidth = findMaxTableContentWidth(allGroupsContent);
            if (uniformWidth > 0) {
                setUniformTableWidth(uniformWidth, allGroupsContent);
            }
        }
    }
}

// Funkcia na zobrazenie jednej konkrétnej skupiny
function displaySingleGroup(categoryId, groupId) {
    if (!getHTMLElements()) return;

    hideAllContent();
    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'block'; // Zobraziť tlačidlo Späť na skupiny
    categoryTitleDisplay.style.display = 'block';
    groupSelectionButtons.style.display = 'flex';
    singleGroupContent.style.display = 'block';

    const category = allCategories.find(cat => cat.id === categoryId);
    if (!category) {
        console.error("Kategória sa nenašla pre ID:", categoryId);
        goBackToCategories();
        return;
    }

    categoryTitleDisplay.textContent = `Kategória: ${category.name}`;
    groupSelectionButtons.innerHTML = ''; // Vyčistíme predošlé tlačidlá skupín
    singleGroupDisplayBlock.innerHTML = ''; // Vyčistíme kontajner jednej skupiny
    singleGroupUnassignedDisplay.innerHTML = ''; // Vyčistíme kontajner tímov bez skupiny

    // Display "All Groups" button for the category
    const allGroupsButton = document.createElement('button');
    allGroupsButton.classList.add('display-button');
    allGroupsButton.textContent = 'Všetky skupiny';
    allGroupsButton.onclick = () => {
        currentGroupId = null;
        window.location.hash = `#category-${encodeURIComponent(category.name)}`;
        displayGroupsForCategory(categoryId);
    };
    groupSelectionButtons.appendChild(allGroupsButton);

    // Display buttons for each group in the category
    const groupsForCategory = allGroups.filter(group => group.categoryId === categoryId);
    groupsForCategory.sort((a, b) => a.name.localeCompare(b.name)).forEach(group => {
        const button = document.createElement('button');
        button.classList.add('display-button');
        button.textContent = `Skupina: ${group.name}`;
        button.onclick = () => {
            currentGroupId = group.id;
            window.location.hash = `#group-${encodeURIComponent(category.name)}-${encodeURIComponent(group.name)}`;
            displaySingleGroup(categoryId, group.id);
        };
        if (currentGroupId === group.id) {
            button.classList.add('active'); // Označiť ako aktívne
        }
        groupSelectionButtons.appendChild(button);
    });

    if (singleGroupDisplayBlock) {
        singleGroupDisplayBlock.innerHTML = ''; // Clear previous content

        const group = allGroups.find(g => g.id === groupId);
        if (!group) {
            console.warn(`Skupina s ID ${groupId} sa nenašla.`);
            singleGroupDisplayBlock.innerHTML = `<p>Skupina sa nenašla.</p>`;
            return;
        }

        singleGroupDisplayBlock.innerHTML = `
            <h3>Skupina: ${group.name}</h3>
            <table class="data-table team-table">
                <thead>
                    <tr>
                        <th>Názov klubu</th>
                        <th>Názov tímu</th>
                        <th>Poradie v skupine</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        const tbody = singleGroupDisplayBlock.querySelector('tbody');
        const filteredTeamsForSingleGroup = allTeams.filter(team => team.categoryId === categoryId && team.groupId === groupId).sort((a, b) => (a.orderInGroup || Infinity) - (b.orderInGroup || Infinity));

        if (filteredTeamsForSingleGroup.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="3" style="text-align: center;">V tejto skupine zatiaľ nie sú žiadne tímy.</td>`;
            tbody.appendChild(tr);
        } else {
            filteredTeamsForSingleGroup.forEach(team => {
                const tr = document.createElement('tr');

                const clubNameTd = document.createElement('td');
                clubNameTd.textContent = team.clubName;
                tr.appendChild(clubNameTd);

                const teamNameTd = document.createElement('td');
                const teamNameSpan = document.createElement('span');
                teamNameSpan.textContent = team.id; // team.id by mal byť názov tímu
                teamNameSpan.classList.add('team-name-link');
                teamNameSpan.style.cursor = 'pointer';
                teamNameSpan.style.textDecoration = 'underline';
                teamNameSpan.onclick = function() {
                    const clubNameEncoded = encodeURIComponent(team.clubName);
                    const teamIdEncoded = encodeURIComponent(team.id);
                    window.location.href = `prihlasene-kluby.html?club=${clubNameEncoded}&team=${teamIdEncoded}`;
                };
                teamNameTd.appendChild(teamNameSpan);
                tr.appendChild(teamNameTd);

                const orderTd = document.createElement('td');
                orderTd.textContent = team.orderInGroup !== undefined && team.orderInGroup !== null ? team.orderInGroup : 'Nezadané';
                tr.appendChild(orderTd);

                tbody.appendChild(tr);
            });
        }
    }

    // Display unassigned teams if any (in single group view, they are also displayed)
    if (singleGroupUnassignedDisplay) {
        singleGroupUnassignedDisplay.innerHTML = ''; // Clear previous content
        const unassignedTeamsForSingleGroup = allTeams.filter(team => team.categoryId === categoryId && team.groupId === null);
        if (unassignedTeamsForSingleGroup.length > 0) {
            const unassignedDiv = document.createElement('div');
            unassignedDiv.classList.add('unassigned-teams-block');
            unassignedDiv.innerHTML = `
                <h3>Tímy bez skupiny v kategórii ${categoryTitleDisplay.textContent.replace('Kategória: ', '')}</h3>
                <table class="data-table team-table">
                    <thead>
                        <tr>
                            <th>Názov klubu</th>
                            <th>Názov tímu</th>
                            <th>Poradie v skupine</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            `;
            const tbody = unassignedDiv.querySelector('tbody');
            unassignedTeamsForSingleGroup.forEach(team => {
                const tr = document.createElement('tr');

                const clubNameTd = document.createElement('td');
                clubNameTd.textContent = team.clubName;
                tr.appendChild(clubNameTd);

                const teamNameTd = document.createElement('td');
                const teamNameSpan = document.createElement('span');
                teamNameSpan.textContent = team.id; // team.id by mal byť názov tímu
                teamNameSpan.classList.add('team-name-link');
                teamNameSpan.style.cursor = 'pointer';
                teamNameSpan.style.textDecoration = 'underline';
                teamNameSpan.onclick = function() {
                    const clubNameEncoded = encodeURIComponent(team.clubName);
                    const teamIdEncoded = encodeURIComponent(team.id);
                    window.location.href = `prihlasene-kluby.html?club=${clubNameEncoded}&team=${teamIdEncoded}`;
                };
                teamNameTd.appendChild(teamNameSpan);
                tr.appendChild(teamNameTd);

                const orderTd = document.createElement('td');
                orderTd.textContent = 'N/A';
                tr.appendChild(orderTd);

                tbody.appendChild(tr);
            });
            singleGroupUnassignedDisplay.appendChild(unassignedDiv);
        }
    }

    // Apply uniform table width after content is generated
    if (singleGroupContent) {
        const uniformWidth = findMaxTableContentWidth(singleGroupContent);
        if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, singleGroupContent);
        }
    }
}


// Funkcia na skrytie všetkého obsahu
function hideAllContent() {
    categoryButtonsContainer.style.display = 'none';
    categoryTitleDisplay.style.display = 'none';
    groupSelectionButtons.style.display = 'none';
    allGroupsContent.style.display = 'none';
    singleGroupContent.style.display = 'none';
}

// Funkcia na návrat na zobrazenie kategórií
function goBackToCategories() {
    currentCategoryId = null;
    currentGroupId = null;
    window.location.hash = ''; // Odstráni hash z URL
    displayCategoryButtons();
}

// Funkcia na návrat na zobrazenie tlačidiel skupín pre aktuálnu kategóriu
function goBackToGroupButtons(categoryId) {
    currentGroupId = null;
    // Pri návrate z jednej skupiny na všetky skupiny v kategórii, hash by mal byť len #category-name
    const category = allCategories.find(cat => cat.id === categoryId);
    if (category) {
        window.location.hash = `#category-${encodeURIComponent(category.name)}`;
    } else {
        window.location.hash = ''; // Ak sa kategória nenašla, vrátiť sa na začiatok
    }
    displayGroupsForCategory(categoryId);
}

// Pomocné funkcie pre uniformnú šírku tabuliek
function findMaxTableContentWidth(container) {
    let maxWidth = 0;
    const tables = container.querySelectorAll('.team-table tbody');
    tables.forEach(tbody => {
        const rows = tbody.querySelectorAll('tr');
        if (rows.length > 0) {
            const firstRowCells = rows[0].querySelectorAll('td, th'); // Get cells from first row (or header)
            let rowWidth = 0;
            firstRowCells.forEach(cell => {
                rowWidth += cell.offsetWidth;
            });
            maxWidth = Math.max(maxWidth, rowWidth);
        }
    });
    return maxWidth;
}

function setUniformTableWidth(width, container) {
    const tables = container.querySelectorAll('.team-table');
    tables.forEach(table => {
        // Nastavíme šírku tabuľky na vypočítanú maximálnu šírku
        // Odpočítame malú hodnotu (napr. 2px) na kompenzáciu za border/padding box modelu,
        // ak to spôsobuje pretečenie
        table.style.width = `${width}px`;
        table.style.minWidth = `${width}px`; // Nastaviť aj min-width
    });
}


// Spracovanie URL hashu pri načítaní stránky a pri zmene hashu
async function handleUrlState() {
    if (!getHTMLElements()) {
        console.error("HTML elementy nie sú pripravené pri spracovaní URL stavu.");
        return;
    }

    await loadAllData(); // Načítaj dáta vždy pri zmene stavu alebo načítaní

    const hash = window.location.hash;
    console.log("Spracovávam hash:", hash);

    if (hash.startsWith('#category-')) {
        const categoryNameFromHash = decodeURIComponent(hash.substring(10)); // Odstránime '#category-'
        const category = allCategories.find(cat => cat.name === categoryNameFromHash);
        if (category) {
            currentCategoryId = category.id;
            currentGroupId = null; // Zabezpečí, že sa zobrazia VŠETKY skupiny v kategórii
            displayGroupsForCategory(category.id);
        } else {
            console.warn(`Kategória \"${categoryNameFromHash}\" z URL sa nenašla. Vraciam sa na úvod.`);
            goBackToCategories(); // Toto odstráni hash a vráti sa na úvod (ruší aktívne triedy)
        }
    } else if (hash.startsWith('#group-')) {
        // Formát: #group-nazovKategorie-nazovSkupiny
        const parts = hash.substring(7).split('-'); // Odstránime '#group-'
        if (parts.length >= 2) {
            const categoryNameFromHash = decodeURIComponent(parts[0]);
            const groupNameFromHash = decodeURIComponent(parts.slice(1).join('-')); // Zvyšok je názov skupiny

            const category = allCategories.find(cat => cat.name === categoryNameFromHash);
            const group = allGroups.find(g => g.name === groupNameFromHash && g.categoryId === category?.id);

            if (category && group) {
                currentCategoryId = category.id;
                currentGroupId = group.id;
                displaySingleGroup(category.id, group.id);
            } else {
                console.warn(`Skupina alebo kategória \"${groupNameFromHash}\" v \"${categoryNameFromHash}\" z URL sa nenašla pri zmene hashu. Vraciam sa na úvod.`);
                goBackToCategories(); // Toto odstráni hash a vráti sa na úvod (ruší aktívne triedy)
            }
        } else {
             console.warn(`Neplatný formát hashu pre skupinu: ${hash}. Vraciam sa na úvod.`);
             goBackToCategories(); // Toto odstráni hash a vráti sa na úvod (ruší aktívne triedy)
        }
    } else {
         // Hash nezačína category prefixom alebo je prázdny, vrátiť sa na úvodné zobrazenie kategórií
         console.log("Hash nezačína 'category-' alebo je prázdny pri zmene hashu. Vraciam sa na úvod.");
         goBackToCategories(); // Toto odstráni hash a vráti sa na úvod (ruší aktívne triedy)
    }
}


// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    if (getHTMLElements()) {
        backToCategoriesButton.addEventListener('click', goBackToCategories);
        backToGroupButtonsButton.addEventListener('click', () => goBackToGroupButtons(currentCategoryId));
        handleUrlState(); // Inicializujeme stav podľa URL pri načítaní stránky
    }
});

// Spracovanie popstate udalosti pre tlačidlo Späť/Vpred v prehliadači
window.addEventListener('popstate', () => {
    handleUrlState(); // Znova spracujeme URL stav, keď sa zmení história
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

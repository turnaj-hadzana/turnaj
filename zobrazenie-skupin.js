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
let allTeams = []; // Toto pole by malo obsahovať objekty tímov s vlastnosťou 'name' (názov tímu) a ideálne aj 'clubName' (názov klubu)

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

    // Odstránenie koncových písmen (A, B, C, atď.) s medzerou pred nimi
    const regexEndLetter = /\s[A-Z]$/;
    if (regexEndLetter.test(cleanedName)) {
        cleanedName = cleanedName.replace(regexEndLetter, '').trim();
    }

    // Odstránenie prefixu kategórie (napr. "U10 CH - ")
    // Predpokladáme, že categoryNameFromData už je "U10 CH", nie "U10 CH - "
    if (categoryNameFromData) {
        // Regex pre nájdenie názvu kategórie na začiatku reťazca,
        // s možnými medzerami/pomlčkami a opcionalnym " - "
        const categoryRegexPattern = `^${categoryNameFromData.replace(/[-\s]/g, '[-\\s]')}\\s*-\\s*`;
        const categoryRegex = new RegExp(categoryRegexPattern, 'i');
        cleanedName = cleanedName.replace(categoryRegex, '').trim();
    }
    
    return cleanedName.trim();
}

// Funkcia na získanie HTML elementov a kontrolu ich existencie
function getHTMLElements() {
    dynamicContentArea = document.getElementById('dynamicContentArea');
    backToCategoriesButton = document.getElementById('backToCategoriesButton');
    backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');
    categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
    categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
    groupSelectionButtons = document.getElementById('groupSelectionButtons');
    allGroupsContent = document.getElementById('allGroupsContent');
    singleGroupContent = document.getElementById('singleGroupContent');
    
    // Uistite sa, že podriadené elementy existujú predtým, než sa k nim pokúsite pristupovať
    allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
    allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
    singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null;
    singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;

    const elementsFound = dynamicContentArea && backToCategoriesButton && backToGroupButtonsButton &&
                            categoryButtonsContainer && categoryTitleDisplay && groupSelectionButtons &&
                            allGroupsContent && singleGroupContent &&
                            allGroupsContainer && allGroupsUnassignedDisplay &&
                            singleGroupDisplayBlock && singleGroupUnassignedDisplay;
    
    if (!elementsFound) {
        // Zobrazí chybovú správu, ak chýbajú kľúčové HTML elementy
        if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>FATAL ERROR: Chyba pri inicializácii aplikácie. Chýbajú potrebné HTML elementy. Skontrolujte konzolu pre detaily.</p>';
        // Skryje všetky potenciálne problémové sekcie
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

// Načítanie všetkých potrebných dát z Firebase
async function loadAllTournamentData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ak skupina nemá categoryId, pokúsime sa ho odvodiť z ID skupiny
        allGroups = allGroups.map(group => {
            if (!group.categoryId) {
                const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                if (categoryFromId) {
                    group.categoryId = categoryFromId.id;
                }
            }
            return group;
        }).filter(group => group.categoryId); // Filtrujeme skupiny bez kategórie
        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));

        const teamsSnapshot = await getDocs(clubsCollectionRef); // Predpokladá sa, že toto pole obsahuje informácie o tímoch vrátane `clubName`
        allTeams = teamsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Zabezpečíme, že clubName existuje, ak nie, použijeme názov tímu
                clubName: data.clubName || data.name || '' // Ak clubName chýba, použije team.name
            };
        });

        // Debugovacie logy pre načítané dáta
        // console.log("--- DEBUG: ALL CATEGORIES DATA ---", allCategories);
        // console.log("--- DEBUG: ALL GROUPS DATA ---", allGroups);
        // console.log("--- DEBUG: ALL TEAMS DATA ---");
        // allTeams.forEach(team => {
        //     console.log(`Team ID: ${team.id}, Team Name: ${team.name}, Club Name: ${team.clubName}, Category ID: ${team.categoryId}, Group ID: ${team.groupId}`);
        // });
        // console.log("----------------------------");

    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        // Zobrazí používateľovi chybu
        if (dynamicContentArea && categoryButtonsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = '<p class="error-message">Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
            categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
        } else if (dynamicContentArea) {
            dynamicContentArea.innerHTML = '<p class="error-message">Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        // Skryje všetky sekcie pri chybe načítania
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
        if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja."); // Pre priame upozornenie
    }
}

// Funkcia na zobrazenie len konkrétnej sekcie obsahu
function showOnly(containerIdToShow) {
    // Skryje všetky možné kontajnery obsahu
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';

    // Špeciálna trieda pre dynamickú oblasť pre single group zobrazenie (možno CSS pre layout)
    if (dynamicContentArea) {
        if (containerIdToShow === 'singleGroupContent') {
            dynamicContentArea.classList.add('single-group-active');
        } else {
            dynamicContentArea.classList.remove('single-group-active');
        }
    }

    // Zobrazí len požadovaný kontajner
    switch (containerIdToShow) {
        case 'allGroupsContent':
            if (allGroupsContent) allGroupsContent.style.display = 'block';
            break;
        case 'singleGroupContent':
            if (singleGroupContent) singleGroupContent.style.display = 'block';
            break;
        default:
            // Ak žiadny nie je zadaný, alebo neplatný, všetko skryje
            if (allGroupsContent) allGroupsContent.style.display = 'none';
            if (singleGroupContent) singleGroupContent.style.display = 'none';
            break;
    }

    // Aplikuje jednotnú šírku pre tabuľky po zobrazení
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

// Odstráni triedu 'active' zo všetkých tlačidiel kategórií
function clearActiveCategoryButtons() {
    const categoryButtons = categoryButtonsContainer ? categoryButtonsContainer.querySelectorAll('.display-button') : [];
    categoryButtons.forEach(button => button.classList.remove('active'));
}

// Pridá triedu 'active' k špecifickému tlačidlu kategórie
function setActiveCategoryButton(categoryId) {
    clearActiveCategoryButtons(); // Najprv vyčistí, aby bola aktívna len jedna
    const categoryButton = categoryButtonsContainer ? categoryButtonsContainer.querySelector(`.display-button[data-category-id="${categoryId}"]`) : null;
    if (categoryButton) {
        categoryButton.classList.add('active');
    }
}

// Odstráni triedu 'active' zo všetkých tlačidiel skupín a titulkov skupín
function clearActiveGroupButtons() {
    const groupButtons = groupSelectionButtons ? groupSelectionButtons.querySelectorAll('.display-button') : [];
    groupButtons.forEach(button => button.classList.remove('active'));
    const groupTitlesInAllView = allGroupsContainer ? allGroupsContainer.querySelectorAll('.group-display h3') : [];
    groupTitlesInAllView.forEach(title => title.classList.remove('active-title'));
}

// Pridá triedu 'active' k špecifickému tlačidlu skupiny a titulku skupiny
function setActiveGroupButton(groupId) {
    clearActiveGroupButtons(); // Najprv vyčistí, aby bola aktívna len jedna
    const groupButton = groupSelectionButtons ? groupSelectionButtons.querySelector(`.display-button[data-group-id="${groupId}"]`) : null;
    if (groupButton) {
        groupButton.classList.add('active');
    }
    // Označí aktívnu skupinu aj v zobrazení všetkých skupín
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

// Zobrazí kategórie ako tlačidlá na úvodnej stránke
function displayCategoriesAsButtons() {
    currentCategoryId = null; // Resetuje aktuálnu kategóriu a skupinu
    currentGroupId = null;
    if (!getHTMLElements()) { // Kontrola existencie HTML elementov
        return;
    }

    // Zobrazí/skryje potrebné sekcie
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    showOnly(null); // Skryje všetky dynamické oblasti obsahu

    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = ''; // Vyčistí kontajner tlačidiel

    clearActiveCategoryButtons(); // Vyčistí aktívne stavy
    clearActiveGroupButtons();

    // Vyčistí hash z URL, ak existuje
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }

    // Rozdelenie kategórií na Chlapci, Dievčatá a Ostatné pre lepšie zobrazenie
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

    // Pomocná funkcia na vytvorenie skupín tlačidiel kategórií
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
                displayGroupsForCategory(categoryId); // Zobrazí skupiny po kliknutí
            });
            buttonsDiv.appendChild(button);
        });
        return groupDiv;
    };

    // Pridá skupiny tlačidiel do kontajnera
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

        // Ak sa nenačítali žiadne kategórie, zobrazí správu
        if (categoryButtonsContainer.children.length === 0) {
            categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        }
    }
}

// Zobrazí skupiny pre vybranú kategóriu
function displayGroupsForCategory(categoryId) {
    currentCategoryId = categoryId; // Nastaví aktuálnu kategóriu
    currentGroupId = null; // Resetuje aktuálnu skupinu
    if (!getHTMLElements()) {
        goBackToCategories(); // Ak chýbajú elementy, vráti sa späť
        return;
    }

    // Zobrazí/skryje potrebné sekcie
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistí obsah kontajnerov pred zobrazením nových dát
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';

    showOnly('allGroupsContent'); // Zobrazí kontajner pre všetky skupiny

    setActiveCategoryButton(categoryId); // Označí aktívnu kategóriu
    clearActiveGroupButtons(); // Vyčistí aktívne stavy skupín

    // Aktualizuje hash v URL
    window.location.hash = 'category-' + encodeURIComponent(categoryId);

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
        console.error(`Kategória "${categoryId}" sa nenašla.`);
        // Spracovanie chyby, ak sa kategória nenašla
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

    // Filtruje a zoradí skupiny pre danú kategóriu
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

    // Špeciálny layout pre 5 skupín
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
        // Vytvára tlačidlá pre výber skupín
        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = group.name || group.id;
            button.dataset.groupId = group.id;
            button.addEventListener('click', () => {
                const groupIdToDisplay = button.dataset.groupId;
                displaySingleGroup(groupIdToDisplay); // Zobrazí detail jednej skupiny
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button);
        });

        // Vytvára zobrazenie pre každú skupinu s tímami
        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display');
            groupDiv.dataset.groupId = group.id;

            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);
            groupTitle.style.cursor = 'pointer'; // Titulok skupiny je tiež klikateľný
            groupTitle.addEventListener('click', () => {
                const groupIdToDisplay = group.id;
                displaySingleGroup(groupIdToDisplay);
            });

            // Filtruje a zoradí tímy pre danú skupinu
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
                teamList.classList.add('team-list');
                teamsInGroup.forEach(team => {
                    const teamItem = document.createElement('li');
                    teamItem.classList.add('team-list-item');
                    teamItem.textContent = team.name || 'Neznámy tím';
                    teamItem.style.cursor = 'pointer';

                    // Pripraví surový názov klubu pre čistenie (použije clubName, ak chýba, tak name)
                    const rawClubNameForCleaning = team.clubName || team.name || '';
                    teamItem.dataset.clubName = rawClubNameForCleaning; // Uloží do datasetu

                    // Získa názov kategórie pre URL parameter 'team'
                    const categoryForUrl = allCategories.find(cat => cat.id === currentCategoryId);
                    const categoryNameForUrl = categoryForUrl ? (categoryForUrl.name || categoryForUrl.id) : '';
                    
                    // Zostavenie celého názvu tímu pre parameter '&team='
                    const fullTeamName = `${categoryNameForUrl} - ${team.name || 'Neznámy tím'}`.trim();
                    const cleanedTeamName = encodeURIComponent(fullTeamName.replace(/\s/g, '+'));

                    // Poslucháč udalosti pre kliknutie na tím
                    teamItem.addEventListener('click', (event) => {
                        const clickedClubNameRaw = event.currentTarget.dataset.clubName;
                        
                        // Získa vyčistený názov klubu pre URL parameter 'club'
                        const cleanedClubName = encodeURIComponent(
                            getCleanClubNameForUrl(clickedClubNameRaw, categoryNameForUrl, team.name)
                            .replace(/\s/g, '+')
                        );

                        // Vytvorí a zaloguje celú URL
                        const url = `prihlasene-kluby.html?club=${cleanedClubName}&team=${cleanedTeamName}`;
                        console.log("Generovaná URL (všetky skupiny):", url);

                        window.location.href = url; // Presmeruje na novú URL
                    });
                    teamList.appendChild(teamItem);
                });
                groupDiv.appendChild(teamList);
            }
            if (allGroupsContainer) allGroupsContainer.appendChild(groupDiv);
        });
    }

    // Zobrazí nepriradené tímy pre túto kategóriu
    const unassignedTeamsInCategory = allTeams.filter(team =>
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
        // Ak sa skupina nenašla, pokúsi sa vrátiť na prehľad kategórie alebo na úvod
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

    currentCategoryId = group.categoryId; // Nastaví aktuálnu kategóriu a skupinu
    currentGroupId = groupId;

    if (!getHTMLElements()) {
        goBackToCategories();
        return;
    }

    // Zobrazí/skryje potrebné sekcie a tlačidlá navigácie
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block'; // Zobrazí tlačidlo Späť na skupiny

    // Vyčistí obsah kontajnerov
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    showOnly('singleGroupContent'); // Zobrazí kontajner pre detail jednej skupiny

    setActiveCategoryButton(currentCategoryId); // Označí aktívnu kategóriu
    setActiveGroupButton(groupId); // Označí aktívnu skupinu

    // Aktualizuje hash v URL
    window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;

    const category = allCategories.find(cat => cat.id === currentCategoryId);
    if (category && categoryTitleDisplay) {
        categoryTitleDisplay.textContent = category.name || category.id;
    }

    if (singleGroupDisplayBlock) {
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = group.name || group.id;
        groupTitle.style.cursor = 'default'; // Titulok v detaile nie je klikateľný
        groupTitle.style.pointerEvents = 'none';
        singleGroupDisplayBlock.appendChild(groupTitle);

        // Filtruje a zoradí tímy pre danú skupinu
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
            teamList.classList.add('team-list');
            teamsInGroup.forEach(team => {
                const teamItem = document.createElement('li');
                teamItem.classList.add('team-list-item');
                teamItem.textContent = team.name || 'Neznámy tím';
                teamItem.style.cursor = 'pointer';

                // Pripraví surový názov klubu pre čistenie (použije clubName, ak chýba, tak name)
                const rawClubNameForCleaning = team.clubName || team.name || '';
                teamItem.dataset.clubName = rawClubNameForCleaning; // Uloží do datasetu

                // Získa názov kategórie pre URL parameter 'team'
                const categoryForUrl = allCategories.find(cat => cat.id === currentCategoryId);
                const categoryNameForUrl = categoryForUrl ? (categoryForUrl.name || categoryForUrl.id) : '';
                
                // Zostavenie celého názvu tímu pre parameter '&team='
                const fullTeamName = `${categoryNameForUrl} - ${team.name || 'Neznámy tím'}`.trim();
                const cleanedTeamName = encodeURIComponent(fullTeamName.replace(/\s/g, '+'));

                // Poslucháč udalosti pre kliknutie na tím
                teamItem.addEventListener('click', (event) => {
                    const clickedClubNameRaw = event.currentTarget.dataset.clubName;
                    
                    // Získa vyčistený názov klubu pre URL parameter 'club'
                    const cleanedClubName = encodeURIComponent(
                        getCleanClubNameForUrl(clickedClubNameRaw, categoryNameForUrl, team.name)
                        .replace(/\s/g, '+')
                    );

                    // Vytvorí a zaloguje celú URL
                    const url = `prihlasene-kluby.html?club=${cleanedClubName}&team=${cleanedTeamName}`;
                    console.log("Generovaná URL (jedna skupina):", url);

                    window.location.href = url; // Presmeruje na novú URL
                });
                teamList.appendChild(teamItem);
            });
            singleGroupDisplayBlock.appendChild(teamList);
        }
    }

    // Zobrazí nepriradené tímy pre túto kategóriu
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

// Funkcia pre návrat na zobrazenie kategórií
function goBackToCategories() {
    currentCategoryId = null;
    currentGroupId = null;
    if (!getHTMLElements()) {
        return;
    }

    // Zobrazí/skryje potrebné sekcie
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistí obsah kontajnerov
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';

    showOnly(null); // Skryje všetky dynamické oblasti obsahu

    clearActiveCategoryButtons(); // Vyčistí aktívne stavy
    clearActiveGroupButtons();

    // Vyčistí hash z URL
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    displayCategoriesAsButtons(); // Zobrazí kategórie ako tlačidlá
}

// Funkcia pre návrat na zobrazenie všetkých skupín aktuálnej kategórie
function goBackToGroupView() {
    const categoryIdToReturnTo = currentCategoryId;
    currentGroupId = null; // Resetuje aktuálnu skupinu

    if (!getHTMLElements()) {
        goBackToCategories(); // Ak chýbajú elementy, vráti sa na úvod
        return;
    }

    if (!categoryIdToReturnTo) {
        goBackToCategories(); // Ak nie je známa kategória, vráti sa na úvod
        return;
    }

    // Zobrazí/skryje potrebné sekcie
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

    // Vyčistí obsah kontajnerov jednej skupiny
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';

    showOnly('allGroupsContent'); // Zobrazí kontajner pre všetky skupiny

    setActiveCategoryButton(categoryIdToReturnTo); // Označí aktívnu kategóriu
    clearActiveGroupButtons(); // Vyčistí aktívne stavy skupín

    // Aktualizuje hash v URL
    window.location.hash = 'category-' + encodeURIComponent(categoryIdToReturnTo);

    displayGroupsForCategory(categoryIdToReturnTo); // Znovu zobrazí skupiny pre kategóriu
}

// Pomocné funkcie pre šírku tabuliek (zostali nezmenené)
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
    const safetyPadding = 20; // Pridajte nejaký priestor pre bezpečnosť
    return maxWidth > 0 ? maxWidth + safetyPadding : 0;
}

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
        displayDiv.style.flexBasis = 'auto'; // Pre istotu, aby neprepisoval flex-basis
        displayDiv.style.flexShrink = '0'; // Zabezpečí, že sa nezmenší
        displayDiv.style.flexGrow = '0'; // Zabezpečí, že sa nezväčší
    });
}

// Spracovanie načítania stránky a zmeny hashu URL
document.addEventListener('DOMContentLoaded', async () => {
    // Pokúsi sa získať HTML elementy hneď po načítaní DOM
    if (!getHTMLElements()) {
        return;
    }

    // Načíta všetky dáta z databázy
    await loadAllTournamentData();

    // Nastaví poslucháčov udalostí pre navigačné tlačidlá
    if (backToCategoriesButton) backToCategoriesButton.addEventListener('click', goBackToCategories);
    if (backToGroupButtonsButton) backToGroupButtonsButton.addEventListener('click', goBackToGroupView);

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

    if (allCategories.length > 0) {
        // Ak existuje hash v URL, pokúsi sa z neho načítať stav
        if (hash && hash.startsWith(categoryPrefix)) {
            const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
            const urlCategoryId = hashParts[0];
            const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;
            const decodedCategoryId = decodeURIComponent(urlCategoryId);
            const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;

            const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

            if (categoryExists) {
                displayGroupsForCategory(decodedCategoryId); // Zobrazí skupiny pre kategóriu

                if (decodedGroupId) {
                    const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                    if (groupExists) {
                        displaySingleGroup(decodedGroupId); // Zobrazí detail skupiny
                    } else {
                        console.warn(`Skupina "${decodedGroupId}" z URL sa nenašla v kategórii "${decodedCategoryId}". Zobrazujem prehľad skupín kategórie.`);
                    }
                } else {
                    console.log(`V hashi je iba kategória "${decodedCategoryId}". Zobrazujem prehľad skupín.`);
                }
            } else {
                console.warn(`Kategória "${decodedCategoryId}" z URL sa nenašla. Zobrazujem úvodné kategórie.`);
                displayCategoriesAsButtons(); // Vráti sa na úvodné kategórie
            }
        } else {
            console.log("Žiadny platný hash. Zobrazujem úvodné kategórie.");
            displayCategoriesAsButtons(); // Zobrazí úvodné kategórie, ak hash chýba
        }
    } else {
        // Ak nie sú žiadne kategórie, zobrazí prázdny stav
        displayCategoriesAsButtons();
    }
});

// Poslucháč udalostí pre zmenu hashu v URL (napr. pri použití tlačidiel Späť/Vpred v prehliadači)
window.addEventListener('hashchange', () => {
    if (!getHTMLElements()) {
        return;
    }

    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Zabezpečí zobrazenie kategórií

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
            // Kontrola, či už nie sme v cieľovom stave, aby sa predišlo zbytočným prekresľovaniam
            const alreadyInTargetState = (currentCategoryId === decodedCategoryId) &&
                                         (currentGroupId === decodedGroupId);
            if (alreadyInTargetState) {
                return;
            }

            // Aktualizuje stav aplikácie
            currentCategoryId = decodedCategoryId;
            currentGroupId = decodedGroupId;

            if (decodedGroupId) {
                const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                if (groupExists) {
                    displayGroupsForCategory(decodedCategoryId); // Najprv prehľad skupín
                    displaySingleGroup(decodedGroupId); // Potom detail konkrétnej skupiny
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
            goBackToCategories(); // Vráti sa na úvod, ak kategória neexistuje
        }
    } else {
        console.log("Hash nezačína 'category-' alebo je prázdny pri zmene hashu. Vraciam sa na úvod.");
        goBackToCategories(); // Vráti sa na úvod, ak hash nie je platný
    }
});

// Reakcia na zmenu veľkosti okna (pre prispôsobenie šírky tabuliek)
window.addEventListener('resize', () => {
    if (!getHTMLElements()) {
        return;
    }
    // Ak je aktuálne vybraná kategória, prepočíta šírky tabuliek
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

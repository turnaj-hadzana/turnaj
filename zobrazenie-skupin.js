// zobrazenie-skupin.js (Upravené pre zobrazenie kategórií ako tlačidiel a prepínanie na skupiny)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencií na elementy
const groupsDisplayContent = document.getElementById('groupsDisplayContent'); // Div pre zobrazenie skupín/kategórií
const categoryButtonsContainer = document.getElementById('categoryButtonsContainer'); // Div pre tlačidlá kategórií
const backToCategoriesButton = document.getElementById('backToCategoriesButton'); // Tlačidlo Späť

// Polia pre uchovanie všetkých načítaných dát
let allCategories = [];
let allGroups = [];
let allTeams = [];

// Premenná na uloženie aktuálne vybranej kategórie (pre zobrazenie skupín)
let currentCategoryId = null; // null znamená, že zobrazujeme zoznam kategórií

// Funkcia na načítanie všetkých dát z databázy
async function loadAllTournamentData() {
    try {
        console.log("INFO: Načítavam dáta turnaja...");
        // Načítať kategórie
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        // Načítať skupiny
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        // Načítať tímy
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("INFO: Dáta turnaja načítané:", { allCategories: allCategories.length, allGroups: allGroups.length, allTeams: allTeams.length });

    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (groupsDisplayContent) {
             groupsDisplayContent.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
         if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = ''; // Vymazať prípadný obsah
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}

// Funkcia na zobrazenie kategórií ako tlačidiel
function displayCategoriesAsButtons() {
    console.log("INFO: Zobrazujem kategórie ako tlačidlá.");
    currentCategoryId = null; // Nastavíme stav na zobrazenie kategórií

    if (!categoryButtonsContainer || !groupsDisplayContent || !backToCategoriesButton) {
        console.error("Chyba: Chýbajú HTML elementy pre zobrazenie kategórií.");
        return;
    }

    groupsDisplayContent.innerHTML = ''; // Vyčistiť oblasť zobrazenia skupín
    categoryButtonsContainer.innerHTML = ''; // Vyčistiť oblasť tlačidiel

    backToCategoriesButton.style.display = 'none'; // Skryť tlačidlo späť

    if (allCategories.length === 0) {
        categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }

    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.classList.add('category-button');
        button.textContent = category.name || category.id;
        button.dataset.categoryId = category.id; // Uložíme ID kategórie do data atribútu

        // Pridáme poslucháča udalosti kliknutia na tlačidlo kategórie
        button.addEventListener('click', () => {
            const categoryId = button.dataset.categoryId;
            displayGroupsForCategory(categoryId); // Zobraziť skupiny pre túto kategóriu
        });

        categoryButtonsContainer.appendChild(button);
    });

    // Zobrazíme kontajner s tlačidlami a skryjeme oblasť zobrazenia skupín
    categoryButtonsContainer.style.display = 'flex';
    groupsDisplayContent.style.display = 'none';
}

// Funkcia na zobrazenie skupín a tímov pre vybranú kategóriu
function displayGroupsForCategory(categoryId) {
    console.log(`INFO: Zobrazujem skupiny pre kategóriu: ${categoryId}`);
    currentCategoryId = categoryId; // Nastavíme stav na zobrazenie skupín pre kategóriu

     if (!groupsDisplayContent || !categoryButtonsContainer || !backToCategoriesButton) {
         console.error("Chyba: Chýbajú HTML elementy pre zobrazenie skupín.");
         return;
     }

    groupsDisplayContent.innerHTML = ''; // Vyčistiť oblasť zobrazenia skupín
    categoryButtonsContainer.style.display = 'none'; // Skryť kontajner s tlačidlami kategórií

    // Zobrazíme tlačidlo späť
    backToCategoriesButton.style.display = 'block';

    const selectedCategory = allCategories.find(cat => cat.id === categoryId);

    if (!selectedCategory) {
        groupsDisplayContent.innerHTML = '<p>Vybraná kategória sa nenašla.</p>';
        groupsDisplayContent.style.display = 'block'; // Zobrazíme oblasť zobrazenia
        // *** Zavolať funkciu na nastavenie šírky aj v tomto prípade, aj keď nie sú skupiny ***
        setUniformTableWidth(findMaxTableContentWidth()); // Bude 0, ak nie sú tabuľky, čo je OK.
        // *** Koniec volania ***
        return;
    }

    const categoryDiv = document.createElement('div');
    categoryDiv.classList.add('category-display');

    const categoryTitle = document.createElement('h2');
    categoryTitle.textContent = selectedCategory.name || selectedCategory.id;
    categoryDiv.appendChild(categoryTitle);

    const groupsContainerDiv = document.createElement('div');
    groupsContainerDiv.classList.add('groups-container');

    // Nájdi skupiny patriace do tejto kategórie
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

     // NOVÁ LOGIKA: Pridať triedu pre 5 skupín pre špeciálne rozloženie (len pre vizuálne odlíšenie kontajnera ak treba, šírku nastaví JS)
     if (groupsInCategory.length === 5) {
         groupsContainerDiv.classList.add('force-3-plus-2-layout');
     } else {
         groupsContainerDiv.classList.remove('force-3-plus-2-layout');
     }

    categoryDiv.appendChild(groupsContainerDiv);


    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));


    if (groupsInCategory.length === 0) {
         const noGroupsPara = document.createElement('p');
         noGroupsPara.textContent = `V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.`;
         groupsContainerDiv.appendChild(noGroupsPara);
    } else {

        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display');

            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);

            // Nájdi tímy patriace do tejto skupiny
            const teamsInGroup = allTeams.filter(team => team.groupId === group.id);

            if (teamsInGroup.length === 0) {
                const noTeamsPara = document.createElement('p');
                noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                 noTeamsPara.style.padding = '10px'; // Pridáme padding, nech to nevyzerá zle
                groupDiv.appendChild(noTeamsPara);
            } else {
                teamsInGroup.sort((a, b) => {
                    const orderA = a.orderInGroup || Infinity; // Tímy bez poradia na koniec
                    const orderB = b.orderInGroup || Infinity; // Tímy bez poradia na koniec
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    const nameA = (a.name || a.id || '').toLowerCase();
                    const nameB = (b.name || b.id || '').toLowerCase();
                    return nameA.localeCompare(nameB, 'sk-SK');
                });

                const teamList = document.createElement('ul');
                teamsInGroup.forEach(team => {
                    const teamItem = document.createElement('li');

                    if (typeof team.orderInGroup === 'number' && team.orderInGroup > 0) {
                        const orderSpan = document.createElement('span');
                        orderSpan.textContent = `${team.orderInGroup}.`;
                        teamItem.appendChild(orderSpan);

                        const separator = document.createTextNode('\u00A0'); // Nezalomiteľná medzera
                        teamItem.appendChild(separator);
                    }

                     const teamNameSpan = document.createElement('span');
                     teamNameSpan.classList.add('team-name'); // Pridáme triedu pre štýlovanie tučného písma
                     teamNameSpan.textContent = team.name || 'Neznámy tím';
                     // Odstránime zvýraznenie, keďže filter na názov tímu v tomto režime nemáme
                     teamNameSpan.classList.remove('highlighted-team');

                    teamItem.appendChild(teamNameSpan);
                    teamList.appendChild(teamItem);
                });
                groupDiv.appendChild(teamList);
            }

            groupsContainerDiv.appendChild(groupDiv);
        });
    }


    // Zobraziť nepriradené tímy patriace do tejto kategórie
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === categoryId
    );

     // Nepriradené tímy zobrazíme v samostatnom bloku pod skupinami
     if (unassignedTeamsInCategory.length > 0) {
         const unassignedDiv = document.createElement('div');
         unassignedDiv.classList.add('unassigned-teams-display');

         const unassignedTitle = document.createElement('h2');
         unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii'; // Upravený nadpis
         unassignedDiv.appendChild(unassignedTitle);

         unassignedTeamsInCategory.sort((a, b) => {
              const nameA = (a.name || a.id || '').toLowerCase();
              const nameB = (b.name || b.id || '').toLowerCase();
              return nameA.localeCompare(nameB, 'sk-SK');
         });

         const unassignedList = document.createElement('ul');
         unassignedTeamsInCategory.forEach(team => {
              const teamItem = document.createElement('li');
              teamItem.textContent = team.name || 'Neznámy tím';
               // Odstránime zvýraznenie, keďže filter na názov tímu v tomto režime nemáme
               teamItem.classList.remove('highlighted-team');
              unassignedList.appendChild(teamItem);
         });
         unassignedDiv.appendChild(unassignedList);
         categoryDiv.appendChild(unassignedDiv); // Pridáme nepriradené tímy do bloku kategórie

     } else if (groupsInCategory.length === 0) {
         // Ak nie sú žiadne skupiny ani nepriradené tímy v kategórii, zobrazíme túto správu
         const noTeamsOrGroupsPara = document.createElement('p');
         noTeamsOrGroupsPara.textContent = `V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú žiadne tímy ani skupiny.`;
         categoryDiv.appendChild(noTeamsOrGroupsPara);
     }


    groupsDisplayContent.appendChild(categoryDiv);
    groupsDisplayContent.style.display = 'block'; // Zobrazíme oblasť zobrazenia

    // *** VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ TABULIEK ***
    const uniformWidth = findMaxTableContentWidth();
    if (uniformWidth > 0) { // Nastavíme šírku iba ak sú nejaké tabuľky a našla sa max šírka
       setUniformTableWidth(uniformWidth);
    }
    // *** KONIEC VOLANIA ***
}

// Funkcia na zobrazenie kategórií (návrat z pohľadu skupín)
function goBackToCategories() {
    console.log("INFO: Návrat na zobrazenie kategórií.");
    displayCategoriesAsButtons(); // Zobraziť znova tlačidlá kategórií
}


// *** PÔVODNÉ FUNKCIE PRE DYNAMICKÚ ŠÍRKU OSTÁVAJÚ - Uistite sa, že ich importujete alebo sú definované ***
// (Predpokladáme, že findMaxTableContentWidth a setUniformTableWidth sú definované/importované)

// Funkcia na zistenie maximálnej šírky potrebnej pre zobrazenie obsahu všetkých tabuliek skupín
function findMaxTableContentWidth() {
    let maxWidth = 0;
    const groupTables = groupsDisplayContent.querySelectorAll('.group-display');

    groupTables.forEach(table => {
        const originalStyles = {
            flexBasis: table.style.flexBasis,
            width: table.style.width,
            minWidth: table.style.minWidth,
            maxWidth: table.style.maxWidth,
            flexShrink: table.style.flexShrink,
            flexGrow: table.style.flexGrow
        };

        table.style.flexBasis = 'max-content';
        table.style.width = 'auto';
        table.style.minWidth = 'auto';
        table.style.maxWidth = 'none';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';

        const requiredWidth = table.offsetWidth;

        table.style.flexBasis = originalStyles.flexBasis;
        table.style.width = originalStyles.width;
        table.style.minWidth = originalStyles.minWidth;
        table.style.maxWidth = originalStyles.maxWidth;
        table.style.flexShrink = originalStyles.flexShrink;
        table.style.flexGrow = originalStyles.flexGrow;


        if (requiredWidth > maxWidth) {
            maxWidth = requiredWidth;
        }
    });

    const safetyPadding = 20;
    return maxWidth + safetyPadding;
}

// Funkcia na nastavenie jednotnej šírky pre všetky tabuľky skupín
function setUniformTableWidth(width) {
    const groupTables = groupsDisplayContent.querySelectorAll('.group-display');

    groupTables.forEach(table => {
        table.style.width = `${width}px`;
        table.style.minWidth = `${width}px`;
        table.style.maxWidth = `${width}px`;
        table.style.flexBasis = 'auto';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';
    });
}


// --- Event Listeners ---

// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín/kategórií.");
    await loadAllTournamentData();

    // Pridať poslucháča udalosti na tlačidlo Späť
    if (backToCategoriesButton) {
        backToCategoriesButton.addEventListener('click', goBackToCategories);
    } else {
        console.error("Tlačidlo Späť sa nenašlo!");
    }


    // Pôvodné spracovanie URL filtrov je odstránené,
    // teraz vždy na začiatku zobrazíme kategórie ako tlačidlá.
    displayCategoriesAsButtons();

});

// Poslucháč na zmenu veľkosti okna - pre dynamickú šírku tabuliek skupín
window.addEventListener('resize', () => {
    // Ak sa práve zobrazujú skupiny pre konkrétnu kategóriu
    if (currentCategoryId !== null) {
         const uniformWidth = findMaxTableContentWidth();
          if (uniformWidth > 0) {
             setUniformTableWidth(uniformWidth);
          }
    }
 });

 // Odstránené pôvodné poslucháče pre filter select boxy
 // categoryFilter.addEventListener...
 // groupFilter.addEventListener...
 // teamFilter.addEventListener...
 // clearFiltersButton.addEventListener...

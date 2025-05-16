// zobrazenie-skupin.js (Opravené dekódovanie URL hash)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencií na elementy
const dynamicContentArea = document.getElementById('dynamicContentArea'); // Hlavný dynamický kontajner
const backToCategoriesButton = document.getElementById('backToCategoriesButton'); // Tlačidlo Späť na kategórie

// Polia pre uchovanie všetkých načítaných dát
let allCategories = [];
let allGroups = [];
let allTeams = [];

// Premenná na sledovanie aktuálneho stavu zobrazenia
let currentCategoryId = null; // null: zobrazenie kategórií; ID: zobrazenie skupín pre kategóriu

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
         // Doplníme categoryId do skupiny, ak chýba
         allGroups = allGroups.map(group => {
              if (!group.categoryId) {
                 const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                 if (categoryFromId) {
                      group.categoryId = categoryFromId.id;
                 }
              }
              return group;
         }).filter(group => group.categoryId); // Filter pre istotu

        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));


        // Načítať tímy
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("INFO: Dáta turnaja načítané:", { allCategories: allCategories.length, allGroups: allGroups.length, allTeams: allTeams.length });

    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (dynamicContentArea) {
             dynamicContentArea.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
         // Skryť tlačidlo späť pri chybe
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}

// Funkcia na zobrazenie kategórií ako tlačidiel (Úroveň 1)
function displayCategoriesAsButtons() {
    console.log("INFO: Zobrazujem kategórie ako tlačidlá.");
    currentCategoryId = null;

    if (!dynamicContentArea || !backToCategoriesButton) {
        console.error("Chyba: Chýbajú základné HTML elementy.");
        return;
    }

    dynamicContentArea.innerHTML = ''; // Vyčistiť oblasť obsahu

    // Skryť tlačidlo späť
    backToCategoriesButton.style.display = 'none';

    // Vymazať hash z URL pri návrate na zoznam kategórií
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    if (allCategories.length === 0) {
        dynamicContentArea.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        // Zobraziť kontajner aj keď je prázdny, aby bola správa viditeľná
        const tempContainer = document.createElement('div');
        tempContainer.id = 'categoryButtonsContainer'; // Použijeme rovnaké ID/štýl kontajnera
        tempContainer.style.display = 'flex'; // Zabezpečiť flex zobrazenie pre centrovanie správy
        tempContainer.style.justifyContent = 'center';
        tempContainer.style.alignItems = 'center';
        tempContainer.style.padding = '20px'; // Pridať padding
        tempContainer.style.border = '1px solid #ccc'; // Pridať border
        tempContainer.style.borderRadius = '8px'; // Pridať border-radius
        tempContainer.style.backgroundColor = '#f9f9f9'; // Pridať farbu pozadia
        tempContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        dynamicContentArea.appendChild(tempContainer);
        return;
    }

    const categoryButtonsContainer = document.createElement('div');
    categoryButtonsContainer.id = 'categoryButtonsContainer';
    categoryButtonsContainer.style.display = 'flex'; // Zabezpečiť flex zobrazenie

    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.classList.add('display-button'); // Používame spoločný štýl
        button.textContent = category.name || category.id;
        button.dataset.categoryId = category.id;

        // Pridáme poslucháča udalosti kliknutia na tlačidlo kategórie
        button.addEventListener('click', () => {
            const categoryId = button.dataset.categoryId;
            displayGroupsForCategory(categoryId); // Prejsť na zobrazenie VŠETKÝCH skupín kategórie
        });

        categoryButtonsContainer.appendChild(button);
    });

    dynamicContentArea.appendChild(categoryButtonsContainer);
}

// Funkcia na zobrazenie VŠETKÝCH skupín a nepriradených tímov pre vybranú kategóriu (Úroveň 2)
function displayGroupsForCategory(categoryId) {
    console.log(`INFO: Zobrazujem všetky skupiny pre kategóriu: ${categoryId}`);
    currentCategoryId = categoryId;

     if (!dynamicContentArea || !backToCategoriesButton) {
         console.error("Chyba: Chýbajú základné HTML elementy.");
         return;
     }

    dynamicContentArea.innerHTML = ''; // Vyčistiť oblasť obsahu

    // Zobraziť tlačidlo späť na kategórie
    backToCategoriesButton.style.display = 'block';

    // Zápis do URL hash (len kategória) - ENCODING je automatické pre hash
    window.location.hash = 'category-' + categoryId;


    const selectedCategory = allCategories.find(cat => cat.id === categoryId);

    if (!selectedCategory) {
        dynamicContentArea.innerHTML = '<p>Vybraná kategória sa nenašla.</p>';
         // Aj keď sa kategória nenašla, skryjeme tlačidlo späť
        backToCategoriesButton.style.display = 'none';
        return;
    }

     // Pridáme nadpis kategórie
     const categoryTitle = document.createElement('h2');
     categoryTitle.textContent = selectedCategory.name || selectedCategory.id;
     dynamicContentArea.appendChild(categoryTitle);


    // Nájdi skupiny patriace do tejto kategórie
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

     // Vytvoríme kontajner pre usporiadanie skupín vedľa seba
     const groupsContainerDiv = document.createElement('div');
     groupsContainerDiv.classList.add('groups-container'); // Používame štýl pre flex kontajner


     // NOVÁ LOGIKA: Pridať triedu pre 5 skupín pre špeciálne rozloženie (ak je potrebná)
     if (groupsInCategory.length === 5) {
         groupsContainerDiv.classList.add('force-3-plus-2-layout');
     } else {
         groupsContainerDiv.classList.remove('force-3-plus-2-layout');
     }

     dynamicContentArea.appendChild(groupsContainerDiv); // Pridáme kontajner do dynamickej oblasti


    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));


    if (groupsInCategory.length === 0) {
         groupsContainerDiv.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
          // Ak nie sú skupiny, dynamickú šírku neriešime
    } else {

        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display'); // Používame existujúci štýl pre blok skupiny

            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);

            // Nájdi tímy patriace do tejto skupiny
            const teamsInGroup = allTeams.filter(team => team.groupId === group.id);

            if (teamsInGroup.length === 0) {
                const noTeamsPara = document.createElement('p');
                noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                 noTeamsPara.style.padding = '10px'; // Pridáme padding
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
                teamsInGroup.forEach(team => {
                    const teamItem = document.createElement('li');

                    if (typeof team.orderInGroup === 'number' && team.orderInGroup > 0) {
                        const orderSpan = document.createElement('span');
                        orderSpan.textContent = `${team.orderInGroup}.`;
                        teamItem.appendChild(orderSpan);

                        const separator = document.createTextNode('\u00A0');
                        teamItem.appendChild(separator);
                    }

                     const teamNameSpan = document.createElement('span');
                     teamNameSpan.classList.add('team-name');
                     teamNameSpan.textContent = team.name || 'Neznámy tím';
                    teamItem.appendChild(teamNameSpan);
                    teamList.appendChild(teamItem);
                });
                groupDiv.appendChild(teamList);
            }

            groupsContainerDiv.appendChild(groupDiv); // Pridáme blok skupiny do kontajnera skupín
        });

        // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ BLOKOV SKUPÍN
         // Teraz voláme funkciu pre všetky .group-display v rámci groupsContainerDiv
        const uniformWidth = findMaxTableContentWidth(groupsContainerDiv);
        if (uniformWidth > 0) {
           setUniformTableWidth(uniformWidth, groupsContainerDiv);
        }
    }


    // Zobraziť nepriradené tímy patriace do tejto kategórie (pod blokmi skupín)
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === currentCategoryId
    );

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
              unassignedList.appendChild(teamItem);
         });
         unassignedDiv.appendChild(unassignedList);
         dynamicContentArea.appendChild(unassignedDiv); // Pridáme nepriradené tímy do dynamickej oblasti pod skupiny
     }
}

// Funkcia na zobrazenie kategórií (návrat z pohľadu skupín v kategórii) (Návrat na Úroveň 1)
function goBackToCategories() {
    console.log("INFO: Návrat na zobrazenie kategórií.");
    currentCategoryId = null;
    displayCategoriesAsButtons(); // Zobraziť znova tlačidlá kategórií (to už vyčistí hash)
}


// --- Funkcie pre dynamickú šírku tabuliek (upravené pre prijímanie kontajnera) ---
// Funkcia na zistenie maximálnej šírky potrebnej pre zobrazenie obsahu tabuliek skupín V DANEJ KONTROLE
function findMaxTableContentWidth(containerElement) {
    let maxWidth = 0;
    // Hľadáme .group-display v rámci daného kontajnera
    const groupTables = containerElement.querySelectorAll('.group-display');

    groupTables.forEach(table => {
        const originalStyles = {
            flexBasis: table.style.flexBasis,
            width: table.style.width,
            minWidth: table.style.minWidth,
            maxWidth: table.style.maxWidth,
            flexShrink: table.style.flexShrink,
            flexGrow: table.style.flexGrow
        };

        // Dočasne zmeníme štýly pre správne meranie šírky obsahu
        table.style.flexBasis = 'max-content';
        table.style.width = 'auto';
        table.style.minWidth = 'auto';
        table.style.maxWidth = 'none';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';

        const requiredWidth = table.offsetWidth; // Získa skutočnú šírku elementu vrátane paddingu a borderu

        // Vrátime pôvodné štýly
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

    const safetyPadding = 20; // Malý prídavok pre istotu
    return maxWidth > 0 ? maxWidth + safetyPadding : 0; // Vráti 0 ak nie sú tabuľky
}

// Funkcia na nastavenie jednotnej šírky pre všetky tabuľky skupín V DANEJ KONTROLE
function setUniformTableWidth(width, containerElement) {
    if (width <= 0) return; // Nastavovať iba ak je platná šírka

    // Hľadáme .group-display v rámci daného kontajnera
    const groupTables = containerElement.querySelectorAll('.group-display');

    groupTables.forEach(table => {
        table.style.width = `${width}px`;
        table.style.minWidth = `${width}px`;
        table.style.maxWidth = `${width}px`;
        table.style.flexBasis = 'auto';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';
    });
}
// --- Koniec funkcií pre dynamickú šírku ---


// --- Event Listeners ---

// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín/kategórií.");
    await loadAllTournamentData(); // Načítať dáta ako prvé

    // Pridať poslucháča udalosti na tlačidlo Späť
    if (backToCategoriesButton) {
        backToCategoriesButton.addEventListener('click', goBackToCategories);
    } else {
        console.error("Tlačidlo Späť na kategórie sa nenašlo!");
    }

    // Skontrolovať hash v URL a podľa toho zobraziť obsah
    const hash = window.location.hash;
    const categoryPrefix = '#category-';

    if (hash && hash.startsWith(categoryPrefix)) {
        // Očakávame len hash kategórie
        const urlCategoryId = hash.substring(categoryPrefix.length);
        // *** DEKÓDOVAŤ URL KOMPONENTU PRED POUŽITÍM ***
        const decodedCategoryId = decodeURIComponent(urlCategoryId);


        // Skontrolujeme, či ID kategórie z URL existuje
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            console.log(`INFO: Načítavam kategóriu z URL: ${decodedCategoryId}`);
            displayGroupsForCategory(decodedCategoryId); // Zobraziť skupiny pre kategóriu z URL
        } else {
            console.log(`INFO: ID kategórie z URL "${decodedCategoryId}" sa nenašlo. Zobrazujem zoznam kategórií.`);
             // Ak ID z URL neexistuje, zobraziť zoznam kategórií a vyčistiť chybný hash
            displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
        }
    } else {
        console.log("INFO: V URL nie je hash kategórie. Zobrazujem zoznam kategórií.");
        displayCategoriesAsButtons(); // Zobraziť zoznam kategórií, ak v URL nie je hash
    }

});

// Poslucháč na zmenu veľkosti okna - pre dynamickú šírku tabuliek skupín
window.addEventListener('resize', () => {
    // Dynamickú šírku nastavujeme iba pri zobrazení skupín v kategórii
    if (currentCategoryId !== null) {
         // Cieľujeme na kontajner s triedou .groups-container v rámci dynamicContentArea
         const groupsContainerDiv = dynamicContentArea.querySelector('.groups-container');
          if (groupsContainerDiv) {
             const uniformWidth = findMaxTableContentWidth(groupsContainerDiv);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, groupsContainerDiv);
              }
          }
    }
 });

 // Poslucháč na zmenu hashu v URL (napr. ak používateľ použije tlačidlá Späť/Vpred v prehliadači)
window.addEventListener('hashchange', () => {
    console.log("INFO: Hash v URL sa zmenil.");

    const hash = window.location.hash;
    const categoryPrefix = '#category-';

     if (hash && hash.startsWith(categoryPrefix)) {
        const urlCategoryId = hash.substring(categoryPrefix.length);
        // *** DEKÓDOVAŤ URL KOMPONENTU PRED POUŽITÍM ***
        const decodedCategoryId = decodeURIComponent(urlCategoryId);


        // Skontrolujeme, či ID kategórie z URL existuje (z aktuálne načítaných dát)
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            console.log(`INFO: Hashchange: Zobrazujem skupiny pre kategóriu ${decodedCategoryId}`);
            displayGroupsForCategory(decodedCategoryId);
        } else {
            console.log(`INFO: Hashchange: Kategória ${decodedCategoryId} sa nenašla. Zobrazujem kategórie.`);
             displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
        }
    } else {
        console.log("INFO: Hashchange: V URL nie je platný hash kategórie. Zobrazujem zoznam kategórií.");
        displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
    }
});

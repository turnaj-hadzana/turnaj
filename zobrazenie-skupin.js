// zobrazenie-skupin.js (Šírka jednej skupiny riadená CSS, nie dynamicky JS)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencií na elementy
const dynamicContentArea = document.getElementById('dynamicContentArea'); // Hlavný dynamický kontajner
const backToCategoriesButton = document.getElementById('backToCategoriesButton'); // Tlačidlo Späť na kategórie
const backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton'); // Tlačidlo Späť na skupiny

// Referencie na dynamické kontajnery (pridané do HTML kostry)
const categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
const categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
const groupSelectionButtons = document.getElementById('groupSelectionButtons');
const allGroupsContent = document.getElementById('allGroupsContent');
const singleGroupContent = document.getElementById('singleGroupContent');
const allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
const allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
// singleGroupDisplayBlock a singleGroupUnassignedDisplay sa už nebudú plniť priamo v displaySingleGroup,
// ale ich obsah sa bude vytvárať a vkladať do singleGroupContent.


// Polia pre uchovanie všetkých načítaných dát
let allCategories = [];
let allGroups = [];
let allTeams = [];

// Premenné na sledovanie aktuálneho stavu zobrazenia
let currentCategoryId = null; // null: zobrazenie kategórií; ID: zobrazenie skupín pre kategóriu
let currentGroupId = null;   // null: zobrazenie kategórií/skupín v kategórii; ID: zobrazenie jednej skupiny

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
        // Pri chybe načítania, skryjeme všetok dynamický obsah
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
         // A zobrazíme chybovú správu v hlavnom kontajneri
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';

         // Skryť tlačidlá späť
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';

        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}

// Funkcia na zobrazenie/skrytie dynamických kontajnerov
function showOnly(containerIdToShow) {
    console.log(`DEBUG: Calling showOnly, target: ${containerIdToShow}`);
    // Skryť všetky potenciálne kontajnery obsahu
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
    // Nadpis kategórie a tlačidlá skupín sa zobrazujú v úrovniach 2 a 3
    // if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none'; // display riadený nižšie
    // if (groupSelectionButtons) groupSelectionButtons.style.display = 'none'; // display riadený nižšie
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';


    // Zobraziť požadovaný kontajner a prípadné spoločné prvky
    switch (containerIdToShow) {
        case 'categoryButtonsContainer':
            if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá sú flex
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
            console.log("DEBUG: showOnly -> Showing categoryButtonsContainer");
            break;
        case 'allGroupsContent':
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block'; // Nadpis je blok
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá sú flex
            if (allGroupsContent) allGroupsContent.style.display = 'block'; // Kontajner skupín je blok
             console.log("DEBUG: showOnly -> Showing allGroupsContent (and title/group buttons)");
            break;
        case 'singleGroupContent':
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block'; // Nadpis ostáva viditeľný
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá skupín ostávajú viditeľné
            if (singleGroupContent) singleGroupContent.style.display = 'block'; // Kontajner jednej skupiny je blok
             console.log("DEBUG: showOnly -> Showing singleGroupContent (and title/group buttons)");
            break;
        default:
             // V prípade chyby alebo neznámeho stavu skryť všetko
             if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
             if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
             if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
             if (allGroupsContent) allGroupsContent.style.display = 'none';
             if (singleGroupContent) singleGroupContent.style.display = 'none';
            console.log("DEBUG: showOnly -> Hiding all containers");
            break;
    }
}


// Funkcia na zobrazenie kategórií ako tlačidiel (Úroveň 1)
function displayCategoriesAsButtons() {
    console.log("INFO: Zobrazujem kategórie ako tlačidlá.");
    currentCategoryId = null;
    currentGroupId = null;

    if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !allGroupsContainer || !allGroupsUnassignedDisplay) { // Check for all needed containers
        console.error("Chyba: Chýbajú HTML elementy kontajnerov pri displayCategoriesAsButtons.");
        // Zobrazíme chybu aj v dynamicContentArea, keďže ostatné kontajnery nemusia byť nájdené
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri inicializácii zobrazenia. Chýbajú potrebné HTML elementy.</p>';
        return;
    }

    // Vyčistiť obsah kontajnerov (ak tam niečo bolo)
    categoryButtonsContainer.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = ''; // Vyčistiť kontajner blokov skupín
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy
    if (singleGroupContent) singleGroupContent.innerHTML = ''; // Vyčistiť obsah singleGroupContent
     if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Vyčistiť tlačidlá výberu skupiny
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = ''; // Vyčistiť nadpis kategórie


    // Skryť tlačidlá späť
    backToCategoriesButton.style.display = 'none';
    backToGroupButtonsButton.style.display = 'none';

    // Zobraziť iba kontajner tlačidiel kategórií
    showOnly('categoryButtonsContainer');

    // Vymazať hash z URL pri návrate na zoznam kategórií
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
         console.log("DEBUG: Cleared URL hash.");
    }

    if (allCategories.length === 0) {
        categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        // Štýlovanie prázdneho kontajnera už rieši CSS pravidlo pre #categoryButtonsContainer
        return;
    }

    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.classList.add('display-button'); // Používame spoločný štýl
        button.textContent = category.name || category.id;
        button.dataset.categoryId = category.id;

        // Pridáme poslucháča udalosti kliknutia na tlačidlo kategórie
        button.addEventListener('click', () => {
            const categoryId = button.dataset.categoryId;
            console.log(`DEBUG: Category button clicked for category ID: ${categoryId}. Calling displayGroupsForCategory.`);
            displayGroupsForCategory(categoryId); // Prejsť na zobrazenie VŠETKÝCH skupín kategórie
        });

        categoryButtonsContainer.appendChild(button);
    });
}

// Funkcia na zobrazenie VŠETKÝCH skupín a nepriradených tímov pre vybranú kategóriu (Úroveň 2)
function displayGroupsForCategory(categoryId) {
    console.log(`INFO: Zobrazujem všetky skupiny pre kategóriu: ${categoryId}`);
    currentCategoryId = categoryId;
    currentGroupId = null; // Už nezobrazujeme jednu konkrétnu skupinu

     if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !allGroupsContainer || !allGroupsUnassignedDisplay) { // Check for all needed containers
         console.error("Chyba: Chýbajú HTML elementy kontajnerov pre zobrazenie skupín.");
          if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri inicializácii zobrazenia skupín. Chýbajú potrebné HTML elementy.</p>';
         return;
     }

    // Vyčistiť obsah kontajnerov (ak tam niečo bolo)
    categoryButtonsContainer.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = ''; // Vyčistiť kontajner blokov skupín
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy
    if (singleGroupContent) singleGroupContent.innerHTML = ''; // Vyčistiť obsah singleGroupContent
     if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Vyčistiť tlačidlá výberu skupiny
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = ''; // Vyčistiť nadpis kategórie


    // Zobraziť/skryť tlačidlá späť
    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'none';

    // Zobraziť iba kontajnery pre Úroveň 2
    showOnly('allGroupsContent'); // Toto zobrazí categoryTitleDisplay, groupSelectionButtons, allGroupsContent
    console.log(`DEBUG: After showOnly('allGroupsContent'). allGroupsContent display: ${allGroupsContent ? allGroupsContent.style.display : 'N/A'}, singleGroupContent display: ${singleGroupContent ? singleGroupContent.style.display : 'N/A'}`);


    // Zápis do URL hash (len kategória)
    window.location.hash = 'category-' + encodeURIComponent(categoryId);
    console.log(`DEBUG: Set URL hash to: ${window.location.hash}`);


    const selectedCategory = allCategories.find(cat => cat.id === categoryId);

    if (!selectedCategory) {
        // Ak sa kategória nenašla, skryjeme aj tlačidlá späť a zobrazíme chybu
        backToCategoriesButton.style.display = 'none';
        backToGroupButtonsButton.style.display = 'none';
        showOnly(null); // Skryť všetko
        dynamicContentArea.innerHTML = '<p>Vybraná kategória sa nenašla.</p>';
        console.error(`ERROR: Category with ID ${categoryId} not found.`);
        return;
    }

     // Pridáme nadpis kategórie
     categoryTitleDisplay.textContent = selectedCategory.name || selectedCategory.id;


    // Nájdi skupiny patriace do tejto kategórie
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);


     // NOVÁ LOGIKA: Pridať triedu pre 5 skupín pre špeciálne rozloženie (ak je potrebná)
     if (groupsInCategory.length === 5) {
         if (allGroupsContainer) allGroupsContainer.classList.add('force-3-plus-2-layout');
     } else {
          if (allGroupsContainer) allGroupsContainer.classList.remove('force-3-plus-2-layout');
     }


    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));


    if (groupsInCategory.length === 0) {
         if (groupSelectionButtons) groupSelectionButtons.innerHTML = '<p>V kategórii nie sú skupiny na výber.</p>';
         if (allGroupsContainer) allGroupsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
          // Ak nie sú skupiny, dynamickú šírku neriešime
    } else {
        // --- VYTVORIŤ TLAČIDLÁ PRE VÝBER SKUPINY ---
        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button'); // Používame spoločný štýl
            button.textContent = group.name || group.id; // Názov skupiny ako text tlačidla
            button.dataset.groupId = group.id; // Uložíme ID skupiny

            // Poslucháč udalosti pre tlačidlo skupiny
            button.addEventListener('click', () => {
                 const groupIdToDisplay = button.dataset.groupId;
                 console.log(`DEBUG: Group button clicked for group ID: ${groupIdToDisplay}. Calling displaySingleGroup.`);
                 displaySingleGroup(groupIdToDisplay); // Prejsť na zobrazenie JEDNEJ skupiny
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button); // Pridať tlačidlo do pripraveného kontajnera tlačidiel
        });
        // --- KONIEC VYTVÁRANIA TLAČIDIEL PRE VÝBER SKUPINY ---


        // --- VYTVORIŤ BLOKY VŠETKÝCH SKUPÍN ---
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

            if (allGroupsContainer) allGroupsContainer.appendChild(groupDiv); // Pridať blok skupiny do pripraveného kontajnera blokov
        });

        // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ BLOKOV SKUPÍN
         // Teraz voláme funkciu pre všetky .group-display v rámci allGroupsContainer
        if (allGroupsContainer) {
            const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
            if (uniformWidth > 0) {
               setUniformTableWidth(uniformWidth, allGroupsContainer);
               console.log(`DEBUG: Dynamic width set for all groups content: ${uniformWidth}px`);
            } else {
                console.log("DEBUG: Dynamic width not set for all groups, uniformWidth is 0 or less.");
            }
        }
         // --- KONIEC VYTVÁRANIA BLOKOV VŠETKÝCH SKUPÍN ---
    }


    // Zobraziť nepriradené tímy patriace do tejto kategórie (pod blokmi skupín)
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === currentCategoryId
    );

     if (unassignedTeamsInCategory.length > 0) {
         // Vyčistíme aj singleGroupUnassignedDisplay pre istotu (hoci by mal byť skrytý)
         if (singleGroupContent) singleGroupContent.querySelector('.unassigned-teams-display').innerHTML = ''; // Vyčistíme unassigned tímov v single view

         const unassignedDivContent = document.createElement('div'); // Vytvoríme obsah divu nepriradených tímov
         unassignedDivContent.classList.add('unassigned-teams-display'); // Použijeme existujúci štýl

         const unassignedTitle = document.createElement('h2');
         unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
         unassignedDivContent.appendChild(unassignedTitle);

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
         unassignedDivContent.appendChild(unassignedList);

         if (allGroupsUnassignedDisplay) {
              allGroupsUnassignedDisplay.appendChild(unassignedDivContent); // Pridáme celý obsah do pripraveného kontajnera pre all groups view
               console.log("DEBUG: Unassigned teams display added to allGroupsUnassignedDisplay.");
         }

     } else {
         // Ak nie sú nepriradené tímy, vyčistíme kontajner, keby tam niečo ostalo z predošlého zobrazenia
          if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
           console.log("DEBUG: No unassigned teams for this category in all groups view.");
     }
}

// Funkcia na zobrazenie obsahu jednej konkrétnej skupiny (Úroveň 3)
function displaySingleGroup(groupId) {
     console.log(`DEBUG: Entering displaySingleGroup for group ID: ${groupId}`);
     console.log(`INFO: Zobrazujem detail skupiny: ${groupId}`);

     // Nájdeme kategóriu a skupinu
     const group = allGroups.find(g => g.id === groupId);
     if (!group) {
          console.error(`ERROR: Skupina s ID "${groupId}" sa nenašla.`);
          // Pri chybe skryjeme aj tlačidlá späť a zobrazíme chybu
           backToCategoriesButton.style.display = 'none';
           backToGroupButtonsButton.style.display = 'none';
           showOnly(null); // Skryť všetko
           dynamicContentArea.innerHTML = '<p>Vybraná skupina sa nenašla.</p>';
           currentCategoryId = null;
           currentGroupId = null;
          return;
     }
     currentCategoryId = group.categoryId; // Uložíme ID kategórie skupiny
     currentGroupId = groupId; // Nastavíme stav na zobrazenie jednej skupiny

     if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent) { // Check for all needed containers
         console.error("Chyba: Chýbajú HTML elementy kontajnerov pre zobrazenie jednej skupiny v displaySingleGroup.");
         // Zobrazíme chybu
          if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri inicializácii zobrazenia detailu skupiny. Chýbajú potrebné HTML elementy.</p>';
         return;
     }

     // Zobraziť/skryť tlačidlá späť
     backToCategoriesButton.style.display = 'none';
     backToGroupButtonsButton.style.display = 'block';
     console.log("DEBUG: Back buttons visibility updated for single group view.");


     // Zobraziť iba kontajnery pre Úroveň 3 (categoryTitleDisplay a groupSelectionButtons ostanú viditeľné)
     showOnly('singleGroupContent'); // Toto zobrazí singleGroupContent a ponechá categoryTitleDisplay, groupSelectionButtons
     console.log(`DEBUG: After showOnly('singleGroupContent'). allGroupsContent display: ${allGroupsContent ? allGroupsContent.style.display : 'N/A'}, singleGroupContent display: ${singleGroupContent ? singleGroupContent.style.display : 'N/A'}`);


     // Vyčistiť obsah singleGroupContent
    if (singleGroupContent) singleGroupContent.innerHTML = ''; // Clears singleGroupContent
    console.log("DEBUG: Cleared singleGroupContent innerHTML.");

     // Zápis do URL hash (kategória + skupina)
     window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;
     console.log(`DEBUG: Set URL hash to: ${window.location.hash}`);

     // Pridáme nadpis kategórie (už bol zobrazený v Úrovni 2, teraz len aktualizujeme text pre istotu)
      const category = allCategories.find(cat => cat.id === currentCategoryId);
      if (category && categoryTitleDisplay) {
           categoryTitleDisplay.textContent = category.name || category.id;
           console.log("DEBUG: Category title updated.");
      }


     // Teraz pridáme obsah samotného bloku skupiny do singleGroupContent
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

     if (singleGroupContent) singleGroupContent.appendChild(groupDiv); // Pridáme blok skupiny do singleGroupContent
     console.log("DEBUG: Single group block added to singleGroupContent.");


     // Zobraziť nepriradené tímy patriace do kategórie tejto skupiny (pod blokom skupiny)
     const unassignedTeamsInCategory = allTeams.filter(team =>
         (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
         team.categoryId === currentCategoryId
     );

     if (unassignedTeamsInCategory.length > 0) {
         const unassignedDivContent = document.createElement('div'); // Vytvoríme obsah divu nepriradených tímov
         unassignedDivContent.classList.add('unassigned-teams-display'); // Použijeme existujúci štýl

         const unassignedTitle = document.createElement('h2');
         unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
         unassignedDivContent.appendChild(unassignedTitle);

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
         unassignedDivContent.appendChild(unassignedList);

         if (singleGroupContent) { // Append unassigned teams to singleGroupContent
              singleGroupContent.appendChild(unassignedDivContent);
              console.log("DEBUG: Unassigned teams display added to singleGroupContent.");
         }

     } else {
         // Ak nie sú nepriradené tímy, vyčistíme kontajner, keby tam niečo ostalo z predošlého zobrazenia (z Úrovne 2)
          // singleGroupContent bol už vyčistený na začiatku funkcie, takže netreba zvlášť čistiť
          console.log("DEBUG: No unassigned teams for this category in single group view.");
     }


     // *** ODSTRÁNENÉ VOLANIE DYNAMICKÝCH FUNKCIÍ ŠÍRKY PRE SAMOSTATNÚ SKUPINU ***
     // Šírka samostatnej skupiny je teraz riadená CSS (#singleGroupContent .group-display)
}

// Funkcia na zobrazenie kategórií (návrat z pohľadu skupín v kategórii alebo jednej skupiny) (Návrat na Úroveň 1)
function goBackToCategories() {
    console.log("INFO: Návrat na zobrazenie kategórií.");
    currentCategoryId = null;
    currentGroupId = null; // Reset aj group ID stavu

     // Vyčistiť obsah kontajnerov
     if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupContent) singleGroupContent.innerHTML = ''; // Clears singleGroupContent
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = '';

    console.log("DEBUG: Cleared content containers.");


    // Skryť všetky dynamické kontajnery (okrem categoryButtonsContainer, ten sa zobrazí)
     showOnly('categoryButtonsContainer');

    // Skryť tlačidlá späť
    backToCategoriesButton.style.display = 'none';
    backToGroupButtonsButton.style.display = 'none';
    console.log("DEBUG: Back buttons hidden.");


    // Vymazať hash
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
        console.log("DEBUG: Cleared URL hash on back to categories.");
    }

    // Znova vygenerovať tlačidlá kategórií
     displayCategoriesAsButtons(); // Táto funkcia už naplní categoryButtonsContainer a nastaví jeho display

}

// Funkcia na návrat na zobrazenie VŠETKÝCH skupín ako blokov pre aktuálnu kategóriu (Návrat na Úroveň 2)
function goBackToGroupView() {
     console.log(`INFO: Návrat na zobrazenie všetkých skupín pre kategóriu: ${currentCategoryId}`);
     currentGroupId = null; // Už nezobrazujeme jednu skupinu

     if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !allGroupsContainer || !allGroupsUnassignedDisplay) { // Check for all needed containers
         console.error("Chyba: Chýbajú HTML elementy kontajnerov pri návrate na zobrazenie skupín.");
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri návrate na zobrazenie skupín. Chýbajú potrebné HTML elementy.</p>';
         return;
     }


     // Vyčistiť obsah kontajnera JEDNEJ skupiny
    if (singleGroupContent) singleGroupContent.innerHTML = ''; // Clears singleGroupContent
    console.log("DEBUG: Cleared singleGroupContent on back to group view.");


     // Zobraziť kontajnery pre Úroveň 2 (categoryTitleDisplay a groupSelectionButtons ostanú viditeľné)
     showOnly('allGroupsContent'); // Toto zobrazí allGroupsContent a ponechá categoryTitleDisplay, groupSelectionButtons
     console.log(`DEBUG: After showOnly('allGroupsContent') on back. allGroupsContent display: ${allGroupsContent ? allGroupsContent.style.display : 'N/A'}, singleGroupContent display: ${singleGroupContent ? singleGroupContent.style.display : 'N/A'}`);


     // Zobraziť/skryť tlačidlá späť
     backToCategoriesButton.style.display = 'block'; // Späť na kategórie
     backToGroupButtonsButton.style.display = 'none'; // Späť na skupiny
    console.log("DEBUG: Back buttons visibility updated on back.");


     // Hash už je nastavený na #category-... z displayGroupsForCategory
     // Netreba ho meniť, lebo sa vraciame na zobrazenie celej kategórie.

     // V tomto pohľade už sú bloky skupín aj tlačidlá výberu skupín naplnené z displayGroupsForCategory,
     // stačí správne nastaviť viditeľnosť kontajnerov.
     // Treba len znova zavolať funkciu na nastavenie šírky, ak sa zmenila veľkosť okna
     if (allGroupsContainer) {
         const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
         if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, allGroupsContainer);
            console.log(`DEBUG: Dynamic width set for all groups content on back: ${uniformWidth}px`);
         } else {
             console.log("DEBUG: Dynamic width not set on back, uniformWidth is 0 or less.");
         }
     }

     // Ak z nejakého dôvodu nemáme ID kategórie pri návrate, vrátime sa úplne na začiatok
     if (!currentCategoryId) {
         console.log("ERROR: currentCategoryId is null on goBackToGroupView. Returning to categories.");
         goBackToCategories();
     }
}


// --- Funkcie pre dynamickú šírku tabuliek (upravené pre prijímanie kontajnera) ---
// Funkcia na zistenie maximálnej šírky potrebnej pre zobrazenie obsahu tabuliek skupín V DANEJ KONTROLE
function findMaxTableContentWidth(containerElement) {
    let maxWidth = 0;
    // Hľadáme .group-display v rámci daného kontajnera
    const groupTables = containerElement ? containerElement.querySelectorAll('.group-display') : [];

     if (groupTables.length === 0) {
         console.log("DEBUG: findMaxTableContentWidth: No .group-display elements found in containerElement.");
         return 0;
     }


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
        table.style.flexBasis = 'max-content'; // Základná veľkosť podľa najširšieho obsahu
        table.style.width = 'auto'; // Šírka auto
        table.style.minWidth = 'auto'; // Žiadne min. obmedzenie šírky pre meranie
        table.style.maxWidth = 'none'; // Žiadne max. obmedzenie šírky pre meranie
        table.style.flexShrink = '0'; // Zabráni zmenšovaniu počas merania
        table.style.flexGrow = '0'; // Zabráni zväčšovaniu počas merania

        // Zabezpečíme, že prehliadač prekreslí a prepočíta rozmery
        // Prístup k offsetWidth často vynúti toto prekreslenie
        const requiredWidth = table.offsetWidth;

        // Obnovíme pôvodné štýly
        table.style.flexBasis = originalStyles.flexBasis;
        table.style.width = originalStyles.width;
        table.style.minWidth = originalStyles.minWidth;
        table.style.maxWidth = originalStyles.maxWidth;
        table.style.flexShrink = originalStyles.flexShrink;
        table.style.flexGrow = originalStyles.flexGrow;


        // Ak je nameraná šírka väčšia ako doterajšie maximum, aktualizujeme maximum
        if (requiredWidth > maxWidth) {
            maxWidth = requiredWidth;
        }
    });

    // Pridáme malý extra priestor k maximálnej šírke pre istotu (napr. padding/border)
    // Hodnotu 20px môžete doladiť
    const safetyPadding = 20;
     // Vráti 0 ak nie sú tabuľky alebo sa nenašla šírka
    return maxWidth > 0 ? maxWidth + safetyPadding : 0;
}

// Funkcia na nastavenie jednotnej šírky pre všetky tabuľky skupín V DANEJ KONTROLE
function setUniformTableWidth(width, containerElement) {
    if (width <= 0 || !containerElement) {
        console.log("DEBUG: setUniformTableWidth called with invalid width or containerElement.");
        return; // Nastavovať iba ak je platná šírka a element existuje
    }

    // Hľadáme .group-display v rámci daného kontajnera
    const groupTables = containerElement.querySelectorAll('.group-display');

     if (groupTables.length === 0) {
         console.log("DEBUG: No .group-display elements found in containerElement for setting width.");
         return;
     }

    groupTables.forEach(table => {
        // Nastavíme vypočítanú jednotnú šírku ako pevnú šírku pre každú tabuľku
        table.style.width = `${width}px`;
        table.style.minWidth = `${width}px`; // Minimálna šírka bude táto pevná šírka
        table.style.maxWidth = `${width}px`; // Maximálna šírka bude táto pevná šírka

        // Nastavíme flexbox vlastnosti tak, aby tabuľka držala túto pevnú šírku
        table.style.flexBasis = 'auto'; // Základňa sa bude riadiť nastavenou šírkou
        table.style.flexShrink = '0'; // Zakážeme zmenšovanie pod túto šírku
        table.style.flexGrow = '0'; // Zakážeme zväčšovanie nad túto šírku
    });
     console.log(`DEBUG: Set uniform width ${width}px for ${groupTables.length} group table(s) in container.`);
}
// --- Koniec funkcií pre dynamickú šírku ---


// --- Event Listeners ---

// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín/kategórií.");

     // Kontrola, či sú nájdené všetky potrebné HTML elementy
     if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton || !categoryButtonsContainer || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !allGroupsContainer || !allGroupsUnassignedDisplay) { // Final check for all needed containers
         console.error("FATAL ERROR: Chýbajú niektoré základné HTML elementy kontajnerov. Skontrolujte prosím zobrazenie-skupin.html.");
          if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>FATAL ERROR: Chyba pri inicializácii aplikácie. Chýbajú potrebné HTML elementy. Skontrolujte konzolu pre detaily.</p>';
         // Skryť tlačidlá späť pre prípad chyby
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
         showOnly(null); // Skryť všetky kontajnery pre istotu
         return; // Zastaviť ďalšie vykonávanie skriptu
     }


    await loadAllTournamentData(); // Načítať dáta ako prvé
    console.log("DEBUG: All tournament data loaded.");


    // Pridať poslucháčov udalostí na tlačidlá Späť
    backToCategoriesButton.addEventListener('click', goBackToCategories);
    backToGroupButtonsButton.addEventListener('click', goBackToGroupView);
    console.log("DEBUG: Back button event listeners added.");


    // Skontrolovať hash v URL a podľa toho zobraziť obsah
    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-'; // Prefix pre skupinu v rámci kategórie

    if (hash && hash.startsWith(categoryPrefix)) {
        console.log(`DEBUG: URL hash found: ${hash}`);
        const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
        const urlCategoryId = hashParts[0];
        const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;

        // *** DEKÓDOVAŤ URL KOMPONENTY PRED POUŽITÍM ***
        const decodedCategoryId = decodeURIComponent(urlCategoryId);
        const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;
        console.log(`DEBUG: Decoded hash parts: categoryId=${decodedCategoryId}, groupId=${decodedGroupId}`);


        // Skontrolujeme, či ID kategórie z URL existuje
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            console.log(`DEBUG: Category ID from hash "${decodedCategoryId}" exists.`);
            if (decodedGroupId) {
                // Ak je v hashi aj ID skupiny
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Načítavam skupinu z URL: ${decodedGroupId} v kategórii ${decodedCategoryId}`);
                      // Pre hashchange ideme priamo na zobrazenie danej skupiny,
                      // ale aby fungoval návrat na skupiny, musíme najprv naplniť Úroveň 2 kontajner
                      // Kontajnery už by mali byť naplnené z predchádzajúceho displayGroupsForCategory,
                      // stačí prepnúť viditeľnosť.
                      // displayGroupsForCategory(decodedCategoryId); // Toto by mohlo zbytočne znovu napĺňať obsah
                      // Namiesto toho len nastavíme stavy a zavoláme showOnly
                      currentCategoryId = decodedCategoryId; // Nastavíme stav
                      currentGroupId = decodedGroupId; // Nastavíme stav
                       // Naplníme aj obsah singleGroupContent, ak ešte nebol
                       // (toto sa zvyčajne stane pri priamom načítaní URL s hashom skupiny)
                       // Zavoláme displaySingleGroup, aby sa naplnil singleGroupContent a nastavila viditeľnosť
                      displaySingleGroup(decodedGroupId);


                 } else {
                      console.log(`INFO: ID skupiny z URL "${decodedGroupId}" sa nenašlo v kategórii "${decodedCategoryId}". Zobrazujem všetky skupiny pre kategóriu.`);
                      displayGroupsForCategory(decodedCategoryId); // Zobraziť všetky skupiny pre kategóriu
                 }
            } else {
                // Ak je v hashi len ID kategórie
                console.log(`INFO: Načítavam všetky skupiny pre kategóriu z URL: ${decodedCategoryId}`);
                displayGroupsForCategory(decodedCategoryId); // Zobraziť všetky skupiny pre kategóriu
            }
        } else {
            console.log(`INFO: ID kategórie z URL "${decodedCategoryId}" sa nenašlo. Zobrazujem zoznam kategórií.`);
             // Ak ID z URL neexistuje, zobraziť zoznam kategórií
            displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
        }
    } else {
        console.log("INFO: V URL nie je hash kategórie/skupiny. Zobrazujem zoznam kategórií.");
        displayCategoriesAsButtons(); // Zobraziť zoznam kategórií, ak v URL nie je hash
    }

});

// Poslucháč na zmenu veľkosti okna - pre dynamickú šírku tabuliek skupín
window.addEventListener('resize', () => {
    console.log("DEBUG: Window resized.");
    // Dynamickú šírku nastavujeme iba pri zobrazení VŠETKÝCH skupín v kategórii (Úroveň 2)
    // Pri zobrazení JEDNEJ skupiny (Úroveň 3) riadi šírku CSS
    if (currentCategoryId !== null && currentGroupId === null) { // Sme v pohľade VŠETKÝCH skupín
         let containerElement = allGroupsContainer; // Cieľujeme na kontajner .groups-container v allGroupsContent
         console.log("DEBUG: Resizing in all groups view. Targeting allGroupsContainer.");


         if (containerElement) {
             const uniformWidth = findMaxTableContentWidth(containerElement);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, containerElement);
                 console.log(`DEBUG: Dynamic width set for all groups content: ${uniformWidth}px`);
              } else {
                  console.log("DEBUG: Resizing, but uniformWidth is 0 or less, or no containerElement.");
              }
          } else {
              console.log("DEBUG: Resizing, but allGroupsContainer is null.");
          }
    } else {
        console.log("DEBUG: Resizing, but not in all groups view (Level 2).");
    }
 });

 // Poslucháč na zmenu hashu v URL (napr. ak používateľ použije tlačidlá Späť/Vpred v prehliadači)
window.addEventListener('hashchange', () => {
    console.log("INFO: Hash v URL sa zmenil.");
    console.log(`DEBUG: New hash: ${window.location.hash}`);

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

     if (hash && hash.startsWith(categoryPrefix)) {
        const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
        const urlCategoryId = hashParts[0];
        const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;

        // *** DEKÓDOVAŤ URL KOMPONENTY PRED POUŽITÍM ***
        const decodedCategoryId = decodeURIComponent(urlCategoryId);
        const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;
        console.log(`DEBUG: Hashchange: Decoded hash parts: categoryId=${decodedCategoryId}, groupId=${decodedGroupId}`);


        // Skontrolujeme, či ID kategórie z URL existuje (z aktuálne načítaných dát)
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
             console.log(`DEBUG: Hashchange: Category ID "${decodedCategoryId}" exists.`);
            if (decodedGroupId) {
                // Ak je v hashi aj ID skupiny
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Hashchange: Zobrazujem skupinu ${decodedGroupId}`);
                      // Pre hashchange ideme priamo na zobrazenie danej skupiny,
                      // ale aby fungoval návrat na skupiny, musíme najprv naplniť Úroveň 2 kontajner
                      // displayGroupsForCategory(decodedCategoryId); // Toto už netreba volať, ak chceme len prepnúť viditeľnosť
                      // Nastavíme stavy a zavoláme showOnly
                      currentCategoryId = decodedCategoryId;
                      currentGroupId = decodedGroupId;
                      showOnly('singleGroupContent'); // Prepneme viditeľnosť

                       // Znova nastaviť nadpis a tlačidlá späť pre istotu (obsah groupSelectionButtons ostane)
                      const category = allCategories.find(cat => cat.id === currentCategoryId);
                       if (category && categoryTitleDisplay) {
                            categoryTitleDisplay.textContent = category.name || category.id;
                       }
                       backToCategoriesButton.style.display = 'none';
                       backToGroupButtonsButton.style.display = 'block';

                       // Naplniť obsah singleGroupContent (ak už nebol, napr. pri priamom načítaní URL)
                       // Alebo skontrolovať, či je obsah singleGroupContent pre túto skupinu už vytvorený
                       // Pre jednoduchosť zavoláme displaySingleGroup znova, to naplní obsah ak treba a nastaví viditeľnosť
                       // Toto by však mohlo spôsobiť opätovné pridávanie event listenerov, ak by sa pridávali v displaySingleGroup.
                       // Event listenery pre tlačidlá výberu skupiny sú v displayGroupsForCategory, čo je ok.
                       // displaySingleGroup nemala obsahovať pridávanie event listenerov.
                       // displaySingleGroup(decodedGroupId); // Voláme displaySingleGroup pre naplnenie obsahu a nastavenie visibility/state

                       // ALTERNATÍVNE A ČISTEJŠIE:
                       // Pri hashchange najprv skontrolovať, či už NIE SME v požadovanom stave.
                       // Ak sme v stave Level 3 pre tú istú skupinu, nerobíme nič.
                       if (!(currentCategoryId === decodedCategoryId && currentGroupId === decodedGroupId)) {
                           // Ak nie sme v požadovanom stave, zavoláme displayGroupsForCategory (aby sa naplnila úroveň 2 pre návrat)
                           displayGroupsForCategory(decodedCategoryId);
                           // A potom prejdeme na zobrazenie jednej skupiny
                           displaySingleGroup(decodedGroupId);
                       } else {
                            console.log("DEBUG: Hashchange: Already in the correct single group view. Doing nothing.");
                       }


                 } else {
                      console.log(`INFO: Hashchange: Skupina ${decodedGroupId} v kategórii ${decodedCategoryId} sa nenašla. Zobrazujem všetky skupiny pre kategóriu.`);
                      displayGroupsForCategory(decodedCategoryId); // Zobraziť všetky skupiny pre kategóriu
                 }
            } else {
                // Ak je v hashi len ID kategórie
                console.log(`INFO: Hashchange: Zobrazujem všetky skupiny pre kategóriu ${decodedCategoryId}`);
                // Ak sme už v stave Level 2 pre tú istú kategóriu, nerobíme nič.
                 if (!(currentCategoryId === decodedCategoryId && currentGroupId === null)) {
                     displayGroupsForCategory(decodedCategoryId);
                 } else {
                      console.log("DEBUG: Hashchange: Already in the correct all groups view. Doing nothing.");
                 }
            }
        } else {
            console.log(`INFO: Hashchange: Kategória ${decodedCategoryId} sa nenašla. Zobrazujem kategórie.`);
             displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
        }
    } else { // Hash je prázdny alebo nezacina #category-
         // Ak sme už v stave Level 1, nerobíme nič.
          if (!(currentCategoryId === null && currentGroupId === null)) {
             console.log("INFO: Hashchange: V URL nie je platný hash kategórie/skupiny. Zobrazujem zoznam kategórií.");
             displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
          } else {
               console.log("DEBUG: Hashchange: Already in the correct categories view. Doing nothing.");
          }
    }
});

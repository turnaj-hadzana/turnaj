// zobrazenie-skupin.js (Oprava problému s návratom na skupiny po priamom načítaní URL + Detailné logy pre kontrolu elementov)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencií na elementy (použijeme let, aby sme ich mohli prípadne skontrolovať)
let dynamicContentArea = null; // Hlavný dynamický kontajner
let backToCategoriesButton = null; // Tlačidlo Späť na kategórie
let backToGroupButtonsButton = null; // Tlačidlo Späť na skupiny

// Referencie na dynamické kontajnery (pridané do HTML kostry)
let categoryButtonsContainer = null;
let categoryTitleDisplay = null;
let groupSelectionButtons = null; // Referencia na kontajner tlačidiel skupín
let allGroupsContent = null;
let singleGroupContent = null;
let allGroupsContainer = null; // .groups-container v allGroupsContent
let allGroupsUnassignedDisplay = null; // .unassigned-teams-display v allGroupsContent
let singleGroupDisplayBlock = null; // .group-display v singleGroupContent
let singleGroupUnassignedDisplay = null; // .unassigned-teams-display v singleGroupContent


// Polia pre uchovanie všetkých načítaných dát
let allCategories = [];
let allGroups = [];
let allTeams = [];

// Premenné na sledovanie aktuálneho stavu zobrazenia
let currentCategoryId = null; // null: zobrazenie kategórií; ID: zobrazenie skupín pre kategóriu
let currentGroupId = null;   // null: zobrazenie kategórií/skupín v kategórii; ID: zobrazenie jednej skupiny


// Funkcia na získanie referencií na všetky potrebné HTML elementy
function getHTMLElements() {
     dynamicContentArea = document.getElementById('dynamicContentArea');
     backToCategoriesButton = document.getElementById('backToCategoriesButton');
     backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');

     categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
     categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
     groupSelectionButtons = document.getElementById('groupSelectionButtons');
     allGroupsContent = document.getElementById('allGroupsContent');
     singleGroupContent = document.getElementById('singleGroupContent');

     // Nested elements - check if parent exists first
     allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
     allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
     singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null;
     singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;

     // Perform initial check and log
     const elementsFound = dynamicContentArea && backToCategoriesButton && backToGroupButtonsButton &&
                           categoryButtonsContainer && categoryTitleDisplay && groupSelectionButtons &&
                           allGroupsContent && singleGroupContent &&
                           allGroupsContainer && allGroupsUnassignedDisplay &&
                           singleGroupDisplayBlock && singleGroupUnassignedDisplay;

    if (!elementsFound) {
        console.error("FATAL ERROR: Chýbajú niektoré základné HTML elementy kontajnerov!");
        console.log(`DEBUG: dynamicContentArea: ${dynamicContentArea !== null}`);
        console.log(`DEBUG: backToCategoriesButton: ${backToCategoriesButton !== null}`);
        console.log(`DEBUG: backToGroupButtonsButton: ${backToGroupButtonsButton !== null}`);
        console.log(`DEBUG: categoryButtonsContainer: ${categoryButtonsContainer !== null}`);
        console.log(`DEBUG: categoryTitleDisplay: ${categoryTitleDisplay !== null}`);
        console.log(`DEBUG: groupSelectionButtons: ${groupSelectionButtons !== null}`);
        console.log(`DEBUG: allGroupsContent: ${allGroupsContent !== null}`);
        console.log(`DEBUG: singleGroupContent: ${singleGroupContent !== null}`);
        console.log(`DEBUG: allGroupsContainer (nested): ${allGroupsContainer !== null}`);
        console.log(`DEBUG: allGroupsUnassignedDisplay (nested): ${allGroupsUnassignedDisplay !== null}`);
        console.log(`DEBUG: singleGroupDisplayBlock (nested): ${singleGroupDisplayBlock !== null}`);
        console.log(`DEBUG: singleGroupUnassignedDisplay (nested): ${singleGroupUnassignedDisplay !== null}`);


         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>FATAL ERROR: Chyba pri inicializácii aplikácie. Chýbajú potrebné HTML elementy. Skontrolujte konzolu pre detaily.</p>';
         // Skryť tlačidlá späť pre prípad chyby
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
         showOnly(null); // Skryť všetky kontajnery pre istotu
         return false; // Indicate failure
     }
      console.log("DEBUG: All required HTML elements found.");
      return true; // Indicate success
}


// Funkcia na načítanie všetkých dát z databázy
async function loadAllTournamentData() {
    console.log("INFO: Načítavam dáta turnaja...");
    try {
        // Načítať kategórie
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));
        console.log(`DEBUG: Loaded ${allCategories.length} categories.`);


        // Načítať skupiny
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         // Doplníme categoryId do skupiny, ak chýba (na základe prefixu ID)
         allGroups = allGroups.map(group => {
              if (!group.categoryId) {
                 const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                 if (categoryFromId) {
                      group.categoryId = categoryFromId.id;
                 }
              }
              return group;
         }).filter(group => group.categoryId); // Filter pre istotu, len skupiny s priradenou kategóriou

        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));
         console.log(`DEBUG: Loaded ${allGroups.length} groups.`);


        // Načítať tímy
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("INFO: Dáta turnaja načítané.", { numCategories: allCategories.length, numGroups: allGroups.length, numTeams: allTeams.length });


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
    // Skryť všetky potenciálne kontajnery obsahu okrem tých, ktoré majú byť viditeľné v oboch úrovniach 2 a 3
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
    // categoryTitleDisplay a groupSelectionButtons ostávajú viditeľné v úrovniach 2 a 3
    // if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none'; // REMOVED HIDING
    // if (groupSelectionButtons) groupSelectionButtons.style.display = 'none'; // REMOVED HIDING
    if (allGroupsContent) allGroupsContent.style.display = 'none'; // <-- This should hide allGroupsContent unless it's the target
    if (singleGroupContent) singleGroupContent.style.display = 'none'; // <-- This should hide singleGroupContent unless it's the target

     console.log(`DEBUG: showOnly - After hiding: categoryButtonsContainer=${categoryButtonsContainer ? categoryButtonsContainer.style.display : 'N/A'}, allGroupsContent=${allGroupsContent ? allGroupsContent.style.display : 'N/A'}, singleGroupContent=${singleGroupContent ? singleGroupContent.style.display : 'N/A'}`);


    // Zobraziť požadovaný kontajner a prípadné spoločné prvky
    switch (containerIdToShow) {
        case 'categoryButtonsContainer': // Úroveň 1
            if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá sú flex
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none'; // Explicitly hide in Level 1
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'none'; // Explicitly hide in Level 1
             console.log("DEBUG: showOnly -> Showing categoryButtonsContainer, hiding title/group buttons.");
            break;
        case 'allGroupsContent': // Úroveň 2
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block'; // Zobraziť nadpis
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Zobraziť tlačidlá skupín
            if (allGroupsContent) allGroupsContent.style.display = 'block'; // Zobraziť kontajner všetkých skupín
             console.log("DEBUG: showOnly -> Showing allGroupsContent (and title/group buttons).");
            break;
        case 'singleGroupContent': // Úroveň 3
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block'; // Nadpis ostáva viditeľný
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá skupín ostávajú viditeľné
            if (singleGroupContent) singleGroupContent.style.display = 'block'; // Zobraziť kontajner jednej skupiny je blok
             console.log("DEBUG: showOnly -> Showing singleGroupContent (and title/group buttons).");
            break;
        default:
             // V prípade chyby alebo neznámeho stavu skryť všetko
             if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
             if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
             if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
             if (allGroupsContent) allGroupsContent.style.display = 'none';
             if (singleGroupContent) singleGroupContent.style.display = 'none';
             console.log("DEBUG: showOnly -> Hiding all containers (default case).");
            break;
    }
     console.log(`DEBUG: showOnly finished. #groupSelectionButtons display: ${groupSelectionButtons ? groupSelectionButtons.style.display : 'N/A'}`);

     // Po zmene zobrazenia znova prepočítať a nastaviť šírku, ak je to potrebné pre aktuálne zobrazenú úroveň
     // Toto sa vykoná LEN ak sú elementy nájdené (prejde kontrola na začiatku display funkcií)
     if (containerIdToShow === 'allGroupsContent' && allGroupsContainer) {
         console.log("DEBUG: showOnly is calling dynamic width for allGroupsContainer.");
         const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
          if (uniformWidth > 0) {
             setUniformTableWidth(uniformWidth, allGroupsContainer);
             console.log(`DEBUG: Dynamic width set for all groups content via showOnly: ${uniformWidth}px`);
          } else {
               console.log("DEBUG: Dynamic width not set via showOnly for all groups, uniformWidth is 0 or less.");
          }
     } else if (containerIdToShow === 'singleGroupContent' && singleGroupContent) {
          console.log("DEBUG: showOnly is calling dynamic width for singleGroupContent.");
          // Dynamickú šírku nastavujeme aj pre singleGroupContent, aj keď CSS tiež pomáha
           const uniformWidth = findMaxTableContentWidth(singleGroupContent);
            if (uniformWidth > 0) {
               setUniformTableWidth(uniformWidth, singleGroupContent);
                console.log(`DEBUG: Dynamic width set for single group content via showOnly: ${uniformWidth}px`);
            } else {
                 console.log("DEBUG: Dynamic width not set via showOnly for single group, uniformWidth is 0 or less.");
            }
     }
}


// Funkcia na zobrazenie kategórií ako tlačidiel (Úroveň 1)
function displayCategoriesAsButtons() {
    console.log("INFO: Zobrazujem kategórie ako tlačidlá.");
    currentCategoryId = null;
    currentGroupId = null;

    // Kontrola existencie elementov
     if (!getHTMLElements()) {
         console.error("ERROR: displayCategoriesAsButtons failed due to missing HTML elements.");
         return; // Ukončíme, ak chýbajú elementy
     }


    // Vyčistiť obsah kontajnerov (ak tam niečo bolo)
    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = ''; // Vyčistiť kontajner blokov skupín
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Vyčistiť blok jednej skupiny
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy jednej skupiny
    // if (singleGroupContent) singleGroupContent.innerHTML = ''; // Celý kontajner singleGroupContent - zbytočné čistiť, lebo čistíme vnútorné
     if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Vyčistiť tlačidlá výberu skupiny
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = ''; // Vyčistiť nadpis kategórie


    // Skryť tlačidlá späť
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    console.log("DEBUG: Back buttons hidden in displayCategoriesAsButtons.");

    // Zobraziť iba kontajner tlačidiel kategórií
    showOnly('categoryButtonsContainer');

    // Vymazať hash z URL pri návrate na zoznam kategórií
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
         console.log("DEBUG: Cleared URL hash.");
    }

    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
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

        if (categoryButtonsContainer) categoryButtonsContainer.appendChild(button);
    });
     console.log(`DEBUG: ${allCategories.length} category buttons created and appended.`);
}

// Funkcia na zobrazenie VŠETKÝCH skupín a nepriradených tímov pre vybranú kategóriu (Úroveň 2)
// Táto funkcia plní kontajnery pre Úroveň 2: categoryTitleDisplay, groupSelectionButtons, allGroupsContent
function displayGroupsForCategory(categoryId) {
    console.log(`INFO: Zobrazujem všetky skupiny pre kategóriu: ${categoryId}`);
    // Nastavenie stavu sa robí pred volaním tejto funkcie v DOMContentLoaded a goBackToGroupView
    // currentCategoryId = categoryId;
    // currentGroupId = null; // Už nezobrazujeme jednu konkrétnu skupinu

     // Kontrola existencie elementov
     if (!getHTMLElements()) {
         console.error("ERROR: displayGroupsForCategory failed due to missing HTML elements.");
         goBackToCategories(); // Vrátime sa na kategórie, ak chýbajú elementy
         return; // Ukončíme
     }
      console.log("DEBUG: Element check passed in displayGroupsForCategory.");


    // Vyčistiť obsah kontajnerov pre Úroveň 2 a 3 pred naplnením/zobrazením
    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = ''; // Kontajner Level 1 vyčistiť
    if (allGroupsContainer) allGroupsContainer.innerHTML = ''; // Vyčistiť kontajner blokov skupín
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy Level 2
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Vyčistiť blok jednej skupiny
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy Level 3
    // if (singleGroupContent) singleGroupContent.innerHTML = ''; // Celý kontajner singleGroupContent - zbytočné
     if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Vyčistiť tlačidlá výberu skupiny
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = ''; // Vyčistiť nadpis kategórie
     console.log("DEBUG: Containers cleared in displayGroupsForCategory.");


    // Zobraziť/skryť tlačidlá späť - toto sa už nastaví v showOnly alebo volajúcej funkcii
    // backToCategoriesButton.style.display = 'block';
    // backToGroupButtonsButton.style.display = 'none';
    // console.log("DEBUG: Back buttons updated for all groups view.");


    // Zobraziť iba kontajnery pre Úroveň 2 - toto sa robí vo volajúcej funkcii (DOMContentLoaded, goBackToGroupView)
    // showOnly('allGroupsContent'); // showOnly sa volá z DOMContentLoaded a goBackToGroupView, NIE priamo tu

    // Zápis do URL hash (len kategória) - toto sa robí vo volajúcej funkcii
    // window.location.hash = 'category-' + encodeURIComponent(categoryId);


    const selectedCategory = allCategories.find(cat => cat.id === categoryId);

    if (!selectedCategory) {
        // Ak sa kategória nenašla, zobrazíme chybu a vrátime sa na kategórie
         console.error(`ERROR: Category with ID ${categoryId} not found during displayGroupsForCategory.`);
         goBackToCategories(); // Vráti nás na zoznam kategórií a zobrazí chybu ak load zlyhal
        return;
    }
     console.log(`DEBUG: Category "${categoryId}" found.`);

     // Pridáme nadpis kategórie
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = selectedCategory.name || selectedCategory.id;
     console.log(`DEBUG: Category title set to "${selectedCategory.name || selectedCategory.id}".`);


    // Nájdi skupiny patriace do tejto kategórie
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);
    console.log(`DEBUG: Found ${groupsInCategory.length} groups in category "${categoryId}" for displayGroupsForCategory.`);


     // NOVÁ LOGIKA: Pridať triedu pre 5 skupín pre špeciálne rozloženie (ak je potrebná)
     if (allGroupsContainer) { // Kontrola, či element existuje
         if (groupsInCategory.length === 5) {
              allGroupsContainer.classList.add('force-3-plus-2-layout');
              console.log("DEBUG: Added force-3-plus-2-layout class.");
         } else {
              allGroupsContainer.classList.remove('force-3-plus-2-layout');
              console.log("DEBUG: Removed force-3-plus-2-layout class.");
         }
     }


    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));


    if (groupsInCategory.length === 0) {
         if (groupSelectionButtons) groupSelectionButtons.innerHTML = '<p>V kategórii nie sú skupiny na výber.</p>';
         if (allGroupsContainer) allGroupsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
          console.log("DEBUG: No groups in category, showing messages in displayGroupsForCategory.");
          // Ak nie sú skupiny, dynamickú šírku neriešime pre Level 2 (vyrieši showOnly)
    } else {
        // --- VYTVORIŤ TLAČIDLÁ PRE VÝBER SKUPINY ---
        console.log("DEBUG: Creating group selection buttons in displayGroupsForCategory...");
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
                 // showOnly('singleGroupContent'); // showOnly sa volá v displaySingleGroup
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button); // Pridať tlačidlo do kontajnera tlačidiel
        });
         if (groupSelectionButtons) console.log(`DEBUG: ${groupsInCategory.length} group selection buttons created and appended to #groupSelectionButtons. #groupSelectionButtons children count: ${groupSelectionButtons.children.length}`);
         console.log(`DEBUG: After button creation in displayGroupsForCategory. #groupSelectionButtons display: ${groupSelectionButtons ? groupSelectionButtons.style.display : 'N/A'}`);
        // --- KONIEC VYTVÁRANIA TLAČIDIEL PRE VÝBER SKUPINY ---


        // --- VYTVORIŤ BLOKY VŠETKÝCH SKUPÍN ---
        console.log("DEBUG: Creating all group display blocks in displayGroupsForCategory...");
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

            if (allGroupsContainer) allGroupsContainer.appendChild(groupDiv); // Pridať blok skupiny do kontajnera blokov
        });

        // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ BLOKOV SKUPÍN
         // Toto sa teraz volá až po showOnly, keďže showOnly nastavuje display pre kontajner
         // Funkcie findMaxTableContentWidth a setUniformTableWidth sa volajú v showOnly pre 'allGroupsContent'
         console.log("DEBUG: Finished creating all group display blocks in displayGroupsForCategory. Dynamic width will be set after showOnly.");

    }


    // Zobraziť nepriradené tímy patriace do tejto kategórie (pod blokmi skupín) v Úrovni 2
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === categoryId
    );
    console.log(`DEBUG: Found ${unassignedTeamsInCategory.length} unassigned teams in category "${categoryId}" for displayGroupsForCategory.`);


     if (unassignedTeamsInCategory.length > 0) {
         // Vyčistíme kontajner nepriradených tímov pre Level 2
         if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';

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
         // Ak nie sú nepriradené tímy, vyčistíme kontajner
          if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
           console.log("DEBUG: No unassigned teams for this category in displayGroupsForCategory.");
     }
}

// Funkcia na zobrazenie obsahu jednej konkrétnej skupiny (Úroveň 3)
// Táto funkcia plní kontajner pre Úroveň 3: singleGroupContent
function displaySingleGroup(groupId) {
     console.log(`DEBUG: Entering displaySingleGroup for group ID: ${groupId}`);
     console.log(`INFO: Zobrazujem detail skupiny: ${groupId}`);

     // Nájdeme kategóriu a skupinu
     const group = allGroups.find(g => g.id === groupId);
     if (!group) {
          console.error(`ERROR: Skupina s ID "${groupId}" sa nenašla v displaySingleGroup.`);
          // Pri chybe skryjeme aj tlačidlá späť a zobrazíme chybu
           if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
           if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
           showOnly(null); // Skryť všetko
           if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Vybraná skupina sa nenašla.</p>';
           currentCategoryId = null; // Reset stavu
           currentGroupId = null; // Reset stavu
          return;
     }
     currentCategoryId = group.categoryId; // Uložíme ID kategórie skupiny
     currentGroupId = groupId; // Nastavíme stav na zobrazenie jednej skupiny
     console.log(`DEBUG: State updated in displaySingleGroup: currentCategoryId=${currentCategoryId}, currentGroupId=${currentGroupId}`);


     // Kontrola existencie elementov
     if (!getHTMLElements()) {
         console.error("ERROR: displaySingleGroup failed due to missing HTML elements.");
         goBackToCategories(); // Vrátime sa na kategórie, ak chýbajú elementy
         return; // Ukončíme
     }
      console.log("DEBUG: Element check passed in displaySingleGroup.");


     // Zobraziť/skryť tlačidlá späť
     if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
     if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block';
     console.log("DEBUG: Back buttons visibility updated for single group view in displaySingleGroup.");


     // Zobraziť iba kontajnery pre Úroveň 3 (categoryTitleDisplay a groupSelectionButtons ostanú viditeľné) - toto sa robí vo volajúcej funkcii
     // showOnly('singleGroupContent'); // showOnly sa volá z DOMContentLoaded a displayGroupsForCategory

     // Vyčistiť obsah singleGroupContent pred naplnením
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Vyčistiť blok jednej skupiny
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy Level 3
    // Ostatné kontajnery (categoryButtonsContainer, allGroupsContent) ostávajú skryté s ich obsahom
    console.log("DEBUG: Cleared singleGroupContent elements innerHTML in displaySingleGroup.");


     // Zápis do URL hash (kategória + skupina) - toto sa robí vo volajúcej funkcii
     // window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;


     // Pridáme nadpis kategórie (už bol zobrazený v Úrovni 2, teraz len aktualizujeme text pre istotu)
      const category = allCategories.find(cat => cat.id === currentCategoryId);
      if (category && categoryTitleDisplay) {
           categoryTitleDisplay.textContent = category.name || category.id;
           console.log("DEBUG: Category title updated in displaySingleGroup.");
      }


     // Teraz pridáme obsah samotného bloku skupiny do pripraveného .group-display elementu v singleGroupContent
     console.log("DEBUG: Creating single group display block content in displaySingleGroup...");
     if (singleGroupDisplayBlock) { // Kontrola, či element existuje
         const groupTitle = document.createElement('h3');
         groupTitle.textContent = group.name || group.id;
         singleGroupDisplayBlock.appendChild(groupTitle);


         // Nájdi tímy patriace do tejto skupiny
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
              singleGroupDisplayBlock.appendChild(teamList);
         }
          console.log("DEBUG: Single group block content created in displaySingleGroup.");
     } else {
          console.error("ERROR: singleGroupDisplayBlock element not found in displaySingleGroup!");
     }


     // Zobraziť nepriradené tímy patriace do kategórie tejto skupiny (pod blokom skupiny) v Úrovni 3
     const unassignedTeamsInCategory = allTeams.filter(team =>
         (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
         team.categoryId === currentCategoryId
     );
      console.log(`DEBUG: Found ${unassignedTeamsInCategory.length} unassigned teams for single group view in category "${currentCategoryId}" in displaySingleGroup.`);


     if (unassignedTeamsInCategory.length > 0) {
         if (singleGroupUnassignedDisplay) { // Kontrola, či element existuje
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

             if (singleGroupUnassignedDisplay) { // Append unassigned teams to singleGroupUnassignedDisplay (which is inside singleGroupContent)
                  singleGroupUnassignedDisplay.appendChild(unassignedDivContent);
                  console.log("DEBUG: Unassigned teams display added to singleGroupUnassignedDisplay.");
             }

          } else {
              console.error("ERROR: singleGroupUnassignedDisplay element not found in displaySingleGroup!");
          }

     } else {
          console.log("DEBUG: No unassigned teams for this category in single group view in displaySingleGroup.");
          // Kontajner singleGroupUnassignedDisplay bol už vyčistený na začiatku funkcie
     }


     // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PRE BLOK JEDNEJ SKUPINY
      // Toto sa teraz volá až po showOnly, keďže showOnly nastavuje display pre kontajner
      // Funkcie findMaxTableContentWidth a setUniformTableWidth sa volajú v showOnly pre 'singleGroupContent'
      console.log("DEBUG: Dynamic width calculation for single group will be set after showOnly.");

}

// Funkcia na zobrazenie kategórií (návrat z pohľadu skupín v kategórii alebo jednej skupiny) (Návrat na Úroveň 1)
function goBackToCategories() {
    console.log("INFO: Návrat na zobrazenie kategórií.");
    currentCategoryId = null;
    currentGroupId = null; // Reset aj group ID stavu

     // Kontrola existencie elementov
     if (!getHTMLElements()) {
         console.error("ERROR: goBackToCategories failed due to missing HTML elements.");
         // Ak tu chýbajú elementy, nemôžeme ani zobraziť kategórie, už by to mala riešiť getHTMLElements
         return; // Ukončíme
     }


     // Vyčistiť obsah všetkých dynamických kontajnerov
     if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = '';

    console.log("DEBUG: Cleared content containers in goBackToCategories.");


    // Skryť všetky dynamické kontajnery (okrem categoryButtonsContainer, ten sa zobrazí)
     showOnly('categoryButtonsContainer');

    // Skryť tlačidlá späť
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    console.log("DEBUG: Back buttons hidden in goBackToCategories.");


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

     // Kontrola existencie elementov
     if (!getHTMLElements()) {
         console.error("ERROR: goBackToGroupView failed due to missing HTML elements.");
          goBackToCategories(); // Fallback ak chýbajú elementy
         return; // Ukončíme
     }


     // Kontrola, či máme platné ID kategórie
     if (!currentCategoryId) {
         console.error("ERROR: currentCategoryId is null on goBackToGroupView! Returning to categories.");
         goBackToCategories(); // Fallback ak state je stratený
         return;
     }

     // Vyčistiť obsah kontajnera JEDNEJ skupiny (Level 3)
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    // if (singleGroupContent) singleGroupContent.innerHTML = ''; // Vyčistiť celý singleGroupContent - zbytočné
    console.log("DEBUG: Cleared singleGroupContent elements innerHTML on back to group view.");


     // *** OPRAVA: Vždy znova naplníme obsah Level 2 pri návrate ***
     console.log(`DEBUG: Calling displayGroupsForCategory(${currentCategoryId}) again in goBackToGroupView to repopulate.`);
     displayGroupsForCategory(currentCategoryId); // Znovu naplní groupSelectionButtons a allGroupsContent


     // Zobraziť kontajnery pre Úroveň 2 (categoryTitleDisplay a groupSelectionButtons ostanú viditeľné)
     showOnly('allGroupsContent'); // Toto zobrazí allGroupsContent a ponechá categoryTitleDisplay, groupSelectionButtons
     console.log(`DEBUG: After showOnly('allGroupsContent') on back. allGroupsContent display: ${allGroupsContent ? allGroupsContent.style.display : 'N/A'}, singleGroupContent display: ${singleGroupContent ? singleGroupContent.style.display : 'N/A'}`);


     // Zobraziť/skryť tlačidlá späť
     if (backToCategoriesButton) backToCategoriesButton.style.display = 'block'; // Späť na kategórie
     if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none'; // Späť na skupiny
    console.log("DEBUG: Back buttons visibility updated on back.");


     // Hash už je nastavený na #category-... z displayGroupsForCategory, netreba meniť.

     // Dynamická šírka sa nastaví automaticky po showOnly('allGroupsContent') v rámci showOnly funkcie
}


// --- Funkcie pre dynamickú šírku tabuliek (upravené pre prijímanie kontajnera) ---
// Funkcia na zistenie maximálnej šírky potrebnej pre zobrazenie obsahu tabuliek skupín V DANEJ KONTROLE
function findMaxTableContentWidth(containerElement) {
    let maxWidth = 0;
    // Hľadáme .group-display v rámci daného kontajnera
     if (!containerElement) {
         console.log("DEBUG: findMaxTableContentWidth: containerElement is null.");
         return 0;
     }
    const groupTables = containerElement.querySelectorAll('.group-display');

     if (groupTables.length === 0) {
         console.log(`DEBUG: findMaxTableContentWidth: No .group-display elements found in containerElement (${containerElement.id || containerElement.tagName}).`);
         return 0;
     }

    console.log(`DEBUG: findMaxTableContentWidth: Measuring ${groupTables.length} group table(s) in container (${containerElement.id || containerElement.tagName}).`);

    groupTables.forEach(table => {
        const originalStyles = {
            flexBasis: table.style.flexBasis,
            width: table.style.width,
            minWidth: table.style.minWidth,
            maxWidth: table.style.maxWidth,
            flexShrink: table.style.flexShrink,
            flexGrow: table.style.flexGrow,
            display: table.style.display // Store original display
        };

        // Ensure the element is displayed before measuring if it was hidden
         let tempDisplay = originalStyles.display;
         if (tempDisplay === 'none') {
              table.style.display = 'block'; // Temporarily show if hidden
              console.log("DEBUG: findMaxTableContentWidth: Temporarily setting display to 'block' for measurement.");
         }


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
         if (tempDisplay === 'none') {
             table.style.display = originalStyles.display; // Restore original display
         }


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
         console.log(`DEBUG: No .group-display elements found in containerElement (${containerElement.id || containerElement.tagName}) for setting width.`);
         return;
     }

     console.log(`DEBUG: Setting uniform width ${width}px for ${groupTables.length} group table(s) in container (${containerElement.id || containerElement.tagName}).`);

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
}
// --- Koniec funkcií pre dynamickú šírku ---


// --- Event Listeners ---

// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín/kategórií.");

     // Získanie referencií na HTML elementy hneď na začiatku
     if (!getHTMLElements()) {
         console.error("FATAL ERROR: DOMContentLoaded failed due to missing HTML elements.");
         return; // Zastaviť ďalšie vykonávanie skriptu, ak chýbajú elementy
     }
     console.log("DEBUG: Element check passed on DOMContentLoaded.");


    await loadAllTournamentData(); // Načítať dáta ako prvé
    console.log("DEBUG: All tournament data loaded.");


    // Pridať poslucháčov udalostí na tlačidlá Späť
    if (backToCategoriesButton) backToCategoriesButton.addEventListener('click', goBackToCategories);
    if (backToGroupButtonsButton) backToGroupButtonsButton.addEventListener('click', goBackToGroupView);
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


        // Skontrolujeme, či ID kategórie z URL existuje v načítaných dátach
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            console.log(`DEBUG: Category ID from hash "${decodedCategoryId}" exists.`);

            // Ak kategória existuje, vždy najprv naplníme Level 2 obsah (tlačidlá skupín, bloky všetkých skupín)
            // Toto zabezpečí, že obsah pre návrat na Úroveň 2 bude pripravený.
            currentCategoryId = decodedCategoryId; // Nastavíme aktuálnu kategóriu pred volaním displayGroupsForCategory
            displayGroupsForCategory(decodedCategoryId); // <-- Naplní groupSelectionButtons a allGroupsContent
            console.log(`DEBUG: Called displayGroupsForCategory(${decodedCategoryId}) from DOMContentLoaded.`);


            if (decodedGroupId) {
                // Ak je v hashi aj ID skupiny
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Načítavam skupinu z URL: ${decodedGroupId} v kategórii ${decodedCategoryId}. Zobrazujem detail skupiny.`);
                      // Skupina existuje, prepneme na zobrazenie detailu Level 3
                      displaySingleGroup(decodedGroupId); // <-- Naplní singleGroupContent a nastaví state currentGroupId
                      showOnly('singleGroupContent'); // <-- Prepne zobrazenie na singleGroupContent
                      console.log(`DEBUG: Called displaySingleGroup(${decodedGroupId}) and showOnly('singleGroupContent') from DOMContentLoaded.`);

                 } else {
                      console.log(`INFO: ID skupiny z URL "${decodedGroupId}" sa nenašlo v kategórii "${decodedCategoryId}". Zobrazujem všetky skupiny pre kategóriu.`);
                      // Skupina sa nenašla, ostaneme na zobrazení všetkých skupín v kategórii (Level 2)
                      // displayGroupsForCategory už bola volaná, len zabezpečíme zobrazenie
                      showOnly('allGroupsContent'); // <-- Prepne zobrazenie na allGroupsContent
                      console.log("DEBUG: Group not found from hash, showing all groups for category (showOnly).");
                 }
            } else {
                // Ak je v hashi len ID kategórie
                console.log(`INFO: Načítavam všetky skupiny pre kategóriu z URL: ${decodedCategoryId}. Zobrazujem všetky skupiny.`);
                // displayGroupsForCategory už bola volaná, len zabezpečíme zobrazenie Level 2
                showOnly('allGroupsContent'); // <-- Prepne zobrazenie na allGroupsContent
                 console.log("DEBUG: Only category in hash, showing all groups for category (showOnly).");
            }
        } else {
            console.log(`INFO: ID kategórie z URL "${decodedCategoryId}" sa nenašlo. Zobrazujem zoznam kategórií.`);
             // Ak ID z URL neexistuje v načítaných dátach, zobraziť zoznam kategórií
            displayCategoriesAsButtons(); // <-- Zobrazí Level 1, vyčistí hash
             console.log("DEBUG: Category not found from hash, showing category buttons.");
        }
    } else { // Hash je prázdny alebo nezacina #category-
        console.log("INFO: V URL nie je hash kategórie/skupiny. Zobrazujem zoznam kategórií.");
        displayCategoriesAsButtons(); // <-- Zobrazí Level 1
        console.log("DEBUG: No valid hash, showing category buttons.");
    }

});

// Poslucháč na zmenu veľkosti okna - pre dynamickú šírku tabuliek skupín
window.addEventListener('resize', () => {
    //console.log("DEBUG: Window resized."); // Príliš častý log, odkomentovať len pri ladení

    // Kontrola existencie elementov pred prácou s nimi
    if (!getHTMLElements()) {
         console.error("ERROR: resize handler failed due to missing HTML elements.");
         return; // Ukončíme, ak chýbajú elementy
     }


    // Dynamickú šírku nastavujeme iba pri zobrazení skupín v kategórii ALEBO jednej skupiny
    if (currentCategoryId !== null) { // Sme v pohľade kategórie alebo skupiny
         let containerElement = null;
         if (currentGroupId === null) { // Sme v pohľade VŠETKÝCH skupín v kategórii (Level 2)
             containerElement = allGroupsContainer; // Cieľujeme na kontajner .groups-container
             //console.log("DEBUG: Resizing in Level 2 view. Targeting allGroupsContainer.");
         } else { // Sme v pohľade JEDNEJ skupiny (Level 3)
              containerElement = singleGroupContent; // Cieľujeme na kontajner singleGroupContent
              //console.log("DEBUG: Resizing in Level 3 view. Targeting singleGroupContent.");
         }

         // Prepočítať iba ak je relevantný kontajner viditeľný a existuje
         if (containerElement && containerElement.style.display !== 'none') {
             const uniformWidth = findMaxTableContentWidth(containerElement);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, containerElement);
                 //console.log(`DEBUG: Dynamic width set on resize for ${containerElement.id || containerElement.tagName}: ${uniformWidth}px`);
              } else {
                  //console.log(`DEBUG: Resizing, but uniformWidth is 0 or less for ${containerElement.id || containerElement.tagName}.`);
              }
          } else {
              //console.log("DEBUG: Resizing, but target container is not visible or is null.");
          }
    } else {
        //console.log("DEBUG: Resizing, but not in Level 2 or Level 3 view.");
    }
 });

 // Poslucháč na zmenu hashu v URL (napr. ak používateľ použije tlačidlá Späť/Vpred v prehliadači)
window.addEventListener('hashchange', () => {
    console.log("INFO: Hash v URL sa zmenil.");
    console.log(`DEBUG: New hash: ${window.location.hash}`);

    // Kontrola existencie elementov pred prácou s nimi
    if (!getHTMLElements()) {
         console.error("ERROR: hashchange handler failed due to missing HTML elements.");
         // Tu by sme nemali robiť fallback na kategórie, lebo getHTMLElements už loguje FATAL ERROR
         return; // Ukončíme, ak chýbajú elementy
     }


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

             // Kontrola, či už nie sme v požadovanom stave zobrazenia
             const alreadyInTargetState = (currentCategoryId === decodedCategoryId) &&
                                          (currentGroupId === decodedGroupId);

             if (alreadyInTargetState) {
                 console.log("DEBUG: Hashchange: Already in the correct state. Doing nothing.");
                 // Ak sme už v správnom stave, netreba nič robiť, len sa uistíme, že je správne zobrazený kontajner a tlačidlá Späť
                 if (currentGroupId === null) { // Ak sme v Level 2
                      showOnly('allGroupsContent');
                      if (backToCategoriesButton) backToCategoriesButton.style.display = 'block';
                      if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
                 } else { // Ak sme v Level 3
                      showOnly('singleGroupContent');
                       if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
                       if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block';
                 }
                 return; // Ukončíme spracovanie hashchange, ak sme už v cieli
             }

            // Ak nie sme v požadovanom stave, prejdeme na nové zobrazenie
            currentCategoryId = decodedCategoryId; // Nastavíme nový stav kategórie

            if (decodedGroupId) {
                // Ak je v hashi aj ID skupiny (cieľ: Úroveň 3)
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Hashchange: Zobrazujem skupinu ${decodedGroupId} v kategórii ${decodedCategoryId}.`);
                      // Cieľ: Úroveň 3. Najprv naplníme Level 2 pre prípad návratu.
                      displayGroupsForCategory(decodedCategoryId); // <-- Naplní groupSelectionButtons a allGroupsContent
                       console.log(`DEBUG: Hashchange: Called displayGroupsForCategory(${decodedCategoryId}) to ensure Level 2 content is populated.`);
                      // Potom naplníme a zobrazíme Level 3.
                      displaySingleGroup(decodedGroupId); // <-- Naplní singleGroupContent a nastaví state currentGroupId
                       showOnly('singleGroupContent'); // <-- Prepne zobrazenie
                       console.log(`DEBUG: Hashchange: Called displaySingleGroup(${decodedGroupId}) and showOnly('singleGroupContent').`);

                 } else {
                      console.log(`INFO: Hashchange: Skupina ${decodedGroupId} v kategórii ${decodedCategoryId} sa nenašla. Zobrazujem všetky skupiny pre kategóriu.`);
                      // Skupina sa nenašla, ostaneme na Úrovni 2 (všetky skupiny v kategórii)
                      displayGroupsForCategory(decodedCategoryId); // <-- Naplní groupSelectionButtons a allGroupsContent
                       showOnly('allGroupsContent'); // <-- Prepne zobrazenie
                       currentGroupId = null; // Uistíme sa, že state je Level 2
                       console.log("DEBUG: Hashchange: Group not found, showing all groups for category (showOnly).");
                 }
            } else {
                // Ak je v hashi len ID kategórie (cieľ: Úroveň 2)
                console.log(`INFO: Hashchange: Zobrazujem všetky skupiny pre kategóriu ${decodedCategoryId}.`);
                // Cieľ: Úroveň 2. Naplníme a zobrazíme Level 2.
                displayGroupsForCategory(decodedCategoryId); // <-- Naplní groupSelectionButtons a allGroupsContent
                 showOnly('allGroupsContent'); // <-- Prepne zobrazenie
                 currentGroupId = null; // Uistíme sa, že state je Level 2
                 console.log("DEBUG: Hashchange: Only category in hash, showing all groups for category (showOnly).");
            }
        } else {
            console.log(`INFO: Hashchange: Kategória ${decodedCategoryId} sa nenašla. Zobrazujem kategórie.`);
             // Kategória z hashu neexistuje, vrátime sa na Úroveň 1
             displayCategoriesAsButtons(); // <-- Zobrazí Level 1, vyčistí hash
             console.log("DEBUG: Hashchange: Category not found, showing category buttons.");
        }
    } else { // Hash je prázdny alebo nezacina #category- (cieľ: Úroveň 1)
         // Ak je hash prázdny, vrátime sa na Úroveň 1
         console.log("INFO: Hashchange: V URL nie je platný hash kategórie/skupiny. Zobrazujem zoznam kategórií.");
         displayCategoriesAsButtons(); // <-- Zobrazí Level 1, vyčistí hash
          console.log("DEBUG: Hashchange: No valid hash, showing category buttons.");
    }
});

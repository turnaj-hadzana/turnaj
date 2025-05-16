// zobrazenie-skupin.js (3 úrovne s perzistentnými tlačidlami výberu skupiny v Úrovni 2 a 3)

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
const singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null; // Len jeden blok
const singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;


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
    // Skryť všetky potenciálne kontajnery obsahu
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
    // Nadpis kategórie a tlačidlá skupín sa zobrazujú v úrovniach 2 a 3
    // if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    // if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';


    // Zobraziť požadovaný kontajner a prípadné spoločné prvky
    switch (containerIdToShow) {
        case 'categoryButtonsContainer':
            if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex'; // Tlačidlá sú flex
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
            break;
        case 'allGroupsContent':
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block'; // Nadpis je blok
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá sú flex
            if (allGroupsContent) allGroupsContent.style.display = 'block'; // Kontajner skupín je blok
            break;
        case 'singleGroupContent':
            if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block'; // Nadpis ostáva viditeľný
            if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex'; // Tlačidlá skupín ostávajú viditeľné
            if (singleGroupContent) singleGroupContent.style.display = 'block'; // Kontajner jednej skupiny je blok
            break;
        default:
             // V prípade chyby alebo neznámeho stavu skryť všetko
             if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
             if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
             if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
             if (allGroupsContent) allGroupsContent.style.display = 'none';
             if (singleGroupContent) singleGroupContent.style.display = 'none';
            break;
    }
}


// Funkcia na zobrazenie kategórií ako tlačidiel (Úroveň 1)
function displayCategoriesAsButtons() {
    console.log("INFO: Zobrazujem kategórie ako tlačidlá.");
    currentCategoryId = null;
    currentGroupId = null;

    if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent) {
        console.error("Chyba: Chýbajú HTML elementy kontajnerov.");
        // Zobrazíme chybu aj v dynamicContentArea, keďže ostatné kontajnery nemusia byť nájdené
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri inicializácii zobrazenia. Chýbajú potrebné HTML elementy.</p>';
        return;
    }

    // Vyčistiť obsah kontajnerov (ak tam niečo bolo)
    categoryButtonsContainer.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = ''; // Vyčistiť kontajner blokov skupín
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Vyčistiť blok jednej skupiny
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy jednej skupiny
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

     if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !allGroupsContainer || !allGroupsUnassignedDisplay) {
         console.error("Chyba: Chýbajú HTML elementy kontajnerov pre zobrazenie skupín.");
          if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri inicializácii zobrazenia skupín. Chýbajú potrebné HTML elementy.</p>';
         return;
     }

    // Vyčistiť obsah kontajnerov (ak tam niečo bolo)
    categoryButtonsContainer.innerHTML = '';
    if (allGroupsContainer) allGroupsContainer.innerHTML = ''; // Vyčistiť kontajner blokov skupín
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Vyčistiť blok jednej skupiny
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy jednej skupiny
     if (groupSelectionButtons) groupSelectionButtons.innerHTML = ''; // Vyčistiť tlačidlá výberu skupiny
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = ''; // Vyčistiť nadpis kategórie


    // Zobraziť/skryť tlačidlá späť
    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'none';

    // Zobraziť iba kontajnery pre Úroveň 2
    showOnly('allGroupsContent'); // Toto zobrazí categoryTitleDisplay, groupSelectionButtons, allGroupsContent

    // Zápis do URL hash (len kategória)
    window.location.hash = 'category-' + encodeURIComponent(categoryId);


    const selectedCategory = allCategories.find(cat => cat.id === categoryId);

    if (!selectedCategory) {
        // Ak sa kategória nenašla, skryjeme aj tlačidlá späť a zobrazíme chybu
        backToCategoriesButton.style.display = 'none';
        backToGroupButtonsButton.style.display = 'none';
        showOnly(null); // Skryť všetko
        dynamicContentArea.innerHTML = '<p>Vybraná kategória sa nenašla.</p>';
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
                 displaySingleGroup(groupIdToDisplay); // Prejsť na zobrazenie JEDNEJ skupiny
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button); // Pridať tlačidlo do kontajnera tlačidiel
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

            if (allGroupsContainer) allGroupsContainer.appendChild(groupDiv); // Pridať blok skupiny do kontajnera blokov
        });

        // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ BLOKOV SKUPÍN
         // Teraz voláme funkciu pre všetky .group-display v rámci allGroupsContainer
        if (allGroupsContainer) {
            const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
            if (uniformWidth > 0) {
               setUniformTableWidth(uniformWidth, allGroupsContainer);
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
              allGroupsUnassignedDisplay.appendChild(unassignedDivContent); // Pridáme celý obsah do pripraveného kontajnera
         }

     } else {
         // Ak nie sú nepriradené tímy, vyčistíme kontajner, keby tam niečo ostalo z predošlého zobrazenia
          if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
     }
}

// Funkcia na zobrazenie obsahu jednej konkrétnej skupiny (Úroveň 3)
function displaySingleGroup(groupId) {
     console.log(`INFO: Zobrazujem detail skupiny: ${groupId}`);

     // Nájdeme kategóriu a skupinu
     const group = allGroups.find(g => g.id === groupId);
     if (!group) {
          console.error(`Chyba: Skupina s ID "${groupId}" sa nenašla.`);
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

     if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !singleGroupDisplayBlock || !singleGroupUnassignedDisplay) {
         console.error("Chyba: Chýbajú HTML elementy kontajnerov pre zobrazenie jednej skupiny.");
         // Zobrazíme chybu
          if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri inicializácii zobrazenia detailu skupiny. Chýbajú potrebné HTML elementy.</p>';
         return;
     }

     // Zobraziť/skryť tlačidlá späť
     backToCategoriesButton.style.display = 'none';
     backToGroupButtonsButton.style.display = 'block';

     // Zobraziť iba kontajnery pre Úroveň 3 (categoryTitleDisplay a groupSelectionButtons ostanú viditeľné)
     showOnly('singleGroupContent'); // Toto zobrazí singleGroupContent a ponechá categoryTitleDisplay, groupSelectionButtons

     // Vyčistiť obsah kontajnerov
     if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = ''; // Vyčistiť blok jednej skupiny
     if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = ''; // Vyčistiť nepriradené tímy jednej skupiny
     // Ostatné kontajnery (categoryButtonsContainer, allGroupsContent) ostávajú skryté s ich obsahom


     // Zápis do URL hash (kategória + skupina)
     window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;

     // Pridáme nadpis kategórie (už bol zobrazený v Úrovni 2, teraz len aktualizujeme text pre istotu)
      const category = allCategories.find(cat => cat.id === currentCategoryId);
      if (category && categoryTitleDisplay) {
           categoryTitleDisplay.textContent = category.name || category.id;
      }


     // Teraz pridáme obsah samotného bloku skupiny do pripraveného .group-display elementu v singleGroupContent
     if (singleGroupDisplayBlock) {
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
     }


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
              unassignedList.appendChild(teamList);
         });
         unassignedDivContent.appendChild(unassignedList);

         if (singleGroupUnassignedDisplay) {
              singleGroupUnassignedDisplay.appendChild(unassignedDivContent); // Pridáme celý obsah do pripraveného kontajnera
         }

     } else {
         // Ak nie sú nepriradené tímy, vyčistíme kontajner
          if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
     }


     // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PRE BLOK JEDNEJ SKUPINY
      // findMaxTableContentWidth a setUniformTableWidth potrebujú kontajner,
      // v ktorom hľadať .group-display. Teraz je to singleGroupContent
      if (singleGroupContent) {
         const uniformWidth = findMaxTableContentWidth(singleGroupContent);
         if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, singleGroupContent);
         }
      }
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
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';
     if (categoryTitleDisplay) categoryTitleDisplay.textContent = '';


    // Skryť všetky dynamické kontajnery (okrem categoryButtonsContainer, ten sa zobrazí)
     showOnly('categoryButtonsContainer');

    // Skryť tlačidlá späť
    backToCategoriesButton.style.display = 'none';
    backToGroupButtonsButton.style.display = 'none';

    // Vymazať hash
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }

    // Znova vygenerovať tlačidlá kategórií
     displayCategoriesAsButtons(); // Táto funkcia už naplní categoryButtonsContainer a nastaví jeho display

}

// Funkcia na návrat na zobrazenie VŠETKÝCH skupín ako blokov pre aktuálnu kategóriu (Návrat na Úroveň 2)
function goBackToGroupView() {
     console.log(`INFO: Návrat na zobrazenie všetkých skupín pre kategóriu: ${currentCategoryId}`);
     currentGroupId = null; // Už nezobrazujeme jednu skupinu

     if (!categoryButtonsContainer || !backToCategoriesButton || !backToGroupButtonsButton || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !allGroupsContainer || !allGroupsUnassignedDisplay) {
         console.error("Chyba: Chýbajú HTML elementy kontajnerov pri návrate na zobrazenie skupín.");
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>Chyba pri návrate na zobrazenie skupín. Chýbajú potrebné HTML elementy.</p>';
         return;
     }


     // Vyčistiť obsah kontajnera JEDNEJ skupiny
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';


     // Zobraziť kontajnery pre Úroveň 2 (categoryTitleDisplay a groupSelectionButtons ostanú viditeľné)
     showOnly('allGroupsContent'); // Toto zobrazí allGroupsContent a ponechá categoryTitleDisplay, groupSelectionButtons


     // Zobraziť/skryť tlačidlá späť
     backToCategoriesButton.style.display = 'block'; // Späť na kategórie
     backToGroupButtonsButton.style.display = 'none'; // Späť na skupiny


     // Hash už je nastavený na #category-... z displayGroupsForCategory

     // V tomto pohľade už sú bloky skupín aj tlačidlá výberu skupín naplnené z displayGroupsForCategory,
     // stačí správne nastaviť viditeľnosť kontajnerov.
     // Treba len znova zavolať funkciu na nastavenie šírky, ak sa zmenila veľkosť okna
     if (allGroupsContainer) {
         const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
         if (uniformWidth > 0) {
            setUniformTableWidth(uniformWidth, allGroupsContainer);
         }
     }

     // Ak z nejakého dôvodu nemáme ID kategórie pri návrate, vrátime sa úplne na začiatok
     if (!currentCategoryId) {
         goBackToCategories();
     }
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

     // Kontrola, či sú nájdené všetky potrebné HTML elementy
     if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton || !categoryButtonsContainer || !categoryTitleDisplay || !groupSelectionButtons || !allGroupsContent || !singleGroupContent || !allGroupsContainer || !allGroupsUnassignedDisplay || !singleGroupDisplayBlock || !singleGroupUnassignedDisplay) {
         console.error("FATAL ERROR: Chýbajú niektoré základné HTML elementy kontajnerov. Skontrolujte prosím zobrazenie-skupin.html.");
          if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>FATAL ERROR: Chyba pri inicializácii aplikácie. Chýbajú potrebné HTML elementy. Skontrolujte konzolu pre detaily.</p>';
         // Skryť tlačidlá späť pre prípad chyby
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
         showOnly(null); // Skryť všetky kontajnery pre istotu
         return; // Zastaviť ďalšie vykonávanie skriptu
     }


    await loadAllTournamentData(); // Načítať dáta ako prvé

    // Pridať poslucháčov udalostí na tlačidlá Späť
    backToCategoriesButton.addEventListener('click', goBackToCategories);
    backToGroupButtonsButton.addEventListener('click', goBackToGroupView);


    // Skontrolovať hash v URL a podľa toho zobraziť obsah
    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-'; // Prefix pre skupinu v rámci kategórie

    if (hash && hash.startsWith(categoryPrefix)) {
        const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
        const urlCategoryId = hashParts[0];
        const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;

        // *** DEKÓDOVAŤ URL KOMPONENTY PRED POUŽITÍM ***
        const decodedCategoryId = decodeURIComponent(urlCategoryId);
        const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;


        // Skontrolujeme, či ID kategórie z URL existuje
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            if (decodedGroupId) {
                // Ak je v hashi aj ID skupiny
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Načítavam skupinu z URL: ${decodedGroupId} v kategórii ${decodedCategoryId}`);
                      // Naplníme dáta pre Úroveň 2 a potom hneď prejdeme na Úroveň 3
                      // Aby sa pri návrate na Úroveň 2 (cez Späť na skupiny) už nemuseli dáta znova generovať
                      displayGroupsForCategory(decodedCategoryId); // Naplní aj groupSelectionButtons a allGroupsContent
                      displaySingleGroup(decodedGroupId); // Prepne zobrazenie na singleGroupContent
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
    // Dynamickú šírku nastavujeme iba pri zobrazení skupín v kategórii ALEBO jednej skupiny
    if (currentCategoryId !== null) { // Sme v pohľade kategórie alebo skupiny
         let containerElement = null;
         if (currentGroupId === null) { // Sme v pohľade VŠETKÝCH skupín v kategórii
             containerElement = allGroupsContainer; // Cieľujeme na kontajner .groups-container
         } else { // Sme v pohľade JEDNEJ skupiny
              containerElement = singleGroupContent; // Cieľujeme na kontajner singleGroupContent (obsahuje len 1 .group-display)
         }

         if (containerElement) {
             const uniformWidth = findMaxTableContentWidth(containerElement);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, containerElement);
              }
          }
    }
 });

 // Poslucháč na zmenu hashu v URL (napr. ak používateľ použije tlačidlá Späť/Vpred v prehliadači)
window.addEventListener('hashchange', () => {
    console.log("INFO: Hash v URL sa zmenil.");

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


        // Skontrolujeme, či ID kategórie z URL existuje (z aktuálne načítaných dát)
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);

        if (categoryExists) {
            if (decodedGroupId) {
                // Ak je v hashi aj ID skupiny
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Hashchange: Zobrazujem skupinu ${decodedGroupId}`);
                      // Pre hashchange ideme priamo na zobrazenie danej skupiny,
                      // ale aby fungoval návrat na skupiny, musíme najprv naplniť Úroveň 2 kontajner
                      displayGroupsForCategory(decodedCategoryId); // Naplní groupSelectionButtons a allGroupsContent
                      displaySingleGroup(decodedGroupId); // Prepne zobrazenie na singleGroupContent
                 } else {
                      console.log(`INFO: Hashchange: Skupina ${decodedGroupId} v kategórii ${decodedCategoryId} sa nenašla. Zobrazujem všetky skupiny pre kategóriu.`);
                      displayGroupsForCategory(decodedCategoryId); // Zobraziť všetky skupiny pre kategóriu
                 }
            } else {
                // Ak je v hashi len ID kategórie
                console.log(`INFO: Hashchange: Zobrazujem všetky skupiny pre kategóriu ${decodedCategoryId}`);
                displayGroupsForCategory(decodedCategoryId);
            }
        } else {
            console.log(`INFO: Hashchange: Kategória ${decodedCategoryId} sa nenašla. Zobrazujem kategórie.`);
             displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
        }
    } else {
        console.log("INFO: Hashchange: V URL nie je platný hash kategórie/skupiny. Zobrazujem zoznam kategórií.");
        displayCategoriesAsButtons(); // displayCategoriesAsButtons už vyčistí hash
    }
});

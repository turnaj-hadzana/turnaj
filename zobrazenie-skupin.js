// zobrazenie-skupin.js (3 úrovne s tlačidlami výberu skupiny nad blokmi skupín)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencií na elementy
const dynamicContentArea = document.getElementById('dynamicContentArea'); // Hlavný dynamický kontajner
const backToCategoriesButton = document.getElementById('backToCategoriesButton'); // Tlačidlo Späť na kategórie
const backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton'); // Tlačidlo Späť na skupiny


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
        if (dynamicContentArea) {
             dynamicContentArea.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
         // Skryť tlačidlá späť pri chybe
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}

// Funkcia na zobrazenie kategórií ako tlačidiel (Úroveň 1)
function displayCategoriesAsButtons() {
    console.log("INFO: Zobrazujem kategórie ako tlačidlá.");
    currentCategoryId = null;
    currentGroupId = null;

    if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton) {
        console.error("Chyba: Chýbajú základné HTML elementy.");
        return;
    }

    dynamicContentArea.innerHTML = ''; // Vyčistiť oblasť obsahu

    // Skryť tlačidlá späť
    backToCategoriesButton.style.display = 'none';
    backToGroupButtonsButton.style.display = 'none';

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
    currentGroupId = null; // Už nezobrazujeme jednu konkrétnu skupinu

     if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton) {
         console.error("Chyba: Chýbajú základné HTML elementy.");
         return;
     }

    dynamicContentArea.innerHTML = ''; // Vyčistiť oblasť obsahu

    // Zobraziť tlačidlo späť na kategórie
    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'none'; // Skryť tlačidlo späť na skupiny

    // Zápis do URL hash (len kategória)
    window.location.hash = 'category-' + encodeURIComponent(categoryId);


    const selectedCategory = allCategories.find(cat => cat.id === categoryId);

    if (!selectedCategory) {
        dynamicContentArea.innerHTML = '<p>Vybraná kategória sa nenašla.</p>';
         // Aj keď sa kategória nenašla, skryjeme tlačidlá späť
        backToCategoriesButton.style.display = 'none';
        backToGroupButtonsButton.style.display = 'none';
        return;
    }

     // Pridáme nadpis kategórie
     const categoryTitle = document.createElement('h2');
     categoryTitle.textContent = selectedCategory.name || selectedCategory.id;
     dynamicContentArea.appendChild(categoryTitle);


    // Nájdi skupiny patriace do tejto kategórie
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

    // --- PRIDAŤ KONTAJNER TLAČIDIEL PRE SKUPINY ---
    const groupSelectionButtonsContainer = document.createElement('div');
    groupSelectionButtonsContainer.id = 'groupSelectionButtons';
    groupSelectionButtonsContainer.style.display = 'flex'; // Zabezpečiť flex zobrazenie

    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));

    if (groupsInCategory.length === 0) {
        // Ak nie sú skupiny, nezobrazujeme kontajner tlačidiel, ale pridáme správu nižšie
        // groupSelectionButtonsContainer.innerHTML = '<p>V kategórii nie sú skupiny na výber.</p>';
    } else {
        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button'); // Používame spoločný štýl
            button.textContent = group.name || group.id; // Názov skupiny ako text tlačidla
            button.dataset.groupId = group.id; // Uložíme ID skupiny
            button.dataset.categoryId = categoryId; // Uložíme aj ID kategórie pre návrat

            // Poslucháč udalosti pre tlačidlo skupiny
            button.addEventListener('click', () => {
                 const groupIdToDisplay = button.dataset.groupId;
                 displaySingleGroup(groupIdToDisplay); // Prejsť na zobrazenie JEDNEJ skupiny
            });
            groupSelectionButtonsContainer.appendChild(button); // Pridať tlačidlo do kontajnera tlačidiel
        });
         // Ak sú skupiny, pridáme kontajner tlačidiel do dynamicContentArea
         dynamicContentArea.appendChild(groupSelectionButtonsContainer);
    }
    // --- KONIEC PRIDANIA KONTAJNERA TLAČIDIEL PRE SKUPINY ---


     // Vytvoríme kontajner pre usporiadanie skupín vedľa seba (pre bloky skupín)
     const groupsContainerDiv = document.createElement('div');
     groupsContainerDiv.classList.add('groups-container'); // Používame štýl pre flex kontajner


     // NOVÁ LOGIKA: Pridať triedu pre 5 skupín pre špeciálne rozloženie (ak je potrebná)
     if (groupsInCategory.length === 5) {
         groupsContainerDiv.classList.add('force-3-plus-2-layout');
     } else {
         groupsContainerDiv.classList.remove('force-3-plus-2-layout');
     }

     dynamicContentArea.appendChild(groupsContainerDiv); // Pridáme kontajner blokov do dynamickej oblasti


    if (groupsInCategory.length === 0) {
         groupsContainerDiv.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
          // Ak nie sú skupiny, dynamickú šírku neriešime
    } else {
        // Iterujeme cez skupiny OPÄŤ, tentoraz na vytvorenie ich blokov na zobrazenie
        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display'); // Používame existujúci štýl pre blok skupiny

            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);

            // V zobrazení všetkých skupín už NEPRIDÁVAME tlačidlo skupiny do bloku
            // Tlačidlo je teraz v groupSelectionButtonsContainer hore.


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
                    const orderB = b.orderB || Infinity; // Opravená chyba: malo byť b.orderInGroup
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

            groupsContainerDiv.appendChild(groupDiv); // Pridáme blok skupiny do kontajnera blokov
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
         unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
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

// Funkcia na zobrazenie obsahu jednej konkrétnej skupiny (Úroveň 3)
function displaySingleGroup(groupId) {
     console.log(`INFO: Zobrazujem detail skupiny: ${groupId}`);

     // Nájdeme kategóriu, do ktorej skupina patrí
     const group = allGroups.find(g => g.id === groupId);
     if (!group) {
          console.error(`Chyba: Skupina s ID "${groupId}" sa nenašla.`);
          dynamicContentArea.innerHTML = '<p>Vybraná skupina sa nenašla.</p>';
           backToCategoriesButton.style.display = 'none';
           backToGroupButtonsButton.style.display = 'none';
           currentCategoryId = null;
           currentGroupId = null;
          return;
     }
     currentCategoryId = group.categoryId; // Uložíme ID kategórie skupiny
     currentGroupId = groupId; // Nastavíme stav na zobrazenie jednej skupiny

     if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton) {
         console.error("Chyba: Chýbajú základné HTML elementy.");
         return;
     }

     dynamicContentArea.innerHTML = ''; // Vyčistiť oblasť obsahu

     // Zobraziť tlačidlo späť na skupiny
     backToCategoriesButton.style.display = 'none'; // Skryť tlačidlo späť na kategórie
     backToGroupButtonsButton.style.display = 'block';

     // Zápis do URL hash (kategória + skupina)
     window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;

     // Pridáme nadpis kategórie
     const category = allCategories.find(cat => cat.id === currentCategoryId);
     if (category) {
          const categoryTitle = document.createElement('h2');
          categoryTitle.textContent = category.name || category.id;
          dynamicContentArea.appendChild(categoryTitle);
     }


     // Teraz pridáme samotný blok skupiny (použijeme existujúce .group-display štýly)
     // Vytvoríme dočasný kontajner len pre tento jeden blok, aby width funkcie fungovali
     const singleGroupContainerDiv = document.createElement('div');
     dynamicContentArea.appendChild(singleGroupContainerDiv); // Pridáme ho do dynamickej oblasti


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
               const orderB = b.orderInGroup || Infinity; // Opravená chyba
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

     singleGroupContainerDiv.appendChild(groupDiv); // Pridáme blok skupiny do dočasného kontajnera


     // Zobraziť nepriradené tímy patriace do kategórie tejto skupiny (pod blokom skupiny)
     const unassignedTeamsInCategory = allTeams.filter(team =>
         (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
         team.categoryId === currentCategoryId
     );

     if (unassignedTeamsInCategory.length > 0) {
         const unassignedDiv = document.createElement('div');
         unassignedDiv.classList.add('unassigned-teams-display');

         const unassignedTitle = document.createElement('h2');
         unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
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
         singleGroupContainerDiv.appendChild(unassignedDiv); // Pridáme nepriradené tímy pod blok skupiny
     }


     // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ BLOKU JEDNEJ SKUPINY
      // findMaxTableContentWidth a setUniformTableWidth potrebujú kontajner,
      // v ktorom hľadať .group-display. Teraz je to singleGroupContainerDiv
      const uniformWidth = findMaxTableContentWidth(singleGroupContainerDiv);
      if (uniformWidth > 0) {
         setUniformTableWidth(uniformWidth, singleGroupContainerDiv);
      }
}

// Funkcia na zobrazenie kategórií (návrat z pohľadu skupín v kategórii) (Návrat na Úroveň 1)
function goBackToCategories() {
    console.log("INFO: Návrat na zobrazenie kategórií.");
    currentCategoryId = null;
    currentGroupId = null; // Reset aj group ID stavu
    displayCategoriesAsButtons(); // Zobraziť znova tlačidlá kategórií (to už vyčistí hash)
}

// Funkcia na návrat na zobrazenie VŠETKÝCH skupín ako blokov pre aktuálnu kategóriu (Návrat na Úroveň 2)
function goBackToGroupView() {
     console.log(`INFO: Návrat na zobrazenie všetkých skupín pre kategóriu: ${currentCategoryId}`);
     currentGroupId = null; // Už nezobrazujeme jednu skupinu
     if (currentCategoryId) {
         displayGroupsForCategory(currentCategoryId); // Zobraziť všetky skupiny pre aktuálnu kategóriu
     } else {
         // Ak z nejakého dôvodu nemáme ID kategórie, vrátime sa úplne na začiatok
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
    await loadAllTournamentData(); // Načítať dáta ako prvé

    // Pridať poslucháčov udalostí na tlačidlá Späť
    if (backToCategoriesButton) {
        backToCategoriesButton.addEventListener('click', goBackToCategories);
    } else {
        console.error("Tlačidlo Späť na kategórie sa nenašlo!");
    }
     if (backToGroupButtonsButton) {
         backToGroupButtonsButton.addEventListener('click', goBackToGroupView); // Voláme goBackToGroupView
     } else {
         console.error("Tlačidlo Späť na skupiny sa nenašlo!");
     }


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
                      displaySingleGroup(decodedGroupId); // Zobraziť konkrétnu skupinu
                 } else {
                      console.log(`INFO: ID skupiny z URL "${decodedGroupId}" sa nenašlo v kategórii "${decodedCategoryId}". Zobrazujem všetky skupiny pre kategóriu.`);
                      // Skupina sa nenašla, zobraziť len všetky skupiny kategórie
                      displayGroupsForCategory(decodedCategoryId);
                 }
            } else {
                // Ak je v hashi len ID kategórie
                console.log(`INFO: Načítavam všetky skupiny pre kategóriu z URL: ${decodedCategoryId}`);
                displayGroupsForCategory(decodedCategoryId); // Zobraziť všetky skupiny pre kategóriu
            }
        } else {
            console.log(`INFO: ID kategórie z URL "${decodedCategoryId}" sa nenašlo. Zobrazujem zoznam kategórií.`);
             // Ak ID z URL neexistuje, zobraziť zoznam kategórií a vyčistiť chybný hash
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
             containerElement = dynamicContentArea.querySelector('.groups-container');
         } else { // Sme v pohľade JEDNEJ skupiny
             // Hľadáme kontajner okolo jedného .group-display
              // V displaySingleGroup sme vytvorili dočasný kontajner, hľadáme jeho rodiča
              const singleGroupDisplayDiv = dynamicContentArea.querySelector('.group-display');
              if (singleGroupDisplayDiv) {
                  containerElement = singleGroupDisplayDiv.parentElement;
              }
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
                      displaySingleGroup(decodedGroupId);
                 } else {
                      console.log(`INFO: Hashchange: Skupina ${decodedGroupId} v kategórii ${decodedCategoryId} sa nenašla. Zobrazujem všetky skupiny pre kategóriu.`);
                      displayGroupsForCategory(decodedCategoryId);
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

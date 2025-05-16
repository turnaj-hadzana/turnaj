// zobrazenie-skupin.js (Rozšírené o zobrazenie skupín ako tlačidiel a zobrazenie jednej skupiny)

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
let currentGroupId = null;   // null: zobrazenie kategórií/skupín ako tlačidiel; ID: zobrazenie jednej skupiny

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
         // Doplníme categoryId do skupiny, ak chýba (z dôvodu prechodných stavov v DB alebo starej logiky)
         allGroups = allGroups.map(group => {
              if (!group.categoryId) {
                 const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                 if (categoryFromId) {
                      group.categoryId = categoryFromId.id;
                 }
              }
              return group;
         }).filter(group => group.categoryId); // Filter pre istotu, ak sa nepodarilo priradiť kategóriu

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
        return;
    }

    const categoryButtonsContainer = document.createElement('div');
    categoryButtonsContainer.id = 'categoryButtonsContainer';

    allCategories.forEach(category => {
        const button = document.createElement('button');
        button.classList.add('display-button'); // Používame spoločný štýl
        button.textContent = category.name || category.id;
        button.dataset.categoryId = category.id;

        // Pridáme poslucháča udalosti kliknutia na tlačidlo kategórie
        button.addEventListener('click', () => {
            const categoryId = button.dataset.categoryId;
            displayGroupButtonsForCategory(categoryId); // Prejsť na zobrazenie tlačidiel skupín
        });

        categoryButtonsContainer.appendChild(button);
    });

    dynamicContentArea.appendChild(categoryButtonsContainer);
}

// Funkcia na zobrazenie skupín ako tlačidiel pre vybranú kategóriu (Úroveň 2)
function displayGroupButtonsForCategory(categoryId) {
    console.log(`INFO: Zobrazujem skupiny ako tlačidlá pre kategóriu: ${categoryId}`);
    currentCategoryId = categoryId;
    currentGroupId = null;

     if (!dynamicContentArea || !backToCategoriesButton || !backToGroupButtonsButton) {
         console.error("Chyba: Chýbajú základné HTML elementy.");
         return;
     }

    dynamicContentArea.innerHTML = ''; // Vyčistiť oblasť obsahu

    // Zobraziť tlačidlo späť na kategórie
    backToCategoriesButton.style.display = 'block';
    backToGroupButtonsButton.style.display = 'none'; // Skryť tlačidlo späť na skupiny

    // Zápis do URL hash (len kategória)
    window.location.hash = 'category-' + categoryId;


    const selectedCategory = allCategories.find(cat => cat.id === categoryId);

    if (!selectedCategory) {
        dynamicContentArea.innerHTML = '<p>Vybraná kategória sa nenašla.</p>';
         // Aj keď sa kategória nenašla, skryjeme obe tlačidlá späť
        backToCategoriesButton.style.display = 'none';
        backToGroupButtonsButton.style.display = 'none';
        return;
    }

     // Pridáme nadpis kategórie
     const categoryTitle = document.createElement('h2');
     categoryTitle.textContent = selectedCategory.name || selectedCategory.id;
     dynamicContentArea.appendChild(categoryTitle);

    const groupButtonsContainer = document.createElement('div');
    groupButtonsContainer.id = 'groupButtonsContainer';


    // Nájdi skupiny patriace do tejto kategórie
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);

    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));


    if (groupsInCategory.length === 0) {
         groupButtonsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
    } else {

        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button'); // Používame spoločný štýl
            button.textContent = group.name || group.id;
            button.dataset.groupId = group.id; // Uložíme ID skupiny do data atribútu
            button.dataset.categoryId = categoryId; // Uložíme aj ID kategórie pre ľahšiu navigáciu späť

            // Pridáme poslucháča udalosti kliknutia na tlačidlo skupiny
            button.addEventListener('click', () => {
                const groupId = button.dataset.groupId;
                displaySingleGroup(groupId); // Prejsť na zobrazenie jednej skupiny
            });

            groupButtonsContainer.appendChild(button);
        });
    }

    dynamicContentArea.appendChild(groupButtonsContainer);

    // V tomto pohľade dynamickú šírku neriešime (len pre zobrazenie jednej skupiny)
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
     window.location.hash = `category-${currentCategoryId}/group-${groupId}`;

     // Pridáme nadpis kategórie
     const category = allCategories.find(cat => cat.id === currentCategoryId);
     if (category) {
          const categoryTitle = document.createElement('h2');
          categoryTitle.textContent = category.name || category.id;
          dynamicContentArea.appendChild(categoryTitle);
     }


     // Vytvoríme kontajner pre zobrazenie jednej skupiny
     const singleGroupDisplayDiv = document.createElement('div');
     singleGroupDisplayDiv.id = 'singleGroupDisplay';
     dynamicContentArea.appendChild(singleGroupDisplayDiv); // Pridáme ho do dynamickej oblasti


     // Teraz pridáme samotný blok skupiny (použijeme existujúce .group-display štýly)
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

     singleGroupDisplayDiv.appendChild(groupDiv); // Pridáme blok skupiny do kontajnera singleGroupDisplay


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
         singleGroupDisplayDiv.appendChild(unassignedDiv); // Pridáme nepriradené tímy pod blok skupiny
     }


     // VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ BLOKU JEDNEJ SKUPINY
      // findMaxTableContentWidth a setUniformTableWidth potrebujú kontajner,
      // v ktorom hľadať .group-display. Teraz je to #singleGroupDisplay.
      const uniformWidth = findMaxTableContentWidth(singleGroupDisplayDiv);
      if (uniformWidth > 0) {
         setUniformTableWidth(uniformWidth, singleGroupDisplayDiv);
      }
}

// Funkcia na zobrazenie kategórií (návrat z pohľadu skupín ako tlačidiel) (Návrat na Úroveň 1)
function goBackToCategories() {
    console.log("INFO: Návrat na zobrazenie kategórií.");
    currentCategoryId = null;
    currentGroupId = null;
    displayCategoriesAsButtons(); // Zobraziť znova tlačidlá kategórií
}

// Funkcia na návrat na zobrazenie skupín ako tlačidiel pre aktuálnu kategóriu (Návrat na Úroveň 2)
function goBackToGroupButtons() {
     console.log(`INFO: Návrat na zobrazenie tlačidiel skupín pre kategóriu: ${currentCategoryId}`);
     currentGroupId = null; // Už nezobrazujeme jednu skupinu
     if (currentCategoryId) {
         displayGroupButtonsForCategory(currentCategoryId); // Zobraziť tlačidlá skupín pre aktuálnu kategóriu
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
         backToGroupButtonsButton.addEventListener('click', goBackToGroupButtons);
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

        // Skontrolujeme, či ID kategórie z URL existuje
        const categoryExists = allCategories.some(cat => cat.id === urlCategoryId);

        if (categoryExists) {
            if (urlGroupId) {
                // Ak je v hashi aj ID skupiny
                 const groupExists = allGroups.some(group => group.id === urlGroupId && group.categoryId === urlCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Načítavam skupinu z URL: ${urlGroupId} v kategórii ${urlCategoryId}`);
                      displaySingleGroup(urlGroupId); // Zobraziť konkrétnu skupinu
                 } else {
                      console.log(`INFO: ID skupiny z URL "${urlGroupId}" sa nenašlo v kategórii "${urlCategoryId}". Zobrazujem tlačidlá skupín pre kategóriu.`);
                      displayGroupButtonsForCategory(urlCategoryId); // Skupina sa nenašla, zobraziť len tlačidlá skupín kategórie
                 }
            } else {
                // Ak je v hashi len ID kategórie
                console.log(`INFO: Načítavam kategóriu z URL: ${urlCategoryId}`);
                displayGroupButtonsForCategory(urlCategoryId); // Zobraziť tlačidlá skupín pre kategóriu
            }
        } else {
            console.log(`INFO: ID kategórie z URL "${urlCategoryId}" sa nenašlo. Zobrazujem zoznam kategórií.`);
             // Ak ID z URL neexistuje, zobraziť zoznam kategórií a vyčistiť chybný hash
            displayCategoriesAsButtons();
        }
    } else {
        console.log("INFO: V URL nie je hash kategórie/skupiny. Zobrazujem zoznam kategórií.");
        displayCategoriesAsButtons(); // Zobraziť zoznam kategórií, ak v URL nie je hash
    }

});

// Poslucháč na zmenu veľkosti okna - pre dynamickú šírku tabuliek skupín
window.addEventListener('resize', () => {
    // Dynamickú šírku nastavujeme iba pri zobrazení JEDNEJ skupiny
    if (currentGroupId !== null) {
         const singleGroupDisplayDiv = document.getElementById('singleGroupDisplay');
          if (singleGroupDisplayDiv) {
             const uniformWidth = findMaxTableContentWidth(singleGroupDisplayDiv);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, singleGroupDisplayDiv);
              }
          }
    }
 });

 // Poslucháč na zmenu hashu v URL (napr. ak používateľ použije tlačidlá Späť/Vpred v prehliadači)
window.addEventListener('hashchange', () => {
    // Po zmene hashu jednoducho znovu zavoláme inicializačnú logiku
    // (asynchrónne, aby sme sa vyhli rekurzii alebo problémom s načítaním dát,
    // hoci loadAllTournamentData už máme načítané, pre istotu by sa dala preskočiť)
    // Pre zjednodušenie len zopakujeme logiku z DOMContentLoaded
    console.log("INFO: Hash v URL sa zmenil.");

    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';

    // Skontrolovať, či už máme načítané dáta. Ak nie, musíme ich najprv načítať.
    // Predpokladáme, že v tomto bode sú už dáta načítané z DOMContentLoaded.
    // Ak by neboli (napr. ak sa hash zmení veľmi rýchlo po načítaní stránky),
    // bolo by potrebné logiku načítania dát zopakovať alebo zabezpečiť ich načítanie.
    // Pre jednoduchosť teraz predpokladáme, že allCategories a allGroups sú už plné.

     if (hash && hash.startsWith(categoryPrefix)) {
        const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
        const urlCategoryId = hashParts[0];
        const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;

        // Skontrolujeme, či ID kategórie z URL existuje (z aktuálne načítaných dát)
        const categoryExists = allCategories.some(cat => cat.id === urlCategoryId);

        if (categoryExists) {
            if (urlGroupId) {
                // Ak je v hashi aj ID skupiny
                 const groupExists = allGroups.some(group => group.id === urlGroupId && group.categoryId === urlCategoryId);
                 if (groupExists) {
                      console.log(`INFO: Hashchange: Zobrazujem skupinu ${urlGroupId}`);
                      displaySingleGroup(urlGroupId);
                 } else {
                      console.log(`INFO: Hashchange: Skupina ${urlGroupId} v kategórii ${urlCategoryId} sa nenašla. Zobrazujem skupiny kategórie.`);
                      displayGroupButtonsForCategory(urlCategoryId);
                 }
            } else {
                // Ak je v hashi len ID kategórie
                console.log(`INFO: Hashchange: Zobrazujem skupiny pre kategóriu ${urlCategoryId}`);
                displayGroupButtonsForCategory(urlCategoryId);
            }
        } else {
            console.log(`INFO: Hashchange: Kategória ${urlCategoryId} sa nenašla. Zobrazujem kategórie.`);
             displayCategoriesAsButtons(); // Ak ID z URL neexistuje, zobraziť zoznam kategórií
        }
    } else {
        console.log("INFO: Hashchange: V URL nie je platný hash. Zobrazujem zoznam kategórií.");
        displayCategoriesAsButtons(); // Zobraziť zoznam kategórií, ak v URL nie je hash
    }
});

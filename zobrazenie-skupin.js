// zobrazenie-skupin.js

// Importujte spoločné funkcie a referencie z common.js
// Zabezpečte, že spravca-turnaja-common.js exportuje tieto položky:
// db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, getDocs, query, where, orderBy
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where, orderBy } from './spravca-turnaja-common.js';

// Získajte referenciu na element, kam sa bude vkladať obsah
const dataDisplayArea = document.getElementById('dataDisplayArea');

// Globálne polia na uloženie načítaných dát (podobne ako v zoznam-timov.js)
let allCategories = [];
let allGroups = [];
let allClubs = [];


// --- Funkcie na načítanie dát (podobné ako v zoznam-timov.js) ---

// Funkcia na načítanie všetkých kategórií
async function loadAllCategories() {
     console.log("Načítavam všetky kategórie...");
     try {
         // Načítať všetky dokumenty z kolekcie kategórií
         const querySnapshot = await getDocs(query(categoriesCollectionRef, orderBy('name'))); // Zoradiť podľa názvu
         // Mapovať dokumenty na polia objektov s id a data
         allCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("Načítané kategórie:", allCategories.length);
     } catch (e) {
         console.error("Chyba pri načítaní kategórií: ", e);
         alert("Nepodarilo sa načítať kategórie.");
          allCategories = []; // V prípade chyby vyprázdniť pole
     }
}

// Funkcia na načítanie všetkých skupín
async function loadAllGroups() {
     console.log("Načítavam všetky skupiny...");
     try {
         // Načítať všetky dokumenty z kolekcie skupín
         // Zoradiť skupiny podľa categoryId a potom podľa názvu pre lepšie spracovanie
         const querySnapshot = await getDocs(query(groupsCollectionRef, orderBy('categoryId'), orderBy('name')));
         // Mapovať dokumenty na polia objektov s id a data
         allGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("Načítané skupiny:", allGroups.length);
     } catch (e) {
         console.error("Chyba pri načítaní skupín: ", e);
         alert("Nepodarilo sa načítať skupiny.");
          allGroups = []; // V prípade chyby vyprázdniť pole
     }
}

// Funkcia na načítanie všetkých tímov/klubov
async function loadAllClubs() {
     console.log("Načítavam všetky tímy...");
     try {
         // Načítať všetky dokumenty z kolekcie klubov/tímov
         // Zoradiť tímy (toto poradie je informatívne pri načítaní, konečné v skupine je podľa orderInGroup)
         const querySnapshot = await getDocs(query(clubsCollectionRef, orderBy('categoryId'), orderBy('groupId'), orderBy('orderInGroup')));
         // Mapovať dokumenty na polia objektov s id a data
         allClubs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log("Načítané tímy:", allClubs.length);
     } catch (e) {
         console.error("Chyba pri načítaní tímov: ", e);
         alert("Nepodarilo sa načítať tímy.");
          allClubs = []; // V prípade chyby vyprázdniť pole
     }
}


// --- Hlavná funkcia na zobrazenie zoskupených dát ---

async function displayGroupedData() {
    console.log("Zobrazujem zoskupené dáta...");
    if (!dataDisplayArea) {
        console.error("Element pre zobrazenie dát nenájdený!");
        return;
    }

    dataDisplayArea.innerHTML = 'Načítavam dáta...'; // Zobrazte načítavacie správu

    try {
        // 1. Načítajte všetky dáta pomocou nových funkcií (sekvenčné volanie)
        await loadAllCategories();
        await loadAllGroups();
        await loadAllClubs();

        console.log("Dáta načítané:", { categories: allCategories.length, groups: allGroups.length, clubs: allClubs.length });

        // Vytvoriť mapy pre rýchly prístup k dátam podľa ID
        const categoriesMap = allCategories.reduce((map, category) => {
             map[category.id] = category;
             return map;
        }, {});

         const groupsMap = allGroups.reduce((map, group) => {
              map[group.id] = group;
              return map;
         }, {});


        // 2. Roztriedenie a zoskupenie dát (Táto časť spracováva načítané dáta)
        // Štruktúra: { categoryId: { groupID: [teams] } }
        const groupedData = {};

        // Zoskupenie tímov do skupín a kategórií (používame už načítané allClubs)
        allClubs.forEach(club => {
            const groupId = club.groupId || 'unassigned'; // Priradiť tímy bez skupiny do "unassigned" skupiny
            const categoryId = club.categoryId || 'unassigned_category'; // Priradiť tímy bez kategórie do "unassigned_category"

            if (!groupedData[categoryId]) {
                groupedData[categoryId] = {};
            }
            if (!groupedData[categoryId][groupId]) {
                groupedData[categoryId][groupId] = [];
            }
            groupedData[categoryId][groupId].push(club);
        });

        // Zoradenie tímov v rámci každej skupiny podľa orderInGroup a potom mena
        for (const categoryId in groupedData) {
            for (const groupId in groupedData[categoryId]) {
                 const teamsInGroup = groupedData[categoryId][groupId];

                 // Zoradiť: najprv tímy s platným číslom poradia (vzostupne), potom tímy bez poradia (podľa mena)
                 teamsInGroup.sort((a, b) => {
                      const orderA = typeof a.orderInGroup === 'number' && a.orderInGroup > 0 ? a.orderInGroup : Infinity; // Infinity, aby boli na konci
                      const orderB = typeof b.orderInGroup === 'number' && b.orderInGroup > 0 ? b.orderInGroup : Infinity;

                      if (orderA !== orderB) {
                           return orderA - orderB; // Zoradiť podľa poradia
                      }
                       // Ak sú obe bez poradia alebo majú rovnaké poradie, zoradiť podľa mena
                      const nameA = a.name || a.id || '';
                      const nameB = b.name || b.id || '';
                      return nameA.localeCompare(nameB, 'sk-SK');
                 });
            }
        }

        // 3. Vytvorenie HTML štruktúry pre zobrazenie dát
        let html = '';

         // Získať a zoradiť ID kategórií, ktoré majú byť zobrazené (tie, ktoré majú priradené tímy alebo skupiny)
         const categoryIdsToDisplay = new Set(Object.keys(groupedData).filter(catId => catId !== 'unassigned_category'));
          allGroups.forEach(group => { // Pridať aj kategórie, ktoré majú priradené skupiny (aj prázdne skupiny)
              if (group.categoryId && group.categoryId !== 'unassigned_category') {
                   categoryIdsToDisplay.add(group.categoryId);
              }
          });


         // Zoradiť kategórie, ktoré sa budú zobrazovať, podľa ich názvov
         const sortedCategoryIds = Array.from(categoryIdsToDisplay).sort((idA, idB) => {
              const categoryA = categoriesMap[idA];
              const categoryB = categoriesMap[idB];
              const nameA = categoryA ? categoryA.name || categoryA.id : idA;
              const nameB = categoryB ? categoryB.name || categoryB.id : idB;
              return nameA.localeCompare(nameB, 'sk-SK');
         });


         // Iterovať cez zoradené kategórie a vygenerovať HTML
         if (sortedCategoryIds.length > 0) {
             sortedCategoryIds.forEach(categoryId => {
                  const category = categoriesMap[categoryId];
                  const categoryName = category ? category.name || category.id : categoryId; // Získať názov kategórie alebo použiť ID

                  const dataForCategory = groupedData[categoryId] || {}; // Získať dáta tímov pre túto kategóriu
                  const groupsForCategory = allGroups.filter(group => group.categoryId === categoryId); // Získať skupiny priradené k tejto kategórii


                   // Zobraziť sekciu kategórie iba ak má nejaké priradené skupiny ALEBO tímy v týchto skupinách/nepr. v kategórii
                   const hasContent = groupsForCategory.length > 0 || (Object.keys(dataForCategory).length > 0);

                   if (hasContent) {
                        html += `<div class="category-section section-block"><h3>${categoryName}</h3>`;

                        // Získať a zoradiť ID skupín v tejto kategórii, ktoré majú byť zobrazené
                         const groupIdsToDisplay = new Set(groupsForCategory.map(group => group.id)); // Skupiny priradené ku kategórii
                         if (dataForCategory) { // Pridať aj skupiny z groupedData, ktoré nemusia byť v allGroups (dátová nekonzistencia)
                              Object.keys(dataForCategory).forEach(groupId => {
                                   if (groupId !== 'unassigned') {
                                        groupIdsToDisplay.add(groupId);
                                   }
                              });
                         }


                         // Zoradiť skupiny v rámci kategórie podľa ich názvov
                         const sortedGroupIds = Array.from(groupIdsToDisplay).sort((idA, idB) => {
                              const groupA = groupsMap[idA];
                              const groupB = groupsMap[idB];
                              const nameA = groupA ? groupA.name || groupA.id : idA;
                              const nameB = groupB ? groupB.name || groupB.id : idB;
                              return nameA.localeCompare(nameB, 'sk-SK');
                         });


                        // Iterovať cez zoradené skupiny v tejto kategórii a vygenerovať HTML
                        sortedGroupIds.forEach(groupId => {
                             const group = groupsMap[groupId];
                             const groupName = group ? group.name || group.id : groupId; // Získať názov skupiny alebo použiť ID

                             const teamsInGroup = dataForCategory[groupId] || []; // Získať tímy pre túto skupinu z groupedData (sú už zoradené)

                              // Zobraziť sekciu skupiny iba ak má nejaké tímy
                             if (teamsInGroup.length > 0) {
                                  html += `<div class="group-section"><h4>${groupName}</h4>`;
                                  html += '<table class="group-clubs-table"><thead><tr><th>Poradie</th><th>Názov tímu</th></tr></thead><tbody>';
                                  teamsInGroup.forEach(team => {
                                       html += `<tr><td>${(typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-'}</td><td>${team.name || team.id}</td></tr>`;
                                  });
                                  html += '</tbody></table>';
                                  html += '</div>'; // Koniec group-section
                             }
                        });

                         // Zobraziť nepriradené tímy s touto categoryId (ak existujú)
                         if (dataForCategory['unassigned'] && dataForCategory['unassigned'].length > 0) {
                              const unassignedTeams = dataForCategory['unassigned'];
                              // Tímy bez skupiny sú už zoradené podľa mena
                              html += `<div class="group-section"><h4>Nepriradené tímy v kategórii ${categoryName}</h4>`;
                              html += '<table class="group-clubs-table"><thead><tr><th>Názov tímu</th></tr></thead><tbody>';
                              unassignedTeams.forEach(team => {
                                   html += `<tr><td>${team.name || team.id}</td></tr>`;
                              });
                              html += '</tbody></table>';
                              html += '</div>'; // Koniec group-section
                         }


                        html += '</div>'; // Koniec category-section
                   }
             });
         } else {
              html += '<p>Žiadne kategórie sa nenašli alebo žiadne tímy/skupiny nie sú k nim priradené.</p>';
         }


         // Zobraziť nepriradené tímy, ktoré nemajú ani categoryId (global unassigned)
         if (groupedData['unassigned_category'] && groupedData['unassigned_category']['unassigned'] && groupedData['unassigned_category']['unassigned'].length > 0) {
              const globalUnassignedTeams = groupedData['unassigned_category']['unassigned'];
               // Tímy bez skupiny a bez kategórie sú zoradené podľa mena
              html += `<div class="category-section section-block"><h3>Nepriradené tímy (bez kategórie a skupiny)</h3>`;
              html += '<table class="group-clubs-table"><thead><tr><th>Názov tímu</th></tr></thead><tbody>';
              globalUnassignedTeams.forEach(team => {
                   html += `<tr><td>${team.name || team.id}</td></tr>`;
              });
              html += '</tbody></table>';
              html += '</div>'; // Koniec category-section
         }


        // Ak sa po spracovaní nič nevygenerovalo (napr. databáza bola prázdna)
        if (html === '') {
             html = '<p>Zatiaľ nie sú pridané žiadne kategórie, skupiny ani tímy, alebo nemajú platné priradenie.</p>';
        }


        dataDisplayArea.innerHTML = html; // Vložte vygenerované HTML

    } catch (e) {
        console.error("Chyba pri načítaní alebo zobrazovaní dát: ", e);
        dataDisplayArea.innerHTML = '<p>Nastala chyba pri načítaní dát.</p>';
    }
}

// Inicializácia - spustí načítanie a zobrazenie dát po načítaní DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM plne načítaný pre zobrazenie skupín.");
    // Spustiť načítanie a zobrazenie dát
    displayGroupedData();
});

// Ak potrebujete exportovať displayGroupedData pre volanie z inej stránky (napr. refresh), môžete to pridať
// export { displayGroupedData };

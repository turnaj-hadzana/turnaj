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
         const querySnapshot = await getDocs(query(categoriesCollectionRef, orderBy('name'))); // Zoradiť podľa názvu
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
         // Načítame skupiny a zoradíme ich podľa categoryId a potom podľa názvu
         const querySnapshot = await getDocs(query(groupsCollectionRef, orderBy('categoryId'), orderBy('name')));
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
         // Načítame tímy a zoradíme ich (toto zoradenie pomôže pri zoskupovaní, ale konečné zoradenie v skupine bude podľa orderInGroup)
         const querySnapshot = await getDocs(query(clubsCollectionRef, orderBy('categoryId'), orderBy('groupId'), orderBy('orderInGroup')));
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
        // 1. Načítajte všetky dáta pomocou nových funkcií
        await loadAllCategories();
        await loadAllGroups();
        await loadAllClubs();

        console.log("Dáta načítané:", { categories: allCategories.length, groups: allGroups.length, clubs: allClubs.length });


        // 2. Roztriedenie a zoskupenie dát (Táto časť zostáva podobne komplexná, pretože organizuje dáta pre zobrazenie)
        const groupedData = {}; // Štruktúra: { categoryId: { groupID: [teams] } }

        // Zoskupenie tímov do skupín (používame už načítané allClubs)
        allClubs.forEach(club => {
            const groupId = club.groupId || 'unassigned'; // Priradiť tímy bez skupiny do "unassigned" skupiny
            const categoryId = club.categoryId || 'unassigned_category'; // Priradiť tímy bez kategórie

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

        // 3. Vytvorenie HTML štruktúry
        let html = '';

         // Zoradiť kategórie pre zobrazenie (používame už zoradené allCategories)
         const sortedCategories = allCategories; // allCategories by už mali byť zoradené podľa názvu z loadAllCategories

         // Zobraziť kategórie a ich skupiny a tímy
         if (sortedCategories.length > 0) {
             sortedCategories.forEach(category => {
                  const categoryId = category.id;
                  const categoryName = category.name;
                  const groupsForCategory = allGroups.filter(group => group.categoryId === categoryId);
                   const dataForCategory = groupedData[categoryId] || {}; // Získať dáta pre túto kategóriu

                   // Zobraziť sekciu kategórie iba ak má nejaké priradené skupiny ALEBO tímy v týchto skupinách
                   const hasContent = groupsForCategory.length > 0 || (Object.keys(dataForCategory).length > 0 && Object.keys(dataForCategory).some(groupId => groupId !== 'unassigned'));

                   if (hasContent) {
                        html += `<div class="category-section section-block"><h3>${categoryName}</h3>`;

                        // Zoradiť skupiny v rámci tejto kategórie (používame už zoradené allGroups filtrované pre kategóriu)
                        groupsForCategory.forEach(group => {
                             const groupId = group.id;
                             const groupName = group.name || groupId;
                             const teamsInGroup = dataForCategory[groupId] || []; // Získať tímy pre túto skupinu

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
                              // Tímy bez skupiny sú už zoradené podľa mena pri zoskupovaní a konečnom triedení
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
              html += '<p>Žiadne kategórie sa nenašli.</p>';
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


        // Ak sa po spracovaní nič nevygenerovalo
        if (html === '') {
             html = '<p>Žiadne tímy ani skupiny s platným priradením sa nenašli.</p>';
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
    displayGroupedData();
});

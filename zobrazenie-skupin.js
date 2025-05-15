// zobrazenie-skupin.js

// Importujte spoločné funkcie a referencie z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, orderBy } from 'spravca-turnaja-common.js'; // Import orderBy pre zoradenie

// Získajte referenciu na element, kam sa bude vkladať obsah
const dataDisplayArea = document.getElementById('dataDisplayArea');

// Globálne premenné pre uložené dáta (ak by boli potrebné inde, inak stačia lokálne v rámci funkcie)
let allCategories = [];
let allGroups = [];
let allClubs = [];

// Funkcia na načítanie a zobrazenie všetkých dát roztriedených podľa kategórií a skupín
async function displayGroupedData() {
    console.log("Načítavam a zobrazujem zoskupené dáta...");
    if (!dataDisplayArea) {
        console.error("Element pre zobrazenie dát nenájdený!");
        return;
    }

    dataDisplayArea.innerHTML = 'Načítavam dáta...'; // Zobrazte načítavacie správu

    try {
        // 1. Načítajte všetky dáta
        console.log("Načítavam kategórie, skupiny a tímy z databázy...");
        const [categoriesSnapshot, groupsSnapshot, clubsSnapshot] = await Promise.all([
            getDocs(query(categoriesCollectionRef, orderBy('name'))), // Zoradiť kategórie podľa názvu
            getDocs(query(groupsCollectionRef, orderBy('categoryId'), orderBy('name'))), // Zoradiť skupiny podľa kategórie a názvu
            getDocs(query(clubsCollectionRef, orderBy('categoryId'), orderBy('groupId'), orderBy('orderInGroup'))) // Zoradiť tímy podľa kategórie, skupiny a poradia
        ]);

        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Dáta načítané:", { categories: allCategories.length, groups: allGroups.length, clubs: allClubs.length });

        // 2. Roztriedenie a zoskupenie dát
        const groupedData = {}; // Štruktúra: { categoryId: { groupID: [teams] } }

        // Zoskupenie tímov do skupín
        allClubs.forEach(club => {
            const groupId = club.groupId || 'unassigned'; // Priradiť tímy bez skupiny do "unassigned" skupiny
            if (!groupedData[club.categoryId]) {
                groupedData[club.categoryId] = {};
            }
            if (!groupedData[club.categoryId][groupId]) {
                groupedData[club.categoryId][groupId] = [];
            }
            groupedData[club.categoryId][groupId].push(club);
        });

        // Zoradenie tímov v rámci každej skupiny podľa orderInGroup
        for (const categoryId in groupedData) {
            for (const groupId in groupedData[categoryId]) {
                 // Filtrovať tímy s číslom poradia, zoradiť ich, a potom pridať tímy bez čísla poradia
                 const teamsWithOrder = groupedData[categoryId][groupId]
                      .filter(team => typeof team.orderInGroup === 'number' && team.orderInGroup > 0)
                      .sort((a, b) => a.orderInGroup - b.orderInGroup);

                 const teamsWithoutOrder = groupedData[categoryId][groupId]
                      .filter(team => typeof team.orderInGroup !== 'number' || team.orderInGroup <= 0)
                      .sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK')); // Zoradiť nezadané podľa mena


                 groupedData[categoryId][groupId] = [...teamsWithOrder, ...teamsWithoutOrder]; // Spojiť zoradené zoznamy

            }
             // Voliteľné: Zoradiť skupiny v rámci kategórie - už by mali byť zoradené v query groups
        }


        // 3. Vytvorenie HTML štruktúry
        let html = '';

        if (allCategories.length === 0) {
            html += '<p>Žiadne kategórie sa nenašli.</p>';
        } else {
             // Zobraziť kategórie, ktoré majú priradené tímy alebo skupiny (aj prázdne skupiny)
             const categoriesToDisplay = allCategories.filter(cat => groupedData.hasOwnProperty(cat.id) || allGroups.some(group => group.categoryId === cat.id));


            if (categoriesToDisplay.length === 0) {
                 html += '<p>Žiadne tímy ani skupiny nie sú priradené ku kategóriám.</p>';
            } else {
                 categoriesToDisplay.forEach(category => {
                      const categoryGroups = allGroups.filter(group => group.categoryId === category.id);
                      const categoryHasUnassignedTeams = groupedData[category.id] && groupedData[category.id]['unassigned'] && groupedData[category.id]['unassigned'].length > 0;

                      // Zobraziť sekciu kategórie iba ak má skupiny ALEBO nepriradené tímy ALEBO má tímy v nejakých skupinách
                      if (categoryGroups.length > 0 || categoryHasUnassignedTeams || (groupedData[category.id] && Object.keys(groupedData[category.id]).some(groupId => groupId !== 'unassigned' && groupedData[category.id][groupId].length > 0)) ) {

                           html += `<div class="category-section section-block"><h3>${category.name}</h3>`;

                           const displayedGroupIds = new Set(); // Sledovať zobrazené skupiny, aby sme nezobrazili dvakrát (aj groupsSnapshot, aj groupedData)


                           // Zobraziť skupiny priradené k tejto kategórii (aj prázdne)
                           categoryGroups.forEach(group => {
                                const teamsInGroup = groupedData[category.id] ? groupedData[category.id][group.id] || [] : [];
                                displayedGroupIds.add(group.id); // Pridať ID skupiny do zobrazených

                                html += `<div class="group-section"><h4>${group.name || group.id}</h4>`;

                                if (teamsInGroup.length === 0) {
                                     html += '<p>V tejto skupine zatiaľ nie sú žiadne tímy.</p>';
                                } else {
                                     html += '<table class="group-clubs-table"><thead><tr><th>Poradie</th><th>Názov tímu</th></tr></thead><tbody>';
                                     teamsInGroup.forEach(team => {
                                          html += `<tr><td>${(typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-'}</td><td>${team.name || team.id}</td></tr>`;
                                     });
                                     html += '</tbody></table>';
                                }
                                html += '</div>'; // Koniec group-section
                           });

                           // Zobraziť nepriradené tímy v tejto kategórii (ak existujú)
                           if (categoryHasUnassignedTeams) {
                                const unassignedTeams = groupedData[category.id]['unassigned'];
                                 // Tímy bez skupiny sú už zoradené podľa mena pri zoskupovaní
                                html += `<div class="group-section"><h4>Nepriradené tímy v kategórii ${category.name}</h4>`;
                                html += '<table class="group-clubs-table"><thead><tr><th>Názov tímu</th></tr></thead><tbody>';
                                unassignedTeams.forEach(team => {
                                     html += `<tr><td>${team.name || team.id}</td></tr>`;
                                });
                                html += '</tbody></table>';
                                html += '</div>'; // Koniec group-section
                           }

                            // Zobraziť prípadné tímy, ktoré majú categoryId = category.id, ale groupId, ktoré sa nenašlo v groupsSnapshot (menej častý prípad, skôr dátová nekonzistencia)
                           if (groupedData[category.id]) {
                                 Object.keys(groupedData[category.id]).forEach(groupId => {
                                      if (groupId !== 'unassigned' && !displayedGroupIds.has(groupId)) {
                                           const teamsInUnknownGroup = groupedData[category.id][groupId];
                                           if (teamsInUnknownGroup.length > 0) {
                                                html += `<div class="group-section"><h4>Tímy v neznámej skupine (ID: ${groupId}) v kategórii ${category.name}</h4>`;
                                                html += '<table class="group-clubs-table"><thead><tr><th>Poradie</th><th>Názov tímu</th></tr></thead><tbody>';
                                                teamsInUnknownGroup.forEach(team => {
                                                     html += `<tr><td>${(typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-'}</td><td>${team.name || team.id}</td></tr>`;
                                                });
                                                html += '</tbody></table>';
                                                html += '</div>'; // Koniec group-section
                                           }
                                      }
                                 });
                           }


                           html += '</div>'; // Koniec category-section
                      }
                 });
            }
        }

         // Zobraziť nepriradené tímy, ktoré nemajú ani categoryId (global unassigned)
         if (groupedData['unassigned'] && groupedData['unassigned']['unassigned'] && groupedData['unassigned']['unassigned'].length > 0) {
              const globalUnassignedTeams = groupedData['unassigned']['unassigned'];
               // Tímy bez skupiny a bez kategórie sú zoradené podľa mena pri zoskupovaní
              html += `<div class="category-section section-block"><h3>Nepriradené tímy (bez kategórie a skupiny)</h3>`;
              html += '<table class="group-clubs-table"><thead><tr><th>Názov tímu</th></tr></thead><tbody>';
              globalUnassignedTeams.forEach(team => {
                   html += `<tr><td>${team.name || team.id}</td></tr>`;
              });
              html += '</tbody></table>';
              html += '</div>'; // Koniec category-section
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

// Ak potrebujete exportovať displayGroupedData pre volanie z inej stránky, môžete to pridať
// export { displayGroupedData };

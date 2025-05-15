// zobrazenie-skupin.js (Pridaný kontajner pre skupiny v rámci kategórie)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencie na div, kde sa bude zobrazovať obsah skupín
const groupsDisplayContent = document.getElementById('groupsDisplayContent');
const categoryFilter = document.getElementById('categoryFilter'); // Referencia na filter kategórií
const groupFilter = document.getElementById('groupFilter'); // Referencia na filter skupín (nový)
const teamFilter = document.getElementById('teamFilter'); // Referencia na filter tímov
const clearFiltersButton = document.getElementById('clearFiltersButton'); // Referencia na tlačidlo vymazania filtrov


// Polia pre uchovanie všetkých načítaných dát
let allCategories = [];
let allGroups = [];
let allTeams = [];

// Funkcia na načítanie všetkých dát z databázy
async function loadAllTournamentData() {
    try {
        // Načítať kategórie
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK')); // Zoradiť kategórie abecedne (podľa názvu, ak chýba, tak podľa ID)

        // Načítať skupiny
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         // Zoradiť skupiny (napr. podľa ID alebo názvu, v rámci kategórií sa bude ďalej zoraďovať)
         allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));


        // Načítať tímy
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         // Tímy budú zoradené v rámci skupín

        console.log("INFO: Dáta turnaja načítané:", { allCategories, allGroups, allTeams });

        // Po načítaní dát naplniť filtre
        populateFilters();


    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (groupsDisplayContent) {
             groupsDisplayContent.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}

// Funkcia na naplnenie filtrovacích select boxov
function populateFilters() {
    // Naplniť filter kategórií
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name || category.id;
        categoryFilter.appendChild(option);
    });

    // Naplniť filter skupín
    allGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name || group.id;
        groupFilter.appendChild(option);
    });

    // Naplniť filter tímov
    allTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name || team.id;
        teamFilter.appendChild(option);
    });
}


// Funkcia na zobrazenie skupín a tímov (s implementovaným filtrovaním a zvýraznením tímu)
function displayGroups() {
    if (!groupsDisplayContent) {
        console.error("Element pre zobrazenie skupín nenájdený!");
        return;
    }

    groupsDisplayContent.innerHTML = ''; // Vyčistiť predchádzajúci obsah

    const selectedCategoryId = categoryFilter.value;
    const selectedGroupId = groupFilter.value;
    const selectedTeamId = teamFilter.value;

    let teamsToDisplay = []; // Pole tímov, ktoré sa budú zobrazovať
    let groupsToDisplay = []; // Pole skupín, ktoré sa budú zobrazovať
    let categoriesToDisplay = []; // Pole kategórií, ktoré sa budú zobrazovať


    // Ak je vybraný konkrétny tím, upravíme logiku filtrovania
    if (selectedTeamId !== '') {
        const selectedTeam = allTeams.find(team => team.id === selectedTeamId);

        if (selectedTeam) {
            // Ak vybraný tím patrí do skupiny
            if (selectedTeam.groupId) {
                // Nájdeme skupinu a kategóriu vybraného tímu
                const teamGroup = allGroups.find(group => group.id === selectedTeam.groupId);
                const teamCategory = allCategories.find(cat => cat.id === teamGroup.categoryId);

                if (teamGroup && teamCategory) {
                    // Zobrazíme len túto kategóriu a túto skupinu
                    categoriesToDisplay = [teamCategory];
                    groupsToDisplay = [teamGroup];
                    // Tímy na zobrazenie budú VŠETKY tímy z tejto skupiny
                    teamsToDisplay = allTeams.filter(team => team.groupId === selectedTeam.groupId);
                } else {
                    // Ak sa nenašla skupina alebo kategória tímu, nič nezobrazíme
                    groupsDisplayContent.innerHTML = '<p>Nenašli sa informácie o skupine alebo kategórii pre vybraný tím.</p>';
                    return;
                }
            } else {
                // Ak vybraný tím nie je priradený do skupiny
                categoriesToDisplay = allCategories; // Zobrazíme všetky kategórie (ale bez skupín)
                groupsToDisplay = []; // Žiadne skupiny na zobrazenie
                // Tímy na zobrazenie budú len nepriradené tímy (vrátane vybraného, ak je nepriradený)
                teamsToDisplay = allTeams.filter(team => !team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === ''));

                 // Ak je vybraný nepriradený tím, ale filter kategórie je aktívny a tím do nej nepatrí, nič nezobrazíme
                 if (selectedCategoryId && selectedTeam.categoryId !== selectedCategoryId) {
                     teamsToDisplay = [];
                 }
            }
        } else {
             groupsDisplayContent.innerHTML = '<p>Vybraný tím sa nenašiel.</p>';
             return;
        }

    } else {
        // Ak nie je vybraný konkrétny tím (platí pôvodná logika filtrovania)
        categoriesToDisplay = selectedCategoryId
            ? allCategories.filter(cat => cat.id === selectedCategoryId)
            : allCategories;

        groupsToDisplay = allGroups.filter(group =>
            (!selectedCategoryId || group.categoryId === selectedCategoryId) &&
            (!selectedGroupId || group.id === selectedGroupId)
        );

         // Tímy na zobrazenie budú filtrované len podľa kategórie a skupiny
         teamsToDisplay = allTeams.filter(team =>
             (!selectedCategoryId || team.categoryId === selectedCategoryId) &&
             (!selectedGroupId || team.groupId === selectedGroupId)
         );
    }


     if (categoriesToDisplay.length === 0 && groupsToDisplay.length === 0 && teamsToDisplay.length === 0) {
         groupsDisplayContent.innerHTML = '<p>Žiadne skupiny ani tímy nezodpovedajú vybraným filtrom.</p>';
         return;
     }


    // Zobraziť skupiny rozdelené podľa kategórií
    categoriesToDisplay.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category-display');

        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name || category.id;
        categoryDiv.appendChild(categoryTitle);

        const groupsContainerDiv = document.createElement('div');
        groupsContainerDiv.classList.add('groups-container');
        categoryDiv.appendChild(groupsContainerDiv);


        // Nájdi skupiny patriace do tejto kategórie, ktoré sa majú zobraziť
        const groupsInCategoryToDisplay = groupsToDisplay.filter(group => group.categoryId === category.id);


        if (groupsInCategoryToDisplay.length === 0 && teamsToDisplay.filter(team => team.categoryId === category.id && team.groupId).length === 0 && selectedTeamId === '') {
            // Ak nie sú žiadne skupiny na zobrazenie v tejto kategórii a ani žiadne priradené tímy (a nie je vybraný konkrétny tím)
             const noGroupsPara = document.createElement('p');
             noGroupsPara.textContent = `V kategórii "${category.name || category.id}" zatiaľ nie sú vytvorené žiadne skupiny.`;
             groupsContainerDiv.appendChild(noGroupsPara);
        } else {
             // Zoradiť skupiny v rámci kategórie
             groupsInCategoryToDisplay.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

             groupsInCategoryToDisplay.forEach(group => {
                 const groupDiv = document.createElement('div');
                 groupDiv.classList.add('group-display');

                 const groupTitle = document.createElement('h3');
                 groupTitle.textContent = group.name || group.id;
                 groupDiv.appendChild(groupTitle);

                 // Nájdi VŠETKY tímy priradené k tejto skupine (bez ohľadu na teamFilter, ten sa zohľadní pri zvýraznení)
                 const teamsInGroup = allTeams.filter(team => team.groupId === group.id);


                 if (teamsInGroup.length === 0) {
                     const noTeamsPara = document.createElement('p');
                     noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                     groupDiv.appendChild(noTeamsPara);
                 } else {
                     // Zoradiť tímy v skupine
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
                         teamNameSpan.textContent = team.name || 'Neznámy tím';

                         // *** ZVÝRAZNENIE VYBRANÉHO TÍMU ***
                         if (selectedTeamId !== '' && team.id === selectedTeamId) {
                             teamNameSpan.classList.add('highlighted-team'); // Pridaj triedu pre zvýraznenie
                         }
                         // *** KONIEC ZVÝRAZNENIA ***

                         teamItem.appendChild(teamNameSpan);
                         teamList.appendChild(teamItem);
                     });
                     groupDiv.appendChild(teamList);
                 }

                 groupsContainerDiv.appendChild(groupDiv);
             });
        }


         // Pridať div kategórie, iba ak obsahuje skupiny na zobrazenie alebo nepriradené tímy patriace do tejto kategórie
         if (groupsInCategoryToDisplay.length > 0 || teamsToDisplay.filter(team => team.categoryId === category.id && !team.groupId).length > 0) {
              groupsDisplayContent.appendChild(categoryDiv);
         }
    });

    // Zobraziť nepriradené tímy (s implementovaným filtrovaním a zvýraznením)
    const unassignedTeamsToDisplay = teamsToDisplay.filter(team => !team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === ''));


    if (unassignedTeamsToDisplay.length > 0) {
        const unassignedDiv = document.createElement('div');
        unassignedDiv.classList.add('unassigned-teams-display');

        const unassignedTitle = document.createElement('h2');
        unassignedTitle.textContent = 'Nepriradené tímy';
        unassignedDiv.appendChild(unassignedTitle);

        // Zoradiť nepriradené tímy
        unassignedTeamsToDisplay.sort((a, b) => {
             const categoryA = a.categoryId ? (allCategories.find(cat => cat.id === a.categoryId)?.name || a.categoryId) : 'Z';
             const categoryB = b.categoryId ? (allCategories.find(cat => cat.id === b.categoryId)?.name || b.categoryId) : 'Z';
             const nameA = (a.name || a.id || '').toLowerCase();
             const nameB = (b.name || b.id || '').toLowerCase();

             if (categoryA !== categoryB) {
                  return categoryA.localeCompare(categoryB, 'sk-SK');
             }
             return nameA.localeCompare(nameB, 'sk-SK');
        });


        const unassignedList = document.createElement('ul');
        let currentCategory = null;

        unassignedTeamsToDisplay.forEach(team => {
            const teamCategory = team.categoryId ? (allCategories.find(cat => cat.id === team.categoryId)?.name || team.categoryId) : 'Bez kategórie';

            if (teamCategory !== currentCategory) {
                const categoryHeader = document.createElement('li');
                categoryHeader.style.fontWeight = 'bold';
                categoryHeader.style.marginTop = '10px';
                categoryHeader.style.backgroundColor = '#e9ecef';
                categoryHeader.style.color = '#495057';
                categoryHeader.textContent = `Kategória: ${teamCategory}`;
                unassignedList.appendChild(categoryHeader);
                currentCategory = teamCategory;
            }


            const teamItem = document.createElement('li');
            teamItem.textContent = team.name || 'Neznámy tím';

            // *** ZVÝRAZNENIE VYBRANÉHO TÍMU V NEPRIRADENÝCH ***
             if (selectedTeamId !== '' && team.id === selectedTeamId) {
                  teamItem.classList.add('highlighted-team'); // Pridaj triedu pre zvýraznenie
             }
            // *** KONIEC ZVÝRAZNENIA ***


            unassignedList.appendChild(teamItem);
        });
        unassignedDiv.appendChild(unassignedList);
        groupsDisplayContent.appendChild(unassignedDiv);
    }

     // Ak po filtrovaní (aj s vybraným tímom) nie sú žiadne skupiny ani nepriradené tímy na zobrazenie, zobrazte správu
     if (groupsDisplayContent.innerHTML === '') {
          groupsDisplayContent.innerHTML = '<p>Žiadne skupiny ani tímy nezodpovedajú vybraným filtrom.</p>';
     }

}

// Pridanie poslucháčov udalostí pre filtre
categoryFilter.addEventListener('change', displayGroups);
groupFilter.addEventListener('change', displayGroups); // Poslucháč pre filter skupiny
teamFilter.addEventListener('change', displayGroups);

// Poslucháč pre tlačidlo vymazania filtrov
clearFiltersButton.addEventListener('click', () => {
    categoryFilter.value = '';
    groupFilter.value = ''; // Vynulovať filter skupiny
    teamFilter.value = '';
    displayGroups(); // Zobraziť všetky skupiny po vymazaní filtrov
});


// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín.");
    await loadAllTournamentData();
    displayGroups();
});

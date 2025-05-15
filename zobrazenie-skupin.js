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


// Funkcia na zobrazenie skupín a tímov (s implementovaným filtrovaním)
function displayGroups() {
    if (!groupsDisplayContent) {
        console.error("Element pre zobrazenie skupín nenájdený!");
        return;
    }

    groupsDisplayContent.innerHTML = ''; // Vyčistiť predchádzajúci obsah

    const selectedCategoryId = categoryFilter.value;
    const selectedGroupId = groupFilter.value; // Získaj vybranú skupinu
    const selectedTeamId = teamFilter.value;

    // Filtrovať kategórie na základe výberu
    const filteredCategories = selectedCategoryId
        ? allCategories.filter(cat => cat.id === selectedCategoryId)
        : allCategories;

    // Filtrovať skupiny na základe výberu kategórie a skupiny
    const filteredGroups = allGroups.filter(group =>
        (!selectedCategoryId || group.categoryId === selectedCategoryId) &&
        (!selectedGroupId || group.id === selectedGroupId) // Filter podľa vybranej skupiny
    );

    // Filtrovať tímy na základe výberu tímu, skupiny a kategórie
    const filteredTeams = allTeams.filter(team =>
        (!selectedTeamId || team.id === selectedTeamId) &&
        (!selectedGroupId || team.groupId === selectedGroupId) && // Filter podľa vybranej skupiny
        (!selectedCategoryId || team.categoryId === selectedCategoryId) // Filter podľa vybranej kategórie
    );


    if (filteredCategories.length === 0 && filteredGroups.length === 0 && filteredTeams.length === 0) {
        groupsDisplayContent.innerHTML = '<p>Zatiaľ nie sú vytvorené žiadne kategórie, skupiny ani tímy, alebo žiadne nezodpovedajú filtrom.</p>';
        return;
    }

    // Zobraziť skupiny rozdelené podľa filtrovaných kategórií
    filteredCategories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category-display');

        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name || category.id; // Zobraz názov ak existuje, inak ID kategórie
        categoryDiv.appendChild(categoryTitle);

        // Vytvoriť kontajner pre skupiny v tejto kategórii
        const groupsContainerDiv = document.createElement('div');
        groupsContainerDiv.classList.add('groups-container');
        categoryDiv.appendChild(groupsContainerDiv); // Pridať kontajner do divu kategórie


        // Nájdi filtrované skupiny patriace do tejto kategórie
        const groupsInCategory = filteredGroups.filter(group => group.categoryId === category.id);

        if (groupsInCategory.length === 0 && selectedGroupId === '') { // Zobraz "žiadne skupiny" iba ak nie je aktívny filter skupiny
             const noGroupsPara = document.createElement('p');
             noGroupsPara.textContent = `V kategórii "${category.name || category.id}" zatiaľ nie sú vytvorené žiadne skupiny.`; // Zobraz názov kategórie (alebo ID) v správe
             groupsContainerDiv.appendChild(noGroupsPara);
        } else {
            // Zoradiť skupiny v rámci kategórie (napr. podľa názvu)
            groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

            groupsInCategory.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.classList.add('group-display');

                const groupTitle = document.createElement('h3');
                groupTitle.textContent = group.name || group.id; // Zobraz názov skupiny ak existuje, inak ID skupiny
                groupDiv.appendChild(groupTitle);

                // Nájdi filtrované tímy priradené k tejto skupine
                const teamsInGroup = filteredTeams.filter(team => team.groupId === group.id);

                // *** NOVÁ LOGIKA ZOBRAZENIA SKUPINY NA ZÁKLADE FILTRA TÍMU ***
                // Ak je vybraný konkrétny tím A tento tím sa v skupine nenachádza, preskočiť zobrazenie tejto skupiny
                if (selectedTeamId !== '' && teamsInGroup.length === 0) {
                    return; // Preskočí zvyšok iterácie pre túto skupinu, teda ju nezobrazí
                }
                // *** KONIEC NOVEJ LOGIKY ***


                 if (teamsInGroup.length === 0 && selectedTeamId === '') { // Zobraz "žiadne tímy" iba ak nie je aktívny filter tímu
                    const noTeamsPara = document.createElement('p');
                    noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                    groupDiv.appendChild(noTeamsPara);
                } else if (teamsInGroup.length > 0) { // Zobraz tímy iba ak nejaké sú po filtrovaní
                     // Zoradiť tímy v skupine podľa poradia (orderInGroup), potom abecedne
                     teamsInGroup.sort((a, b) => {
                         const orderA = a.orderInGroup || Infinity; // Tímy bez poradia na koniec
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

                // Pridať groupDiv do kontajnera skupín, nie priamo do categoryDiv
                groupsContainerDiv.appendChild(groupDiv);
            });
                

    // Zobraziť tímy bez priradenej skupiny (s implementovaným filtrovaním)
    const unassignedTeams = filteredTeams.filter(team => !team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === ''));

    // Filtrovať nepriradené tímy aj podľa kategórie, ak je filter kategórie aktívny
     const filteredUnassignedTeams = unassignedTeams.filter(team =>
         (!selectedCategoryId || team.categoryId === selectedCategoryId) &&
         (!selectedTeamId || team.id === selectedTeamId) // Zahrnúť filter tímu pre nepriradené tímy
     );


    if (filteredUnassignedTeams.length > 0) {
        const unassignedDiv = document.createElement('div');
        unassignedDiv.classList.add('unassigned-teams-display');

        const unassignedTitle = document.createElement('h2');
        unassignedTitle.textContent = 'Nepriradené tímy';
        unassignedDiv.appendChild(unassignedTitle);

        // Zoradiť nepriradené tímy abecedne, prípadne podľa kategórie
        filteredUnassignedTeams.sort((a, b) => {
             const categoryA = a.categoryId ? (allCategories.find(cat => cat.id === a.categoryId)?.name || a.categoryId) : 'Z'; // Tímy bez kat na koniec
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

        filteredUnassignedTeams.forEach(team => {
            const teamCategory = team.categoryId ? (allCategories.find(cat => cat.id === team.categoryId)?.name || team.categoryId) : 'Bez kategórie';

            if (teamCategory !== currentCategory) {
                const categoryHeader = document.createElement('li');
                categoryHeader.style.fontWeight = 'bold';
                categoryHeader.style.marginTop = '10px';
                categoryHeader.style.backgroundColor = '#e9ecef'; // Svetlejší podklad pre kategóriu
                categoryHeader.style.color = '#495057';
                categoryHeader.textContent = `Kategória: ${teamCategory}`; // Použiť zistenú hodnotu (názov, ID alebo 'Bez kategórie')
                unassignedList.appendChild(categoryHeader);
                currentCategory = teamCategory;
            }


            const teamItem = document.createElement('li');
            teamItem.textContent = team.name || 'Neznámy tím';
            unassignedList.appendChild(teamItem);
        });
        unassignedDiv.appendChild(unassignedList);
        groupsDisplayContent.appendChild(unassignedDiv);
    }

    // Ak po filtrovaní nie sú žiadne skupiny ani nepriradené tímy, zobrazte správu
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

// zobrazenie-skupin.js (Ukladanie a načítanie filtrov z URL)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencie na div, kde sa bude zobrazovať obsah skupín
const groupsDisplayContent = document.getElementById('groupsDisplayContent');
const categoryFilter = document.getElementById('categoryFilter'); // Referencia na filter kategórií
const groupFilter = document.getElementById('groupFilter'); // Referencia na filter skupín (nový)
const teamFilter = document.getElementById('teamFilter'); // Referencia na filter tímov
const clearFiltersButton = document.getElementById('clearFiltersButton'); // Referencia na tlačidlo vymazania filtrov

// *** ZABLOKOVAŤ FILTER SKUPÍN NA ZAČIATKU ***
groupFilter.disabled = true;
// *** KONIEC ZABLOKOVANIA ***


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


    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (groupsDisplayContent) {
             groupsDisplayContent.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}

// Funkcia na naplnenie filtrovacích select boxov po načítaní dát
function populateFilters() {
    // Naplniť filter kategórií
    categoryFilter.innerHTML = '<option value="">Všetky kategórie</option>'; // Vyčistiť a pridať default
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name || category.id;
        categoryFilter.appendChild(option);
    });

    // Naplní filter skupín všetkými skupinami na začiatku (bude zablokovaný)
    populateGroupFilter('');

    // Naplniť filter tímov jedinečnými a upravenými názvami
    teamFilter.innerHTML = '<option value="">Všetky tímy</option>'; // Vyčistiť a pridať default

    const uniqueTeamNames = new Set(); // Použijeme Set na uchovanie jedinečných názvov
    const processedTeamNames = []; // Pole pre názvy na zobrazenie vo filtri

    allTeams.forEach(team => {
        let teamName = team.name || 'Neznámy tím';

        // Odstrániť prípony " A", " B", " C"
        const suffixMatch = teamName.match(/^(.*?)\s[ABC]$/);
        let baseName = teamName;
        if (suffixMatch && suffixMatch[1]) {
            baseName = suffixMatch[1];
        }

        // Pridať jedinečný základný názov do Setu
        if (!uniqueTeamNames.has(baseName)) {
            uniqueTeamNames.add(baseName);
            processedTeamNames.push(baseName); // Uložiť aj pre zoradenie
        }
    });

    // Zoradiť upravené názvy tímov abecedne (slovensky)
    processedTeamNames.sort((a, b) => a.localeCompare(b, 'sk-SK'));

    // Naplniť filter tímov zoradenými jedinečnými názvami
    processedTeamNames.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName; // Hodnota bude upravený názov
        option.textContent = teamName; // Text bude upravený názov
        teamFilter.appendChild(option);
    });
}

// Funkcia: Naplnenie filtra skupín podľa vybranej kategórie
function populateGroupFilter(categoryId) {
    // Vyčistiť existujúce možnosti okrem prvej ("Všetky skupiny")
    groupFilter.innerHTML = '<option value="">Všetky skupiny</option>';

    const groupsToPopulate = categoryId
        ? allGroups.filter(group => group.categoryId === categoryId)
        : allGroups; // Ak nie je vybraná kategória, zobraz všetky skupiny (toto sa stane, kým nie je kategória vybratá, ale filter je zablokovaný)

    // Zoradiť skupiny na zobrazenie vo filtri
    groupsToPopulate.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));


    groupsToPopulate.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name || group.id;
        groupFilter.appendChild(option);
    });
}


// Funkcia: Získať hodnoty filtrov z URL
function getFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || '';
    const group = params.get('group') || '';
    const team = params.get('team') || '';
    return { category, group, team };
}

// Funkcia: Uložiť hodnoty filtrov do URL
function saveFiltersToUrl() {
    const params = new URLSearchParams();
    const selectedCategoryId = categoryFilter.value;
    const selectedGroupId = groupFilter.value;
    const selectedTeamNameFilter = teamFilter.value;

    if (selectedCategoryId) {
        params.set('category', selectedCategoryId);
    }
    if (selectedGroupId) {
        params.set('group', selectedGroupId);
    }
    if (selectedTeamNameFilter) {
        params.set('team', selectedTeamNameFilter);
    }

    // Nahradiť aktuálny stav v histórii, aby sa pri návrate späť nenačítali staré filtre
    history.replaceState(null, '', '?' + params.toString());
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
    const selectedTeamNameFilter = teamFilter.value; // Získame upravený názov tímu z filtra


    let categoriesToDisplay = allCategories;
    let groupsToDisplay = allGroups;
    let teamsToDisplay = allTeams; // Začíname so všetkými tímami a filtrujeme postupne

    // Krok 1: Filtrovanie podľa kategórie
    if (selectedCategoryId) {
        categoriesToDisplay = allCategories.filter(cat => cat.id === selectedCategoryId);
        groupsToDisplay = allGroups.filter(group => group.categoryId === selectedCategoryId);
        teamsToDisplay = allTeams.filter(team => team.categoryId === selectedCategoryId);
    }

    // Krok 2: Filtrovanie podľa skupiny (aplikuje sa na výsledok filtrovania podľa kategórie)
    if (selectedGroupId) {
         // Ak je vybratá skupina, zobrazíme len túto skupinu
         groupsToDisplay = groupsToDisplay.filter(group => group.id === selectedGroupId);
         // A tímy, ktoré patria do tejto skupiny a zodpovedajú predchádzajúcim filtrom
         teamsToDisplay = teamsToDisplay.filter(team => team.groupId === selectedGroupId);

          // Ak je vybratá skupina, zobrazíme len jej kategóriu
         if (groupsToDisplay.length > 0) {
              const groupCategory = allCategories.find(cat => cat.id === groupsToDisplay[0].categoryId);
              if (groupCategory) {
                  categoriesToDisplay = [groupCategory];
              } else {
                  categoriesToDisplay = []; // Kategória sa nenašla
              }
         } else {
             categoriesToDisplay = []; // Skupina sa nenašla
         }
    }


    // *** Filtrovanie a zvýraznenie podľa upraveného názvu tímu ***
    let teamsMatchingNameFilter = [];
    if (selectedTeamNameFilter !== '') {
        // Nájdeme všetky tímy, ktorých názov začína vyfiltrovanou časťou názvu
        teamsMatchingNameFilter = allTeams.filter(team =>
            (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase())
        );

        // Ak je aktívny filter tímu, zobrazíme len tie kategórie a skupiny, ktoré obsahujú
        // aspoň jeden tím zodpovedajúci filtru tímu A predchádzajúcim filtrom (kategória/skupina)

         if (teamsMatchingNameFilter.length > 0) {
             const categoriesWithMatchingTeams = new Set();
             const groupsWithMatchingTeams = new Set();

             teamsMatchingNameFilter.forEach(team => {
                 // Skontroluj, či tím patrí do aktuálne filtrovaných kategórií a skupín
                 const isInFilteredCategory = !selectedCategoryId || team.categoryId === selectedCategoryId;
                 const isInFilteredGroup = !selectedGroupId || team.groupId === selectedGroupId;


                 if (isInFilteredCategory && isInFilteredGroup) {
                     // Ak tím patrí do skupiny, pridaj jeho skupinu a kategóriu do zoznamov na zobrazenie
                     if (team.groupId) {
                         const group = allGroups.find(g => g.id === team.groupId);
                         if (group) {
                             groupsWithMatchingTeams.add(group);
                              const category = allCategories.find(c => c.id === group.categoryId);
                              if (category) {
                                  categoriesWithMatchingTeams.add(category);
                              }
                         }
                     } else {
                         // Ak tím nie je priradený, ale zodpovedá filtru kategórie, zobrazíme ho v nepriradených
                         if (!selectedGroupId) { // Zobraziť nepriradené len ak nie je aktívny filter skupiny
                             const category = allCategories.find(c => c.id === team.categoryId);
                             if (category) {
                                 categoriesWithMatchingTeams.add(category);
                             } else if (!team.categoryId) {
                                 // Prípad nepriradeného tímu bez kategórie
                                 // Ak ich zobrazuješ, možno pridať špeciálnu logiku
                             }
                         }
                     }
                 }
             });

              categoriesToDisplay = Array.from(categoriesWithMatchingTeams);
              // Zobrazíme len tie skupiny, ktoré obsahujú zodpovedajúce tímy A zodpovedajú filtru kategórie
              groupsToDisplay = Array.from(groupsWithMatchingTeams).filter(group =>
                  !selectedCategoryId || group.categoryId === selectedCategoryId
              );


              // teamsToDisplay sa už nepoužíva priamo na filtrovanie zobrazenia skupín, ale na zobrazenie nepriradených tímov zodpovedajúcich filtru
         } else {
             // Ak sa nenašli žiadne tímy zodpovedajúce filtru názvu a ostatným filtrom
             categoriesToDisplay = [];
             groupsToDisplay = [];
             teamsToDisplay = []; // Aj nepriradené tímy
         }
    }


     // Ak po filtrovaní nie sú žiadne kategórie na zobrazenie, zobrazte správu a ukončite
     if (categoriesToDisplay.length === 0 && (selectedTeamNameFilter !== '' || selectedCategoryId !== '' || selectedGroupId !== '')) {
          // Ak je aktívny akýkoľvek filter a nenašli sa žiadne zodpovedajúce kategórie/skupiny/tímy
          let message = 'Žiadne skupiny ani tímy nezodpovedajú vybraným filtrom.';
           if (selectedTeamNameFilter !== '') {
               message = `Nenašli sa žiadne tímy zodpovedajúce filtru "${selectedTeamNameFilter}".`;
           }
          groupsDisplayContent.innerHTML = `<p>${message}</p>`;
          return;
     }


    // Zobraziť skupiny rozdelené podľa kategórií na zobrazenie
    categoriesToDisplay.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK')); // Zoradiť kategórie na zobrazenie

    categoriesToDisplay.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category-display');

        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name || category.id;
        categoryDiv.appendChild(categoryTitle);

        const groupsContainerDiv = document.createElement('div');
        groupsContainerDiv.classList.add('groups-container');

        // Nájdi skupiny patriace do tejto kategórie, ktoré sa majú zobraziť
        const groupsInCategoryToDisplay = groupsToDisplay.filter(group => group.categoryId === category.id);

        // *** NOVÁ LOGIKA: Pridať triedu pre 5 skupín pre špeciálne rozloženie ***
        if (groupsInCategoryToDisplay.length === 5) {
            groupsContainerDiv.classList.add('force-3-plus-2-layout');
        } else {
            groupsContainerDiv.classList.remove('force-3-plus-2-layout'); // Odstrániť triedu, ak už nie je 5 skupín
        }
        // *** KONIEC NOVEJ LOGIKY ***


        categoryDiv.appendChild(groupsContainerDiv);

        groupsInCategoryToDisplay.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK')); // Zoradiť skupiny v kategórii


        if (groupsInCategoryToDisplay.length === 0 && allTeams.filter(team => team.categoryId === category.id && team.groupId && (selectedTeamNameFilter === '' || (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase()))).length === 0 ) {
            // Ak nie sú žiadne skupiny na zobrazenie v tejto kategórii a ani žiadne priradené tímy zodpovedajúce filtrom
             const noGroupsPara = document.createElement('p');
             noGroupsPara.textContent = `V kategórii "${category.name || category.id}" zatiaľ nie sú vytvorené žiadne skupiny alebo nezodpovedajú filtrom.`;
             groupsContainerDiv.appendChild(noGroupsPara);
        } else {

             groupsInCategoryToDisplay.forEach(group => {
                 const groupDiv = document.createElement('div');
                 groupDiv.classList.add('group-display');

                 const groupTitle = document.createElement('h3');
                 groupTitle.textContent = group.name || group.id;
                 groupDiv.appendChild(groupTitle);

                 // Nájdi VŠETKY tímy priradené k tejto skupine z pôvodného zoznamu allTeams
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

                         // *** ZVÝRAZNENIE TÍMOV, KTORÝCH NÁZOV ZAČÍNA VYFILTROVANOU ČASŤOU NÁZVU ***
                         if (selectedTeamNameFilter !== '' && (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase())) {
                             teamNameSpan.classList.add('highlighted-team'); // Pridaj triedu pre zvýraznenie
                         } else {
                             // Odstrániť triedu, ak tím nezodpovedá filtru názvu alebo filter názvu nie je aktívny
                             teamNameSpan.classList.remove('highlighted-team');
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
         // Zohľadníme, či existujú nepriradené tímy zodpovedajúce filtru názvu v tejto kategórii
         const unassignedTeamsInCategory = allTeams.filter(team =>
             (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
             team.categoryId === category.id &&
             (selectedTeamNameFilter === '' || (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase()))
         );

         if (groupsInCategoryToDisplay.length > 0 || unassignedTeamsInCategory.length > 0) {
              groupsDisplayContent.appendChild(categoryDiv);
         }
    });

    // Zobraziť nepriradené tímy (s implementovaným filtrovaním a zvýraznením)
    // Tímy na zobrazenie tu budú všetky nepriradené tímy, ktoré zodpovedajú filtru kategórie a filtru názvu
    const unassignedTeamsToDisplay = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        (!selectedCategoryId || team.categoryId === selectedCategoryId) &&
        (selectedTeamNameFilter === '' || (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase()))
    );


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

            // *** ZVÝRAZNENIE TÍMOV V NEPRIRADENÝCH, KTORÝCH NÁZOV ZAČÍNA VYFILTROVANOU ČASŤOU NÁZVU ***
            if (selectedTeamNameFilter !== '' && (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase())) {
                 teamItem.classList.add('highlighted-team'); // Pridaj triedu pre zvýraznenie
            } else {
                 teamItem.classList.remove('highlighted-team');
            }
            // *** KONIEC ZVÝRAZNENIA ***


            unassignedList.appendChild(teamItem);
        });
        unassignedDiv.appendChild(unassignedList);
        groupsDisplayContent.appendChild(unassignedDiv);
    }

     // Ak po filtrovaní (aj s vybraným tímom) nie sú žiadne kategórie ani nepriradené tímy na zobrazenie, zobrazte správu
     if (groupsDisplayContent.innerHTML === '') {
          let message = 'Žiadne skupiny ani tímy nezodpovedajú vybraným filtrom.';
          if (selectedTeamNameFilter !== '') {
              message = `Nenašli sa žiadne tímy zodpovedajúce filtru "${selectedTeamNameFilter}".`;
          }
          groupsDisplayContent.innerHTML = `<p>${message}</p>`;
     }

     // *** ULOŽIŤ FILTRE DO URL PO ZOBRAZENÍ ***
     saveFiltersToUrl();
     // *** KONIEC UKLADANIA DO URL ***

}


// Pridanie poslucháčov udalostí pre filtre
categoryFilter.addEventListener('change', () => {
    const selectedCategoryId = categoryFilter.value;

    if (selectedCategoryId === '') {
        // Ak je vybraná možnosť "Všetky kategórie"
        groupFilter.value = ''; // Vynulovať výber skupiny
        groupFilter.disabled = true; // Zablokovať filter skupín
        populateGroupFilter(''); // Naplniť filter skupín všetkými skupinami (ale budú neaktívne)
    } else {
        // Ak je vybraná konkrétna kategória
        groupFilter.disabled = false; // Odblokovať filter skupín
        populateGroupFilter(selectedCategoryId); // Naplniť filter skupín iba skupinami danej kategórie
        groupFilter.value = ''; // Vynulovať výber skupiny
    }

    displayGroups(); // Zobraziť skupiny s novými filtrami
});

groupFilter.addEventListener('change', displayGroups); // Poslucháč pre filter skupiny
teamFilter.addEventListener('change', displayGroups); // Poslucháč pre filter tímov

// Poslucháč pre tlačidlo vymazania filtrov
clearFiltersButton.addEventListener('click', () => {
    categoryFilter.value = '';
    groupFilter.value = ''; // Vynulovať filter skupiny
    groupFilter.disabled = true; // Zablokovať filter skupiny po vymazaní
    populateGroupFilter(''); // Naplniť filter skupín všetkými skupinami
    teamFilter.value = '';
    displayGroups(); // Zobraziť všetky skupiny po vymazaní filtrov
});


// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín.");
    await loadAllTournamentData(); // Načítať dáta

    populateFilters(); // Naplniť filtre po načítaní dát

    // *** NOVÁ LOGIKA: Získať filtre z URL a aplikovať ich ***
    const initialFilters = getFiltersFromUrl();

    // Nastaviť hodnoty filtrov podľa URL
    categoryFilter.value = initialFilters.category;

    // Ak je v URL kategória, odblokovať a naplniť filter skupín
    if (initialFilters.category) {
        groupFilter.disabled = false;
        populateGroupFilter(initialFilters.category);
        // Po naplnení skontroluj, či hodnota skupiny z URL existuje ako možnosť
        const groupOptionExists = Array.from(groupFilter.options).some(option => option.value === initialFilters.group);
         if (groupOptionExists) {
              groupFilter.value = initialFilters.group; // Nastaviť hodnotu skupiny z URL
         } else {
              groupFilter.value = ''; // Ak hodnota z URL neexistuje v možnostiach, vynulovať
         }

    } else {
        // Ak nie je kategória v URL, zabezpečiť zablokovanie a naplnenie všetkými skupinami
         groupFilter.value = ''; // Zabezpečiť, že je hodnota prázdna
         groupFilter.disabled = true;
         populateGroupFilter('');
    }

    // Nastaviť hodnotu filtra tímov z URL
    // Skontroluj, či existuje možnosť vo filtri tímov so zhodnou hodnotou z URL
    const teamOptionExists = Array.from(teamFilter.options).some(option => option.value === initialFilters.team);
    if (teamOptionExists) {
         teamFilter.value = initialFilters.team;
    } else {
         teamFilter.value = ''; // Ak hodnota z URL neexistuje v možnostiach, vynulovať
    }


    displayGroups(); // Zobraziť skupiny s aplikovanými filtrami z URL
    // *** KONIEC NOVEJ LOGIKY ***

});

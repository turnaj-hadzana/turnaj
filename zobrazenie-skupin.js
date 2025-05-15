// zobrazenie-skupin.js (Kompletný kód s filtrami, URL, zvýraznením, rozložením 3+2 A JS pre dynamickú šírku)

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencie na div, kde sa bude zobrazovať obsah skupín
const groupsDisplayContent = document.getElementById('groupsDisplayContent');
const categoryFilter = document.getElementById('categoryFilter'); // Referencia na filter kategórií
const groupFilter = document.getElementById('groupFilter'); // Referencia na filter skupín (nový)
const teamFilter = document.getElementById('teamFilter'); // Referencia na filter tímov
const clearFiltersButton = document.getElementById('clearFiltersButton'); // Referencia na tlačidlo vymazania filtrov

// ZABLOKOVAŤ FILTER SKUPÍN NA ZAČIATKU
groupFilter.disabled = true;


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
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        // Načítať skupiny
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));


        // Načítať tímy
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
    categoryFilter.innerHTML = '<option value="">Všetky kategórie</option>';
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name || category.id;
        categoryFilter.appendChild(option);
    });

    // Naplní filter skupín všetkými skupinami na začiatku (bude zablokovaný)
    populateGroupFilter('');

    // Naplniť filter tímov jedinečnými a upravenými názvami
    teamFilter.innerHTML = '<option value="">Všetky tímy</option>';

    const uniqueTeamNames = new Set();
    const processedTeamNames = [];

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
            processedTeamNames.push(baseName);
        }
    });

    // Zoradiť upravené názvy tímov abecedne (slovensky)
    processedTeamNames.sort((a, b) => a.localeCompare(b, 'sk-SK'));

    // Naplniť filter tímov zoradenými jedinečnými názvami
    processedTeamNames.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = teamName;
        teamFilter.appendChild(option);
    });
}

// Funkcia: Naplnenie filtra skupín podľa vybranej kategórie
function populateGroupFilter(categoryId) {
    groupFilter.innerHTML = '<option value="">Všetky skupiny</option>';

    const groupsToPopulate = categoryId
        ? allGroups.filter(group => group.categoryId === categoryId)
        : allGroups;

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

    history.replaceState(null, '', '?' + params.toString());
}


// *** NOVÁ JS LOGIKA PRE DYNAMICKÚ ŠÍRKU ***

// Funkcia na zistenie maximálnej šírky potrebnej pre zobrazenie obsahu všetkých tabuliek skupín
function findMaxTableContentWidth() {
    let maxWidth = 0;
    // Získame všetky elementy tabuliek skupín, ktoré sú už pridané do DOM
    const groupTables = groupsDisplayContent.querySelectorAll('.group-display');

    groupTables.forEach(table => {
        // Aby sme zistili skutočnú šírku potrebnú pre obsah, musíme tabuľke dočasne
        // povoliť roztiahnuť sa podľa obsahu a zmerať jej šírku.

        // Uložíme si pôvodné štýly, aby sme ich mohli obnoviť
        const originalStyles = {
            flexBasis: table.style.flexBasis,
            width: table.style.width,
            minWidth: table.style.minWidth,
            maxWidth: table.style.maxWidth,
            flexShrink: table.style.flexShrink,
            flexGrow: table.style.flexGrow
        };

        // Nastavíme štýly, ktoré umožnia tabuľke určiť si šírku podľa obsahu bez obmedzení
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


        // Ak je nameraná šírka väčšia ako doterajšie maximum, aktualizujeme maximum
        if (requiredWidth > maxWidth) {
            maxWidth = requiredWidth;
        }
    });

    // Pridáme malý extra priestor k maximálnej šírke pre istotu (napr. padding/border)
    // Hodnotu 20px môžete doladiť
    const safetyPadding = 20;
    return maxWidth + safetyPadding;
}

// Funkcia na nastavenie jednotnej šírky pre všetky tabuľky skupín
function setUniformTableWidth(width) {
    // Získame všetky elementy tabuliek skupín
    const groupTables = groupsDisplayContent.querySelectorAll('.group-display');

    groupTables.forEach(table => {
        // Nastavíme vypočítanú jednotnú šírku ako pevnú šírku pre každú tabuľku
        // Použijeme style.cssText alebo jednotlivo, dôležité je prekonať existujúce CSS pravidlá
        // (aj s !important v CSS by to mohlo byť problematické, lepšie je nastaviť priamo cez style)

        table.style.width = `${width}px`;
        table.style.minWidth = `${width}px`; // Minimálna šírka bude táto pevná šírka
        table.style.maxWidth = `${width}px`; // Maximálna šírka bude táto pevná šírka

        // Nastavíme flexbox vlastnosti tak, aby tabuľka držala túto pevnú šírku
        table.style.flexBasis = 'auto'; // Základňa sa bude riadiť nastavenou šírkou
        table.style.flexShrink = '0'; // Zakážeme zmenšovanie pod túto šírku
        table.style.flexGrow = '0'; // Zakážeme zväčšovanie nad túto šírku
    });

     // Poznámka: S pevnou šírkou a flex-shrink: 0 sa rozloženie 3+2 už nebude riadiť výpočtom v calc(),
     // ale tým, koľko ňouveľkých tabuliek sa zmestí do riadku. CSS pravidlo pre force-3-plus-2-layout
     // v CSS súbore by už nemalo obsahovať vlastnosti flex-basis, flex-shrink, min-width, max-width, width,
     // aby nekonfliktovalo s JS nastavenou šírkou. V CSS treba odstrániť tieto vlastnosti z pravidla
     // .groups-container.force-3-plus-2-layout .group-display
}

// *** KONIEC JS LOGIKY PRE DYNAMICKÚ ŠÍRKU ***


// Funkcia na zobrazenie skupín a tímov (s implementovaným filtrovaním a zvýraznením tímu)
function displayGroups() {
    if (!groupsDisplayContent) {
        console.error("Element pre zobrazenie skupín nenájdený!");
        // ULOŽIŤ FILTRE DO URL PRED PRÍPADNÝM PREDČASNÝM UKONČENÍM
        saveFiltersToUrl();
        return;
    }

    groupsDisplayContent.innerHTML = '';

    const selectedCategoryId = categoryFilter.value;
    const selectedGroupId = groupFilter.value;
    const selectedTeamNameFilter = teamFilter.value;


    let categoriesToDisplay = allCategories;
    let groupsToDisplay = allGroups;
    let teamsToDisplay = allTeams;

    // Krok 1: Filtrovanie podľa kategórie
    if (selectedCategoryId) {
        categoriesToDisplay = allCategories.filter(cat => cat.id === selectedCategoryId);
        groupsToDisplay = allGroups.filter(group => group.categoryId === selectedCategoryId);
        teamsToDisplay = allTeams.filter(team => team.categoryId === selectedCategoryId);
    }

    // Krok 2: Filtrovanie podľa skupiny (aplikuje sa na výsledok filtrovania podľa kategórie)
    if (selectedGroupId) {
         groupsToDisplay = groupsToDisplay.filter(group => group.id === selectedGroupId);
         teamsToDisplay = teamsToDisplay.filter(team => team.groupId === selectedGroupId);

         if (groupsToDisplay.length > 0) {
              const groupCategory = allCategories.find(cat => cat.id === groupsToDisplay[0].categoryId);
              if (groupCategory) {
                  categoriesToDisplay = [groupCategory];
              } else {
                  categoriesToDisplay = [];
              }
         } else {
             categoriesToDisplay = [];
         }
    }

    // Filtrovanie a zvýraznenie podľa upraveného názvu tímu
    let teamsMatchingNameFilter = [];
    if (selectedTeamNameFilter !== '') {
        teamsMatchingNameFilter = allTeams.filter(team =>
            (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase())
        );

         if (teamsMatchingNameFilter.length > 0) {
             const categoriesWithMatchingTeams = new Set();
             const groupsWithMatchingTeams = new Set();

             teamsMatchingNameFilter.forEach(team => {
                 const isInFilteredCategory = !selectedCategoryId || team.categoryId === selectedCategoryId;
                 const isInFilteredGroup = !selectedGroupId || team.groupId === selectedGroupId;

                 if (isInFilteredCategory && isInFilteredGroup) {
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
                         if (!selectedGroupId) {
                             const category = allCategories.find(c => c.id === team.categoryId);
                             if (category) {
                                 categoriesWithMatchingTeams.add(category);
                             }
                         }
                     }
                 }
             });

              categoriesToDisplay = Array.from(categoriesWithMatchingTeams);
              groupsToDisplay = Array.from(groupsWithMatchingTeams).filter(group =>
                  !selectedCategoryId || group.categoryId === selectedCategoryId
              );

         } else {
             categoriesToDisplay = [];
             groupsToDisplay = [];
             teamsToDisplay = [];
         }
    }

     // Ak po filtrovaní nie sú žiadne kategórie na zobrazenie, zobrazte správu a ukončite
     if (categoriesToDisplay.length === 0 && (selectedTeamNameFilter !== '' || selectedCategoryId !== '' || selectedGroupId !== '')) {
          let message = 'Žiadne skupiny ani tímy nezodpovedajú vybraným filtrom.';
           if (selectedTeamNameFilter !== '') {
               message = `Nenašli sa žiadne tímy zodpovedajúce filtru "${selectedTeamNameFilter}".`;
           }
          groupsDisplayContent.innerHTML = `<p>${message}</p>`;
          // ULOŽIŤ FILTRE DO URL PRED PREDČASNÝM UKONČENÍM
          saveFiltersToUrl();
          // *** Zavolať funkciu na nastavenie šírky aj v tomto prípade, aj keď nie sú skupiny ***
          setUniformTableWidth(findMaxTableContentWidth()); // Bude 0, ak nie sú tabuľky, čo je OK.
          // *** Koniec volania ***
          return;
     }

    // Zobraziť skupiny rozdelené podľa kategórií na zobrazenie
    categoriesToDisplay.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

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

        // NOVÁ LOGIKA: Pridať triedu pre 5 skupín pre špeciálne rozloženie (len pre vizuálne odlíšenie kontajnera ak treba, šírku nastaví JS)
        if (groupsInCategoryToDisplay.length === 5) {
            groupsContainerDiv.classList.add('force-3-plus-2-layout');
        } else {
            groupsContainerDiv.classList.remove('force-3-plus-2-layout');
        }

        categoryDiv.appendChild(groupsContainerDiv);

        groupsInCategoryToDisplay.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));


        if (groupsInCategoryToDisplay.length === 0 && allTeams.filter(team => team.categoryId === category.id && team.groupId && (selectedTeamNameFilter === '' || (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase()))).length === 0 ) {
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

                 const teamsInGroup = allTeams.filter(team => team.groupId === group.id);

                 if (teamsInGroup.length === 0) {
                     const noTeamsPara = document.createElement('p');
                     noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
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
                         teamNameSpan.textContent = team.name || 'Neznámy tím';

                         // ZVÝRAZNENIE TÍMOV, KTORÝCH NÁZOV ZAČÍNA VYFILTROVANOU ČASŤOU NÁZVU
                         if (selectedTeamNameFilter !== '' && (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase())) {
                             teamNameSpan.classList.add('highlighted-team');
                         } else {
                             teamNameSpan.classList.remove('highlighted-team');
                         }

                         teamItem.appendChild(teamNameSpan);
                         teamList.appendChild(teamItem);
                     });
                     groupDiv.appendChild(teamList);
                 }

                 groupsContainerDiv.appendChild(groupDiv);
             });
        }

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
                categoryHeader.style.backgroundColor = '#e9ecef !important'; // Použiť !important lebo li má iné pozadie
                categoryHeader.style.color = '#495057 !important'; // Použiť !important
                categoryHeader.textContent = `Kategória: ${teamCategory}`;
                unassignedList.appendChild(categoryHeader);
                currentCategory = teamCategory;
            }


            const teamItem = document.createElement('li');
            teamItem.textContent = team.name || 'Neznámy tím';

            // ZVÝRAZNENIE TÍMOV V NEPRIRADENÝCH, KTORÝCH NÁZOV ZAČÍNA VYFILTROVANOU ČASŤOU NÁZVU
            if (selectedTeamNameFilter !== '' && (team.name || '').toLowerCase().startsWith(selectedTeamNameFilter.toLowerCase())) {
                 teamItem.classList.add('highlighted-team');
            } else {
                 teamItem.classList.remove('highlighted-team');
            }

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

     // ULOŽIŤ FILTRE DO URL PO ZOBRAZENÍ
     saveFiltersToUrl();

     // *** VOLANIE FUNKCIÍ NA DYNAMICKÚ ŠÍRKU PO VYTVORENÍ TABULIEK ***
     const uniformWidth = findMaxTableContentWidth();
     if (uniformWidth > 0) { // Nastavíme šírku iba ak sú nejaké tabuľky a našla sa max šírka
        setUniformTableWidth(uniformWidth);
     }
     // *** KONIEC VOLANIA ***
}


// Pridanie poslucháčov udalostí pre filtre
categoryFilter.addEventListener('change', () => {
    const selectedCategoryId = categoryFilter.value;

    if (selectedCategoryId === '') {
        groupFilter.value = '';
        groupFilter.disabled = true;
        populateGroupFilter('');
    } else {
        groupFilter.disabled = false;
        populateGroupFilter(selectedCategoryId);
        groupFilter.value = '';
    }

    displayGroups();
});

groupFilter.addEventListener('change', displayGroups);
teamFilter.addEventListener('change', displayGroups);

// Poslucháč pre tlačidlo vymazania filtrov
clearFiltersButton.addEventListener('click', () => {
    categoryFilter.value = '';
    groupFilter.value = '';
    groupFilter.disabled = true;
    populateGroupFilter('');
    teamFilter.value = '';
    displayGroups();
});


// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín.");
    await loadAllTournamentData();

    populateFilters();

    const initialFilters = getFiltersFromUrl();

    categoryFilter.value = initialFilters.category;

    if (initialFilters.category) {
        groupFilter.disabled = false;
        populateGroupFilter(initialFilters.category);
        const groupOptionExists = Array.from(groupFilter.options).some(option => option.value === initialFilters.group);
         if (groupOptionExists) {
              groupFilter.value = initialFilters.group;
         } else {
              groupFilter.value = '';
         }

    } else {
         groupFilter.value = '';
         groupFilter.disabled = true;
         populateGroupFilter('');
    }

    const teamOptionExists = Array.from(teamFilter.options).some(option => option.value === initialFilters.team);
    if (teamOptionExists) {
         teamFilter.value = initialFilters.team;
    } else {
         teamFilter.value = '';
    }

    displayGroups();
});

window.addEventListener('resize', () => {
     const uniformWidth = findMaxTableContentWidth();
      if (uniformWidth > 0) {
         setUniformTableWidth(uniformWidth);
      }
 });

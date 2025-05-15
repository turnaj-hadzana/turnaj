// spravca-turnaja-zoznam-timov.js (Celý kód s filtrami a opravou SyntaxError)

// Import necessary functions and references from common.js
import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef,
         openModal, closeModal, // openModal a closeModal by mali byť definované v common.js alebo inom module
         doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc, writeBatch } from './spravca-turnaja-common.js';


// Získanie referencií na elementy DOM modálov a tabuľky
const teamCreationModal = document.getElementById('teamCreationModal');
const teamCreationModalClose = teamCreationModal ? teamCreationModal.querySelector('.close') : null;
const teamCreationForm = document.getElementById('teamCreationForm');
const teamNameInput = document.getElementById('teamNameInput');
const teamCategoryCountContainer = document.getElementById('teamCategoryCountContainer');
const addCategoryCountPairButton = document.getElementById('addCategoryCountPairButton');
const createdTeamsTableBody = document.getElementById('createdTeamsTableBody');
const createdTeamsTableHeader = document.getElementById('createdTeamsTableHeader');

// Referencie na elementy a premenné súvisiace s modálom Správa tímov
const manageTeamsModal = document.getElementById('manageTeamsModal');
const manageTeamsModalClose = manageTeamsModal ? manageTeamsModal.querySelector('.close') : null;
const baseTeamNameInModal = document.getElementById('baseTeamNameInModal');
const teamsListInModal = document.getElementById('teamsListInModal');


// Referencie na elementy a premenné súvisiace s modálom Priradiť/Upraviť Klub
const clubModal = document.getElementById('clubModal');
const clubModalClose = clubModal ? clubModal.querySelector('.close') : null;
const clubModalTitle = document.getElementById('clubModalTitle');
const clubForm = document.getElementById('clubForm');
const clubNameField = document.getElementById('clubNameField');
const clubNameInput = document.getElementById('clubName');
const clubAssignmentFields = document.getElementById('clubAssignmentFields');
const clubCategorySelect = document.getElementById('clubCategorySelect');
const clubGroupSelect = document.getElementById('clubGroupSelect');
const orderInGroupInput = document.getElementById('orderInGroup');
const unassignedClubField = document.getElementById('unassignedClubField');
const unassignedClubSelect = document.getElementById('unassignedClubSelect');

// Referencie na filter elementy (NOVÉ)
const teamNameFilterInput = document.getElementById('teamNameFilter');
const categoryFilterSelect = document.getElementById('categoryFilter');
const groupFilterSelect = document.getElementById('groupFilter');


// Dátové premenné
let allAvailableCategories = []; // Pole na uloženie všetkých dostupných kategórií
let allAvailableGroups = []; // Pole na uloženie všetkých dostupných skupín s dátami
let allTeams = []; // Pole na uloženie všetkých načítaných tímov (pre filtrovanie)

// Premenné na sledovanie stavu modálu klubu
let editingClubId = null;
let currentClubModalMode = 'assign';


// --- Pomocné funkcie pre prácu s názvom tímu ---

// Funkcia na parsovanie názvu tímu na kategóriu a základný názov
function parseTeamName(fullTeamName) {
    if (!fullTeamName || typeof fullTeamName !== 'string') {
        return { categoryPrefix: 'N/A', baseName: fullTeamName || 'Neznámy názov' };
    }
    const parts = fullTeamName.split(' - ');
    if (parts.length >= 2) {
        const categoryPrefix = parts[0].trim();
        const baseName = parts.slice(1).join(' - ').trim(); // Zvyšok spojiť ako základný názov
        return { categoryPrefix, baseName };
    }
    return { categoryPrefix: 'N/A', baseName: fullTeamName.trim() }; // Ak formát nezodpovedá, vrátiť pôvodný názov ako základný
}

// Funkcia na zostavenie názvu tímu z kategórie a základného názvu + suffixu (napr. "U12 CH - Spartak A")
function buildFullTeamName(categoryPrefix, baseName, suffix = '') {
     const name = `${categoryPrefix} - ${baseName}${suffix ? ' ' + suffix : ''}`;
     // Odstrániť dvojité medzery vzniknuté spájaním a orieznuť
     return name.replace(/\s\s+/g, ' ').trim();
}


// --- Funkcie pre načítanie dát a filtrov ---

// Funkcia na načítanie všetkých kategórií z databázy pre dynamické selectboxy A FILTER
async function loadAllCategories() {
     console.log("Načítavam kategórie...");
     allAvailableCategories = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(categoriesCollectionRef);
         querySnapshot.forEach((doc) => {
             const categoryData = doc.data();
             // Pridáme kategóriu iba ak existuje a má platné 'name' pole
             // !! Tu sa predpoklada, ze name pole EXISTUJE - toto zavisi od opravy v spravca-turnaja-kategorie.js !!
             if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
             } else {
                  // Ak name chýba, pouzijeme ID aj ako meno pre zobrazenie
                 allAvailableCategories.push({ id: doc.id, name: doc.id });
                 console.warn("Kategória dokument s ID", doc.id, "má chýbajúce, neplatné alebo prázdne 'name' pole. Používam ID ako názov.");
             }
         });
         // Zoradiť kategórie podľa mena pre lepší prehľad
         allAvailableCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

         console.log("Načítané kategórie (allAvailableCategories):", allAvailableCategories);
         // Naplniť filter kategórií
         populateCategoryFilter(allAvailableCategories);
         // Po načítaní kategórií, aktualizovať všetky dynamické selectboxy pre vytváranie tímov
         updateDynamicCategorySelects(); // Táto funkcia potrebuje allAvailableCategories


     } catch (e) {
         console.error("Chyba pri načítaní kategórií: ", e);
         alert("Nepodarilo sa načítať kategórie.");
     }
}

// Funkcia na načítanie všetkých skupín (Potrebné pre filter a modál klubu) - Načíta celé dáta skupiny
async function loadAllGroupsData() {
     console.log("Načítavam skupiny...");
     allAvailableGroups = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(groupsCollectionRef);
         querySnapshot.forEach((doc) => {
             const groupData = doc.data();
              if (groupData) {
                   allAvailableGroups.push({ id: doc.id, data: groupData }); // Uložiť celé dáta skupiny
              } else {
                   console.warn("Skupina dokument s ID", doc.id, "má prázdne dáta.");
              }
         });
         // Zoradiť skupiny podľa názvu pre lepší prehľad vo filtri a selectoch
         // Ak chýba name, použiť id na zoradenie
         allAvailableGroups.sort((a, b) => {
              const nameA = (a.data?.name || a.id) || '';
              const nameB = (b.data?.name || b.id) || '';
              return nameA.localeCompare(nameB, 'sk-SK');
         });
         console.log("Načítané skupiny (allAvailableGroups s dátami):", allAvailableGroups);

     } catch (e) {
         console.error("Chyba pri načítaní skupín:", e);
         alert("Nepodarilo sa načítať skupiny pre filtre.");
     }
}


// Funkcia na naplnenie filtra kategórií
function populateCategoryFilter(categories) {
    if (!categoryFilterSelect) return;
    const currentSelected = categoryFilterSelect.value;
    categoryFilterSelect.innerHTML = '<option value="">Všetky kategórie</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name; // Použiť meno (alebo ID ak chýba)
        categoryFilterSelect.appendChild(option);
    });
    // Zachovať vybranú hodnotu po naplnení
    if (currentSelected && categoryFilterSelect.querySelector(`option[value="${currentSelected}"]`)) {
        categoryFilterSelect.value = currentSelected;
    } else {
        categoryFilterSelect.value = "";
    }
}

// Funkcia na naplnenie filtra skupín
function populateGroupFilter(groups) {
     if (!groupFilterSelect) return;
     const currentSelected = groupFilterSelect.value;
     groupFilterSelect.innerHTML = '<option value="">Všetky skupiny</option>';
     // Pridať špeciálnu možnosť pre nepriradené tímy
     const unassignedOption = document.createElement('option');
     unassignedOption.value = 'UNASSIGNED'; // Unikátna hodnota pre nepriradené
     unassignedOption.textContent = 'Nepriradené';
     groupFilterSelect.appendChild(unassignedOption);

     groups.forEach(group => {
          const option = document.createElement('option');
          option.value = group.id; // Hodnota filtra bude ID skupiny
           // Zobraziť názov skupiny (z poľa name), alebo ID ak name chýba, s prefixom kategórie
          const displayedGroupName = group.data?.name || group.id;
          const categoryPrefix = group.data?.categoryId || 'Neznáma kategória';
          option.textContent = `${categoryPrefix} - ${displayedGroupName}`; // Zobraziť kategóriu aj názov skupiny
          option.dataset.categoryId = group.data?.categoryId;
          groupFilterSelect.appendChild(option);
     });
     // Zoradiť možnosti filtra skupín (okrem "Všetky" a "Nepriradené")
      const options = Array.from(groupFilterSelect.options);
      // Slicerom vyberieme len možnosti skupín (preskočíme "Všetky" a "Nepriradené")
      const groupOptions = options.filter(opt => opt.value !== "" && opt.value !== "UNASSIGNED");

      // Zoradiť tieto možnosti podľa textContentu
      groupOptions.sort((a, b) => a.textContent.localeCompare(b.textContent, 'sk-SK'));

      // Odstrániť pôvodné možnosti skupín a pridať ich sortované
      options.filter(opt => opt.value !== "" && opt.value !== "UNASSIGNED").forEach(option => option.remove());
      groupOptions.forEach(option => groupFilterSelect.appendChild(option));

      // Zachovať vybranú hodnotu po naplnení
      if (currentSelected && groupFilterSelect.querySelector(`option[value="${currentSelected}"]`)) {
           groupFilterSelect.value = currentSelected;
      } else {
           groupFilterSelect.value = "";
      }
}


// Funkcia na filtrovanie tímov na základe aktuálnych hodnôt filtrov
function filterTeams() {
    const teamNameFilterValue = teamNameFilterInput ? teamNameFilterInput.value.toLowerCase().trim() : '';
    const categoryFilterValue = categoryFilterSelect ? categoryFilterSelect.value : '';
    const groupFilterValue = groupFilterSelect ? groupFilterSelect.value : '';

    console.log("Aplikujem filtre:", { teamName: teamNameFilterValue, category: categoryFilterValue, group: groupFilterValue });

    const filteredTeams = allTeams.filter(team => {
        // Filter podľa názvu tímu (case-insensitive, či názov tímu (pole 'name') obsahuje zadaný reťazec)
        const teamNameMatch = team.name && team.name.toLowerCase().includes(teamNameFilterValue);

        // Filter podľa kategórie
        // team.categoryId je ID kategórie uložené pri tíme
        const categoryMatch = categoryFilterValue === '' || (team.categoryId && team.categoryId === categoryFilterValue);

         // Filter podľa skupiny
         let groupMatch = true; // Predvolene platí (zobrazia sa všetky tímy bez ohľadu na skupinu, ak filter skupiny nie je nastavený)

         if (groupFilterValue === 'UNASSIGNED') {
              // Filter pre nepriradené tímy (groupId musí byť null alebo undefined/chýba)
              groupMatch = team.groupId === null || typeof team.groupId === 'undefined';
         } else if (groupFilterValue !== '') {
              // Filter pre konkrétnu skupinu (team.groupId musí presne zodpovedať hodnote filtra skupiny - čo je ID skupiny)
              groupMatch = team.groupId && team.groupId === groupFilterValue;
         }


        return teamNameMatch && categoryMatch && groupMatch;
    });

    console.log(`Nájdených tímov po filtrovaní: ${filteredTeams.length}`);

    // Vykresliť filtrované tímy
    renderTeamsTable(filteredTeams);
}

// Funkcia na načítanie všetkých tímov, kategórií a skupín a inicializáciu zobrazenia a filtrov
async function loadAndDisplayAllTeams() {
    console.log("Načítavam všetky tímy, kategórie a skupiny...");
    try {
        // Načítať tímy
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Načítaných celkom tímov: ${allTeams.length}`);

        // Načítať kategórie
        await loadAllCategories(); // Táto funkcia už naplní allAvailableCategories a populateCategoryFilter

        // Načítať skupiny
        await loadAllGroupsData(); // Táto funkcia už naplní allAvailableGroups
        populateGroupFilter(allAvailableGroups); // Naplniť filter skupín

        // Po načítaní všetkých dát, aplikovať filtre (ak sú nejaké prednastavené) a zobraziť výsledok
        filterTeams(); // Volanie filterTeams automaticky volá renderTeamsTable s filtrovanými dátami

         // Pridať listenery na filtre po načítaní dát (ak ešte neboli pridané)
         // Odstránime existujúce listenery pred pridaním nových, aby sme predišli duplikátom pri opakovanom volaní loadAndDisplayAllTeams
         if (teamNameFilterInput) teamNameFilterInput.removeEventListener('input', filterTeams);
         if (categoryFilterSelect) categoryFilterSelect.removeEventListener('change', filterTeams);
         if (groupFilterSelect) groupFilterSelect.removeEventListener('change', filterTeams);

         if (teamNameFilterInput) teamNameFilterInput.addEventListener('input', filterTeams);
         if (categoryFilterSelect) categoryFilterSelect.addEventListener('change', filterTeams);
         if (groupFilterSelect) groupFilterSelect.addEventListener('change', filterTeams);


    } catch (e) {
        console.error("Chyba pri úvodnom načítaní dát pre zoznam tímov:", e);
        // Zobraziť chybovú správu v tabuľke, ak sa nepodarí načítať základné dáta
         if (!createdTeamsTableBody || !createdTeamsTableHeader) {
             console.error("Tabuľka pre vytvorené tímy nenájdená!");
             return;
         }
         createdTeamsTableBody.innerHTML = '';
         if (createdTeamsTableHeader.innerHTML === '') {
              createdTeamsTableHeader.innerHTML = `
                   <tr>
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                        <th>Akcie</th>
                   </tr>
              `;
         }
         const errorRow = createdTeamsTableBody.insertRow();
         const errorCell = errorRow.insertCell();
         errorCell.colSpan = 5;
         errorCell.style.textAlign = 'center';
         errorCell.textContent = 'Nepodarilo sa načítať zoznam tímov.';
    }
}


// --- Funkcie pre Modál Vytvoriť tímy (ponechané, len aktualizované volania loadAndDisplayAllTeams) ---

// Funkcia na naplnenie dynamického selectboxu s kategóriami (pre vytváranie tímov) - Používa sa v addCategoryCountPair a updateDynamicCategorySelects
function populateDynamicCategorySelect(selectElement, selectedId = '', availableCategories, categoriesToDisable = []) {
     if (!selectElement) return;
     const currentSelected = selectElement.value;
     selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
     availableCategories.forEach(category => {
         const option = document.createElement('option');
         option.value = category.id;
         option.textContent = category.name; // Použiť meno (alebo ID ak chýba)
         if (categoriesToDisable.includes(category.id)) {
             option.disabled = true;
         }
         selectElement.appendChild(option);
     });
      if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
          selectElement.value = selectedId;
      } else if (currentSelected && selectElement.querySelector(`option[value="${currentSelected}"]`)) {
           selectElement.value = currentSelected;
      } else {
           selectElement.value = "";
      }
      if (selectElement.options.length <= 1 && selectElement.value === "") { // Ak je len placeholder a ten je vybraný
          selectElement.disabled = true;
      } else {
          selectElement.disabled = false;
      }
}

// Funkcia na aktualizáciu všetkých dynamických selectboxov s dostupnými kategóriami (pre vytváranie tímov)
function updateDynamicCategorySelects() {
    const allSelectElements = teamCategoryCountContainer ? teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic') : [];
    const currentlySelectedCategoryIds = Array.from(allSelectElements).map(select => select.value).filter(value => value !== '');

    allSelectElements.forEach(selectElement => {
        const currentSelectedId = selectElement.value;
        const categoryIdsToDisable = currentlySelectedCategoryIds.filter(catId => catId !== currentSelectedId);
        populateDynamicCategorySelect(selectElement, currentSelectedId, allAvailableCategories, categoryIdsToDisable);
    });
     checkIfAddCategoryCountPairButtonShouldBeVisible();
     updateRemoveButtonVisibility();
}

// Funkcia na kontrolu viditeľnosti tlačidla Odstrániť (pre vytváranie tímov)
function updateRemoveButtonVisibility() {
    const removeButtons = teamCategoryCountContainer ? teamCategoryCountContainer.querySelectorAll('.category-count-pair .delete-button') : [];
    if (removeButtons.length > 1) {
        removeButtons.forEach(button => button.style.visibility = 'visible');
    } else {
        removeButtons.forEach(button => button.style.visibility = 'hidden');
    }
}

// Funkcia na kontrolu viditeľnosti tlačidla Pridať ďalšiu kategóriu (pre vytváranie tímov)
function checkIfAddCategoryCountPairButtonShouldBeVisible() {
    const allSelectElements = teamCategoryCountContainer ? teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic') : [];
    const numberOfPairs = allSelectElements.length;
    const numberOfAvailableCategories = allAvailableCategories.length;

    if (addCategoryCountPairButton) {
        if (numberOfPairs < numberOfAvailableCategories) {
            addCategoryCountPairButton.style.display = 'inline-block'; // Zobraziť
        } else {
            addCategoryCountPairButton.style.display = 'none'; // Skryť
        }
    }
}


// Funkcia na pridá nový riadok pre výber kategórie a zadanie počtu tímov v modále Vytvoriť tímy
async function addCategoryCountPair(initialCategoryId = null) {
     const container = document.getElementById('teamCategoryCountContainer');
     if (!container) { console.error('teamCategoryCountContainer not found!'); return; }

     const pairDiv = document.createElement('div');
     pairDiv.classList.add('category-count-pair');

     const selectContainer = document.createElement('div');
     const categorySelectLabel = document.createElement('label');
     categorySelectLabel.textContent = 'Kategória:';
     const categorySelect = document.createElement('select');
     categorySelect.classList.add('team-category-select-dynamic');
     categorySelect.name = 'category';
     categorySelect.required = true;
     categorySelect.addEventListener('change', () => {
         updateDynamicCategorySelects();
     });
     selectContainer.appendChild(categorySelectLabel);
     selectContainer.appendChild(categorySelect);

     const inputContainer = document.createElement('div');
     const teamCountLabel = document.createElement('label');
     teamCountLabel.textContent = 'Počet tímov:';
     const teamCountInput = document.createElement('input');
     teamCountInput.classList.add('team-count-input-dynamic');
     teamCountInput.type = 'number';
     teamCountInput.name = 'count';
     teamCountInput.min = '1';
     teamCountInput.value = '1';
     teamCountInput.required = true;
     inputContainer.appendChild(teamCountLabel);
     inputContainer.appendChild(teamCountInput);

     const removeButton = document.createElement('button');
     removeButton.textContent = 'Odstrániť';
     removeButton.classList.add('action-button', 'delete-button');
     removeButton.type = 'button';

     removeButton.onclick = () => {
         pairDiv.remove();
         updateDynamicCategorySelects();
         updateRemoveButtonVisibility();
         checkIfAddCategoryCountPairButtonShouldBeVisible();
     };

     pairDiv.appendChild(selectContainer);
     pairDiv.appendChild(inputContainer);
     pairDiv.appendChild(removeButton);

     container.appendChild(pairDiv);

      if (allAvailableCategories.length === 0) {
           console.warn("Kategórie nie sú načítané pri pridávaní nového páru.");
           // Pokus o načítanie, ale nemusí byť dokončené hneď
           loadAllCategories(); // Volá sa pri otvorení modalu, ale pre istotu
      }

      const allSelectElementsBeforeAdding = container.querySelectorAll('.team-category-select-dynamic');
      const categoriesSelectedInOthers = Array.from(allSelectElementsBeforeAdding)
          .map(select => select.value)
          .filter(value => value !== '' && value !== initialCategoryId);

      populateDynamicCategorySelect(
         categorySelect,
         initialCategoryId,
         allAvailableCategories,
         categoriesSelectedInOthers
      );

       updateDynamicCategorySelects();
       updateRemoveButtonVisibility();
       checkIfAddCategoryCountPairButtonShouldBeVisible();

     setTimeout(() => {
          categorySelect.focus();
     }, 0);
}

// Funkcia na otvorenie modálneho okna Vytvoriť tímy
export async function openTeamCreationModal() {
     console.log("Otváram modál Vytvoriť tímy");
     if (!teamCreationModal || !teamCreationForm || !teamCategoryCountContainer || !teamNameInput) {
          console.error("Elementy modálu Vytvoriť tímy nenájdené!");
          alert("Nastala chyba pri otváraní modálu vytvorenia tímov.");
          return;
     }

     if (teamCreationForm) teamCreationForm.reset();
     if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';

     // Kategórie by mali byť načítané už pri štarte stránky. Ak nie, načítať ich.
     if (allAvailableCategories.length === 0) {
          await loadAllCategories(); // Táto funkcia aj populateCategoryFilter a updateDynamicCategorySelects
     } else {
          // Ak už sú načítané, len aktualizovať dynamické selectboxy pre istotu
          updateDynamicCategorySelects();
     }


     await addCategoryCountPair();
     openModal(teamCreationModal);
     checkIfAddCategoryCountPairButtonShouldBeVisible();

     // Zamerať na input názvu tímu pri otvorení
     setTimeout(() => {
         if (teamNameInput) teamNameInput.focus();
     }, 0);
}

// Funkcia na zatvorenie modálneho okna Vytvoriť tímy
function closeTeamCreationModal() {
     console.log("Zatváram modál Vytvoriť tímy");
     closeModal(teamCreationModal);
     if (teamCreationForm) teamCreationForm.reset();
     if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
      // Po zatvorení modálu sa už volá loadAndDisplayAllTeams
}


// --- Funkcie pre Modál Správa tímov (opravené duplicitné appendChild) ---

// Funkcia na otvorenie modálneho okna Správa tímov pre konkrétny základný názov
export async function openManageTeamsModal(baseName) {
    console.log("Otváram modál Správa tímov pre základný názov:", baseName);
    if (!manageTeamsModal || !baseTeamNameInModal || !teamsListInModal) {
        console.error("Elementy modálu Správa tímov nenájdené!");
        return;
    }

    baseTeamNameInModal.textContent = `Tímy: ${baseName}`;
    teamsListInModal.innerHTML = '';

    try {
        const q = query(clubsCollectionRef, where("createdFromBase", "==", baseName));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            teamsListInModal.innerHTML = '<p>Žiadne tímy s týmto základným názvom.</p>';
        } else {
            const teamsByCategory = {};
            querySnapshot.forEach(doc => {
                 const team = { id: doc.id, ...doc.data() };
                 // Získať kategóriu z parsovaného názvu tímu, ak je kategória uložená v názve
                 const { categoryPrefix } = parseTeamName(team.name || team.id); // Použiť team.id ak name chýba
                 const category = categoryPrefix || 'Nepriradená kategória';

                 if (!teamsByCategory[category]) {
                      teamsByCategory[category] = [];
                 }
                 teamsByCategory[category].push(team);
            });

            const sortedCategories = Object.keys(teamsByCategory).sort((a, b) => a.localeCompare(b, 'sk-SK'));

            sortedCategories.forEach(categoryName => {
                const teamsInThisCategory = teamsByCategory[categoryName];

                const categoryHeading = document.createElement('h3');
                categoryHeading.textContent = categoryName;
                teamsListInModal.appendChild(categoryHeading);

                 const categoryTeamsTable = document.createElement('table');
                 categoryTeamsTable.classList.add('group-clubs-table');
                 categoryTeamsTable.style.tableLayout = 'auto';
                 categoryTeamsTable.style.width = '100%';

                 const thead = document.createElement('thead');
                 const headerRow = document.createElement('tr');

                 const teamNameTh = document.createElement('th');
                 teamNameTh.textContent = 'Názov tímu';

                 const groupTh = document.createElement('th');
                 groupTh.textContent = 'Skupina';
                 groupTh.style.whiteSpace = 'nowrap';

                 const orderTh = document.createElement('th');
                 orderTh.textContent = 'Poradie';
                 orderTh.style.textAlign = 'center';
                 orderTh.style.whiteSpace = 'nowrap';

                 const actionsTh = document.createElement('th');
                 actionsTh.textContent = '';
                 actionsTh.style.whiteSpace = 'nowrap';

                 headerRow.appendChild(teamNameTh);
                 headerRow.appendChild(groupTh);
                 headerRow.appendChild(orderTh);
                 headerRow.appendChild(actionsTh); // Správne: Pridať hlavičku Akcie k riadku hlavičky
                 thead.appendChild(headerRow);
                 categoryTeamsTable.appendChild(thead);

                const tbody = document.createElement('tbody');

                 teamsInThisCategory.sort((a, b) => { // Toto je riadok 537 v predch. kode - tu bola reportovana chyba
                     const isAssignedA = a.groupId !== null && typeof a.groupId !== 'undefined';
                     const isAssignedB = b.groupId !== null && typeof b.groupId !== 'undefined';
                     if (isAssignedA !== isAssignedB) {
                         return isAssignedA ? 1 : -1;
                     }

                     if (isAssignedA) {
                         const groupA = a.groupId || '';
                         const groupB = b.groupId || '';
                         const orderA = typeof a.orderInGroup === 'number' ? a.orderInGroup : Infinity;
                         const orderB = typeof b.orderInGroup === 'number' ? b.orderInGroup : Infinity;

                         if (groupA !== groupB) {
                             return groupA.localeCompare(groupB, 'sk-SK');
                         }
                         if (orderA !== orderB) {
                             return orderA - orderB;
                         }
                     }

                     const nameA = a.name || '';
                     const nameB = b.name || '';
                     return nameA.localeCompare(nameB, 'sk-SK');
                 });


                teamsInThisCategory.forEach(team => {
                    const tr = document.createElement('tr');
                    tr.dataset.teamId = team.id;

                    const nameTd = document.createElement('td');
                    nameTd.textContent = team.name || team.id || 'Neznámy názov';

                    const groupTd = document.createElement('td');
                    const groupNameParts = (team.groupId || '').split(' - ');
                    const displayedGroupName = team.groupId ? (groupNameParts.length > 1 ? groupNameParts.slice(1).join(' - ') : team.groupId) : 'Nepriradené';
                    groupTd.textContent = displayedGroupName;


                    const orderTd = document.createElement('td');
                    orderTd.textContent = (team.groupId && typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-';
                    orderTd.style.textAlign = 'center';

                    const actionsTd = document.createElement('td');
                    actionsTd.classList.add('actions-cell');
                    actionsTd.style.whiteSpace = 'nowrap';
                    actionsTd.style.display = 'flex';
                    actionsTd.style.justifyContent = 'center';
                    actionsTd.style.alignItems = 'center';
                    actionsTd.style.gap = '5px';


                    const editButton = document.createElement('button');
                    editButton.textContent = 'Upraviť / Priradiť';
                    editButton.classList.add('action-button');
                    editButton.onclick = () => {
                        closeManageTeamsModal();
                         if (typeof openClubModal === 'function') {
                             openClubModal(team.id, 'edit');
                         } else {
                              console.error("Funkcia openClubModal nie je dostupná.");
                             alert("Funkcia na úpravu tímu nie je dostupná.");
                         }
                    };

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Vymazať';
                    deleteButton.classList.add('action-button', 'delete-button');
                    deleteButton.onclick = async () => {
                        if (confirm(`Naozaj chcete vymazať tím "${team.id}"?`)) {
                            await deleteTeam(team.id);
                            await openManageTeamsModal(baseName); // Znovu otvoriť modal s aktualizovaným zoznamom
                        }
                    };

                    // !!! OPRAVA: Odstránené duplicitné alebo nesprávne umiestnené appendChild volania !!!
                    // actionsTh.appendChild(editButton); // REMOVED
                    // actionsTd.appendChild(deleteButton); // Tento bol správny, ale celý blok bude preusporiadaný
                    // actionsTd.appendChild(editButton); // REMOVED (duplikát)


                    // Správne pridanie tlačidiel k akčnej bunke pre DANÝ riadok
                    actionsTd.appendChild(editButton);
                    actionsTd.appendChild(deleteButton);


                    // Pridanie buniek k riadku
                    tr.appendChild(nameTd);
                    tr.appendChild(groupTd);
                    tr.appendChild(orderTd);
                    tr.appendChild(actionsTd); // Pridanie akčnej bunky k riadku

                    // Pridanie riadku k telu tabuľky
                    tbody.appendChild(tr);
                });
                categoryTeamsTable.appendChild(tbody);
                teamsListInModal.appendChild(categoryTeamsTable);
            });
        }

        openModal(manageTeamsModal);

    } catch (e) {
        console.error("Chyba pri načítaní tímov pre správu:", e);
        teamsListInModal.innerHTML = '<p>Nepodarilo sa načítať tímy pre správu.</p>';
    }
}


// Funkcia na zatvorenie modálneho okna Správa tímov
export function closeManageTeamsModal() {
    console.log("Zatváram modál Správa tímov");
    closeModal(manageTeamsModal);
     // Po zatvorení modalu Správa tímov (ktorý mohol byť otvorený z hlavného zoznamu)
     // znovu načítať a zobraziť hlavný zoznam pre prípad, že sa niečo zmenilo (vymazanie)
    loadAndDisplayAllTeams();
}


// --- Funkcie pre Modál Priradiť/Upraviť Klub (používané aj inde, napr. v Správa tímov modále) ---

// Funkcia na naplnenie selectboxu skupín (Potrebné pre modál klubu) - Používa sa v openClubModal
// Používa allAvailableGroups načítané v loadAllGroupsData
function populateGroupSelectForClubModal(selectElement, selectedId = '', availableGroups, categoryId = null) {
    console.log("Napĺňam select skupín v modále klubu.", { selectedId, categoryId, availableGroupsCount: availableGroups.length });
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';

    // Filtrovať skupiny podľa categoryId tímu, ktorý upravujeme/priradzujeme
    const filteredGroups = categoryId
        ? availableGroups.filter(group => group.data?.categoryId === categoryId) // Filtrujeme podľa categoryId v dátach skupiny
        : availableGroups.filter(group => group.data?.categoryId); // Ak nie je zadaná kategória, zobraziť len tie s categoryId

    console.log("Filtrované skupiny pre select v modále:", filteredGroups);

    if (filteredGroups.length === 0 && categoryId) {
         const category = allAvailableCategories.find(cat => cat.id === categoryId);
         const categoryName = category ? category.name : categoryId;
         const option = document.createElement('option');
         option.value = "";
         option.textContent = `-- Žiadne skupiny v kategórii "${categoryName}" --`;
         option.disabled = true;
         selectElement.appendChild(option);
    } else if (filteredGroups.length === 0 && !categoryId) {
         const option = document.createElement('option');
         option.value = "";
         option.textContent = `-- Najprv vyberte kategóriu (v režime assign vyberte tím) --`;
         option.disabled = true;
         selectElement.appendChild(option);
    }
    else {
         filteredGroups.forEach(group => {
             const option = document.createElement('option');
             option.value = group.id; // ID dokumentu skupiny (napr. "U12 CH - Skupina A")
              // Zobraziť názov skupiny (z poľa name), alebo ID ak name chýba
             const displayedGroupName = group.data?.name || group.id;
             option.textContent = displayedGroupName;
             selectElement.appendChild(option);
         });
    }

     if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
         selectElement.value = selectedId;
     } else {
          selectElement.value = "";
     }
     console.log("Naplnenie selectu skupín v modále dokončené.");
}


// Funkcia na naplnenie selectboxu s nepriradenými klubmi (Potrebné pre modál klubu v režime 'assign') - Používa sa v openClubModal
async function populateUnassignedClubsSelect() {
     console.log("Načítavam nepriradené tímy/kluby...");
     if (!unassignedClubSelect) { console.error("Unassigned club select not found!"); return; }

     unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
     unassignedClubSelect.disabled = false;

     try {
         const q = query(clubsCollectionRef, where("groupId", "==", null)); // Pouzivame groupId
         const querySnapshot = await getDocs(q);

         if (querySnapshot.empty) {
              const option = document.createElement('option');
              option.value = "";
              option.textContent = "Žiadne nepriradené tímy";
              option.disabled = true;
              unassignedClubSelect.appendChild(option);
              unassignedClubSelect.disabled = true;
             console.log("Žiadne nepriradené tímy nájdené. Select nepriradených tímov zakázaný.");
         } else {
             const unassignedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

             unassignedTeams.forEach(team => {
                 const option = document.createElement('option');
                 option.value = team.id;
                 option.textContent = team.name || team.id; // Zobraziť názov tímu, alebo ID ak názov chýba
                 option.dataset.categoryId = team.categoryId; // Uložiť categoryId do datasetu option
                 unassignedClubSelect.appendChild(option);
             });
             console.log("Nepriradené tímy načítané a spracované:", unassignedTeams.length);
         }

     } catch (e) {
         console.error("Chyba pri načítaní nepriradených tímov:", e);
         const option = document.createElement('option');
         option.value = "";
         option.textContent = "Chyba pri načítaní tímov";
         option.disabled = true;
         unassignedClubSelect.appendChild(option);
         unassignedClubSelect.disabled = true;
     }
}

// Funkcia na otvorenie modálneho okna Priradiť/Upraviť Klub - Používa sa z tabuľky
export async function openClubModal(clubId = null, mode = 'assign') {
    console.log(`Otváram modál Klub v režime: ${mode}, ID: ${clubId}`);
     if (!clubModal || !clubModalTitle || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect) {
          console.error("Elementy modálu Klub nenájdené!");
          alert("Nastala chyba pri otváraní modálu klubu. Prosím, kontaktujte podporu.");
          return;
     }

    clubForm.reset();
    editingClubId = clubId;
    currentClubModalMode = mode;

     // Skupiny a kategórie by mali byť načítané už pri štarte stránky. Ak nie, načítať.
     if (allAvailableGroups.length === 0) {
         await loadAllGroupsData();
     }
     if (allAvailableCategories.length === 0) {
         await loadAllCategories();
     }


     if (mode === 'assign') {
        clubModalTitle.textContent = 'Priradiť nepriradený tím/klub';
        clubNameField.style.display = 'none';
        clubAssignmentFields.style.display = 'block';
        unassignedClubField.style.display = 'block';
        clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
        clubCategorySelect.disabled = true;
        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);


        // Načítať nepriradené tímy
        await populateUnassignedClubsSelect();

         // Pridať listener na zmenu selectboxu nepriradených tímov
         unassignedClubSelect.onchange = async () => {
             const selectedId = unassignedClubSelect.value;
              const selectedOption = unassignedClubSelect.options[unassignedClubSelect.selectedIndex];
              const categoryId = selectedOption ? selectedOption.dataset.categoryId : null;
              console.log("Zmenený výber nepriradeného tímu.", { selectedId, categoryId });

             if (selectedId && categoryId) {
                 const category = allAvailableCategories.find(cat => cat.id === categoryId);
                 const categoryName = category ? category.name : 'Neznáma kategória';
                 clubCategorySelect.innerHTML = `<option value="${categoryId}">${categoryName}</option>`;
                  populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId);
             } else {
                 clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                 populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
             }
         };

     } else if (mode === 'edit' && clubId) {
        clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
        clubNameField.style.display = 'block';
        clubAssignmentFields.style.display = 'block';
        unassignedClubField.style.display = 'none';

        if (unassignedClubSelect) unassignedClubSelect.onchange = null;

        try {
            const clubDocRef = doc(clubsCollectionRef, clubId);
            const clubDoc = await getDoc(clubDocRef);
            if (clubDoc.exists()) {
                const clubData = clubDoc.data();
                clubNameInput.value = clubData.name || clubData.id || ''; // Použiť name, potom id, potom prazdne


                const category = allAvailableCategories.find(cat => cat.id === clubData.categoryId);
                const categoryName = category ? category.name : (clubData.categoryId || 'Neznáma kategória');
                clubCategorySelect.innerHTML = `<option value="${clubData.categoryId}">${categoryName}</option>`;
                clubCategorySelect.disabled = true;

                 populateGroupSelectForClubModal(clubGroupSelect, clubData.groupId, allAvailableGroups, clubData.categoryId);


                orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : '';

            } else {
                console.error("Tím s ID", clubId, "sa nenašiel.");
                alert("Tím na úpravu sa nenašiel.");
                closeModal(clubModal);
                return;
            }
        } catch (e) {
            console.error("Chyba pri načítaní údajov tímu na úpravu:", e);
            alert("Nepodarilo sa načítať údaje tímu na úpravu.");
            closeModal(clubModal);
            return;
        }

     } else {
         console.error("Neplatný režim modálu klubu alebo chýbajúce ID v režime edit.");
         alert("Vyskytla sa chyba pri otváraní modálu klubu.");
         closeModal(clubModal);
         return;
     }

    openModal(clubModal);
}

// Listener pre odoslanie formulára Priradiť/Upraviť Klub
if (clubForm) {
     clubForm.addEventListener('submit', async (event) => {
         event.preventDefault();
         console.log("Odosielam formulár Priradiť/Upraviť Klub...");

         const clubName = clubNameInput.value.trim();
         const selectedGroupIdInModal = clubGroupSelect ? clubGroupSelect.value : null; // Toto je ID skupiny, ktoré sa vybralo/zobrazilo v modale
         let orderInGroup = orderInGroupInput ? parseInt(orderInGroupInput.value, 10) : null;

         let clubIdToUpdate = editingClubId;
         let updatedData = {};
         let clubCategoryFromDb = null;
         let originalCreatedFromBase = null;
         let originalTeamName = null;


         try {
             if (currentClubModalMode === 'assign' && unassignedClubSelect && unassignedClubSelect.value) {
                 clubIdToUpdate = unassignedClubSelect.value;
             } else if (currentClubModalMode === 'edit' && editingClubId) {
                 clubIdToUpdate = editingClubId;
             } else {
                  console.error("Chyba: Nelze určit tým k aktualizaci.");
                  alert("Vyskytla se chyba při určování, který tým aktualizovať.");
                  return;
             }

             if (!clubIdToUpdate) {
                 alert("Prosím, vyberte tím k aktualizaci/prirazení.");
                 return;
             }

             const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToUpdate));
              console.log(`Načítané dáta tímu ${clubIdToUpdate} pre aktualizáciu:`, clubDoc.exists() ? clubDoc.data() : "Dokument nenájdený");

             if (clubDoc.exists()) {
                 const clubData = clubDoc.data();
                 clubCategoryFromDb = clubData.categoryId || null;
                 originalCreatedFromBase = clubData.createdFromBase || null;
                 originalTeamName = clubData.name || clubData.id;
                 if (currentClubModalMode === 'assign') {
                      updatedData.name = originalTeamName; // Použiť existujúci názov v assign mode
                 } else {
                      updatedData.name = clubName; // Použiť názov z inputu v edit mode
                 }
             } else {
                 console.error("Tím s ID", clubIdToUpdate, "sa nenašiel v databáze pre aktualizáciu.");
                 alert("Tím sa nenašiel. Prosím, skúste znova.");
                 return;
             }

         } catch (e) {
             console.error(`Chyba pri načítaní tímu ${clubIdToUpdate} pre aktualizáciu:`, e);
             alert("Chyba pri načítaní údajov tímu. Prosím, skúste znova.");
             return;
         }


         updatedData = {
              ...updatedData, // Obsahuje name
             categoryId: clubCategoryFromDb,
             groupId: selectedGroupIdInModal || null, // !!! POUZIVAME groupId PRI UKLADANI TERAZ !!!
             orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
             createdFromBase: originalCreatedFromBase
         };

         if (updatedData.groupId === null) {
             updatedData.orderInGroup = null;
         }

         console.log("Údaje na aktualizáciu pre tím s ID", clubIdToUpdate, ":", updatedData);


         if (clubIdToUpdate) {
             const clubDocRef = doc(clubsCollectionRef, clubIdToUpdate);

              // Ak sa v režime edit mení názov tímu (čo je zároveň ID dokumentu)
              if (currentClubModalMode === 'edit' && updatedData.name !== clubIdToUpdate) {
                   console.log(`Mení sa názov tímu z "${clubIdToUpdate}" na "${updatedData.name}". Vymažem starý a vytvorím nový dokument.`);
                   const newDocumentId = updatedData.name;
                    const newClubDocRef = doc(clubsCollectionRef, newDocumentId);

                    const existingDoc = await getDoc(newClubDocRef);
                     if (existingDoc.exists()) {
                          alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                          if (clubNameInput) clubNameInput.focus();
                          return;
                     }

                     const batch = writeBatch(db);
                     batch.delete(clubDocRef);
                     batch.set(newClubDocRef, {
                          ...updatedData,
                          id: newDocumentId
                     });

                     await batch.commit();

                    console.log(`Tím bol úspešne premenovaný z "${clubIdToUpdate}" na "${newDocumentId}".`);
                     editingClubId = newDocumentId;


              } else {
                   // Ak sa názov tímu nemení (alebo režim je assign), len aktualizovať existujúci dokument
                   await updateDoc(clubDocRef, updatedData);
                   console.log("Tím/Klub s ID", clubIdToUpdate, "bol úspešne aktualizovaný/priradený.");
              }


             alert("Zmeny boli úspešne uložené.");

             closeModal(clubModal);
             // Po aktualizácii znovu načítať a zobraziť celý zoznam pre aktualizáciu tabuľky a filtrov
             await loadAndDisplayAllTeams();

         } else {
             console.error("Chýba ID tímu/klubu na aktualizáciu.");
             alert("Vyskytla sa chyba pri ukladaní zmien: chýba ID tímu/klubu.");
         }
     });
} else { console.error("Club form not found!"); }


// Listener pre zatvorenie modálneho okna Priradiť/Upraviť Klub
if (clubModalClose) {
     clubModalClose.addEventListener('click', () => {
          closeModal(clubModal);
          editingClubId = null;
          currentClubModalMode = null;
          // loadAndDisplayAllTeams(); // Volá sa už po zatvoreni modalu cez window click listener
     });
}

if (clubModal) {
     window.addEventListener('click', (event) => {
         if (event.target === clubModal) {
             closeModal(clubModal);
             editingClubId = null;
             currentClubModalMode = null;
             loadAndDisplayAllTeams(); // Zabezpečí aktualizáciu tabuľky po zatvorení modalu
         }
     });
}


// --- Inicializácia ---

// Listener na udalost DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM plne načítaný pre zoznam tímov.");

    // Pri načítaní stránky načítať všetky dáta a zobraziť tabuľku
    loadAndDisplayAllTeams();

    // Konfigurácia tlačidla "+" pre túto sekciu
     const addButton = document.getElementById('addButton');
     if (addButton) {
          addButton.style.display = 'block';
          addButton.title = "Vytvoriť tímy";
           // Listener pre tlačidlo "+" je teraz riadený v spravca-turnaja-script.js na základe hasha v URL
      } else {
         console.error("Add button not found on teams list page!");
     }
});


// Exportujte potrebné funkcie pre použitie v spravca-turnaja-script.js alebo inde
export { openTeamCreationModal, renderTeamsTable, openManageTeamsModal, closeManageTeamsModal, openClubModal, filterTeams, loadAndDisplayAllTeams };
// Exportujte aj ďalšie premenné, ak sú potrebné inde (napr. allTeams, allAvailableCategories, allAvailableGroups)
// export { allTeams, allAvailableCategories, allAvailableGroups };

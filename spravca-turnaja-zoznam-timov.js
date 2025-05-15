// spravca-turnaja-zoznam-timov.js (Celý kód s kumulatívnym filtrovaním)

// Import necessary functions and references from common.js
import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef,
         openModal, closeModal,
         populateCategorySelect, // Importujeme populateCategorySelect z common.js
         doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc, writeBatch } from './spravca-turnaja-common.js';


// Získanie referencií na elementy DOM modálov a tabuľky
// Team Creation Modal (už sa nepoužíva pre + tlačidlo na tejto stránke, ale referencie zostávajú ak je v HTML)
const teamCreationModal = document.getElementById('teamCreationModal');
const teamCreationModalClose = teamCreationModal ? teamCreationModal.querySelector('.close') : null;
const teamCreationForm = document.getElementById('teamCreationForm');
// ... ďalšie elementy týkajúce sa team creation modalu, ak existujú ...


// Referencie na elementy tabuľky zoznamu tímov
const createdTeamsTableBody = document.getElementById('createdTeamsTableBody');
const createdTeamsTableHeader = document.getElementById('createdTeamsTableHeader');


// Referencie na elementy a premenné súvisiace s modálom Priradiť/Upraviť Klub a Filter
const clubModal = document.getElementById('clubModal');
const clubModalClose = clubModal ? clubModal.querySelector('.close') : null;
const clubModalTitle = document.getElementById('clubModalTitle'); // Hlavný titulok modálu
const clubFormContent = document.getElementById('clubFormContent'); // Div pre formulár
const clubFilterContent = document.getElementById('clubFilterContent'); // Div pre filter
const clubForm = document.getElementById('clubForm'); // Formulár v modále klubu
const clubNameField = document.getElementById('clubNameField'); // Div okolo inputu názvu
const clubNameInput = document.getElementById('clubName'); // Input názvu tímu
const clubAssignmentFields = document.getElementById('clubAssignmentFields'); // Div okolo kategórie, skupiny, poradia
const clubCategorySelect = document.getElementById('clubCategorySelect'); // Select kategórie
const clubGroupSelect = document.getElementById('clubGroupSelect'); // Select skupiny
const orderInGroupInput = document.getElementById('orderInGroup'); // Input poradia
const unassignedClubField = document.getElementById('unassignedClubField'); // Div okolo selectu nepriradených
const unassignedClubSelect = document.getElementById('unassignedClubSelect'); // Select nepriradených tímov

// Referencie pre filtračnú časť modálu (používa sa pre vnútorný H2 v clubFilterContent)
const filterModalTitle = document.getElementById('filterModalTitle');


// Globálne polia na uloženie načítaných dát (pre dynamické selecty a filtrovanie)
let allAvailableCategories = []; // Všetky kategórie
let allAvailableGroups = []; // Všetky skupiny
let allTeams = []; // Všetky tímy načítané z databázy (základný zdroj dát)
let teamsToDisplay = []; // Pole tímov, ktoré sa majú aktuálne zobraziť v tabuľke (výsledok kumulatívneho filtrovania)


// Variabilné stavy pre modálne okno Priradiť/Upraviť Klub a Filter
let editingClubId = null; // ID tímu, ktorý sa práve upravuje/priraďuje
let currentClubModalMode = null; // Režim modálu: 'assign', 'edit', 'create', 'filter'
// ZMENA: currentFilters je objekt pre uloženie viacerých filtrov
let currentFilters = {
    teamName: null,
    category: null,
    group: null
};


// --- Pomocné funkcie pre prácu s názvom tímu ---

// Funkcia na parsovanie názvu tímu (ak je v tvare "Kategória - Názov")
function parseTeamName(fullTeamName) {
    if (!fullTeamName || typeof fullTeamName !== 'string') {
        return { categoryPrefix: null, baseName: fullTeamName || '' }; // Prázdny reťazec namiesto 'Neznámy názov' pre konzistentné filtrovanie prázdnych hodnôt
    }
    const parts = fullTeamName.split(' - ');
    // Kontrola, či prvá časť zodpovedá existujúcej kategórii (prípadne case-insensitive kontrola ak treba)
    // ZMENA: Overiť existenciu kategórie v allAvailableCategories
    if (parts.length >= 2) {
        const categoryPrefix = parts[0].trim();
         // Nájsť kategóriu podľa názvu (case-insensitive)
         const category = allAvailableCategories.find(cat => (cat.name || cat.id).trim().toLowerCase() === categoryPrefix.toLowerCase());
         if (category) {
              const baseName = parts.slice(1).join(' - ').trim();
              return { categoryPrefix: category.name || category.id, baseName }; // Vrátiť štandardizovaný názov/ID kategórie
         }
    }
    // Ak formát nezodpovedá alebo kategória neexistuje, vrátiť null pre kategóriu a celý názov ako baseName
    return { categoryPrefix: null, baseName: fullTeamName.trim() };
}


// --- Funkcie pre naplnenie filtračných selectov ---

// Získa unikátne základné názvy tímov pre filter "Názov tímu" Z DANEJ KOLEKCIE TÍMOV
function getUniqueBaseTeamNames(teams) { // teams bude teamsToDisplay
    const baseNames = teams.map(team => {
        // Použiť createdFromBase, ak existuje, inak parsovať z ID
        return team.createdFromBase || parseTeamName(team.id).baseName || ''; // Prázdny reťazec namiesto 'Neznámy názov'
    }).filter(name => name !== ''); // Filtrovať prázdne reťazce
    // Použiť Set na získanie unikátnych hodnôt a zoradiť
    return [...new Set(baseNames)].sort((a, b) => a.localeCompare(b, 'sk-SK'));
}

// Získa unikátne názvy kategórií pre filter "Kategória" Z DANEJ KOLEKCIE TÍMOV
function getUniqueTeamCategories(teams, categories) { // teams bude teamsToDisplay
    // Získa unikátne categoryId z tímov, ktoré nie sú null alebo undefined alebo prázdny reťazec
    const categoryIds = [...new Set(teams.map(team => team.categoryId).filter(id => id !== null && typeof id !== 'undefined' && id !== ''))]; // Filtrovať aj prázdne ID
    // Mapuje ID na názvy kategórií. Ak kategória ID nie je v zozname kategórií, použije sa ID alebo placeholder.
    const categoryNames = categoryIds.map(id => {
        const category = categories.find(cat => cat.id === id);
        return category ? category.name : (id || 'Neznáma kategória'); // Použiť názov, ID alebo placeholder
    });
     // Vráti unikátne, zoradené názvy kategórií, filtruje prázdne reťazce
     return [...new Set(categoryNames.filter(name => name && name.trim() !== ''))]
        .sort((a, b) => a.localeCompare(b, 'sk-SK'));
}

// Získa unikátne názvy skupín pre filter "Skupina" Z DANEJ KOLEKCIE TÍMOV
function getUniqueTeamGroups(teams, groups) { // teams bude teamsToDisplay
    const groupNames = new Set();

    teams.forEach(team => {
        // Skontrolovať len groupId, či existuje a nie je prázdny reťazec
        if (team.groupId === null || typeof team.groupId === 'undefined' || (typeof team.groupId === 'string' && team.groupId.trim() === '')) {
            groupNames.add('Nepriradené'); // Explicitne pridať "Nepriradené" pre tímy bez groupId alebo s prázdnym groupId
        } else {
            const group = groups.find(g => g.id === team.groupId);
            if (group) {
                groupNames.add(group.name || group.id); // Pridať názov skupiny alebo ID
            } else {
                 // Prípad dátovej nekonzistencie - tím má groupId, ale skupina s týmto ID neexistuje
                 // Skúsiť parsovať názov skupiny z groupId ID
                 const parts = team.groupId.split(' - ');
                 if (parts.length > 1) {
                      const parsedGroupName = parts.slice(1).join(' - ').trim();
                      if (parsedGroupName !== '') {
                           groupNames.add(parsedGroupName); // Použiť parsovaný názov ak je platný
                      } else {
                           // Ak parsovaný názov je prázdny, pridať celé ID ako placeholder
                           groupNames.add(team.groupId);
                           console.warn(`Tím ID: ${team.id} má groupId ID "${team.groupId}", ale parsovaný názov skupiny je prázdny. Zobrazujem celé ID.`);
                      }
                 } else {
                      // Ak sa nedá parsovať, použiť celé ID ako názov
                      groupNames.add(team.groupId);
                      console.warn(`Tím ID: ${team.id} má groupId ID "${team.groupId}", ktoré sa nedá parsovať. Zobrazujem celé ID ako názov skupiny.`);
                 }
            }
        }
    });

    // Vrátiť unikátne, zoradené názvy skupín, filtruje prázdne reťazce okrem "Nepriradené"
    return [...groupNames].filter(name => name && name.trim() !== '' || name === 'Nepriradené')
        .sort((a, b) => a.localeCompare(b, 'sk-SK'));
}


// --- Funkcie na načítanie dát pre dynamické selecty a filtrovanie ---

// Načíta všetky kategórie a uloží ich do allAvailableCategories
async function loadAllCategoriesForDynamicSelects() {
     console.log("Načítavam kategórie pre dynamické selecty...");
     allAvailableCategories = [];
     try {
         const querySnapshot = await getDocs(categoriesCollectionRef);
         querySnapshot.forEach((doc) => {
             const categoryData = doc.data();
             if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                 allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
             } else {
                 // Ak názov chýba, je neplatný alebo prázdny, použiť ID dokumentu
                allAvailableCategories.push({ id: doc.id, name: doc.id });
                // console.warn("Kategória dokument s ID", doc.id, "má chýbajúce, neplatné alebo prázdne 'name' pole. Používam ID ako názov.");
             }
         });
         // Zoradiť kategórie abecedne podľa názvu
         allAvailableCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));
         console.log("Načítané kategórie (allAvailableCategories):", allAvailableCategories.length);
     } catch (e) {
         console.error("Chyba pri načítaní kategórií: ", e);
         alert("Nepodarilo sa načítať kategórie.");
         allAvailableCategories = []; // Vyprázdniť pole v prípade chyby
     }
}

// Načíta všetky skupiny a uloží ich do allAvailableGroups
async function loadAllGroups() {
     console.log("Načítavam skupiny...");
     allAvailableGroups = [];
     try {
         const querySnapshot = await getDocs(groupsCollectionRef);
         querySnapshot.forEach((doc) => {
             const groupData = doc.data();
             if (groupData) {
                 allAvailableGroups.push({ id: doc.id, ...groupData });
             } else {
                // console.warn("Skupina dokument s ID", doc.id, "má prázdne dáta."); // Logovať upozornenie
             }
         });
         // Zoradiť skupiny abecedne podľa názvu (alebo ID ak názov chýba)
         allAvailableGroups.sort((a, b) => {
             const nameA = (a.name || a.id) || '';
             const nameB = (b.name || b.id) || '';
             return nameA.localeCompare(nameB, 'sk-SK');
         });
         console.log("Načítané skupiny (allAvailableGroups):", allAvailableGroups.length);
     } catch (e) {
         console.error("Chyba pri načítaní skupín:", e);
         alert("Nepodarilo sa načítať skupiny.");
         allAvailableGroups = []; // Vyprázdniť pole v prípade chyby
          if (clubGroupSelect) { // Ak existuje select v modále, zobraziť chybu
             clubGroupSelect.innerHTML = '<option value="">-- Chyba pri načítaní skupín --</option>';
             clubGroupSelect.disabled = true;
         }
    }
}

// Naplní select skupín v modále klubu na základe vybranej kategórie
function populateGroupSelectForClubModal(selectElement, selectedId = '', availableGroups, categoryId = null) {
     console.log("Napĺňam select skupín v modále klubu.", { selectedId, categoryId, availableGroupsCount: availableGroups.length });
     if (!selectElement) { console.error("Select element pre skupiny nenájdený!"); return; }

     selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>'; // Vždy začať s placeholderom

     // Filtrovať skupiny len pre vybranú kategóriu
     const filteredGroups = categoryId
         ? availableGroups.filter(group => group.categoryId === categoryId)
         : []; // Ak nie je kategória vybraná, nie sú žiadne skupiny na zobrazenie

     console.log(`Filtrované skupiny pre select v modále (kategória tímu: ${categoryId}):`, filteredGroups.length);

     if (filteredGroups.length === 0) {
          // Ak nie sú skupiny pre danú kategóriu
          const category = allAvailableCategories.find(cat => cat.id === categoryId);
          const categoryName = category ? category.name : categoryId;
          const option = document.createElement('option');
          option.value = "";
          option.textContent = categoryId && !categoryId.startsWith('--') ? ` -- Žiadne skupiny v kategórii "${categoryName}" --` : `-- Najprv vyberte kategóriu (v režime assign vyberte tím) --`;
          option.disabled = true; // Placeholder je neklikateľný
          selectElement.appendChild(option);
          selectElement.disabled = true; // Zakázať select
     }
     else {
         // Ak sú skupiny, naplniť select
         filteredGroups.forEach(group => {
             const option = document.createElement('option');
             option.value = group.id; // Hodnota je ID skupiny
             const displayedGroupName = group.name || group.id; // Zobraziť názov alebo ID
             option.textContent = displayedGroupName;
             selectElement.appendChild(option);
         });
         selectElement.disabled = false; // Povoliť select

         // Predvybrať hodnotu, ak je zadaná a existuje v selecte
         if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
             selectElement.value = selectedId;
         } else {
             selectElement.value = ""; // Ak zadaná hodnota neexistuje alebo nebola zadaná, vybrať prvú prázdnu možnosť
         }
     }

     console.log("Naplnenie selectu skupín v modále dokončené.");
}


// Načíta nepriradené kluby/tímy pre select v Assign móde
async function populateUnassignedClubsSelect() {
     console.log("Načítavam nepriradené tímy/kluby...");
     if (!unassignedClubSelect) { console.error("Unassigned club select not found!"); return; }

     unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>'; // Placeholder
     unassignedClubSelect.disabled = true; // Predvolene zakázané kým sa nenačítajú dáta

     try {
         const q = query(clubsCollectionRef, where("groupId", "==", null)); // Filter na tímy bez groupId
         const querySnapshot = await getDocs(q);

         if (querySnapshot.empty) {
             const option = document.createElement('option');
             option.value = "";
             option.textContent = "Žiadne nepriradené tímy";
             option.disabled = true; // Neklikateľné
             unassignedClubSelect.appendChild(option);
             unassignedClubSelect.disabled = true; // Zostane zakázané
             console.log("Žiadne nepriradené tímy nájdené.");
         } else {
             // Mapovať dokumenty, zoraďovať podľa názvu
             const unassignedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

             // Naplniť select
             unassignedTeams.forEach(team => {
                 const option = document.createElement('option');
                 option.value = team.id; // Hodnota je ID tímu
                 option.textContent = team.name || team.id; // Zobraziť názov alebo ID
                 option.dataset.categoryId = team.categoryId; // Uložiť categoryId ako data atribút
                 unassignedClubSelect.appendChild(option);
             });
             unassignedClubSelect.disabled = false; // Povoliť select, ak sú dáta
             console.log("Nepriradené tímy načítané a spracované:", unassignedTeams.length);
         }
     } catch (e) {
         console.error("Chyba pri načítaní nepriradených tímov:", e);
         const option = document.createElement('option');
         option.value = "";
         option.textContent = "-- Chyba pri načítaní --";
         option.disabled = true; // Neklikateľné
         unassignedClubSelect.appendChild(option);
         unassignedClubSelect.disabled = true; // Zostane zakázané
     }
}

// Resetuje stav modálneho okna klubu/filtra
function resetClubModal() {
     console.log("Resetujem modál klubu (vrátane filtrov).");
     // editingClubId a currentClubModalMode sa nastavuju priamo v openClubModal, tu sa len resetujú na null
     editingClubId = null;
     currentClubModalMode = null;

     // Resetovať formulárovú časť
     if (clubForm) clubForm.reset();

     // Resetovať a skryť špecifické polia
     if (clubNameField) clubNameField.style.display = 'block'; // Predvolene zobraziť
     if (unassignedClubField) unassignedClubField.style.display = 'none'; // Predvolene skryť

     // Resetovať select kategórií
     if (clubCategorySelect) {
         clubCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
         clubCategorySelect.disabled = true;
         // ODSTRÁNENÉ: onchange listenery sa odstraňujú v openClubModal pri vstupe do režimu
         // clubCategorySelect.onchange = null;
     }
     // Resetovať select skupín
     if (clubGroupSelect) {
         clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
         if (clubGroupSelect) clubGroupSelect.disabled = true;
         // ODSTRÁNENÉ: onchange listenery sa odstraňujú v openClubModal pri vstupe do režimu
         // if (clubGroupSelect) clubGroupSelect.onchange = null;
     }
     // Resetovať input poradia
     if (orderInGroupInput) {
         orderInGroupInput.value = '';
         orderInGroupInput.disabled = true;
         orderInGroupInput.removeAttribute('required'); // Zabezpečiť, že nie je required
     }

     // Resetovať select nepriradených tímov
     if (unassignedClubSelect) {
         unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
         unassignedClubSelect.disabled = true;
         // ODSTRÁNENÉ: onchange listenery sa odstraňujú v openClubModal pri vstupe do režimu
         // unassignedClubSelect.onchange = null;
     }

     // Resetovať titulky a text tlačidla na predvolené
     // ZMENA: Resetovať hlavný titulok modálu na predvolený text pre formuláre
     if (clubModalTitle) clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
     if (clubForm) {
         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Uložiť zmeny / Priradiť';
     }

     // Skryť filtračný obsah a zobraziť formulárový obsah
     if (clubFilterContent) clubFilterContent.style.display = 'none';
     if (clubFormContent) clubFormContent.style.display = 'block';

     // Resetovať filtračný select a titulok V RÁMCI FILTRAČNEJ ČASTI
     if (filterModalTitle) filterModalTitle.textContent = 'Filter'; // Toto je vnútorný titulok v div clubFilterContent
     if (filterSelect) {
         filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>';
         // ODSTRÁNENÉ: onchange listener sa odstraňuje v openClubModal pri vstupe do režimu filter
         // filterSelect.onchange = null;
         filterSelect.value = ""; // Zabezpečiť, že je vybraný placeholder
     }

    // POZOR: currentFilters NIE JE resetovaný v resetClubModal!
    // Resetuje sa len pri výbere '-- Zobraziť všetko --' vo filtračnom modále pre daný typ filtra
    // Alebo sa resetuje celý objekt pri zatvorení modalu (ak chceme zrušiť všetky filtre pri zatvorení modalu)
    // Pre kumulatívne filtrovanie necháme filtre aktívne po zatvorení modalu.
    // currentFilters = { teamName: null, category: null, group: null }; // Ak by sme chceli resetovať VŠETKY filtre pri zatvorení modalu
}


// Otvorí modálne okno klubu v rôznych režimoch (assign, edit, create, filter)
async function openClubModal(identifier = null, mode = 'assign') {
     console.log(`INFO: Spustená funkcia openClubModal v režime: ${mode}, Identifier: ${identifier}`); // <--- Debug Log

     // Skontrolovať existenciu všetkých potrebných DOM elementov modálu
     if (!clubModal || !clubModalTitle || !clubFormContent || !clubFilterContent || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect || !filterModalTitle || !filterSelect) {
         console.error("Elementy modálu Klub/Filter nenájdené! Skontrolujte spravca-turnaja-zoznam-timov.html.");
         alert("Nastala chyba pri otváraní modálu. Niektoré elementy používateľského rozhrania chýbajú.");
         return;
     }
     console.log("INFO: Všetky elementy modálu Klub/Filter nájdené."); // <--- Debug Log

    // Resetovať modál pred otvorením (nechá currentFilters nedotknutý)
    resetClubModal(); // Toto nastaví základné viditeľnosti a stavy (vrátane disabled)


    // ZMENA: Odstrániť VŠETKY existujúce listenery pred pridaním nových, aby sa predišlo zdvojeniu
     if (unassignedClubSelect) unassignedClubSelect.onchange = null;
     if (clubCategorySelect) clubCategorySelect.onchange = null;
     if (clubGroupSelect) clubGroupSelect.onchange = null;
     if (filterSelect) filterSelect.onchange = null;


    // Nastaviť stavové premenné
    editingClubId = (mode === 'edit') ? identifier : null; // Uložiť ID len v edit mode
    currentClubModalMode = mode; // Uložiť aktuálny režim modálu

     // Načítať kategórie a skupiny, ak ešte nie sú načítané (potrebné pre selecty a filtrovanie)
     if (allAvailableCategories.length === 0) {
         await loadAllCategoriesForDynamicSelects();
     }
     if (allAvailableGroups.length === 0) {
         await loadAllGroups();
     }


     // --- Režimy modálu (formulárová časť) ---
     if (['assign', 'edit', 'create'].includes(mode)) {
         // Zobraziť formulárovú časť modálu
         clubFormContent.style.display = 'block';
         clubFilterContent.style.display = 'none';

         // ZMENA: Nastaviť hlavný titulok modálu na základe režimu formulára
         if (mode === 'assign') {
              clubModalTitle.textContent = 'Priradiť nepriradený tím';
         } else if (mode === 'create') {
              clubModalTitle.textContent = 'Vytvoriť nový tím';
         } else if (mode === 'edit') {
              clubModalTitle.textContent = 'Upraviť tím / Priradiť klub'; // Univerzálny titulok pre edit
         }


         // Logika pre režim "Priradiť" (assign)
         if (mode === 'assign') {
             clubNameField.style.display = 'none'; // Skryť pole názvu
             clubAssignmentFields.style.display = 'block'; // Zobraziť polia priradenia
             unassignedClubField.style.display = 'block'; // Zobraziť select nepriradených tímov

              // Tlačidlo formulára
             if (clubForm) {
                  const submitButton = clubForm.querySelector('button[type="submit"]');
                  if (submitButton) submitButton.textContent = 'Priradiť'; // Zmeniť text tlačidla
             }


             // Selecty kategórie a skupiny sú spočiatku zakázané
             if (clubCategorySelect) clubCategorySelect.disabled = true;
             if (clubGroupSelect) clubGroupSelect.disabled = true;
             if (orderInGroupInput) orderInGroupInput.disabled = true; // Poradie tiež zakázané


              // Nastaviť placeholder text pre kategóriu
             clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
             // Naplniť select skupín (spočiatočný stav, žiadne skupiny nie sú vybrané)
             populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null); // Zobraziť všetky, kategória nie je vybraná

             // Načítať a naplniť select nepriradenými tímami
             await populateUnassignedClubsSelect(); // Táto funkcia povolí unassignedClubSelect ak nájde tímy


             // Listener na zmenu výberu nepriradeného tímu (pre režim Assign)
             if (unassignedClubSelect) {
                  unassignedClubSelect.onchange = () => {
                       const selectedId = unassignedClubSelect.value;
                       // Získať categoryId z data atribútu vybranej option
                       const selectedOption = unassignedClubSelect.options[unassignedClubSelect.selectedIndex];
                       const categoryId = selectedOption ? selectedOption.dataset.categoryId : null;

                       console.log("Zmenený výber nepriradeného tímu v Assign móde.", { selectedId, categoryId });

                       if (selectedId && categoryId && !categoryId.startsWith('--')) {
                            // Ak je vybraný tím a má kategóriu, zobraziť kategóriu a povoliť select skupín
                            const category = allAvailableCategories.find(cat => cat.id === categoryId);
                            const categoryName = category ? category.name : 'Neznáma kategória';
                            clubCategorySelect.innerHTML = `<option value="${categoryId}">${categoryName}</option>`;
                            if (clubCategorySelect) clubCategorySelect.disabled = true; // Kategória je daná tímom

                            if (clubGroupSelect) clubGroupSelect.disabled = false; // Povoliť výber skupiny
                            populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId); // Naplniť skupiny pre túto kategóriu

                            if (orderInGroupInput) {
                                 orderInGroupInput.disabled = true; // Poradie je spočiatku zakázané
                                 orderInGroupInput.value = '';
                                 orderInGroupInput.removeAttribute('required');
                            }
                       } else {
                            // Ak nie je vybraný tím alebo chýba kategória, resetovať selecty
                            clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                            if (clubCategorySelect) clubCategorySelect.disabled = true;

                            if (clubGroupSelect) clubGroupSelect.disabled = true;
                            clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>'; // Resetovať skupiny (zobraziť všetky alebo placeholder)
                            if (orderInGroupInput) {
                                 orderInGroupInput.disabled = true;
                                 orderInGroupInput.value = '';
                                 orderInGroupInput.removeAttribute('required');
                            }
                       }
                  };
             }

             // Listener na zmenu výberu skupiny v Assign móde
             if (clubGroupSelect) {
                 clubGroupSelect.onchange = () => {
                     const selectedGroupId = clubGroupSelect.value;
                     console.log("Zmenená skupina v Assign móde modále klubu:", selectedGroupId);
                     // Povoliť input poradia len ak je vybraná platná skupina
                     if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                         if (orderInGroupInput) {
                             orderInGroupInput.disabled = false;
                             orderInGroupInput.focus(); // Presunúť focus na pole poradia
                              orderInGroupInput.setAttribute('required', 'required'); // Zabezpečiť, že poradie je povinné, ak je vybraná skupina
                         }
                     } else {
                         if (orderInGroupInput) {
                             orderInGroupInput.disabled = true;
                             orderInGroupInput.value = ''; // Vyprázdniť poradie ak nie je skupina
                              orderInGroupInput.removeAttribute('required'); // Odstrániť required ak nie je skupina
                         }
                     }
                 };
             }


         }
         // Logika pre režim "Upraviť" (edit)
         else if (mode === 'edit' && identifier) { // identifier je ID tímu na úpravu
             editingClubId = identifier; // Uložiť ID tímu na úpravu
             clubNameField.style.display = 'block'; // Zobraziť pole názvu
             clubAssignmentFields.style.display = 'block'; // Zobraziť polia priradenia
             unassignedClubField.style.display = 'none'; // Skryť select nepriradených tímov

             // Tlačidlo formulára
              if (clubForm) {
                   const submitButton = clubForm.querySelector('button[type="submit"]');
                   if (submitButton) submitButton.textContent = 'Uložiť zmeny'; // Zmeniť text tlačidla
              }

             // Zakázať select nepriradených tímov v Edit móde
             if (unassignedClubSelect) unassignedClubSelect.disabled = true;

             // ZMENA: Povoliť výber kategórie v režime edit, aby sa dalo zmeniť ID tímu
             if (clubCategorySelect) clubCategorySelect.disabled = false; // POVODIŤ select kategórií v edit mode
              // ZMENA: Povoliť výber skupiny v režime edit
              if (clubGroupSelect) clubGroupSelect.disabled = false; // POVODIŤ select skupiny v edit mode
              // Poradie spočiatku zakázané, povolí sa pri výbere skupiny


             try {
                 // Načítať aktuálne dáta tímu z databázy
                 const clubDocRef = doc(clubsCollectionRef, editingClubId);
                 const clubDoc = await getDoc(clubDocRef);

                 if (clubDoc.exists()) {
                     const clubData = clubDoc.data();
                     // Naplniť formulár existujúcimi dátami tímu
                     clubNameInput.value = clubData.name || clubData.id || ''; // Názov tímu
                      clubNameInput.focus(); // Zamerať sa na input názvu po otvorení

                     // Naplniť select kategórií všetkými možnosťami a predvybrať aktuálnu kategóriu
                     if (allAvailableCategories.length > 0) {
                          // populateCategorySelect je importovaná z common.js
                          populateCategorySelect(clubCategorySelect, clubData.categoryId); // Naplniť a predvybrať
                     } else {
                         // Ak nie sú kategórie, zobraziť správu a zakázať select
                         clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
                         clubCategorySelect.disabled = true;
                     }


                     // Naplniť select skupín filtrovanými skupinami pre AKTUÁLNU kategóriu tímu a nastaviť vybranú skupinu
                      // Použiť clubData.categoryId na filtrovanie pri prvom naplnení skupín
                      populateGroupSelectForClubModal(clubGroupSelect, clubData.groupId, allAvailableGroups, clubData.categoryId);


                      // Naplniť pole poradia
                     orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : '';

                     // Odstrániť/Nastaviť povinné validácie pre polia
                     if (orderInGroupInput) orderInGroupInput.removeAttribute('required'); // Poradie nie je vždy povinné

                     // ZMENA: Povoliť input poradia len ak tím už má priradenú skupinu ALEBO ak vyberú novú skupinu
                      if (orderInGroupInput) {
                           // Ak má tím už groupId, povoliť input poradia
                           orderInGroupInput.disabled = !(clubData.groupId && typeof clubData.groupId === 'string' && team.groupId.trim() !== '');
                           // Ak má tím už groupId, nastaviť poradie ako povinné
                            if (!orderInGroupInput.disabled) {
                                 orderInGroupInput.setAttribute('required', 'required');
                            }
                      }


                     // Listener na zmenu kategórie v Edit móde
                     if (clubCategorySelect) {
                          clubCategorySelect.onchange = () => {
                               const selectedCategoryId = clubCategorySelect.value;
                               console.log("Zmenená kategória v Edit móde modále klubu:", selectedCategoryId);
                               if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                                    if (clubGroupSelect) clubGroupSelect.disabled = false; // Povoliť select skupín
                                    // Naplniť select skupín filtrovanými skupinami pre NOVÚ vybranú kategóriu
                                    populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId); // null ako selectedId, lebo skupina sa zmenou kategórie "odpriradí"
                                     // Pri zmene kategórie, vynulovať a zakázať pole poradia
                                    if (orderInGroupInput) {
                                         orderInGroupInput.disabled = true;
                                         orderInGroupInput.value = '';
                                         orderInGroupInput.removeAttribute('required');
                                    }
                               } else {
                                    // Ak nie je vybraná kategória, resetovať a zakázať skupiny a poradie
                                    if (clubGroupSelect) clubGroupSelect.disabled = true;
                                    clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>'; // Resetovať skupiny
                                    if (orderInGroupInput) {
                                         orderInGroupInput.disabled = true;
                                         orderInGroupInput.value = '';
                                         orderInGroupInput.removeAttribute('required');
                                    }
                               }
                          };
                     }

                     // Listener na zmenu skupiny v Edit móde
                     if (clubGroupSelect) {
                         clubGroupSelect.onchange = () => {
                             const selectedGroupId = clubGroupSelect.value;
                             console.log("Zmenená skupina v Edit móde modále klubu:", selectedGroupId);
                             // Povoliť input poradia len ak je vybraná platná skupina
                             if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                                 if (orderInGroupInput) {
                                     orderInGroupInput.disabled = false;
                                     orderInGroupInput.focus(); // Presunúť focus
                                     orderInGroupInput.setAttribute('required', 'required'); // Poradie je povinné
                                 }
                             } else {
                                 if (orderInGroupInput) {
                                     orderInGroupInput.disabled = true;
                                     orderInGroupInput.value = ''; // Vyprázdniť poradie
                                     orderInGroupInput.removeAttribute('required'); // Poradie nie je povinné
                                 }
                             }
                         };
                     }


                 } else {
                     // Ak sa tím na úpravu nenašiel v databáze
                     console.error("Tím s ID", editingClubId, "sa nenašiel v databáze pre úpravu.");
                     alert("Tím na úpravu sa nenašiel.");
                     closeModal(clubModal);
                     displayCreatedTeams(); // Obnoviť tabuľku, aby zmizol neexistujúci tím
                     return; // Ukončiť funkciu
                 }
             } catch (e) {
                 // Spracovanie chýb pri načítaní údajov tímu
                 console.error("Chyba pri načítaní údajov tímu na úpravu:", e);
                 alert("Nepodarilo sa načítať údaje tímu na úpravu.");
                 closeModal(clubModal);
                 displayCreatedTeams(); // Obnoviť tabuľku
                 return; // Ukončiť funkciu
             }

         }
         // Logika pre režim "Vytvoriť" (create)
         else if (mode === 'create') {
             clubNameField.style.display = 'block'; // Zobraziť pole názvu
             clubAssignmentFields.style.display = 'block'; // Zobraziť polia priradenia
             unassignedClubField.style.display = 'none'; // Skryť select nepriradených tímov

             // Tlačidlo formulára
              if (clubForm) {
                   const submitButton = clubForm.querySelector('button[type="submit"]');
                   if (submitButton) submitButton.textContent = 'Vytvoriť tím'; // Zmeniť text tlačidla
              }

             // Zakázať select nepriradených tímov v Create móde
             if (unassignedClubSelect) unassignedClubSelect.disabled = true;

             // POVODIŤ select kategórií v create mode
             if (clubCategorySelect) clubCategorySelect.disabled = false;
             // ZAKÁZAŤ select skupín na začiatku v create mode
             if (clubGroupSelect) clubGroupSelect.disabled = true;
             // ZAKÁZAŤ input poradia na začiatku
             if (orderInGroupInput) orderInGroupInput.disabled = true;


             // Naplniť select kategórií všetkými možnosťami
             if (allAvailableCategories.length > 0) {
                  populateCategorySelect(clubCategorySelect, null); // Naplniť a nič nevybrať
             } else {
                 // Ak nie sú kategórie, zobraziť správu a zakázať select
                 clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
                 clubCategorySelect.disabled = true; // Zostane zakázaný ak nie sú kategórie
             }

             // Nastaviť spočiatočný stav selectu skupín
             clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';


             // Listener na zmenu selectboxu kategórií (pre create mode) - tu povolíme select skupiny
             if (clubCategorySelect) {
                  clubCategorySelect.onchange = () => {
                       const selectedCategoryId = clubCategorySelect.value;
                       console.log("Zmenená kategória v Create móde modále klubu:", selectedCategoryId);
                       if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                            if (clubGroupSelect) clubGroupSelect.disabled = false; // Povoliť select skupín
                            // Naplniť select skupín filtrovanými skupinami pre NOVÚ vybranú kategóriu
                            populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
                            // Pri zmene kategórie a naplnení nových skupín, zakážeme pole poradia a vyčistíme ho
                           if (orderInGroupInput) {
                                orderInGroupInput.disabled = true;
                                orderInGroupInput.value = '';
                                orderInGroupInput.removeAttribute('required'); // Poradie nie je povinné
                           }
                       } else {
                            // Ak nie je vybraná kategória, resetovať a zakázať skupiny a poradie
                            if (clubGroupSelect) clubGroupSelect.disabled = true;
                            clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>'; // Resetovať skupiny
                            // Ak sa kategória "odvyberie", zakážeme aj pole poradia a vyčistíme ho
                            if (orderInGroupInput) {
                                orderInGroupInput.disabled = true;
                                orderInGroupInput.value = '';
                                orderInGroupInput.removeAttribute('required');
                            }
                       }
                  };
             }

             // Listener na zmenu selectboxu skupín (pre create mode)
             if (clubGroupSelect) {
                  clubGroupSelect.onchange = () => {
                       const selectedGroupId = clubGroupSelect.value;
                       console.log("Zmenená skupina v Create móde modále klubu:", selectedGroupId);
                       // Ak bola vybraná platná skupina
                       if (selectedGroupId && selectedGroupId !== '' && !selectedGroupId.startsWith('--')) {
                           if (orderInGroupInput) {
                               orderInGroupInput.disabled = false; // POVODIŤ input poradia
                               orderInGroupInput.focus(); // Voliteľné: presunúť zameranie na pole poradia
                                orderInGroupInput.setAttribute('required', 'required'); // Poradie je povinné
                           }
                       } else {
                          // Ak nebola vybraná žiadna skupina (alebo je neplatná)
                           if (orderInGroupInput) {
                               orderInGroupInput.disabled = true; // ZAKÁZAŤ input poradia
                               orderInGroupInput.value = ''; // Vyčistiť hodnotu poradia
                                orderInGroupInput.removeAttribute('required'); // Poradie nie je povinné
                           }
                       }
                  };
             }

             // Zabezpečiť, že polia Skupina a Poradie nie sú predvolene required v HTML
             // Tieto atribúty sa nastavia dynamicky listenermi vyššie
             if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
             if (orderInGroupInput) orderInGroupInput.removeAttribute('required');

             // Nastaviť focus na pole názvu po otvorení modálu
             setTimeout(() => {
                 if (clubNameInput) clubNameInput.focus();
             }, 0);

         }
         // Spracovanie neplatného režimu
         else {
              console.error("Neplatný režim modálu klubu.");
              alert("Vyskytla sa chyba pri otváraní modálu klubu. Prosím, kontaktujte podporu.");
              closeModal(clubModal); // Zatvoriť modál v prípade chyby
              // displayCreatedTeams(); // Znovu zobraziť tabuľku
              return; // Ukončiť funkciu
         }


         // Nastaviť focus na prvý interaktívny prvok po otvorení modálu (s malým oneskorením pre render)
         setTimeout(() => {
             if (mode === 'assign' && unassignedClubSelect && !unassignedClubSelect.disabled) {
                 unassignedClubSelect.focus();
             } else if (mode === 'edit' && clubNameInput) {
                 clubNameInput.focus();
             } else if (mode === 'create' && clubNameInput) {
                 clubNameInput.focus();
             }
         }, 100);

     }
     // --- Režim modálu (filtračná časť) ---
     else if (mode === 'filter') {
         // Zobraziť filtračnú časť modálu
         clubFormContent.style.display = 'none'; // Skryť formulár
         clubFilterContent.style.display = 'block'; // Zobraziť filtračnú časť

         const filterType = identifier; // Identifier je typ filtra ('teamName', 'category', 'group')

         // ZMENA: Nastaviť HLAVNÝ titulok modálu (clubModalTitle) na základe typu filtra
         if (filterType === 'teamName') clubModalTitle.textContent = 'Filter podľa názvu tímu';
         else if (filterType === 'category') clubModalTitle.textContent = 'Filter podľa kategórie';
         else if (filterType === 'group') clubModalTitle.textContent = 'Filter podľa skupiny';
         else clubModalTitle.textContent = 'Filter'; // Predvolené pre hlavný titulok, ak typ nie je známy


         // Nastaviť titulok VNÚTORNEJ filtračnej sekcie (filterModalTitle) - môže zostať "Filter" alebo špecifickejší
         filterModalTitle.textContent = 'Vyberte hodnotu filtra'; // Nastavíme univerzálnejší text pre vnútorný titulok


         let filterOptions = []; // Pole pre možnosti filtračného selectu

         // ZMENA: Získať unikátne hodnoty na základe typu filtra Z AKTULNE ZOBRAZENÝCH TÍMOV (teamsToDisplay)
         // Použiť pole teamsToDisplay namiesto allTeams
         if (filterType === 'teamName') {
             filterOptions = getUniqueBaseTeamNames(teamsToDisplay); // Poslať teamsToDisplay
         } else if (filterType === 'category') {
             filterOptions = getUniqueTeamCategories(teamsToDisplay, allAvailableCategories); // Poslať teamsToDisplay
              // Ak sa filtruje podľa kategórie, pridať možnosť "Neznáma kategória" len ak existujú tímy bez categoryId v teamsToDisplay
             const hasUnknownCategory = teamsToDisplay.some(team => !team.categoryId || (typeof team.categoryId === 'string' && team.categoryId.trim() === ''));
              if (hasUnknownCategory && !filterOptions.includes('Neznáma kategória')) { // Pridať len ak ešte nie je
                   filterOptions.push('Neznáma kategória');
                   filterOptions.sort((a, b) => a.localeCompare(b, 'sk-SK')); // Znova zoradiť po pridaní
              }
         } else if (filterType === 'group') {
             filterOptions = getUniqueTeamGroups(teamsToDisplay, allAvailableGroups); // Poslať teamsToDisplay
             // Funkcia getUniqueTeamGroups už pridáva "Nepriradené" ak je to relevantné
         }

         // Naplniť filtračný select
         if (filterSelect) {
             filterSelect.innerHTML = '<option value="">-- Zobraziť všetko --</option>'; // Predvolená možnosť "Zobraziť všetko"

             // Zoradiť filterOptions abecedne (ak už nie sú zoradené v getUnique funkciách)
             // getUnique funkcie by už mali vracať zoradené polia

             filterOptions.forEach(optionValue => {
                 const option = document.createElement('option');
                 option.value = optionValue; // Hodnota option
                 option.textContent = optionValue; // Text option
                 filterSelect.appendChild(option);
             });

             // Predvybrať aktuálne aplikovaný filter pre TENTO TYP FILTRA (ak existuje v currentFilters)
             // ZMENA: Použiť currentFilters[filterType] na predvýber
             if (currentFilters[filterType] !== null && filterSelect.querySelector(`option[value="${currentFilters[filterType]}"]`)) {
                 filterSelect.value = currentFilters[filterType];
             } else {
                 filterSelect.value = ""; // Ak nie je filter aktívny pre tento typ, vybrať "Zobraziť všetko"
             }

             // Listener na zmenu výberu vo filtračnom selecte
             filterSelect.onchange = () => {
                 // Ak je vybraná prázdna hodnota ("-- Zobraziť všetko --"), nastaviť filter na null
                 const selectedValue = filterSelect.value === "" ? null : filterSelect.value;
                 console.log(`INFO: Filter zmenený (v modále): Typ=${filterType}, Hodnota=${selectedValue}`); // <--- Debug Log

                 // Aktualizovať AKTUÁLNY stav filtra pre TENTO TYP filtra v objekte currentFilters
                 currentFilters[filterType] = selectedValue;
                 console.log("INFO: Aktuálne filtre:", currentFilters); // <--- Debug Log


                 // Zatvoriť modál a obnoviť zobrazenie tabuľky s VŠETKÝMI APLIKOVANÝMI filtrami
                 closeModal(clubModal);
                 // resetClubModal(); // Neresetujeme celý modál, aby filter zostal nastavený pre displayCreatedTeams
                 displayCreatedTeams(); // Obnoviť zobrazenie tabuľky s novým filtrom (ktorý sa aplikuje na VŠETKY currentFilters)
             };

             // Nastaviť focus na filtračný select po otvorení modálu
             setTimeout(() => {
                 filterSelect.focus();
             }, 0);
         }

     }
     // Spracovanie neplatného režimu
     else {
          console.error("Neplatný režim modálu klubu/filtra. Bol zadaný neznámy režim.");
          alert("Vyskytla sa chyba pri otváraní modálu. Neplatný režim.");
          closeModal(clubModal); // Zatvoriť modál v prípade chyby
          // resetClubModal(); // Resetovať po zatvorení chybového modálu
          // displayCreatedTeams(); // Obnoviť tabuľku
          return;
     }

     // Otvoriť samotné modálne okno klubu
     console.log(`INFO: Volám openModal(clubModal) pre modál v režime ${mode}.`); // <--- Debug Log
     openModal(clubModal);
}


// Event listener pre odoslanie formulára klubu (pre Create, Edit, Assign módy)
if (clubForm) {
     clubForm.addEventListener('submit', async (event) => {
         event.preventDefault(); // Zabrániť predvolenému odoslaniu formulára

         console.log("Odosielam formulár Klub v režime:", currentClubModalMode);

         // Validácia režimu - formulár by sa mal odosielať len v týchto režimoch
         if (!['assign', 'edit', 'create'].includes(currentClubModalMode)) {
             console.warn("Formulár Klub bol odoslaný v neformulárovom režime modálu:", currentClubModalMode);
             return;
         }

         // Získať hodnoty z formulára
         const clubName = clubNameInput.value.trim(); // Názov tímu/klubu (pre create/edit)
         // V Assign móde sa categoryId získa zo selectu nepriradených tímov (ak je vybraný platný tím)
         const selectedCategoryIdInModal = currentClubModalMode === 'assign' && unassignedClubSelect && unassignedClubSelect.value !== '' && !unassignedClubSelect.value.startsWith('--') && unassignedClubSelect.options[unassignedClubSelect.selectedIndex] ? unassignedClubSelect.options[unassignedClubSelect.selectedIndex].dataset.categoryId : (clubCategorySelect && clubCategorySelect.value !== '' && !clubCategorySelect.value.startsWith('--') ? clubCategorySelect.value : null);

         const selectedGroupIdInModal = clubGroupSelect && clubGroupSelect.value !== '' && !clubGroupSelect.value.startsWith('--') ? clubGroupSelect.value : null; // ID vybranej skupiny (alebo null)

         // Parsovať poradie na číslo, ak je vyplnené a select skupiny nie je prázdny, inak null
         let orderInGroup = (orderInGroupInput && orderInGroupInput.value !== '' && selectedGroupIdInModal) ? parseInt(orderInGroupInput.value, 10) : null;
         // Zabezpečiť, že poradie je platné číslo > 0
         if (typeof orderInGroup !== 'number' || orderInGroup <= 0) {
             orderInGroup = null;
         }


         let clubIdToProcess = editingClubId; // ID tímu, s ktorým sa bude pracovať (pre Edit/Replace)
         let dataToSave = {}; // Objekt s dátami na uloženie do databázy
         let operationType = currentClubModalMode; // Typ operácie (create, assign, edit, replace)


         try {
             // --- Logika spracovania formulára podľa režimu ---

             // Režim VYTVORIŤ nový tím
             if (operationType === 'create') {
                 console.log("Spracovávam formulár v režime: create");

                 // Základná validácia pre Create mód
                 if (!clubName) { alert("Zadajte názov tímu."); if (clubNameInput) clubNameInput.focus(); return; }
                 // Ak nie je vybraná kategória, ale tím má názov, ID bude len názov
                 // if (!selectedCategoryIdInModal) { alert("Vyberte platnú kategóriu."); if (clubCategorySelect) clubCategorySelect.focus(); return; }

                 // Vytvoriť ID nového dokumentu na základe kategórie a názvu
                 const selectedCategory = allAvailableCategories.find(cat => cat.id === selectedCategoryIdInModal);
                 const categoryNameForId = selectedCategory ? selectedCategory.name || selectedCategory.id : (selectedCategoryIdInModal || null); // Použiť názov alebo ID kategórie, alebo null ak kategória nebola vybraná

                 let newDocumentId;
                  if (categoryNameForId && typeof categoryNameForId === 'string' && categoryNameForId.trim() !== '') {
                       newDocumentId = `${categoryNameForId} - ${clubName}`; // Formát ID: "Názov Kategórie - Názov Tímu"
                  } else {
                       newDocumentId = clubName; // Ak nie je kategória, ID je len názov tímu
                  }


                 // Kontrola, či tím s takýmto ID už existuje
                 const existingDoc = await getDoc(doc(clubsCollectionRef, newDocumentId)); // <-- Použitie doc()
                 if (existingDoc.exists()) {
                     alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov alebo kategóriu.`);
                     if (clubNameInput) clubNameInput.focus();
                     return;
                 }

                 // Pripraviť dáta na uloženie
                 dataToSave = {
                     name: clubName, // Uložiť len základný názov
                     categoryId: selectedCategoryIdInModal, // Uložiť selectedCategoryIdInModal (môže byť null)
                     groupId: selectedGroupIdInModal, // Uložiť selectedGroupIdInModal (môže byť null)
                     orderInGroup: orderInGroup, // Uložiť orderInGroup (môže byť null)
                     createdFromBase: clubName // Uložiť základný názov, z ktorého bol tím vytvorený
                 };
                 clubIdToProcess = newDocumentId; // ID dokumentu v databáze

             }
             // Režim PRIRADIŤ nepriradený tím
             else if (operationType === 'assign') {
                 console.log("Spracovávam formulár v režime: assign");

                 // Základná validácia pre Assign mód
                 if (!unassignedClubSelect || !unassignedClubSelect.value || unassignedClubSelect.value.startsWith('--')) {
                     alert("Prosím, vyberte nepriradený tím k priradeniu.");
                     return; // Nedať focus na disabled element
                 }
                 // Validácia pre skupinu a poradie
                 if (!selectedGroupIdInModal) {
                     alert("Prosím, vyberte skupinu, do ktorej chcete tím priradiť.");
                      if (clubGroupSelect) clubGroupSelect.focus();
                     return;
                 }
                 if (typeof orderInGroup !== 'number' || orderInGroup <= 0) {
                     alert("Zadajte platné poradie tímu v skupine (číslo väčšie ako 0).");
                     if (orderInGroupInput) orderInGroupInput.focus();
                     return;
                 }


                 clubIdToProcess = unassignedClubSelect.value; // ID nepriradeného tímu, ktorý priraďujeme

                 // Načítať aktuálne dáta tímu (pre získanie názvu a pôvodnej kategórie/base name)
                 const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess)); // <-- Použitie doc()
                 if (!clubDoc.exists()) {
                     console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre priradenie.");
                     alert("Tím na priradenie sa nenašiel. Prosím, skúste znova.");
                     // Zavrieť modál, obnoviť tabuľku
                     if (clubModal) closeModal(clubModal);
                     resetClubModal(); // Resetovať stav
                     displayCreatedTeams(); // Obnoviť tabuľku
                     return;
                 }
                 const clubData = clubDoc.data();

                 // Pripraviť dáta na aktualizáciu - pridanie groupId a orderInGroup
                 dataToSave = {
                     // Názov a kategória by sa v Assign móde nemali meniť cez tento formulár, použiť existujúce hodnoty
                     name: clubData.name || clubData.id, // Použiť existujúci názov (alebo ID)
                     categoryId: clubData.categoryId || selectedCategoryIdInModal || null, // Použiť existujúcu kategóriu alebo vybranú (ak tím nemal), inak null
                     groupId: selectedGroupIdInModal, // Toto priradzujeme
                     orderInGroup: orderInGroup, // Toto priradzujeme
                     createdFromBase: clubData.createdFromBase || clubData.name || clubData.id // Ponechať pôvodný base name
                 };
                 // Zabezpečiť, že orderInGroup je null ak groupId je null (hoci v assign móde by groupId nemalo byť null pri platnej validácii)
                 if (dataToSave.groupId === null) {
                     dataToSave.orderInGroup = null;
                 }

                 operationType = 'update'; // V Assign móde ide o aktualizáciu existujúceho dokumentu

             }
             // Režim UPRAVIŤ existujúci tím
             else if (operationType === 'edit' && editingClubId) {
                 console.log("Spracovávam formulár v režime: edit");

                 // Základná validácia pre Edit mód
                 if (!clubName) { alert("Zadajte názov tímu."); if (clubNameInput) clubNameInput.focus(); return; }
                 // Kategória už nemusí byť povinná, ak povoľujete tímy bez kategórie
                 // if (!selectedCategoryIdInModal) { alert("Vyberte platnú kategóriu."); if (clubCategorySelect) clubCategorySelect.focus(); return; }
                 // Skupina a poradie nie sú povinné, ak tím má byť nepriradený (validácia je v onchange listeneri a na základe selectedGroupIdInModal)


                 clubIdToProcess = editingClubId; // ID tímu, ktorý upravujeme

                 // Načítať aktuálne dáta tímu pre porovnanie a operáciu 'replace' ak sa zmení ID
                 const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess)); // <-- Použitie doc()
                 if (!clubDoc.exists()) {
                     console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre úpravu.");
                     alert("Tím na úpravu sa nenašiel. Prosím, skúste znova.");
                     // Zavrieť modál, obnoviť tabuľku
                     if (clubModal) closeModal(clubModal);
                     resetClubModal(); // Resetovať stav
                     displayCreatedTeams(); // Obnoviť tabuľku, aby zmizol neexistujúci tím
                     return;
                 }
                 const clubData = clubDoc.data();

                 const originalClubId = clubDoc.id; // Pôvodné ID dokumentu
                 const originalCategoryId = clubData.categoryId || null; // Pôvodné ID kategórie
                 const originalName = clubData.name || clubData.id; // Pôvodný názov tímu (z poľa name alebo ID)


                 const newClubNameValue = clubName; // Nová hodnota z inputu Názov tímu
                 const newSelectedCategoryId = selectedCategoryIdInModal; // Nová vybraná kategória (môže byť null)
                 const newSelectedGroupId = selectedGroupIdInModal; // Nová vybraná skupina (môže byť null)
                 // ZMENA: Poradie je platné len ak je vybraná skupina a poradie je > 0
                 const newOrderInGroup = (newSelectedGroupId && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null; // Nové poradie (len ak je vybraná skupina a platné poradie)


                 let newDocumentId = originalClubId; // Predvolene zostáva rovnaké ID


                 // URČENIE NOVÉHO ID DOKUMENTU (ak sa zmenil NÁZOV TÍMU alebo KATEGÓRIA)
                 // ID dokumentu je "Názov Kategórie - Názov Tímu" (ak existuje kategória) alebo len "Názov Tímu"
                  const categoryForNewId = allAvailableCategories.find(cat => cat.id === newSelectedCategoryId);
                  // Použiť názov NOVEJ vybranej kategórie alebo jej ID, alebo null ak kategória nebola vybraná
                  const categoryNameForNewId = categoryForNewId ? categoryForNewId.name || categoryForNewId.id : (newSelectedCategoryId || null);


                 let potentialNewDocumentId;
                 // Ak je vybraná platná kategória, ID dokumentu je v tvare "Názov kategórie - Názov tímu"
                 if (categoryNameForNewId && typeof categoryNameForNewId === 'string' && categoryNameForNewId.trim() !== '') {
                       potentialNewDocumentId = `${categoryNameForNewId} - ${newClubNameValue}`; // Použiť názov/ID NOVEJ vybranej kategórie a zadaný názov tímu
                  } else {
                       // Ak nie je vybraná žiadna kategória
                       potentialNewDocumentId = newClubNameValue; // ID je len zadaný názov tímu
                  }


                 // Skontrolovať, či sa ID dokumentu skutočne mení
                 const idChanged = potentialNewDocumentId !== originalClubId;


                 if (idChanged) {
                     console.log(`ID dokumentu sa potenciálne mení z "${originalClubId}" na "${potentialNewDocumentId}"`);

                     // Kontrola, či nový ID už existuje v databáze
                     const existingDocWithNewId = await getDoc(doc(clubsCollectionRef, potentialNewDocumentId)); // <-- Použitie doc()
                     if (existingDocWithNewId.exists()) {
                         alert(`Tím s názvom "${potentialNewDocumentId}" (nové ID) už existuje. Prosím, zvoľte iný názov alebo kategóriu.`);
                         if (clubNameInput) clubNameInput.focus();
                         return;
                     }

                     newDocumentId = potentialNewDocumentId; // Potvrdiť nové ID
                     operationType = 'replace'; // Operácia bude REPLACE (delete starý, set nový)
                     clubIdToProcess = newDocumentId; // Nové ID na spracovanie

                 } else {
                     console.log("ID dokumentu zostáva rovnaké:", originalClubId);
                     operationType = 'update'; // Operácia bude len UPDATE existujúceho dokumentu
                     clubIdToProcess = originalClubId; // ID zostáva pôvodné
                 }


                 // Pripraviť dáta na uloženie (pre update alebo set pri replace)
                 // Použijeme NOVÉ vybrané hodnoty pre categoryId, groupId a orderInGroup
                 dataToSave = {
                     name: newClubNameValue, // Uložiť nový základný názov (z inputu)
                     categoryId: newSelectedCategoryId, // Uložiť novú kategóriu (môže byť null)
                     groupId: newSelectedGroupId, // Uložiť novú skupinu (môže byť null)
                     orderInGroup: newOrderInGroup, // Uložiť nové poradie (môže byť null)
                     // createdFromBase by sa nemal meniť pri úprave, mal by odkazovať na pôvodný zdroj vytvorenia
                     createdFromBase: clubData.createdFromBase || clubData.name || clubData.id // Ponechať pôvodný base name
                 };


                 // Ak sa zrušila skupina, vynulovať poradie (pre istotu, hoci už je v logike vyššie zahrnuté)
                 if (dataToSave.groupId === null) {
                     dataToSave.orderInGroup = null;
                 }


             }
             // Spracovanie neplatného režimu
             else {
                 console.error("Neplatný režim modálu pri odosielaní formulára.");
                 alert("Nastala chyba pri spracovaní formulára. Neplatný režim.");
                  // Zavrieť modál v prípade chyby
                  if (clubModal) closeModal(clubModal);
                  resetClubModal(); // Resetovať stav
                 return;
             }


             // --- Vykonanie operácie zápisu do databázy ---

             // Skontrolovať, či máme platné ID dokumentu pre operáciu
             if (!clubIdToProcess) {
                 console.error("Chýba ID tímu na spracovanie po spracovaní formulára.");
                 alert("Vyskytla sa chyba pri určovaní ID tímu na uloženie.");
                 // Zavrieť modál v prípade chybe
                 if (clubModal) closeModal(clubModal);
                 resetClubModal(); // Resetovať stav
                 return;
             }


             if (operationType === 'create') {
                 // Vytvorenie nového dokumentu
                 const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess); // <-- Použitie doc()
                 await setDoc(newClubDocRef, dataToSave); // Uložiť dáta do nového dokumentu s určeným ID
                 alert(`Tím "${clubIdToProcess}" bol úspešne vytvorený.`);

             } else if (operationType === 'assign' || operationType === 'update') {
                 // Aktualizácia existujúceho dokumentu
                 const clubDocRef = doc(clubsCollectionRef, clubIdToProcess); // <-- Použitie doc()
                 await updateDoc(clubDocRef, dataToSave); // Aktualizovať dáta v existujúcom dokumente
                 if (operationType === 'assign') {
                     alert("Tím bol úspešne priradený.");
                 } else { // operationType === 'update'
                     alert("Zmeny boli úspešne uložené.");
                 }

             } else if (operationType === 'replace') {
                  // Operácia REPLACE: vymazať starý dokument a vytvoriť nový s novým ID
                 if (!editingClubId) {
                     console.error("Chýba pôvodné ID tímu pre operáciu replace.");
                     alert("Vyskytla sa chyba pri premenovaní/presune tímu.");
                     // Zavrieť modál v prípade chyby
                     if (clubModal) closeModal(clubModal);
                     resetClubModal(); // Resetovať stav
                     return;
                 }
                 const originalClubDocRef = doc(clubsCollectionRef, editingClubId); // <-- Referencia na pôvodný dokument
                 const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess); // <-- Referencia na nový dokument s novým ID

                 const batch = writeBatch(db); // Použiť batch pre atomickú operáciu (buď sa vykonajú obe, alebo žiadna)
                 batch.delete(originalClubDocRef); // Pridať operáciu vymazania starého dokumentu do batch
                 batch.set(newClubDocRef, dataToSave); // Pridať operáciu vytvorenia nového dokumentu s novým ID a dátami do batch
                 await batch.commit(); // Vykonať všetky operácie v batch

                 alert(`Tím bol úspešne premenovaný/presunutý na "${clubIdToProcess}".`);
                 // Po úspešnej operácii replace, aktualizovať editingClubId, aby ukazovalo na nové ID, ak by sa znova otvoril modál z riadku, ktorý bol nahradený
                 editingClubId = clubIdToProcess;


             } else {
                 console.error("Neznámy typ operácie po spracovaní dát:", operationType);
                 alert("Vyskytla sa chyba pri ukladaní dát. Neznámy typ operácie.");
                 // Zavrieť modál v prípade chyby
                 if (clubModal) closeModal(clubModal);
                 resetClubModal(); // Resetovať stav
                 return;
             }

             // --- Spoločné kroky po úspešnom zápise ---
             // Po úspešnom uložení/aktualizácii/vytvorení zavrieť modál a obnoviť zobrazenie tabuľky
             if (clubModal) closeModal(clubModal); // Zatvoriť modálne okno
             resetClubModal(); // Resetovať stav modálu
             displayCreatedTeams(); // Obnoviť zobrazenie tabuľky

         } catch (error) {
             // Spracovanie chýb pri zápise do databázy
             console.error('Chyba pri ukladaní dát tímu: ', error);
             alert(`Chyba pri ukladaní dát! Prosím, skúste znova. Detail: ${error.message}`);
              // Zavrieť modál a resetovať stav aj v prípade chyby zápisu do DB
              // Táto logika by mala byť zvážená - niekedy je lepšie nechať modál otvorený s chybou pre opravu
              // Ale pre zjednodušenie ju ponecháme.
              if (clubModal) closeModal(clubModal);
              resetClubModal();
         }
     });
} else { console.error("Club form not found!"); }


// Funkcia na zobrazenie vytvorených tímov (klubov) v tabuľke na stránke
async function displayCreatedTeams() {
    console.log("Zobrazujem vytvorené tímy...");
    // Získať referencie na telo a hlavičku tabuľky
    if (!createdTeamsTableBody || !createdTeamsTableHeader) {
        console.error("Tabuľka pre vytvorené tímy (tbody alebo thead) nenájdená v HTML!");
        return;
    }

    createdTeamsTableBody.innerHTML = ''; // Vyčistiť telo tabuľky pred naplnením

    // Nastaviť header tabuľky, ak je prázdny
    // OPRAVA: Použiť .trim() na odstránenie bielych znakov pri kontrole prázdnoty innerHTML
    if (createdTeamsTableHeader.innerHTML.trim() === '') {
        createdTeamsTableHeader.innerHTML = `
            <th data-filter-type="teamName">Názov tímu</th>
            <th data-filter-type="category">Kategória</th>
            <th data-filter-type="group">Skupina</th>
            <th>Poradie v skupine</th>
            <th>Akcie</th>
        `;
        // ZMENA: Listener na hlavičky sa pridá až na konci DOMContentLoaded pre istotu
        // addHeaderFilterListeners();
    }


    try {
        // Načítať všetky tímy (clubs) z databázy
        const querySnapshot = await getDocs(clubsCollectionRef);
        console.log("Načítané dokumenty tímov (clubs) z DB:", querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))); // Logovať načítané dokumenty

        // Mapovať dokumenty na polia objektov tímov
        allTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Spracované tímy (allTeams array):", allTeams.length); // Logovať počet tímov

        // Načítať kategórie a skupiny, ak ešte nie sú načítané (potrebné pre zobrazenie názvov a filtrovanie)
        // Tieto by mali byť načítané už pri načítaní stránky
        if (allAvailableCategories.length === 0) {
            await loadAllCategoriesForDynamicSelects(); // Načíta kategórie ak ešte nie sú
        }
        console.log("Aktuálne dostupné kategórie (allAvailableCategories):", allAvailableCategories.length); // Logovať počet kategórií

        if (allAvailableGroups.length === 0) {
            await loadAllGroups(); // Načíta skupiny na pozadí
        }
        console.log("Aktuálne dostupné skupiny (allAvailableGroups):", allAvailableGroups.length); // Logovať počet skupín


        // Ak nie sú žiadne tímy v databáze
        if (allTeams.length === 0) {
             // Ak header ešte nebol nastavený, nastaviť ho aj v tomto prípade
             if (createdTeamsTableHeader.innerHTML.trim() === '') {
                  createdTeamsTableHeader.innerHTML = `
                       <th data-filter-type="teamName">Názov tímu</th>
                       <th data-filter-type="category">Kategória</th>
                       <th data-filter-type="group">Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                   `;
                  // ZMENA: Listener na hlavičky sa pridá až na konci DOMContentLoaded pre istotu
                  // addHeaderFilterListeners();
             }
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Zatiaľ nie sú vytvorené žiadne tímy.</td></tr>'; // Colspan na 5 stĺpcov
            teamsToDisplay = []; // V prípade, že nie sú tímy, pole na zobrazenie je prázdne
            return; // Ukončiť funkciu
        }


         // Zoraďovanie všetkých tímov abecedne podľa názvu pred filtrovaním (základné zoraďovanie tabuľky)
         // Použiť .trim().toLowerCase() pre case-insensitive a whitespace-agnostic zoraďovanie
         allTeams.sort((a, b) => {
             const nameA = (a.name || a.id || '').trim().toLowerCase();
             const nameB = (b.name || b.id || '').trim().toLowerCase();
             return nameA.localeCompare(nameB, 'sk-SK'); // Abecedné zoraďovanie s diakritikou
         });


        // --- Aplikácia KUMULATÍVNYCH filtrov ---
        teamsToDisplay = allTeams; // Začať s celým, zoradeným zoznamom tímov

        console.log("INFO: Aplikujem kumulatívne filtre:", currentFilters); // <--- Debug Log

        // Iterovať cez všetky možné typy filtrov a aplikovať ich, ak sú aktívne
        Object.keys(currentFilters).forEach(filterType => {
            const filterValue = currentFilters[filterType];

            // Aplikovať filter iba ak filterValue nie je null
            if (filterValue !== null) {
                console.log(`INFO: Aplikujem filter '${filterType}' s hodnotou '${filterValue}'`); // <--- Debug Log

                 // Hodnota filtra prevedená na lowercase a orezaná pre case-insensitive porovnanie
                const filterValueLowerTrimmed = typeof filterValue === 'string' ? filterValue.trim().toLowerCase() : filterValue;


                // Filtrovať teamsToDisplay NA ZÁKLADE AKTUÁLNEHO STAVU teamsToDisplay
                teamsToDisplay = teamsToDisplay.filter(team => { // Filter aplikovať na AKTULNE teamsToDisplay
                    // Prevod hodnôt tímu na lowercase a orezanie pre porovnanie
                     const teamNameLowerTrimmed = (team.name || team.id || '').trim().toLowerCase(); // Názov tímu z poľa 'name'
                     const teamCreatedFromBaseLowerTrimmed = (team.createdFromBase || '').trim().toLowerCase(); // Pôvodný základný názov
                     const teamCategoryId = team.categoryId; // ID kategórie (ponechať pôvodné pre vyhľadanie v mape)
                     const teamGroupId = team.groupId; // ID skupiny (ponechať pôvodné)

                    if (filterType === 'teamName') {
                        // Filter podľa názvu tímu (porovnať s názvom tímu ALEBO createdFromBase)
                         const baseNameLowerTrimmed = (team.createdFromBase || parseTeamName(team.id).baseName || '').trim().toLowerCase(); // Získať base name z createdFromBase alebo parsovaním
                         // Porovnať filtrovanú hodnotu s base name tímu (case-insensitive)
                         return baseNameLowerTrimmed === filterValueLowerTrimmed;

                    } else if (filterType === 'category') {
                        // Filter podľa kategórie
                        let teamCategoryNameLowerTrimmed = null; // Inicializovať na null

                        if (teamCategoryId) {
                             // Nájsť kategóriu v zozname kategórií
                             const category = allAvailableCategories.find(cat => cat.id === teamCategoryId);
                             // Ak sa nájde kategória, použiť jej názov alebo ID, inak použiť categoryId z tímu
                             teamCategoryNameLowerTrimmed = (category ? category.name || category.id : teamCategoryId || '').trim().toLowerCase();
                        }
                         // Porovnať názov kategórie tímu (alebo prázdny reťazec) s filtrovanou hodnotou
                        // Ak filtrovaná hodnota je 'neznáma kategória' a tím nemá categoryId, zobraziť ho
                        // ZMENA: Presnejšie porovnanie, vrátane "Neznáma kategória"
                        if (filterValueLowerTrimmed === 'neznáma kategória') {
                             // Zobraziť tímy, ktoré NEMAJÚ categoryId (alebo je prázdny reťazec/null/undefined)
                             return !teamCategoryId || (typeof teamCategoryId === 'string' && teamCategoryId.trim() === '');
                        } else {
                             // Zobraziť tímy, ktorých názov kategórie (alebo ID) sa zhoduje s filtrovanou hodnotou
                              return teamCategoryNameLowerTrimmed === filterValueLowerTrimmed;
                        }


                    } else if (filterType === 'group') {
                        // Filter podľa skupiny

                        // Špeciálny prípad: filter je na "Nepriradené"
                        if (filterValueLowerTrimmed === 'nepriradené') {
                             // Zobraziť tímy, ktoré NEMAJÚ groupId (null, undefined, alebo prázdny reťazec po orežaní)
                             return !teamGroupId || (typeof teamGroupId === 'string' && teamGroupId.trim() === '');
                        } else {
                             // Filter je na konkrétnu skupinu (nie "Nepriradené")
                             let teamGroupNameLowerTrimmed = null; // Inicializovať na null

                             if (teamGroupId) {
                                  // Nájsť skupinu v zozname skupín
                                  const group = allAvailableGroups.find(g => g.id === teamGroupId);
                                  if (group) {
                                       // Ak sa nájde skupina, použiť jej názov alebo ID
                                       teamGroupNameLowerTrimmed = (group.name || group.id || '').trim().toLowerCase();
                                  } else {
                                       // Prípad dátovej nekonzistencie - tím má groupId, ale skupina neexistuje v allAvailableGroups
                                       // Použiť groupId z tímu ako názov skupiny
                                        teamGroupNameLowerTrimmed = (teamGroupId || '').trim().toLowerCase(); // Použiť ID skupiny tímu
                                       console.warn(`Tím ID: ${team.id} má groupId "${teamGroupId}", ale skupina s týmto ID nebola nájdená v allAvailableGroups. Pri filtrovaní porovnávam s ID.`);
                                  }
                             }
                              // Porovnať názov skupiny tímu (alebo prázdny reťazec) s filtrovanou hodnotou
                             return teamGroupNameLowerTrimmed === filterValueLowerTrimmed;
                        }
                    }
                    // Ak filterType nie je rozpoznaný, tím sa nezahrnie (prípadne by sa malo vrátiť true)
                    return false; // Ak žiaden filter nesedí, nezaradiť tím
                });
                 console.log(`INFO: Počet tímov po aplikovaní filtra '${filterType}':`, teamsToDisplay.length); // <--- Debug Log
            }
        });

        console.log(`INFO: Celkový počet tímov po kumulatívnom filtrovaní:`, teamsToDisplay.length); // <--- Debug Log


        // --- Zobrazenie filtrovaných (a zoradených) tímov v tabuľke ---
        if (teamsToDisplay.length === 0) {
             // Ak header ešte nebol nastavený, nastaviť ho aj v tomto prípade
             if (createdTeamsTableHeader.innerHTML.trim() === '') {
                  createdTeamsTableHeader.innerHTML = `
                       <th data-filter-type="teamName">Názov tímu</th>
                       <th data-filter-type="category">Kategória</th>
                       <th data-filter-type="group">Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                   `;
                  // ZMENA: Listener na hlavičky sa pridá až na konci DOMContentLoaded pre istotu
                  // addHeaderFilterListeners();
             }
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Žiadne tímy zodpovedajúce filtru.</td></tr>'; // Colspan na 5 stĺpcov
            return; // Ukončiť funkciu
        }


        // Vygenerovať HTML riadky pre každý tím vo filtrovanom zozname
        teamsToDisplay.forEach(team => {
            // console.log("Spracovávam tím pre zobrazenie:", team); // Logovať aktuálny tím

            const row = createdTeamsTableBody.insertRow(); // Vložiť nový riadok
            row.dataset.teamId = team.id; // Uložiť ID tímu do data atribútu riadku


            // Bunka pre Názov tímu
            const teamNameCell = row.insertCell();
            // Zobraziť názov tímu z poľa 'name' dokumentu (podľa logu toto obsahuje časť bez kategórie)
            teamNameCell.textContent = team.name || 'Neznámy názov'; // Použiť team.name, ak existuje, inak placeholder
             // console.log(`Tím ID: ${team.id}, Zobrazený Názov (z name): ${teamNameCell.textContent}`); // Logovať zobrazený názov

            // Bunka pre Kategóriu
            const categoryCell = row.insertCell();
             // Zobraziť kategóriu - POUŽIŤ categoryId a allAvailableCategories
             const category = allAvailableCategories.find(cat => cat.id === team.categoryId); // Nájsť kategóriu podľa ID
             // Ak sa nájde kategória (má meno), zobraziť meno, inak zobraziť ID alebo placeholder
            categoryCell.textContent = category ? category.name : (team.categoryId || 'Neznáma kategória');
             // console.log(`Tím ID: ${team.id}, categoryId: ${team.categoryId}, Názov kategórie (z allAvailableCategories): ${category ? category.name : 'Nenájdená'}`); // Logovať kategóriu

            // Bunka pre Skupinu
            const groupCell = row.insertCell();
            let displayedGroupName = 'Nepriradené'; // Predvolená hodnota pre nepriradené tímy

            // ZMENA: Použiť team.groupId a allAvailableGroups na zobrazenie názvu skupiny
            if (team.groupId && typeof team.groupId === 'string' && team.groupId.trim() !== '') { // Skontrolovať, či groupId existuje a je reťazec a nie je prázdny
                 const group = allAvailableGroups.find(g => g.id === team.groupId); // Nájsť skupinu v allAvailableGroups
                 if (group) {
                      displayedGroupName = group.name || group.id; // Ak sa nájde, použiť name alebo id skupiny
                 } else {
                      // Ak sa skupina nenašla v allAvailableGroups (napr. nekonzistencia dát)
                      // Zobraziť groupId z tímu ako názov skupiny a logovať upozornenie
                      displayedGroupName = team.groupId;
                      console.warn(`Tím ID: ${team.id} má groupId "${team.groupId}", ale skupina nebola nájdená v allAvailableGroups. Zobrazujem groupId.`);
                 }
            } else if (team.groupId) {
                 // Ak groupId existuje, ale nie je reťazec (chyba v dátach)
                 displayedGroupName = 'Neznáma skupina (neplatný formát ID)';
                 console.warn(`Tím ID: ${team.id} má groupId s neplatným formátom (nie reťazec):`, team.groupId);
            }
            // Ak team.groupId neexistuje alebo je prázdny, displayedGroupName zostane 'Nepriradené'

            groupCell.textContent = displayedGroupName; // Nastaviť text bunky s názvom skupiny
             // console.log(`Tím ID: ${team.id}, groupId: ${team.groupId}, Zobrazený názov skupiny (z allAvailableGroups alebo ID): ${displayedGroupName}`); // Logovať skupinu


            // Bunka pre Poradie v skupine
            const orderCell = row.insertCell();
            // Zobraziť poradie len ak je tím priradený do skupiny (má groupId) A poradie je číslo > 0
            // ZMENA: Použiť team.groupId v podmienke namiesto team.assignedGroup
            orderCell.textContent = (team.groupId && typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-'; // Zobraziť poradie, ak je platné, inak '-'
            orderCell.style.textAlign = 'center'; // Centrovať text v bunke poradia
             // console.log(`Tím ID: ${team.id}, orderInGroup: ${team.orderInGroup}, Zobrazené poradie: ${orderCell.textContent}`); // Logovať poradie


            // Bunka pre Akcie
            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions-cell'); // Pridať triedu pre štýlovanie
            actionsCell.style.textAlign = 'center'; // Centrovať obsah akcie
            // Použiť flexbox pre zarovnanie tlačidiel v bunke
            actionsCell.style.display = 'flex';
            actionsCell.style.justifyContent = 'center';
            actionsCell.style.alignItems = 'center';
            actionsCell.style.gap = '5px'; // Medzera medzi tlačidlami

            // Tlačidlo Upraviť
            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť'; // Text tlačidla
            editButton.classList.add('action-button'); // Všeobecná trieda pre tlačidlá akcií
            // Pridať listener pre kliknutie - otvorí modál klubu v režime 'edit' s ID tímu
            editButton.onclick = () => {
                if (typeof openClubModal === 'function') {
                    openClubModal(team.id, 'edit'); // Volanie funkcie na otvorenie modálu úpravy
                } else {
                    console.error("Funkcia openClubModal nie je dostupná. Skontrolujte importy.");
                    alert("Funkcia na úpravu tímu nie je dostupná.");
                }
            };
            actionsCell.appendChild(editButton); // Pridať tlačidlo do bunky

            // Tlačidlo Vymazať
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Vymazať';
            // Pridať triedy action-button a delete-button pre štýlovanie
            deleteButton.classList.add('action-button', 'delete-button');
            // Pridať listener pre kliknutie - vymaže tím po potvrdení
            deleteButton.onclick = async () => {
                // Zobraziť konfirmačné okno s názvom tímu (ID)
                if (confirm(`Naozaj chcete vymazať tím "${team.id}"? Táto akcia je nezvratná!`)) {
                    await deleteTeam(team.id); // Volanie funkcie na vymazanie tímu
                    // displayCreatedTeams(); // Znovu zobraziť zoznam po vymazaní - volá sa už v deleteTeam
                }
            };
            actionsCell.appendChild(deleteButton); // Pridať tlačidlo do bunky


            // Pridať bunky k riadku (už boli pridané pri insertCell, ale pre prehľadnosť)
            // row.appendChild(teamNameCell);
            // row.appendChild(categoryCell);
            // row.appendChild(groupCell);
            // row.appendChild(orderCell);
            // row.appendChild(actionsCell);

            // Pridať riadok do tela tabuľky
            createdTeamsTableBody.appendChild(row);
        });

    } catch (e) {
        // Spracovanie chýb pri načítaní alebo zobrazovaní tímov
        console.error("Chyba pri zobrazovaní tímov: ", e);
         // Ak header ešte nebol nastavený, nastaviť ho aj v tomto prípade
         if (createdTeamsTableHeader.innerHTML.trim() === '') {
                  createdTeamsTableHeader.innerHTML = `
                       <th data-filter-type="teamName">Názov tímu</th>
                       <th data-filter-type="category">Kategória</th>
                       <th data-filter-type="group">Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                   `;
                  // ZMENA: Listener na hlavičky sa pridá až na konci DOMContentLoaded pre istotu
                  // addHeaderFilterListeners();
             }
         // Zobraziť chybovú správu s colspanom
        createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Nepodarilo sa načítať tímy.</td></tr>'; // Colspan na 5 stĺpcov
        allTeams = []; // Zabezpečiť, že pole je prázdne v prípade chyby
        teamsToDisplay = []; // Aj pole na zobrazenie
    }
}


// Pridá event listener na hlavičky tabuľky pre otvorenie filtračného modálu
function addHeaderFilterListeners() {
    console.log("INFO: Spustená funkcia addHeaderFilterListeners."); // <--- Debug Log
    if (!createdTeamsTableHeader) {
        console.error("Header element pre pridanie filtrovacích poslucháčov nenájdený!");
        return;
    }
    console.log("INFO: Header element nájdený.", createdTeamsTableHeader); // <--- Debug Log
    const headerCells = createdTeamsTableHeader.querySelectorAll('th'); // Získať všetky th elementy v thead
    console.log("INFO: Nájdené TH elementy:", headerCells.length, headerCells); // <--- Debug Log


    headerCells.forEach(headerCell => {
         console.log("INFO: Spracovávam TH element.", headerCell); // <--- Debug Log
        const filterType = headerCell.dataset.filterType; // Získať typ filtra z data atribútu

        if (filterType) { // Ak má th element data-filter-type atribút (tj. je filtrovateľný stĺpec)
            headerCell.style.cursor = 'pointer'; // Zmeniť kurzor na pointer

            // ZMENA: Použiť addEventListener pre pridanie poslucháča kliknutia
            // Odstrániť predošlé listenery pred pridaním nového
            headerCell.removeEventListener('click', handleHeaderClick); // Najprv odstrániť existujúci handler ak existuje
            headerCell.addEventListener('click', handleHeaderClick); // Potom pridať nový handler
        } else {
             console.log("INFO: TH nie je filtrovateľný."); // <--- Debug Log
        }
    });
    console.log("INFO: Funkcia addHeaderFilterListeners dokončená."); // <--- Debug Log
}

// ZMENA: Samostatná funkcia pre obsluhu kliknutia na hlavičku
function handleHeaderClick() {
     const filterType = this.dataset.filterType; // 'this' odkazuje na kliknutý th element
     console.log(`INFO: Kliknuté na hlavičku filtra (handler): ${filterType}`); // <--- Debug Log
     // Volanie openClubModal v režime filter s typom filtra
     console.log(`INFO: Volám openClubModal('${filterType}', 'filter') z handlera kliknutia.`); // <--- Debug Log
     openClubModal(filterType, 'filter');
}


// Funkcia na vymazanie tímu z databázy
async function deleteTeam(teamId) {
     console.log("Mažem tím s ID:", teamId);
     try {
         const teamDocRef = doc(clubsCollectionRef, teamId); // Referencia na dokument tímu
         await deleteDoc(teamDocRef); // Vymazať dokument
         console.log(`Tím s ID ${teamId} bol úspešne vymazaný.`);
         // Po úspešnom vymazaní znovu zobraziť celý zoznam pre aktualizáciu tabuľky
         // Táto funkcia volá displayCreatedTeams, ktorá načíta a zobrazí dáta s AKTUÁLNYM filtrom
         displayCreatedTeams();
         // Po vymazaní tímu by mohlo byť potrebné aktualizovať zoznam nepriradených tímov v modále klubu
         // Ak by bol modál otvorený, treba by bolo zavrieť/resetovať
         if (clubModal && clubModal.style.display !== 'none') {
             // Ak je otvorený modál Assign, obnoviť select nepriradených tímov
             if (currentClubModalMode === 'assign') {
                  populateUnassignedClubsSelect();
             }
              // Ak bol vymazaný tím, ktorý sa upravoval (edit mode), zavrieť modál
             if (editingClubId === teamId) {
                  closeModal(clubModal);
                  resetClubModal();
             }
         }


     } catch (e) {
         console.error(`Chyba pri mazaní tímu s ID ${teamId}:`, e);
         alert("Nepodarilo sa vymazať tím. Prosím, skúste znova.");
     }
}


// --- Inicializácia pri načítaní stránky ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM plne načítaný pre zoznam tímov."); // <--- Debug Log

    // Načítať všetky kategórie a skupiny na pozadí (potrebné pre modály a filtrovanie)
    // Tieto sa načítajú pri štarte stránky a použijú sa všade, kde sú potrebné.
    await loadAllCategoriesForDynamicSelects(); // Načíta kategórie
    await loadAllGroups(); // Načíta skupiny


    // Zobraziť vytvorené tímy v tabuľke pri načítaní stránky
    // displayCreatedTeams() načíta tímy, nastaví počiatočné teamsToDisplay = allTeams a aplikuje AKTUÁLNE filtre
    await displayCreatedTeams();


    // ZMENA: Pridajte listenery na hlavičky tabuľky až TU, po prvom načítaní a zobrazení dát.
    // Táto funkcia teraz používa addEventListener a mala by sa vykonať len raz po DOMContentLoaded
    addHeaderFilterListeners();


    // Konfigurácia tlačidla "+" pre túto sekciu (Zoznam tímov)
     const addButton = document.getElementById('addButton');
     if (addButton) {
          addButton.style.display = 'block'; // Zobraziť tlačidlo "+"
          addButton.title = "Vytvoriť nový tím"; // Zmeniť popis tlačidla
           // Priradiť funkciu na otvorenie modalu klubu v režime 'create'
           addButton.onclick = () => {
                console.log("INFO: Kliknuté na tlačidlo '+', volám openClubModal('create')."); // <--- Debug Log
                openClubModal(null, 'create'); // Volanie openClubModal v režime 'create'
           };
      } else {
         console.error("Add button not found on teams list page!");
     }

     // Listenery na zatvorenie modálu klubu (kliknutím na X alebo mimo modálu)
     if (clubModalClose) {
         clubModalClose.addEventListener('click', () => {
              console.log("INFO: Kliknuté na X modálu, volám closeModal a resetClubModal."); // <--- Debug Log
              closeModal(clubModal);
              // ZMENA: Resetovať stav modálu, ale NIE VŠETKY filtre
              resetClubModal(); // Resetuje formulár a vizuálny stav modálu
              // Po zatvorení modalu klubu, obnoviť tabuľku s AKTUÁLNYMI filtrami (ktoré neboli resetované)
              displayCreatedTeams();
         });
     }

     if (clubModal) {
         window.addEventListener('click', (event) => {
             // Ak bol kliknutý cieľ samotný modál (pozadie), ktorý nie je obsah modálu
             // ZMENA: Skontrolovať, či kliknutý cieľ JE modál (pozadie) a NIE JE vnútri .modal-content
              const modalContent = clubModal.querySelector('.modal-content');
              if (event.target === clubModal && modalContent && !modalContent.contains(event.target)) {
                 console.log("INFO: Kliknuté mimo obsahu modálu, volám closeModal a resetClubModal."); // <--- Debug Log
                 closeModal(clubModal);
                 // ZMENA: Resetovať stav modálu, ale NIE VŠETKY filtre
                 resetClubModal(); // Resetuje formulár a vizuálny stav modálu
                 // Po zatvorení modalu klubu, obnoviť tabuľku s AKTUÁLNYMI filtrami (ktoré neboli resetované)
                 displayCreatedTeams();
             }
         });
     }
});


// Exportujte potrebné funkcie pre použitie v spravca-turnaja-script.js alebo inde
// Exportovanie funkcie openClubModal a displayCreatedTeams
// Tieto funkcie sú potrebné pre navigáciu a interakciu medzi stránkami a modulmi.
export { openClubModal, displayCreatedTeams };
// Exportujte aj ďalšie premenné, ak sú potrebné inde (napr. allAvailableCategories, allAvailableGroups)
// export { allAvailableCategories, allAvailableGroups, allTeams, teamsToDisplay, currentFilters }; // Exportujte currentFilters ak ho potrebujete inde

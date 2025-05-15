// spravca-turnaja-zoznam-timov.js (Celý kód s kumulatívnymi úpravami)

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


// Referencie na elementy a premenné súvisiace s modálom Priradiť/Upraviť Klub
const clubModal = document.getElementById('clubModal');
const clubModalClose = clubModal ? clubModal.querySelector('.close') : null;
const clubModalTitle = document.getElementById('clubModalTitle');
const clubForm = document.getElementById('clubForm');
const clubNameField = document.getElementById('clubNameField'); // Div okolo inputu názvu
const clubNameInput = document.getElementById('clubName'); // Input názvu tímu
const clubAssignmentFields = document.getElementById('clubAssignmentFields'); // Div okolo kategórie, skupiny, poradia
const clubCategorySelect = document.getElementById('clubCategorySelect'); // Select kategórie
const clubGroupSelect = document.getElementById('clubGroupSelect'); // Select skupiny
const orderInGroupInput = document.getElementById('orderInGroup'); // Input poradia
const unassignedClubField = document.getElementById('unassignedClubField'); // Div okolo selectu nepriradených
const unassignedClubSelect = document.getElementById('unassignedClubSelect'); // Select nepriradených tímov


// Dátové premenné
let allAvailableCategories = []; // Pole na uloženie všetkých dostupných kategórií
let allAvailableGroups = []; // Pole na uloženie všetkých dostupných skupín


// Premenné na sledovanie stavu modálu klubu
let editingClubId = null;
let currentClubModalMode = null; // 'assign', 'edit', 'create'


// --- Pomocné funkcie ---

// Funkcia na načítanie všetkých kategórií z databázy (pre potreby selectboxov)
async function loadAllCategoriesForDynamicSelects() {
     console.log("Načítavam kategórie pre dynamické selecty...");
     allAvailableCategories = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(categoriesCollectionRef);
         querySnapshot.forEach((doc) => {
             const categoryData = doc.data();
              if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
             } else {
                 allAvailableCategories.push({ id: doc.id, name: doc.id });
                 console.warn("Kategória dokument s ID", doc.id, "má chýbajúce, neplatné alebo prázdne 'name' pole. Používam ID ako názov.");
             }
         });
         allAvailableCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

         console.log("Načítané kategórie (allAvailableCategories):", allAvailableCategories);

     } catch (e) {
         console.error("Chyba pri načítaní kategórií: ", e);
         alert("Nepodarilo sa načítať kategórie.");
     }
}

// Funkcia na načítanie všetkých skupín (pre potreby selectboxu v modále klubu)
async function loadAllGroups() {
     console.log("Načítavam skupiny...");
     allAvailableGroups = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(groupsCollectionRef);
         querySnapshot.forEach((doc) => {
             const groupData = doc.data();
              if (groupData) {
                   allAvailableGroups.push({ id: doc.id, ...groupData });
              } else {
                   console.warn("Skupina dokument s ID", doc.id, "má prázdne dáta.");
              }
         });
         // Zoradiť skupiny podľa názvu, ak chýba použiť id
         allAvailableGroups.sort((a, b) => {
              const nameA = (a.name || a.id) || '';
              const nameB = (b.name || b.id) || '';
              return nameA.localeCompare(nameB, 'sk-SK');
         });
         console.log("Načítané skupiny (allAvailableGroups):", allAvailableGroups);

     } catch (e) {
         console.error("Chyba pri načítaní skupín:", e);
          if (clubGroupSelect) {
               clubGroupSelect.innerHTML = '<option value="">-- Chyba pri načítaní skupín --</option>';
               clubGroupSelect.disabled = true;
          }
     }
}

// Funkcia na naplnenie selectboxu skupín (Potrebné pre modál klubu) - Používa sa v openClubModal
// Používa allAvailableGroups načítané v loadAllGroups
function populateGroupSelectForClubModal(selectElement, selectedId = '', availableGroups, categoryId = null) {
    console.log("Napĺňam select skupín v modále klubu.", { selectedId, categoryId, availableGroupsCount: availableGroups.length });
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';

    // Filtrovať skupiny podľa categoryId
    const filteredGroups = categoryId
        ? availableGroups.filter(group => group.categoryId === categoryId) // Použiť priamo categoryId z dát skupiny
        : availableGroups; // Ak nie je zadaná kategória, zobrazíme všetky skupiny (alebo žiadne, ak select kategórie nebol vybraný)

    console.log(`Filtrované skupiny pre select v modále (kategória: ${categoryId}):`, filteredGroups);


    if (filteredGroups.length === 0 && categoryId && !categoryId.startsWith('--')) {
         const category = allAvailableCategories.find(cat => cat.id === categoryId);
         const categoryName = category ? category.name : categoryId;
         const option = document.createElement('option');
         option.value = "";
         option.textContent = ` -- Žiadne skupiny v kategórii "${categoryName}" --`;
         option.disabled = true;
         selectElement.appendChild(option);
    } else if (filteredGroups.length === 0 && !categoryId) {
         const option = document.createElement('option');
         option.value = "";
         option.textContent = `-- Najprv vyberte kategóriu --`;
         option.disabled = true;
         selectElement.appendChild(option);
    }
    else {
         filteredGroups.forEach(group => {
             const option = document.createElement('option');
             option.value = group.id;
             const displayedGroupName = group.name || group.id;
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


// Funkcia na naplnenie selectboxu s nepriradenými klubmi (Potrebné pre modál klubu v režime 'assign')
async function populateUnassignedClubsSelect() {
     console.log("Načítavam nepriradené tímy/kluby...");
     if (!unassignedClubSelect) { console.error("Unassigned club select not found!"); return; }

     unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
     unassignedClubSelect.disabled = false; // Predvolene povoliť (ak sa nájdu tímy, zostane povolený, ak nie, zakáže sa)

     try {
         const q = query(clubsCollectionRef, where("groupId", "==", null));
         const querySnapshot = await getDocs(q);

         if (querySnapshot.empty) {
              const option = document.createElement('option');
              option.value = "";
              option.textContent = "Žiadne nepriradené tímy";
              option.disabled = true;
              unassignedClubSelect.appendChild(option);
              unassignedClubSelect.disabled = true; // Zakázať, ak nie sú tímy
             console.log("Žiadne nepriradené tímy nájdené.");
         } else {
             const unassignedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK')); // Zoradiť podľa názvu

             unassignedTeams.forEach(team => {
                 const option = document.createElement('option');
                 option.value = team.id;
                 option.textContent = team.name || team.id;
                 option.dataset.categoryId = team.categoryId;
                 unassignedClubSelect.appendChild(option);
             });
             unassignedClubSelect.disabled = false; // Povoliť, ak sú tímy nájdené
             console.log("Nepriradené tímy načítané a spracované:", unassignedTeams.length);
         }

     } catch (e) {
         console.error("Chyba pri načítaní nepriradených tímov:", e);
         const option = document.createElement('option');
         option.value = "";
         option.textContent = "Chyba pri načítaní tímov";
         option.disabled = true;
         unassignedClubSelect.appendChild(option);
         unassignedClubSelect.disabled = true; // Zakázať na chybu
     }
}

// Funkcia na resetovanie stavu modálneho okna klubu
function resetClubModal() {
    console.log("Resetujem modál klubu.");
    editingClubId = null;
    currentClubModalMode = null; // Resetovať režim
    if (clubForm) clubForm.reset();
    // Zabezpečiť, že selectboxy sú v pôvodnom stave a sú zakázané/resetované
    if (clubCategorySelect) {
         clubCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
         clubCategorySelect.disabled = true; // Znova zakázať
         clubCategorySelect.onchange = null; // Odstrániť listener na zmenu kategórie
    }
    if (clubGroupSelect) {
         clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
         if (clubGroupSelect) clubGroupSelect.disabled = true; // Znova zakázať
    }
     // Skryť polia specifické pre režimy pri resete a zakázať/resetovať selecty
     if (clubNameField) clubNameField.style.display = 'block'; // Predvolene zobraziť názov tímu
     if (unassignedClubField) unassignedClubField.style.display = 'none'; // Predvolene skryť výber nepriradeného
     if (unassignedClubSelect) {
          unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
          unassignedClubSelect.disabled = true; // PRIDANÉ: Zakázať na resete
          unassignedClubSelect.onchange = null;
     }
     if (clubAssignmentFields) clubAssignmentFields.style.display = 'block'; // Predvolene zobraziť priradenie
     if (clubModalTitle) clubModalTitle.textContent = 'Upraviť tím'; // Predvolený titulok
     if (clubForm) {
         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Uložiť zmeny'; // Predvolený text tlačidla
     }
      // Zabezpečiť, že polia Skupina a Poradie nie sú required (HTML atribút bol odstránený)
      if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
      if (orderInGroupInput) orderInGroupInput.removeAttribute('required');
}


// Funkcia na otvorenie modálneho okna Priradiť/Upraviť Klub
// Používa sa z tabuľky zoznamu tímov (edit mode) a tlačidla + (create mode)
async function openClubModal(clubId = null, mode = 'assign') {
    console.log(`Otváram modál Klub v režime: ${mode}, ID: ${clubId}`);
     if (!clubModal || !clubModalTitle || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect) {
          console.error("Elementy modálu Klub nenájdené!");
          alert("Nastala chyba pri otváraní modálu klubu.");
          return;
     }

    resetClubModal(); // Toto nastaví základné viditeľnosti a stavy (vrátane disabled)
    editingClubId = clubId;
    currentClubModalMode = mode;


     // Načítať skupiny a kategórie, ak ešte nie sú. Tieto by mali byť načítané pri štarte stránky.
     // Pre režim 'create' potrebujeme kategórie načítané HNED, aby sme naplnili select
     if (allAvailableCategories.length === 0 || allAvailableGroups.length === 0) {
         console.log("Načítavam kategórie a/alebo skupiny v openClubModal...");
          await loadAllCategoriesForDynamicSelects();
         await loadAllGroups();
     }


     // Logika pre režim "Priradiť" (assign)
     if (mode === 'assign') {
        clubModalTitle.textContent = 'Priradiť nepriradený tím/klub';
        clubNameField.style.display = 'none';
        clubAssignmentFields.style.display = 'block';
        unassignedClubField.style.display = 'block'; // Zobraziť pole
         if (unassignedClubSelect) unassignedClubSelect.disabled = false; // POVODIŤ select pre výber nepriradeného tímu
         if (clubCategorySelect) clubCategorySelect.disabled = true; // Zakázať select kategórií v assign mode
         if (clubGroupSelect) clubGroupSelect.disabled = true; // Zakázať select skupín v assign mode, kým nie je vybraný tím


         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Priradiť';

        clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);

        await populateUnassignedClubsSelect(); // Táto funkcia už povolí/zakáže unassignedClubSelect na základe nájdených tímov


         // Listener pre zmenu nepriradených tímov - tu povolíme select skupiny
         unassignedClubSelect.onchange = async () => {
             const selectedId = unassignedClubSelect.value;
              const selectedOption = unassignedClubSelect.options[unassignedClubSelect.selectedIndex];
              const categoryId = selectedOption ? selectedOption.dataset.categoryId : null;
              console.log("Zmenený výber nepriradeného tímu.", { selectedId, categoryId });

             if (selectedId && categoryId) {
                 const category = allAvailableCategories.find(cat => cat.id === categoryId);
                 const categoryName = category ? category.name : 'Neznáma kategória';
                 clubCategorySelect.innerHTML = `<option value="${categoryId}">${categoryName}</option>`;
                  if (clubGroupSelect) clubGroupSelect.disabled = false; // POVODIŤ select skupiny
                 populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId);
             } else {
                 clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                  if (clubGroupSelect) clubGroupSelect.disabled = true; // ZAKÁZAŤ select skupiny
                 populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
             }
         };


     }
     // Logika pre režim "Upraviť" (edit)
     else if (mode === 'edit' && clubId) {
        clubModalTitle.textContent = 'Upraviť tím';
        clubNameField.style.display = 'block';
        clubAssignmentFields.style.display = 'block';
        unassignedClubField.style.display = 'none'; // Skryť pole
         if (unassignedClubSelect) unassignedClubSelect.disabled = true; // ZAKÁZAŤ select nepriradených tímov

         // ZMENA: Povoliť výber kategórie v režime edit
         if (clubCategorySelect) clubCategorySelect.disabled = false; // POVODIŤ select kategórií v edit mode
         if (clubGroupSelect) clubGroupSelect.disabled = false; // POVODIŤ select skupiny v edit mode


         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Uložiť zmeny';

        if (unassignedClubSelect) unassignedClubSelect.onchange = null;
        if (clubCategorySelect) clubCategorySelect.onchange = null; // Odstrániť prípadný starý listener


        try {
            const clubDocRef = doc(clubsCollectionRef, clubId);
            const clubDoc = await getDoc(clubDocRef);
            if (clubDoc.exists()) {
                const clubData = clubDoc.data();

                clubNameInput.value = clubData.name || clubData.id || '';
                 clubNameInput.focus();

                // ZMENA: Naplniť select kategórií všetkými možnosťami a predvybrať aktuálnu
                if (allAvailableCategories.length > 0) {
                    // Použiť populateCategorySelect z common.js
                    populateCategorySelect(clubCategorySelect, clubData.categoryId); // Naplniť a predvybrať aktuálnu kategóriu
                } else {
                    // Ak nie sú kategórie, zobraziť správu a zakázať select
                    clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
                    clubCategorySelect.disabled = true;
                }

                 // Naplniť select skupín filtrovanými skupinami pre AKTUÁLNU kategóriu tímu a nastaviť vybranú skupinu
                 // Použiť clubData.categoryId na filtrovanie pri prvom naplnení skupín
                 populateGroupSelectForClubModal(clubGroupSelect, clubData.groupId, allAvailableGroups, clubData.categoryId);


                orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : '';
                 if (orderInGroupInput) orderInGroupInput.removeAttribute('required');

                // PRIDANIE: Listener na zmenu kategórie v režime edit
                 clubCategorySelect.onchange = () => {
                     const selectedCategoryId = clubCategorySelect.value;
                     console.log("Zmenená kategória v edit mode modále klubu:", selectedCategoryId);
                     if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                         if (clubGroupSelect) clubGroupSelect.disabled = false; // Povoliť select skupiny
                         // Naplniť select skupín filtrovanými skupinami pre NOVÚ vybranú kategóriu
                         populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId); // null ako selectedId, lebo skupina sa zmenou kategórie "odpriradí" z pôvodnej skupiny
                     } else {
                          if (clubGroupSelect) clubGroupSelect.disabled = true; // Zakázať select skupiny
                          clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                     }
                 };


            } else {
                 console.error("Tím s ID", clubId, "sa nenašiel.");
                 alert("Tím na úpravu sa nenašiel.");
                 closeModal(clubModal);
                 displayCreatedTeams();
                 return;
            }
        } catch (e) {
            console.error("Chyba pri načítaní údajov tímu na úpravu:", e);
            alert("Nepodarilo sa načítať údaje tímu na úpravu.");
            closeModal(clubModal);
            displayCreatedTeams();
            return;
        }

     }
     // Logika pre nový režim "Vytvoriť" (create)
     else if (mode === 'create') {
         clubModalTitle.textContent = 'Vytvoriť nový tím';
         clubNameField.style.display = 'block';
         clubAssignmentFields.style.display = 'block';
         unassignedClubField.style.display = 'none'; // Skryť pole
         if (unassignedClubSelect) unassignedClubSelect.disabled = true; // ZAKÁZAŤ select nepriradených tímov
         if (clubCategorySelect) clubCategorySelect.disabled = false; // POVODIŤ select kategórií v create mode
         if (clubGroupSelect) clubGroupSelect.disabled = true; // ZAKÁZAŤ select skupín na začiatku v create mode


         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Vytvoriť tím';

         if (unassignedClubSelect) unassignedClubSelect.onchange = null;

         // Naplniť selectbox kategórií a povoliť ho
         if (allAvailableCategories.length > 0) {
              populateCategorySelect(clubCategorySelect, null); // null ako selectedCategoryId
              // clubCategorySelect.disabled = false; // Už nastavené v resete a zostane povolené v create mode
         } else {
              clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
              clubCategorySelect.disabled = true;
         }

         clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';


          // Listener na zmenu kategórie (pre create mode) - tu povolíme select skupiny
         clubCategorySelect.onchange = () => {
              const selectedCategoryId = clubCategorySelect.value;
              console.log("Zmenená kategória v create mode modále klubu:", selectedCategoryId);
              if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                  if (clubGroupSelect) clubGroupSelect.disabled = false; // POVODIŤ select skupiny
                  populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
              } else {
                   if (clubGroupSelect) clubGroupSelect.disabled = true; // ZAKÁZAŤ select skupiny
                   clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
              }
         };

         if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
         if (orderInGroupInput) orderInGroupInput.removeAttribute('required');

         setTimeout(() => {
             if (clubNameInput) clubNameInput.focus();
         }, 0);

     }
     // Spracovanie neplatného režimu
     else {
          console.error("Neplatný režim modálu klubu.");
          alert("Vyskytla sa chyba pri otváraní modálu klubu.");
          closeModal(clubModal);
          displayCreatedTeams();
          return;
     }

    openModal(clubModal);
}


// Listener pre odoslanie formulára Priradiť/Upraviť Klub
if (clubForm) {
     clubForm.addEventListener('submit', async (event) => {
         event.preventDefault();
         console.log("Odosielam formulár Priradiť/Upraviť Klub v režime:", currentClubModalMode);

         const clubName = clubNameInput.value.trim();
         const selectedCategoryIdInModal = clubCategorySelect ? clubCategorySelect.value : null;
         const selectedGroupIdInModal = clubGroupSelect ? clubGroupSelect.value : null;
         let orderInGroup = orderInGroupInput ? parseInt(orderInGroupInput.value, 10) : null;

         let clubIdToProcess = editingClubId;
         let dataToSave = {};
         let operationType = currentClubModalMode;


         try {
             // --- Logika pre REŽIM VYTVORIŤ ('create') ---
             if (operationType === 'create') {
                  console.log("Spracovávam formulár v režime: create");

                  if (!clubName) { alert("Zadajte názov tímu."); if (clubNameInput) clubNameInput.focus(); return; }
                  if (!selectedCategoryIdInModal || selectedCategoryIdInModal.startsWith('--')) { alert("Vyberte platnú kategóriu."); if (clubCategorySelect) clubCategorySelect.focus(); return; }

                   const selectedCategory = allAvailableCategories.find(cat => cat.id === selectedCategoryIdInModal);
                   const categoryName = selectedCategory ? selectedCategory.name : selectedCategoryIdInModal;
                   const newDocumentId = `${categoryName} - ${clubName}`;

                   const existingDoc = await getDoc(doc(clubsCollectionRef, newDocumentId));
                   if (existingDoc.exists()) {
                        alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                        if (clubNameInput) clubNameInput.focus();
                        return;
                   }

                   dataToSave = {
                       name: clubName,
                       categoryId: selectedCategoryIdInModal,
                       groupId: selectedGroupIdInModal || null,
                       orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                       createdFromBase: clubName
                   };
                   clubIdToProcess = newDocumentId;


             }
             // --- Logika pre REŽIM PRIRADIŤ ('assign') ---
             else if (operationType === 'assign') {
                  console.log("Spracovávam formulár v režime: assign");
                  // Validácia v režime assign: Musí byť vybraný nepriradený tím
                  if (!unassignedClubSelect || !unassignedClubSelect.value || unassignedClubSelect.value.startsWith('--')) {
                       alert("Prosím, vyberte nepriradený tím k priradeniu.");
                       // Netreba volať focus na zakázaný element
                       // if (unassignedClubSelect) unassignedClubSelect.focus();
                       return;
                  }
                  clubIdToProcess = unassignedClubSelect.value;

                  const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                   if (!clubDoc.exists()) {
                       console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre priradenie.");
                       alert("Tím na priradenie sa nenašiel. Prosím, skúste znova.");
                       return;
                   }
                   const clubData = clubDoc.data();

                   dataToSave = {
                       name: clubData.name || clubData.id,
                       categoryId: clubData.categoryId || null, // Kategória by mala byť v DB, ale pre istotu fallback
                       groupId: selectedGroupIdInModal || null,
                       orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                       createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                   };
                    if (dataToSave.groupId === null) {
                        dataToSave.orderInGroup = null;
                    }


             }
             // --- Logika pre REŽIM UPRAVIŤ ('edit') ---
             else if (operationType === 'edit' && editingClubId) {
                  console.log("Spracovávam formulár v režime: edit");
                 clubIdToProcess = editingClubId;

                  const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                   if (!clubDoc.exists()) {
                       console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre úpravu.");
                       alert("Tím na úpravu sa nenašiel. Prosím, skúste znova.");
                       return;
                   }
                   const clubData = clubDoc.data();
                    const originalClubId = clubDoc.id;
                   const originalCategoryId = clubData.categoryId; // Získať pôvodné ID kategórie
                   const originalName = clubData.name || clubData.id; // Pôvodný názov


                  const newClubNameForId = clubName; // Zadaný názov z inputu
                   let newDocumentId = originalClubId; // Predvolené: ID sa nemení
                   let nameFieldToSave = clubName; // Uložíme zadaný názov do poľa 'name'

                   // ZÍSKAŤ NOVÉ VYBRANÉ ID KATEGÓRIE Z MODÁLU
                   const newSelectedCategoryId = selectedCategoryIdInModal; // Získať vybranú kategóriu z modálu

                   // Skontrolovať, či sa mení názov tímu ALEBO kategória
                   const nameChanged = newClubNameForId !== originalName; // Porovnať zadaný názov s pôvodným názvom
                   const categoryChanged = newSelectedCategoryId !== originalCategoryId; // Porovnať vybranú kategóriu s pôvodnou kategóriou


                  // Ak sa zmenil názov tímu ALEBO kategória
                  if (nameChanged || categoryChanged) {
                       console.log(`Názov zmenený: ${nameChanged}, Kategória zmenená: ${categoryChanged}`);
                       // Konštruovať nové ID dokumentu na základe NOVÉHO vybraného názvu kategórie a NOVÉHO zadaného názvu tímu
                       const selectedCategoryForNewId = allAvailableCategories.find(cat => cat.id === newSelectedCategoryId);
                       const categoryNameForNewId = selectedCategoryForNewId ? selectedCategoryForNewId.name : newSelectedCategoryId; // Použiť názov NOVEJ vybranej kategórie

                       // Ak je vybraná platná kategória, ID dokumentu je v tvare "Názov kategórie - Názov tímu"
                       if (newSelectedCategoryId && !newSelectedCategoryId.startsWith('--')) {
                            newDocumentId = `${categoryNameForNewId} - ${newClubNameForId}`;
                       } else {
                            // Ak nie je vybraná žiadna kategória (prípad, ak by tím stratil kategóriu - menej bežné)
                            newDocumentId = newClubNameForId; // ID je len názov tímu
                       }

                       nameFieldToSave = newClubNameForId; // Uložiť nový názov do poľa 'name'


                       // Kontrola, či nové ID dokumentu už neexistuje, AK sa ID skutočne mení
                       if (newDocumentId !== originalClubId) {
                            console.log(`ID dokumentu sa mení z "${originalClubId}" na "${newDocumentId}"`);
                            const existingDocWithNewId = await getDoc(doc(clubsCollectionRef, newDocumentId));
                             if (existingDocWithNewId.exists()) {
                                  alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov alebo kategóriu.`);
                                  if (clubNameInput) clubNameInput.focus(); // Alebo zamerať sa na select kategórie
                                  return; // Zastaviť spracovanie formulára
                            }
                             operationType = 'replace'; // Zmeniť typ operácie na "nahradenie" (vymazať starý dokument, vytvoriť nový)
                             clubIdToProcess = newDocumentId; // ID na spracovanie je nové ID
                       } else {
                           // Názov alebo kategória sa zmenila, ale výsledné ID dokumentu zostalo rovnaké (napr. zmenili sa biele znaky v názve kategórie, ale ID je rovnaké)
                            console.log("Aktualizujem existujúci tím s ID (názov alebo kategória sa zmenila, ale ID zostáva rovnaké):", clubIdToProcess);
                            operationType = 'update'; // Zostávame v režime aktualizácie
                            // dataToSave bude zostavený nižšie s novými hodnotami
                       }

                  } else {
                       // Názov tímu ani kategória sa nezmenili. Toto je bežná aktualizácia (napr. zmenila sa skupina alebo poradie).
                       console.log("Aktualizujem existujúci tím s ID (žiadna zmena názvu ani kategórie):", clubIdToProcess);
                       nameFieldToSave = clubName; // Uložiť existujúci názov do poľa 'name' (alebo ten zadaný, ak bol zmenený len kapitálkami a pod.)
                       operationType = 'update'; // Zostávame v režime aktualizácie
                       newDocumentId = originalClubId; // ID zostáva rovnaké
                  }


                  // Dáta na aktualizáciu alebo set (pre edit režim)
                  // Použijeme NOVÉ vybrané hodnoty pre categoryId, groupId a orderInGroup
                   dataToSave = {
                       name: nameFieldToSave, // Použiť zadaný názov (nameFieldToSave)
                       categoryId: newSelectedCategoryId || null, // ZMENA: Použiť NOVÉ vybrané ID kategórie
                       groupId: selectedGroupIdInModal || null, // Použiť vybrané ID skupiny
                       orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null, // Použiť zadané poradie
                       createdFromBase: clubData.createdFromBase || clubData.name || clubData.id // Ponechať pôvodný createdFromBase
                   };

                    // Ak sa zrušila skupina, vynulovať poradie
                    if (dataToSave.groupId === null) {
                        dataToSave.orderInGroup = null;
                    }

             }
             // --- Logika pre REŽIM PRIRADIŤ ('assign') zostáva nezmenená ---
             else if (operationType === 'assign') {
                  console.log("Spracovávam formulár v režime: assign");
                  if (!unassignedClubSelect || !unassignedClubSelect.value || unassignedClubSelect.value.startsWith('--')) {
                       alert("Prosím, vyberte nepriradený tím k priradeniu.");
                       return;
                  }
                  clubIdToProcess = unassignedClubSelect.value;

                  const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToProcess));
                   if (!clubDoc.exists()) {
                       console.error("Tím s ID", clubIdToProcess, "sa nenašiel v databáze pre priradenie.");
                       alert("Tím na priradenie sa nenašiel. Prosím, skúste znova.");
                       return;
                   }
                   const clubData = clubDoc.data();

                   dataToSave = {
                       name: clubData.name || clubData.id,
                       categoryId: clubData.categoryId || null,
                       groupId: selectedGroupIdInModal || null,
                       orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                       createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                   };
                    if (dataToSave.groupId === null) {
                        dataToSave.orderInGroup = null;
                    }
             }
             // --- Logika pre REŽIM VYTVORIŤ ('create') zostáva nezmenená ---
             else if (operationType === 'create') {
                  console.log("Spracovávam formulár v režime: create");

                  if (!clubName) { alert("Zadajte názov tímu."); if (clubNameInput) clubNameInput.focus(); return; }
                  if (!selectedCategoryIdInModal || selectedCategoryIdInModal.startsWith('--')) { alert("Vyberte platnú kategóriu."); if (clubCategorySelect) clubCategorySelect.focus(); return; }

                   const selectedCategory = allAvailableCategories.find(cat => cat.id === selectedCategoryIdInModal);
                   const categoryName = selectedCategory ? selectedCategory.name : selectedCategoryIdInModal;
                   const newDocumentId = `${categoryName} - ${clubName}`;

                   const existingDoc = await getDoc(doc(clubsCollectionRef, newDocumentId));
                   if (existingDoc.exists()) {
                        alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                        if (clubNameInput) clubNameInput.focus();
                        return;
                   }

                   dataToSave = {
                       name: clubName,
                       categoryId: selectedCategoryIdInModal,
                       groupId: selectedGroupIdInModal || null,
                       orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                       createdFromBase: clubName
                   };
                   clubIdToProcess = newDocumentId;
             }
             // --- Spracovanie neplatného režimu ---
             else {
                  console.error("Neplatný režim modálu pri odosielaní formulára.");
                  alert("Nastala chyba pri spracovaní formulára. Neplatný režim.");
                  return;
             }


             // --- Vykonanie databázovej operácie na základe operationType ---
             if (!clubIdToProcess) {
                  console.error("Chýba ID tímu na spracovanie.");
                  alert("Vyskytla sa chyba pri určovaní ID tímu.");
                  return;
             }

             if (operationType === 'create') {
                  const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess);
                  await setDoc(newClubDocRef, dataToSave);
                  alert(`Tím "${clubIdToProcess}" bol úspešne vytvorený.`);

             } else if (operationType === 'assign' || operationType === 'update') {
                  const clubDocRef = doc(clubsCollectionRef, clubIdToProcess);
                  await updateDoc(clubDocRef, dataToSave);
                   if (operationType === 'assign') {
                        alert("Tím bol úspešne priradený.");
                   } else {
                         alert("Zmeny boli úspešne uložené.");
                   }

             } else if (operationType === 'replace') {
                  // V režime replace sa editingClubId používa ako pôvodné ID pre vymazanie
                  if (!editingClubId) {
                      console.error("Chýba pôvodné ID tímu pre operáciu replace.");
                      alert("Vyskytla sa chyba pri premenovaní tímu.");
                      return;
                  }
                  const originalClubDocRef = doc(clubsCollectionRef, editingClubId);
                  const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess);

                   const batch = writeBatch(db);
                   batch.delete(originalClubDocRef);
                   batch.set(newClubDocRef, dataToSave);
                   await batch.commit();

                   alert(`Tím bol úspešne premenovaný/presunutý na "${clubIdToProcess}".`);

             } else {
                  console.error("Neznámy typ operácie po spracovaní dát:", operationType);
                  alert("Vyskytla sa chyba pri ukladaní dát.");
                  return;
             }


             // --- Spoločné kroky po úspešnej operácii ---
             if (clubModal) closeModal(clubModal);
             resetClubModal();
             displayCreatedTeams();

         } catch (error) {
             console.error('Chyba pri ukladaní dát tímu: ', error);
             alert(`Chyba pri ukladaní dát! Prosím, skúste znova. Detail: ${error.message}`);
              // resetClubModal(); // Volajte reset aj pri chybe, ak chcete vyčistiť formulár
         }
     });
} else { console.error("Club form not found!"); }


// Funkcia na zobrazenie vytvorených tímov (klubov) v tabuľke na stránke
async function displayCreatedTeams() {
    console.log("Zobrazujem vytvorené tímy...");
    if (!createdTeamsTableBody || !createdTeamsTableHeader) {
        console.error("Tabuľka pre vytvorené tímy nenájdená!");
        return;
    }

    createdTeamsTableBody.innerHTML = '';

    // Hlavička sa vytvára len raz pri prvom načítaní, alebo ak bola vyčistená
    // OPRAVA: Použiť .trim() na odstránenie bielych znakov pri kontrole prázdnoty innerHTML
    if (createdTeamsTableHeader.innerHTML.trim() === '') {
         createdTeamsTableHeader.innerHTML = `
              <th>Názov tímu</th>
              <th>Kategória</th>
              <th>Skupina</th>
              <th>Poradie v skupine</th>
              <th>Akcie</th>
         `;
    }


    try {
        const querySnapshot = await getDocs(clubsCollectionRef);
        console.log("Načítané dokumenty tímov (clubs) z DB:", querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));

        const teams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Spracované tímy (teams array):", teams);


         // Zabezpečiť načítanie kategórií a skupín, ak ešte nie sú
         if (allAvailableCategories.length === 0) {
             await loadAllCategoriesForDynamicSelects();
        }
        console.log("Aktuálne dostupné kategórie (allAvailableCategories):", allAvailableCategories);


        if (allAvailableGroups.length === 0) {
             await loadAllGroups();
        }
         console.log("Aktuálne dostupné skupiny (allAvailableGroups):", allAvailableGroups);


        if (teams.length === 0) {
             if (createdTeamsTableHeader.innerHTML.trim() === '') { // Aj tu použiť trim pre konzistentnosť
                  createdTeamsTableHeader.innerHTML = `
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  `;
             }
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Zatiaľ nie sú vytvorené žiadne tímy.</td></tr>';
            return;
        }

         // Znovu skontrolovať a naplniť hlavičku pre prípad, že neboli tímy pri prvom načítaní
         if (createdTeamsTableHeader.innerHTML.trim() === '') {
                  createdTeamsTableHeader.innerHTML = `
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  `;
             }

        // Zoradiť tímy abecedne podľa Názvu tímu (name), so zohľadnením slovenskej abecedy a diakritiky
        teams.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));


        teams.forEach(team => {
            const row = createdTeamsTableBody.insertRow();
            row.dataset.teamId = team.id;


            const teamNameCell = row.insertCell();
            teamNameCell.textContent = team.name || 'Neznámy názov';


            const categoryCell = row.insertCell();
            const category = allAvailableCategories.find(cat => cat.id === team.categoryId);
            categoryCell.textContent = category ? category.name : (team.categoryId || 'Neznáma kategória');


            const groupCell = row.insertCell();
            let displayedGroupName = 'Nepriradené';
            if (team.groupId && typeof team.groupId === 'string') {
                 // Zobraziť názov skupiny z pola name skupiny, ak sa nájde v allAvailableGroups
                 const group = allAvailableGroups.find(g => g.id === team.groupId);
                 displayedGroupName = group ? (group.name || group.id) : team.groupId; // Ak sa nájde, použiť name alebo id skupiny, inak použiť groupId z tímu
            } else if (team.groupId) {
                 displayedGroupName = 'Neznáma skupina (neplatný formát ID)';
                 console.warn(`Tím ID: ${team.id} má groupId s neplatným formátom (nie reťazec):`, team.groupId);
            }
            groupCell.textContent = displayedGroupName;


            const orderCell = row.insertCell();
            orderCell.textContent = (team.groupId && typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-';
            orderCell.style.textAlign = 'center';


            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions-cell');
            actionsCell.style.textAlign = 'center';
            actionsCell.style.display = 'flex'; // Zabezpečiť flex kontajner pre tlačidlá
            actionsCell.style.justifyContent = 'center'; // Centrujte obsah
            actionsCell.style.alignItems = 'center';
            actionsCell.style.gap = '5px';


            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť / Priradiť';
            editButton.classList.add('action-button');
            editButton.onclick = () => {
                 if (typeof openClubModal === 'function') {
                      openClubModal(team.id, 'edit'); // Otvoriť v režime edit
                 } else {
                      console.error("Funkcia openClubModal nie je dostupná.");
                      alert("Funkcia na úpravu tímu nie je dostupná.");
                 }
            };


            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Vymazať';
            deleteButton.classList.add('action-button', 'delete-button');
            deleteButton.onclick = async () => {
                if (confirm(`Naozaj chcete vymazať tím "${team.name || team.id}"?`)) {
                    await deleteTeam(team.id);
                }
            };

            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);


            row.appendChild(teamNameCell);
            row.appendChild(categoryCell);
            row.appendChild(groupCell);
            row.appendChild(orderCell);
            row.appendChild(actionsCell);


            createdTeamsTableBody.appendChild(row);
        });


    } catch (e) {
        console.error("Chyba pri zobrazovaní tímov: ", e);
         if (createdTeamsTableHeader.innerHTML.trim() === '') { // Aj tu použiť trim pre konzistentnosť
                  createdTeamsTableHeader.innerHTML = `
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  `;
             }
        createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Nepodarilo sa načítať tímy.</td></tr>';
    }
}


async function deleteTeam(teamId) {
     console.log("Mažem tím s ID:", teamId);
     try {
         const teamDocRef = doc(clubsCollectionRef, teamId);
         await deleteDoc(teamDocRef);
         console.log("Tím bol úspešne vymazaný.");

         displayCreatedTeams();

     } catch (e) {
         console.error("Chyba pri mazaní tímu:", e);
         alert("Nepodarilo sa vymazať tím.");
     }
}


// --- Inicializácia ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM plne načítaný pre zoznam tímov.");

    // Pri načítaní stránky načítať všetky kategórie a skupiny na pozadí
    await loadAllCategoriesForDynamicSelects();
    await loadAllGroups();


    // Zobraziť vytvorené tímy v tabuľke pri načítaní stránky
    displayCreatedTeams();


    // Konfigurácia tlačidla "+" pre túto sekciu (Zoznam tímov)
     const addButton = document.getElementById('addButton');
     if (addButton) {
          addButton.style.display = 'block';
          addButton.title = "Vytvoriť nový tím"; // Zmeniť popis tlačidla
           // Priradiť funkciu na otvorenie modalu klubu v režime 'create'
           addButton.onclick = () => {
                openClubModal(null, 'create'); // Volanie openClubModal v režime 'create'
           };
      } else {
         console.error("Add button not found on teams list page!");
     }

     // Listenery na zatvorenie modálu klubu (kliknutím na X alebo mimo modálu)
     if (clubModalClose) {
         clubModalClose.addEventListener('click', () => {
              closeModal(clubModal);
              resetClubModal(); // Resetovať po zatvorení
         });
     }

     if (clubModal) {
         window.addEventListener('click', (event) => {
             if (event.target === clubModal) {
                 closeModal(clubModal);
                 resetClubModal(); // Resetovať po zatvorení
             }
         });
     }

});


// Exportujte potrebné funkcie pre použitie v spravca-turnaja-script.js alebo inde
export { openClubModal, displayCreatedTeams };

// spravca-turnaja-zoznam-timov.js (Celý kód s úpravami)

// Import necessary functions and references from common.js
import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef,
         openModal, closeModal,
         populateCategorySelect, // Importujeme populateCategorySelect z common.js
         doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc, writeBatch } from './spravca-turnaja-common.js';


// Získanie referencií na elementy DOM modálov a tabuľky
const teamCreationModal = document.getElementById('teamCreationModal'); // Tento modal už + tlačidlo neotvára
const teamCreationModalClose = teamCreationModal ? teamCreationModal.querySelector('.close') : null;
const teamCreationForm = document.getElementById('teamCreationForm');
const teamNameInput = document.getElementById('teamNameInput'); // Tieto už nie sú relevantné pre + tlačidlo, ale zostávajú pre pôvodný modal ak je stále v HTML
const teamCategoryCountContainer = document.getElementById('teamCategoryCountContainer'); // Tieto už nie sú relevantné pre + tlačidlo
const addCategoryCountPairButton = document.getElementById('addCategoryCountPairButton'); // Tieto už nie sú relevantné pre + tlačidlo

const createdTeamsTableBody = document.getElementById('createdTeamsTableBody');
const createdTeamsTableHeader = document.getElementById('createdTeamsTableHeader');


// Referencie na elementy a premenné súvisiace s modálom Správa tímov (ak sa používa)
const manageTeamsModal = document.getElementById('manageTeamsModal'); // Tento modal sa v tomto kóde nepoužíva
const manageTeamsModalClose = manageTeamsModal ? manageTeamsModal.querySelector('.close') : null;
const baseTeamNameInModal = document.getElementById('baseTeamNameInModal');
const teamsListInModal = document.getElementById('teamsListInModal');


// Referencie na elementy a premenné súvisiace s modálom Priradiť/Upraviť Klub
const clubModal = document.getElementById('clubModal');
const clubModalClose = clubModal ? clubModal.querySelector('.close') : null;
const clubModalTitle = document.getElementById('clubModalTitle');
const clubForm = document.getElementById('clubForm');
const clubNameField = document.getElementById('clubNameField'); // Div okolo inputu názvu
const clubNameInput = document.getElementById('clubName'); // Input názvu tímu/klubu
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
     unassignedClubSelect.disabled = false;

     try {
         const q = query(clubsCollectionRef, where("groupId", "==", null));
         const querySnapshot = await getDocs(q);

         if (querySnapshot.empty) {
              const option = document.createElement('option');
              option.value = "";
              option.textContent = "Žiadne nepriradené tímy";
              option.disabled = true;
              unassignedClubSelect.appendChild(option);
              unassignedClubSelect.disabled = true;
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

// Funkcia na resetovanie stavu modálneho okna klubu
function resetClubModal() {
    console.log("Resetujem modál klubu.");
    editingClubId = null;
    currentClubModalMode = null; // Resetovať režim
    if (clubForm) clubForm.reset();
    // Zabezpečiť, že selectboxy sú v pôvodnom stave
    if (clubCategorySelect) {
         clubCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
         clubCategorySelect.disabled = true; // Znova zakázať
         clubCategorySelect.onchange = null; // Odstrániť listener na zmenu kategórie
    }
    if (clubGroupSelect) {
         clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    }
     // Skryť polia specifické pre režimy pri resete
     if (clubNameField) clubNameField.style.display = 'block'; // Predvolene zobraziť názov tímu
     if (unassignedClubField) unassignedClubField.style.display = 'none'; // Predvolene skryť výber nepriradeného
     if (clubAssignmentFields) clubAssignmentFields.style.display = 'block'; // Predvolene zobraziť priradenie
     if (clubModalTitle) clubModalTitle.textContent = 'Upraviť tím / Priradiť klub'; // Predvolený titulok
     if (clubForm) {
         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Uložiť zmeny / Priradiť'; // Predvolený text tlačidla
     }
      // Zabezpečiť, že polia Skupina a Poradie nie sú required (HTML atribút bol odstránený)
      if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
      if (orderInGroupInput) orderInGroupInput.removeAttribute('required');
}


// Funkcia na otvorenie modálneho okna Priradiť/Upraviť Klub
// Používa sa z tabuľky zoznamu tímov (edit mode) a tlačidla + (create mode, predtým assign mode)
async function openClubModal(clubId = null, mode = 'assign') {
    console.log(`Otváram modál Klub v režime: ${mode}, ID: ${clubId}`);
     if (!clubModal || !clubModalTitle || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect) {
          console.error("Elementy modálu Klub nenájdené!");
          alert("Nastala chyba pri otváraní modálu klubu.");
          return;
     }

    resetClubModal(); // Resetovať formulár a nastaviť základné viditeľnosti a stavy
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
        unassignedClubField.style.display = 'block';
         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Priradiť';

        clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
        clubCategorySelect.disabled = true;

        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
        if (clubGroupSelect) clubGroupSelect.removeAttribute('required'); // V assign režime je skupina voliteľná
        if (orderInGroupInput) orderInGroupInput.removeAttribute('required'); // V assign režime je poradie voliteľné


        await populateUnassignedClubsSelect();

         unassignedClubSelect.onchange = async () => {
             const selectedId = unassignedClubSelect.value;
              const selectedOption = unassignedClubSelect.options[unassignedClubSelect.selectedIndex];
              const categoryId = selectedOption ? selectedOption.dataset.categoryId : null;
              console.log("Zmenený výber nepriradeného tímu.", { selectedId, categoryId });

             if (selectedId && categoryId) {
                 const category = allAvailableCategories.find(cat => cat.id === categoryId);
                 const categoryName = category ? category.name : 'Neznáma kategória';
                 clubCategorySelect.innerHTML = `<option value="${categoryId}">${categoryName}</option>`;
                  // Povoliť select skupiny, keď je vybraná kategória tímu
                 if (clubGroupSelect) clubGroupSelect.disabled = false;
                 populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId);
             } else {
                 clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                  // Zakázať select skupiny, ak nie je vybraný tím
                 if (clubGroupSelect) clubGroupSelect.disabled = true;
                 populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
             }
         };
         // Zabezpečiť, že select skupiny je na začiatku zakázaný v assign režime
         if (clubGroupSelect) clubGroupSelect.disabled = true;


     }
     // Logika pre režim "Upraviť" (edit)
     else if (mode === 'edit' && clubId) {
        clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
        clubNameField.style.display = 'block';
        clubAssignmentFields.style.display = 'block';
        unassignedClubField.style.display = 'none';
         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Uložiť zmeny';

        if (unassignedClubSelect) unassignedClubSelect.onchange = null;
        if (clubCategorySelect) clubCategorySelect.onchange = null;


        try {
            const clubDocRef = doc(clubsCollectionRef, clubId);
            const clubDoc = await getDoc(clubDocRef);
            if (clubDoc.exists()) {
                const clubData = clubDoc.data();

                clubNameInput.value = clubData.name || clubData.id || '';
                 clubNameInput.focus();

                const category = allAvailableCategories.find(cat => cat.id === clubData.categoryId);
                const categoryName = category ? category.name : (clubData.categoryId || 'Neznáma kategória');
                clubCategorySelect.innerHTML = `<option value="${clubData.categoryId}">${categoryName}</option>`;
                clubCategorySelect.disabled = true; // Kategóriu v edit mode nemeníme cez select

                 // Povoliť select skupiny v edit režime
                 if (clubGroupSelect) clubGroupSelect.disabled = false;
                 populateGroupSelectForClubModal(clubGroupSelect, clubData.groupId, allAvailableGroups, clubData.categoryId);


                orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : '';
                 if (orderInGroupInput) orderInGroupInput.removeAttribute('required'); // Poradie je voliteľné aj v edit mode


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
         unassignedClubField.style.display = 'none';
         const submitButton = clubForm.querySelector('button[type="submit"]');
         if (submitButton) submitButton.textContent = 'Vytvoriť tím';

         if (unassignedClubSelect) unassignedClubSelect.onchange = null;

         // Naplniť selectbox kategórií a povoliť ho
         if (allAvailableCategories.length > 0) {
              // Použiť populateCategorySelect z common.js, ktorá načítava z DB a plní select
              populateCategorySelect(clubCategorySelect, null); // null ako selectedCategoryId
              clubCategorySelect.disabled = false; // Povoliť
         } else {
              clubCategorySelect.innerHTML = '<option value="">-- Žiadne kategórie --</option>';
              clubCategorySelect.disabled = true;
         }

          // Nastaviť počiatočný stav selectboxu skupín (prázdny a zakázaný, kým sa nevyberie kategória)
         clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
         if (clubGroupSelect) clubGroupSelect.disabled = true; // Zakázať na začiatku

          // Pridať listener na zmenu selectboxu kategórií (pre create mode)
         clubCategorySelect.onchange = () => {
              const selectedCategoryId = clubCategorySelect.value;
              console.log("Zmenená kategória v create mode modále klubu:", selectedCategoryId);
              if (selectedCategoryId && selectedCategoryId !== '' && !selectedCategoryId.startsWith('--')) {
                  // Povoliť select skupiny po výbere kategórie
                  if (clubGroupSelect) clubGroupSelect.disabled = false;
                  // Naplniť select skupín filtrovanými skupinami pre danú kategóriu
                  populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, selectedCategoryId);
              } else {
                   // Ak nebola vybraná kategória (alebo je neplatná), resetovať select skupín a zakázať ho
                   clubGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                   if (clubGroupSelect) clubGroupSelect.disabled = true;
              }
         };

         // Polia pre skupinu a poradie by mali byť optional
         if (clubGroupSelect) clubGroupSelect.removeAttribute('required');
         if (orderInGroupInput) orderInGroupInput.removeAttribute('required');

         // Zamerať sa na input názvu tímu pri otvorení v create mode
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
                  if (!unassignedClubSelect || !unassignedClubSelect.value) {
                       alert("Prosím, vyberte nepriradený tím k priradeniu.");
                       if (unassignedClubSelect) unassignedClubSelect.focus();
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

                  const newClubNameForId = clubName;
                   let newDocumentId = originalClubId;
                   let nameFieldToSave = clubName;


                  if (newClubNameForId !== clubData.name && clubData.categoryId) {
                       const category = allAvailableCategories.find(cat => cat.id === clubData.categoryId);
                       const categoryName = category ? category.name : clubData.categoryId;
                       newDocumentId = `${categoryName} - ${newClubNameForId}`;
                       nameFieldToSave = newClubNameForId;

                       const existingDocWithNewId = await getDoc(doc(clubsCollectionRef, newDocumentId));
                        if (existingDocWithNewId.exists()) {
                             alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                             if (clubNameInput) clubNameInput.focus();
                             return;
                        }
                        console.log(`Názov tímu/ID sa mení z "${originalClubId}" na "${newDocumentId}"`);
                         operationType = 'replace';
                         clubIdToProcess = newDocumentId;
                  } else if (newClubNameForId !== clubData.name && !clubData.categoryId && originalClubId === clubData.name) {
                       // Ak pôvodné ID bolo len názov a mení sa názov
                       newDocumentId = newClubNameForId;
                        nameFieldToSave = newClubNameForId;
                         const existingDocWithNewId = await getDoc(doc(clubsCollectionRef, newDocumentId));
                         if (existingDocWithNewId.exists()) {
                              alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                              if (clubNameInput) clubNameInput.focus();
                              return;
                         }
                         console.log(`Názov tímu/ID sa mení z "${originalClubId}" na "${newDocumentId}" (bez kategórie)`);
                         operationType = 'replace';
                         clubIdToProcess = newDocumentId;
                  } else {
                       console.log("Aktualizujem existujúci tím s ID:", clubIdToProcess);
                       nameFieldToSave = clubName;
                       operationType = 'update';
                  }

                   dataToSave = {
                       name: nameFieldToSave,
                       categoryId: clubData.categoryId || null,
                       groupId: selectedGroupIdInModal || null,
                       orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null,
                       createdFromBase: clubData.createdFromBase || clubData.name || clubData.id
                   };

                    if (dataToSave.groupId === null) {
                        dataToSave.orderInGroup = null;
                    }
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
                  const originalClubDocRef = doc(clubsCollectionRef, editingClubId);
                  const newClubDocRef = doc(clubsCollectionRef, clubIdToProcess);

                   const batch = writeBatch(db);
                   batch.delete(originalClubDocRef);
                   batch.set(newClubDocRef, dataToSave);
                   await batch.commit();

                   alert(`Tím bol úspešne premenovaný na "${clubIdToProcess}".`);

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
             console.error('Chyba pri ukladaní dát tímu/klubu: ', error);
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

         if (createdTeamsTableHeader.innerHTML.trim() === '') { // Aj tu použiť trim pre konzistentnosť
                  createdTeamsTableHeader.innerHTML = `
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  `;
             }

        // Zoradiť tímy abecedne podľa Názvu tímu (name), so zohľadnením slovenskej abecedy a diakritiky
        // OPRAVA: Zoradiť podľa team.name namiesto team.id
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
            actionsCell.style.display = 'flex';
            actionsCell.style.justifyContent = 'center';
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

          if(typeof populateUnassignedClubsSelect === 'function') {
              // populateUnassignedClubsSelect(); // Pri mazaní nemusí byť modál otvorený, stačí refresh zoznamu
          }

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
export { openClubModal, displayCreatedTeams }; // openTeamCreationModal už nepotrebujeme exportovať ak ho + tlačidlo neotvára

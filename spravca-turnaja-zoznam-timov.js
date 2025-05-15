// spravca-turnaja-zoznam-timov.js (Celý kód)

// Import necessary functions and references from common.js
// Uistite sa, že spravca-turnaja-common.js exportuje tieto:
// db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef,
// openModal, closeModal,
// Ak openClubModal, populateCategorySelect, populateGroupSelect, populateUnassignedClubsSelect
// editingClubId, currentClubModalMode, unassignedClubSelect
// sú definované a exportované v common.js, importujte ich tiež.
// Inak bude potrebné ich definovať (alebo importovať z iného príslušného súboru, napr. spravca-turnaja-timy-do-skupin.js)
// tak, aby boli prístupné v tomto súbore.
// V tomto kóde predpokladáme, že openClubModal, editingClubId, currentClubModalMode, unassignedClubSelect a populateUnassignedClubsSelect
// sú buď globálne dostupné alebo definované v common.js a exportované.
import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef,
         openModal, closeModal, // Základné funkcie by mali byť v common.js
         // Importujte ďalšie premenné/funkcie, ak sú exportované z common.js:
         // openClubModal, editingClubId, currentClubModalMode, unassignedClubSelect, populateUnassignedClubsSelect,
         doc, getDocs, query, where, getDoc, setDoc, deleteDoc, updateDoc, writeBatch } from './spravca-turnaja-common.js';


// Získanie referencií na elementy DOM
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
const clubNameInput = document.getElementById('clubName'); // Zmenený názov pre konzistentnosť
const clubAssignmentFields = document.getElementById('clubAssignmentFields');
const clubCategorySelect = document.getElementById('clubCategorySelect');
const clubGroupSelect = document.getElementById('clubGroupSelect');
const orderInGroupInput = document.getElementById('orderInGroup'); // Zmenený názov pre konzistentnosť
const unassignedClubField = document.getElementById('unassignedClubField');
const unassignedClubSelect = document.getElementById('unassignedClubSelect'); // Pridaná referencia


let allAvailableCategories = []; // Pole na uloženie všetkých dostupných kategórií
let allAvailableGroups = []; // Pole na uloženie všetkých dostupných skupín


// Premenné na sledovanie stavu modálu klubu
let editingClubId = null; // ID klubu, ktorý sa aktuálne upravuje
let currentClubModalMode = 'assign'; // 'assign' alebo 'edit'


// --- Funkcie pre Modál Vytvoriť tímy ---

// Funkcia na načítanie všetkých kategórií z databázy pre dynamické selectboxy
async function loadAllCategoriesForDynamicSelects() {
     console.log("Načítavam kategórie pre dynamické selecty...");
     allAvailableCategories = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(categoriesCollectionRef);
         querySnapshot.forEach((doc) => {
             allAvailableCategories.push({ id: doc.id, name: doc.data().name });
         });
         console.log("Načítané kategórie:", allAvailableCategories);
         // Po načítaní kategórií, aktualizovať všetky dynamické selectboxy
         updateDynamicCategorySelects();
         // Skontrolovať viditeľnosť tlačidla Pridať ďalšiu kategóriu po načítaní kategórií
         checkIfAddCategoryCountPairButtonShouldBeVisible();

     } catch (e) {
         console.error("Chyba pri načítaní kategórií pre dynamické selecty: ", e);
         alert("Nepodarilo sa načítať kategórie pre vytvorenie tímov.");
     }
}

// Funkcia na naplnenie selectboxu s kategóriami
function populateDynamicCategorySelect(selectElement, selectedValue = '', availableCategories, categoriesToDisable = []) {
     selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Predvolená možnosť
     availableCategories.forEach(category => {
         const option = document.createElement('option');
         option.value = category.id;
         option.textContent = category.name;
         // Zakázať kategórie, ktoré sú už vybrané v iných selectboxoch
         if (categoriesToDisable.includes(category.id)) {
             option.disabled = true;
         }
         selectElement.appendChild(option);
     });
      // Ak bola zadaná počiatočná hodnota, nastaviť ju ako vybranú
      if (selectedValue && selectElement.querySelector(`option[value="${selectedValue}"]`)) {
          selectElement.value = selectedValue;
      } else {
           // Ak počiatočná hodnota nebola platná alebo nebola zadaná, uistiť sa, že je vybraná predvolená možnosť
           selectElement.value = "";
      }
}


// Funkcia na aktualizáciu všetkých dynamických selectboxov s dostupnými kategóriami
function updateDynamicCategorySelects() {
    const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');
    const currentlySelectedCategories = Array.from(allSelectElements).map(select => select.value).filter(value => value !== '');

    allSelectElements.forEach(selectElement => {
        const currentSelected = selectElement.value;
        // Zoznam kategórií na zakázanie pre tento konkrétny selectbox
        // Sú to všetky aktuálne vybrané kategórie okrem tej, ktorá je vybraná v tomto selectboxe
        const categoriesToDisable = currentlySelectedCategories.filter(catId => catId !== currentSelected);

        // Znovu naplniť selectbox s aktualizovaným zoznamom zakázaných kategórií
        populateDynamicCategorySelect(selectElement, currentSelected, allAvailableCategories, categoriesToDisable);
    });

     // Po aktualizácii selectboxov, skontrolovať viditeľnosť tlačidla Pridať/Odstrániť
     checkIfAddCategoryCountPairButtonShouldBeVisible();
     updateRemoveButtonVisibility();
}

// Funkcia na kontrolu viditeľnosti tlačidla Odstrániť
function updateRemoveButtonVisibility() {
    const removeButtons = teamCategoryCountContainer.querySelectorAll('.category-count-pair .delete-button');
    // Tlačidlo Odstrániť zobrazíme len ak je viac ako jeden pár kategória/počet
    if (removeButtons.length > 1) {
        removeButtons.forEach(button => button.style.visibility = 'visible');
    } else {
        // Ak je len jeden pár, tlačidlo Odstrániť skryjeme
        removeButtons.forEach(button => button.style.visibility = 'hidden');
    }
}

// Funkcia na kontrolu viditeľnosti tlačidla Pridať ďalšiu kategóriu
function checkIfAddCategoryCountPairButtonShouldBeVisible() {
    const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');
    const numberOfPairs = allSelectElements.length;
    const numberOfAvailableCategories = allAvailableCategories.length;

    // Tlačidlo Pridať zobrazíme len ak počet existujúcich párov je menší ako celkový počet kategórií
    if (addCategoryCountPairButton) {
        if (numberOfPairs < numberOfAvailableCategories) {
            addCategoryCountPairButton.style.display = 'inline-block'; // Zobraziť
        } else {
            addCategoryCountPairButton.style.display = 'none'; // Skryť
        }
    }
}


// Funkcia na pridá nový riadok pre výber kategórie a zadanie počtu tímov v modále Vytvoriť tímy
async function addCategoryCountPair(initialCategory = null) {
     const container = document.getElementById('teamCategoryCountContainer');
     if (!container) { console.error('teamCategoryCountContainer not found!'); return; }

     const pairDiv = document.createElement('div');
     pairDiv.classList.add('category-count-pair'); // Trieda pre štýlovanie Flexboxom

     // Kontajner pre Label a Select
     const selectContainer = document.createElement('div');
     // ODSTRÁNENÉ inline Flexbox štýly - budú riadené CSS pravidlom .category-count-pair > div
     // selectContainer.style.display = 'flex';
     // selectContainer.style.alignItems = 'center';
     // selectContainer.style.gap = '10px';
     // selectContainer.style.flexWrap = 'wrap';
     // selectContainer.style.flex = '1 1 auto';


     const categorySelectLabel = document.createElement('label');
     categorySelectLabel.textContent = 'Kategória:';
     // ODSTRÁNENÝ inline štýl - bude riadené CSS
     // categorySelectLabel.style.flexShrink = '0';

     const categorySelect = document.createElement('select');
     categorySelect.classList.add('team-category-select-dynamic'); // Identifikačná trieda pre JS
     categorySelect.name = 'category';
     categorySelect.required = true;
     // ODSTRÁNENÉ inline šírky/flexbox štýly - budú riadené CSS
     // categorySelect.style.flexGrow = '1';
     // categorySelect.style.minWidth = '150px';
     // ODSTRÁNENÝ inline padding - bude riadené CSS
     // categorySelect.style.padding = '5px';


     categorySelect.addEventListener('change', () => {
         updateDynamicCategorySelects();
     });

     selectContainer.appendChild(categorySelectLabel);
     selectContainer.appendChild(categorySelect);

     // Kontajner pre Label a Input
     const inputContainer = document.createElement('div');
     // ODSTRÁNENÉ inline Flexbox štýly - budú riadené CSS pravidlom .category-count-pair > div
     // inputContainer.style.display = 'flex';
     // inputContainer.style.alignItems = 'center';
     // inputContainer.style.gap = '10px';
     // inputContainer.style.flexWrap = 'wrap';
     // inputContainer.style.flex = '1 1 auto';


     const teamCountLabel = document.createElement('label');
     teamCountLabel.textContent = 'Počet tímov:';
     // ODSTRÁNENÝ inline štýl - bude riadené CSS
     // teamCountLabel.style.flexShrink = '0';


     const teamCountInput = document.createElement('input');
     teamCountInput.classList.add('team-count-input-dynamic'); // Identifikačná trieda pre JS
     teamCountInput.type = 'number';
     teamCountInput.name = 'count';
     teamCountInput.min = '1';
     teamCountInput.value = '1';
     teamCountInput.required = true;
     // ODSTRÁNENÉ inline šírky/flexbox štýly - budú riadené CSS
     // teamCountInput.style.maxWidth = '80px';
     // teamCountInput.style.flexGrow = '0';
     // ODSTRÁNENÝ inline padding - bude riadené CSS
     // teamCountInput.style.padding = '5px';


     inputContainer.appendChild(teamCountLabel);
     inputContainer.appendChild(teamCountInput);

     const removeButton = document.createElement('button');
     removeButton.textContent = 'Odstrániť';
     removeButton.classList.add('action-button', 'delete-button'); // Použiť štýly tlačidiel
     removeButton.type = 'button'; // Aby nespustilo submit formulára
     // ODSTRÁNENÉ inline margin a align-self - budú riadené CSS
     // removeButton.style.marginLeft = '10px';
     // removeButton.style.flexShrink = '0';
     // removeButton.style.alignSelf = 'center';

     removeButton.onclick = () => {
         pairDiv.remove(); // Odstrani cely div s parom
         updateDynamicCategorySelects(); // Aktualizuje ostatné selectboxy
         updateRemoveButtonVisibility(); // Aktualizuje viditeľnosť tlačidiel Odstrániť
         checkIfAddCategoryCountPairButtonShouldBeVisible(); // Aktualizuje viditeľnosť tlačidla Pridať ďalšiu
     };

     // Pridať selectContainer a inputContainer DO pairDiv (Táto štruktúra je dôležitá pre správne fungovanie CSS)
     pairDiv.appendChild(selectContainer);
     pairDiv.appendChild(inputContainer);
     pairDiv.appendChild(removeButton);


     container.appendChild(pairDiv); // Pridať celý pár div do kontajnera

      // Ak ešte nie sú načítané kategórie, načítať ich a potom naplniť selectboxy
      if (allAvailableCategories.length === 0) {
           await loadAllCategoriesForDynamicSelects();
      } else {
          // Získať aktuálne vybrané kategórie v ostatných selectboxoch (pred naplnením tohto nového)
          const allSelectElementsBeforeAdding = container.querySelectorAll('.team-category-select-dynamic');
          const categoriesSelectedInOthers = Array.from(allSelectElementsBeforeAdding)
              .map(select => select.value)
              .filter(value => value !== '' && value !== initialCategory); // Vylúčiť prázdnu a počiatočnú kategóriu

          // Naplnit novy selectbox s dostupnymi (nevybranymi) kategoriami
          populateDynamicCategorySelect(
             categorySelect,
             initialCategory, // Ak je zadaná počiatočná kategória, vybrať ju
             allAvailableCategories,
             categoriesSelectedInOthers // Vylúčiť kategorie už vybrané v iných riadkoch
          );

           // Znovu aktualizovať všetky dynamické selecty po pridani noveho paru
           // Toto zabezpečí, že aj v ostatných selectoch sa správne nastavia disabled možnosti
           updateDynamicCategorySelects();

           // Znovu skontrolovať viditeľnosť tlačidiel Odstranit
           updateRemoveButtonVisibility();

           // Skontrolovať viditeľnosť tlačidla Pridať ďalšiu kategóriu
           checkIfAddCategoryCountPairButtonShouldBeVisible();
      }


     // Zamerať na novopridaný selectbox pre lepšiu použiteľnosť
     setTimeout(() => {
          categorySelect.focus();
     }, 0);
}


// Funkcia na otvorenie modálneho okna Vytvoriť tímy
async function openTeamCreationModal() {
     console.log("Otváram modál Vytvoriť tímy");
     // Resetovať formulár a kontajner pre dynamické polia pri otvorení modálu
     if (teamCreationForm) teamCreationForm.reset();
     if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
     // Pridať prvý pár kategória/počet pri otvorení
     await addCategoryCountPair();
     // Načítať kategórie, ak ešte nie sú načítané (addCategoryCountPair to robí, ale pre istotu)
     if (allAvailableCategories.length === 0) {
         await loadAllCategoriesForDynamicSelects();
     } else {
          // Ak sú kategórie už načítané, len aktualizovať selectboxy
          updateDynamicCategorySelects();
     }

     openModal(teamCreationModal); // Funkcia openModal by mala byť v common.js
     // Skontrolujte, či sa má zobraziť tlačidlo "Pridať ďalšiu kategóriu" po otvorení
     checkIfAddCategoryCountPairButtonShouldBeVisible();
}


// Funkcia na zatvorenie modálneho okna Vytvoriť tímy
function closeTeamCreationModal() {
     console.log("Zatváram modál Vytvoriť tímy");
     closeModal(teamCreationModal); // Funkcia closeModal by mala byť v common.js
     // Po zatvorení modálu vyčistiť formulár a kontajner
     if (teamCreationForm) teamCreationForm.reset();
     if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
      // Po zatvorení modálu môže byť potrebné aktualizovať zobrazenie tímov na pozadí
      displayCreatedTeams();
}


// Listenery pre modálne okno Vytvoriť tímy
if (teamCreationModalClose) {
     teamCreationModalClose.addEventListener('click', closeTeamCreationModal);
}
if (teamCreationModal) {
     window.addEventListener('click', (event) => {
         if (event.target === teamCreationModal) {
             closeTeamCreationModal();
         }
     });
}

// Listener pre odoslanie formulára Vytvoriť tímy
if (teamCreationForm) {
    teamCreationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("Odosielam formulár Vytvoriť tímy...");

        const baseTeamName = teamNameInput.value.trim();
        if (!baseTeamName) {
            alert("Prosím, zadajte základný názov tímu.");
            return;
        }

        const teamPairs = [];
        const pairDivs = teamCategoryCountContainer.querySelectorAll('.category-count-pair');

        // Kontrola, či sú všetky kategórie unikátne a vybrané
        const selectedCategories = new Set();
        let hasError = false;

        pairDivs.forEach(pairDiv => {
            const categorySelect = pairDiv.querySelector('.team-category-select-dynamic');
            const countInput = pairDiv.querySelector('.team-count-input-dynamic');

            const categoryId = categorySelect ? categorySelect.value : null;
            const teamCount = countInput ? parseInt(countInput.value, 10) : 0;

            if (!categoryId) {
                alert("Prosím, vyberte kategóriu pre všetky páry.");
                hasError = true;
                return; // Ukončiť iteráciu forEach
            }
             if (selectedCategories.has(categoryId)) {
                 alert(`Kategória "${categorySelect.options[categorySelect.selectedIndex].text}" je vybraná viackrát. Prosím, vyberte unikátne kategórie.`);
                 hasError = true;
                 return; // Ukončiť iteráciu forEach
             }
             selectedCategories.add(categoryId);


            if (isNaN(teamCount) || teamCount <= 0) {
                alert("Prosím, zadajte platný počet tímov (väčší ako 0) pre každú kategóriu.");
                hasError = true;
                return; // Ukončiť iteráciu forEach
            }

            teamPairs.push({ categoryId, teamCount });
        });

        // Ak nastala chyba počas validácie, zastaviť submit
        if (hasError) {
             return;
        }


        if (teamPairs.length === 0) {
            alert("Prosím, pridajte aspoň jeden pár kategória a počet tímov.");
            return;
        }

        console.log("Páry tímov na vytvorenie:", teamPairs);

        try {
            const batch = writeBatch(db); // Použiť batch pre atomické zápisy

            for (const pair of teamPairs) {
                const categoryDocRef = doc(categoriesCollectionRef, pair.categoryId);
                const categoryDoc = await getDoc(categoryDocRef);
                const categoryName = categoryDoc.exists() ? categoryDoc.data().name : 'Neznáma kategória';

                for (let i = 1; i <= pair.teamCount; i++) {
                    const teamName = `${baseTeamName}${i}`; // Napr. Spartak1, Spartak2
                    // Vytvoriť referenciu na nový dokument v kolekcii 'clubs'
                    const newClubRef = doc(clubsCollectionRef); // Firestore vygeneruje ID

                    batch.set(newClubRef, {
                        name: teamName,
                        category: pair.categoryId,
                        assignedGroup: null, // Predvolene nepriradený do skupiny
                        orderInGroup: null, // Predvolene bez poradia
                        createdFromBase: baseTeamName // Uložiť základný názov
                    });
                }
            }

            // Vykonanie batch zápisu
            await batch.commit();

            console.log("Tímy boli úspešne vytvorené v databáze.");
            alert("Tímy boli úspešne vytvorené.");

            // Zatvoriť modálne okno
            closeTeamCreationModal();
            // Znovu zobraziť zoznam tímov, aby sa aktualizoval na stránke
            displayCreatedTeams();


        } catch (error) {
            console.error("Chyba pri ukladaní tímov: ", error);
            alert(`Chyba pri vytváraní tímov! Prosím, skúste znova. Detail: ${error.message}`);
             // Ak nastane chyba, modál ostane otvorený a znova sa načítajú kategórie
             if (teamCreationModal && teamCreationModal.style.display === 'block') {
                 loadAllCategoriesForDynamicSelects();
             } else {
                  // Ak modál nie je otvorený (chyba nastala po zatvorení?), vyčistiť formulár a kontajner
                  if (teamCreationForm) teamCreationForm.reset();
                  if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
             }
              if (addCategoryCountPairButton) checkIfAddCategoryCountPairButtonShouldBeVisible(); // Zabezpečiť zobrazenie/skrytie tlačidla
        }
    });
} else { console.error("Team creation form not found!"); }


// Listener pre tlačidlo "Pridať ďalšiu kategóriu" v modále Vytvoriť tímy
// ODSTRÁNENÝ Z TOHTO SÚBORU - LOGIKA RIADENÁ V SPRAVCA-TURNAJA-SCRIPT.JS
/*
if (addCategoryCountPairButton) {
    addCategoryCountPairButton.addEventListener('click', async () => {
         // Ak ešte nie sú načítané kategórie, načítať ich
         if (allAvailableCategories.length === 0) {
              await loadAllCategoriesForDynamicSelects();
         }
         // Pridať nový pár kategória/počet tímov
         await addCategoryCountPair();
    });
} else { console.error("Add category count pair button not found!"); }
*/


// Listener pre zmeny v dynamicky pridávaných selectoch kategórií - už riešené vo funkcii updateDynamicCategorySelects
// Listener pre zmeny v dynamicky pridávaných inputoch počtu - môže byť potrebné pridať v budúcnosti,
// ak by validácia závisela od zmien

// --- Funkcie pre zobrazenie vytvorených tímov na stránke ---

async function displayCreatedTeams() {
    console.log("Zobrazujem vytvorené tímy...");
    if (!createdTeamsTableBody || !createdTeamsTableHeader) {
        console.error("Tabuľka pre vytvorené tímy nenájdená!");
        return;
    }

    createdTeamsTableBody.innerHTML = ''; // Vyčistiť telo tabuľky

    try {
        // Načítať všetky tímy (clubs) z databázy
        const querySnapshot = await getDocs(clubsCollectionRef);
        const teams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Načítať všetky kategórie, aby sme mohli zobraziť názov kategórie
        if (allAvailableCategories.length === 0) {
             await loadAllCategoriesForDynamicSelects(); // Načítať kategórie, ak ešte nie sú
        }
        const categoriesMap = allAvailableCategories.reduce((map, category) => {
            map[category.id] = category.name;
            return map;
        }, {});

        // Načítať všetky skupiny, aby sme mohli zobraziť názov skupiny
        if (allAvailableGroups.length === 0) {
             await loadAllGroups(); // Predpokladá existenciu funkcie loadAllGroups (mohla by byť v common.js alebo script.js)
        }
         const groupsMap = allAvailableGroups.reduce((map, group) => {
            map[group.id] = group.name;
            return map;
        }, {});


        if (teams.length === 0) {
            createdTeamsTableBody.innerHTML = '<tr><td colspan="4">Zatiaľ nie sú vytvorené žiadne tímy.</td></tr>';
             createdTeamsTableHeader.innerHTML = ''; // Ak nie sú tímy, vyčistiť hlavičku
            return;
        }

         // Vytvoriť hlavičku tabuľky, ak existujú tímy
         createdTeamsTableHeader.innerHTML = `
              <tr>
                  <th>Názov tímu</th>
                  <th>Kategória</th>
                  <th>Skupina</th>
                  <th>Poradie v skupine</th>
                   <th>Akcie</th>
              </tr>
         `;


        teams.forEach(team => {
            const row = createdTeamsTableBody.insertRow();
            row.dataset.teamId = team.id; // Uložiť ID tímu do riadku pre jednoduchšiu manipuláciu

            const teamNameCell = row.insertCell();
            teamNameCell.textContent = team.name;

            const categoryCell = row.insertCell();
            categoryCell.textContent = categoriesMap[team.category] || 'Neznáma kategória';

            const groupCell = row.insertCell();
            groupCell.textContent = team.assignedGroup ? (groupsMap[team.assignedGroup] || 'Neznáma skupina') : 'Nepriradené';

            const orderCell = row.insertCell();
             // Zobraziť poradie len ak je tím priradený do skupiny a poradie je číslo > 0
            orderCell.textContent = (team.assignedGroup && team.orderInGroup > 0) ? team.orderInGroup : '-';
            orderCell.style.textAlign = 'center';


            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions-cell'); // Trieda pre prípadné štýlovanie bunky s akciami
            actionsCell.style.textAlign = 'center'; // Centrovanie obsahu akcie

            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť / Priradiť';
            editButton.classList.add('action-button');
            editButton.onclick = () => openClubModal(team.id, 'edit'); // Funkcia openClubModal by mala byť dostupná


            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Vymazať';
            deleteButton.classList.add('action-button', 'delete-button');
            deleteButton.onclick = async () => {
                if (confirm(`Naozaj chcete vymazať tím "${team.name}"?`)) {
                    await deleteTeam(team.id); // Funkcia deleteTeam
                    displayCreatedTeams(); // Znovu zobraziť zoznam po vymazaní
                }
            };

            // Použiť Flexbox v bunke s akciami na zarovnanie tlačidiel
            actionsCell.style.display = 'flex';
            actionsCell.style.justifyContent = 'center'; // Centrovať tlačidlá horizontálne
            actionsCell.style.alignItems = 'center'; // Centrovať tlačidlá vertikálne
            actionsCell.style.gap = '5px'; // Medzera medzi tlačidlami

            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
        });

    } catch (e) {
        console.error("Chyba pri zobrazovaní tímov: ", e);
        createdTeamsTableBody.innerHTML = '<tr><td colspan="4">Nepodarilo sa načítať tímy.</td></tr>';
         createdTeamsTableHeader.innerHTML = ''; // Vyčistiť hlavičku pri chybe
    }
}

// Funkcia na vymazanie tímu
async function deleteTeam(teamId) {
     console.log("Mažem tím s ID:", teamId);
     try {
         const teamDocRef = doc(clubsCollectionRef, teamId);
         await deleteDoc(teamDocRef);
         console.log("Tím bol úspešne vymazaný.");
         // Znovu zobraziť zoznam tímov na aktualizáciu tabuľky
         displayCreatedTeams();
          // Po vymazaní tímu by mohlo byť potrebné aktualizovať zoznam nepriradených tímov v modále klubu
          if(unassignedClubSelect) {
               populateUnassignedClubsSelect(); // Predpokladá existenciu a dostupnosť funkcie
          }

     } catch (e) {
         console.error("Chyba pri mazaní tímu:", e);
         alert("Nepodarilo sa vymazať tím.");
     }
}


// --- Funkcie pre Modál Správa tímov (ak je iný ako modál Priradiť/Upraviť Klub) ---
// Predpokladáme, že modál Správa tímov slúži na zobrazenie zoznamu tímov patriacich k jednému Základnému názvu
// a modál Priradiť/Upraviť Klub slúži na úpravu jedného konkrétneho tímu/priradenie klubu

// Funkcia na otvorenie modálneho okna Správa tímov a zobrazenie tímov s rovnakým základným názvom
async function openManageTeamsModal(baseName) {
    console.log("Otváram modál Správa tímov pre základný názov:", baseName);
    if (!manageTeamsModal || !baseTeamNameInModal || !teamsListInModal) {
        console.error("Elementy modálu Správa tímov nenájdené!");
        return;
    }

    baseTeamNameInModal.textContent = `Tímy: ${baseName}`;
    teamsListInModal.innerHTML = ''; // Vyčistiť zoznam tímov

    try {
        // Načítať tímy s daným základným názvom
        const q = query(clubsCollectionRef, where("createdFromBase", "==", baseName));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            teamsListInModal.innerHTML = '<p>Žiadne tímy s týmto základným názvom.</p>';
        } else {
            const ul = document.createElement('ul');
            querySnapshot.forEach(doc => {
                const team = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.teamId = team.id; // Uložiť ID tímu

                const teamNameSpan = document.createElement('span');
                teamNameSpan.textContent = team.name;
                li.appendChild(teamNameSpan);

                const actionsDiv = document.createElement('div');
                actionsDiv.classList.add('action-buttons'); // Trieda pre Flexbox na tlačidlá

                const editButton = document.createElement('button');
                editButton.textContent = 'Upraviť / Priradiť';
                editButton.classList.add('action-button');
                // openClubModal by malo byť dostupné globálne alebo importované
                editButton.onclick = () => openClubModal(team.id, 'edit');


                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Vymazať';
                deleteButton.classList.add('action-button', 'delete-button');
                deleteButton.onclick = async () => {
                    if (confirm(`Naozaj chcete vymazať tím "${team.name}"?`)) {
                        await deleteTeam(team.id); // Použiť existujúcu funkciu deleteTeam
                        // Po vymazaní v Správe tímov modále, treba odstrániť položku zo zoznamu
                        li.remove();
                         // Ak po vymazaní nezostali žiadne tímy s týmto základným názvom, zatvoriť modál
                         const remainingTeams = teamsListInModal.querySelectorAll('li');
                         if (remainingTeams.length === 0) {
                              closeManageTeamsModal();
                         }
                        // Znovu zobraziť zoznam tímov na pozadí
                        displayCreatedTeams();
                    }
                };

                actionsDiv.appendChild(editButton);
                actionsDiv.appendChild(deleteButton);

                li.appendChild(actionsDiv);
                ul.appendChild(li);
            });
            teamsListInModal.appendChild(ul);
        }

        openModal(manageTeamsModal); // Funkcia openModal by mala byť v common.js

    } catch (e) {
        console.error("Chyba pri načítaní tímov pre správu:", e);
        teamsListInModal.innerHTML = '<p>Nepodarilo sa načítať tímy pre správu.</p>';
    }
}

// Funkcia na zatvorenie modálneho okna Správa tímov
function closeManageTeamsModal() {
    console.log("Zatváram modál Správa tímov");
    closeModal(manageTeamsModal); // Funkcia closeModal by mala byť v common.js
     // Po zatvorení modálu, môže byť potrebné aktualizovať zobrazenie tímov na pozadí
     displayCreatedTeams();
}

// Listenery pre modálne okno Správa tímov
if (manageTeamsModalClose) {
     manageTeamsModalClose.addEventListener('click', closeManageTeamsModal);
}
if (manageTeamsModal) {
     window.addEventListener('click', (event) => {
         if (event.target === manageTeamsModal) {
             closeManageTeamsModal();
         }
     });
}


// --- Funkcie pre Modál Priradiť/Upraviť Klub ---
// Predpokladá sa, že funkcie openClubModal, populateCategorySelect,
// populateGroupSelect, populateUnassignedClubsSelect, editingClubId,
// currentClubModalMode sú dostupné (napr. v common.js alebo script.js a exportované)

// Listener pre odoslanie formulára Priradiť/Upraviť Klub
if (clubForm) {
     clubForm.addEventListener('submit', async (event) => {
         event.preventDefault();
         console.log("Odosielam formulár Priradiť/Upraviť Klub...");

         const clubName = clubNameInput.value.trim();
         const categoryId = clubCategorySelect ? clubCategorySelect.value : null; // Kategória sa neupravuje, len zobrazuje/získava
         const groupId = clubGroupSelect ? clubGroupSelect.value : null;
         const orderInGroup = orderInGroupInput ? parseInt(orderInGroupInput.value, 10) : null;
         const selectedUnassignedClubId = unassignedClubSelect ? unassignedClubSelect.value : null;


         if (currentClubModalMode === 'assign' && !selectedUnassignedClubId) {
             alert("Prosím, vyberte nepriradený tím/klub na priradenie.");
             return;
         }

         if (groupId && (isNaN(orderInGroup) || orderInGroup <= 0)) {
              alert("Prosím, zadajte platné poradie v skupine (číslo väčšie ako 0).");
              return;
         }
          // Ak sa skupina vyberie, poradie musí byť zadané. Ak sa nevyberie, poradie sa ignoruje.
          if (!groupId) {
              // Ak nie je vybraná skupina, vynulujeme poradie
              // orderInGroup = null; // Toto by malo byt uz vo firebase zapisane
          }


         try {
             let clubIdToUpdate = editingClubId; // V režime edit sa aktualizuje editingClubId
             let updatedData = {};

             if (currentClubModalMode === 'assign') {
                 // V režime assign sa aktualizuje vybraný nepriradený tím
                 clubIdToUpdate = selectedUnassignedClubId;
                 updatedData = {
                     assignedGroup: groupId || null, // null ak nie je vybraná skupina
                     orderInGroup: groupId ? (isNaN(orderInGroup) ? null : orderInGroup) : null, // null ak nie je vybraná skupina alebo neplatné poradie
                      // Názov tímu/klubu sa v režime assign nemení (preberá sa z vybraného nepriradeného tímu)
                 };
                  // Potrebujeme zistiť aktuálny názov tímu, ktorý priradzujeme
                  if (clubIdToUpdate) {
                       const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToUpdate));
                       if (clubDoc.exists()) {
                           updatedData.name = clubDoc.data().name; // Použijeme existujúci názov
                           // Získame aj kategóriu pre zobrazenie
                           updatedData.category = clubDoc.data().category;
                       } else {
                           console.error("Nepriradený tím s ID", clubIdToUpdate, "sa nenašiel.");
                           alert("Vybraný nepriradený tím sa nenašiel. Prosím, skúste znova.");
                           return;
                       }
                  }


             } else if (currentClubModalMode === 'edit') {
                 // V režime edit sa aktualizuje aj názov
                 updatedData = {
                     name: clubName,
                     assignedGroup: groupId || null, // null ak nie je vybraná skupina
                     orderInGroup: groupId ? (isNaN(orderInGroup) ? null : orderInGroup) : null, // null ak nie je vybraná skupina alebo neplatné poradie
                     // Kategória sa v režime edit nemení
                 };
                  // Pri úprave potrebujeme získať aktuálnu kategóriu tímu, aby sme ju mohli zobraziť v modale po uložení
                  if (clubIdToUpdate) {
                       const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToUpdate));
                       if (clubDoc.exists()) {
                            updatedData.category = clubDoc.data().category; // Použijeme existujúcu kategóriu
                       } else {
                           console.error("Tím s ID", clubIdToUpdate, "sa nenašiel.");
                           alert("Tím sa nenašiel. Prosím, skúste znova.");
                           return;
                       }
                  }

             }

             if (clubIdToUpdate) {
                 const clubDocRef = doc(clubsCollectionRef, clubIdToUpdate);
                 await updateDoc(clubDocRef, updatedData);
                 console.log("Tím/Klub s ID", clubIdToUpdate, "bol úspešne aktualizovaný/priradený.");
                 alert("Zmeny boli úspešne uložené.");

                 closeModal(clubModal); // Zatvoriť modálne okno
                 displayCreatedTeams(); // Znovu zobraziť zoznam tímov
                  // Ak bol režim 'assign', znovu naplniť zoznam nepriradených tímov, lebo jeden už bol priradený
                  if (currentClubModalMode === 'assign') {
                       // openClubModal(null, 'assign'); // Znovu otvorit modal v rezime assign
                       // Alebo jednoducho aktualizovat selectbox:
                       populateUnassignedClubsSelect(); // Predpokladá existenciu funkcie
                  }
                   // Ak bol režim 'edit' a editovalo sa z modalu Správa tímov, aktualizovať aj ten modal
                   // (Toto by vyžadovalo komplexnejšiu logiku sledovania pôvodu otvorenia modalu klubu)


             } else {
                 console.error("Neznámy režim alebo chýbajúce ID tímu/klubu na aktualizáciu.");
                 alert("Vyskytla sa chyba pri určovaní, ktorý tím/klub aktualizovať.");
             }


         } catch (e) {
             console.error("Chyba pri ukladaní zmien tímu/klubu:", e);
             alert(`Chyba pri ukladaní zmien! Prosím, skúste znova. Detail: ${e.message}`);
         }
     });
} else { console.error("Club form not found!"); }


// Listener pre zatvorenie modálneho okna Priradiť/Upraviť Klub
if (clubModalClose) {
     clubModalClose.addEventListener('click', () => {
          closeModal(clubModal); // Funkcia closeModal by mala byť v common.js
          // Po zatvorení modalu vynulovať editingClubId a currentClubModalMode
          editingClubId = null;
          currentClubModalMode = null;
           // Po zatvorení modalu klubu (ktorý mohol byť otvorený z modalu Správa tímov)
           // môže byť potrebné znovu zobraziť modál Správa tímov, ak bol otvorený
           // Táto logika by bola komplexnejšia a závisela by od toho, ako modaly na seba nadväzujú.
           // Zatiaľ len aktualizujeme zoznam tímov na pozadí.
           displayCreatedTeams();
     });
}

if (clubModal) {
     window.addEventListener('click', (event) => {
         if (event.target === clubModal) {
             closeModal(clubModal); // Funkcia closeModal by mala byť v common.js
              // Po zatvorení modalu vynulovať editingClubId a currentClubModalMode
             editingClubId = null;
             currentClubModalMode = null;
              // Po zatvorení modalu klubu (ktorý mohol byť otvorený z modalu Správa tímov)
              // môže byť potrebné znovu zobraziť modál Správa tímov, ak bol otvorený
              // Táto logika by bola komplexnejšia a závisela by od toho, ako modaly na seba nadväzujú.
              // Zatiaľ len aktualizujeme zoznam tímov na pozadí.
             displayCreatedTeams();
         }
     });
}


// Funkcia na načítanie všetkých skupín (Potrebné pre selectbox skupín v modále klubu)
// Táto funkcia by pravdepodobne mala byť v spravca-turnaja-script.js alebo common.js a exportovaná
async function loadAllGroups() {
     console.log("Načítavam skupiny...");
     allAvailableGroups = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(groupsCollectionRef);
         querySnapshot.forEach((doc) => {
             allAvailableGroups.push({ id: doc.id, name: doc.data().name });
         });
         console.log("Načítané skupiny:", allAvailableGroups);
          // Po načítaní skupín naplniť selectbox v modále klubu
          if (clubGroupSelect) {
              populateGroupSelect(clubGroupSelect, null, allAvailableGroups); // Predpokladá existenciu funkcie populateGroupSelect
          }

     } catch (e) {
         console.error("Chyba pri načítaní skupín: ", e);
         alert("Nepodarilo sa načítať skupiny.");
     }
}

// Funkcia na naplnenie selectboxu skupín (Potrebné pre modál klubu)
// Táto funkcia by pravdepodobne mala byť v spravca-turnaja-script.js alebo common.js a exportovaná
function populateGroupSelect(selectElement, selectedValue = '', availableGroups) {
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>'; // Predvolená možnosť
    availableGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        selectElement.appendChild(option);
    });
     // Ak bola zadaná počiatočná hodnota, nastaviť ju ako vybranú
     if (selectedValue && selectElement.querySelector(`option[value="${selectedValue}"]`)) {
         selectElement.value = selectedValue;
     } else {
          // Ak počiatočná hodnota nebola platná alebo nebola zadaná, uistiť sa, že je vybraná predvolená možnosť
          selectElement.value = "";
     }
}

// Funkcia na naplnenie selectboxu s nepriradenými klubmi (Potrebné pre modál klubu v režime 'assign')
// Táto funkcia by pravdepodobne mala byť v spravca-turnaja-script.js alebo common.js a exportovaná
async function populateUnassignedClubsSelect() {
     console.log("Načítavam nepriradené tímy/kluby...");
     if (!unassignedClubSelect) { console.error("Unassigned club select not found!"); return; }

     unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>'; // Predvolená možnosť

     try {
         // Načítať len tímy, ktoré nemajú priradenú skupinu
         const q = query(clubsCollectionRef, where("assignedGroup", "==", null));
         const querySnapshot = await getDocs(q);

         if (querySnapshot.empty) {
              const option = document.createElement('option');
              option.value = "";
              option.textContent = "Žiadne nepriradené tímy";
              option.disabled = true;
              unassignedClubSelect.appendChild(option);
             console.log("Žiadne nepriradené tímy nájdené.");
         } else {
             querySnapshot.forEach(doc => {
                 const team = { id: doc.id, ...doc.data() };
                 const option = document.createElement('option');
                 option.value = team.id;
                 option.textContent = team.name;
                 unassignedClubSelect.appendChild(option);
             });
             console.log("Nepriradené tímy načítané:", querySnapshot.size);
         }

     } catch (e) {
         console.error("Chyba pri načítaní nepriradených tímov:", e);
         const option = document.createElement('option');
         option.value = "";
         option.textContent = "Chyba pri načítaní tímov";
         option.disabled = true;
         unassignedClubSelect.appendChild(option);
     }
}


// Funkcia na otvorenie modálneho okna Priradiť/Upraviť Klub
// Táto funkcia by pravdepodobne mala byť v spravca-turnaja-script.js alebo common.js a exportovaná
// Alebo ju môžeme nechať tu, ak je primárne používaná z tohto súboru (Zoznam tímov)
async function openClubModal(clubId = null, mode = 'assign') {
    console.log(`Otváram modál Klub v režime: ${mode}, ID: ${clubId}`);
     if (!clubModal || !clubModalTitle || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect) {
          console.error("Elementy modálu Klub nenájdené!");
          return;
     }

    // Resetovať formulár a skryť/zobraziť polia podľa režimu
    clubForm.reset();
    editingClubId = clubId;
    currentClubModalMode = mode;

     // Načítať skupiny a nepriradené tímy pri otvorení modálu
     if (allAvailableGroups.length === 0) {
         await loadAllGroups(); // Zabezpečiť načítanie skupín
     } else {
         // Ak sú skupiny už načítané, len naplniť selectbox
         populateGroupSelect(clubGroupSelect, null, allAvailableGroups);
     }

     if (mode === 'assign') {
        clubModalTitle.textContent = 'Priradiť nepriradený tím/klub';
        clubNameField.style.display = 'none'; // Skryť pole názvu
        clubAssignmentFields.style.display = 'block'; // Zobraziť polia priradenia
        unassignedClubField.style.display = 'block'; // Zobraziť select nepriradených tímov
        // Načítať nepriradené tímy
        await populateUnassignedClubsSelect(); // Zabezpečiť načítanie nepriradených tímov
     } else if (mode === 'edit' && clubId) {
        clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
        clubNameField.style.display = 'block'; // Zobraziť pole názvu
        clubAssignmentFields.style.display = 'block'; // Zobraziť polia priradenia
        unassignedClubField.style.display = 'none'; // Skryť select nepriradených tímov

        // Načítať údaje o tíme na úpravu
        try {
            const clubDocRef = doc(clubsCollectionRef, clubId);
            const clubDoc = await getDoc(clubDocRef);
            if (clubDoc.exists()) {
                const clubData = clubDoc.data();
                clubNameInput.value = clubData.name;
                // Kategória sa len zobrazí (získa sa názov na základe ID)
                const categoryName = allAvailableCategories.find(cat => cat.id === clubData.category)?.name || 'Neznáma kategória';
                clubCategorySelect.innerHTML = `<option value="${clubData.category}">${categoryName}</option>`; // Zobraziť aktuálnu kategóriu (disabled)

                // Vybrať aktuálne priradenú skupinu v selectboxe
                 if (allAvailableGroups.length > 0) {
                      populateGroupSelect(clubGroupSelect, clubData.assignedGroup, allAvailableGroups);
                 } else {
                      // Ak skupiny ešte nie sú načítané, načítať ich a potom naplniť select
                      await loadAllGroups();
                      populateGroupSelect(clubGroupSelect, clubData.assignedGroup, allAvailableGroups);
                 }


                // Zobraziť aktuálne poradie v skupine
                orderInGroupInput.value = clubData.orderInGroup > 0 ? clubData.orderInGroup : '';

            } else {
                console.error("Tím s ID", clubId, "sa nenašiel.");
                alert("Tím na úpravu sa nenašiel.");
                closeModal(clubModal); // Zatvoriť modál ak sa tím nenájde
                 displayCreatedTeams(); // Aktualizovať zobrazenie pre prípad, že bol tím vymazaný
                return;
            }
        } catch (e) {
            console.error("Chyba pri načítaní údajov tímu na úpravu:", e);
            alert("Nepodarilo sa načítať údaje tímu na úpravu.");
            closeModal(clubModal); // Zatvoriť modál pri chybe
             displayCreatedTeams(); // Aktualizovať zobrazenie
            return;
        }

     } else {
         console.error("Neplatný režim modálu klubu alebo chýbajúce ID v režime edit.");
         closeModal(clubModal);
          displayCreatedTeams(); // Aktualizovať zobrazenie
         return;
     }

    openModal(clubModal); // Funkcia openModal by mala byť v common.js
}



// Listener na udalost DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM plne načítaný pre zoznam tímov.");

    // Zobraziť vytvorené tímy pri načítaní stránky
    displayCreatedTeams();

    await loadAllCategoriesForDynamicSelects();
    await loadAllGroups();


});
export { openTeamCreationModal }; // Exportujte funkciu, ak ju potrebuje iný súbor (napr. spravca-turnaja-script.js)

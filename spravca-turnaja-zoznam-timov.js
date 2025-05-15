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


// Dátové premenné
let allAvailableCategories = []; // Pole na uloženie všetkých dostupných kategórií
let allAvailableGroups = []; // Pole na uloženie všetkých dostupných skupín


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


// --- Funkcie pre Modál Vytvoriť tímy ---

// Funkcia na načítanie všetkých kategórií z databázy pre dynamické selectboxy
async function loadAllCategoriesForDynamicSelects() {
     console.log("Načítavam kategórie pre dynamické selecty...");
     allAvailableCategories = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(categoriesCollectionRef);
         querySnapshot.forEach((doc) => {
             const categoryData = doc.data();
             // Pridáme kategóriu iba ak existuje a má platné 'name' pole
              if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
             } else {
                 // Ak name chýba, pouzijeme ID aj ako meno pre zobrazenie - toto by sa malo opraviť v kategóriách
                 allAvailableCategories.push({ id: doc.id, name: doc.id });
                 console.warn("Kategória dokument s ID", doc.id, "má chýbajúce, neplatné alebo prázdne 'name' pole. Používam ID ako názov.");
             }
         });
         // Zoradiť kategórie podľa mena pre lepší prehľad
         allAvailableCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

         console.log("Načítané kategórie (allAvailableCategories):", allAvailableCategories);
         // Po načítaní kategórií, aktualizovať všetky dynamické selectboxy
         updateDynamicCategorySelects();
         // Skontrolovať viditeľnosť tlačidla Pridať ďalšiu kategóriu po načítaní kategórií
         checkIfAddCategoryCountPairButtonShouldBeVisible();

     } catch (e) {
         console.error("Chyba pri načítaní kategórií: ", e);
         alert("Nepodarilo sa načítať kategórie.");
     }
}

// Funkcia na naplnenie dynamického selectboxu s kategóriami (pre vytváranie tímov)
function populateDynamicCategorySelect(selectElement, selectedId = '', availableCategories, categoriesToDisable = []) {
     if (!selectElement) return;
     const currentSelected = selectElement.value; // Zachovať aktuálny výber
     selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Predvolená možnosť
     availableCategories.forEach(category => {
         const option = document.createElement('option');
         option.value = category.id; // Použiť ID dokumentu ako hodnotu
         option.textContent = category.name; // Zobraziť názov kategórie (alebo ID ak chýba)
         // Zakázať kategórie, ktoré sú už vybrané v iných selectboxoch
         if (categoriesToDisable.includes(category.id)) {
             option.disabled = true;
         }
         selectElement.appendChild(option);
     });
      // Obnoviť predtým vybranú hodnotu alebo nastaviť novú, ak bola zadaná
      if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
          selectElement.value = selectedId;
      } else if (currentSelected && selectElement.querySelector(`option[value="${currentSelected}"]`)) {
           selectElement.value = currentSelected; // Obnoviť predchádzajúci výber
      } else {
           selectElement.value = ""; // Nastaviť na predvolenú, ak predchádzajúci výber už nie je dostupný/platný
      }

      // Zakázať select, ak nie sú žiadne možnosti okrem placeholderu a placeholder je vybraný
      if (selectElement.options.length <= 1 && selectElement.value === "") {
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
        // Tlačidlo "Pridať" sa zobrazí len ak počet existujúcich riadkov je menší ako celkový počet kategórií
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
     removeButton.type = 'button'; // Dôležité pre zabránenie odoslania formulára


     removeButton.onclick = () => {
         pairDiv.remove();
         updateDynamicCategorySelects(); // Aktualizovať ostatné selecty po odstránení
         updateRemoveButtonVisibility(); // Aktualizovať viditeľnosť tlačidiel Odstrániť
         checkIfAddCategoryCountPairButtonShouldBeVisible(); // Aktualizovať viditeľnosť tlačidla Pridať
     };


     // Použiť Flexbox pre zarovnanie v riadku
     pairDiv.style.display = 'flex';
     pairDiv.style.alignItems = 'flex-end';
     pairDiv.style.gap = '10px';
     pairDiv.style.flexWrap = 'wrap'; // Aby sa zalomilo na menších obrazovkách

     // Nastavenie flex-basis pre input/select kontajnery na menších obrazovkách
     selectContainer.style.flex = '1 1 150px';
     inputContainer.style.flex = '1 1 100px';
     removeButton.style.flex = '0 0 auto';


     pairDiv.appendChild(selectContainer);
     pairDiv.appendChild(inputContainer);
     pairDiv.appendChild(removeButton);

     container.appendChild(pairDiv);


      // Kategórie by mali byť načítané už pri otvorení modalu, ale pre istotu
      if (allAvailableCategories.length === 0) {
           console.warn("Kategórie nie sú načítané pri pridávaní nového páru.");
           // Pokus o načítanie, ale nemusí byť dokončené hneď
           loadAllCategoriesForDynamicSelects(); // Môže spustiť načítanie, ak ešte nebolo
      }

      // Získať zoznam kategórií, ktoré sú už vybrané v iných riadkoch
      const allSelectElementsBeforeAdding = container.querySelectorAll('.team-category-select-dynamic');
      const categoriesSelectedInOthers = Array.from(allSelectElementsBeforeAdding)
          .map(select => select.value)
          .filter(value => value !== '' && value !== initialCategoryId); // Vylúčiť aj túto novú kategóriu, ak má počiatočnú hodnotu


      // Naplniť nový selectbox s dostupnými kategóriami
      populateDynamicCategorySelect(
         categorySelect,
         initialCategoryId, // Počiatočná vybraná kategória, ak je zadaná
         allAvailableCategories,
         categoriesSelectedInOthers // Zoznam kategórií na zakázanie
      );

       // Po pridaní nového riadku aktualizovať stav všetkých selectboxov
       updateDynamicCategorySelects(); // Aktualizuje zakázané možnosti vo všetkých selectoch
       updateRemoveButtonVisibility(); // Skontroluje, či sa má zobraziť tlačidlo Odstrániť
       checkIfAddCategoryCountPairButtonShouldBeVisible(); // Skontroluje, či sa má zobraziť tlačidlo Pridať ďalšiu


     // Zamerať sa na nový select kategórie po jeho pridaní
     setTimeout(() => {
          if (categorySelect) categorySelect.focus();
     }, 0);
}


// Funkcia na otvorenie modálneho okna Vytvoriť tímy
async function openTeamCreationModal() {
     console.log("Otváram modál Vytvoriť tímy");
     // Zabezpečiť, že všetky potrebné DOM elementy existujú
     if (!teamCreationModal || !teamCreationForm || !teamCategoryCountContainer || !teamNameInput) {
          console.error("Elementy modálu Vytvoriť tímy nenájdené!");
          alert("Nastala chyba pri otváraní modálu vytvorenia tímov.");
          return;
     }

     // Resetovať formulár a kontajner pred otvorením
     if (teamCreationForm) teamCreationForm.reset();
     if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';


     // Kategórie by mali byť načítané už pri štarte stránky. Ak nie, načítať ich.
     if (allAvailableCategories.length === 0) {
          await loadAllCategoriesForDynamicSelects(); // Načíta kategórie a aktualizuje dynamické selectboxy
     } else {
          // Ak už sú načítané, len aktualizovať dynamické selectboxy pre istotu (ak sa medzičasom zmenili napr. na inej stránke)
          updateDynamicCategorySelects();
     }


     // Pridať prvý riadok pre výber kategórie a počtu tímov
     await addCategoryCountPair();


     // Otvoriť modálne okno
     openModal(teamCreationModal); // openModal by malo byť definované v common.js alebo globálne

     // Skontrolovať viditeľnosť tlačidla Pridať ďalšiu kategóriu (po pridaní prvého riadku)
     checkIfAddCategoryCountPairButtonShouldBeVisible();

     // Zamerať na input názvu tímu pri otvorení
     setTimeout(() => {
         if (teamNameInput) teamNameInput.focus();
     }, 0);
}


// Funkcia na zatvorenie modálneho okna Vytvoriť tímy
function closeTeamCreationModal() {
     console.log("Zatváram modál Vytvoriť tímy");
     // Zatvoriť modálne okno (closeModal by malo byť definované v common.js alebo globálne)
     closeModal(teamCreationModal);
     // Resetovať formulár a kontajner po zatvorení
     if (teamCreationForm) teamCreationForm.reset();
     if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';

     // Po zatvorení modálu na vytvorenie tímov by sa mal zoznam tímov v tabuľke aktualizovať
     displayCreatedTeams();
}


// Listener pre odoslanie formulára Vytvoriť tímy
if (teamCreationForm) {
    teamCreationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("Odosielam formulár Vytvoriť tímy...");

        const baseTeamName = teamNameInput.value.trim();
        if (!baseTeamName) {
            alert("Prosím, zadajte základný názov tímu.");
            if (teamNameInput) teamNameInput.focus();
            return;
        }

        const teamPairs = []; // Pole na uloženie dvojíc { categoryId, teamCount }
        const pairDivs = teamCategoryCountContainer ? teamCategoryCountContainer.querySelectorAll('.category-count-pair') : [];

        const selectedCategoryIds = new Set(); // Na kontrolu duplicitných výberov kategórií
        let hasError = false;

        // Získanie hodnôt z každého riadku (kategória a počet tímov)
        for (const pairDiv of pairDivs) {
            const categorySelect = pairDiv.querySelector('.team-category-select-dynamic');
            const countInput = pairDiv.querySelector('.team-count-input-dynamic');

            const categoryId = categorySelect ? categorySelect.value : null;
            const teamCount = countInput ? parseInt(countInput.value, 10) : 0;

            // Základná validácia
            if (!categoryId) {
                alert("Prosím, vyberte kategóriu pre všetky riadky.");
                if (categorySelect) categorySelect.focus();
                hasError = true;
                break; // Zastaviť spracovanie, ak sa nájde chyba
            }
             // Kontrola duplicity kategórie
             if (selectedCategoryIds.has(categoryId)) {
                  const category = allAvailableCategories.find(cat => cat.id === categoryId);
                 const categoryName = category ? category.name : categoryId;
                 alert(`Kategória "${categoryName}" bola vybraná viackrát.`);
                    // Zamerať sa na prvý select s duplicitnou kategóriou
                    const firstDuplicateSelect = teamCategoryCountContainer.querySelector(`.team-category-select-dynamic[value="${categoryId}"]`);
                    if (firstDuplicateSelect) firstDuplicateSelect.focus();
                 hasError = true;
                 break; // Zastaviť spracovanie
               }
               selectedCategoryIds.add(categoryId); // Pridať ID kategórie do množiny vybraných

            if (isNaN(teamCount) || teamCount <= 0) {
                alert("Prosím, zadajte platný počet tímov (väčší ako 0) pre každú kategóriu.");
                 if (countInput) countInput.focus();
                hasError = true;
                break; // Zastaviť spracovanie
            }

               // Validácia počtu tímov pre abecedné označenie (A-Z)
               if (teamCount > 26) {
                    const category = allAvailableCategories.find(cat => cat.id === categoryId);
                    const categoryName = category ? category.name : categoryId;
                    alert(`Pre kategóriu "${categoryName}": Pre abecedné označenie je možné vytvoriť maximálne 26 tímov naraz (A-Z).`);
                    if (countInput) countInput.focus();
                    hasError = true;
                    break; // Zastaviť spracovanie
               }


            // Ak validácia prebehne, pridať pár do poľa
            teamPairs.push({ categoryId, teamCount });
        }

        // Ak nastala chyba, ukončiť funkciu
        if (hasError) {
             return;
        }

        // Kontrola, či bol pridaný aspoň jeden pár
        if (teamPairs.length === 0) {
            alert("Prosím, pridajte aspoň jeden pár kategória a počet tímov.");
             if (addCategoryCountPairButton) addCategoryCountPairButton.focus(); // Zamerať na tlačidlo Pridať
            return;
        }

        console.log("Páry tímov na vytvorenie:", teamPairs);

        const batch = writeBatch(db); // Vytvorenie batch operácie pre efektívnejšie zápisy
        let successfullyAddedCount = 0;
        const failedCreations = [];

        try {
            // Iterácia cez každý plán vytvorenia tímu (kategória a počet)
            for (const teamPlan of teamPairs) {
                 const categoryId = teamPlan.categoryId;
                 const teamCount = teamPlan.count;
                  // Nájsť názov kategórie pre zostavenie plného názvu tímu
                  const category = allAvailableCategories.find(cat => cat.id === categoryId);
                  // Ak sa kategória nenašla (nemalo by sa stať ak select boxy sú správne naplnené), použiť ID
                  const categoryName = category ? category.name : categoryId;


                 // Vytvoriť určený počet tímov pre danú kategóriu
                 for (let i = 1; i <= teamCount; i++) {
                      let teamSuffixForName = '';
                      // Pridať suffix (A, B, C...) ak je tímov viac ako 1 v danej kategórii pod rovnakým základným názvom
                      if (teamCount > 1) {
                           // Získať písmeno A-Z na základe indexu i
                           const letter = String.fromCharCode(65 + (i - 1));
                           teamSuffixForName = ` ${letter}`; // Pridať medzeru pred písmenom
                      }

                       // Zostaviť kompletný názov tímu (napr. "U12 CH - Spartak A")
                       const fullTeamName = buildFullTeamName(categoryName, baseTeamName, teamSuffixForName.trim()); // Použiť názov kategórie
                       // ID dokumentu v databáze bude kompletný názov tímu
                       const documentId = fullTeamName;
                       const teamDocRef = doc(clubsCollectionRef, documentId); // Referencia na dokument tímu


                       // Kontrola, či dokument s takýmto ID už existuje pred pokusom o vytvorenie
                       const existingDoc = await getDoc(teamDocRef);
                        if (existingDoc.exists()) {
                            // Ak dokument existuje, nezapisovať ho a zaznamenať zlyhanie
                            failedCreations.push({ id: documentId, name: fullTeamName, reason: 'Už existuje dokument s rovnakým ID.' });
                             console.warn(`Preskočené vytvorenie tímu "${fullTeamName}" (${documentId}) - dokument už existuje.`);
                            continue; // Prejsť na ďalší tím v slučke
                        }


                      // Pridať operáciu zápisu do batch
                      // !!! Ukladanie pouziva assignedGroup, hoci nacitanie dava groupId - toto je nekonzistencia !!!
                      // !!! Pri nacitani pouzivame groupId, preto aj tu by malo byt groupId pre konzistentnost, ale zachovavam assignedGroup ako to bolo !!!
                      batch.set(teamDocRef, {
                          name: baseTeamName + teamSuffixForName.trim(), // Uložiť základný názov + suffix do poľa 'name'
                          categoryId: categoryId, // Uložiť len ID kategórie
                          groupId: null, // Pôvodne nepriradený do skupiny - POUZIVA assignedGroup PRI UKLADANI - OPRAVA: POUZIT groupId PRE KONSISTENTNOST
                          orderInGroup: null,
                          createdFromBase: baseTeamName // Uložiť základný názov pre zoskupovanie v Správe tímov
                      });
                      successfullyAddedCount++; // Zvýšiť počítadlo úspešne pridaných
                 }
            }

            // Vykonanie všetkých zápisov v rámci jednej batch operácie
            await batch.commit();

             // Zobrazenie výsledku používateľovi
             let resultMessage = `Pokus o vytvorenie tímov dokončený. Úspešne vytvorených: ${successfullyAddedCount}.`;
             if (failedCreations.length > 0) {
                  resultMessage += `\n\nNiektoré tímy nebolo možné vytvoriť, pretože záznam s príslušným ID už existoval (${failedCreations.length} ks).`;
                 console.warn("Neúspešné pokusy o vytvorenie tímov:", failedCreations);
             } else {
                 resultMessage += " Všetky plánované tímy boli úspešne vytvorené.";
             }
             alert(resultMessage);

            // Zatvoriť modálne okno po dokončení
            closeTeamCreationModal();
            // Po vytvorení nových tímov znovu zobraziť celý zoznam pre aktualizáciu tabuľky
            displayCreatedTeams(); // Volanie funkcie na zobrazenie tabuľky

        } catch (error) {
            // Spracovanie chýb pri zápise do databázy
            console.error('Chyba pri vytváraní tímov: ', error);
            alert(`Chyba pri vytváraní tímov! Prosím, skúste znova. Detail: ${error.message}`);
             // Ak došlo k chybe počas zápisu, nezatvárať modál, ale zobraziť chybu a umožniť opravu
             // Zabezpečiť, že selectboxy sú po chybe stále správne aktualizované
             if (teamCreationModal && teamCreationModal.style.display === 'block') {
                 updateDynamicCategorySelects();
                 updateRemoveButtonVisibility();
                 checkIfAddCategoryCountPairButtonShouldBeVisible();
             } else {
                  // Ak sa modal medzitým zavrel (napr. inou chybou), resetovať formulár
                  if (teamCreationForm) teamCreationForm.reset();
                  if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
             }
        }
    });
} else { console.error("Team creation form not found!"); }


// --- Funkcie pre zobrazenie vytvorených tímov na stránke (Vykresľovanie tabuľky) ---

// Funkcia na zobrazenie vytvorených tímov (klubov) v tabuľke na stránke
async function displayCreatedTeams() {
    console.log("InnerHTML createdTeamsTableHeader pred kontrolou:", createdTeamsTableHeader.innerHTML);
    console.log("Zobrazujem vytvorené tímy...");
    // Získať referencie na telo a hlavičku tabuľky
    if (!createdTeamsTableBody || !createdTeamsTableHeader) {
        console.error("Tabuľka pre vytvorené tímy nenájdená!");
        return;
    }

    createdTeamsTableBody.innerHTML = ''; // Vyčistiť telo tabuľky pred naplnením
    // Hlavička sa vytvára len raz pri prvom načítaní, alebo ak bola vyčistená
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
        // Načítať všetky tímy (clubs) z databázy
        const querySnapshot = await getDocs(clubsCollectionRef);
        console.log("Načítané dokumenty tímov (clubs) z DB:", querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))); // LOG: Dokumenty tímov

        // Mapovať dokumenty na polia objektov tímov
        const teams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Spracované tímy (teams array):", teams); // LOG: Pole tímov ako objektov


         // Načítať všetky kategórie (pre potreby mapovania názvov kategórií a iných funkcií)
         // Tieto by mali byť načítané už pri otvorení stránky, ak nie, načítať ich.
        if (allAvailableCategories.length === 0) {
             await loadAllCategoriesForDynamicSelects(); // Načíta kategórie ak ešte nie sú
        }
        console.log("Aktuálne dostupné kategórie (allAvailableCategories):", allAvailableCategories); // LOG: Zoznam kategórií


        // Načítať všetky skupiny (aj keď pre zobrazenie v tabuľke budeme parsovať ID skupiny)
        // Tieto by mali byť načítané už pri otvorení stránky, ak nie, načítať ich.
        if (allAvailableGroups.length === 0) {
             await loadAllGroups(); // Načíta skupiny na pozadí
        }
         console.log("Aktuálne dostupné skupiny (allAvailableGroups):", allAvailableGroups); // LOG: Zoznam skupín

         // Mapa skupín (ID -> Názov) pre rýchle vyhľadávanie názvov (používa sa v Správe tímov modále)
         const groupsMap = allAvailableGroups.reduce((map, group) => {
            map[group.id] = group.name; // Mapovať ID skupiny na názov skupiny
            return map;
        }, {});
        // console.log("Mapa skupín (ID -> Názov):", groupsMap); // LOG: Mapa skupín


        // Ak nie sú žiadne tímy, zobraziť správu
        if (teams.length === 0) {
             // Vytvoriť hlavičku, aj keď sú tímy prázdne (ak už neexistuje)
             if (createdTeamsTableHeader.innerHTML.trim() === '') {
                  createdTeamsTableHeader.innerHTML = `
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  `;
             }
             // Zobraziť správu "Žiadne tímy" s colspanom
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Zatiaľ nie sú vytvorené žiadne tímy.</td></tr>'; // Colspan na 5 stĺpcov
            return; // Ukončiť funkciu
        }

         // Vytvoriť hlavičku tabuľky, ak existujú tímy a hlavička ešte nebola vytvorená
         if (createdTeamsTableHeader.innerHTML.trim() === '') {
                  createdTeamsTableHeader.innerHTML = `
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  `;
             }

        // Zoradiť tímy abecedne podľa celého názvu (ID) pre konzistentné zobrazenie
        teams.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

        // Prejsť cez každý tím a vytvoriť riadok v tabuľke
        teams.forEach(team => {
            // console.log("Spracovávam tím pre zobrazenie:", team); // LOG: Aktuálny tím v cykle

            const row = createdTeamsTableBody.insertRow(); // Vložiť nový riadok do tela tabuľky
            row.dataset.teamId = team.id; // Uložiť ID tímu do riadku pre jednoduchšiu manipuláciu (napr. pri mazaní)


            // Bunka pre Názov tímu
            const teamNameCell = row.insertCell();
            // Zobraziť názov tímu z poľa 'name' dokumentu (podľa logu toto obsahuje časť bez kategórie)
            teamNameCell.textContent = team.name || 'Neznámy názov'; // Použiť team.name, ak existuje, inak placeholder
             // console.log(`Tím ID: ${team.id}, Zobrazený Názov (z name): ${teamNameCell.textContent}`); // LOG: Názov tímu


            // Bunka pre Kategóriu
            const categoryCell = row.insertCell();
            // Zobraziť kategóriu - POUŽIŤ categoryId a allAvailableCategories
            // !!! Toto zobrazi názov kategórie LEN AK dokumenty kategórií majú pole 'name' !!!
            const category = allAvailableCategories.find(cat => cat.id === team.categoryId);
            categoryCell.textContent = category ? category.name : (team.categoryId || 'Neznáma kategória'); // Ak sa nájde v zozname kategórií (s menom), zobraziť meno, inak zobraziť ID alebo placeholder
             // console.log(`Tím ID: ${team.id}, categoryId: ${team.categoryId}, Názov kategórie (z allAvailableCategories): ${category ? category.name : 'Nenájdená'}`); // LOG: Kategória


            // Bunka pre Skupinu
            const groupCell = row.insertCell();
            // Zobraziť názov skupiny - EXTRAHOVAŤ Z groupId ID
            let displayedGroupName = 'Nepriradené'; // Predvolená hodnota pre nepriradené tímy

            // !!! ZMENA: Použiť team.groupId namiesto team.assignedGroup na základe logov !!!
            if (team.groupId && typeof team.groupId === 'string') { // Skontrolovať, či groupId existuje a je reťazec
                 const groupNameParts = team.groupId.split(' - '); // Rozdeliť reťazec podľa " - "
                 // Ak po rozdelení existuje druhá časť (a ďalšie), použiť ju/ich ako názov skupiny
                 if (groupNameParts.length > 1) {
                      displayedGroupName = groupNameParts.slice(1).join(' - '); // Spojiť zvyšné časti, ak ich je viac
                 } else {
                      // Ak sa nepodarilo rozdeliť (formát bez " - "), zobraziť celé ID skupiny alebo špecifickú správu
                      displayedGroupName = team.groupId; // Zobraziť celé ID skupiny ako názov
                      console.warn(`Tím ID: ${team.id} má groupId ID bez oddelovača " - ": "${team.groupId}". Zobrazujem celé ID ako názov skupiny.`);
                 }

                  // Ak je extrahovaný názov prázdny po orežaní bielych znakov, zobraziť placeholder
                  if (displayedGroupName.trim() === '') {
                      displayedGroupName = 'Neznáma skupina (prázdny názov po extrakcii)';
                  }


            } else if (team.groupId) {
                 // Ak groupId existuje, ale nie je reťazec (čo by nemalo nastať, ale pre istotu pri chybných dátach)
                 displayedGroupName = 'Neznáma skupina (neplatný formát ID)';
                 console.warn(`Tím ID: ${team.id} má groupId s neplatným formátom (nie reťazec):`, team.groupId);
            }
            // Ak team.groupId neexistuje, displayedGroupName zostane 'Nepriradené'

            groupCell.textContent = displayedGroupName; // Nastaviť text bunky s názvom skupiny
             // console.log(`Tím ID: ${team.id}, groupId: ${team.groupId}, Zobrazený názov skupiny (z ID): ${displayedGroupName}`); // LOG: Skupina


            // Bunka pre Poradie v skupine
            const orderCell = row.insertCell();
             // Zobraziť poradie len ak je tím priradený do skupiny (má groupId) A poradie je číslo > 0
             // !!! ZMENA: Použiť team.groupId v podmienke namiesto team.assignedGroup !!!
            orderCell.textContent = (team.groupId && typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-'; // Zobraziť poradie, ak je platné, inak '-'
            orderCell.style.textAlign = 'center'; // Centrovať text v bunke poradia
             // console.log(`Tím ID: ${team.id}, orderInGroup: ${team.orderInGroup}, Zobrazené poradie: ${orderCell.textContent}`); // LOG: Poradie


            // Bunka pre Akcie
            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions-cell'); // Pridať triedu pre prípadné štýlovanie bunky s akciami
            actionsCell.style.textAlign = 'center'; // Centrovanie obsahu akcie

            // Tlačidlo "Upraviť / Priradiť"
            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť / Priradiť';
            editButton.classList.add('action-button'); // Pridať triedu pre štýlovanie
            // openClubModal by malo byť dostupné globálne alebo importované
            // Pri kliknutí na tlačidlo úpravy, otvoriť modál klubu v režime 'edit' pre daný tím
            editButton.onclick = () => {
                 // openClubModal funkcia by mala byť definovaná v spravca-turnaja-script.js alebo common.js a dostupná
                 if (typeof openClubModal === 'function') {
                      openClubModal(team.id, 'edit'); // Volanie funkcie na otvorenie modálu klubu
                 } else {
                      console.error("Funkcia openClubModal nie je dostupná.");
                      alert("Funkcia na úpravu tímu nie je dostupná.");
                 }
            };


            // Tlačidlo "Vymazať"
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Vymazať';
            deleteButton.classList.add('action-button', 'delete-button'); // Pridať triedy pre štýlovanie
            // Pri kliknutí na tlačidlo vymazať, potvrdiť a vymazať tím
            deleteButton.onclick = async () => {
                if (confirm(`Naozaj chcete vymazať tím "${team.id}"?`)) { // Potvrdenie pouziva team.id pre cely nazov
                    await deleteTeam(team.id); // Volanie funkcie na vymazanie tímu
                    // displayCreatedTeams(); // Znovu zobraziť zoznam po vymazaní - volá sa už v deleteTeam
                }
            };

            // Použiť Flexbox v bunke s akciami na zarovnanie tlačidiel
            actionsCell.style.display = 'flex';
            actionsCell.style.justifyContent = 'center'; // Centrovať tlačidlá horizontálne
            actionsCell.style.alignItems = 'center'; // Centrovať tlačidlá vertikálne
            actionsCell.style.gap = '5px'; // Medzera medzi tlačidlami

            // Pridať tlačidlá do bunky Akcie
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);


            // Pridať všetky bunky k riadku
            row.appendChild(teamNameCell);
            row.appendChild(categoryCell);
            row.appendChild(groupCell);
            row.appendChild(orderCell);
            row.appendChild(actionsCell); // Pridať akčnú bunku ako poslednú


            // Pridať riadok do tela tabuľky
            createdTeamsTableBody.appendChild(row);
        });


         // Ak existujú tímy, ale po filtrovaní by neboli žiadne, zobrazila by sa správa v filterTeams,
         // ale kedze tu nemame filtrovanie, len zobrazenie vsetkych, tato vetva sa pouzije len ak teams.length > 0.


    } catch (e) {
        // Spracovanie chýb pri načítaní alebo zobrazovaní tímov
        console.error("Chyba pri zobrazovaní tímov: ", e);
         // Vytvoriť hlavičku pri chybe, aby bol colspan správny (ak ešte nebola vytvorená)
         if (createdTeamsTableHeader.innerHTML.trim() === '') {
                  createdTeamsTableHeader.innerHTML = `
                       <th>Názov tímu</th>
                       <th>Kategória</th>
                       <th>Skupina</th>
                       <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  `;
             }
         // Zobraziť chybovú správu s colspanom
        createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Nepodarilo sa načítať tímy.</td></tr>'; // Colspan na 5 stĺpcov
    }
}


// Funkcia na vymazanie tímu (klubu) z databázy
async function deleteTeam(teamId) {
     console.log("Mažem tím s ID:", teamId);
     try {
         // Získať referenciu na dokument tímu podľa ID
         const teamDocRef = doc(clubsCollectionRef, teamId);
         // Vymazať dokument z databázy
         await deleteDoc(teamDocRef);
         console.log("Tím bol úspešne vymazaný.");

         // Po úspešnom vymazaní znovu zobraziť zoznam tímov pre aktualizáciu tabuľky
         displayCreatedTeams();

          // Po vymazaní tímu by mohlo byť potrebné aktualizovať zoznam nepriradených tímov v modále klubu
          if(typeof populateUnassignedClubsSelect === 'function') {
               // populateUnassignedClubsSelect(); // Táto funkcia by sa mala volať pri otvorení modalu priradenia
          }

     } catch (e) {
         // Spracovanie chýb pri mazaní tímu
         console.error("Chyba pri mazaní tímu:", e);
         alert("Nepodarilo sa vymazať tím.");
     }
}


// Funkcia na načítanie všetkých skupín (Potrebné pre modál klubu)
async function loadAllGroups() {
     console.log("Načítavam skupiny...");
     allAvailableGroups = []; // Vyčistiť pole pred načítaním
     try {
         // Načítať všetky skupiny z kolekcie groups
         const querySnapshot = await getDocs(groupsCollectionRef);
         querySnapshot.forEach((doc) => {
             const groupData = doc.data();
              // Pridať skupinu do poľa
              if (groupData) {
                   // Uložiť ID skupiny a dáta skupiny
                   allAvailableGroups.push({ id: doc.id, ...groupData });
              } else {
                   console.warn("Skupina dokument s ID", doc.id, "má prázdne dáta.");
              }
         });
         // Zoradiť skupiny podľa názvu pre lepší prehľad vo selectoch
         // Ak chýba name, použiť id na zoradenie
         allAvailableGroups.sort((a, b) => {
              const nameA = (a.name || a.id) || '';
              const nameB = (b.name || b.id) || '';
              return nameA.localeCompare(nameB, 'sk-SK');
         });
         console.log("Načítané skupiny (allAvailableGroups):", allAvailableGroups);

          // Ak existuje selectbox skupín pre modál klubu, naplniť ho
          if (clubGroupSelect) {
               // Táto funkcia by sa mala volať pri otvorení modalu priradenia/úpravy,
               // aby sa zohľadnila kategória tímu. Voláme ju tu len pre ukážku načítania dát.
               // populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null); // Pre modál klubu
           }


     } catch (e) {
         console.error("Chyba pri načítaní skupín:", e);
         // Zobraziť chybu alebo nastaviť select box na zakázaný stav
          // Ak existuje selectbox, nastaviť ho na chybový stav
          if (clubGroupSelect) {
               clubGroupSelect.innerHTML = '<option value="">-- Chyba pri načítaní skupín --</option>';
               clubGroupSelect.disabled = true;
          }
     }
}


// Funkcia na naplnenie selectboxu skupín (Potrebné pre modál klubu) - Používa sa v openClubModal
// Používa allAvailableGroups načítané v loadAllGroupsData (v tejto verzii loadAllGroups)
function populateGroupSelectForClubModal(selectElement, selectedId = '', availableGroups, categoryId = null) {
    console.log("Napĺňam select skupín v modále klubu.", { selectedId, categoryId, availableGroupsCount: availableGroups.length });
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';

    // Filtrovať skupiny podľa categoryId tímu, ktorý upravujeme/priradzujeme
    // Ak je zadané categoryId, filtrujeme skupiny, ktorých ID začína týmto categoryId + " - "
    const filteredGroups = categoryId
        ? availableGroups.filter(group => group.id.startsWith(categoryId + ' - '))
        : availableGroups; // Ak nie je zadaná kategória, zobrazíme všetky skupiny

    console.log("Filtrované skupiny pre select v modále:", filteredGroups);

    // Ak po filtrovaní nie sú žiadne skupiny pre danú kategóriu
    if (filteredGroups.length === 0 && categoryId) {
         // Nájsť názov kategórie pre zobrazenie v správe
         const category = allAvailableCategories.find(cat => cat.id === categoryId);
         const categoryName = category ? category.name : categoryId;
         const option = document.createElement('option');
         option.value = "";
         option.textContent = `-- Žiadne skupiny v kategórii "${categoryName}" --`;
         option.disabled = true; // Zakázať možnosť
         selectElement.appendChild(option);
    } else if (filteredGroups.length === 0 && !categoryId) {
         // Ak nie je zadaná kategória a nie sú žiadne skupiny vôbec
         const option = document.createElement('option');
         option.value = "";
         option.textContent = `-- Najprv vyberte kategóriu (v režime assign vyberte tím) --`;
         option.disabled = true;
         selectElement.appendChild(option);
    }
    else {
         // Ak existujú filtrované skupiny, naplniť selectbox
         filteredGroups.forEach(group => {
             const option = document.createElement('option');
             option.value = group.id; // ID dokumentu skupiny (napr. "U12 CH - Skupina A")
              // Zobraziť názov skupiny (z poľa name), alebo ID ak name chýba
             const displayedGroupName = group.name || group.id;
             option.textContent = displayedGroupName; // Zobraziť názov alebo ID
             selectElement.appendChild(option);
         });
    }

     // Nastaviť predvolene vybranú hodnotu, ak je zadaná a existuje v selectboxe
     if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
         selectElement.value = selectedId;
     } else {
          // Ak nie je zadaná vybraná hodnota alebo neexistuje, nastaviť na prvú možnosť (placeholder)
          selectElement.value = "";
     }
     console.log("Naplnenie selectu skupín v modále dokončené.");
}


// Funkcia na naplnenie selectboxu s nepriradenými klubmi (Potrebné pre modál klubu v režime 'assign')
async function populateUnassignedClubsSelect() {
     console.log("Načítavam nepriradené tímy/kluby...");
     // Získať referenciu na selectbox nepriradených klubov
     if (!unassignedClubSelect) { console.error("Unassigned club select not found!"); return; }

     // Vyčistiť selectbox a nastaviť predvolenú možnosť
     unassignedClubSelect.innerHTML = '<option value="">-- Vyberte nepriradený tím --</option>';
     unassignedClubSelect.disabled = false; // Predvolene povolené


     try {
         // Vytvoriť query na nájdenie tímov, ktoré nemajú priradenú skupinu (groupId je null)
         const q = query(clubsCollectionRef, where("groupId", "==", null)); // Pouzivame groupId na základe logov a opravy
         const querySnapshot = await getDocs(q); // Vykonanie query

         // Ak sa nenašli žiadne nepriradené tímy
         if (querySnapshot.empty) {
              // Pridať správu do selectboxu a zakázať ho
              const option = document.createElement('option');
              option.value = "";
              option.textContent = "Žiadne nepriradené tímy";
              option.disabled = true;
              unassignedClubSelect.appendChild(option);
              unassignedClubSelect.disabled = true; // Zakázať select box
             console.log("Žiadne nepriradené tímy nájdené. Select nepriradených tímov zakázaný.");
         } else {
             // Mapovať dokumenty nepriradených tímov na polia objektov a zoradiť ich
             const unassignedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK')); // Zoradiť podľa názvu

             // Naplniť selectbox nepriradenými tímami
             unassignedTeams.forEach(team => {
                 const option = document.createElement('option');
                 option.value = team.id; // Hodnota je ID tímu
                 option.textContent = team.name || team.id; // Zobraziť názov tímu, alebo ID ak názov chýba
                 option.dataset.categoryId = team.categoryId; // Uložiť categoryId do datasetu option pre ľahký prístup
                 unassignedClubSelect.appendChild(option);
             });
             console.log("Nepriradené tímy načítané a spracované:", unassignedTeams.length);
         }

     } catch (e) {
         // Spracovanie chýb pri načítaní nepriradených tímov
         console.error("Chyba pri načítaní nepriradených tímov:", e);
         // Pridať chybovú správu do selectboxu a zakázať ho
         const option = document.createElement('option');
         option.value = "";
         option.textContent = "Chyba pri načítaní tímov";
         option.disabled = true;
         unassignedClubSelect.appendChild(option);
         unassignedClubSelect.disabled = true; // Zakázať select box
     }
}


// Funkcia na otvorenie modálneho okna Priradiť/Upraviť Klub
// Používa sa z tabuľky zoznamu tímov a z tabuľky v modále Správa tímov
async function openClubModal(clubId = null, mode = 'assign') {
    console.log(`Otváram modál Klub v režime: ${mode}, ID: ${clubId}`);
     // Zabezpečiť, že všetky potrebné DOM elementy modálu existujú
     if (!clubModal || !clubModalTitle || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect) {
          console.error("Elementy modálu Klub nenájdené!");
          alert("Nastala chyba pri otváraní modálu klubu. Prosím, kontaktujte podporu.");
          return;
     }

    // Resetovať formulár a nastaviť stavové premenné
    clubForm.reset();
    editingClubId = clubId; // Uložiť ID upravovaného tímu (v edit mode)
    currentClubModalMode = mode; // Uložiť aktuálny režim modálu ('assign' alebo 'edit')

     // Načítať skupiny a kategórie, ak ešte nie sú. Tieto by mali byť načítané pri štarte stránky, ale pre istotu.
     if (allAvailableGroups.length === 0) {
         await loadAllGroups(); // Načíta skupiny
     }
     if (allAvailableCategories.length === 0) {
         await loadAllCategoriesForDynamicSelects(); // Načíta kategórie (a aktualizuje selecty vo vytvorenie tímov)
     }


     // Logika pre režim "Priradiť" (assign)
     if (mode === 'assign') {
        clubModalTitle.textContent = 'Priradiť nepriradený tím/klub'; // Zmeniť titulok modálu
        clubNameField.style.display = 'none'; // Skryť pole pre názov klubu (pretože vyberáme z existujúcich nepriradených)
        clubAssignmentFields.style.display = 'block'; // Zobraziť polia pre priradenie (kategória, skupina, poradie)
        unassignedClubField.style.display = 'block'; // Zobraziť selectbox pre výber nepriradeného tímu

        // Nastaviť select kategórií pre nepriradenie (bude sa napĺňať po výbere tímu)
        clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
        clubCategorySelect.disabled = true; // Zakázať select kategórií, kým nie je vybraný tím

        // Naplniť select skupín (na začiatku zobrazí všetky, ak nie je vybraná kategória)
        populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);


        // Načítať a naplniť selectbox s nepriradenými tímami
        await populateUnassignedClubsSelect();


         // Pridať listener na zmenu selectboxu nepriradených tímov
         // Keď používateľ vyberie nepriradený tím, zistiť jeho kategóriu a aktualizovať select skupín
         unassignedClubSelect.onchange = async () => {
             const selectedId = unassignedClubSelect.value; // Získať ID vybraného tímu
              // Získať categoryId z datasetu vybranej <option>
              const selectedOption = unassignedClubSelect.options[unassignedClubSelect.selectedIndex];
              const categoryId = selectedOption ? selectedOption.dataset.categoryId : null;
              console.log("Zmenený výber nepriradeného tímu.", { selectedId, categoryId });

             // Ak je vybraný tím a má categoryId
             if (selectedId && categoryId) {
                 // Nájsť názov kategórie a naplniť select kategórií
                 const category = allAvailableCategories.find(cat => cat.id === categoryId);
                 const categoryName = category ? category.name : 'Neznáma kategória';
                 clubCategorySelect.innerHTML = `<option value="${categoryId}">${categoryName}</option>`;
                 // Naplniť select skupín filtrovanými skupinami pre danú kategóriu
                  populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, categoryId);
             } else {
                 // Ak nie je vybraný tím alebo nemá categoryId, resetovať select kategórií a skupín
                 clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
                 populateGroupSelectForClubModal(clubGroupSelect, null, allAvailableGroups, null);
             }
         };

     }
     // Logika pre režim "Upraviť" (edit)
     else if (mode === 'edit' && clubId) {
        clubModalTitle.textContent = 'Upraviť tím / Priradiť klub'; // Zmeniť titulok modálu
        clubNameField.style.display = 'block'; // Zobraziť pole pre názov klubu (môže sa upravovať)
        clubAssignmentFields.style.display = 'block'; // Zobraziť polia pre priradenie
        unassignedClubField.style.display = 'none'; // Skryť selectbox nepriradených tímov

        // Odstrániť onchange listener z selectboxu nepriradených klubov (pre prípad, že bol pridaný)
        if (unassignedClubSelect) unassignedClubSelect.onchange = null;

        try {
            // Načítať údaje tímu na úpravu z databázy
            const clubDocRef = doc(clubsCollectionRef, clubId);
            const clubDoc = await getDoc(clubDocRef);
            if (clubDoc.exists()) {
                const clubData = clubDoc.data(); // Získať dáta tímu

                // Naplniť formulár údajmi tímu
                clubNameInput.value = clubData.name || clubData.id || ''; // Naplniť názov tímu (uprednostniť pole name, ak chýba použiť ID)

                // Zobraziť kategóriu tímu (select kategórií je disabled)
                const category = allAvailableCategories.find(cat => cat.id === clubData.categoryId); // Nájsť kategóriu podľa ID
                const categoryName = category ? category.name : (clubData.categoryId || 'Neznáma kategória'); // Získať názov alebo ID
                clubCategorySelect.innerHTML = `<option value="${clubData.categoryId}">${categoryName}</option>`; // Naplniť select kategórií
                clubCategorySelect.disabled = true; // Zakázať select kategórií

                 // Naplniť select skupín filtrovanými skupinami pre kategóriu tímu a nastaviť vybranú skupinu
                 populateGroupSelectForClubModal(clubGroupSelect, clubData.groupId, allAvailableGroups, clubData.categoryId); // Použiť clubData.groupId a clubData.categoryId


                // Naplniť pole pre poradie v skupine
                orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : ''; // Naplniť poradie, ak je platné, inak prázdne

            } else {
                // Ak sa tím na úpravu nenašiel v databáze
                console.error("Tím s ID", clubId, "sa nenašiel.");
                alert("Tím na úpravu sa nenašiel.");
                closeModal(clubModal); // Zatvoriť modál
                //displayCreatedTeams(); // Aktualizovať zoznam (pre prípad, že tím bol medzitým vymazaný)
                return; // Ukončiť funkciu
            }
        } catch (e) {
            // Spracovanie chýb pri načítaní údajov tímu
            console.error("Chyba pri načítaní údajov tímu na úpravu:", e);
            alert("Nepodarilo sa načítať údaje tímu na úpravu.");
            closeModal(clubModal); // Zatvoriť modál
            //displayCreatedTeams(); // Aktualizovať zoznam
            return; // Ukončiť funkciu
        }

     }
     // Spracovanie neplatného režimu alebo chýbajúceho ID v režime edit
     else {
         console.error("Neplatný režim modálu klubu alebo chýbajúce ID v režime edit.");
         alert("Vyskytla sa chyba pri otváraní modálu klubu.");
         closeModal(clubModal); // Zatvoriť modál
         //displayCreatedTeams(); // Aktualizovať zoznam
         return; // Ukončiť funkciu
     }

    // Otvoriť modálne okno klubu (openModal by malo byť definované v common.js alebo globálne)
    openModal(clubModal);
}


// Listener pre odoslanie formulára Priradiť/Upraviť Klub
if (clubForm) {
     clubForm.addEventListener('submit', async (event) => {
         event.preventDefault(); // Zabrániť predvolenému odoslaniu formulára
         console.log("Odosielam formulár Priradiť/Upraviť Klub...");

         // Získať hodnoty z formulára
         const clubName = clubNameInput.value.trim(); // Názov tímu (používa sa v edit mode)
         const selectedGroupIdInModal = clubGroupSelect ? clubGroupSelect.value : null; // Vybrané ID skupiny (ID skupiny ako reťazec)
         let orderInGroup = orderInGroupInput ? parseInt(orderInGroupInput.value, 10) : null; // Poradie v skupine (ako číslo alebo null)

         let clubIdToUpdate = editingClubId; // ID tímu, ktorý sa bude aktualizovať/priradzovať
         let updatedData = {}; // Objekt na uloženie dát na aktualizáciu
         let clubCategoryFromDb = null; // Na uloženie pôvodnej kategórie tímu z DB
         let originalCreatedFromBase = null; // Na uloženie pôvodného createdFromBase z DB
         let originalTeamName = null; // Na uloženie pôvodného názvu tímu z DB


         try {
             // Určiť ID tímu, ktorý sa má aktualizovať, na základe režimu modálu
             if (currentClubModalMode === 'assign' && unassignedClubSelect && unassignedClubSelect.value) {
                 clubIdToUpdate = unassignedClubSelect.value; // V režime assign, ID je to, čo bolo vybrané v selectboxe nepriradených
             } else if (currentClubModalMode === 'edit' && editingClubId) {
                 clubIdToUpdate = editingClubId; // V režime edit, ID je to, čo bolo uložené pri otvorení modálu
             } else {
                  // Ak sa nepodarilo určiť tím na aktualizáciu
                  console.error("Chyba: Nelze určit tým k aktualizaci.");
                  alert("Vyskytla se chyba při určování, ktorý tým aktualizovať.");
                  return; // Ukončiť funkciu
             }

             // Ak stále nemáme ID tímu na aktualizáciu, zobraziť chybu
             if (!clubIdToUpdate) {
                 alert("Prosím, vyberte tím k aktualizaci/prirazení.");
                 return; // Ukončiť funkciu
             }

             // Načítať aktuálne dáta tímu z databázy, aby sme získali pôvodnú kategóriu, createdFromBase a názov
             const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToUpdate));
              console.log(`Načítané dáta tímu ${clubIdToUpdate} pre aktualizáciu:`, clubDoc.exists() ? clubDoc.data() : "Dokument nenájdený");

             // Ak sa dokument tímu našiel v DB
             if (clubDoc.exists()) {
                 const clubData = clubDoc.data(); // Získať dáta tímu
                 clubCategoryFromDb = clubData.categoryId || null; // Uložiť categoryId z DB
                 originalCreatedFromBase = clubData.createdFromBase || null; // Uložiť createdFromBase z DB
                 originalTeamName = clubData.name || clubData.id; // Uložiť pôvodný názov tímu z DB (name, alebo id)

                 // Nastaviť názov tímu pre aktualizáciu na základe režimu
                 if (currentClubModalMode === 'assign') {
                      // V režime assign sa názov tímu nemení, použije sa pôvodný názov z DB
                      updatedData.name = originalTeamName;
                 } else {
                      // V režime edit sa názov tímu berie z inputu formulára
                      updatedData.name = clubName;
                 }
             } else {
                 // Ak sa dokument tímu nenašiel, zobraziť chybu a ukončiť funkciu
                 console.error("Tím s ID", clubIdToUpdate, "sa nenašiel v databáze pre aktualizáciu.");
                 alert("Tím sa nenašiel. Prosím, skúste znova.");
                 return;
             }

         } catch (e) {
             // Spracovanie chýb pri načítaní tímu pred aktualizáciou
             console.error(`Chyba pri načítaní tímu ${clubIdToUpdate} pre aktualizáciu:`, e);
             alert("Chyba pri načítaní údajov tímu. Prosím, skúste znova.");
             return; // Ukončiť funkciu
         }


         // Zostaviť objekt s dátami na aktualizáciu pre dokument tímu
         updatedData = {
              ...updatedData, // Obsahuje name (načítané z DB v assign mode, z inputu v edit mode)
             categoryId: clubCategoryFromDb, // Kategória zostáva pôvodná (z DB)
             groupId: selectedGroupIdInModal || null, // Uložiť vybrané ID skupiny (null ak nie je vybraná skupina) - !!! POUZIVAME groupId PRI UKLADANI TERAZ PRE KONSISTENTNOST !!!
             orderInGroup: (selectedGroupIdInModal && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null, // Uložiť poradie, ak je platné a je vybraná skupina, inak null
             createdFromBase: originalCreatedFromBase // createdFromBase zostáva pôvodné (z DB)
         };

         // Vynulovať poradie, ak bola skupina zrušená alebo nebola vybraná (pre istotu, hoci už je v logike vyššie zahrnuté)
         if (updatedData.groupId === null) {
             updatedData.orderInGroup = null;
         }

         console.log("Údaje na aktualizáciu pre tím s ID", clubIdToUpdate, ":", updatedData);


         // Vykonanie aktualizácie v databáze
         if (clubIdToUpdate) {
             const clubDocRef = doc(clubsCollectionRef, clubIdToUpdate); // Referencia na dokument tímu

              // Ak je v režime edit a mení sa názov tímu (čo je aj ID dokumentu)
              if (currentClubModalMode === 'edit' && updatedData.name !== clubIdToUpdate) {
                   console.log(`Mení sa názov tímu z "${clubIdToUpdate}" na "${updatedData.name}". Vymažem starý a vytvorím nový dokument.`);
                   const newDocumentId = updatedData.name; // Nové ID dokumentu bude nový názov tímu
                    const newClubDocRef = doc(clubsCollectionRef, newDocumentId); // Referencia na nový dokument

                    // Kontrola, či nový názov tímu už neexistuje v databáze
                    const existingDoc = await getDoc(newClubDocRef);
                     if (existingDoc.exists()) {
                          alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                          if (clubNameInput) clubNameInput.focus(); // Zamerať sa na input názvu
                          return; // Ukončiť funkciu
                     }

                     // Použiť batch operáciu na atomické vymazanie starého a vytvorenie nového dokumentu
                     const batch = writeBatch(db);
                     batch.delete(clubDocRef); // Vymazať starý dokument
                     // Uložiť nový dokument s novým ID a aktualizovanými dátami
                     batch.set(newClubDocRef, {
                          ...updatedData, // Nové dáta (obsahuje name)
                          id: newDocumentId // Explicitne nastaviť ID nového dokumentu
                     });

                     await batch.commit(); // Vykonanie batch operácie

                    console.log(`Tím bol úspešne premenovaný z "${clubIdToUpdate}" na "${newDocumentId}".`);
                     editingClubId = newDocumentId; // Aktualizovať editingClubId na nové ID


              } else {
                   // Ak sa názov tímu nemení (alebo je režim assign), len aktualizovať existujúci dokument
                   await updateDoc(clubDocRef, updatedData);
                   console.log("Tím/Klub s ID", clubIdToUpdate, "bol úspešne aktualizovaný/priradený.");
              }


             alert("Zmeny boli úspešne uložené."); // Potvrdenie používateľovi

             closeModal(clubModal); // Zatvoriť modálne okno klubu
             // Po úspešnej aktualizácii (vrátane premenovania alebo priradenia) znovu načítať a zobraziť celý zoznam pre aktualizáciu tabuľky
             displayCreatedTeams();

         } else {
             // Ak z nejakého dôvodu chýba ID tímu na aktualizáciu
             console.error("Chýba ID tímu/klubu na aktualizáciu.");
             alert("Vyskytla sa chyba pri ukladaní zmien: chýba ID tímu/klubu.");
         }
     });
} else { console.error("Club form not found!"); }


// Listener pre zatvorenie modálneho okna Priradiť/Upraviť Klub kliknutím na X
if (clubModalClose) {
     clubModalClose.addEventListener('click', () => {
          closeModal(clubModal); // Zatvoriť modál
          editingClubId = null; // Resetovať stavové premenné
          currentClubModalMode = null;
          // Po zatvorení modalu klubu (ktorý mohol byť otvorený z modalu Správa tímov alebo hlavného zoznamu)
          // znovu načítať a zobraziť hlavný zoznam pre prípad, že sa niečo zmenilo
          displayCreatedTeams(); // Zabezpečí aktualizáciu tabuľky
     });
}

// Listener pre zatvorenie modálneho okna Priradiť/Upraviť Klub kliknutím mimo modálu
if (clubModal) {
     window.addEventListener('click', (event) => {
         if (event.target === clubModal) { // Ak bol kliknutý cieľ samotný modál (pozadie)
             closeModal(clubModal); // Zatvoriť modál
             editingClubId = null; // Resetovať stavové premenné
             currentClubModalMode = null;
             displayCreatedTeams(); // Zabezpečí aktualizáciu tabuľky
         }
     });
}


// --- Inicializácia ---

// Listener na udalost DOMContentLoaded - spustí sa po plnom načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM plne načítaný pre zoznam tímov.");

    // Pri načítaní stránky načítať všetky kategórie a skupiny na pozadí
    // Kategórie sa načítajú pre dynamické selectboxy vo Vytvorenie tímov modále
    await loadAllCategoriesForDynamicSelects();
    // Skupiny sa načítajú pre modál Priradiť/Upraviť Klub
    await loadAllGroups();


    // Zobraziť vytvorené tímy v tabuľke pri načítaní stránky
    displayCreatedTeams();


    // Konfigurácia tlačidla "+" pre túto sekciu (Zoznam tímov)
     const addButton = document.getElementById('addButton');
     if (addButton) {
          addButton.style.display = 'block'; // Zobraziť tlačidlo "+"
          addButton.title = "Priradiť nepriradený tím"; // Nastaviť popis tlačidla "+" na Priradiť tím
           // Priradiť funkciu na otvorenie modalu klubu v režime 'assign'
           addButton.onclick = () => {
                // Volanie funkcie na otvorenie modalu klubu bez ID (režim 'assign')
                // Mode 'assign' je default, ale pre prehľadnosť ho môžeme explicitne uviesť:
                openClubModal(null, 'assign');
           };
      } else {
         console.error("Add button not found on teams list page!");
     }

});


// Exportujte potrebné funkcie pre použitie v spravca-turnaja-script.js alebo inde
// Exportovanie funkcie openTeamCreationModal, displayCreatedTeams, openManageTeamsModal, closeManageTeamsModal, openClubModal
// Tieto funkcie sú potrebné pre navigáciu a interakciu medzi stránkami a modulmi.
export { openTeamCreationModal, displayCreatedTeams, openClubModal };
// Exportujte aj ďalšie premenné, ak sú potrebné inde (napr. allAvailableCategories, allAvailableGroups)
// export { allAvailableCategories, allAvailableGroups };

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
             // Použiť ID dokumentu ako hodnotu (napr. "U10", "U12 CH") a name pole ako text zobrazenia
             const categoryData = doc.data();
             // Pridáme kategóriu iba ak existuje a má platné 'name' pole
             if (categoryData && typeof categoryData.name === 'string' && categoryData.name.trim() !== '') {
                allAvailableCategories.push({ id: doc.id, name: categoryData.name.trim() });
             } else {
                 console.warn("Kategória dokument s ID", doc.id, "má chýbajúce, neplatné alebo prázdne 'name' pole.");
             }
         });
         // Zoradiť kategórie podľa mena pre lepší prehľad
         // Oprava: Ošetrenie prípadu, ak by a.name alebo b.name boli null/undefined
         allAvailableCategories.sort((a, b) => {
             const nameA = (a && typeof a.name === 'string') ? a.name : ''; // Ak a alebo a.name chýba, použi prázdny reťazec
             const nameB = (b && typeof b.name === 'string') ? b.name : ''; // Ak b alebo b.name chýba, použi prázdny reťazec
             return nameA.localeCompare(nameB, 'sk-SK');
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
function populateDynamicCategorySelect(selectElement, selectedId = '', availableCategories, categoriesToDisable = []) {
     if (!selectElement) return;
     selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Predvolená možnosť
     availableCategories.forEach(category => {
         const option = document.createElement('option');
         option.value = category.id; // Použiť ID dokumentu ako hodnotu
         option.textContent = category.name; // Zobraziť názov kategórie
         // Zakázať kategórie, ktoré sú už vybrané v iných selectboxoch
         if (categoriesToDisable.includes(category.id)) {
             option.disabled = true;
         }
         selectElement.appendChild(option);
     });
      // Ak bola zadaná počiatočná hodnota, nastaviť ju ako vybranú
      if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
          selectElement.value = selectedId;
      } else {
           // Ak počiatočná hodnota nebola platná alebo nebola zadaná, uistiť sa, že je vybraná predvolená možnosť
           selectElement.value = "";
      }
      // Zablokovať select, ak je k dispozícii len jedna možnosť (predvolená) a nie je vybratá žiadna platná kategória
      if (selectElement.options.length <= 1 && !selectedId) {
          selectElement.disabled = true;
      } else {
          selectElement.disabled = false;
      }
}


// Funkcia na aktualizáciu všetkých dynamických selectboxov s dostupnými kategóriami
function updateDynamicCategorySelects() {
    const allSelectElements = teamCategoryCountContainer ? teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic') : [];
    const currentlySelectedCategoryIds = Array.from(allSelectElements).map(select => select.value).filter(value => value !== '');

    allSelectElements.forEach(selectElement => {
        const currentSelectedId = selectElement.value;
        // Zoznam ID kategórií na zakázanie pre tento konkrétny selectbox
        // Sú to všetky aktuálne vybrané ID kategórií okrem toho, ktoré je vybrané v tomto selectboxe
        const categoryIdsToDisable = currentlySelectedCategoryIds.filter(catId => catId !== currentSelectedId);

        // Znovu naplniť selectbox s aktualizovaným zoznamom zakázaných ID kategórií
        populateDynamicCategorySelect(selectElement, currentSelectedId, allAvailableCategories, categoryIdsToDisable);
    });

     // Po aktualizácii selectboxov, skontrolovať viditeľnosť tlačidla Pridať/Odstrániť
     checkIfAddCategoryCountPairButtonShouldBeVisible();
     updateRemoveButtonVisibility();
}

// Funkcia na kontrolu viditeľnosti tlačidla Odstrániť
function updateRemoveButtonVisibility() {
    const removeButtons = teamCategoryCountContainer ? teamCategoryCountContainer.querySelectorAll('.category-count-pair .delete-button') : [];
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
    const allSelectElements = teamCategoryCountContainer ? teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic') : [];
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
async function addCategoryCountPair(initialCategoryId = null) { // initialCategory zmenené na initialCategoryId
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
           // Kategórie sa načítajú pri otvorení modalu, tu by už mali byť
           // Ak tu stále nie sú, je problém v logike otvárania/načítania
           console.warn("Kategórie nie sú načítané pri pridávaní nového páru.");
           // Pokus o načítanie, ale nemusí byť dokončené hneď
           // loadAllCategoriesForDynamicSelects(); // Volá sa pri otvorení modalu
      }

      // Získať aktuálne vybrané kategórie v ostatných selectboxoch (pred naplnením tohto nového)
      const allSelectElementsBeforeAdding = container.querySelectorAll('.team-category-select-dynamic');
      const categoriesSelectedInOthers = Array.from(allSelectElementsBeforeAdding)
          .map(select => select.value)
          .filter(value => value !== '' && value !== initialCategoryId); // Vylúčiť prázdnu a počiatočnú kategóriu

      // Naplnit novy selectbox s dostupnymi (nevybranymi) kategoriami
      populateDynamicCategorySelect(
         categorySelect,
         initialCategoryId, // Ak je zadaná počiatočná kategória, vybrať ju
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


     // Zamerať na novopridaný selectbox pre lepšiu použiteľnosť
     setTimeout(() => {
          categorySelect.focus();
     }, 0);
}


// Funkcia na otvorenie modálneho okna Vytvoriť tímy
// EXPORTOVANÁ pre použitie v spravca-turnaja-script.js
async function openTeamCreationModal() {
     console.log("Otváram modál Vytvoriť tímy");
     // Resetovať formulár a kontajner pre dynamické polia pri otvorení modálu
     if (teamCreationForm) teamCreationForm.reset();
     if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
     // Načítať kategórie pri otvorení modalu, ak ešte nie sú
     if (allAvailableCategories.length === 0) {
          await loadAllCategoriesForDynamicSelects();
     }
     // Pridať prvý pár kategória/počet pri otvorení
     await addCategoryCountPair();

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
            if (teamNameInput) teamNameInput.focus();
            return;
        }

        const teamPairs = [];
        const pairDivs = teamCategoryCountContainer.querySelectorAll('.category-count-pair');

        // Kontrola, či sú všetky kategórie unikátne a vybrané
        const selectedCategoryIds = new Set(); // Zmenené na Set IDčiek
        let hasError = false;

        for (const pairDiv of pairDivs) { // Použiť for...of pre možnosť použiť return na zastavenie
            const categorySelect = pairDiv.querySelector('.team-category-select-dynamic');
            const countInput = pairDiv.querySelector('.team-count-input-dynamic');

            const categoryId = categorySelect ? categorySelect.value : null;
            const teamCount = countInput ? parseInt(countInput.value, 10) : 0;

            if (!categoryId) {
                alert("Prosím, vyberte kategóriu pre všetky riadky.");
                if (categorySelect) categorySelect.focus();
                hasError = true;
                break; // Ukončiť cyklus
            }
             if (selectedCategoryIds.has(categoryId)) {
                  // Nájsť názov kategórie na zobrazenie v chybovej správe
                 const category = allAvailableCategories.find(cat => cat.id === categoryId);
                 const categoryName = category ? category.name : categoryId;
                 alert(`Kategória "${categoryName}" bola vybraná viackrát. Pre každú kategóriu môžete zadať iba jeden počet.`);
                    // Nájsť prvý select s touto duplicitnou hodnotou a zamerať ho
                    const firstDuplicateSelect = teamCategoryCountContainer.querySelector(`.team-category-select-dynamic[value="${categoryId}"]`);
                    if (firstDuplicateSelect) firstDuplicateSelect.focus();
                 hasError = true;
                 break; // Ukončiť cyklus
               }
               selectedCategoryIds.add(categoryId);


            if (isNaN(teamCount) || teamCount <= 0) {
                alert("Prosím, zadajte platný počet tímov (väčší ako 0) pre každú kategóriu.");
                 if (countInput) countInput.focus();
                hasError = true;
                break; // Ukončiť cyklus
            }

               // Kontrola, či sa nevytvára príliš veľa tímov pre abecedné označenie (A-Z)
               if (teamCount > 26) {
                   // Nájsť názov kategórie na zobrazenie v chybovej správe
                    const category = allAvailableCategories.find(cat => cat.id === categoryId);
                    const categoryName = category ? category.name : categoryId;
                    alert(`Pre kategóriu "${categoryName}": Pre abecedné označenie je možné vytvoriť maximálne 26 tímov naraz (A-Z). Prosím, znížte počet tímov.`);
                    if (countInput) countInput.focus();
                    hasError = true;
                    break; // Ukončiť cyklus
               }


            teamPairs.push({ categoryId, teamCount });
        }

        // Ak nastala chyba počas validácie, zastaviť submit
        if (hasError) {
             return;
        }

        if (teamPairs.length === 0) {
            alert("Prosím, pridajte aspoň jeden pár kategória a počet tímov.");
             if (addCategoryCountPairButton) addCategoryCountPairButton.focus();
            return;
        }

        console.log("Páry tímov na vytvorenie:", teamPairs);

        const batch = writeBatch(db); // Použiť batch pre atomické zápisy
        let successfullyAddedCount = 0;
        const failedCreations = []; // Zoznam tímov, ktoré sa nepodarilo vytvoriť (napr. už existujú)

        try {
            for (const teamPlan of teamPairs) {
                 const categoryId = teamPlan.categoryId;
                 const teamCount = teamPlan.count;
                  // Získať názov kategórie pre zostavenie celého názvu tímu a ID
                  const category = allAvailableCategories.find(cat => cat.id === categoryId);
                  const categoryName = category ? category.name : categoryId; // Ak sa názov nenájde, použiť ID


                 for (let i = 1; i <= teamCount; i++) {
                      let teamSuffixForName = ''; // Suffix pre názov tímu (napr. " A")

                      // Pridať abecedné označenie (suffix) ak sa vytvára viac ako jeden tím pre tento základný názov a kategóriu
                      if (teamCount > 1) {
                           const letter = String.fromCharCode(65 + (i - 1)); // Generovať 'A', 'B', 'C', ...
                           teamSuffixForName = ` ${letter}`; // Suffix pre názov (s medzerou)
                      }

                       // Zostaviť celý názov tímu (napr. "U12 CH - Spartak A")
                       const fullTeamName = buildFullTeamName(categoryName, baseTeamName, teamSuffixForName.trim()); // Použiť názov kategórie a základný názov + suffix

                       // Zostaviť unikátne ID dokumentu (napr. "U12 CH - Spartak A")
                       // Použijeme rovnaký formát ako celý názov tímu, aby ID bolo čitateľné a unikátne
                       const documentId = fullTeamName; // ID dokumentu je celé meno tímu
                       const teamDocRef = doc(clubsCollectionRef, documentId);

                       // Skontrolovať, či dokument s týmto ID už existuje PRED pokusom o zápis
                       const existingDoc = await getDoc(teamDocRef);
                        if (existingDoc.exists()) {
                            // Ak dokument existuje, preskočiť vytvorenie a zaznamenať chybu
                            failedCreations.push({ id: documentId, name: fullTeamName, reason: 'Už existuje dokument s rovnakým ID.' });
                             console.warn(`Preskočené vytvorenie tímu "${fullTeamName}" (${documentId}) - dokument už existuje.`);
                            continue; // Prejsť na ďalšiu iteráciu cyklu
                        }

                      // Pridať nový dokument tímu do batchu na zápis
                      batch.set(teamDocRef, {
                          name: fullTeamName, // Uložiť celý názov tímu (napr. "U12 CH - Spartak A")
                          categoryId: categoryId, // Uložiť ID kategórie (pre jednoduchšie filtrovanie/zväzovanie)
                          assignedGroup: null, // Pôvodne nepriradený do skupiny
                          orderInGroup: null, // Pôvodne bez poradia v skupine
                          createdFromBase: baseTeamName // Uložiť základný názov pre zoskupovanie
                      });
                      successfullyAddedCount++; // Zvýšiť počítadlo úspešne pridaných
                 }
            }

            await batch.commit(); // Vykonanie všetkých operácií zápisu (setDoc) naraz

            // Spätná väzba pre používateľa a zatvorenie modálu
             let resultMessage = `Pokus o vytvorenie tímov dokončený. Úspešne vytvorených: ${successfullyAddedCount}.`;
             if (failedCreations.length > 0) {
                  resultMessage += `\n\nNiektoré tímy nebolo možné vytvoriť, pretože záznam s príslušným ID už existoval (${failedCreations.length} ks). Skontrolujte zoznam tímov.`;
                 console.warn("Neúspešné pokusy o vytvorenie tímov:", failedCreations);
             } else {
                 resultMessage += " Všetky plánované tímy boli úspešne vytvorené.";
             }
             alert(resultMessage);


            closeTeamCreationModal(); // Zatvoriť modálne okno (vyčistí formulár a kontajner)

        } catch (error) {
            console.error('Chyba pri vytváraní tímov: ', error);
            alert(`Chyba pri vytváraní tímov! Prosím, skúste znova. Detail: ${error.message}`);

             // Ak nastane chyba, modál ostane otvorený a znova sa načítajú kategórie (alebo sa len aktualizujú, ak už sú načítané)
             if (teamCreationModal && teamCreationModal.style.display === 'block') {
                  // Len aktualizovať selectboxy a stav tlačidiel
                 updateDynamicCategorySelects();
                 updateRemoveButtonVisibility();
                 checkIfAddCategoryCountPairButtonShouldBeVisible();
             } else {
                  // Ak modál nie je otvorený (chyba nastala po zatvorení?), vyčistiť formulár a kontajner
                  if (teamCreationForm) teamCreationForm.reset();
                  if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
             }
        }
    });
} else { console.error("Team creation form not found!"); }


// Listener pre tlačidlo "Pridať ďalšiu kategóriu" v modále Vytvoriť tímy
// TENTO LISTENER BY MAL BYŤ RIADENÝ V SPRAVCA-TURNAJA-SCRIPT.JS NA ZÁKLADE HASHA
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
    createdTeamsTableHeader.innerHTML = ''; // Vyčistiť hlavičku (bude vytvorená dynamicky)


    try {
        // Načítať všetky tímy (clubs) z databázy
        const querySnapshot = await getDocs(clubsCollectionRef);
        const teams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

         // Načítať všetky kategórie (pre potreby mapovania názvov kategórií a iných funkcií)
        if (allAvailableCategories.length === 0) {
             await loadAllCategoriesForDynamicSelects(); // Načítať kategórie, ak ešte nie sú
        }
         // Kategórie sa zobrazia z parsovaného názvu tímu, nie z categoryId (ale categoryId je stále užitočné)


        // Načítať všetky skupiny, aby sme mohli zobraziť názov skupiny
        if (allAvailableGroups.length === 0) {
             await loadAllGroups(); // Načítať skupiny na pozadí
        }
         const groupsMap = allAvailableGroups.reduce((map, group) => {
            map[group.id] = group.name; // Mapovať ID skupiny na názov skupiny
            return map;
        }, {});


        if (teams.length === 0) {
             // Vytvoriť hlavičku, aj keď sú tímy prázdne
             createdTeamsTableHeader.innerHTML = `
                  <tr>
                      <th>Názov tímu</th>
                      <th>Kategória</th>
                      <th>Skupina</th>
                      <th>Poradie v skupine</th>
                       <th>Akcie</th>
                  </tr>
             `;
            createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Zatiaľ nie sú vytvorené žiadne tímy.</td></tr>'; // Colspan na 5 stĺpcov
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


        // Zoradiť tímy abecedne podľa celého názvu pre konzistentné zobrazenie
        teams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));


        teams.forEach(team => {
            const row = createdTeamsTableBody.insertRow();
            row.dataset.teamId = team.id; // Uložiť ID tímu do riadku pre jednoduchšiu manipuláciu

            // Parsuj názov tímu na zobrazenie
            const { categoryPrefix, baseName } = parseTeamName(team.name);


            const teamNameCell = row.insertCell();
            // Zobraziť len základný názov tímu v stĺpci "Názov tímu"
            teamNameCell.textContent = baseName;


            const categoryCell = row.insertCell();
            // Zobraziť kategóriu z parsovaného názvu tímu
            categoryCell.textContent = categoryPrefix;

            const groupCell = row.insertCell();
            groupCell.textContent = team.assignedGroup ? (groupsMap[team.assignedGroup] || 'Neznáma skupina') : 'Nepriradené';

            const orderCell = row.insertCell();
             // Zobraziť poradie len ak je tím priradený do skupiny a poradie je číslo > 0
            orderCell.textContent = (team.assignedGroup && typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-';
            orderCell.style.textAlign = 'center';


            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions-cell'); // Trieda pre prípadné štýlovanie bunky s akciami
            actionsCell.style.textAlign = 'center'; // Centrovanie obsahu akcie

            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť / Priradiť';
            editButton.classList.add('action-button');
            // openClubModal by malo byť dostupné globálne alebo importované
            // Pri úprave posielame ID tímu a režim 'edit'
            editButton.onclick = () => {
                 // openClubModal funkcia by mala byť definovaná v spravca-turnaja-script.js alebo common.js a dostupná
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
                if (confirm(`Naozaj chcete vymazať tím "${team.name}"?`)) {
                    await deleteTeam(team.id); // Použiť existujúcu funkciu deleteTeam
                    // displayCreatedTeams(); // Znovu zobraziť zoznam po vymazaní - volá sa už v deleteTeam
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
         // Vytvoriť hlavičku pri chybe, aby bol colspan správny
         createdTeamsTableHeader.innerHTML = `
              <tr>
                  <th>Názov tímu</th>
                  <th>Kategória</th>
                  <th>Skupina</th>
                  <th>Poradie v skupine</th>
                   <th>Akcie</th>
              </tr>
         `;
        createdTeamsTableBody.innerHTML = '<tr><td colspan="5">Nepodarilo sa načítať tímy.</td></tr>'; // Colspan na 5 stĺpcov
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
          // Predpokladá sa, že populateUnassignedClubsSelect je dostupná
          if(typeof populateUnassignedClubsSelect === 'function') {
               populateUnassignedClubsSelect();
          }

     } catch (e) {
         console.error("Chyba pri mazaní tímu:", e);
         alert("Nepodarilo sa vymazať tím.");
     }
}


// --- Funkcie pre Modál Správa tímov ---
// Predpokladáme, že modál Správa tímov slúži na zobrazenie zoznamu tímov patriacich k jednému Základnému názvu
// a modál Priradiť/Upraviť Klub slúži na úpravu jedného konkrétneho tímu/priradenie klubu

// Funkcia na otvorenie modálneho okna Správa tímov pre konkrétny základný názov
// Predpokladáme, že táto funkcia je volaná z displayCreatedTeams
// EXPORTOVANÁ pre prípad použitia v spravca-turnaja-script.js
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
            // Zoskupiť tímy podľa kategórie pre zobrazenie
            const teamsByCategory = {};
            querySnapshot.forEach(doc => {
                 const team = { id: doc.id, ...doc.data() };
                 // Získať kategóriu z parsovaného názvu tímu, ak je kategória uložená v názve
                 const { categoryPrefix } = parseTeamName(team.name);
                 const category = categoryPrefix || 'Nepriradená kategória'; // Ak sa nepodarí parsovať, použiť placeholder

                 if (!teamsByCategory[category]) {
                      teamsByCategory[category] = [];
                 }
                 teamsByCategory[category].push(team);
            });

            // Zoradiť kategórie abecedne
            const sortedCategories = Object.keys(teamsByCategory).sort((a, b) => a.localeCompare(b, 'sk-SK'));


            sortedCategories.forEach(categoryName => {
                const teamsInThisCategory = teamsByCategory[categoryName];

                // Hlavička pre kategóriu v modále
                const categoryHeading = document.createElement('h3');
                categoryHeading.textContent = categoryName;
                teamsListInModal.appendChild(categoryHeading);

                // Tabuľka pre tímy v danej kategórii v rámci Správa tímov modálu
                 const categoryTeamsTable = document.createElement('table');
                 categoryTeamsTable.classList.add('group-clubs-table'); // Použiť štýly tabuľky
                 categoryTeamsTable.style.tableLayout = 'auto'; // Aby sa šírky stĺpcov prispôsobili
                 categoryTeamsTable.style.width = '100%'; // Zabrať celú šírku

                 // Hlavička tabuľky v modále
                 const thead = document.createElement('thead');
                 const headerRow = document.createElement('tr');

                 const teamNameTh = document.createElement('th');
                 teamNameTh.textContent = 'Názov tímu'; // Celý názov tímu aj s kategóriou pre prehľadnosť v Správe

                 const groupTh = document.createElement('th');
                 groupTh.textContent = 'Skupina';
                 groupTh.style.whiteSpace = 'nowrap';

                 const orderTh = document.createElement('th');
                 orderTh.textContent = 'Poradie';
                 orderTh.style.textAlign = 'center';
                 orderTh.style.whiteSpace = 'nowrap';


                 const actionsTh = document.createElement('th');
                 actionsTh.textContent = ''; // Hlavička stĺpca akcie je prázdna
                 actionsTh.style.whiteSpace = 'nowrap';


                 headerRow.appendChild(teamNameTh);
                 headerRow.appendChild(groupTh);
                 headerRow.appendChild(orderTh);
                 headerRow.appendChild(actionsTh);
                 thead.appendChild(headerRow);
                 categoryTeamsTable.appendChild(thead);


                const tbody = document.createElement('tbody');

                 // Zoradiť tímy v rámci kategórie v modále Správa tímov
                 teamsInThisCategory.sort((a, b) => {
                     // Najprv nepriradené tímy
                     const isAssignedA = a.assignedGroup !== null;
                     const isAssignedB = b.assignedGroup !== null;
                     if (isAssignedA !== isAssignedB) {
                         return isAssignedA ? 1 : -1;
                     }

                     // Ak sú oba priradené, zoradiť podľa skupiny a poradia
                     if (isAssignedA) {
                         const groupA = a.assignedGroup || '';
                         const groupB = b.assignedGroup || '';
                         const orderA = typeof a.orderInGroup === 'number' ? a.orderInGroup : Infinity;
                         const orderB = typeof b.orderInGroup === 'number' ? b.orderInGroup : Infinity;

                         if (groupA !== groupB) {
                             return groupA.localeCompare(groupB, 'sk-SK');
                         }
                         if (orderA !== orderB) {
                             return orderA - orderB;
                         }
                     }

                     // Ak sú oba nepriradené alebo v rovnakej skupine/poradí, zoradiť podľa názvu
                     const nameA = a.name || '';
                     const nameB = b.name || '';
                     return nameA.localeCompare(nameB, 'sk-SK');
                 });


                teamsInThisCategory.forEach(team => {
                    const tr = document.createElement('tr');
                    tr.dataset.teamId = team.id; // Uložiť ID tímu

                    const nameTd = document.createElement('td');
                    nameTd.textContent = team.name || 'Neznámy názov'; // Zobraziť celý názov tímu

                    const groupTd = document.createElement('td');
                     // Predpoklad formatu ID skupiny "Kategoria - Nazov" - zobraziť len názov skupiny
                    const groupNameParts = (team.assignedGroup || '').split(' - ');
                    const displayedGroupName = team.assignedGroup ? (groupNameParts.length > 1 ? groupNameParts.slice(1).join(' - ') : team.assignedGroup) : 'Nepriradené';
                    groupTd.textContent = displayedGroupName;


                    const orderTd = document.createElement('td');
                    orderTd.textContent = (team.assignedGroup && typeof team.orderInGroup === 'number' && team.orderInGroup > 0) ? team.orderInGroup : '-';
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
                        closeManageTeamsModal(); // Zatvoriť modál Správa tímov pred otvorením modálu Klubu
                         // openClubModal by malo byť dostupné globálne alebo importované
                         if (typeof openClubModal === 'function') {
                             // V režime edit posielame ID tímu a režim 'edit'
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
                        if (confirm(`Naozaj chcete vymazať tím "${team.name}"?`)) {
                            await deleteTeam(team.id); // Použiť funkciu deleteTeam
                             // Po vymazaní v Správe tímov modále, treba odstrániť riadok z tabuľky
                            tr.remove();
                             // Ak po vymazaní nezostali žiadne tímy s týmto základným názvom, zatvoriť modál
                             const remainingTeams = teamsListInModal.querySelectorAll('table tbody tr'); // Skontrolujte len riadky tabuliek
                             // Skontrolujte, či zostali nejaké tabuľky s riadkami
                             let remainingRowCount = 0;
                              teamsListInModal.querySelectorAll('table tbody').forEach(tbody => {
                                  remainingRowCount += tbody.querySelectorAll('tr').length;
                              });

                             if (remainingRowCount === 0) {
                                  closeManageTeamsModal();
                             }
                            // Znovu zobraziť zoznam tímov na pozadí
                            displayCreatedTeams();
                        }
                    };

                    actionsDiv.appendChild(editButton);
                    actionsDiv.appendChild(deleteButton);

                    tr.appendChild(nameTd);
                    tr.appendChild(groupTd);
                    tr.appendChild(orderTd);
                    tr.appendChild(actionsTd);

                    tbody.appendChild(tr);
                });
                categoryTeamsTable.appendChild(tbody); // Pridaj telo do tabuľky
                teamsListInModal.appendChild(categoryTeamsTable); // Pridaj tabuľku do modálu
            });
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
// Tieto funkcie by pravdepodobne mali byť v spravca-turnaja-script.js alebo common.js
// a mali by byť dostupné globálne alebo exportované/importované.
// V tomto kóde sú provizórne, ak nie sú definované inde.

// Funkcia na načítanie všetkých skupín (Potrebné pre selectbox skupín v modále klubu)
// Táto funkcia by pravdepodobne mala byť v spravca-turnaja-script.js alebo common.js a exportovaná
async function loadAllGroups() {
     console.log("Načítavam skupiny...");
     allAvailableGroups = []; // Vyčistiť pole pred načítaním
     try {
         const querySnapshot = await getDocs(groupsCollectionRef);
         querySnapshot.forEach((doc) => {
              // Uložiť ID skupiny a názov (ktorý už zrejme obsahuje kategóriu v ID)
             const groupData = doc.data();
              if (groupData && typeof groupData.name === 'string' && groupData.name.trim() !== '') {
                   allAvailableGroups.push({ id: doc.id, name: groupData.name.trim() }); // Uložiť aj názov skupiny
              } else {
                   console.warn("Skupina dokument s ID", doc.id, "má chýbajúce, neplatné alebo prázdne 'name' pole.");
              }
         });
         // Zoradiť skupiny podľa mena pre lepší prehľad
         allAvailableGroups.sort((a, b) => {
              const nameA = (a && typeof a.name === 'string') ? a.name : '';
              const nameB = (b && typeof b.name === 'string') ? b.name : '';
              return nameA.localeCompare(nameB, 'sk-SK');
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
function populateGroupSelect(selectElement, selectedId = '', availableGroups) { // Zmenené selectedValue na selectedId
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>'; // Predvolená možnosť
    availableGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id; // ID dokumentu skupiny (napr. "U12 CH - Skupina A")
        option.textContent = group.name; // Názov skupiny (napr. "Skupina A") - predpokladáme, že name pole neobsahuje prefix kategórie
        selectElement.appendChild(option);
    });
     // Ak bola zadaná počiatočná hodnota, nastaviť ju ako vybranú
     if (selectedId && selectElement.querySelector(`option[value="${selectedId}"]`)) {
         selectElement.value = selectedId;
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
             // Zoradiť nepriradené tímy podľa mena
             const unassignedTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             unassignedTeams.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK'));

             unassignedTeams.forEach(team => {
                 const option = document.createElement('option');
                 option.value = team.id; // ID dokumentu tímu (čo je celé meno tímu)
                 option.textContent = team.name; // Celý názov tímu (vrátane kategórie)
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
// EXPORTOVANÁ pre prípad použitia v spravca-turnaja-script.js
async function openClubModal(clubId = null, mode = 'assign') {
    console.log(`Otváram modál Klub v režime: ${mode}, ID: ${clubId}`);
     if (!clubModal || !clubModalTitle || !clubForm || !clubNameField || !clubAssignmentFields || !unassignedClubField || !clubNameInput || !clubCategorySelect || !clubGroupSelect || !orderInGroupInput || !unassignedClubSelect) {
          console.error("Elementy modálu Klub nenájdené!");
          alert("Nastala chyba pri otváraní modálu klubu. Prosím, kontaktujte podporu.");
          return;
     }

    // Resetovať formulár a skryť/zobraziť polia podľa režimu
    clubForm.reset();
    editingClubId = clubId;
    currentClubModalMode = mode;

     // Načítať skupiny pri otvorení modálu, ak ešte nie sú
     if (allAvailableGroups.length === 0) {
         await loadAllGroups(); // Zabezpečiť načítanie skupín
     } else {
         // Ak sú skupiny už načítané, len naplniť selectbox
         populateGroupSelect(clubGroupSelect, null, allAvailableGroups);
     }

     // Načítať kategórie pri otvorení modálu, ak ešte nie sú (potrebné pre zobrazenie kategórie v režime edit/assign)
     if (allAvailableCategories.length === 0) {
         await loadAllCategoriesForDynamicSelects();
     }


     if (mode === 'assign') {
        clubModalTitle.textContent = 'Priradiť nepriradený tím/klub';
        clubNameField.style.display = 'none'; // Skryť pole názvu (názov sa vyberá zo selectboxu)
        clubAssignmentFields.style.display = 'block'; // Zobraziť polia priradenia (Skupina, Poradie)
        unassignedClubField.style.display = 'block'; // Zobraziť select nepriradených tímov
        clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`; // Resetovať zobrazenie kategórie
        clubCategorySelect.disabled = true; // Kategória sa v režime assign nedá vybrať/meniť

        // Načítať nepriradené tímy
        await populateUnassignedClubsSelect(); // Zabezpečiť načítanie nepriradených tímov

         // Pridať listener na zmenu selectboxu nepriradených tímov, aby sa zobrazila kategória vybraného tímu
         unassignedClubSelect.onchange = async () => {
             const selectedId = unassignedClubSelect.value;
             if (selectedId) {
                 try {
                      // Načítať údaje o vybranom nepriradenom tíme, aby sme zistili jeho kategóriu
                      const clubDoc = await getDoc(doc(clubsCollectionRef, selectedId));
                       if (clubDoc.exists()) {
                            const clubData = clubDoc.data();
                            // Získať názov kategórie na základe uloženého categoryId
                            const categoryName = allAvailableCategories.find(cat => cat.id === clubData.category)?.name || 'Neznáma kategória';
                            // Zobraziť aktuálnu kategóriu vybraného tímu (len zobraziť, nie vybrať)
                            clubCategorySelect.innerHTML = `<option value="${clubData.category}">${categoryName}</option>`;
                       } else {
                            console.error("Vybraný nepriradený tím s ID", selectedId, "sa nenašiel.");
                            clubCategorySelect.innerHTML = `<option value="">-- Chyba načítania kategórie --</option>`;
                       }
                 } catch (e) {
                      console.error("Chyba pri načítaní kategórie pre vybraný tím:", e);
                      clubCategorySelect.innerHTML = `<option value="">-- Chyba načítania kategórie --</option>`;
                 }
             } else {
                  // Ak nie je vybraný žiadny tím, resetovať zobrazenie kategórie
                 clubCategorySelect.innerHTML = `<option value="">-- Kategória sa zobrazí po výbere tímu --</option>`;
             }
         };


     } else if (mode === 'edit' && clubId) {
        clubModalTitle.textContent = 'Upraviť tím / Priradiť klub';
        clubNameField.style.display = 'block'; // Zobraziť pole názvu
        clubAssignmentFields.style.display = 'block'; // Zobraziť polia priradenia (Skupina, Poradie)
        unassignedClubField.style.display = 'none'; // Skryť select nepriradených tímov

        // Odstrániť listener na zmenu selectboxu nepriradených tímov
        if (unassignedClubSelect) unassignedClubSelect.onchange = null;

        // Načítať údaje o tíme na úpravu
        try {
            const clubDocRef = doc(clubsCollectionRef, clubId);
            const clubDoc = await getDoc(clubDocRef);
            if (clubDoc.exists()) {
                const clubData = clubDoc.data();
                // Zobraziť celý názov tímu v inpute názvu
                clubNameInput.value = clubData.name || '';

                // Zobraziť kategóriu (na základe uloženého categoryId)
                const categoryName = allAvailableCategories.find(cat => cat.id === clubData.category)?.name || 'Neznáma kategória';
                clubCategorySelect.innerHTML = `<option value="${clubData.category}">${categoryName}</option>`; // Zobraziť aktuálnu kategóriu (disabled)
                clubCategorySelect.disabled = true; // Kategória sa v režime edit nemení

                // Vybrať aktuálne priradenú skupinu v selectboxe
                 if (allAvailableGroups.length > 0) {
                      populateGroupSelect(clubGroupSelect, clubData.assignedGroup, allAvailableGroups);
                 } else {
                      // Ak skupiny ešte nie sú načítané, načítať ich a potom naplniť select
                      await loadAllGroups();
                      populateGroupSelect(clubGroupSelect, clubData.assignedGroup, allAvailableGroups);
                 }


                // Zobraziť aktuálne poradie v skupine
                orderInGroupInput.value = (typeof clubData.orderInGroup === 'number' && clubData.orderInGroup > 0) ? clubData.orderInGroup : '';

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
         alert("Vyskytla sa chyba pri otváraní modálu klubu.");
         closeModal(clubModal);
          displayCreatedTeams(); // Aktualizovať zobrazenie
         return;
     }

    openModal(clubModal); // Funkcia openModal by mala byť v common.js
}


// Listener pre odoslanie formulára Priradiť/Upraviť Klub
if (clubForm) {
     clubForm.addEventListener('submit', async (event) => {
         event.preventDefault();
         console.log("Odosielam formulár Priradiť/Upraviť Klub...");

         const clubName = clubNameInput.value.trim(); // Názov tímu (celý názov v režime edit)
         const categoryId = clubCategorySelect ? clubCategorySelect.value : null; // categoryId zobrazené, nie menené v modale klubu
         const groupId = clubGroupSelect ? clubGroupSelect.value : null;
         let orderInGroup = orderInGroupInput ? parseInt(orderInGroupInput.value, 10) : null; // Používame let, ak bude potrebné nulovať

         let clubIdToUpdate = editingClubId; // V režime edit sa aktualizuje editingClubId
         let updatedData = {};
         let clubCategoryFromDb = categoryId; // Predvolene pouzijeme categoryId z modalu, ale v rezime assign ju nacitame

         if (currentClubModalMode === 'assign') {
             // V režime assign sa aktualizuje vybraný nepriradený tím
             clubIdToUpdate = unassignedClubSelect ? unassignedClubSelect.value : null;
             if (!clubIdToUpdate) {
                 alert("Prosím, vyberte nepriradený tím/klub na priradenie.");
                 if (unassignedClubSelect) unassignedClubSelect.focus();
                 return;
             }
              // V režime assign neupravujeme názov tímu

              // Pri priradzovaní potrebujeme zistiť uloženú kategóriu tímu z DB
               try {
                   const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToUpdate));
                   if (clubDoc.exists()) {
                       const clubData = clubDoc.data();
                       clubCategoryFromDb = clubData.category; // Získame ID kategórie z DB
                       updatedData.name = clubData.name; // Použijeme existujúci názov
                   } else {
                       console.error("Vybraný nepriradený tím s ID", clubIdToUpdate, "sa nenašiel v databáze.");
                       alert("Vybraný nepriradený tím sa nenašiel. Prosím, skúste znova.");
                       return;
                   }
               } catch (e) {
                    console.error("Chyba pri načítaní nepriradeného tímu pre priradenie:", e);
                    alert("Chyba pri načítaní údajov tímu. Prosím, skúste znova.");
                    return;
               }


             updatedData = {
                 ...updatedData, // Zachovať názov a kategóriu načítané z DB
                 assignedGroup: groupId || null, // null ak nie je vybraná skupina
                 orderInGroup: (groupId && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null, // null ak nie je vybraná skupina, neplatné alebo nulové poradie
             };


         } else if (currentClubModalMode === 'edit' && clubIdToUpdate) {
             // V režime edit sa aktualizuje aj názov tímu (celý názov)
             if (!clubName) {
                 alert("Prosím, zadajte názov tímu/klubu.");
                 if (clubNameInput) clubNameInput.focus();
                 return;
             }

              // Pri úprave potrebujeme zistiť uloženú kategóriu tímu z DB
               try {
                   const clubDoc = await getDoc(doc(clubsCollectionRef, clubIdToUpdate));
                   if (clubDoc.exists()) {
                       const clubData = clubDoc.data();
                       clubCategoryFromDb = clubData.category; // Získame ID kategórie z DB
                   } else {
                       console.error("Tím s ID", clubIdToUpdate, "sa nenašiel v databáze pre úpravu.");
                       alert("Tím sa nenašiel. Prosím, skúste znova.");
                       return;
                   }
               } catch (e) {
                    console.error("Chyba pri načítaní tímu pre úpravu:", e);
                    alert("Chyba pri načítaní údajov tímu. Prosím, skúste znova.");
                    return;
               }


             updatedData = {
                 name: clubName, // Uložiť celý upravený názov tímu
                 categoryId: clubCategoryFromDb, // Uložiť pôvodnú kategóriu (nemala by sa meniť v tomto modale)
                 assignedGroup: groupId || null, // null ak nie je vybraná skupina
                 orderInGroup: (groupId && typeof orderInGroup === 'number' && orderInGroup > 0) ? orderInGroup : null, // null ak nie je vybraná skupina, neplatné alebo nulové poradie
                  // createdFromBase sa v tomto modale nemení
             };

         } else {
             console.error("Neznámy režim modálu klubu alebo chýbajúce ID tímu/klubu na aktualizáciu.");
             alert("Vyskytla sa chyba pri určovaní, ktorý tím/klub aktualizovať.");
             return;
         }

         // Vynulovať poradie, ak nie je vybraná skupina
         if (updatedData.assignedGroup === null) {
             updatedData.orderInGroup = null;
         }


         if (clubIdToUpdate) {
             const clubDocRef = doc(clubsCollectionRef, clubIdToUpdate);

             // Ak sa v režime edit mení názov tímu, musíme vymazať starý dokument a vytvoriť nový s novým ID (ktoré je názov)
             // Toto je komplexná operácia a vyžaduje overenie, či nové ID už neexistuje
              if (currentClubModalMode === 'edit' && updatedData.name !== clubIdToUpdate) {
                   console.log(`Mení sa názov tímu z "${clubIdToUpdate}" na "${updatedData.name}". Vymažem starý a vytvorím nový dokument.`);
                   const newDocumentId = updatedData.name;
                    const newClubDocRef = doc(clubsCollectionRef, newDocumentId);

                    // Skontrolovať, či nové ID už neexistuje
                    const existingDoc = await getDoc(newClubDocRef);
                     if (existingDoc.exists()) {
                          alert(`Tím s názvom "${newDocumentId}" už existuje. Prosím, zvoľte iný názov.`);
                          if (clubNameInput) clubNameInput.focus();
                          return;
                     }

                    // Použiť batch pre atomické vymazanie starého a vytvorenie nového dokumentu
                     const batch = writeBatch(db);
                     batch.delete(clubDocRef); // Vymazať starý dokument
                     batch.set(newClubDocRef, {
                          ...updatedData,
                          id: newDocumentId // ID nového dokumentu je nový názov
                          // Pôvodné createdFromBase by malo byť zachované z pôvodného dokumentu
                     });

                     // Potrebujeme získať aj pôvodné createdFromBase pre nový dokument
                     try {
                          const oldClubDoc = await getDoc(clubDocRef);
                           if (oldClubDoc.exists()) {
                                batch.set(newClubDocRef, {
                                    ...updatedData,
                                    id: newDocumentId,
                                    createdFromBase: oldClubDoc.data().createdFromBase || null // Použiť pôvodné createdFromBase
                               });
                           } else {
                                console.warn("Pôvodný dokument tímu pre získanie createdFromBase sa nenašiel.");
                                 batch.set(newClubDocRef, {
                                     ...updatedData,
                                     id: newDocumentId,
                                      createdFromBase: null // Ak sa nenájde, nastaviť na null
                                });
                           }
                     } catch(e) {
                          console.error("Chyba pri získavaní pôvodného createdFromBase:", e);
                           batch.set(newClubDocRef, {
                                ...updatedData,
                                id: newDocumentId,
                                 createdFromBase: null // Ak nastane chyba, nastaviť na null
                           });
                     }


                     await batch.commit(); // Vykonanie batch operácie


                    console.log(`Tím bol úspešne premenovaný z "${clubIdToUpdate}" na "${newDocumentId}".`);
                     editingClubId = newDocumentId; // Aktualizovať editingClubId na nové ID po úspešnom premenovaní


              } else {
                   // Ak sa názov tímu nemení (alebo režim je assign), len aktualizovať existujúci dokument
                   await updateDoc(clubDocRef, updatedData);
                   console.log("Tím/Klub s ID", clubIdToUpdate, "bol úspešne aktualizovaný/priradený.");
              }


             alert("Zmeny boli úspešne uložené.");

             closeModal(clubModal); // Zatvoriť modálne okno
             displayCreatedTeams(); // Znovu zobraziť zoznam tímov
              // Ak bol režim 'assign', znovu naplniť zoznam nepriradených tímov, lebo jeden už bol priradený
              if (currentClubModalMode === 'assign') {
                   // openClubModal(null, 'assign'); // Znovu otvorit modal v rezime assign
                   // Alebo jednoducho aktualizovat selectbox:
                   if(typeof populateUnassignedClubsSelect === 'function') {
                        populateUnassignedClubsSelect(); // Predpokladá existenciu funkcie
                   } else {
                        console.error("Funkcia populateUnassignedClubsSelect nie je dostupná.");
                   }
              }
               // Ak bol režim 'edit' a editovalo sa z modalu Správa tímov, aktualizovať aj ten modal
               // (Toto by vyžadovalo komplexnejšiu logiku sledovania pôvodu otvorenia modalu klubu)


         } else {
             console.error("Chýba ID tímu/klubu na aktualizáciu.");
             alert("Vyskytla sa chyba pri ukladaní zmien: chýba ID tímu/klubu.");
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


// --- Inicializácia ---

// Listener na udalost DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM plne načítaný pre zoznam tímov.");

    // Zobraziť vytvorené tímy pri načítaní stránky
    // Načítanie kategórií a skupín sa vykonáva už v displayCreatedTeams
    displayCreatedTeams();

    // ODSTRÁNENÉ - Logika tlačidla "+" je teraz riadená v spravca-turnaja-script.js
    /*
    const addButton = document.getElementById('addButton');
    // Konfigurácia tlačidla "+" pre túto sekciu
     if (addButton) {
          addButton.style.display = 'block'; // Zobraziť tlačidlo "+"
          addButton.title = "Vytvoriť tímy"; // Nastaviť popis tlačidla "+"
          // ODSTRÁNENÉ: Nastaviť listener na otvorenie správneho modálu
          // addButton.onclick = () => {
          //     openTeamCreationModal();
          // };
      } else {
         console.error("Add button not found on teams list page!");
     }
     */

});


// Funkcie openModal a closeModal by mali byť definované v common.js alebo spravca-turnaja-script.js a mali by byť dostupné globálne alebo importované.
// Funkcie populateCategorySelect (pre clubModal), populateGroupSelect, populateUnassignedClubsSelect by mali byť tiež definované inde a dostupné.
// openClubModal by malo byť tiež definované inde a dostupné.
// V tomto súbore som ponechal provizórne definície pre loadAllGroups, populateGroupSelect, populateUnassignedClubsSelect a openClubModal
// ak nie sú importované/dostupné globálne. Ideálne by mali byť na jednom mieste.


// Export funkcií, ak tento súbor funguje ako modul a iné súbory z neho importujú
export { openTeamCreationModal, displayCreatedTeams, openManageTeamsModal, closeManageTeamsModal, openClubModal };
// Exportujte aj ďalšie premenné, ak sú potrebné inde (napr. editingClubId, currentClubModalMode)
// export { editingClubId, currentClubModalMode };

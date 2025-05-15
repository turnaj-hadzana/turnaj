// spravca-turnaja-zoznam-timov.js

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


// --- Získajte referencie na elementy špecifické pre túto stránku ---
const addButton = document.getElementById('addButton'); // Tlačidlo "+"
const teamCreationContentSection = document.getElementById('teamCreationContentSection'); // Hlavná sekcia zoznamu tímov
const createdTeamsTableBody = document.getElementById('createdTeamsTableBody'); // Telo tabuľky vytvorených tímov
const createdTeamsTableHeader = document.getElementById('createdTeamsTableHeader'); // Hlavička tabuľky vytvorených tímov

const teamCreationModal = document.getElementById('teamCreationModal'); // Modálne okno Vytvoriť tímy
const teamCreationModalCloseBtn = teamCreationModal ? teamCreationModal.querySelector('.team-creation-modal-close') : null;
const teamCreationForm = document.getElementById('teamCreationForm'); // Formulár Vytvoriť tímy
const teamNameInput = document.getElementById('teamNameInput'); // Input pre základný názov tímu
const teamCategoryCountContainer = document.getElementById('teamCategoryCountContainer'); // Kontajner pre dynamické páry Kategória/Počet
const addCategoryCountPairButton = document.getElementById('addCategoryCountPairButton'); // Tlačidlo na pridanie ďalšieho páru

const manageTeamsModal = document.getElementById('manageTeamsModal'); // Modálne okno Správa tímov
const manageTeamsModalCloseBtn = manageTeamsModal ? manageTeamsModal.querySelector('.manage-teams-modal-close') : null;
const baseTeamNameInModalSpan = document.getElementById('baseTeamNameInModal'); // Titulok v modále Správa tímov
const teamsListInModalDiv = document.getElementById('teamsListInModal'); // Kontajner pre zoznam individuálnych tímov v modále Správa tímov

// Referencie na elementy v clubModal (ak je definovaný v tomto HTML a otvára sa odtiaľto)
// Ak je clubModal definovaný len v spravca-turnaja-timy-do-skupin.html, tieto referencie tu nebudú potrebné,
// ale funkcia openClubModal by mala byť dostupná (napr. v common.js)
const clubModal = document.getElementById('clubModal'); // Predpokladáme, že clubModal je v tomto HTML súbore
// const clubModalCloseBtn = clubModal ? clubModal.querySelector('.club-modal-close') : null; // Zatváranie clubModal riadi clubModal JS alebo common.js


// Variabilné stavy špecifické pre túto stránku (ak sú potrebné)
let allAvailableCategories = []; // Pre ukladanie zoznamu kategórií pre dynamické selecty vo vytváraní tímov


// --- Funkcie pre Zoznam tímov a modálne okná ---

// Funkcia na zobrazenie tabuľky vytvorených tímov
async function displayCreatedTeams() {
    if (!createdTeamsTableBody || !createdTeamsTableHeader) return; // Skontrolovať, či elementy existujú

    createdTeamsTableBody.innerHTML = ''; // Vyčistiť telo tabuľky
    createdTeamsTableHeader.innerHTML = ''; // Vyčistiť hlavičku tabuľky (kvôli dynamickým stĺpcom kategórií)

    try {
        // Najprv načítať všetky kategórie na vytvorenie dynamickej hlavičky
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        // Zoradiť kategórie abecedne pre konzistentné zobrazenie stĺpcov
        const categories = categoriesSnapshot.docs.map(doc => doc.id).sort((a, b) => a.localeCompare(b, 'sk-SK'));

        // Zostavenie hlavičky tabuľky
        const teamNameTh = document.createElement('th');
        teamNameTh.textContent = 'Základný názov tímu';
        createdTeamsTableHeader.appendChild(teamNameTh);

        // Pridať stĺpec pre každú kategóriu v hlavičke
        categories.forEach(categoryName => {
            const categoryTh = document.createElement('th');
            categoryTh.textContent = categoryName;
            categoryTh.style.textAlign = 'center'; // Centrovať obsah hlavičky kategórie
            createdTeamsTableHeader.appendChild(categoryTh);
        });

        // Stĺpec pre akcie v hlavičke
        const actionsTh = document.createElement('th');
        actionsTh.textContent = ''; // Hlavička stĺpca akcie je prázdna
        actionsTh.style.width = '200px'; // Nastavenie šírky stĺpca akcií na TH
        actionsTh.style.minWidth = '200px'; // Zabezpečiť minimálnu šírku na TH
        createdTeamsTableHeader.appendChild(actionsTh);

        // Načítať všetky kluby (tímy)
        const q = query(clubsCollectionRef);
        const querySnapshot = await getDocs(q);

        // Zoskupiť tímy podľa ich základného názvu
        const teamsByBaseName = {};
        querySnapshot.docs.forEach(doc => {
            const clubData = doc.data();
            const fullTeamName = clubData.name || 'Neznámy názov';

            // Pokus o nájdenie základného názvu tímu (odstránenie suffixu skupiny ako " A", " B")
            // Predpoklad: ak názov končí medzerou a jedným veľkým písmenom, je to suffix skupiny
             const nameSuffixMatch = fullTeamName.match(/^(.*)\s[A-Z]$/);
            const baseTeamName = nameSuffixMatch ? nameSuffixMatch[1] : fullTeamName; // Odobrať pismeno skupiny ak existuje

            const categoryId = clubData.categoryId || 'Nepriradená'; // Ak tím nemá priradenú kategóriu, zoskupiť ho pod 'Nepriradená'

            if (!teamsByBaseName[baseTeamName]) {
                teamsByBaseName[baseTeamName] = {
                    categories: {}, // Objekt na ukladanie počtu tímov pre každú kategóriu
                    originalTeams: [] // Pole na ukladanie referencií na pôvodné dokumenty tímov
                };
            }

            if (!teamsByBaseName[baseTeamName].categories[categoryId]) {
                 teamsByBaseName[baseTeamName].categories[categoryId] = 0;
            }
            teamsByBaseName[baseTeamName].categories[categoryId]++; // Zvýšiť počet tímov pre danú kategóriu a základný názov
            teamsByBaseName[baseTeamName].originalTeams.push({ id: doc.id, data: clubData }); // Pridať referenciu na pôvodný tím
        });

        // Zoradiť základné názvy tímov abecedne
        const sortedBaseNames = Object.keys(teamsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));

        // Vypísať riadky tabuľky pre každý základný názov tímu
        if (sortedBaseNames.length === 0) {
            // Ak nie sú žiadne tímy, zobraziť správu
            const noDataRow = document.createElement('tr');
            const td = document.createElement('td');
            // Spojiť stĺpce: Názov + Počet kategórií + Akcie
            td.colSpan = 1 + categories.length + 1;
            td.textContent = "Žiadne tímy zatiaľ pridané.";
            td.style.textAlign = 'center';
            noDataRow.appendChild(td);
            createdTeamsTableBody.appendChild(noDataRow);
        } else {
            // Pre každý základný názov tímu vytvoriť riadok v tabuľke
            sortedBaseNames.forEach(baseTeamName => {
                const teamSummary = teamsByBaseName[baseTeamName];
                const tr = document.createElement('tr');

                // Stĺpec: Základný názov tímu
                const nameTd = document.createElement('td');
                nameTd.textContent = baseTeamName;
                tr.appendChild(nameTd);

                // Stĺpce: Počet tímov v jednotlivých kategóriách
                categories.forEach(categoryName => {
                    const countTd = document.createElement('td');
                    const count = teamSummary.categories[categoryName] || 0; // Počet tímov pre danú kategóriu (alebo 0, ak žiadne)
                    countTd.textContent = count > 0 ? count : '-'; // Zobraziť počet alebo '-' ak je 0
                    countTd.style.textAlign = 'center'; // Centrovať počet
                    tr.appendChild(countTd);
                });

                // Stĺpec: Akcie
                const actionsTd = document.createElement('td');
                actionsTd.style.whiteSpace = 'nowrap'; // Zabrániť zalomeniu tlačidiel
                 // Použiť Flexbox na zoradenie tlačidiel v TD
                 actionsTd.style.display = 'flex';
                 actionsTd.style.alignItems = 'center';
                 actionsTd.style.justifyContent = 'center';
                 actionsTd.style.gap = '5px'; // Medzera medzi tlačidlami


                // Tlačidlo "Spravovať tímy" (otvorí detail pre tento základný názov)
                const manageTeamsButton = document.createElement('button');
                manageTeamsButton.textContent = 'Spravovať tímy';
                manageTeamsButton.classList.add('action-button'); // Použiť štýly akčných tlačidiel
                manageTeamsButton.onclick = () => {
                    // Otvoriť modálne okno na správu individuálnych tímov
                    openManageTeamsModal(baseTeamName, teamSummary.originalTeams);
                };
                actionsTd.appendChild(manageTeamsButton);

                // Tlačidlo "Vymazať všetko" (vymaže VŠETKY individuálne tímy s týmto základným názvom)
                const deleteAllButton = document.createElement('button');
                deleteAllButton.textContent = 'Vymazať všetko';
                deleteAllButton.classList.add('action-button', 'delete-button'); // Použiť štýly akčných tlačidiel
                deleteAllButton.onclick = async () => {
                    // Potvrdenie pred vymazaním
                     if (!confirm(`Naozaj chcete vymazať VŠETKY tímy s názvom "${baseTeamName}" (${teamSummary.originalTeams.length} ks)? Táto akcia vymaže všetky individuálne tímy priradené k tomuto základnému názvu.`)) {
                         return; // Ak používateľ zruší, nič nerobiť
                     }

                    try {
                        const batch = writeBatch(db); // Použiť batch pre hromadné mazanie
                        // Pridať operácie mazania pre každý individuálny tím do batchu
                        teamSummary.originalTeams.forEach(team => {
                            batch.delete(doc(clubsCollectionRef, team.id));
                        });
                        await batch.commit(); // Vykonanie mazania

                        // Po úspešnom mazaní obnoviť zobrazenia
                        displayCreatedTeams(); // Obnoviť zoznam tímov


                         // Ak je otvorené modálne okno na vytváranie tímov, obnoviť zoznam kategórií
                         if (teamCreationModal && teamCreationModal.style.display === 'block') {
                              loadAllCategoriesForDynamicSelects();
                         }

                          // Ak je otvorené modálne okno klubu a upravoval/mazal sa tím s týmto názvom, zatvoriť ho (ak je zrejmé, že sa týkalo jedného z vymazaných)
                           // Predpokladáme, že editingClubId je definované v common.js alebo globálne
                           // eslint-disable-next-line no-undef
                           if (clubModal && clubModal.style.display === 'block' && typeof editingClubId !== 'undefined' && teamSummary.originalTeams.some(t => t.id === editingClubId)) {
                               // eslint-disable-next-line no-undef
                               closeModal(clubModal);
                           }
                            // Ak je otvorené modálne okno pre priradenie a mazali sa nepriradené tímy, obnoviť selectbox
                            // eslint-disable-next-line no-undef
                            if (clubModal && clubModal.style.display === 'block' && typeof currentClubModalMode !== 'undefined' && currentClubModalMode === 'add-assign') {
                                 // Ak je unassignedClubSelect definovaný v common.js alebo globálne
                                 // eslint-disable-next-line no-undef
                                 if (typeof unassignedClubSelect !== 'undefined') { // Nemôžeme porovnať unassignedClubSelect.value, ak ho nemáme načítaný
                                     // Najjednoduchsie je zavolat plnu obnovu, ak je openClubModal v stave priradenia
                                      // eslint-disable-next-line no-undef
                                     populateUnassignedClubsSelect(document.getElementById('unassignedClubSelect'), null); // Predpokladáme, že populateUnassignedClubsSelect a unassignedClubSelect element sú k dispozícii
                                 }
                            }


                         // Ak je otvorené modálne okno správy tímov pre tento základný názov, zatvoriť ho
                         if (manageTeamsModal && manageTeamsModal.style.display === 'block' && baseTeamNameInModalSpan && baseTeamNameInModalSpan.textContent === `Tímy: ${baseTeamName}`) {
                              closeManageTeamsModal();
                         }


                    } catch (error) {
                        console.error(`Chyba pri mazaní tímov s názvom "${baseTeamName}": `, error);
                        alert('Chyba pri mazaní tímov! Prosím, skúste znova.');
                    }
                };
                actionsTd.appendChild(deleteAllButton);

                tr.appendChild(actionsTd);
                createdTeamsTableBody.appendChild(tr);
            });
        }

    } catch (error) {
        console.error('Chyba pri načítaní alebo zobrazovaní vytvorených tímov: ', error);
        const errorMessage = document.createElement('tr');
        const td = document.createElement('td');
        // Colspan musí zodpovedať počtu stĺpcov (Základný názov + Kategórie + Akcie)
        // Získame aktuálny počet stĺpcov z hlavičky, aby to bolo robustnejšie
         const colSpan = createdTeamsTableHeader ? createdTeamsTableHeader.querySelectorAll('th').length : 4; // Default 4 ak hlavička neexistuje
        td.colSpan = colSpan;
        td.textContent = 'Chyba pri načítaní dát tímov.';
        td.style.textAlign = 'center';
        errorMessage.appendChild(td);
        createdTeamsTableBody.appendChild(errorMessage);
    }
}

// Funkcia na načítanie všetkých kategórií pre dynamické selectboxy vo vytváraní tímov
async function loadAllCategoriesForDynamicSelects() {
    try {
        const querySnapshot = await getDocs(categoriesCollectionRef);
        // Zoradiť kategórie abecedne
        allAvailableCategories = querySnapshot.docs.map(doc => doc.id).sort((a, b) => a.localeCompare(b, 'sk-SK'));

        // Ak je modálne okno vytvárania tímov otvorené, aktualizovať dynamické selecty
        if (teamCreationModal && teamCreationModal.style.display === 'block') {
             updateDynamicCategorySelects();
             checkIfAddCategoryCountPairButtonShouldBeVisible();
        }

    } catch (error) {
        console.error('Chyba pri načítaní kategórií pre dynamické selecty: ', error);
        allAvailableCategories = []; // V prípade chyby nastaviť na prázdne pole
         checkIfAddCategoryCountPairButtonShouldBeVisible(); // Aktualizovať viditeľnosť tlačidla Pridať
    }
}

// Pomocná funkcia na naplnenie jedného dynamického selectu kategórií
function populateDynamicCategorySelect(selectElement, currentSelectedId, allCategories, categoriesToExclude) {
     if (!selectElement) return;

     selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Pociatocna moznost
     // Zablokovať select, ak nie sú žiadne dostupné (nevybrané) kategórie okrem tej aktuálnej
     const availableOptionsCount = allCategories.filter(cat => !categoriesToExclude.includes(cat) || cat === currentSelectedId).length;
     selectElement.disabled = availableOptionsCount <= 1 && !currentSelectedId; // Zablokovat, ak je len jedna alebo ziadna moznost (okrem aktualne vybranej)


     // Pridať aktuálne vybranú možnosť (ak existuje a je v platných kategóriach)
     if (currentSelectedId && allCategories.includes(currentSelectedId)) {
          const currentOption = document.createElement('option');
          currentOption.value = currentSelectedId;
          currentOption.textContent = currentSelectedId;
          currentOption.selected = true; // Nastavit ako vybrane
          selectElement.appendChild(currentOption);
     }

     // Pridať ostatné dostupné kategorie, ktoré nie sú vylúčené a nie sú aktuálne vybrané
     allAvailableCategories.forEach(categoryName => {
         if (categoryName !== currentSelectedId && !categoriesToExclude.includes(categoryName)) {
             const option = document.createElement('option');
             option.value = categoryName;
             option.textContent = categoryName;
             selectElement.appendChild(option);
         }
     });

      // Ak po naplneni stale nie je vybrana ziadna hodnota, nastavit na prazdny placeholder
      if (!selectElement.value && selectElement.options.length > 0) {
          selectElement.value = "";
      } else if (selectElement.options.length === 1 && selectElement.options[0].value === "") {
           selectElement.disabled = true; // Zablokovat, ak zostal len prazdny placeholder
      }

}

// Aktualizuje možnosti v dynamických selectboxoch kategórií po zmene vyberu
function updateDynamicCategorySelects() {
     if (!teamCategoryCountContainer) return; // Skontrolovať, či element existuje
     const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');

     // Zoznam aktualne vybranych kategorii vo VSETKYCH dynamickych selectoch
     const currentSelections = Array.from(allSelectElements)
         .map(select => select.value)
         .filter(value => value !== ''); // Ignorovat prazdne hodnoty

     // Pre kazdy dynamic selectbox
     allSelectElements.forEach(selectElement => {
         const currentSelectedIdInThisSelect = selectElement.value;
         // Vylucit tie kategorie, ktore su vybrane v INYCH selectboxoch
         const categoriesToExcludeForThisSelect = currentSelections.filter(cat => cat !== currentSelectedIdInThisSelect);

         // Znovu naplnit selectbox s aktualnym vyberom a vylucenymi kategoriami
         populateDynamicCategorySelect(
             selectElement,
             currentSelectedIdInThisSelect,
             allAvailableCategories,
             categoriesToExcludeForThisSelect
         );
     });

     // Skontrolovat, ci je mozne pridat dalsi par kategoria/pocet
     checkIfAddCategoryCountPairButtonShouldBeVisible();
     // Aktualizovat viditelnost tlacidiel Odstranit
     updateRemoveButtonVisibility();
}

// Aktualizuje viditeľnosť tlačidiel "Odstrániť" pre dynamické páry kategória/počet
function updateRemoveButtonVisibility() {
      if (!teamCategoryCountContainer) return; // Skontrolovať, či element existuje
      const allRemoveButtons = teamCategoryCountContainer.querySelectorAll('.category-count-pair .delete-button');
      // Tlačidlo "Odstrániť" zobraziť len ak je viac ako 1 pár kategória/počet
      if (allRemoveButtons.length > 0) {
           allRemoveButtons.forEach((button, index) => {
                if (allRemoveButtons.length <= 1) {
                     button.style.display = 'none';
                } else {
                     button.style.display = 'inline-block';
                }
           });
      }
}

// Skontroluje, či má byť viditeľné tlačidlo "Pridať ďalšiu kategóriu"
function checkIfAddCategoryCountPairButtonShouldBeVisible() {
      if (!teamCategoryCountContainer || !addCategoryCountPairButton) return; // Skontrolovať, či elementy existujú
      const allSelectElements = teamCategoryCountContainer.querySelectorAll('.team-category-select-dynamic');
      const currentSelections = Array.from(allSelectElements)
          .map(select => select.value)
          .filter(value => value !== ''); // Ignorovať prázdne hodnoty

      // Tlačidlo "Pridať ďalšiu kategóriu" zobraziť len ak existujú kategórie a ešte neboli všetky vybrané
      if (allAvailableCategories.length > 0 && currentSelections.length < allAvailableCategories.length) {
           addCategoryCountPairButton.style.display = 'inline-block';
      } else {
           addCategoryCountPairButton.style.display = 'none';
      }
}

// Pridá nový riadok pre výber kategórie a zadanie počtu tímov v modále Vytvoriť tímy
async function addCategoryCountPair(initialCategory = null) {
     const container = document.getElementById('teamCategoryCountContainer');
     if (!container) { console.error('teamCategoryCountContainer not found!'); return; }

     const pairDiv = document.createElement('div');
     pairDiv.classList.add('category-count-pair'); // Trieda pre štýlovanie Flexboxom (ako máme v CSS)

     // Kontajner pre Label a Select - pre Flexbox zarovnanie v rámci páru
     const selectContainer = document.createElement('div');
     selectContainer.style.display = 'flex';
     selectContainer.style.alignItems = 'center';
     selectContainer.style.gap = '10px'; // Medzera medzi labelom a selectom
     selectContainer.style.flexWrap = 'wrap'; // Umožniť zalomenie na mobiloch
      selectContainer.style.flex = '1 1 auto'; // Umožniť kontajneru zväčšiť sa/zmenšiť


     const categorySelectLabel = document.createElement('label');
     categorySelectLabel.textContent = 'Kategória:';
     categorySelectLabel.style.flexShrink = '0'; // Zabrániť zmenšovaniu labelu

     const categorySelect = document.createElement('select');
     categorySelect.classList.add('team-category-select-dynamic'); // Identifikačná trieda pre JS
     categorySelect.name = 'category';
     categorySelect.required = true;
     categorySelect.style.flexGrow = '1'; // Nechať select zväčšiť sa
     categorySelect.style.minWidth = '150px'; // Minimálna šírka pre select
     categorySelect.style.padding = '5px'; // Menšie polstrovanie ako v hlavnom formulári, zladené s inputom počtu


     // Listener pre aktualizáciu ostatných selectboxov a tlačidiel po zmene vyberu
     categorySelect.addEventListener('change', () => {
         updateDynamicCategorySelects(); // Aktualizuje ostatné selecty (vylúči vybranú kategóriu)
     });

     selectContainer.appendChild(categorySelectLabel);
     selectContainer.appendChild(categorySelect);

     // Kontajner pre Label a Input - pre Flexbox zarovnanie v rámci páru
     const inputContainer = document.createElement('div');
     inputContainer.style.display = 'flex';
     inputContainer.style.alignItems = 'center';
     inputContainer.style.gap = '10px'; // Medzera medzi labelom a inputom
     inputContainer.style.flexWrap = 'wrap'; // Umožniť zalomenie na mobiloch
      inputContainer.style.flex = '1 1 auto'; // Umožniť kontajneru zväčšiť sa/zmenšiť


     const teamCountLabel = document.createElement('label');
     teamCountLabel.textContent = 'Počet tímov:';
     teamCountLabel.style.flexShrink = '0'; // Zabrániť zmenšovaniu labelu


     const teamCountInput = document.createElement('input');
     teamCountInput.classList.add('team-count-input-dynamic'); // Identifikačná trieda pre JS
     teamCountInput.type = 'number';
     teamCountInput.name = 'count';
     teamCountInput.min = '1';
     teamCountInput.value = '1';
     teamCountInput.required = true;
     teamCountInput.style.maxWidth = '80px'; // Obmedziť maximálnu šírku inputu
     teamCountInput.style.flexGrow = '0'; // Input sa nezväčší neúmerne
     teamCountInput.style.padding = '5px'; // Zladené s polstrovaním selectboxu

     inputContainer.appendChild(teamCountLabel);
     inputContainer.appendChild(teamCountInput);

     const removeButton = document.createElement('button');
     removeButton.textContent = 'Odstrániť';
     removeButton.classList.add('action-button', 'delete-button'); // Použiť štýly tlačidiel
     removeButton.type = 'button'; // Aby nespustilo submit formulára
     removeButton.style.marginLeft = '10px'; // Medzera medzi inputom/kontajnerom a tlačidlom Odstrániť
     removeButton.style.flexShrink = '0'; // Zabrániť zmenšovaniu tlačidla
     removeButton.style.alignSelf = 'center'; // Vertikálne centrovať s ostatnými prvkami v páre

     // Listener pre odstranenie tohto paru
     removeButton.onclick = () => {
         pairDiv.remove(); // Odstrani cely div s parom
         updateDynamicCategorySelects(); // Aktualizuje ostatné selectboxy
         updateRemoveButtonVisibility(); // Aktualizuje viditeľnosť tlačidiel Odstrániť
         checkIfAddCategoryCountPairButtonShouldBeVisible(); // Aktualizuje viditeľnosť tlačidla Pridať ďalšiu
     };

     // Pridať kontajnery selectu a inputu a tlačidlo odstrániť do divu páru
     pairDiv.appendChild(selectContainer);
     pairDiv.appendChild(inputContainer);
     pairDiv.appendChild(removeButton);

     container.appendChild(pairDiv); // Pridať celý pár div do kontajnera

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

       // Zamerať na novopridaný selectbox pre lepšiu použiteľnosť
       setTimeout(() => {
            categorySelect.focus();
       }, 0);
}


// Funkcia na otvorenie modálneho okna Vytvoriť tímy
async function openTeamCreationModal() {
     if (!teamCreationModal) { console.error("teamCreationModal element not found!"); return; }
     openModal(teamCreationModal);

     const teamCreationModalTitle = teamCreationModal.querySelector('#teamCreationModalTitle'); // Referencia získaná pri otvorení
     if (!teamCreationModalTitle) { console.error('FATAL ERROR: teamCreationModalTitle is null!'); return; }
     teamCreationModalTitle.textContent = 'Vytvoriť tímy';

     if (!teamCreationForm) { console.error('FATAL ERROR: teamCreationForm is null!'); return; }
     teamCreationForm.reset(); // Vyčistiť formulár

     if (!teamCategoryCountContainer) { console.error('FATAL ERROR: teamCategoryCountContainer je null!'); return; }
     teamCategoryCountContainer.innerHTML = ''; // Vymazať predchádzajúce dynamické páry

     // Načítať kategórie, ak ešte nie sú načítané
     if (allAvailableCategories.length === 0) {
          await loadAllCategoriesForDynamicSelects();
     } else {
          // Ak už sú načítané, stačí aktualizovať zobrazenie dynamických selectov
          updateDynamicCategorySelects();
          updateRemoveButtonVisibility(); // Aktualizovať viditeľnosť tlačidiel Odstrániť
          checkIfAddCategoryCountPairButtonShouldBeVisible(); // Aktualizovať viditeľnosť tlačidla Pridať
      }

     // Pridať prvý pár kategória/počet automaticky
     await addCategoryCountPair();

     // Nastaviť fokus na prvé vstupné pole (základný názov tímu)
     if (!teamNameInput) { console.error('FATAL ERROR: teamNameInput je null!'); return; }
     teamNameInput.focus();
}

// Funkcia na zatvorenie modálneho okna Správa tímov
function closeManageTeamsModal() {
    if (!manageTeamsModal) { console.error("manageTeamsModal is null v closeManageTeamsModal."); return; }
    manageTeamsModal.style.display = 'none';
     if (teamsListInModalDiv) teamsListInModalDiv.innerHTML = ''; // Vyčistiť zoznam tímov v modále
     if (baseTeamNameInModalSpan) baseTeamNameInModalSpan.textContent = ''; // Vyčistiť titulok
     closeModal(manageTeamsModal); // Použiť všeobecnú funkciu na správne počítanie otvorených modálov
}

// Funkcia na otvorenie modálneho okna Správa tímov pre konkrétny základný názov
async function openManageTeamsModal(baseTeamName, individualTeams) {
     if (!manageTeamsModal || !baseTeamNameInModalSpan || !teamsListInModalDiv) {
         console.error("Missing manage teams modal elements!");
         return;
     }

     openModal(manageTeamsModal); // Otvoriť modálne okno

     baseTeamNameInModalSpan.textContent = `Tímy: ${baseTeamName}`; // Nastaviť titulok modálu
     teamsListInModalDiv.innerHTML = ''; // Vyčistiť predchádzajúci obsah

     // Ak nie sú žiadne individuálne tímy pre tento základný názov, zobraziť správu
     if (!individualTeams || individualTeams.length === 0) {
         teamsListInModalDiv.innerHTML = '<p>Žiadne individuálne tímy nájdené pre tento základný názov.</p>';
         return;
     }

     // Zoskupiť individuálne tímy podľa ich kategórie (priradenej alebo 'Nepriradená')
     const teamsByCategory = {};
     individualTeams.forEach(team => {
         const category = team.data.categoryId || 'Nepriradená';
         if (!teamsByCategory[category]) {
             teamsByCategory[category] = [];
         }
         teamsByCategory[category].push(team);
     });

     // Zoradiť kategórie abecedne pre konzistentné zobrazenie
     const sortedCategories = Object.keys(teamsByCategory).sort();

     // Vypísať tabuľku pre každú kategóriu v modálnom okne
     sortedCategories.forEach(categoryName => {
         const teamsInThisCategory = teamsByCategory[categoryName];

         // Hlavička kategórie v modále (ako h3)
         const categoryHeading = document.createElement('h3');
         categoryHeading.textContent = `${categoryName}`;
         teamsListInModalDiv.appendChild(categoryHeading);

         // Tabuľka pre tímy v danej kategórii
         const categoryTeamsTable = document.createElement('table');
         categoryTeamsTable.classList.add('group-clubs-table'); // Použiť rovnaké štýly tabuľky ako pre kluby v skupinách
          categoryTeamsTable.style.tableLayout = 'fixed'; // Zabezpečiť pevnú šírku stĺpcov aj tu
          categoryTeamsTable.style.width = '100%';


         // Hlavička tabuľky v modále
         const thead = document.createElement('thead');
         const headerRow = document.createElement('tr');

         const teamNameTh = document.createElement('th');
         teamNameTh.textContent = 'Názov tímu';
          teamNameTh.style.width = 'auto'; // Nechať názov tímu zabrať dostupný priestor

         const groupTh = document.createElement('th');
         groupTh.textContent = 'Skupina';
          groupTh.style.width = '100px'; // Pevná šírka pre stĺpec Skupina
          groupTh.style.minWidth = '100px';
          groupTh.style.whiteSpace = 'nowrap';


         const orderTh = document.createElement('th');
         orderTh.textContent = 'Poradie';
         orderTh.style.textAlign = 'center';
         orderTh.style.width = '60px'; // Menšia šírka pre poradie
          orderTh.style.minWidth = '60px';
          orderTh.style.whiteSpace = 'nowrap';


         const actionsTh = document.createElement('th');
         actionsTh.textContent = ''; // Hlavička stĺpca akcie je prázdna
         actionsTh.style.width = '150px'; // Šírka pre akcie
          actionsTh.style.minWidth = '150px';
          actionsTh.style.whiteSpace = 'nowrap';


         headerRow.appendChild(teamNameTh);
         headerRow.appendChild(groupTh);
         headerRow.appendChild(orderTh);
         headerRow.appendChild(actionsTh);
         thead.appendChild(headerRow);
         categoryTeamsTable.appendChild(thead);

         const tbody = document.createElement('tbody');

          // Zoradiť tímy v rámci kategórie - najprv nepriradené, potom priradené (podľa skupiny a poradia), potom podľa mena
          teamsInThisCategory.sort((a, b) => {
              const isAssignedA = a.data.groupId !== null;
              const isAssignedB = b.data.groupId !== null;

              // Nepriradené tímy idú prvé
              if (isAssignedA !== isAssignedB) {
                   return isAssignedA ? 1 : -1; // Nepriradené (false) < Priradené (true)
              }

              // Ak sú oba priradené alebo oba nepriradené, zoradiť podľa skupiny a poradia
              if (isAssignedA) { // Obidva sú priradené
                   const groupA = a.data.groupId || '';
                   const groupB = b.data.groupId || '';
                   const orderA = typeof a.data.orderInGroup === 'number' ? a.data.orderInGroup : Infinity; // Infinity pre null/undefined poradie
                   const orderB = typeof b.data.orderInGroup === 'number' ? b.data.orderInGroup : Infinity;

                   // Zoradiť podľa skupiny
                   if (groupA !== groupB) {
                       return groupA.localeCompare(groupB, 'sk-SK');
                   }
                   // Ak je rovnaká skupina, zoradiť podľa poradia
                   if (orderA !== orderB) {
                        return orderA - orderB;
                   }
              }

               // Ak sú v rovnakej skupine s rovnakým poradím (alebo oba nepriradené), zoradiť podľa mena
               const nameA = a.data.name || '';
               const nameB = b.data.name || '';
               return nameA.localeCompare(nameB, 'sk-SK');

          });


         // Vypísať riadky pre jednotlivé tímy v kategórii
         teamsInThisCategory.forEach(team => {
             const tr = document.createElement('tr');
              tr.dataset.clubId = team.id; // Pridať data atribút pre jednoduchšie vyhľadávanie

             const nameTd = document.createElement('td');
             nameTd.textContent = team.data.name || 'Neznámy názov'; // Názov individuálneho tímu

             const groupTd = document.createElement('td');
              const groupNameParts = (team.data.groupId || '').split(' - '); // Rozdeliť ID skupiny na NázovKategórie - NázovSkupiny
             groupTd.textContent = team.data.groupId ? (groupNameParts.length > 1 ? groupNameParts.slice(1).join(' - ') : team.data.groupId) : 'Nepriradené'; // Zobraziť názov skupiny alebo 'Nepriradené'
              groupTd.style.overflow = 'hidden';
              groupTd.style.textOverflow = 'ellipsis';
              groupTd.style.whiteSpace = 'nowrap';


             const orderTd = document.createElement('td');
             orderTd.textContent = team.data.groupId !== null && typeof team.data.orderInGroup === 'number' ? team.data.orderInGroup : '-'; // Zobraziť poradie alebo '-' ak nie je priradený
             orderTd.style.textAlign = 'center'; // Centrovať poradie

             const actionsTd = document.createElement('td');
             actionsTd.style.whiteSpace = 'nowrap'; // Zabrániť zalomeniu tlačidiel
             actionsTd.style.display = 'flex'; // Použiť flexbox na zoradenie tlačidiel
             actionsTd.style.alignItems = 'center'; // Vertikálne centrovať tlačidlá
             actionsTd.style.justifyContent = 'center'; // Horizontálne centrovať skupinu tlačidiel
             actionsTd.style.gap = '5px'; // Medzera medzi tlačidlami


             // Tlačidlo "Upraviť" (pre úpravu tohto individuálneho tímu)
             const editIndividualTeamButton = document.createElement('button');
             editIndividualTeamButton.textContent = 'Upraviť';
             editIndividualTeamButton.classList.add('action-button'); // Použiť štýly tlačidiel
             editIndividualTeamButton.onclick = () => {
                 closeManageTeamsModal(); // Zatvoriť modálne okno Správa tímov
                 // openClubModal by mala byť definovaná v common.js alebo dostupná globálne
                 // a spracovať ID klubu a jeho dáta pre režim úpravy.
                 // eslint-disable-next-line no-undef
                 if (typeof openClubModal === 'function') {
                     // eslint-disable-next-line no-undef
                     openClubModal(team.id, team.data); // Otvoriť modálne okno Klubu (pre úpravu) s dátami tohto tímu
                 } else {
                     console.error("openClubModal function is not available.");
                     alert("Funkcia na úpravu tímu nie je k dispozícii.");
                 }
             };
             actionsTd.appendChild(editIndividualTeamButton);

             // Tlačidlo "Vymazať" (pre vymazanie tohto individuálneho tímu)
             const deleteIndividualTeamButton = document.createElement('button');
             deleteIndividualTeamButton.textContent = 'Vymazať';
             deleteIndividualTeamButton.classList.add('action-button', 'delete-button'); // Použiť štýly tlačidiel (červené)
             deleteIndividualTeamButton.onclick = async () => {
                  // Potvrdenie pred vymazaním
                  if (!confirm(`Naozaj chcete vymazať tím "${team.data.name}" z kategórie "${categoryName}"? Táto akcia vymaže tím úplne z databázy.`)) {
                      return; // Ak používateľ zruší, nič nerobiť
                  }

                 try {
                      await deleteDoc(doc(clubsCollectionRef, team.id)); // Vymazanie dokumentu tímu z Firestore

                     // Po úspešnom vymazaní obnoviť zobrazenia
                     // Namiesto zatvárania a otvárania Správa tímov modálu, skúsime len aktualizovať zoznam v ňom, ak je otvorený
                      if (manageTeamsModal && manageTeamsModal.style.display === 'block' && baseTeamNameInModalSpan && baseTeamNameInModalSpan.textContent === `Tímy: ${baseTeamName}`) {
                          // Ak je modál Správa tímov stále otvorený pre tento baseName, znovu ho naplniť aktuálnymi tímami
                           // Musíme získať aktuálny zoznam tímov pre tento baseName ZNOVU, pretože jeden bol vymazaný
                           // Rýchlejšie je asi len znovu zavolať openManageTeamsModal s aktualizovanými dátami
                           // Na to potrebujeme znova načítať tímy pre tento baseName.
                           // Jednoduchšie je len zatvoriť modál Správa tímov a obnoviť hlavný zoznam.
                           closeManageTeamsModal();
                      }
                      displayCreatedTeams(); // Obnoviť tabuľku vytvorených tímov

                       // Ak je otvorené modálne okno vytvárania tímov, obnoviť zoznam kategórií (ak bol vymazaný tím priradený ku kategórii)
                       if (teamCreationModal && teamCreationModal.style.display === 'block') {
                            loadAllCategoriesForDynamicSelects();
                       }
                        // Ak je otvorené modálne okno klubu a upravoval/mazal sa tento tím, zatvoriť ho
                        // Predpokladáme, že editingClubId je definované v common.js alebo globálne
                        // eslint-disable-next-line no-undef
                        if (clubModal && clubModal.style.display === 'block' && typeof editingClubId !== 'undefined' && editingClubId === team.id) {
                           // eslint-disable-next-line no-undef
                           closeModal(clubModal);
                       }
                         // Ak je otvorené modálne okno pre priradenie a mazal sa nepriradený tím, obnoviť selectbox
                         // Predpokladáme, že currentClubModalMode a unassignedClubSelect a populateUnassignedClubsSelect sú dostupné
                         // eslint-disable-next-line no-undef
                         if (clubModal && clubModal.style.display === 'block' && typeof currentClubModalMode !== 'undefined' && currentClubModalMode === 'add-assign') {
                              // eslint-disable-next-line no-undef
                              const unassignedSelectEl = document.getElementById('unassignedClubSelect');
                              // eslint-disable-next-line no-undef
                             if (unassignedSelectEl && typeof populateUnassignedClubsSelect === 'function') { // Skontrolovať, či existujú elementy a funkcia
                                 // eslint-disable-next-line no-undef
                                 populateUnassignedClubsSelect(unassignedSelectEl, null);
                              }
                         }


                 } catch (error) {
                     console.error(`Chyba pri mazaní individuálneho tímu "${team.data.name}" (ID: ${team.id}): `, error);
                     alert('Chyba pri mazaní tímu! Prosím, skúste znova.');
                 }
             };
             actionsTd.appendChild(deleteIndividualTeamButton);

             tr.appendChild(nameTd); // Pridať bunku s názvom
             tr.appendChild(groupTd); // Pridať bunku so skupinou
             tr.appendChild(orderTd); // Pridať bunku s poradím
             tr.appendChild(actionsTd); // Pridať bunku s tlačidlami akcií

             tbody.appendChild(tr); // Pridať riadok do tela tabuľky
         });

         categoryTeamsTable.appendChild(tbody); // Pridať telo tabuľky do tabuľky
         teamsListInModalDiv.appendChild(categoryTeamsTable); // Pridať tabuľku do kontajnera v modále
     });
}


// --- Event Listeners ---

// Načítať vytvorené tímy a kategórie pre dynamické selecty po načítaní stránky (DOM)
document.addEventListener('DOMContentLoaded', () => {
    // Skryť ostatné sekcie a zobraziť len sekciu Zoznam tímov (pre multi-page architektúru)
     const otherSections = document.querySelectorAll('main > section, main > div');
     otherSections.forEach(section => {
         // Zobraziť len túto sekciu, ak existuje
         if (teamCreationContentSection && section.id !== teamCreationContentSection.id) {
             section.style.display = 'none';
         } else if (teamCreationContentSection && section.id === teamCreationContentSection.id) {
              section.style.display = 'block'; // Zobraziť túto sekciu
         } else {
              // Ak teamCreationContentSection nebol nájdený (chyba v HTML), zobraziť aspoň niečo alebo zalogovať chybu
               console.error("Section #teamCreationContentSection not found!");
                // Môžete tu pridať aj správu na stránku, ak sekcia nebola nájdená
         }
     });


    displayCreatedTeams(); // Zobraziť tabuľku vytvorených tímov pri načítaní stránky
    loadAllCategoriesForDynamicSelects(); // Načítať kategórie pre dynamické selecty v modále Vytvoriť tímy

    // Konfigurácia tlačidla "+" pre túto sekciu
     if (addButton) {
          addButton.style.display = 'block'; // Zobraziť tlačidlo "+"
          addButton.title = "Vytvoriť tímy"; // Nastaviť popis tlačidla "+"
          // Nastaviť listener na otvorenie správneho modálu
          addButton.onclick = () => {
              openTeamCreationModal();
          };
      } else {
         console.error("Add button not found on teams list page!");
     }
});


// Listener pre zatvorenie modálneho okna "Vytvoriť tímy" tlačidlom "x"
if (teamCreationModalCloseBtn) {
    teamCreationModalCloseBtn.addEventListener('click', () => {
        if (teamCreationModal) closeModal(teamCreationModal);
        // Resetovať formulár a dynamické polia pri zatvorení
        if (teamCreationForm) teamCreationForm.reset();
         if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
          if (addCategoryCountPairButton) checkIfAddCategoryCountPairButtonShouldBeVisible(); // Zabezpečiť zobrazenie/skrytie tlačidla
    });
}

// Listener pre zatvorenie modálneho okna "Správa tímov" tlačidlom "x"
if (manageTeamsModalCloseBtn) {
    manageTeamsModalCloseBtn.addEventListener('click', closeManageTeamsModal);
}


// Listener pre zatvorenie modálnych okien kliknutím mimo modálneho obsahu
window.addEventListener('click', (e) => {
    if (teamCreationModal && e.target === teamCreationModal) {
        closeModal(teamCreationModal);
        // Resetovať formulár a dynamické polia pri zatvorení
        if (teamCreationForm) teamCreationForm.reset();
         if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = '';
          if (addCategoryCountPairButton) checkIfAddCategoryCountPairButtonShouldBeVisible(); // Zabezpečiť zobrazenie/skrytie tlačidla
    }
    if (manageTeamsModal && e.target === manageTeamsModal) {
         closeManageTeamsModal();
    }
    // Listener pre clubModal, ak je na tejto stránke a riadi sa týmto JS súborom
     if (clubModal && e.target === clubModal) {
         // eslint-disable-next-line no-undef
         if (typeof closeClubModal === 'function') { // Ak existuje špecifická funkcia zatvárania pre clubModal (mala by byť v common.js)
              // eslint-disable-next-line no-undef
              closeClubModal(); // Zavolajte funkciu na zatvorenie clubModal
         } else {
             // Použiť všeobecnú funkciu, ak špecifická neexistuje
              closeModal(clubModal);
         }
          // Ak sa clubModal zatvori, obnovit zoznam vytvorenych timov, ak bol v stave upravy/priradenia
          // eslint-disable-next-line no-undef
          if (typeof currentClubModalMode !== 'undefined' && (currentClubModalMode === 'edit' || currentClubModalMode === 'add-assign')) {
               displayCreatedTeams(); // Obnovit zoznam timov ak sme nieco ukladali/menili
          }
     }
});


// Listener pre submit formulára Vytvoriť tímy
if (teamCreationForm) {
    teamCreationForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Zabrániť predvolenému odoslaniu formulára

        const teamNameBase = teamNameInput && teamNameInput.value.trim();

        // Základná validácia názvu tímu
        if (!teamNameInput || teamNameBase === '') {
            alert('Základný názov tímu nemôže byť prázdny.');
             if (teamNameInput) teamNameInput.focus();
            return;
        }

        const categoryCountPairsContainer = document.getElementById('teamCategoryCountContainer');
        const categoryCountPairs = categoryCountPairsContainer && categoryCountPairsContainer.querySelectorAll('.category-count-pair');

        // Validácia, či sú pridané nejaké kategórie/počty
        if (!categoryCountPairs || categoryCountPairs.length === 0) {
            alert('Pridajte aspoň jednu kategóriu a počet tímov.');
             if (addCategoryCountPairButton) addCategoryCountPairButton.focus(); // Zamerať na tlačidlo Pridať
            return;
        }

        const teamsToProcess = [];
        const seenCategories = new Set(); // Set na kontrolu duplicitných kategórií

        // Validácia každého dynamicky pridaného páru a zber dát
        for (const pairDiv of categoryCountPairs) {
             const categorySelect = pairDiv.querySelector('.team-category-select-dynamic');
             const teamCountInput = pairDiv.querySelector('.team-count-input-dynamic');

             const categoryId = categorySelect && categorySelect.value;
             const teamCount = parseInt(teamCountInput && teamCountInput.value, 10);

             // Validácia výberu kategórie
             if (!categorySelect || categoryId === '' || categorySelect.disabled) {
                 alert('Prosím, vyberte platnú kategóriu pre každý riadok.');
                  if (categorySelect) categorySelect.focus();
                 return;
             }

              // Validácia počtu tímov
              if (!teamCountInput || isNaN(teamCount) || teamCount < 1) {
                 alert('Počet tímov musí byť platné číslo väčšie ako 0 pre každú kategóriu.');
                 if (teamCountInput) teamCountInput.focus();
                 return;
              }

               // Kontrola duplicitných kategórií
               if (seenCategories.has(categoryId)) {
                   alert(`Kategória "${categoryId}" bola vybraná viackrát. Pre každú kategóriu môžete zadať iba jeden počet.`);
                    // Nájsť prvý select s touto duplicitnou hodnotou a zamerať ho
                    const firstDuplicateSelect = categoryCountPairsContainer.querySelector(`.team-category-select-dynamic[value="${categoryId}"]`);
                    if (firstDuplicateSelect) firstDuplicateSelect.focus();
                   return;
               }
               seenCategories.add(categoryId); // Pridať kategóriu do zoznamu videných


               // Kontrola, či sa nevytvára príliš veľa tímov pre abecedné označenie (A-Z)
               if (teamCount > 26) {
                    alert(`Pre kategóriu "${categoryId}": Pre abecedné označenie je možné vytvoriť maximálne 26 tímov naraz (A-Z). Prosím, znížte počet tímov.`);
                    if (teamCountInput) teamCountInput.focus();
                    return;
               }


             // Ak je validácia pre tento pár úspešná, pridať do zoznamu na spracovanie
             teamsToProcess.push({ categoryId: categoryId, count: teamCount });
        }

        // Ak validácia všetkých párov prebehla úspešne, začať s vytváraním tímov
        const batch = writeBatch(db); // Použiť batch pre hromadné zápisy
        let successfullyAddedCount = 0;
        const failedCreations = []; // Zoznam tímov, ktoré sa nepodarilo vytvoriť

        try {
            // Prejsť cez každý plánovaný tím na vytvorenie
            for (const teamPlan of teamsToProcess) {
                 const categoryId = teamPlan.categoryId;
                 const teamCount = teamPlan.count;

                 for (let i = 1; i <= teamCount; i++) {
                      let teamName;
                      let teamSuffixForId = ''; // Suffix pre Firestore document ID

                      // Pridať abecedné označenie (suffix) ak sa vytvára viac ako jeden tím pre tento základný názov a kategóriu
                      if (teamCount > 1) {
                           const letter = String.fromCharCode(65 + (i - 1)); // Generovať 'A', 'B', 'C', ...
                           teamName = `${teamNameBase} ${letter}`; // Celý názov tímu (napr. "Spartak A")
                           teamSuffixForId = ` ${letter}`; // Suffix použitý pre ID dokumentu
                      } else {
                           teamName = teamNameBase; // Bez suffixu pre jeden tím
                      }

                      // Zostaviť unikátne ID dokumentu (napr. "U10 - Spartak A", "U12 - Slovan")
                      // Toto ID zabezpečí, že tímy s rovnakým názvom v rôznych kategóriách budú unikátne
                      const documentId = `${categoryId} - ${teamNameBase}${teamSuffixForId}`;
                      const teamDocRef = doc(clubsCollectionRef, documentId);

                      // Skontrolovať, či dokument s týmto ID už existuje PRED pokusom o zápis
                      const existingDoc = await getDoc(teamDocRef);
                       if (existingDoc.exists()) {
                           // Ak dokument existuje, preskočiť vytvorenie a zaznamenať chybu
                           failedCreations.push({ id: documentId, name: teamName, reason: 'Už existuje dokument s rovnakým ID.' });
                            console.warn(`Preskočené vytvorenie tímu "${teamName}" (${documentId}) - dokument už existuje.`);
                           continue; // Prejsť na ďalšiu iteráciu cyklu
                       }

                      // Pridať nový dokument tímu do batchu na zápis
                      batch.set(teamDocRef, {
                          name: teamName, // Uložiť celý názov tímu (napr. "Spartak A")
                          categoryId: categoryId, // Priradená kategória
                          groupId: null, // Pôvodne nepriradený do skupiny
                          orderInGroup: null // Pôvodne bez poradia v skupine
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


            if (teamCreationModal) closeModal(teamCreationModal); // Zatvoriť modálne okno
            if (teamCreationForm) teamCreationForm.reset(); // Vyčistiť formulár
            if (teamCategoryCountContainer) teamCategoryCountContainer.innerHTML = ''; // Vyčistiť dynamické páry
             if (addCategoryCountPairButton) checkIfAddCategoryCountPairButtonShouldBeVisible(); // Zabezpečiť zobrazenie/skrytie tlačidla

            // Obnoviť zobrazenie tabuľky vytvorených tímov
            displayCreatedTeams();

        } catch (error) {
            console.error('Chyba pri vytváraní tímov: ', error);
            alert(`Chyba pri vytváraní tímov! Prosím, skúste znova. Detail: ${error.message}`);

             // V prípade chyby, ak je modál stále otvorený, pokúsiť sa znovu načítať kategórie
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


// Listener pre zmeny v dynamicky pridávaných inputoch počtu - môže byť potrebné pridať v budúcnosti,
// ak by validácia závisela od zmien počtu

// Listener pre zmeny vo vybranych kategóriách dynamických selectov - už je priamo v addCategoryCountPair

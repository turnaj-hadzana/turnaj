// spravca-turnaja-logistika.js - Upravený súbor pre správu logistiky turnaja.
// Tento súbor bol upravený tak, aby odstránil funkcionalitu pre pridávanie a správu autobusov a všeobecných ubytovacích miest.

// Importy potrebných Firebase modulov a spoločných funkcií z 'spravca-turnaja-common.js'
// 'busesCollectionRef' bolo odstránené, pretože funkcionalita správy autobusov bola odstránená.
import {
    db,
    categoriesCollectionRef,
    groupsCollectionRef,
    clubsCollectionRef,
    matchesCollectionRef,
    playingDaysCollectionRef,
    placesCollectionRef, // Zostáva, pretože je potrebné pre získanie názvu ubytovne pri priradení tímom.
    teamAccommodationsCollectionRef,
    openModal,
    closeModal,
    populateCategorySelect,
    populateGroupSelect,
    getDocs,
    doc,
    setDoc,
    addDoc,
    getDoc,
    query,
    where,
    orderBy,
    deleteDoc,
    writeBatch,
    settingsCollectionRef,
    showMessage,
    showConfirmation
} from './spravca-turnaja-common.js';

// ID dokumentu pre nastavenia času zápasu
const SETTINGS_DOC_ID = 'matchTimeSettings';

// Referencie na UI elementy (predpokladané, na základe kontextu turnajovej aplikácie)
// Elementy súvisiace s pridávaním/úpravou autobusov a všeobecných ubytovacích miest
// by mali byť odstránené z vášho HTML a tu.
const assignAccommodationModal = document.getElementById('assignAccommodationModal');
const assignAccommodationForm = document.getElementById('assignAccommodationForm');
const playingDaySelect = document.getElementById('assign-accommodation-date-from'); // Predpokladaný select pre dátumy
const accommodationSelect = document.getElementById('assign-accommodation-place'); // Predpokladaný select pre ubytovanie
const teamsInput = document.getElementById('assign-accommodation-teams'); // Predpokladaný input pre tímy

// Predpokladané UI pre tlačidlo '+' a kontextové menu
const addBtn = document.getElementById('addBtn'); // Tlačidlo '+'
const contextMenu = document.getElementById('contextMenu'); // Kontextové menu, ak existuje

/**
 * Naplní element select hracími dňami z Firestore.
 * Dni sú načítané z kolekcie 'playingDays' a zoradené podľa dátumu.
 * @param {HTMLSelectElement} selectElement Element select, ktorý sa má naplniť.
 * @param {string} [selectedDate=''] Dátum, ktorý sa má predvoliť (vo formáte YYYY-MM-DD).
 */
async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>'; // Predvolená prázdna voľba
    try {
        const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        querySnapshot.forEach((doc) => {
            const day = doc.data();
            const option = document.createElement('option');
            option.value = day.date; // Uloží dátum vo formáte YYYY-MM-DD
            // Formátovanie dátumu pre zobrazenie (napr. DD. MM. RRRR)
            const dateObj = new Date(day.date);
            const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
            option.textContent = formattedDate;
            if (day.date === selectedDate) {
                option.selected = true; // Predvolí vybraný dátum
            }
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error("Chyba pri načítaní hracích dní:", error);
        await showMessage('Chyba', `Chyba pri načítaní hracích dní: ${error.message}`);
    }
}

/**
 * Funkcia na naplnenie select elementu s dostupnými ubytovaniami.
 * Táto funkcia je potrebná pre formulár priradenia ubytovania tímom.
 * @param {HTMLSelectElement} selectElement Element select, ktorý sa má naplniť.
 * @param {string} [selectedAccommodationId=''] ID ubytovania, ktoré sa má predvoliť.
 */
async function populateAccommodationSelect(selectElement, selectedAccommodationId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovanie --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        querySnapshot.forEach((doc) => {
            const place = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = place.name;
            if (doc.id === selectedAccommodationId) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error("Chyba pri načítaní ubytovacích miest:", error);
        await showMessage('Chyba', `Chyba pri načítaní ubytovacích miest: ${error.message}`);
    }
}


// -------- Obsluha udalostí po načítaní DOM --------
document.addEventListener('DOMContentLoaded', () => {
    // Inicializácia select boxov, ak existujú
    if (playingDaySelect) {
        populatePlayingDaysSelect(playingDaySelect);
    }
    if (accommodationSelect) {
        populateAccommodationSelect(accommodationSelect);
    }

    // Obsluha odoslania formulára pre priradenie ubytovania tímu
    if (assignAccommodationForm) {
        assignAccommodationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Získanie hodnôt z formulára
            const id = assignAccommodationForm.dataset.id; // ID existujúceho záznamu pre úpravu
            const assignmentDateFrom = playingDaySelect.value;
            const assignmentDateTo = document.getElementById('assign-accommodation-date-to').value; // Predpokladaný input
            const selectedAccommodationId = accommodationSelect.value;
            const teamsRaw = teamsInput.value;

            // Základná validácia
            if (!assignmentDateFrom || !assignmentDateTo || !selectedAccommodationId || !teamsRaw) {
                await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia pre priradenie ubytovania.');
                return;
            }

            let teamsData = [];
            try {
                // Predpokladáme, že tímy sú zadané ako JSON reťazec alebo čiarkami oddelený zoznam názvov tímov.
                // Tu môžete pridať robustnejšiu logiku na parsovanie alebo výber tímov.
                // Pre jednoduchosť predpokladáme formát: [{"teamId": "id1", "teamName": "Tím A"}, {"teamId": "id2", "teamName": "Tím B"}]
                teamsData = JSON.parse(teamsRaw);
                if (!Array.isArray(teamsData) || teamsData.some(t => !t.teamId || !t.teamName)) {
                    throw new Error('Formát tímov je neplatný. Očakáva sa pole objektov s teamId a teamName.');
                }
            } catch (parseError) {
                await showMessage('Chyba', `Neplatný formát tímov: ${parseError.message}. Prosím, zadajte tímy v správnom JSON formáte.`);
                return;
            }

            try {
                // Načítanie názvu ubytovne na základe ID pre uloženie v priradení
                const accommodationDoc = await getDoc(doc(placesCollectionRef, selectedAccommodationId));
                let accommodationName = '';
                if (accommodationDoc.exists()) {
                    accommodationName = accommodationDoc.data().name;
                } else {
                    await showMessage('Chyba', 'Vybraná ubytovňa sa nenašla v databáze.');
                    return;
                }

                const assignmentData = {
                    dateFrom: assignmentDateFrom,
                    dateTo: assignmentDateTo,
                    teams: teamsData, // Pole objektov {teamId, teamName}
                    accommodationId: selectedAccommodationId,
                    accommodationName: accommodationName,
                    createdAt: new Date() // Dátum vytvorenia záznamu
                };

                // Uloženie dát do Firestore
                if (id) {
                    // Ak existuje ID, ide o úpravu existujúceho záznamu
                    await setDoc(doc(teamAccommodationsCollectionRef, id), assignmentData, {
                        merge: true
                    });
                    await showMessage('Úspech', 'Priradenie ubytovania úspešne upravené!');
                } else {
                    // Ak ID neexistuje, ide o nový záznam
                    await addDoc(teamAccommodationsCollectionRef, assignmentData);
                    await showMessage('Úspech', 'Priradenie ubytovania úspešne pridané!');
                }

                closeModal(assignAccommodationModal); // Zatvorenie modálneho okna
                // Predpokladáme, že táto funkcia aktualizuje zobrazenie rozvrhu alebo zápasov
                // Mali by ste ju znova implementovať alebo skontrolovať, či je definovaná inde.
                // await displayMatchesAsSchedule(); // Táto funkcia nebola v poskytnutom úryvku, jej funkčnosť závisí od zvyšku aplikácie.

            } catch (error) {
                console.error("Chyba pri ukladaní priradenia ubytovania:", error);
                await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
            }
        });
    }

    // -------- Obsluha pre tlačidlo '+' a kontextové menu --------
    // Predpokladá sa, že existuje tlačidlo s id="addBtn" a menu s id="contextMenu".
    // Odstránili sme z tohto miesta akúkoľvek logiku, ktorá by pridávala
    // možnosti "Pridať autobus" alebo "Pridať ubytovanie" do kontextového menu,
    // alebo otvárala modálne okná pre tieto operácie.
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Zastaví šírenie udalosti, aby sa menu nezavrelo hneď po otvorení
            if (contextMenu) {
                // Ak tu bola logika na dynamické pridávanie/odstránenie možností
                // pre autobusy a ubytovanie, táto logika by mala byť odstránená.
                // Napríklad, ak ste mali:
                // addBusOption.style.display = 'none';
                // addAccommodationOption.style.display = 'none';
                // Alebo ak sa možnosti dynamicky vkladali do HTML,
                // mali by ste upraviť funkciu, ktorá generuje HTML menu.

                // Zobraziť alebo skryť kontextové menu
                // (Príklad: prepínanie triedy 'hidden' alebo menenie 'display' štýlu)
                contextMenu.classList.toggle('hidden'); // Alebo contextMenu.style.display = 'block'/'none';
            }
        });
    }

    // Zavrieť kontextové menu, ak sa klikne mimo neho
    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.contains(e.target) && e.target !== addBtn) {
            contextMenu.classList.add('hidden'); // Alebo contextMenu.style.display = 'none';
        }
    });

    // -------- Funkcie pre správu autobusov a ubytovania - ODSTRÁNENÉ --------
    // Všetok kód, ktorý by sa týkal pridávania, úpravy alebo mazania záznamov
    // pre autobusy alebo všeobecné ubytovacie miesta (mimo priradenia tímom),
    // bol z tohto súboru odstránený.
    // Ak ste mali funkcie ako:
    // async function saveBus(...) { ... }
    // async function deleteBus(...) { ... }
    // async function savePlace(...) { ... } // Pre ubytovacie miesta
    // async function deletePlace(...) { ... }
    // Alebo obsluhy udalostí pre formuláre autobusov a ubytovacích miest:
    // busForm.addEventListener('submit', ...)
    // accommodationForm.addEventListener('submit', ...)
    // Tieto by tu už nemali byť.
});

// Export funkcií, ktoré môžu byť potrebné inde (napríklad v 'spravca-turnaja-common.js' alebo iných moduloch)
export { populatePlayingDaysSelect, populateAccommodationSelect };

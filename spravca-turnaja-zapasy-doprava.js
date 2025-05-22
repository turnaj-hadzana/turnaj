import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, busesCollectionRef, teamAccommodationsCollectionRef, /* openModal, closeModal, */ populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Odkazy na HTML elementy
    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton'); // Toto je tlačidlo '+'
    const addOptionsDropdown = document.getElementById('addOptions'); // Toto je kontajner pre tlačidlá výberu modálu
    const modals = document.querySelectorAll('.modal'); // Všetky elementy, ktoré sú modálne okná

    // Modálne okná a ich tlačidlá
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

    // Modálne okno pre hrací deň
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayModalTitle = document.getElementById('playingDayModalTitle');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    // Modálne okno pre miesto (pôvodne športová hala)
    const placeModal = document.getElementById('placeModal');
    const closePlaceModalButton = document.getElementById('closePlaceModal');
    const placeForm = document.getElementById('placeForm');
    const placeIdInput = document.getElementById('placeId');
    const placeTypeSelect = document.getElementById('placeTypeSelect');
    const placeNameInput = document.getElementById('placeName');
    const placeAddressInput = document.getElementById('placeAddress');
    const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
    const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

    // Modálne okno pre autobus
    const busModal = document.getElementById('busModal');
    const closeBusModalButton = document.getElementById('closeBusModal');
    const busForm = document.getElementById('busForm');
    const busIdInput = document.getElementById('busId');
    const busModalTitle = document.getElementById('busModalTitle');
    const busNameInput = document.getElementById('busNameInput');
    const busDateSelect = document.getElementById('busDateSelect');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

    // Modálne okno pre priradenie ubytovania
    const assignAccommodationModal = document.getElementById('assignAccommodationModal');
    const closeAssignAccommodationModalButton = document.getElementById('closeAssignAccommodationModal');
    const assignAccommodationForm = document.getElementById('assignAccommodationForm');
    const assignmentIdInput = document.getElementById('assignmentId');
    const assignmentDateSelect = document.getElementById('assignmentDateSelect');
    const clubSelect = document.getElementById('clubSelect'); // Zmenené z teamSelect
    const teamDetailsSelect = document.getElementById('teamDetailsSelect'); // NOVÝ SELECT BOX
    const accommodationSelect = document.getElementById('accommodationSelect');
    const assignAccommodationModalTitle = document.getElementById('assignAccommodationModalTitle');
    const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');

    // Elementy pre vlastné modálne okno správ
    const messageModal = document.getElementById('messageModal');
    const messageModalTitle = document.getElementById('messageModalTitle');
    const messageModalText = document.getElementById('messageModalText');
    const messageModalOkButton = document.getElementById('messageModalOkButton');
    const messageModalConfirmButton = document.getElementById('messageModalConfirmButton');
    const messageModalCancelButton = document.getElementById('messageModalCancelButton');
    let resolveMessageModalPromise; // Na vyriešenie Promise pre potvrdenie/zrušenie

    // Konštantné ID dokumentu pre nastavenia (musí byť rovnaké ako v spravca-turnaja-nastavenia.js)
    const SETTINGS_DOC_ID = 'matchTimeSettings';


    // Funkcia na zobrazenie vlastného modálneho okna pre správy/potvrdenia
    function showMessageModal(title, message, type = 'alert') {
        messageModalTitle.textContent = title;
        messageModalText.textContent = message;

        // Reset stavov tlačidiel
        messageModalOkButton.style.display = 'none';
        messageModalConfirmButton.style.display = 'none';
        messageModalCancelButton.style.display = 'none';

        return new Promise(resolve => {
            resolveMessageModalPromise = resolve;

            if (type === 'confirm') {
                messageModalConfirmButton.style.display = 'inline-block';
                messageModalCancelButton.style.display = 'inline-block';
                messageModalConfirmButton.onclick = () => {
                    hideAllModals(); // Zatvorí modálne okno správy
                    resolve(true);
                };
                messageModalCancelButton.onclick = () => {
                    hideAllModals(); // Zatvorí modálne okno správy
                    resolve(false);
                };
            } else { // Typ 'alert'
                messageModalOkButton.style.display = 'inline-block';
                messageModalOkButton.onclick = () => {
                    hideAllModals(); // Zatvorí modálne okno správy
                    resolve(true); // Vždy vyrieši true pre alert
                };
            }
            showModal(messageModal); // Použije všeobecnú funkciu showModal
        });
    }


    // Funkcia na skrytie všetkých modálnych okien
    function hideAllModals() {
        modals.forEach(modal => {
            modal.classList.remove('show');
            modal.style.display = 'none'; // Zabezpečuje úplné skrytie
        });
        // Skryjeme aj dropdown pre výber modálu
        if (addOptionsDropdown) {
            addOptionsDropdown.classList.remove('show');
            addOptionsDropdown.style.display = 'none'; // Zabezpečí, že je skrytý
        }
    }

    // Funkcia na zobrazenie konkrétneho modálneho okna
    function showModal(modalElement) {
        if (modalElement) {
            hideAllModals(); // Najprv skryjeme všetky ostatné otvorené modály
            modalElement.style.display = 'flex'; // Zviditeľníme ho ako flex kontajner pre centrovanie
            // Použijeme setTimeout, aby sa zabezpečilo, že display:flex sa aplikuje pred pridaním 'show' pre CSS prechody
            setTimeout(() => {
                modalElement.classList.add('show');
            }, 10);
        }
    }

    // --- Počiatočné nastavenie pri načítaní stránky ---
    // 1. Okamžite skryjeme všetky modálne okná a dropdown
    hideAllModals();
    // Zabezpečíme, že addOptionsDropdown je na začiatku skrytý
    if (addOptionsDropdown) {
        addOptionsDropdown.style.display = 'none';
    }


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- Funkcie pre plnenie select boxov ---
    async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
        try {
            const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = day.date;

                const dateObj = new Date(day.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                option.textContent = formattedDate;

                selectElement.appendChild(option);
            });
            if (selectedDate) {
                selectElement.value = selectedDate;
            }
        } catch (error) {
            console.error("Error loading playing days: ", error);
        }
    }

    // Funkcia: Plní select boxy iba športovými halami (pre zápasy)
    async function populateSportHallSelects(selectElement, selectedPlaceName = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (športovú halu) --</option>';
        try {
            const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Športová hala"), orderBy("name", "asc")));
            if (querySnapshot.empty) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne športové haly nenájdené --';
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("No sport halls found in Firestore.");
            } else {
                querySnapshot.forEach((doc) => {
                    const place = { id: doc.id, ...doc.data() };
                    const option = document.createElement('option');
                    option.value = place.name;
                    option.textContent = `${place.name}`;
                    selectElement.appendChild(option);
                });
            }
            if (selectedPlaceName) {
                selectElement.value = selectedPlaceName;
            }
        } catch (error) {
            console.error("Error loading sport halls: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní hál --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    // Funkcia: Plní select boxy všetkými typmi miest (pre autobusy)
    async function populateAllPlaceSelects(selectElement, selectedPlaceCombined = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto --</option>';
        try {
            // Táto časť kódu načítava VŠETKY miesta bez ohľadu na typ
            const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
            if (querySnapshot.empty) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne miesta nenájdené --';
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("No places found in Firestore.");
            } else {
                querySnapshot.forEach((doc) => {
                    const place = { id: doc.id, ...doc.data() };
                    const option = document.createElement('option');
                    option.value = `${place.name}:::${place.type}`; // Uložíme kombináciu názvu a typu ako hodnotu
                    option.textContent = `${place.name} (${place.type})`; // Zobrazíme názov miesta a jeho typ
                    selectElement.appendChild(option);
                });
            }
            if (selectedPlaceCombined) {
                selectElement.value = selectedPlaceCombined;
            }
        } catch (error) {
            console.error("Error loading places: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní miest --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    // NOVÁ FUNKCIA: Plní prvý select box základnými názvami klubov
    async function populateClubSelect(selectElement, selectedClubName = '') { // Zmenené selectedClubId na selectedClubName
        selectElement.innerHTML = '<option value="">-- Vyberte klub --</option>';
        try {
            const clubsSnapshot = await getDocs(query(clubsCollectionRef, orderBy("name", "asc")));
            const uniqueClubNames = new Set(); // Použijeme Set na uchovanie unikátnych názvov klubov

            clubsSnapshot.forEach(doc => {
                const clubData = doc.data();
                if (clubData.name) { // Predpokladáme, že 'name' pole obsahuje názov klubu
                    uniqueClubNames.add(clubData.name);
                }
            });

            Array.from(uniqueClubNames).sort().forEach(clubName => { // Zoradíme unikátne názvy klubov
                const option = document.createElement('option');
                option.value = clubName; // Hodnota je názov klubu
                option.textContent = clubName;
                if (selectedClubName === clubName) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní klubov pre select: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní klubov --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    // NOVÁ FUNKCIA: Plní druhý select box konkrétnymi tímami pre vybraný klub
    async function populateTeamDetailsSelect(selectElement, clubName, assignmentDate, currentAssignedEntityId = '') {
        selectElement.innerHTML = '<option value="_ENTIRE_CLUB_">-- Celý klub --</option>'; // Predvolená možnosť pre celý klub
        selectElement.disabled = true; // Predvolene zakázané, povolené po výbere klubu

        if (!clubName) { // Teraz očakávame názov klubu
            return;
        }

        try {
            // Načítame všetky tímy patriace pod vybraný klub (filtrovanie podľa názvu klubu)
            const teamsSnapshot = await getDocs(query(clubsCollectionRef, where("name", "==", clubName), orderBy("orderInGroup", "asc")));
            let teamsInClub = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (assignmentDate) {
                const accommodationsQuery = query(teamAccommodationsCollectionRef, where("date", "==", assignmentDate));
                const accommodationsSnapshot = await getDocs(accommodationsQuery);

                const assignedEntityIdsForDate = new Set();
                accommodationsSnapshot.forEach(doc => {
                    const accommodationData = doc.data();
                    if (doc.id === assignmentIdInput.value) { // Preskočí aktuálne upravované priradenie
                        return;
                    }
                    // Skontrolujeme, či ide o priradenie na úrovni klubu alebo konkrétneho tímu
                    if (accommodationData.assignedEntityType === 'club' && accommodationData.assignedEntityName === clubName) { // Kontrola podľa názvu klubu
                        // Ak je priradený celý klub, žiadne tímy z tohto klubu by nemali byť voliteľné
                        teamsInClub.forEach(team => assignedEntityIdsForDate.add(team.id));
                    } else if (accommodationData.assignedEntityType === 'team') {
                        assignedEntityIdsForDate.add(accommodationData.assignedEntityId); // Pridáme ID konkrétneho tímu
                    }
                });

                // Odfiltrujeme tímy, ktoré už majú priradené ubytovanie pre tento dátum
                teamsInClub = teamsInClub.filter(team => !assignedEntityIdsForDate.has(team.id) || team.id === currentAssignedEntityId);
            }

            if (teamsInClub.length === 0 && currentAssignedEntityId === '') { // Iba ak pridávame nové a nie sú dostupné žiadne tímy
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne tímy pre tento klub/dátum --';
                option.disabled = true;
                selectElement.appendChild(option);
            } else {
                teamsInClub.forEach((team) => {
                    console.log('Údaje o tíme pre druhý select box:', team);
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = `Kat: ${team.categoryName || 'N/A'}, Skup: ${team.groupName || team.groupId || 'N/A'}, Tím: ${team.orderInGroup || 'N/A'}`;
                    if (currentAssignedEntityId === team.id) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            }
            selectElement.disabled = false; // Povoliť select box
        } catch (error) {
            console.error("Chyba pri načítaní detailov tímov pre select: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní tímov --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    // Funkcia na plnenie selectu ubytovňami
    async function populateAccommodationSelect(selectElement, selectedAccommodationId = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
        try {
            const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Ubytovanie"), orderBy("name", "asc")));
            if (querySnapshot.empty) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '-- Žiadne ubytovne nenájdené --';
                option.disabled = true;
                selectElement.appendChild(option);
                console.warn("No accommodation places found in Firestore.");
            } else {
                querySnapshot.forEach((doc) => {
                    const place = { id: doc.id, ...doc.data() };
                    const option = document.createElement('option');
                    option.value = place.id;
                    option.textContent = place.name;
                    if (selectedAccommodationId === place.id) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Chyba pri načítaní ubytovní: ", error);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Chyba pri načítaní ubytovní --';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }
    // --- Koniec funkcií pre plnenie select boxov ---

    /**
     * Načíta nastavenia zápasu pre vybranú kategóriu z Firestore.
     * Ak nastavenia neexistujú, vráti predvolené hodnoty.
     * @param {string} categoryId ID vybranej kategórie.
     * @returns {Promise<{duration: number, bufferTime: number}>} Objekt s trvaním a ochranným pásmom.
     */
    async function getCategoryMatchSettings(categoryId) {
        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                const categorySettings = data.categoryMatchSettings && data.categoryMatchSettings[categoryId];
                if (categorySettings) {
                    return {
                        duration: categorySettings.duration || 60,
                        bufferTime: categorySettings.bufferTime || 5
                    };
                }
            }
        } catch (error) {
            console.error("Chyba pri načítaní nastavení kategórie: ", error);
        }
        // Predvolené hodnoty, ak nastavenia pre kategóriu neexistujú alebo sa vyskytla chyba
        return { duration: 60, bufferTime: 5 };
    }

    /**
     * Aktualizuje inputy pre trvanie a ochranné pásmo na základe vybranej kategórie.
     */
    async function updateMatchDurationAndBuffer() {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            const settings = await getCategoryMatchSettings(selectedCategoryId);
            matchDurationInput.value = settings.duration;
            matchBufferTimeInput.value = settings.bufferTime;
        } else {
            // Ak nie je vybraná kategória, nastav predvolené hodnoty
            matchDurationInput.value = 60;
            matchBufferTimeInput.value = 5;
        }
        // Po aktualizácii trvania/bufferu, skús nájsť prvý dostupný čas
        findFirstAvailableTime();
    }


    /**
     * Nájsť prvý dostupný časový slot pre zápas na základe vybranej dátumu, miesta, trvania a ochranného pásma.
     * Nastaví nájdený čas do inputu matchStartTimeInput.
     */
    async function findFirstAvailableTime() {
        const selectedDate = matchDateSelect.value;
        const selectedLocationName = matchLocationSelect.value;
        const duration = parseInt(matchDurationInput.value) || 60;
        const bufferTime = parseInt(matchBufferTimeInput.value) || 5;

        if (!selectedDate || !selectedLocationName) {
            matchStartTimeInput.value = '';
            return;
        }

        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            let firstDayStartTime = '08:00';
            let otherDaysStartTime = '08:00';

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                firstDayStartTime = data.firstDayStartTime || '08:00';
                otherDaysStartTime = data.otherDaysStartTime || '08:00';
            }

            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
            const isFirstPlayingDay = sortedPlayingDays.length > 0 && selectedDate === sortedPlayingDays[0];

            let [startH, startM] = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number);
            const endSearchHour = 22;
            const intervalMinutes = 1;

            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", selectedDate),
                where("location", "==", selectedLocationName)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
            const existingEvents = existingMatchesSnapshot.docs.map(doc => {
                const data = doc.data();
                const [eventStartH, eventStartM] = data.startTime.split(':').map(Number);
                const startInMinutes = eventStartH * 60 + eventStartM;
                const endInMinutes = startInMinutes + (data.duration || 0) + (data.bufferTime || 0);
                return { start: startInMinutes, end: endInMinutes };
            });

            existingEvents.sort((a, b) => a.start - b.start);

            for (let hour = startH; hour <= endSearchHour; hour++) {
                const currentMinuteStart = (hour === startH) ? startM : 0;
                for (let minute = currentMinuteStart; minute < 60; minute += intervalMinutes) {
                    const potentialStartInMinutes = hour * 60 + minute;
                    const potentialEndInMinutes = potentialStartInMinutes + duration + bufferTime;

                    let overlap = false;
                    for (const existingEvent of existingEvents) {
                        if (potentialStartInMinutes < existingEvent.end && potentialEndInMinutes > existingEvent.start) {
                            overlap = true;
                            break;
                        }
                    }

                    if (!overlap) {
                        const formattedHour = String(hour).padStart(2, '0');
                        const formattedMinute = String(minute).padStart(2, '0');
                        matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                        return;
                    }
                }
            }

            matchStartTimeInput.value = '';
            console.warn("Nenašiel sa žiadny voľný časový slot pre zápas v daný deň a hale v rozsahu 08:00 - 22:00.");

        } catch (error) {
            console.error("Chyba pri hľadaní prvého dostupného času: ", error);
            matchStartTimeInput.value = '';
        }
    }

    // --- Funkcia na načítanie a zobrazenie zápasov, autobusov a UBYTOVANIA ako rozvrh ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '';
        matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam logistiku turnaja...</p>');

        const CELL_WIDTH_PX = 350;
        const MINUTES_PER_HOUR = 60;
        const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
        const ITEM_HEIGHT_PX = 140;

        try {
            const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            const matchesSnapshot = await getDocs(matchesQuery);
            const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));

            const busesQuery = query(busesCollectionRef, orderBy("date", "asc"), orderBy("busName", "asc"), orderBy("startTime", "asc"));
            const busesSnapshot = await getDocs(busesQuery);
            const allBuses = busesSnapshot.docs.map(doc => ({ id: doc.id, type: 'bus', ...doc.data() }));

            const accommodationsQuery = query(teamAccommodationsCollectionRef, orderBy("date", "asc"), orderBy("accommodationName", "asc"));
            const accommodationsSnapshot = await getDocs(accommodationsQuery);
            // Upravené mapovanie pre novú štruktúru ubytovania
            const allAccommodations = accommodationsSnapshot.docs.map(doc => ({ id: doc.id, type: 'accommodation', ...doc.data() }));

            const allEvents = [...allMatches, ...allBuses, ...allAccommodations];

            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));

            const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
            const existingPlacesData = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const uniquePlacesForRows = [];
            const addedPlaceKeys = new Set();

            existingPlacesData.forEach(place => {
                const placeKey = `${place.name}:::${place.type}`;
                if (!addedPlaceKeys.has(placeKey)) {
                    uniquePlacesForRows.push(place);
                    addedPlaceKeys.add(placeKey);
                }
            });

            uniquePlacesForRows.sort((a, b) => {
                if (a.type < b.type) return -1;
                if (a.type > b.type) return 1;
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            });

            const uniqueLocations = new Set();
            uniquePlacesForRows.forEach(place => uniqueLocations.add(`${place.name}:::${place.type}`));

            const uniqueDates = new Set([...existingPlayingDays]);

            // Filter events for time range calculation: only matches and buses
            const eventsForTimeRangeCalculation = allEvents.filter(event => event.type === 'match' || event.type === 'bus');

            const dailyTimeRanges = new Map();
            eventsForTimeRangeCalculation.forEach(event => { // Use filtered events here
                const date = event.date;
                let startTimeInMinutes, endTimeInMinutes;

                if (event.type === 'match') {
                    const [startH, startM] = event.startTime.split(':').map(Number);
                    const durationWithBuffer = (event.duration || 0) + (event.bufferTime || 0);
                    startTimeInMinutes = startH * 60 + startM;
                    endTimeInMinutes = startTimeInMinutes + durationWithBuffer;
                } else if (event.type === 'bus') {
                    const [startH, startM] = event.startTime.split(':').map(Number);
                    const [endH, endM] = event.endTime.split(':').map(Number);
                    startTimeInMinutes = startH * 60 + startM;
                    endTimeInMinutes = endH * 60 + endM;
                    if (endTimeInMinutes < startTimeInMinutes) {
                        endTimeInMinutes += 24 * 60;
                    }
                }
                // Accommodation events are explicitly excluded from this calculation

                let actualEndHour = Math.ceil(endTimeInMinutes / 60);

                if (!dailyTimeRanges.has(date)) {
                    dailyTimeRanges.set(date, { minHour: Math.floor(startTimeInMinutes / 60), maxHour: actualEndHour });
                } else {
                    const range = dailyTimeRanges.get(date);
                    range.minHour = Math.min(range.minHour, Math.floor(startTimeInMinutes / 60));
                    range.maxHour = Math.max(range.maxHour, actualEndHour);
                }
            });

            const sortedLocations = Array.from(uniqueLocations).sort();
            const sortedDates = Array.from(uniqueDates).sort();

            console.log("Sorted Dates before iteration:", sortedDates);

            // If a date has no matches or buses, set a default time range (e.g., 8:00-18:00)
            sortedDates.forEach(date => {
                if (!dailyTimeRanges.has(date)) {
                    dailyTimeRanges.set(date, { minHour: 8, maxHour: 18 }); // Default range for dates with no matches/buses
                }
            });

            matchesContainer.innerHTML = '';

            let scheduleHtml = '<div class="schedule-table-container" style="position: relative; overflow: auto;">';
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            scheduleHtml += `<th class="fixed-column" style="position: sticky; top: 0; left: 0; z-index: 101; background-color: #d0d0d0;">Miesto / Čas</th>`;

            sortedDates.forEach(date => {
                const range = dailyTimeRanges.get(date);
                let hoursForDate = [];
                if (range) {
                    for (let h = range.minHour; h < range.maxHour; h++) {
                        hoursForDate.push(h);
                    }
                }

                const displayDateObj = new Date(date);
                const displayDay = String(displayDateObj.getDate()).padStart(2, '0');
                const displayMonth = String(displayDateObj.getMonth() + 1).padStart(2, '0');
                const displayYear = String(displayDateObj.getFullYear());
                const formattedDisplayDate = `${displayDay}. ${displayMonth}. ${displayYear}`;

                const colspan = hoursForDate.length > 0 ? hoursForDate.length : 1;

                scheduleHtml += `<th colspan="${colspan}" class="date-header-clickable" data-date="${date}" title="Kliknutím upravíte hrací deň ${formattedDisplayDate}" style="position: sticky; top: 0; z-index: 100; background-color: #d0d0d0;">`;
                scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div>`;
                scheduleHtml += '<div class="schedule-times-row">';
                if (hoursForDate.length > 0) {
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                } else {
                    scheduleHtml += `<span></span>`;
                }
                scheduleHtml += '</div>';

                scheduleHtml += '</th>';
            });
            scheduleHtml += '</tr></thead><tbody>';

            uniquePlacesForRows.forEach(placeData => {
                const locationName = placeData.name;
                const placeAddress = placeData.address;
                const placeGoogleMapsUrl = placeData.googleMapsUrl;
                const placeType = placeData.type;

                let typeClass = '';
                let specificBackgroundColor = '';
                switch (placeType) {
                    case 'Športová hala':
                        typeClass = 'place-type-sport-hall';
                        specificBackgroundColor = 'background-color: #007bff;';
                        break;
                    case 'Stravovacie zariadenie':
                        typeClass = 'place-type-catering';
                        specificBackgroundColor = 'background-color: #ffc107;';
                        break;
                    case 'Ubytovanie':
                        typeClass = 'place-type-accommodation';
                        specificBackgroundColor = 'background-color: #4CAF50;';
                        break;
                    default:
                        typeClass = '';
                }

                const stickyColumnStyles = `position: sticky; left: 0; z-index: 100; background-color: #e0e0e0;`;
                const finalColumnStyle = `${stickyColumnStyles} ${specificBackgroundColor}`;

                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header delete-location-header ${typeClass}" data-location="${locationName}" data-type="${placeType}" title="Kliknutím upravíte miesto ${locationName} (${placeType})" style="${finalColumnStyle}">
                    <div class="hall-name">${locationName} (${placeType})</div> <div class="hall-address">
                        <a href="${placeGoogleMapsUrl}" target="_blank" rel="noopener noreferrer">${placeAddress}</a>
                    </div>
                </th>`;

                sortedDates.forEach(date => {
                    const range = dailyTimeRanges.get(date);
                    const hoursForDateCount = range ? (range.maxHour - range.minHour) : 0;
                    const colspan = hoursForDateCount > 0 ? hoursForDateCount : 1;

                    scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`;

                    // Oddelené zápasy a ubytovania pre odlišnú logiku vykresľovania v bunke
                    const matchesInCell = allEvents.filter(event => {
                        return event.type === 'match' && event.date === date && placeType === 'Športová hala' && event.location === locationName;
                    });
                    const accommodationsInCell = allEvents.filter(event => {
                        return event.type === 'accommodation' && event.date === date && placeType === 'Ubytovanie' && event.accommodationName === locationName;
                    });

                    // Vykreslenie zápasov (aktuálna logika)
                    matchesInCell.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    matchesInCell.forEach(event => {
                        const [startH, startM] = event.startTime.split(':').map(Number);
                        const absoluteStartMin = startH * 60 + startM;

                        const relativeStartMinInCell = absoluteStartMin - (range.minHour * 60);

                        const matchBlockLeftPx = relativeStartMinInCell * PIXELS_PER_MINUTE;
                        const matchBlockWidthPx = event.duration * PIXELS_PER_MINUTE;
                        const bufferBlockLeftPx = matchBlockLeftPx + matchBlockWidthPx;
                        const bufferBlockWidthPx = event.bufferTime * PIXELS_PER_MINUTE;

                        const matchEndTime = new Date();
                        matchEndTime.setHours(startH, startM + event.duration, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        let team1ClubNameDisplay = event.team1ClubName ? `${event.team1ClubName}` : '';
                        let team2ClubNameDisplay = event.team2ClubName ? `${event.team2ClubName}` : '';

                        let clubNamesHtml = '';
                        if (team1ClubNameDisplay) {
                            clubNamesHtml += `${team1ClubNameDisplay}`;
                        }
                        if (team2ClubNameDisplay) {
                            if (clubNamesHtml) clubNamesHtml += `<br>`;
                            clubNamesHtml += `${team2ClubNameDisplay}`;
                        }

                        const finalClubNamesHtml = clubNamesHtml ? `<span style="font-weight: normal;">${clubNamesHtml}</span>` : '';

                        scheduleHtml += `
                            <div class="schedule-cell-match"
                                data-id="${event.id}" data-type="${event.type}"
                                style="left: ${matchBlockLeftPx}px; width: ${matchBlockWidthPx}px; top: 0;">
                                <div class="schedule-cell-content">
                                    <p class="schedule-cell-time">${event.startTime} - ${formattedEndTime}</p>
                                    <p class="schedule-cell-category">${event.categoryName || 'N/A'}${event.groupName ? ` ${event.groupName}` : ''}</p>
                                    <p class="schedule-cell-teams">
                                        ${event.team1DisplayName}<br>
                                        ${event.team2DisplayName}<br>
                                        ${finalClubNamesHtml}
                                    </p>
                                </div>
                            </div>
                        `;
                        if (event.bufferTime > 0) {
                            scheduleHtml += `
                                <div class="schedule-cell-buffer"
                                    style="left: ${bufferBlockLeftPx}px; width: ${bufferBlockWidthPx}px; top: 0;">
                                </div>
                            `;
                        }
                    });

                    // Vykreslenie ubytovaní (nová logika pre zobrazenie vedľa seba)
                    const totalAccommodationsInCell = accommodationsInCell.length;
                    if (totalAccommodationsInCell > 0) {
                        const cellWidth = (range.maxHour - range.minHour) * CELL_WIDTH_PX; // Celková šírka td bunky
                        const blockWidth = cellWidth / totalAccommodationsInCell;

                        accommodationsInCell.forEach((event, index) => {
                            const blockLeft = index * blockWidth;
                            // Upravené zobrazenie pre novú štruktúru
                            const assignedEntityName = event.assignedEntityName || 'N/A';
                            const assignedEntityType = event.assignedEntityType === 'club' ? 'Klub' : 'Tím';

                            scheduleHtml += `
                                <div class="schedule-cell-accommodation"
                                    data-id="${event.id}" data-type="${event.type}"
                                    style="position: absolute; left: ${blockLeft}px; width: ${blockWidth}px; top: 0; height: 100%;">
                                    <div class="schedule-cell-content">
                                        <p class="schedule-cell-title">Ubytovanie</p>
                                        <p class="schedule-cell-teams">${assignedEntityName} (${assignedEntityType})</p>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    scheduleHtml += '</td>';
                });
                scheduleHtml += '</tr>';
            });
            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>';

            matchesContainer.insertAdjacentHTML('beforeend', scheduleHtml);

            const scheduleTableContainer = matchesContainer.querySelector('.schedule-table-container');
            const scheduleTable = matchesContainer.querySelector('.match-schedule-table');

            if (!scheduleTableContainer || !scheduleTable) {
                console.error("Schedule table container or table not found. Cannot render buses or calculate offsets.");
                matchesContainer.innerHTML = '<p>Chyba pri zobrazení rozvrhu. Chýbajú komponenty tabuľky.</p>';
                return;
            }

            const scheduleTableContainerRect = scheduleTableContainer.getBoundingClientRect();

            const busOverlayContainer = document.createElement('div');
            busOverlayContainer.id = 'busOverlayContainer';
            busOverlayContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${scheduleTable.offsetWidth}px;
                    height: ${scheduleTable.offsetHeight}px;
                    pointer-events: none;
                `;
            scheduleTableContainer.appendChild(busOverlayContainer);

            const locationRowTopOffsets = new Map();
            scheduleTable.querySelectorAll('tbody tr').forEach(row => {
                const locationHeader = row.querySelector('th.fixed-column');
                if (locationHeader) {
                    const locationName = locationHeader.dataset.location;
                    const locationType = locationHeader.dataset.type;
                    locationRowTopOffsets.set(`${locationName}:::${locationType}`, locationHeader.getBoundingClientRect().top - scheduleTableContainerRect.top);
                }
            });

            const timeColumnLeftOffsets = new Map();
            const firstTimeHeader = scheduleTable.querySelector('thead th:not(.fixed-column)');
            if (firstTimeHeader) {
                sortedDates.forEach(date => {
                    const dateHeader = scheduleTable.querySelector(`th[data-date="${date}"]`);
                    if (dateHeader) {
                        const timeSpans = dateHeader.querySelectorAll('.schedule-times-row span');
                        const hourOffsets = [];
                        const range = dailyTimeRanges.get(date);
                        const firstHourInDay = range ? range.minHour : 0;

                        timeSpans.forEach((span, index) => {
                            const hour = firstHourInDay + index;
                            hourOffsets.push({
                                hour: hour,
                                left: (dateHeader.getBoundingClientRect().left - scheduleTableContainerRect.left) + (index * CELL_WIDTH_PX)
                            });
                        });
                        timeColumnLeftOffsets.set(date, hourOffsets);
                    }
                });
            }

            allBuses.forEach(bus => {
                const startLocationKey = bus.startLocation;
                const endLocationKey = bus.endLocation;
                const date = bus.date;

                let busStartY, busEndY;
                const startLocationTop = locationRowTopOffsets.get(startLocationKey);
                const endLocationTop = locationRowTopOffsets.get(endLocationKey);

                if (startLocationTop === undefined || endLocationTop === undefined) {
                    console.warn(`Nenašiel som pozíciu pre začiatok alebo koniec trasy autobusu: ${bus.busName} (${startLocationKey} -> ${endLocationKey}). Možno chýba typ miesta v uložených dátach autobusu.`);
                    return;
                }

                if (startLocationTop <= endLocationTop) {
                    busStartY = startLocationTop;
                    busEndY = endLocationTop + ITEM_HEIGHT_PX;
                } else {
                    busStartY = startLocationTop + ITEM_HEIGHT_PX;
                    busEndY = endLocationTop;
                }

                const [startH, startM] = bus.startTime.split(':').map(Number);
                const [endH, endM] = bus.endTime.split(':').map(Number);

                const startTimeInMinutes = startH * 60 + startM;
                let endTimeInMinutes = endH * 60 + endM;

                if (endTimeInMinutes < startTimeInMinutes) {
                    endTimeInMinutes += 24 * 60;
                }

                const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
                if (durationInMinutes <= 0) {
                    console.warn(`Autobus s ID ${bus.id} má neplatné trvanie (čas príchodu <= čas odchodu).`);
                    return;
                }

                const dateHours = timeColumnLeftOffsets.get(date);
                if (!dateHours || dateHours.length === 0) {
                    console.warn(`Nenašiel som časové stĺpce pre dátum: ${date}`);
                    return;
                }

                let busLeftPx = 0;
                const range = dailyTimeRanges.get(date);
                const firstHourOfDate = range ? range.minHour : 0;

                const firstHourDataForDate = dateHours.find(h => h.hour === firstHourOfDate);
                if (firstHourDataForDate) {
                    busLeftPx = firstHourDataForDate.left + ((startTimeInMinutes - (firstHourOfDate * 60)) * PIXELS_PER_MINUTE);
                } else {
                    console.warn(`Nepodarilo sa nájsť špecifické údaje o hodine pre dátum ${date} a hodinu ${firstHourOfDate}. Používam prvé dostupné.`);
                    busLeftPx = dateHours[0].left + ((startTimeInMinutes - (dateHours[0].hour * 60)) * PIXELS_PER_MINUTE);
                }

                const busWidthPx = (durationInMinutes * PIXELS_PER_MINUTE) / 4;
                const slantOffset = 30;

                const svgWidth = busWidthPx + Math.abs(slantOffset);
                const svgHeight = Math.abs(busEndY - busStartY);

                let points;
                let svgLeftOffset = 0;

                if (startLocationTop <= endLocationTop) {
                    points = `0,0 ${busWidthPx},0 ${svgWidth},${svgHeight} ${slantOffset},${svgHeight}`.trim();
                    svgLeftOffset = 0;
                } else {
                    points = `${slantOffset},0 ${svgWidth},0 ${busWidthPx},${svgHeight} 0,${svgHeight}`.trim();
                    svgLeftOffset = slantOffset;
                }

                const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svgElement.setAttribute("class", "bus-svg");
                svgElement.setAttribute("width", svgWidth);
                svgElement.setAttribute("height", svgHeight);
                svgElement.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
                svgElement.style.cssText = `
                    position: absolute;
                    left: ${busLeftPx - svgLeftOffset}px;
                    top: ${Math.min(busStartY, busEndY)}px;
                    pointer-events: all;
                `;
                svgElement.dataset.id = bus.id;
                svgElement.dataset.type = bus.type;

                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("class", "schedule-bus-polygon");
                polygon.setAttribute("points", points);
                svgElement.appendChild(polygon);

                const textYBase = svgHeight / 2;
                const textXBase = svgWidth / 2;

                const busNameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busNameText.setAttribute("class", "schedule-bus-text");
                busNameText.setAttribute("x", textXBase);
                busNameText.setAttribute("y", textYBase - 20);
                busNameText.setAttribute("text-anchor", "middle");
                busNameText.setAttribute("dominant-baseline", "middle");
                busNameText.textContent = bus.busName;
                svgElement.appendChild(busNameText);

                const busRouteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busRouteText.setAttribute("class", "schedule-bus-route-text");
                busRouteText.setAttribute("x", textXBase);
                busRouteText.setAttribute("y", textYBase);
                busRouteText.setAttribute("text-anchor", "middle");
                busRouteText.setAttribute("dominant-baseline", "middle");
                busRouteText.textContent = `${bus.startLocation.split(':::')[0]} → ${bus.endLocation.split(':::')[0]}`;
                svgElement.appendChild(busRouteText);

                const busTimeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busTimeText.setAttribute("class", "schedule-bus-time-text");
                busTimeText.setAttribute("x", textXBase);
                busTimeText.setAttribute("y", textYBase + 20);
                busTimeText.setAttribute("text-anchor", "middle");
                busTimeText.setAttribute("dominant-baseline", "middle");
                busTimeText.textContent = `${bus.startTime} - ${bus.endTime}`;
                svgElement.appendChild(busTimeText);

                if (bus.notes) {
                    const busNotesText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    busNotesText.setAttribute("class", "schedule-bus-notes-text");
                    busNotesText.setAttribute("x", textXBase);
                    busNotesText.setAttribute("y", textYBase + 40);
                    busNotesText.setAttribute("text-anchor", "middle");
                    busNotesText.setAttribute("dominant-baseline", "middle");
                    busNotesText.textContent = bus.notes;
                    svgElement.appendChild(busNotesText);
                }

                busOverlayContainer.appendChild(svgElement);
            });

            // Pridanie event listenerov pre kliknutie na zápas/autobus/UBYTOVANIE pre úpravu
            matchesContainer.querySelectorAll('.schedule-cell-match').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id;
                    editMatch(id);
                });
            });

            busOverlayContainer.querySelectorAll('.bus-svg').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id;
                    editBus(id);
                });
            });

            // Event listener pre priradenie ubytovania v rozvrhu
            matchesContainer.querySelectorAll('.schedule-cell-accommodation').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id;
                    editAccommodationAssignment(id);
                });
            });

            matchesContainer.querySelectorAll('.date-header-clickable').forEach(header => {
                header.addEventListener('click', async (event) => {
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                        return;
                    }
                    if (event.target === header || event.target.closest('.schedule-date-header-content')) {
                        const dateToEdit = header.dataset.date;
                        await editPlayingDay(dateToEdit);
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
                header.addEventListener('click', async (event) => {
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                        return;
                    }
                    if (event.target === header || event.target.closest('.hall-name')) {
                        const locationToEdit = header.dataset.location;
                        const locationTypeToEdit = header.dataset.type;
                        await editPlace(locationToEdit, locationTypeToEdit);
                    }
                });
            });

        } catch (error) {
            console.error("Chyba pri načítaní rozvrhu zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní rozvrhu zápasov. Skontrolujte konzolu pre detaily a uistite sa, že máte vytvorené potrebné indexy vo Firestore.</p>';
        }
    }


    async function deletePlayingDay(dateToDelete) {
        const confirmed = await showMessageModal('Potvrdenie zmazania', `Naozaj chcete vymazať hrací deň ${dateToDelete} a VŠETKY zápasy a autobusové linky, ktoré sa konajú v tento deň?`, 'confirm');
        if (confirmed) {
            try {
                const batch = writeBatch(db);

                const playingDayQuery = query(playingDaysCollectionRef, where("date", "==", dateToDelete));
                const playingDaySnapshot = await getDocs(playingDayQuery);
                if (!playingDaySnapshot.empty) {
                    playingDaySnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(playingDaysCollectionRef, docToDelete.id));
                    });
                } else {
                    console.warn(`Hrací deň ${dateToDelete} sa nenašiel, ale pokračujem v mazaní zápasov a autobusov.`);
                }

                // Vymazanie súvisiacich zápasov
                const matchesQuery = query(matchesCollectionRef, where("date", "==", dateToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // Vymazanie súvisiacich autobusov
                const busesQuery = query(busesCollectionRef, where("date", "==", dateToDelete));
                const busesSnapshot = await getDocs(busesQuery);
                busesSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                // Vymazanie súvisiacich priradení ubytovania
                const accommodationsQuery = query(teamAccommodationsCollectionRef, where("date", "==", dateToDelete));
                const accommodationsSnapshot = await getDocs(accommodationsQuery);
                accommodationsSnapshot.docs.forEach(accDoc => {
                    batch.delete(doc(teamAccommodationsCollectionRef, accDoc.id));
                });


                await batch.commit();
                await showMessageModal('Úspech', `Hrací deň ${dateToDelete} a všetky súvisiace zápasy, autobusové linky a priradenia ubytovania boli úspešne vymazané!`);
                hideAllModals();
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní hracieho dňa ${dateToDelete}: `, error);
                await showMessageModal('Chyba', `Chyba pri mazaní hracieho dňa ${dateToDelete}. Pozrite konzolu pre detaily.`);
            }
        }
    }

    // Funkcia na mazanie miesta (teraz prijíma aj typ miesta pre presné mazanie)
    async function deletePlace(placeNameToDelete, placeTypeToDelete) {
        const confirmed = await showMessageModal('Potvrdenie zmazania', `Naozaj chcete vymazať miesto ${placeNameToDelete} (${placeTypeToDelete}) a VŠETKY zápasy a autobusové linky, ktoré sa viažu na toto miesto?`, 'confirm');
        if (confirmed) {
            try {
                const batch = writeBatch(db);

                // Kontrola na základe názvu a typu, aby sa vymazalo správne miesto
                const placeQuery = query(placesCollectionRef, where("name", "==", placeNameToDelete), where("type", "==", placeTypeToDelete));
                const placeSnapshot = await getDocs(placeQuery);
                if (!placeSnapshot.empty) {
                    placeSnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(placesCollectionRef, docToDelete.id));
                    });
                } else {
                    console.warn(`Miesto ${placeNameToDelete} (${placeTypeToDelete}) sa nenašlo, ale pokračujem v mazaní súvisiacich zápasov a autobusov.`);
                }

                // Vymazanie súvisiacich zápasov (teraz filtruje aj podľa typu miesta)
                const matchesQuery = query(matchesCollectionRef, where("location", "==", placeNameToDelete), where("locationType", "==", placeTypeToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // Vymazanie súvisiacich autobusov (teraz filtruje podľa kombinovaného reťazca "názov:::typ")
                const combinedPlaceKey = `${placeNameToDelete}:::${placeTypeToDelete}`;
                const busesStartQuery = query(busesCollectionRef, where("startLocation", "==", combinedPlaceKey));
                const busesStartSnapshot = await getDocs(busesStartQuery);
                busesStartSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                const busesEndQuery = query(busesCollectionRef, where("endLocation", "==", combinedPlaceKey));
                const busesEndSnapshot = await getDocs(busesEndQuery);
                busesEndSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                // Vymazanie súvisiacich priradení ubytovania, ak je vymazané miesto typu "Ubytovanie"
                if (placeTypeToDelete === 'Ubytovanie') {
                    // Predpokladáme, že placeSnapshot.docs[0].id existuje, ak sa našlo miesto
                    if (!placeSnapshot.empty) {
                        const accommodationsQuery = query(teamAccommodationsCollectionRef, where("accommodationId", "==", placeSnapshot.docs[0].id));
                        const accommodationsSnapshot = await getDocs(accommodationsQuery);
                        accommodationsSnapshot.docs.forEach(accDoc => {
                            batch.delete(doc(teamAccommodationsCollectionRef, accDoc.id));
                        });
                    }
                }

                await batch.commit();
                await showMessageModal('Úspech', `Miesto ${placeNameToDelete} (${placeTypeToDelete}) a všetky súvisiace zápasy, autobusové linky a priradenia ubytovania boli úspešne vymazané!`);
                hideAllModals();
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní miesta ${placeNameToDelete} (${placeTypeToDelete}): `, error);
                await showMessageModal('Chyba', `Chyba pri mazaní miesta ${placeNameToDelete} (${placeTypeToDelete}). Pozrite konzolu pre detaily.`);
            }
        }
    }

    // Funkcia na úpravu hracieho dňa
    async function editPlayingDay(dateToEdit) {
        try {
            const q = query(playingDaysCollectionRef, where("date", "==", dateToEdit));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const playingDayDoc = querySnapshot.docs[0];
                const playingDayData = playingDayDoc.data();
                const playingDayId = playingDayDoc.id;

                playingDayIdInput.value = playingDayId;
                playingDayDateInput.value = playingDayData.date || '';
                playingDayModalTitle.textContent = 'Upraviť hrací deň';

                // Zobrazenie tlačidla Vymazať v modale
                deletePlayingDayButtonModal.style.display = 'inline-block';
                deletePlayingDayButtonModal.onclick = async () => await deletePlayingDay(playingDayData.date);

                showModal(playingDayModal);
            } else {
                await showMessageModal('Chyba', "Hrací deň sa nenašiel.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát hracieho dňa pre úpravu: ", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri načítavaní dát hracieho dňa. Skúste to znova.");
        }
    }

    // Funkcia na úpravu miesta (prijíma názov a typ)
    async function editPlace(placeName, placeType) {
        try {
            // Nájdeme miesto podľa názvu A TYPU
            const q = query(placesCollectionRef, where("name", "==", placeName), where("type", "==", placeType));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const placeDoc = querySnapshot.docs[0];
                const placeData = placeDoc.data();
                const placeId = placeDoc.id;

                placeIdInput.value = placeId;
                placeTypeSelect.value = placeData.type || '';
                placeNameInput.value = placeData.name || '';
                placeAddressInput.value = placeData.address || '';
                placeGoogleMapsUrlInput.value = placeData.googleMapsUrl || '';

                // Zobrazenie tlačidla Vymazať v modale
                deletePlaceButtonModal.style.display = 'inline-block';
                deletePlaceButtonModal.onclick = async () => await deletePlace(placeData.name, placeData.type);

                showModal(placeModal);
            } else {
                await showMessageModal('Chyba', "Miesto sa nenašlo.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát miesta pre úpravu: ", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri načítavaní dát miesta. Skúste to znova.");
        }
    }


    async function editMatch(matchId) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDoc = await getDoc(matchDocRef);

            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = matchId;
                matchModalTitle.textContent = 'Upraviť zápas';

                await populatePlayingDaysSelect(matchDateSelect, matchData.date);
                await populateSportHallSelects(matchLocationSelect, matchData.location);

                matchStartTimeInput.value = matchData.startTime || '';
                matchDurationInput.value = matchData.duration || '';
                matchBufferTimeInput.value = matchData.bufferTime || '';

                await populateCategorySelect(matchCategorySelect, matchData.categoryId);
                if (matchData.categoryId) {
                    await populateGroupSelect(matchData.categoryId, matchGroupSelect, matchData.groupId);
                    matchGroupSelect.disabled = false;
                } else {
                    matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    matchGroupSelect.disabled = true;
                }

                team1NumberInput.value = matchData.team1Number || '';
                team2NumberInput.value = matchData.team2Number || '';

                // Zobrazenie tlačidla Vymazať v modale
                deleteMatchButtonModal.style.display = 'inline-block';
                deleteMatchButtonModal.onclick = async () => await deleteMatch(matchId);

                showModal(matchModal);
            } else {
                await showMessageModal('Chyba', "Zápas sa nenašiel.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát zápasu pre úpravu: ", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri načítavaní dát zápasu. Skúste to znova.");
        }
    }

    async function deleteMatch(matchId) {
        const confirmed = await showMessageModal('Potvrdenie zmazania', 'Naozaj chcete vymazať tento zápas?', 'confirm');
        if (confirmed) {
            try {
                await deleteDoc(doc(matchesCollectionRef, matchId));
                await showMessageModal('Úspech', 'Zápas úspešne vymazaný!');
                hideAllModals();
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                await showMessageModal('Chyba', "Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    }

    // Funkcie pre úpravu a mazanie autobusu
    async function editBus(busId) {
        try {
            const busDocRef = doc(busesCollectionRef, busId);
            const busDoc = await getDoc(busDocRef);

            if (busDoc.exists()) {
                const busData = busDoc.data();
                busIdInput.value = busId;
                busModalTitle.textContent = 'Upraviť autobusovú linku';

                busNameInput.value = busData.busName || '';
                await populatePlayingDaysSelect(busDateSelect, busData.date);
                // Tieto volania funkcií už načítavajú VŠETKY miesta
                await populateAllPlaceSelects(busStartLocationSelect);
                busStartTimeInput.value = busData.startTime || '';
                await populateAllPlaceSelects(busEndLocationSelect, '');
                busEndTimeInput.value = busData.endTime || '';
                busNotesInput.value = busData.notes || '';

                // Zobrazenie tlačidla Vymazať v modale
                deleteBusButtonModal.style.display = 'inline-block';
                deleteBusButtonModal.onclick = async () => await deleteBus(busId);

                showModal(busModal);
            } else {
                await showMessageModal('Chyba', "Autobusová linka sa nenašla.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát autobusu pre úpravu: ", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri načítavaní dát autobusu. Skúste to znova.");
        }
    }

    async function deleteBus(busId) {
        const confirmed = await showMessageModal('Potvrdenie zmazania', 'Naozaj chcete vymazať túto autobusovú linku?', 'confirm');
        if (confirmed) {
            try {
                await deleteDoc(doc(busesCollectionRef, busId));
                await showMessageModal('Úspech', 'Autobusová linka úspešne vymazaná!');
                hideAllModals();
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní autobusovej linky: ", error);
                await showMessageModal('Chyba', "Chyba pri mazaní autobusovej linky. Pozrite konzolu pre detaily.");
            }
        }
    }

    // Funkcie pre úpravu a mazanie priradenia ubytovania
    async function editAccommodationAssignment(assignmentId) {
        try {
            const assignmentDocRef = doc(teamAccommodationsCollectionRef, assignmentId);
            const assignmentDoc = await getDoc(assignmentDocRef);

            if (assignmentDoc.exists()) {
                const assignmentData = assignmentDoc.data();
                assignmentIdInput.value = assignmentId;
                assignAccommodationModalTitle.textContent = 'Upraviť priradenie ubytovania';

                await populatePlayingDaysSelect(assignmentDateSelect, assignmentData.date);

                // Určíme, či ide o priradenie celého klubu alebo konkrétneho tímu
                const assignedEntityType = assignmentData.assignedEntityType;
                const assignedEntityId = assignmentData.assignedEntityId; // Pre klub to bude názov klubu, pre tím ID tímu
                const clubNameForTeam = assignmentData.clubName; // Názov klubu, ak je to tím

                // Najprv naplníme select klubov
                if (assignedEntityType === 'club') {
                    await populateClubSelect(clubSelect, assignedEntityId); // assignedEntityId je tu názov klubu
                    // Ak je to klub, druhý select bude mať vybranú možnosť "Celý klub"
                    await populateTeamDetailsSelect(teamDetailsSelect, assignedEntityId, assignmentData.date, assignedEntityId); // Pass clubName as assignedEntityId for filtering
                    teamDetailsSelect.value = '_ENTIRE_CLUB_';
                } else if (assignedEntityType === 'team') {
                    await populateClubSelect(clubSelect, clubNameForTeam); // Naplníme klub názvom klubu tímu
                    // Ak je to tím, naplníme druhý select a vyberieme konkrétny tím
                    await populateTeamDetailsSelect(teamDetailsSelect, clubNameForTeam, assignmentData.date, assignedEntityId);
                } else {
                    // Fallback pre staršie dáta alebo neznámy typ
                    await populateClubSelect(clubSelect, '');
                    teamDetailsSelect.innerHTML = '<option value="_ENTIRE_CLUB_">-- Celý klub --</option>';
                    teamDetailsSelect.disabled = true;
                }

                await populateAccommodationSelect(accommodationSelect, assignmentData.accommodationId);

                // Zobrazenie tlačidla Vymazať v modale
                deleteAssignmentButtonModal.style.display = 'inline-block';
                deleteAssignmentButtonModal.onclick = async () => await deleteAccommodationAssignment(assignmentId);

                showModal(assignAccommodationModal);
            } else {
                await showMessageModal('Chyba', "Priradenie ubytovania sa nenašlo.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát priradenia ubytovania pre úpravu: ", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri načítavaní dát priradenia ubytovania. Skúste to znova.");
        }
    }

    async function deleteAccommodationAssignment(assignmentId) {
        const confirmed = await showMessageModal('Potvrdenie zmazania', 'Naozaj chcete vymazať toto priradenie ubytovania?', 'confirm');
        if (confirmed) {
            try {
                await deleteDoc(doc(teamAccommodationsCollectionRef, assignmentId));
                await showMessageModal('Úspech', 'Priradenie ubytovania úspešne vymazané!');
                hideAllModals();
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní priradenia ubytovania: ", error);
                await showMessageModal('Chyba', "Chyba pri mazaní priradenia ubytovania. Pozrite konzolu pre detaily.");
            }
        }
    }

    await displayMatchesAsSchedule();


    // --- Logika pre tlačidlo '+' a dropdown ---
    addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        // Prepínanie zobrazenia dropdownu
        if (addOptionsDropdown.style.display === 'flex') {
            addOptionsDropdown.style.display = 'none';
        } else {
            addOptionsDropdown.style.display = 'flex';
        }
    });

    // Skryť dropdown, ak kliknem mimo neho alebo jeho možností
    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptionsDropdown.contains(event.target)) {
            addOptionsDropdown.style.display = 'none';
        }
    });

    // Event listenery pre tlačidlá vo vnútri addOptionsDropdown
    document.getElementById('addPlayingDayButton').addEventListener('click', () => {
        playingDayForm.reset();
        playingDayIdInput.value = '';
        playingDayModalTitle.textContent = 'Pridať hrací deň';
        deletePlayingDayButtonModal.style.display = 'none';
        showModal(playingDayModal); // Použi showModal
        addOptionsDropdown.style.display = 'none'; // Skry dropdown
    });

    document.getElementById('addPlaceButton').addEventListener('click', () => {
        placeForm.reset();
        placeIdInput.value = '';
        placeTypeSelect.value = '';
        placeNameInput.value = '';
        placeAddressInput.value = '';
        placeGoogleMapsUrlInput.value = '';
        deletePlaceButtonModal.style.display = 'none';
        showModal(placeModal); // Použi showModal
        addOptionsDropdown.style.display = 'none'; // Skry dropdown
    });

    document.getElementById('addMatchButton').addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas';
        await populateCategorySelect(matchCategorySelect);
        await populatePlayingDaysSelect(matchDateSelect);
        await populateSportHallSelects(matchLocationSelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
        team1NumberInput.value = '';
        team2NumberInput.value = '';
        matchDurationInput.value = '';
        matchBufferTimeInput.value = '';
        deleteMatchButtonModal.style.display = 'none';
        showModal(matchModal); // Použi showModal
        addOptionsDropdown.style.display = 'none'; // Skry dropdown
        if (matchCategorySelect.value) {
            await updateMatchDurationAndBuffer();
        } else {
            await findFirstAvailableTime();
        }
    });

    // Event listener pre tlačidlo Pridať autobus
    document.getElementById('addBusButton').addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = '';
        busModalTitle.textContent = 'Pridať autobusovú linku';
        // Tieto volania funkcií už načítavajú VŠETKY miesta
        await populatePlayingDaysSelect(busDateSelect);
        await populateAllPlaceSelects(busStartLocationSelect);
        await populateAllPlaceSelects(busEndLocationSelect, '');
        deleteBusButtonModal.style.display = 'none';
        showModal(busModal); // Použi showModal
        addOptionsDropdown.style.display = 'none'; // Skry dropdown
    });

    // Event listener pre tlačidlo Priradiť ubytovanie
    document.getElementById('assignAccommodationButton').addEventListener('click', async () => {
        assignAccommodationForm.reset();
        assignmentIdInput.value = '';
        assignAccommodationModalTitle.textContent = 'Priradiť ubytovanie';
        await populatePlayingDaysSelect(assignmentDateSelect);
        await populateClubSelect(clubSelect); // Naplníme prvý select klubmi
        teamDetailsSelect.innerHTML = '<option value="_ENTIRE_CLUB_">-- Celý klub --</option>'; // Vyčistíme a nastavíme predvolenú možnosť
        teamDetailsSelect.disabled = true; // Zakážeme druhý select na začiatku
        await populateAccommodationSelect(accommodationSelect);
        deleteAssignmentButtonModal.style.display = 'none';
        showModal(assignAccommodationModal); // Použi showModal
        addOptionsDropdown.style.display = 'none'; // Skry dropdown
    });

    // Event listener pre zmenu dátumu v modálnom okne priradenia ubytovania
    assignmentDateSelect.addEventListener('change', async () => {
        const selectedDate = assignmentDateSelect.value;
        const selectedClubName = clubSelect.value; // Získame vybraný názov klubu
        // Ak je vybraný klub, aktualizujeme druhý select
        if (selectedClubName) {
            const currentAssignmentDoc = assignmentIdInput.value ? await getDoc(doc(teamAccommodationsCollectionRef, assignmentIdInput.value)) : null;
            const currentAssignedEntityId = currentAssignmentDoc && currentAssignmentDoc.exists() ? currentAssignmentDoc.data().assignedEntityId : '';
            await populateTeamDetailsSelect(teamDetailsSelect, selectedClubName, selectedDate, currentAssignedEntityId);
        } else {
            teamDetailsSelect.innerHTML = '<option value="_ENTIRE_CLUB_">-- Celý klub --</option>';
            teamDetailsSelect.disabled = true;
        }
    });

    // NOVÝ Event listener pre zmenu klubu v modálnom okne priradenia ubytovania
    clubSelect.addEventListener('change', async () => {
        const selectedClubName = clubSelect.value; // Získame vybraný názov klubu
        const selectedDate = assignmentDateSelect.value;

        if (selectedClubName && selectedDate) {
            // Ak je vybraný klub aj dátum, naplníme druhý select
            const currentAssignmentDoc = assignmentIdInput.value ? await getDoc(doc(teamAccommodationsCollectionRef, assignmentIdInput.value)) : null;
            const currentAssignedEntityId = currentAssignmentDoc && currentAssignmentDoc.exists() ? currentAssignmentDoc.data().assignedEntityId : '';
            await populateTeamDetailsSelect(teamDetailsSelect, selectedClubName, selectedDate, currentAssignedEntityId);
        } else {
            // Ak nie je vybraný klub, vyčistíme a zakážeme druhý select
            teamDetailsSelect.innerHTML = '<option value="_ENTIRE_CLUB_">-- Celý klub --</option>';
            teamDetailsSelect.disabled = true;
        }
    });


    // --- Zatváranie modálnych okien ---
    closePlayingDayModalButton.addEventListener('click', () => {
        hideAllModals(); // Použi hideAllModals
        displayMatchesAsSchedule();
    });

    closePlaceModalButton.addEventListener('click', () => {
        hideAllModals(); // Použi hideAllModals
        displayMatchesAsSchedule();
    });

    closeMatchModalButton.addEventListener('click', () => {
        hideAllModals(); // Použi hideAllModals
        displayMatchesAsSchedule();
    });

    // Zatváranie modálneho okna pre autobus
    closeBusModalButton.addEventListener('click', () => {
        hideAllModals(); // Použi hideAllModals
        displayMatchesAsSchedule();
    });

    // Zatváranie modálneho okna pre priradenie ubytovania
    closeAssignAccommodationModalButton.addEventListener('click', () => {
        hideAllModals(); // Použi hideAllModals
        displayMatchesAsSchedule();
    });

    matchCategorySelect.addEventListener('change', async () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            await populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
            await updateMatchDurationAndBuffer();
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
            team1NumberInput.value = '';
            team2NumberInput.value = '';
            matchDurationInput.value = 60;
            matchBufferTimeInput.value = 5;
            await findFirstAvailableTime();
        }
    });

    // Event listenery pre automatické nastavenie času zápasu
    matchDateSelect.addEventListener('change', findFirstAvailableTime);
    matchLocationSelect.addEventListener('change', findFirstAvailableTime);
    matchDurationInput.addEventListener('change', findFirstAvailableTime);
    matchBufferTimeInput.addEventListener('change', findFirstAvailableTime);


    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return { fullDisplayName: null, clubName: null, clubId: null };
        }

        try {
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            let groupData = null;
            if (groupDoc.exists()) {
                groupData = groupDoc.data();
            }
            const groupName = groupData ? (groupData.name || groupId) : groupId;

            let clubName = `Tím ${teamNumber}`;
            let clubId = null;

            const clubsQuery = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                where("orderInGroup", "==", parseInt(teamNumber))
            );
            const clubsSnapshot = await getDocs(clubsQuery);

            if (!clubsSnapshot.empty) {
                const teamDocData = clubsSnapshot.docs[0].data();
                clubId = clubsSnapshot.docs[0].id;
                if (teamDocData.name) {
                    clubName = teamDocData.name;
                }
            } else {
                console.warn(`Tím s číslom ${teamNumber} v kategórii ${categoryId} a skupine ${groupId} sa nenašiel. Používam fallback: "${clubName}"`);
            }

            let shortCategoryName = categoryName;
            if (shortCategoryName) {
                shortCategoryName = shortCategoryName.replace(/U(\d+)\s*([CHZ])/i, 'U$1$2').toUpperCase();
            }

            let shortGroupName = '';
            if (groupName) {
                const match = groupName.match(/(?:skupina\s*)?([A-Z])/i);
                if (match && match[1]) {
                    shortGroupName = match[1].toUpperCase();
                }
            }

            const fullDisplayName = `${shortCategoryName} ${shortGroupName}${teamNumber}`;

            return {
                fullDisplayName: fullDisplayName,
                clubName: clubName,
                clubId: clubId
            };
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov: ", error);
            return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null };
        }
    };

    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);

        const matchDate = matchDateSelect.value;
        const matchLocationName = matchLocationSelect.value;
        const matchStartTime = matchStartTimeInput.value;
        const matchDuration = parseInt(matchDurationInput.value);
        const matchBufferTime = parseInt(matchBufferTimeInput.value);


        const currentMatchId = matchIdInput.value;

        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocationName || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            await showMessageModal('Chyba', 'Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2, Dátum, Miesto, Čas začiatku, Trvanie, Prestávka po zápase).');
            return;
        }

        if (team1Number === team2Number) {
            await showMessageModal('Chyba', 'Tímy nemôžu hrať sami proti sebe. Prosím, zadajte rôzne poradové čísla tímov.');
            return;
        }

        let team1Result = null;
        let team2Result = null;

        try {
            team1Result = await getTeamName(matchCategory, matchGroup, team1Number);
            team2Result = await getTeamName(matchCategory, matchGroup, team2Number);
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov:", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri získavaní názvov tímov. Skúste to znova.");
            return;
        }

        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
            await showMessageModal('Chyba', 'Jeden alebo oba tímy sa nenašli. Skontrolujte poradové čísla v danej kategórii a skupine.');
            return;
        }

        const [newStartHour, newStartMinute] = matchStartTime.split(':').map(Number);
        const newMatchStartInMinutes = newStartHour * 60 + newStartMinute;
        const newMatchEndInMinutesWithBuffer = newMatchStartInMinutes + matchDuration + matchBufferTime;

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let overlapFound = false;
            let overlappingMatchDetails = null;

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const [existingStartHour, existingStartMinute] = existingMatch.startTime.split(':').map(Number);
                const existingMatchStartInMinutes = existingStartHour * 60 + existingStartMinute;
                const existingMatchEndInMinutesWithBuffer = existingMatchStartInMinutes + (existingMatch.duration || 0) + (existingMatch.bufferTime || 0);

                if (newMatchStartInMinutes < existingMatchEndInMinutesWithBuffer && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return;
                }
            });

            if (overlapFound) {
                const [existingStartHour, existingStartMinute] = overlappingMatchDetails.startTime.split(':').map(Number);
                const existingMatchEndTimeObj = new Date();
                existingMatchEndTimeObj.setHours(existingStartHour, existingStartMinute + (overlappingMatchDetails.duration || 0), 0, 0);
                const formattedExistingEndTime = existingMatchEndTimeObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit'});

                await showMessageModal('Prekrývanie zápasov', `Zápas sa prekrýva s existujúcim zápasom v mieste "${matchLocationName}" dňa ${matchDate}:\n\n` +
                      `Existujúci zápas: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n` +
                      `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo prestávku po zápase.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania zápasov: ", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri kontrole prekrývania zápasov. Skúste to znova.");
            return;
        }

        // Získame typ miesta pre uloženie s dátami zápasu
        const allPlacesSnapshot = await getDocs(placesCollectionRef);
        const allPlaces = allPlacesSnapshot.docs.map(doc => doc.data());
        const selectedPlaceData = allPlaces.find(p => p.name === matchLocationName && p.type === 'Športová hala');
        const matchLocationType = selectedPlaceData ? selectedPlaceData.type : 'Športová hala';

        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime,
            location: matchLocationName,
            locationType: matchLocationType,
            categoryId: matchCategory,
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroup || null,
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text.replace(/skupina /gi, '').trim() : null,

            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: team1Number,
            team1DisplayName: team1Result.fullDisplayName,
            team1ClubName: team1Result.clubName,
            team1ClubId: team1Result.clubId,

            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: team2Number,
            team2DisplayName: team2Result.fullDisplayName,
            team2ClubName: team2Result.clubName,
            team2ClubId: team2Result.clubId,

            createdAt: new Date()
        };

        console.log('Dáta zápasu na uloženie:', matchData);

        try {
            if (currentMatchId) {
                console.log('Aktualizujem zápas s ID:', currentMatchId, 'Dáta:', matchData);
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
                await showMessageModal('Úspech', 'Zápas úspešne aktualizovaný!');
            } else {
                await addDoc(matchesCollectionRef, matchData);
                await showMessageModal('Úspech', 'Nová zápas úspešne pridaný!');
            }
            hideAllModals();
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            await showMessageModal('Chyba', "Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });


    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const busName = busNameInput.value.trim();
        const busDate = busDateSelect.value;
        const busStartLocationCombined = busStartLocationSelect.value;
        const busStartTime = busStartTimeInput.value;
        const busEndLocationCombined = busEndLocationSelect.value;
        const busEndTime = busEndTimeInput.value;
        const busNotes = busNotesInput.value.trim();

        const currentBusId = busIdInput.value;

        if (!busName || !busDate || !busStartLocationCombined || !busStartTime || !busEndLocationCombined || !busEndTime) {
            await showMessageModal('Chyba', 'Prosím, vyplňte všetky povinné polia (Názov autobusu, Dátum, Miesto začiatku, Čas odchodu, Miesto cieľa, Čas príchodu).');
            return;
        }

        if (busStartLocationCombined === busEndLocationCombined) {
            await showMessageModal('Chyba', 'Miesto začiatku a miesto cieľa nemôžu byť rovnaké. Prosím, zvoľte rôzne miesta.');
            return;
        }

        const [startH, startM] = busStartTime.split(':').map(Number);
        const [endH, endM] = busEndTime.split(':').map(Number);
        const startTimeInMinutes = startH * 60 + startM;
        let endTimeInMinutes = endH * 60 + endM;

        if (endTimeInMinutes < startTimeInMinutes) {
            endTimeInMinutes += 24 * 60;
        }

        const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
        if (durationInMinutes <= 0) {
            await showMessageModal('Chyba', 'Čas príchodu musí byť po čase odchodu.');
            return;
        }


        try {
            const existingBusesQuery = query(
                busesCollectionRef,
                where("date", "==", busDate),
                where("busName", "==", busName)
            );
            const existingBusesSnapshot = await getDocs(existingBusesQuery);

            let overlapFound = false;
            let overlappingBusDetails = null;

            existingBusesSnapshot.docs.forEach(doc => {
                const existingBus = doc.data();
                const existingBusId = doc.id;

                if (currentBusId && existingBusId === currentBusId) {
                    return;
                }

                const [existingStartH, existingStartM] = existingBus.startTime.split(':').map(Number);
                const [existingEndH, existingEndM] = existingBus.endTime.split(':').map(Number);
                const existingBusStartInMinutes = existingStartH * 60 + existingStartM;
                let existingBusEndInMinutes = existingEndH * 60 + existingEndM;
                if (existingBusEndInMinutes < existingBusStartInMinutes) {
                    existingBusEndInMinutes += 24 * 60;
                }

                if (startTimeInMinutes < existingBusEndInMinutes && endTimeInMinutes > existingBusStartInMinutes) {
                    overlapFound = true;
                    overlappingBusDetails = existingBus;
                    return;
                }
            });

            if (overlapFound) {
                await showMessageModal('Prekrývanie autobusových liniek', `Autobus "${busName}" sa prekrýva s existujúcou linkou dňa ${busDate}:\n\n` +
                      `Existujúca linka: ${overlappingBusDetails.startTime} - ${overlappingBusDetails.endTime} (${overlappingBusDetails.startLocation.split(':::')[0]} -> ${overlappingBusDetails.endLocation.split(':::')[0]})\n\n` +
                      `Prosím, upravte čas odchodu alebo príchodu novej linky.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania autobusových liniek: ", error);
            await showMessageModal('Chyba', "Vyskytla sa chyba pri kontrole prekrývania autobusových liniek. Skúste to znova.");
            return;
        }

        const busData = {
            busName: busName,
            date: busDate,
            startLocation: busStartLocationCombined,
            startTime: busStartTime,
            endLocation: busEndLocationCombined,
            endTime: busEndTime,
            notes: busNotes,
            createdAt: new Date()
        };

        console.log('Dáta autobusu na uloženie:', busData);

        try {
            if (currentBusId) {
                console.log('Aktualizujem autobusovú linku s ID:', currentBusId, 'Dáta:', busData);
                await setDoc(doc(busesCollectionRef, currentBusId), busData, { merge: true });
                await showMessageModal('Úspech', 'Autobusová linka úspešne aktualizovaná!');
            } else {
                console.log('Pridávam novú autobusovú linku s dátami:', busData);
                await addDoc(busesCollectionRef, busData);
                await showMessageModal('Úspech', 'Nová autobusová linka úspešne pridaná!');
            }
            hideAllModals();
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní autobusovej linky: ", error);
            await showMessageModal('Chyba', "Chyba pri ukladaní autobusovej linky. Pozrite konzolu pre detaily.");
        }
    });


    // Listener pre odoslanie formulára miesta
    placeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = placeIdInput.value;
        const type = placeTypeSelect.value.trim();
        const name = placeNameInput.value.trim();
        const address = placeAddressInput.value.trim();
        const googleMapsUrl = googleMapsUrlInput.value.trim();

        if (!type || !name || !address || !googleMapsUrl) {
            await showMessageModal('Chyba', 'Prosím, vyplňte všetky polia (Typ miesta, Názov miesta, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl);
        } catch (_) {
            await showMessageModal('Chyba', 'Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            // Kontrola duplicity názvu miesta A TYPU miesta
            const q = query(placesCollectionRef, where("name", "==", name), where("type", "==", type));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                await showMessageModal('Chyba', `Miesto s názvom "${name}" a typom "${type}" už existuje!`);
                return;
            }

            const placeData = {
                type: type,
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: new Date()
            };

            console.log('Dáta miesta na uloženie:', placeData);

            if (id) {
                console.log('Aktualizujem miesto s ID:', id, 'Dáta:', placeData);
                await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
                await showMessageModal('Úspech', 'Miesto úspešne aktualizované!');
            } else {
                await addDoc(placesCollectionRef, placeData);
                await showMessageModal('Úspech', 'Miesto úspešne pridané!');
            }

            hideAllModals();
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní miesta: ", error);
            await showMessageModal('Chyba', "Chyba pri ukladaní miesta. Pozrite konzolu pre detaily.");
        }
    });


    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = playingDayIdInput.value;
        const date = playingDayDateInput.value;

        if (!date) {
            await showMessageModal('Chyba', 'Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                await showMessageModal('Chyba', 'Hrací deň s týmto dátumom už existuje!');
                return;
            }

            const playingDayData = { date: date };

            if (id) {
                await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
                await showMessageModal('Úspech', 'Hrací deň úspešne aktualizovaný!');
            } else {
                await addDoc(playingDaysCollectionRef, { ...playingDayData, createdAt: new Date() });
                await showMessageModal('Úspech', 'Nová hrací deň úspešne pridaný!');
            }

            hideAllModals();
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            await showMessageModal('Chyba', "Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // Listener pre odoslanie formulára priradenia ubytovania
    assignAccommodationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = assignmentIdInput.value;
        const assignmentDate = assignmentDateSelect.value;
        const selectedClubName = clubSelect.value; // Získanie NÁZVU vybraného klubu
        const selectedTeamDetailId = teamDetailsSelect.value; // Získanie ID konkrétneho tímu alebo '_ENTIRE_CLUB_'
        const selectedAccommodationId = accommodationSelect.value;

        if (!assignmentDate || !selectedClubName || !selectedAccommodationId) {
            await showMessageModal('Chyba', 'Prosím, vyplňte všetky povinné polia (Dátum priradenia, Klub, Ubytovňa).');
            return;
        }

        let assignedEntityType;
        let assignedEntityId;
        let assignedEntityName;

        // Získame názov klubu (už ho máme zo selectedClubName)
        const clubNameForAssignment = selectedClubName;

        if (selectedTeamDetailId === '_ENTIRE_CLUB_') {
            assignedEntityType = 'club';
            assignedEntityId = selectedClubName; // ID je názov klubu
            assignedEntityName = clubNameForAssignment;
        } else {
            assignedEntityType = 'team';
            assignedEntityId = selectedTeamDetailId; // ID je ID konkrétneho tímu
            // Získame plný názov tímu pre zobrazenie
            const teamDoc = await getDoc(doc(clubsCollectionRef, selectedTeamDetailId));
            if (teamDoc.exists()) {
                const team = teamDoc.data();
                assignedEntityName = `${team.name} (Kat: ${team.categoryName || 'N/A'}, Skup: ${team.groupName || team.groupId || 'N/A'}, Tím: ${team.orderInGroup || 'N/A'})`;
            } else {
                await showMessageModal('Chyba', 'Vybraný tím sa nenašiel v databáze.');
                return;
            }
        }

        const accommodationDoc = await getDoc(doc(placesCollectionRef, selectedAccommodationId));
        let accommodationName = '';
        if (accommodationDoc.exists()) {
            accommodationName = accommodationDoc.data().name;
        } else {
            await showMessageModal('Chyba', 'Vybraná ubytovňa sa nenašla v databáze.');
            return;
        }

        const assignmentData = {
            date: assignmentDate,
            assignedEntityType: assignedEntityType,
            assignedEntityId: assignedEntityId,
            assignedEntityName: assignedEntityName,
            clubName: clubNameForAssignment, // Uložíme názov klubu pre ľahšie filtrovanie/zobrazenie
            accommodationId: selectedAccommodationId,
            accommodationName: accommodationName,
            createdAt: new Date()
        };

        console.log('Dáta priradenia ubytovania na uloženie:', assignmentData);

        try {
            if (id) {
                console.log('Aktualizujem priradenie ubytovania s ID:', id, 'Dáta:', assignmentData);
                await setDoc(doc(teamAccommodationsCollectionRef, id), assignmentData, { merge: true });
                await showMessageModal('Úspech', 'Priradenie ubytovania úspešne aktualizované!');
            } else {
                await addDoc(teamAccommodationsCollectionRef, assignmentData);
                await showMessageModal('Úspech', 'Nové priradenie ubytovania úspešne pridané!');
            }

            hideAllModals();
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní priradenia ubytovania: ", error);
            await showMessageModal('Chyba', "Chyba pri ukladaní priradenia ubytovania. Pozrite konzolu pre detaily.");
        }
    });
});
